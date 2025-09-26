// Endpoint para pré-gerar embeddings uma única vez
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateBatchEmbeddings } from '@/lib/embeddings-service';
import { generateSlug } from '@/lib/taxonomy-service';
import { calculateTaxonomyVersion, markEmbeddingsUpdated, updateTaxonomyVersion } from '@/lib/taxonomy-version-manager';

const BATCH_SIZE = 20; // Processar 20 por vez

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, force = false, progressCallback } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key é obrigatória' },
        { status: 400 }
      );
    }

    console.log('🚀 Iniciando pré-geração de embeddings...');

    // Função helper para reportar progresso
    const reportProgress = (step: string, progress: number, details?: any) => {
      console.log(`📊 ${step}: ${progress}%`, details || '');
      // Em uma implementação futura, aqui poderia enviar via WebSocket ou SSE
    };

    // Carregar dados atuais
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    // Verificar se já foram gerados
    if (!force && data.keywords_with_embeddings && data.problems_with_embeddings) {
      return NextResponse.json({
        success: true,
        message: 'Embeddings já foram gerados. Use force=true para regenerar.',
        existing: {
          keywords: data.keywords_with_embeddings?.length || 0,
          problems: data.problems_with_embeddings?.length || 0,
          generated_at: data.embeddings_generated_at
        }
      });
    }

    const keywords = data.keywords || [];
    const problems = data.problems || [];
    const departments = data.departments || [];

    console.log(`📊 Processando: ${keywords.length} keywords, ${problems.length} problems`);
    reportProgress('Iniciando processamento', 5, { keywords: keywords.length, problems: problems.length });

    // Calcular versão atual da taxonomia
    const taxonomyVersion = calculateTaxonomyVersion({ keywords, problems, departments });
    console.log('📋 Versão da taxonomia:', taxonomyVersion.version);

    const startTime = Date.now();

    // Processar Keywords em batches
    console.log('🔄 Gerando embeddings para keywords...');
    reportProgress('Gerando embeddings para keywords', 10);

    const keywordTexts = keywords.map((kw: string) => kw);
    const keywordEmbeddings = await generateBatchEmbeddings(keywordTexts, apiKey, BATCH_SIZE);

    reportProgress('Keywords processadas', 40, { processed: keywordEmbeddings.length });

    const keywordsWithEmbeddings = keywords.map((kw: string, index: number) => {
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
        embedding: keywordEmbeddings[index] || [],
        status: 'active',
        created_by: 'batch_generation',
        created_at: new Date(),
        updated_at: new Date(),
        version: 1
      };
    });

    // Processar Problems em batches
    console.log('🔄 Gerando embeddings para problems...');
    reportProgress('Gerando embeddings para problems', 50);

    const problemTexts = problems.map((prob: string) => prob);
    const problemEmbeddings = await generateBatchEmbeddings(problemTexts, apiKey, BATCH_SIZE);

    reportProgress('Problems processados', 70, { processed: problemEmbeddings.length });

    const problemsWithEmbeddings = problems.map((prob: string, index: number) => ({
      id: `pb_${Date.now()}_${index}`,
      label: prob,
      slug: generateSlug(prob),
      aliases: [prob.toLowerCase()],
      description: `Problem: ${prob}`,
      examples: [prob],
      embedding: problemEmbeddings[index] || [],
      status: 'active',
      category: 'Geral',
      severity: 'medium',
      applicable_departments: [],
      created_by: 'batch_generation',
      created_at: new Date(),
      updated_at: new Date(),
      version: 1
    }));

    // Salvar no Firebase em documentos separados para evitar limite de 1MB
    console.log('💾 Salvando embeddings no Firebase (estrutura otimizada)...');
    reportProgress('Salvando no Firebase', 80);

    // Salvar keywords em chunks de 50 para evitar limite de tamanho
    const keywordChunks = [];
    const CHUNK_SIZE = 50;
    for (let i = 0; i < keywordsWithEmbeddings.length; i += CHUNK_SIZE) {
      keywordChunks.push(keywordsWithEmbeddings.slice(i, i + CHUNK_SIZE));
    }

    // Salvar cada chunk de keywords
    for (let i = 0; i < keywordChunks.length; i++) {
      const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', `keywords_chunk_${i}`);
      await setDoc(chunkRef, {
        chunk_index: i,
        total_chunks: keywordChunks.length,
        keywords: keywordChunks[i],
        updated_at: new Date()
      });
    }

    // Salvar problems em chunks de 50
    const problemChunks = [];
    for (let i = 0; i < problemsWithEmbeddings.length; i += CHUNK_SIZE) {
      problemChunks.push(problemsWithEmbeddings.slice(i, i + CHUNK_SIZE));
    }

    // Salvar cada chunk de problems
    for (let i = 0; i < problemChunks.length; i++) {
      const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', `problems_chunk_${i}`);
      await setDoc(chunkRef, {
        chunk_index: i,
        total_chunks: problemChunks.length,
        problems: problemChunks[i],
        updated_at: new Date()
      });
    }

    // Atualizar documento principal apenas com metadados
    await updateDoc(docRef, {
      embeddings_generated_at: new Date(),
      embedding_model: 'text-embedding-3-small',
      embeddings_structure: 'chunked', // Flag para indicar nova estrutura
      batch_generation_stats: {
        total_keywords: keywordsWithEmbeddings.length,
        total_problems: problemsWithEmbeddings.length,
        keyword_chunks: keywordChunks.length,
        problem_chunks: problemChunks.length,
        processing_time_ms: Date.now() - startTime,
        batch_size_used: BATCH_SIZE
      }
    });

    // Atualizar informações de versão da taxonomia
    await updateTaxonomyVersion({ keywords, problems, departments });
    await markEmbeddingsUpdated(taxonomyVersion.version);

    reportProgress('Versões atualizadas', 95);

    const processingTime = Date.now() - startTime;
    reportProgress('Concluído', 100, { processingTime });

    console.log('✅ Pré-geração concluída!');

    return NextResponse.json({
      success: true,
      message: 'Embeddings gerados com sucesso!',
      stats: {
        keywords_processed: keywordsWithEmbeddings.length,
        problems_processed: problemsWithEmbeddings.length,
        processing_time_ms: processingTime,
        processing_time_human: `${Math.round(processingTime / 1000)}s`,
        batch_size: BATCH_SIZE,
        total_api_calls: Math.ceil((keywords.length + problems.length) / BATCH_SIZE)
      },
      next_steps: 'Os embeddings estão salvos. Análises futuras serão muito mais rápidas!'
    });

  } catch (error: any) {
    console.error('❌ Erro na pré-geração:', error);

    // Mensagens de erro mais amigáveis para usuários
    let userFriendlyMessage = 'Erro interno na geração de embeddings';

    if (error.message?.includes('API key')) {
      userFriendlyMessage = 'Chave de API inválida ou sem permissões. Verifique sua chave OpenAI.';
    } else if (error.message?.includes('quota')) {
      userFriendlyMessage = 'Cota da API OpenAI excedida. Tente novamente mais tarde ou verifique seu plano.';
    } else if (error.message?.includes('rate limit')) {
      userFriendlyMessage = 'Muitas requisições. Aguarde alguns minutos e tente novamente.';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      userFriendlyMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message?.includes('permission')) {
      userFriendlyMessage = 'Erro de permissão no Firebase. Contate o administrador.';
    }

    return NextResponse.json({
      success: false,
      error: userFriendlyMessage,
      technical_error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}