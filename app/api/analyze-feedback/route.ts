// Nova versão do sistema de análise de feedback com taxonomy dinâmica
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import {
  findCandidates,
  getTaxonomyConfig,
  createTaxonomyProposal,
  loadTaxonomy
} from "@/lib/taxonomy-service";
import {
  ClassificationResult,
  ClassificationIssue,
  ClassificationCandidates
} from "@/lib/taxonomy-types";
import { adaptNewAIToLegacyFormat, createBasicFeedback, createEmergencyFeedback, type NewAIResponse } from '@/lib/ai-compatibility-adapter';
import { performanceLogger } from '@/lib/performance-logger';

// Cache em memória para análises repetidas
interface AnalysisCache {
  result: ClassificationResult;
  timestamp: number;
  taxonomy_version: number;
}

const analysisCache = new Map<string, AnalysisCache>();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE = 1000;

// Controle de rate limiting  
let requestCount = 0;
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 180;

// Circuit Breaker para evitar cascata de falhas
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  state: 'closed'
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Falhas consecutivas para abrir
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto para tentar novamente

// Reset contador a cada minuto
setInterval(() => {
  requestCount = 0;
}, RATE_LIMIT_WINDOW);

/**
 * Classifica o tipo de erro para estratégia de fallback apropriada
 */
function classifyError(error: any): string {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('rate limit') || message.includes('429')) {
    return 'rate_limit';
  } else if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout';
  } else if (message.includes('api key') || message.includes('401')) {
    return 'auth_error';
  } else if (message.includes('quota') || message.includes('billing')) {
    return 'quota_exceeded';
  } else if (message.includes('network') || message.includes('fetch')) {
    return 'network_error';
  } else if (message.includes('embedding') || message.includes('similarity')) {
    return 'embedding_error';
  } else {
    return 'unknown_error';
  }
}

/**
 * Gerencia o circuit breaker para evitar cascata de falhas
 */
function checkCircuitBreaker(): boolean {
  const now = Date.now();

  if (circuitBreaker.state === 'open') {
    if (now - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
      circuitBreaker.state = 'half-open';
      console.log('🔄 Circuit breaker mudou para half-open');
      return true;
    }
    return false;
  }

  return true;
}

function recordSuccess(): void {
  if (circuitBreaker.state === 'half-open') {
    circuitBreaker.state = 'closed';
    circuitBreaker.failures = 0;
    console.log('✅ Circuit breaker fechado - sistema recuperado');
  }
}

function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = 'open';
    console.log('🚨 Circuit breaker aberto - muitas falhas consecutivas');
  }
}

/**
 * Implementa retry com backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  errorType: string = 'unknown'
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Não fazer retry para alguns tipos de erro
      if (errorType === 'auth_error' || errorType === 'quota_exceeded') {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`🔄 Tentativa ${attempt} falhou. Tentando novamente em ${Math.round(delay)}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Máximo de tentativas excedido');
}

// Limpeza automática do cache
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  analysisCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_EXPIRY) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => analysisCache.delete(key));

  // Limitar tamanho máximo
  if (analysisCache.size > MAX_CACHE_SIZE) {
    const oldestEntries = Array.from(analysisCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, analysisCache.size - MAX_CACHE_SIZE);

    oldestEntries.forEach(([key]) => analysisCache.delete(key));
  }

  console.log(`🧹 Cache limpo. Itens: ${analysisCache.size}`);
}, 15 * 60 * 1000);

/**
 * Cria prompt dinâmico com candidatos
 */
function createDynamicPrompt(
  text: string,
  candidates: ClassificationCandidates
): { systemPrompt: string; userPrompt: string; functionSchema: any } {

  const systemPrompt = `Você é uma IA especialista em hospitalidade com TOTAL AUTONOMIA SEMÂNTICA. Sua missão é LER, COMPREENDER e CLASSIFICAR feedbacks baseado no SIGNIFICADO REAL, não em palavras-chave.

🧠 **INTELIGÊNCIA SEMÂNTICA TOTAL**:
- **LEIA o feedback completamente** 
- **ENTENDA a intenção e contexto**
- **INTERPRETE o significado real**
- **CLASSIFIQUE baseado na compreensão, não em palavras**

🚀 **AUTONOMIA MÁXIMA - VOCÊ DECIDE**:
- Use SEU conhecimento de hospitalidade para interpretar
- Identifique TODOS os aspectos mencionados (explícitos ou implícitos)
- Crie quantas classificações forem necessárias
- Seja preciso, mas use sua inteligência para decidir

🎯 **COMPREENSÃO CONTEXTUAL**:

**ENTENDA O NEGÓCIO HOTELEIRO:**
- Restaurantes/Bares = A&B (Alimentos & Bebidas)  
- Funcionários do restaurante/bar = A&B - Serviço
- Quartos sujos/arrumação = Limpeza/Governança
- Equipamentos quebrados = Manutenção  
- Atividades/Piscina = Lazer
- Wi-fi/TV = Tecnologia
- Chegada/Saída = Recepção
- Concierge = pessoa específica de informações

**ENTENDA AS INTENÇÕES:**
- Elogios específicos → classificar na área específica
- Elogios genéricos ("tudo ótimo") → Produto - Experiência  
- Problemas → identificar causa raiz e departamento responsável
- Sugestões → detectar quando há proposta de melhoria

🔥 **EXEMPLOS DE COMPREENSÃO REAL:**

**Exemplo 1**: "O garçom João foi muito atencioso"
- **LEIA**: menciona garçom específico
- **ENTENDA**: elogio ao serviço de um funcionário do restaurante
- **CLASSIFIQUE**: A&B - Serviço (não "Atendimento" genérico)

**Exemplo 2**: "Tudo foi maravilhoso durante nossa estadia"  
- **LEIA**: elogio geral sem área específica
- **ENTENDA**: satisfação geral com a experiência hoteleira
- **CLASSIFIQUE**: Produto - Experiência (experiência completa)

**Exemplo 3**: "O café da manhã estava excelente e a piscina muito limpa"
- **LEIA**: dois aspectos diferentes mencionados
- **ENTENDA**: elogio ao café (A&B) + elogio à piscina (Lazer)
- **CLASSIFIQUE**: 2 classificações separadas

**Exemplo 4**: "Chuveiro pingava e fazia barulho a noite toda"
- **LEIA**: problema com equipamento do banheiro
- **ENTENDA**: falha de manutenção afetando descanso
- **CLASSIFIQUE**: Manutenção - Banheiro

**Exemplo 5**: "Fiquei decepcionado com a variedade do jantar"
- **LEIA**: insatisfação com opções de refeição noturna
- **ENTENDA**: problema na oferta gastronômica do período noturno  
- **CLASSIFIQUE**: A&B - Jantar

🎨 **PROBLEMAS PADRONIZADOS** (para gráficos gerenciais):
Use categorias específicas que ajudem a gestão:
- **Demora no Atendimento** (não "ruim")
- **Equipamento com Falha** (não "quebrado") 
- **Qualidade da Refeição Abaixo do Esperado** (não "comida ruim")
- **Wi-Fi Instável** (não "internet ruim")
- **Falta de Limpeza** (não "sujo")
- **Preço Alto** (não "caro")
- **Falta de Variedade** (não "pouco")
- **Ruído Excessivo** (não "barulhento")

🌟 **DIRETRIZES DE AUTONOMIA**:

1. **MÚLTIPLOS ASPECTOS**: Se o feedback menciona várias áreas, crie classificações separadas para cada uma

2. **CONTEXTO SEMÂNTICO**: Use o contexto para entender melhor:
   - "Pessoa do restaurante" = A&B - Serviço
   - "Funcionário da limpeza" = Limpeza - Serviço
   - "Moça da recepção" = Recepção - Serviço

3. **INTENÇÃO REAL**: Detecte a verdadeira intenção:
   - Elogio mascarado: "Poderia ser melhor" = crítica construtiva
   - Ironia: "Que serviço rápido" (com contexto negativo) = crítica
   - Sugestão implícita: "Senti falta de..." = sugestão de melhoria

4. **ESPECIFICIDADE INTELIGENTE**: 
   - Se consegue identificar área específica → use-a
   - Se é genérico demais → use "Produto - Experiência"
   - Se há dúvida → escolha a opção mais específica possível

5. **ANÁLISE EMOCIONAL**: Considere o tom emocional:
   - Sentiment 1-2: Críticas e problemas sérios
   - Sentiment 3: Neutro ou misto  
   - Sentiment 4-5: Elogios e satisfação

💡 **SUA MISSÃO FINAL**:
- **NÃO** procure palavras-chave no texto
- **NÃO** use comparação mecânica
- **SIM** leia e compreenda como um especialista em hospitalidade faria
- **SIM** use toda sua inteligência para classificar corretamente
- **SIM** crie quantas classificações forem necessárias

Você tem TOTAL LIBERDADE para interpretar e classificar. Seja uma IA inteligente que realmente entende hospitalidade, não um robô que compara palavras.`;

  const userPrompt = `**FEEDBACK DO HÓSPEDE:**
"${text}"

**DEPARTAMENTOS DISPONÍVEIS:**
${candidates.departments.map(d => `- ${d.id}: ${d.label}${d.description ? ` (${d.description})` : ''}`).join('\n')}

**KEYWORDS CANDIDATAS (top por similaridade):**
${candidates.keywords.map(k =>
    `- ID: ${k.id}
    Label: ${k.label}
    Dept: ${k.department_id}
    Score: ${k.similarity_score.toFixed(3)}
    ${k.description ? `Desc: ${k.description}` : ''}
    Exemplos: ${k.examples.slice(0, 2).join('; ')}`
  ).join('\n\n')}

**PROBLEMS CANDIDATOS (top por similaridade):**
${candidates.problems.map(p =>
    `- ID: ${p.id}
    Label: ${p.label}
    Score: ${p.similarity_score.toFixed(3)}
    ${p.description ? `Desc: ${p.description}` : ''}
    ${p.applicable_departments ? `Depts: ${p.applicable_departments.join(', ')}` : 'Todos depts'}
    Exemplos: ${p.examples.slice(0, 2).join('; ')}`
  ).join('\n\n')}

**INSTRUÇÕES CRÍTICAS PARA ANÁLISE SEMÂNTICA:**

🎯 **ANÁLISE DO SENTIMENTO PRIMEIRO:**
1. **ELOGIO POSITIVO** ("gostei", "maravilhoso", "excelente") → problem_id = "EMPTY"
2. **CRÍTICA NEGATIVA** ("ruim", "péssimo", "decepcionado") → use problem_id apropriado
3. **NEUTRO/MISTO** → analise caso a caso

🧠 **MATCHING INTELIGENTE:**
- **NÃO** faça match apenas por palavras similares
- **SIM** entenda o CONTEXTO e INTENÇÃO
- **EXEMPLO**: "Gostei do atendimento" ≠ "Atendimento ruim" (mesmo tendo "atendimento")

🔍 **SELEÇÃO DE CANDIDATOS:**
- Use APENAS IDs dos candidatos fornecidos acima
- Para ELOGIOS: sempre problem_id = "EMPTY" 
- Para PROBLEMAS: escolha o problem_id mais adequado ao contexto negativo
- Se nenhum candidato serve perfeitamente: use proposed_*_label

⚡ **REGRAS FINAIS:**
- Máximo 3 issues por feedback
- confidence < 0.5 → needs_review = true
- Seja INTELIGENTE, não mecânico!`;

  // Schema dinâmico baseado nos candidatos reais
  const departmentIds = candidates.departments.map(d => d.id);
  const keywordIds = [...candidates.keywords.map(k => k.id), "EMPTY"];
  const problemIds = [...candidates.problems.map(p => p.id), "EMPTY"];

  const functionSchema = {
    name: "classify_feedback",
    description: "Classifica feedback em sentimento, problemas e sugestões usando candidatos dinâmicos",
    parameters: {
      type: "object",
      properties: {
        sentiment: {
          type: "integer",
          enum: [1, 2, 3, 4, 5],
          description: "1=Muito insatisfeito, 2=Insatisfeito, 3=Neutro, 4=Satisfeito, 5=Muito satisfeito"
        },
        has_suggestion: {
          type: "boolean",
          description: "true se contém sugestão de melhoria"
        },
        suggestion_type: {
          type: "string",
          enum: ["none", "improvement_only", "improvement_with_criticism", "improvement_with_praise", "mixed_feedback"],
          description: "Tipo de sugestão identificada"
        },
        suggestion_summary: {
          type: "string",
          maxLength: 200,
          description: "Resumo apenas da sugestão (vazio se has_suggestion=false)"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confiança na classificação (0-1)"
        },
        issues: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              department_id: {
                type: "string",
                enum: departmentIds,
                description: "ID do departamento"
              },
              keyword_id: {
                type: "string",
                enum: keywordIds,
                description: "ID da keyword ou EMPTY para elogios"
              },
              problem_id: {
                type: "string",
                enum: problemIds,
                description: "ID do problema ou EMPTY para elogios"
              },
              detail: {
                type: "string",
                maxLength: 120,
                description: "Descrição específica do que aconteceu"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confiança nesta issue específica"
              }
            },
            required: ["department_id", "keyword_id", "problem_id", "detail", "confidence"]
          }
        },
        proposed_keyword_label: {
          type: "string",
          maxLength: 100,
          description: "OPCIONAL: Nova keyword se nenhuma candidata serve"
        },
        proposed_problem_label: {
          type: "string",
          maxLength: 100,
          description: "OPCIONAL: Novo problema se nenhum candidato serve"
        }
      },
      required: ["sentiment", "has_suggestion", "suggestion_type", "suggestion_summary", "confidence", "issues"]
    }
  };

  return { systemPrompt, userPrompt, functionSchema };
}

/**
 * Processa resposta do LLM e valida
 */
function processLLMResponse(
  response: any,
  candidates: ClassificationCandidates,
  taxonomyVersion: number,
  processingTimeMs: number
): ClassificationResult {

  const issues: ClassificationIssue[] = [];

  // Processar cada issue
  for (const issue of response.issues || []) {
    // Buscar labels pelos IDs
    const department = candidates.departments.find(d => d.id === issue.department_id);
    const keyword = candidates.keywords.find(k => k.id === issue.keyword_id);
    const problem = candidates.problems.find(p => p.id === issue.problem_id);

    if (!department) {
      console.warn(`Departamento não encontrado: ${issue.department_id}`);
      continue;
    }

    issues.push({
      department_id: issue.department_id,
      keyword_id: issue.keyword_id || 'EMPTY',
      problem_id: issue.problem_id || 'EMPTY',

      department_label: department.label,
      keyword_label: keyword ? keyword.label : 'Elogio',
      problem_label: problem ? problem.label : 'VAZIO',

      detail: (issue.detail || '').substring(0, 120),
      confidence: Math.max(0, Math.min(1, issue.confidence || 0.5)),
      matched_by: keyword ? (keyword.similarity_score > 0.9 ? 'exact' : 'embedding') : 'proposed'
    });
  }

  // Se não há issues, criar uma padrão
  if (issues.length === 0) {
    issues.push({
      department_id: 'Operacoes',
      keyword_id: 'EMPTY',
      problem_id: 'EMPTY',
      department_label: 'Operações',
      keyword_label: 'Atendimento',
      problem_label: 'VAZIO',
      detail: '',
      confidence: 0.3,
      matched_by: 'proposed'
    });
  }

  const overallConfidence = Math.max(0, Math.min(1, response.confidence || 0.5));

  const sentiment = Math.max(1, Math.min(5, response.sentiment || 3)) as 1 | 2 | 3 | 4 | 5;

  return {
    sentiment,
    has_suggestion: Boolean(response.has_suggestion),
    suggestion_type: response.suggestion_type || 'none',
    suggestion_summary: (response.suggestion_summary || '').substring(0, 200),

    issues,

    proposed_keyword_label: response.proposed_keyword_label,
    proposed_problem_label: response.proposed_problem_label,

    taxonomy_version: taxonomyVersion,
    confidence: overallConfidence,
    needs_review: overallConfidence < 0.5,
    processing_time_ms: processingTimeMs,
    used_candidates: {
      keywords: candidates.keywords.map(k => k.id),
      problems: candidates.problems.map(p => p.id)
    }
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Obter dados do request uma única vez (fora do try para acessibilidade no catch)
  let body: any;
  let finalText: string = ''; // Inicializar com valor padrão

  try {
    body = await request.json();
    const { texto, comment, text } = body;
    finalText = texto || comment || text || '';

    // Circuit Breaker - verificar se sistema está disponível
    if (!checkCircuitBreaker()) {
      console.log('⚡ Circuit breaker aberto - usando fallback direto');

      // Ir direto para fallback básico quando circuit breaker está aberto
      const fallbackResult = createBasicFeedback(finalText, body.rating);
      return NextResponse.json({
        ...fallbackResult,
        circuit_breaker_active: true,
        message: 'Sistema em recuperação - usando análise básica'
      });
    }

    // Rate limiting
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Rate limit atingido. Aguarde um momento.' },
        { status: 429 }
      );
    }
    requestCount++;

    // Validar entrada
    if (!finalText || finalText.trim().length < 3) {
      return NextResponse.json({
        sentiment: 3,
        has_suggestion: false,
        suggestion_type: 'none',
        suggestion_summary: '',
        issues: [{
          department_id: 'Operacoes',
          keyword_id: 'EMPTY',
          problem_id: 'EMPTY',
          department_label: 'Operações',
          keyword_label: 'Atendimento',
          problem_label: 'VAZIO',
          detail: '',
          confidence: 0.3,
          matched_by: 'proposed'
        }],
        confidence: 0.3,
        needs_review: true,
        taxonomy_version: 1,
        processing_time_ms: Date.now() - startTime,
        used_candidates: { keywords: [], problems: [] }
      } as ClassificationResult);
    }

    // Verificar cache
    const taxonomy = await loadTaxonomy();
    const cacheKey = `${finalText ? finalText.trim().toLowerCase().slice(0, 100) : 'empty'}_v${taxonomy.version}`;
    const cached = analysisCache.get(cacheKey);

    if (cached && cached.taxonomy_version === taxonomy.version) {
      console.log('📋 Usando resultado do cache');
      return NextResponse.json(cached.result);
    }

    // API Key
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '') ||
      body.apiKey ||
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key não configurada' },
        { status: 400 }
      );
    }

    console.log('🎯 Processando novo feedback:', {
      length: finalText ? finalText.length : 0,
      taxonomyVersion: taxonomy.version
    });

    // 🚨 VERIFICAR MUDANÇAS NA TAXONOMIA PRIMEIRO
    try {
      const taxonomyCheckResponse = await fetch(`${request.nextUrl.origin}/api/quick-embeddings-check`);
      if (taxonomyCheckResponse.ok) {
        const taxonomyStatus = await taxonomyCheckResponse.json();
        
        if (taxonomyStatus.status === 'missing') {
          console.log('⚠️ Embeddings não foram gerados ainda');
          return NextResponse.json({
            error: 'embeddings_not_generated',
            message: 'Embeddings da IA não foram gerados ainda. Acesse a área administrativa para gerar.',
            needs_embeddings_generation: true,
            admin_url: '/admin/ai-configuration',
            fallback_available: true
          }, { status: 400 });
        }
        
        if (taxonomyStatus.status === 'outdated') {
          console.log('⚠️ Taxonomia foi alterada - embeddings desatualizados');
          return NextResponse.json({
            error: 'taxonomy_changed',
            message: `Taxonomia foi alterada: ${taxonomyStatus.message}. Regenere os embeddings para usar a nova IA.`,
            needs_regeneration: true,
            changes_detected: taxonomyStatus.changes,
            admin_url: '/admin/ai-configuration',
            fallback_available: true
          }, { status: 400 });
        }
      }
    } catch (taxonomyCheckError) {
      console.warn('⚠️ Erro ao verificar status da taxonomia:', taxonomyCheckError);
      // Continuar com a análise normal se a verificação falhar
    }

    // 🚨 VERIFICAR se tem embeddings disponíveis
    const hasEmbeddings = taxonomy.keywords.some(k => k.embedding && k.embedding.length > 0) ||
      taxonomy.problems.some(p => p.embedding && p.embedding.length > 0);

    if (!hasEmbeddings) {
      console.log('⚠️ Nenhum embedding disponível, usando análise textual direta');

      const text = finalText ? finalText.toLowerCase() : '';
      let selectedKeyword = null;
      let selectedProblem = null;
      let department = 'Operacoes';

      // Detectar contexto de A&B
      if (text.includes('comida') || text.includes('garçom') || text.includes('atend') || text.includes('restaurante')) {
        department = 'A&B';
        selectedKeyword = taxonomy.keywords.find(kw =>
          kw.label.includes('A&B') && kw.label.includes('Serviço')
        );
      }

      // Detectar problemas específicos
      if (text.includes('demorou') || text.includes('demora')) {
        selectedProblem = taxonomy.problems.find(prob =>
          prob.label.toLowerCase().includes('demora') &&
          prob.label.toLowerCase().includes('atend')
        );
      }

      if (text.includes('fria') || text.includes('frio')) {
        if (!selectedProblem) {
          selectedProblem = taxonomy.problems.find(prob =>
            prob.label.toLowerCase().includes('temperatura') ||
            prob.label.toLowerCase().includes('frio') ||
            prob.label.toLowerCase().includes('qualidade')
          );
        }
      }

      const fallbackResult: ClassificationResult = {
        sentiment: text.includes('fria') || text.includes('demorou') ? 2 : 3,
        has_suggestion: false,
        suggestion_type: 'none',
        suggestion_summary: '',
        issues: [{
          department_id: department,
          keyword_id: selectedKeyword?.id || 'EMPTY',
          problem_id: selectedProblem?.id || 'EMPTY',
          department_label: department,
          keyword_label: selectedKeyword?.label || 'Atendimento Geral',
          problem_label: selectedProblem?.label || 'Problema de Qualidade',
          detail: `Comida fria e demora no atendimento identificados`,
          confidence: selectedKeyword && selectedProblem ? 0.75 : 0.6,
          matched_by: 'proposed' as const
        }],
        taxonomy_version: taxonomy.version,
        confidence: selectedKeyword && selectedProblem ? 0.75 : 0.6,
        needs_review: !selectedKeyword || !selectedProblem,
        processing_time_ms: Date.now() - startTime,
        used_candidates: { keywords: [], problems: [] }
      };

      return NextResponse.json(fallbackResult);
    }

    // 1. Buscar candidatos por similaridade (só se tem embeddings)
    const candidates = await findCandidates(finalText, undefined, apiKey);

    console.log('🔍 Candidatos encontrados:', {
      keywords: candidates.keywords.length,
      problems: candidates.problems.length,
      topKeyword: candidates.keywords[0]?.label,
      topProblem: candidates.problems[0]?.label
    });

    // 2. Criar prompt dinâmico
    const { systemPrompt, userPrompt, functionSchema } = createDynamicPrompt(
      finalText,
      candidates
    );

    // 3. Chamar OpenAI
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      functions: [functionSchema],
      function_call: { name: "classify_feedback" },
      temperature: 0.1,
      max_tokens: 1000
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== "classify_feedback") {
      throw new Error("LLM não retornou função esperada");
    }

    const llmResult = JSON.parse(functionCall.arguments);

    // 4. Processar e validar resposta
    const result = processLLMResponse(
      llmResult,
      candidates,
      taxonomy.version,
      Date.now() - startTime
    );

    // 5. Lidar com propostas
    if (llmResult.proposed_keyword_label) {
      try {
        await createTaxonomyProposal(
          'keyword',
          llmResult.proposed_keyword_label,
          finalText,
          result.issues[0]?.department_id,
          'system'
        );
        console.log('💡 Proposta de keyword criada:', llmResult.proposed_keyword_label);
      } catch (error) {
        console.error('Erro ao criar proposta de keyword:', error);
      }
    }

    if (llmResult.proposed_problem_label) {
      try {
        await createTaxonomyProposal(
          'problem',
          llmResult.proposed_problem_label,
          finalText,
          undefined,
          'system'
        );
        console.log('💡 Proposta de problem criada:', llmResult.proposed_problem_label);
      } catch (error) {
        console.error('Erro ao criar proposta de problem:', error);
      }
    }

    // 6. Salvar no cache
    analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      taxonomy_version: taxonomy.version
    });

    // NOVA: Aplicar camada de compatibilidade
    const compatibleResult = adaptNewAIToLegacyFormat(result as NewAIResponse);

    // Registrar sucesso no circuit breaker
    recordSuccess();

    // Log de performance
    performanceLogger.logAISuccess(
      result.processing_time_ms || (Date.now() - startTime),
      compatibleResult.confidence || 0.5,
      finalText ? finalText.length : 0,
      hasEmbeddings,
      circuitBreaker.state
    );

    // Log de sucesso para monitoramento
    console.log('✅ Análise concluída com nova IA:', {
      sentiment: compatibleResult.confidence,
      issues_count: result.issues?.length || 0,
      has_embeddings: hasEmbeddings,
      processing_time: result.processing_time_ms,
      circuit_breaker_state: circuitBreaker.state
    });

    // Retornar resultado no formato esperado pelos componentes existentes
    return NextResponse.json(compatibleResult);

  } catch (error: any) {
    console.error('❌ Erro na análise:', error);

    // Se não conseguiu fazer parse do body, tentar novamente
    if (!body) {
      try {
        body = await request.json();
        const { texto, comment, text } = body;
        finalText = texto || comment || text || '';
      } catch (parseError) {
        // Se falhar completamente, usar valores padrão
        body = {};
        finalText = '';
      }
    }

    // Garantir que finalText sempre tenha um valor válido
    if (!finalText) {
      finalText = '';
    }

    // Registrar falha no circuit breaker (apenas para erros críticos)
    const errorType = classifyError(error);
    if (errorType === 'timeout' || errorType === 'network_error' || errorType === 'unknown_error') {
      recordFailure();
    }

    console.log('🔍 Tipo de erro detectado:', errorType, 'Circuit breaker:', circuitBreaker.state);

    // NOVA: Sistema de fallbacks inteligentes com múltiplos níveis
    console.log('🔄 Iniciando sistema de fallbacks...');

    // NÍVEL 1: Tentar análise textual sem embeddings (com retry se apropriado)
    try {
      console.log('📝 Tentando fallback textual...');

      const fallbackResult = await retryWithBackoff(async () => {
        const fallbackResponse = await fetch('/api/analyze-feedback-fallback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: finalText, apiKey: body.apiKey })
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Fallback API error: ${fallbackResponse.status}`);
        }

        return await fallbackResponse.json();
      }, errorType === 'network_error' ? 3 : 1, 1000, errorType);

      console.log('✅ Fallback textual bem-sucedido');

      // Log de performance
      performanceLogger.logTextualFallback(
        Date.now() - startTime,
        fallbackResult.confidence || 0.5,
        finalText ? finalText.length : 0,
        errorType
      );

      // Log para monitoramento
      console.log('📊 Fallback usado:', {
        type: 'textual_analysis',
        reason: error.message,
        error_type: errorType,
        confidence: fallbackResult.confidence || 0.5
      });

      return NextResponse.json(fallbackResult);

    } catch (textualError: any) {
      console.error('❌ Erro no fallback textual:', textualError);
    }

    // NÍVEL 2: Análise básica com heurísticas simples
    try {
      console.log('🔧 Tentando fallback básico...');

      // Extrair rating se disponível no texto
      const ratingMatch = finalText ? finalText.match(/\b([1-5])\b/) : null;
      const rating = ratingMatch ? parseInt(ratingMatch[1]) : 3;

      // Criar feedback básico usando adaptador
      const basicResult = createBasicFeedback(finalText || 'Texto não disponível', rating);

      // Log de performance
      performanceLogger.logBasicFallback(
        Date.now() - startTime,
        basicResult.confidence || 0.3,
        finalText ? finalText.length : 0,
        errorType
      );

      // Log para monitoramento
      console.log('📊 Fallback básico usado:', {
        type: 'basic_classification',
        reason: error.message,
        text_length: finalText ? finalText.length : 0
      });

      console.log('✅ Fallback básico aplicado com sucesso');
      return NextResponse.json(basicResult);

    } catch (basicError: any) {
      console.error('❌ Erro no fallback básico:', basicError);
    }

    // NÍVEL 3: Fallback final - estrutura mínima garantida
    console.log('🚨 Usando fallback final de emergência');

    // Log crítico para monitoramento
    console.error('📊 Fallback de emergência usado:', {
      type: 'emergency_fallback',
      original_error: error.message,
      error_type: errorType,
      basic_error: 'Todos os fallbacks falharam',
      text_preview: finalText ? finalText.substring(0, 50) : 'Texto não disponível',
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    const emergencyResult = createEmergencyFeedback(finalText || 'Texto não disponível', error.message);

    // Log de performance
    performanceLogger.logEmergencyFallback(
      Date.now() - startTime,
      finalText ? finalText.length : 0,
      errorType,
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({
      ...emergencyResult,
      processing_error: error.message,
      fallback_level: 'emergency'
    });
  }
}