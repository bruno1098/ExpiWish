// Serviço para gerenciar o novo sistema de taxonomy dinâmica

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc,
  query, 
  where, 
  orderBy,
  arrayUnion,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Department, 
  Keyword, 
  Problem, 
  TaxonomyMeta, 
  TaxonomyCache,
  TaxonomyConfig,
  ClassificationCandidates,
  KeywordCandidate,
  ProblemCandidate,
  TaxonomyProposal 
} from './taxonomy-types';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings-service';
import { generateEnrichedKeywordText, generateEnrichedProblemText, expandUserQuery } from '@/lib/semantic-enrichment';

// Cache global
let taxonomyCache: TaxonomyCache | null = null;

// Configuração padrão - OTIMIZADA PARA RECALL COM EMBEDDINGS RICOS
const DEFAULT_CONFIG: TaxonomyConfig = {
  embedding_model: 'text-embedding-3-small',
  similarity_threshold: 0.75,  // ✅ REDUZIDO: Com embeddings ricos, scores ficam menores mas mais precisos
  recall_top_n: 10,  // ✅ AUMENTADO: Mais candidatos para GPT-4 escolher
  min_confidence_threshold: 0.50,  // ✅ REDUZIDO: GPT-4 faz validação contextual
  auto_approve_threshold: 0.92,  // ✅ AJUSTADO: Mais realista com embeddings ricos
  max_aliases_per_item: 10,
  max_examples_per_item: 5,
  cache_expiry_minutes: 30
};

// Collections - ESTRUTURA EXISTENTE
const COLLECTIONS = {
  globalLists: 'dynamic-lists',
  departments: 'dynamic-lists/global-lists/departments',
  keywords: 'dynamic-lists/global-lists/keywords', 
  problems: 'dynamic-lists/global-lists/problems',
  meta: 'dynamic-lists/global-lists/meta',
  config: 'dynamic-lists/global-lists/config',
  proposals: 'dynamic-lists/global-lists/proposals'
};

/**
 * Gera slug normalizado a partir do label
 */
export function generateSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '')    // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')            // Espaços vuram hífen
    .replace(/-+/g, '-')             // Múltiplos hífens viram um
    .replace(/^-|-$/g, '');          // Remove hífens no início/fim
}

/**
 * Carrega configuração do sistema
 */
export async function getTaxonomyConfig(): Promise<TaxonomyConfig> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const config = data.config || {};
      return { ...DEFAULT_CONFIG, ...config } as TaxonomyConfig;
    }
  } catch (error) {
    console.error('Erro ao carregar config, usando padrão:', error);
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Carrega meta informações da taxonomy
 */
export async function getTaxonomyMeta(): Promise<TaxonomyMeta | null> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.meta || { version: 1, updated_at: Timestamp.now(), updated_by: 'system' };
    }
  } catch (error) {
    console.error('Erro ao carregar taxonomy meta:', error);
  }
  return null;
}

/**
 * Atualiza versão da taxonomy (incrementa)
 */
export async function incrementTaxonomyVersion(updatedBy: string): Promise<number> {
  const docRef = doc(db, 'dynamic-lists', 'global-lists');
  const currentMeta = await getTaxonomyMeta();
  
  const newVersion = (currentMeta?.version || 0) + 1;
  
  const docSnap = await getDoc(docRef);
  const data = docSnap.exists() ? docSnap.data() : {};
  
  await updateDoc(docRef, {
    meta: {
      version: newVersion,
      updated_at: Timestamp.now(),
      updated_by: updatedBy,
      departments_count: (data.departments || []).length,
      keywords_count: (data.keywords || []).filter((k: any) => k.status === 'active').length,
      problems_count: (data.problems || []).filter((p: any) => p.status === 'active').length,
      last_embedding_update: Timestamp.now(),
      embedding_model: (await getTaxonomyConfig()).embedding_model
    }
  });
  
  // Limpar cache
  taxonomyCache = null;
  
  return newVersion;
}

/**
 * Carrega todos os departamentos
 */
export async function loadDepartments(): Promise<Department[]> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const departments = data.departments || [];
      
      // Converter strings para objetos Department
      return departments
        .filter((dept: any) => typeof dept === 'string' && dept.trim().length > 0)
        .map((dept: string, index: number) => ({
          id: dept,
          label: dept,
          description: `Departamento ${dept}`,
          active: true,
          order: index + 1
        }));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao carregar departamentos:', error);
    return [];
  }
}

/**
 * Carrega keywords ativas
 */
export async function loadKeywords(): Promise<Keyword[]> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // PRIORIDADE 1: Tentar carregar keywords da nova estrutura chunked
      if (data.embeddings_structure === 'chunked') {
        console.log('🚀 Carregando keywords da estrutura chunked...');
        
        const keywordChunks = data.batch_generation_stats?.keyword_chunks || 0;
        let allKeywords: Keyword[] = [];
        
        // Carregar todos os chunks de keywords
        for (let i = 0; i < keywordChunks; i++) {
          try {
            const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', `keywords_chunk_${i}`);
            const chunkSnap = await getDoc(chunkRef);
            
            if (chunkSnap.exists()) {
              const chunkData = chunkSnap.data();
              allKeywords = [...allKeywords, ...chunkData.keywords];
            }
          } catch (error) {
            console.error(`Erro ao carregar chunk ${i} de keywords:`, error);
          }
        }
        
        if (allKeywords.length > 0) {
          console.log(`✅ Carregadas ${allKeywords.length} keywords com embeddings da estrutura chunked`);
          return allKeywords.filter((kw: any) => kw.status === 'active');
        }
      }
      
      // PRIORIDADE 2: Tentar carregar keywords com embeddings pré-gerados (estrutura antiga)
      const keywordsWithEmbeddings = data.keywords_with_embeddings;
      if (keywordsWithEmbeddings && keywordsWithEmbeddings.length > 0) {
        console.log(`🚀 Carregando ${keywordsWithEmbeddings.length} keywords com embeddings pré-gerados (estrutura antiga)`);
        return keywordsWithEmbeddings.filter((kw: any) => kw.status === 'active');
      }
      
      // FALLBACK: Keywords antigas (strings simples)
      const keywords = data.keywords || [];
      console.log(`⚠️ Fallback: convertendo ${keywords.length} keywords strings para objetos`);
      
      return keywords
        .filter((kw: any) => typeof kw === 'string' && kw.trim().length > 0)
        .map((kw: string, index: number) => {
          const parts = kw.split(' - ');
          const department = parts.length > 1 ? parts[0].trim() : 'Operacoes';
          
          return {
            id: `kw_${Date.now()}_${index}`,
            label: kw,
            department_id: department,
            slug: generateSlug(kw),
            aliases: [kw.toLowerCase()],
            description: `Keyword: ${kw}`,
            examples: [kw],
            embedding: [], // VAZIO - será gerado sob demanda
            status: 'active' as const,
            created_by: 'migration',
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
            version: 1
          };
        });
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao carregar keywords:', error);
    return [];
  }
}

/**
 * Carrega problems ativos
 */
export async function loadProblems(): Promise<Problem[]> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // PRIORIDADE 1: Tentar carregar problems da nova estrutura chunked
      if (data.embeddings_structure === 'chunked') {
        console.log('🚀 Carregando problems da estrutura chunked...');
        
        const problemChunks = data.batch_generation_stats?.problem_chunks || 0;
        let allProblems: Problem[] = [];
        
        // Carregar todos os chunks de problems
        for (let i = 0; i < problemChunks; i++) {
          try {
            const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', `problems_chunk_${i}`);
            const chunkSnap = await getDoc(chunkRef);
            
            if (chunkSnap.exists()) {
              const chunkData = chunkSnap.data();
              allProblems = [...allProblems, ...chunkData.problems];
            }
          } catch (error) {
            console.error(`Erro ao carregar chunk ${i} de problems:`, error);
          }
        }
        
        if (allProblems.length > 0) {
          console.log(`✅ Carregados ${allProblems.length} problems com embeddings da estrutura chunked`);
          return allProblems.filter((prob: any) => prob.status === 'active');
        }
      }
      
      // PRIORIDADE 2: Tentar carregar problems com embeddings pré-gerados (estrutura antiga)
      const problemsWithEmbeddings = data.problems_with_embeddings;
      if (problemsWithEmbeddings && problemsWithEmbeddings.length > 0) {
        console.log(`🚀 Carregando ${problemsWithEmbeddings.length} problems com embeddings pré-gerados (estrutura antiga)`);
        return problemsWithEmbeddings.filter((prob: any) => prob.status === 'active');
      }
      
      // FALLBACK: Problems antigos (strings simples)
      const problems = data.problems || [];
      console.log(`⚠️ Fallback: convertendo ${problems.length} problems strings para objetos`);
      
      return problems
        .filter((prob: any) => typeof prob === 'string' && prob.trim().length > 0)
        .map((prob: string, index: number) => ({
          id: `pb_${Date.now()}_${index}`,
          label: prob,
          slug: generateSlug(prob),
          aliases: [prob.toLowerCase()],
          description: `Problem: ${prob}`,
          examples: [prob],
          embedding: [], // VAZIO - será gerado sob demanda
          status: 'active' as const,
          category: 'Geral',
          severity: 'medium' as const,
          applicable_departments: [],
          created_by: 'migration',
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
          version: 1
        }));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao carregar problems:', error);
    return [];
  }
}

/**
 * Carrega taxonomy completa com cache inteligente
 */
export async function loadTaxonomy(forceReload = false): Promise<TaxonomyCache> {
  // Verificar cache
  if (!forceReload && taxonomyCache) {
    const now = Date.now();
    if (now < taxonomyCache.expires_at) {
      console.log('🎯 Usando taxonomy cache');
      return taxonomyCache;
    }
  }
  
  console.log('🔄 Recarregando taxonomy do Firebase');
  
  const meta = await getTaxonomyMeta();
  const config = await getTaxonomyConfig();
  
  // Carregar dados em paralelo
  const [departments, keywords, problems] = await Promise.all([
    loadDepartments(),
    loadKeywords(), 
    loadProblems()
  ]);
  
  const now = Date.now();
  taxonomyCache = {
    version: meta?.version || 1,
    departments,
    keywords,
    problems,
    loaded_at: now,
    expires_at: now + (config.cache_expiry_minutes * 60 * 1000)
  };
  
  console.log(`✅ Taxonomy carregada: ${departments.length} dept, ${keywords.length} keywords, ${problems.length} problems`);
  
  return taxonomyCache;
}

/**
 * Busca candidatos por embedding similarity
 */
export async function findCandidates(
  text: string, 
  config?: Partial<TaxonomyConfig>,
  apiKey?: string
): Promise<ClassificationCandidates> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const taxonomy = await loadTaxonomy();
  
  console.log('🔍 Encontrados dados:', {
    departments: taxonomy.departments.length,
    keywords: taxonomy.keywords.length,
    problems: taxonomy.problems.length
  });
  
  // ✅ MELHORIA CRÍTICA: Expandir query com sinônimos
  const expandedText = expandUserQuery(text);
  console.log('🔍 Query expandida:', {
    original: text.substring(0, 50),
    expanded: expandedText.substring(0, 100)
  });
  
  // Gerar embedding do texto expandido
  const textEmbedding = await generateEmbedding(expandedText, apiKey);
  
  // Buscar keywords similares
  const keywordCandidates: KeywordCandidate[] = [];
  for (const keyword of taxonomy.keywords) {
    try {
      // ✅ OTIMIZAÇÃO: Só processar se TEM embedding
      if (!keyword.embedding || keyword.embedding.length === 0) {
        console.log(`⚠️ Keyword sem embedding, pulando: ${keyword.label}`);
        continue; // PULAR em vez de gerar
      }
      
      const similarity = cosineSimilarity(textEmbedding, keyword.embedding);
      // ✅ THRESHOLD REDUZIDO: 0.30 para keywords (embeddings ricos = scores menores)
      if (similarity > 0.30) { 
        keywordCandidates.push({
          id: keyword.id,
          label: keyword.label,
          department_id: keyword.department_id,
          description: keyword.description,
          examples: keyword.examples,
          similarity_score: similarity
        });
      }
    } catch (error) {
      console.error(`Erro ao processar keyword ${keyword.label}:`, error);
    }
  }
  
  // Buscar problems similares
  const problemCandidates: ProblemCandidate[] = [];
  for (const problem of taxonomy.problems) {
    try {
      // ✅ OTIMIZAÇÃO: Só processar se TEM embedding
      if (!problem.embedding || problem.embedding.length === 0) {
        console.log(`⚠️ Problem sem embedding, pulando: ${problem.label}`);
        continue; // PULAR em vez de gerar
      }
      
      const similarity = cosineSimilarity(textEmbedding, problem.embedding);
      // ✅ THRESHOLD REDUZIDO: 0.40 para problems (embeddings ricos = maior recall)
      if (similarity > 0.40) { 
        problemCandidates.push({
          id: problem.id,
          label: problem.label,
          description: problem.description,
          examples: problem.examples,
          applicable_departments: problem.applicable_departments,
          similarity_score: similarity
        });
      }
    } catch (error) {
      console.error(`Erro ao processar problem ${problem.label}:`, error);
    }
  }
  
  // Ordenar por similaridade e limitar
  keywordCandidates.sort((a, b) => b.similarity_score - a.similarity_score);
  problemCandidates.sort((a, b) => b.similarity_score - a.similarity_score);
  
  // 📊 Log de estatísticas de candidatos
  console.log('📊 Candidatos encontrados:', {
    keywords_total: keywordCandidates.length,
    keywords_top: keywordCandidates.slice(0, 3).map(k => ({ label: k.label, score: k.similarity_score.toFixed(3) })),
    problems_total: problemCandidates.length,
    problems_top: problemCandidates.slice(0, 3).map(p => ({ label: p.label, score: p.similarity_score.toFixed(3) })),
    threshold_used: { keywords: 0.30, problems: 0.40 },
    top_n: fullConfig.recall_top_n,
    query_expansion: 'enabled'
  });
  
  // 🔄 FALLBACK AUTOMÁTICO: Se threshold muito alto bloqueou tudo, reduzir temporariamente
  let finalKeywords = keywordCandidates.slice(0, fullConfig.recall_top_n);
  let finalProblems = problemCandidates.slice(0, fullConfig.recall_top_n);
  let usedMethod: 'embedding' | 'keyword_match' | 'hybrid' = 'embedding';
  
  // Se não encontrou keywords suficientes, fazer segunda passada com threshold mais baixo
  if (finalKeywords.length < 3) {
    console.warn(`⚠️ Apenas ${finalKeywords.length} keywords passaram no threshold 0.30. Aplicando fallback com threshold 0.20...`);
    
    const fallbackKeywords: KeywordCandidate[] = [];
    for (const keyword of taxonomy.keywords) {
      if (!keyword.embedding || keyword.embedding.length === 0) continue;
      
      const similarity = cosineSimilarity(textEmbedding, keyword.embedding);
      if (similarity > 0.20 && similarity <= 0.30) { // Pegar o que ficou entre 0.20 e 0.30
        fallbackKeywords.push({
          id: keyword.id,
          label: keyword.label,
          department_id: keyword.department_id,
          description: keyword.description,
          examples: keyword.examples,
          similarity_score: similarity
        });
      }
    }
    
    fallbackKeywords.sort((a, b) => b.similarity_score - a.similarity_score);
    finalKeywords = [...finalKeywords, ...fallbackKeywords.slice(0, fullConfig.recall_top_n - finalKeywords.length)];
    usedMethod = 'hybrid';
    
    console.log(`✅ Fallback encontrou +${fallbackKeywords.length} keywords adicionais`);
  }
  
  // Mesmo processo para problems
  if (finalProblems.length < 3) {
    console.warn(`⚠️ Apenas ${finalProblems.length} problems passaram no threshold 0.40. Aplicando fallback com threshold 0.25...`);
    
    const fallbackProblems: ProblemCandidate[] = [];
    for (const problem of taxonomy.problems) {
      if (!problem.embedding || problem.embedding.length === 0) continue;
      
      const similarity = cosineSimilarity(textEmbedding, problem.embedding);
      if (similarity > 0.40 && similarity <= 0.55) { // Pegar o que ficou entre 0.40 e 0.55
        fallbackProblems.push({
          id: problem.id,
          label: problem.label,
          description: problem.description,
          examples: problem.examples,
          applicable_departments: problem.applicable_departments,
          similarity_score: similarity
        });
      }
    }
    
    fallbackProblems.sort((a, b) => b.similarity_score - a.similarity_score);
    finalProblems = [...finalProblems, ...fallbackProblems.slice(0, fullConfig.recall_top_n - finalProblems.length)];
    usedMethod = 'hybrid';
    
    console.log(`✅ Fallback encontrou +${fallbackProblems.length} problems adicionais`);
  }
  
  return {
    departments: taxonomy.departments,
    keywords: finalKeywords,
    problems: finalProblems,
    recall_method: usedMethod,
    recall_score_threshold: fullConfig.similarity_threshold
  };
}

/**
 * Detecta possíveis duplicatas
 */
export async function detectDuplicates(
  label: string,
  type: 'keyword' | 'problem',
  departmentId?: string,
  apiKey?: string
): Promise<Array<{ id: string; label: string; similarity: number }>> {
  const taxonomy = await loadTaxonomy();
  const config = await getTaxonomyConfig();
  
  const slug = generateSlug(label);
  const embedding = await generateEmbedding(label, apiKey);
  
  const items = type === 'keyword' ? taxonomy.keywords : taxonomy.problems;
  const duplicates = [];
  
  for (const item of items) {
    // Skip if different department (para keywords)
    if (type === 'keyword' && departmentId && (item as Keyword).department_id !== departmentId) {
      continue;
    }
    
    // Verificar slug
    if (item.slug === slug) {
      duplicates.push({
        id: item.id,
        label: item.label,
        similarity: 1.0
      });
      continue;
    }
    
    // Verificar embedding similarity
    if (item.embedding && item.embedding.length > 0) {
      const similarity = cosineSimilarity(embedding, item.embedding);
      if (similarity > config.similarity_threshold) {
        duplicates.push({
          id: item.id,
          label: item.label,
          similarity
        });
      }
    }
  }
  
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Cria nova keyword
 */
export async function createKeyword(
  data: Omit<Keyword, 'id' | 'slug' | 'embedding' | 'created_at' | 'updated_at' | 'version'>,
  createdBy: string,
  apiKey?: string
): Promise<string> {
  const keywordId = `kw_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const slug = generateSlug(data.label);
  
  // Verificar duplicatas
  const duplicates = await detectDuplicates(data.label, 'keyword', data.department_id, apiKey);
  if (duplicates.length > 0) {
    throw new Error(`Possível duplicata detectada: ${duplicates[0].label} (${duplicates[0].similarity.toFixed(2)})`);
  }
  
  // Gerar embedding com contexto rico usando enriquecimento semântico
  // ✅ MELHORIA CRÍTICA: usar dicionário de contexto semântico
  const enrichedText = generateEnrichedKeywordText(data.label);
  const contextParts = [
    enrichedText, // Texto já enriquecido com sinônimos e variações
    data.description || '',
    data.department_id, // Contexto do departamento
    data.aliases.join(' '),
    data.examples.join('. ')
  ].filter(Boolean);
  const embedding = await generateEmbedding(contextParts.join(' | '), apiKey);
  
  const keyword: Keyword = {
    ...data,
    id: keywordId,
    slug,
    embedding,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    version: 1,
    created_by: createdBy
  };
  
  // Adicionar ao array de keywords no documento global
  const docRef = doc(db, 'dynamic-lists', 'global-lists');
  await updateDoc(docRef, {
    keywords: arrayUnion(keyword),
    updated_at: Timestamp.now(),
    updated_by: createdBy
  });
  
  await incrementTaxonomyVersion(createdBy);
  
  return keywordId;
}

/**
 * Cria novo problem
 */
export async function createProblem(
  data: Omit<Problem, 'id' | 'slug' | 'embedding' | 'created_at' | 'updated_at' | 'version'>,
  createdBy: string,
  apiKey?: string
): Promise<string> {
  const problemId = `pb_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const slug = generateSlug(data.label);
  
  // Verificar duplicatas
  const duplicates = await detectDuplicates(data.label, 'problem', undefined, apiKey);
  if (duplicates.length > 0) {
    throw new Error(`Possível duplicata detectada: ${duplicates[0].label} (${duplicates[0].similarity.toFixed(2)})`);
  }
  
  // Gerar embedding com contexto rico usando enriquecimento semântico
  // ✅ MELHORIA CRÍTICA: usar dicionário de contexto semântico para problems
  const enrichedText = generateEnrichedProblemText(data.label);
  const contextParts = [
    enrichedText, // Texto já enriquecido com indicadores negativos
    data.description || '',
    (data.applicable_departments || []).join(' '), // Contexto dos departamentos
    data.aliases.join(' '),
    data.examples.join('. ')
  ].filter(Boolean);
  const embedding = await generateEmbedding(contextParts.join(' | '), apiKey);
  
  const problem: Problem = {
    ...data,
    id: problemId,
    slug,
    embedding,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    version: 1,
    created_by: createdBy
  };
  
  // Adicionar ao array de problems no documento global
  const docRef = doc(db, 'dynamic-lists', 'global-lists');
  await updateDoc(docRef, {
    problems: arrayUnion(problem),
    updated_at: Timestamp.now(),
    updated_by: createdBy
  });
  
  await incrementTaxonomyVersion(createdBy);
  
  return problemId;
}

/**
 * Cria proposta de nova taxonomy
 */
export async function createTaxonomyProposal(
  type: 'keyword' | 'problem',
  proposedLabel: string,
  context: string,
  departmentId?: string,
  createdBy: string = 'system'
): Promise<string> {
  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Auto-gerar sugestões
  const suggestedSlug = generateSlug(proposedLabel);
  const suggestedAliases: string[] = []; // TODO: usar IA para gerar aliases
  const suggestedExamples = [context]; // Usar contexto como primeiro exemplo
  
  const proposal: TaxonomyProposal = {
    id: proposalId,
    type,
    proposed_label: proposedLabel,
    department_id: departmentId,
    context,
    suggested_slug: suggestedSlug,
    suggested_aliases: suggestedAliases,
    suggested_examples: suggestedExamples,
    status: 'pending',
    created_by: createdBy,
    created_at: Timestamp.now(),
    feedback_count: 1
  };
  
  await setDoc(doc(db, COLLECTIONS.proposals, proposalId), proposal);
  
  return proposalId;
}

/**
 * Inicializa departamentos padrão (executar apenas uma vez)
 */
export async function initializeDefaultDepartments(): Promise<void> {
  const defaultDepartments: Omit<Department, 'created_at'>[] = [
    { id: 'A&B', label: 'A&B', description: 'Alimentos & Bebidas', active: true, order: 1 },
    { id: 'Governanca', label: 'Governança', active: true, order: 2 },
    { id: 'Limpeza', label: 'Limpeza', active: true, order: 3 },
    { id: 'Manutencao', label: 'Manutenção', active: true, order: 4 },
    { id: 'Produto', label: 'Produto', active: true, order: 5 },
    { id: 'Lazer', label: 'Lazer', active: true, order: 6 },
    { id: 'TI', label: 'TI', active: true, order: 7 },
    { id: 'Operacoes', label: 'Operações', active: true, order: 8 },
    { id: 'Qualidade', label: 'Qualidade', active: true, order: 9 },
    { id: 'Recepcao', label: 'Recepção', active: true, order: 10 },
    { id: 'EG', label: 'EG', active: true, order: 11 },
    { id: 'Comercial', label: 'Comercial', active: true, order: 12 },
    { id: 'Academia', label: 'Academia', active: true, order: 13 }
  ];
  
  for (const dept of defaultDepartments) {
    await setDoc(doc(db, COLLECTIONS.departments, dept.id), {
      ...dept,
      created_at: Timestamp.now()
    });
  }
  
  console.log('✅ Departamentos padrão inicializados');
}