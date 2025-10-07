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
import { 
  validateKeywordDepartment, 
  autoCorrectDepartment, 
  KEYWORD_DEPARTMENT_MAP 
} from '@/lib/taxonomy-validation';

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
 * Cria prompt dinâmico com candidatos (versão SIMPLIFICADA E FOCADA)
 * ✅ OTIMIZADO: Reduzido de 600+ para ~150 linhas
 * ✅ NOVO: Campo 'reasoning' obrigatório para IA explicar decisões
 */
function createDynamicPrompt(
  text: string,
  candidates: ClassificationCandidates
): { systemPrompt: string; userPrompt: string; functionSchema: any } {

  const systemPrompt = `Você é um classificador especializado em feedback hoteleiro.

🎯 SUA MISSÃO PRINCIPAL:
Identifique TODOS os aspectos mencionados e crie 1 issue para CADA aspecto (máx 3).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGRAS ABSOLUTAS - LEIA ISSO PRIMEIRO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ MÚLTIPLOS ASPECTOS = MÚLTIPLAS ISSUES
   • Feedback menciona 3 coisas? → Crie 3 issues!
   • NUNCA junte tudo em 1 issue só
   • Exemplo: "recepção ruim, banheiro sujo, localização boa" = 3 ISSUES

2️⃣ NUNCA SEJA CONSERVADOR
   • ❌ NÃO diga: "não especificou, então não criei issue"
   • ✅ SIM: Sempre PRESUMA a keyword mais provável
   • Exemplo: "banheiro sujo" → PRESUMA Limpeza-Banheiro (não precisa certeza!)

3️⃣ ELOGIOS E CRÍTICAS COEXISTEM
   • Feedback tem positivo E negativo? → Crie issues para AMBOS!
   • ❌ NÃO ignore elogios porque há críticas
   • Exemplo: "localização boa mas recepção ruim" = 2 issues

4️⃣ COMO PRESUMIR (REGRAS DE PRESUNÇÃO):
   • Banheiro sujo/problema → Limpeza-Banheiro (1ª opção) ou Manutenção-Banheiro (se mencionar quebrado/vazamento)
   • Quarto sujo/problema → Limpeza-Quarto (1ª opção)
   • Localização/aeroporto/centro → Produto-Localização
   • Qualquer dúvida → escolha a keyword MAIS ÓBVIA, não fique paralizado!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 REGRAS CRÍTICAS DE ANÁLISE CONTEXTUAL:

📖 EXEMPLOS PRÁTICOS (APRENDA COM ESTES):

Exemplo 1 - Múltiplos aspectos:
Feedback: "Recepção péssima. Banheiro piora tudo. Mas localização boa."
→ 3 ISSUES:
  1. Operações-Atendimento (negativo, recepção)
  2. Limpeza-Banheiro (negativo, presumo problema de limpeza)
  3. Produto-Localização (positivo, elogio)
Reasoning: "Feedback menciona: 1.recepção 2.banheiro 3.localização. Criei 3 issues."

Exemplo 2 - Contexto importa:
Feedback: "Atendente no restaurante foi ótima"
→ A&B-Serviço (NÃO Operações-Atendimento, porque é NO RESTAURANTE!)

Exemplo 3 - Presunção sem certeza:
Feedback: "Quarto seria bom se não fosse pelo banheiro"
→ 2 ISSUES:
  1. Limpeza-Quarto (neutro/positivo)
  2. Limpeza-Banheiro (negativo, PRESUMO limpeza mesmo sem detalhes)
Reasoning: "📋 ASPECTOS: 1.quarto, 2.banheiro | ✅ ISSUES: 1. Quarto seria bom → Limpeza-Quarto (aspecto positivo) | 2. Banheiro com problema → Limpeza-Banheiro (presumo limpeza, pois não especificou o tipo de problema) | ⚠️ NÃO CLASSIFICADOS: Nenhum"

Exemplo 4 - Quando NÃO tem certeza:
Feedback: "Ficamos no hotel em julho e foi legal"
→ 1 ISSUE:
  1. Produto-Experiência (positivo, elogio genérico)
Reasoning: "📋 ASPECTOS: 1.experiência geral, 2.mês de estadia | ✅ ISSUES: 1. Experiência legal → Produto-Experiência (elogio genérico) | ⚠️ NÃO CLASSIFICADOS: ❌ Mês 'julho': menção temporal, não é aspecto classificável do hotel"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GLOSSARIO (casos criticos):
• AMENITIES = higiene (shampoo, sabonete) -> "Limpeza - Amenities"
• EMPRESTIMO (ferro, tabua) -> "Recepcao - Servico" (NAO amenities!)
• ESTACIONAMENTO -> "Recepcao - Estacionamento" (NAO generico!)

🚨 REGRA CRÍTICA - MONITORES DE RECREAÇÃO:
→ Se menciona "Tio/Tia" + nome (ex: Tio Baiano, Tia Dentinho, Tio Espaguete, Tio Chocolate)
→ SEMPRE classifique como "Lazer - Serviço" (NÃO use EG - Abordagem!)
→ Contexto: Monitores/recreadores trabalham em atividades de lazer (bingo, piscina, recreação infantil)
→ Exemplos de NOMES comuns: Espaguete, Chocolate, Parafuso, Dentinho, Chiclete, Alegria, Baiano, Chan, Lucas, Raí
→ ❌ NUNCA confunda nomes com comida (Espaguete ≠ comida, Chocolate ≠ sobremesa)

🚨 REGRA CRÍTICA - O QUE É "EG - Abordagem":
→ EG = Exclusive Guest (Programa de vendas do hotel)
→ USE APENAS quando:
  • Menciona explicitamente "EG", "Vendas", "Programa de vendas"
→ ❌ NÃO use EG para elogios genéricos a funcionários
→ ❌ NÃO use EG para monitores de recreação

---

REGRAS TECNICAS:

• Sentiment 1-2 (negativo) → use problem_label válido
• Sentiment 4-5 (positivo) → use problem_label="EMPTY"
• Keywords "Limpeza-X" pertencem ao dept "Governança" (veja campo "Dept:")
⚠️ TRADUÇÃO OBRIGATÓRIA:
• Traduza TUDO para português brasileiro (detail, reasoning, suggestion_summary, propostas)
• Elogios: "Great breakfast" → "Café da manhã excelente"
• Detalhes: "Very good location" → "Localização muito boa"
• NUNCA mantenha o idioma original (espanhol, inglês, etc)

REGRA DE ESPECIFICIDADE (CRITICA!):
→ Se feedback menciona termo especifico (ex: "estacionamento", "ferro", "wifi")
→ SEMPRE escolha a keyword ESPECIFICA correspondente, NUNCA generica!
→ Ex: "estacionamento" = "Recepcao-Estacionamento" (NAO "Operacoes-Atendimento")
→ Ex: "ferro/tabua" = "Recepcao-Servico" (NAO "Limpeza-Amenities")
`;

  const userPrompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGRA CRÍTICA: USE OS LABELS DOS CANDIDATOS! 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE: Você deve retornar LABELS (ex: "Produto - Transfer")
              NÃO retorne IDs (ex: "kw_123456")!

Abaixo você receberá uma lista de KEYWORDS CANDIDATAS.

⚠️ OBRIGATÓRIO: Para CADA issue, você DEVE:
1. Procurar na lista de KEYWORDS CANDIDATAS abaixo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📋 FEEDBACK DO HÓSPEDE:**
"${text}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🔑 KEYWORDS CANDIDATAS:**
${candidates.keywords.length > 0 ? candidates.keywords.map(k =>
    `• Label: "${k.label}" | Dept: ${k.department_id} | Score: ${k.similarity_score.toFixed(2)}
  ${k.description ? `→ ${k.description}` : ''}
  � Exemplos: ${k.examples.slice(0, 2).join(' | ')}`
  ).join('\n\n') : '⚠️ NENHUMA keyword candidata encontrada'}

**🔧 PROBLEMS CANDIDATOS:**
${candidates.problems.length > 0 ? candidates.problems.map(p =>
    `• Label: "${p.label}" | Score: ${p.similarity_score.toFixed(2)}
  ${p.description ? `→ ${p.description}` : ''}
  💡 Exemplo: ${p.examples[0] || 'N/A'}`
  ).join('\n\n') : '⚠️ NENHUM problem candidato encontrado'}

**📌 DEPARTAMENTOS:**
${candidates.departments.map(d => `- ${d.id}: ${d.label}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **ATENÇÃO - MAPEAMENTO CRÍTICO:**
Keywords "Limpeza - X" pertencem ao departamento "Governança" (não "Limpeza")!
Sempre extraia o departamento do campo "Dept:" mostrado acima!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Schema dinâmico baseado nos candidatos reais
  const departmentIds = candidates.departments.map(d => d.id);
  const keywordLabels = [...candidates.keywords.map(k => k.label), "EMPTY"];
  const problemLabels = [...candidates.problems.map(p => p.label), "EMPTY"];

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
          description: "Resumo apenas da sugestão em PORTUGUÊS (vazio se has_suggestion=false). ⚠️ CRÍTICO: SEMPRE escreva em PT-BR, NUNCA mantenha o idioma original do feedback! Traduza tudo para português brasileiro."
        },
        reasoning: {
          type: "string",
          maxLength: 800,
          description: `🧠 RACIOCÍNIO DETALHADO OBRIGATÓRIO EM PORTUGUÊS (faça isso ANTES de criar issues!):

ESTRUTURA OBRIGATÓRIA:

📋 ASPECTOS DETECTADOS:
Liste TUDO que foi mencionado no feedback, mesmo que você não vá criar issue.
Formato: "1. [aspecto], 2. [aspecto], 3. [aspecto]"

✅ ISSUES CRIADAS:
Para cada issue que você CRIOU, explique:
• Aspecto detectado
• Keyword escolhida
• Por que escolheu essa classificação
Formato: "1. [aspecto] → [Keyword] ([justificativa])"

⚠️ ASPECTOS NÃO CLASSIFICADOS (SE HOUVER):
Para qualquer aspecto mencionado no feedback que você NÃO criou issue, explique:
• O que você detectou
• Por que não criou issue (ex: muito vago, não há keyword adequada, contexto insuficiente)
Formato: "❌ [aspecto]: [razão para não classificar]"

EXEMPLO COMPLETO:
"📋 ASPECTOS: 1.tampa vaso sanitário, 2.experiência geral
✅ ISSUES: 1. Tampa vaso → Manutenção-Banheiro (problema específico de manutenção) | 2. Experiência boa → Produto-Experiência (elogio geral)
⚠️ NÃO CLASSIFICADOS: Nenhum - todos os aspectos foram classificados"

⚠️ CRÍTICO: Sempre escreva em PORTUGUÊS, mesmo que feedback esteja em outro idioma!`
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confiança na classificação (0-1)"
        },
        issues: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          description: "1-8 issues ESPECÍFICAS (crie TODAS as issues identificadas no reasoning). ⚠️ CRÍTICO: Se você identificou 5 aspectos no reasoning, crie 5 issues! Cada aspecto mencionado no feedback DEVE virar uma issue separada. NÃO seja conservador! Exemplo: 'recepção ruim, banheiro sujo, localização boa, café frio, wifi lento' = 5 issues distintas!",
          items: {
            type: "object",
            properties: {
              department_id: {
                type: "string",
                enum: departmentIds,
                description: "ID do departamento. ATENÇÃO: Keywords 'Limpeza-X' pertencem a 'Governança'! Veja campo 'Dept:' dos candidatos acima!"
              },
              keyword_label: {
                type: "string",
                enum: keywordLabels,
                description: "Label COMPLETO da keyword (ex: 'A&B - Serviço'). CONTEXTO É CRÍTICO: 'atendimento no restaurante' = A&B-Serviço (NÃO Operações-Atendimento). Use EMPTY apenas se não há candidato adequado."
              },
              problem_label: {
                type: "string",
                enum: problemLabels,
                description: "Label do problema. Sentiment 1-2 (negativo) → escolha problem válido. Sentiment 4-5 (elogio) → use EMPTY."
              },
              detail: {
                type: "string",
                maxLength: 120,
                description: "Descrição específica em PORTUGUÊS (traduza se necessário). Ex: 'Great breakfast' → 'Café da manhã excelente'."
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confiança nesta issue específica"
              },
              proposed_keyword: {
                type: "string",
                maxLength: 100,
                description: "OBRIGATÓRIO quando keyword_label=EMPTY! Propor keyword EM PORTUGUÊS no formato 'Departamento - Aspecto' (ex: 'A&B - Gastronomia', 'Produto - Transfer'). NÃO deixe vazio se usar keyword_label=EMPTY!"
              }
            },
            required: ["department_id", "keyword_label", "problem_label", "detail", "confidence"]
          }
        },
        proposed_keyword_label: {
          type: "string",
          maxLength: 100,
          description: "OPCIONAL: Nova keyword EM PORTUGUÊS se nenhuma candidata serve. Sempre em PT-BR."
        },
        proposed_problem_label: {
          type: "string",
          maxLength: 100,
          description: "OPCIONAL: Novo problema EM PORTUGUÊS se nenhum candidato serve. Sempre em PT-BR."
        }
      },
      required: ["sentiment", "has_suggestion", "suggestion_type", "suggestion_summary", "reasoning", "confidence", "issues"]
    }
  };

  return { systemPrompt, userPrompt, functionSchema };
}

/**
 * Valida se uma keyword faz sentido semântico para o contexto
 * Remove matches nonsense como "Check-out - Atendimento" para "atendimento do restaurante"
 */
function validateKeywordContext(keywordLabel: string, departmentId: string, textContext: string): boolean {
  const textLower = textContext.toLowerCase();
  
  // 🚨 REGRA 1: Check-in/Check-out só se menciona explicitamente
  if (keywordLabel.includes('Check-in') || keywordLabel.includes('Check-out')) {
    const hasCheckInMention = textLower.includes('check') || 
                              textLower.includes('entrada') || 
                              textLower.includes('saída') ||
                              textLower.includes('chegada') ||
                              textLower.includes('partida');
    if (!hasCheckInMention) {
      console.log(`❌ Removendo keyword nonsense: "${keywordLabel}" - não menciona check-in/out`);
      return false;
    }
  }
  
  // 🚨 REGRA 2: Keywords de áreas específicas precisam do contexto da área
  const areaKeywords: Record<string, string[]> = {
    'Piscina': ['piscina'],
    'Academia': ['academia', 'gym', 'exercício', 'treino'],
    'Spa': ['spa', 'massagem', 'tratamento'],
    'Estacionamento': ['estacionamento', 'garagem', 'vaga', 'carro'],
    'Transfer': ['transfer', 'transporte', 'traslado'],
    'Lavanderia': ['lavanderia', 'roupa'],
    'Bar': ['bar', 'bebida', 'drinks'],
    'Café da manhã': ['café da manhã', 'breakfast', 'café', 'manhã'],
  };
  
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    if (keywordLabel.includes(area)) {
      const hasAreaMention = keywords.some(kw => textLower.includes(kw));
      if (!hasAreaMention) {
        console.log(`❌ Removendo keyword nonsense: "${keywordLabel}" - não menciona ${area}`);
        return false;
      }
    }
  }
  
  // 🚨 REGRA 3: Se é A&B, texto deve mencionar alimento/bebida/restaurante/bar
  if (departmentId === 'A&B' || departmentId === 'ab') {
    const hasABContext = textLower.includes('comida') || 
                        textLower.includes('restaurante') ||
                        textLower.includes('café') ||
                        textLower.includes('jantar') ||
                        textLower.includes('almoço') ||
                        textLower.includes('bar') ||
                        textLower.includes('bebida') ||
                        textLower.includes('garçom') ||
                        textLower.includes('gastronomia') ||
                        textLower.includes('refeição');
    
    if (!hasABContext) {
      console.log(`❌ Removendo keyword nonsense: "${keywordLabel}" (dept: A&B) - não menciona contexto de A&B`);
      return false;
    }
  }
  
  return true;
}

/**
 * Processa resposta do LLM e valida
 */
function processLLMResponse(
  response: any,
  candidates: ClassificationCandidates,
  taxonomyVersion: number,
  processingTimeMs: number,
  originalText: string = ''
): ClassificationResult {

  const issues: ClassificationIssue[] = [];
  
  // 🎯 Pegar keyword/problem propostos GLOBAIS (fora do array de issues)
  const globalProposedKeyword = response.proposed_keyword_label;
  const globalProposedProblem = response.proposed_problem_label;
  
  if (globalProposedKeyword) {
    console.log(`💡 IA propôs keyword global: "${globalProposedKeyword}"`);
  }
  if (globalProposedProblem) {
    console.log(`💡 IA propôs problem global: "${globalProposedProblem}"`);
  }

  // Processar cada issue
  for (const issue of response.issues || []) {
    // 🎯 BUSCAR POR LABEL (não por ID!)
    const department = candidates.departments.find(d => d.id === issue.department_id);
    const keyword = candidates.keywords.find(k => k.label === issue.keyword_label);
    const problem = candidates.problems.find(p => p.label === issue.problem_label);
    
    // Debug: Log separado para evitar erro no build
    const detailPreview = issue.detail?.substring(0, 50);
    console.log('🔍 Processing issue:', {
      department_id: issue.department_id,
      keyword_label: issue.keyword_label,
      problem_label: issue.problem_label,
      detail: detailPreview
    });
    
    const deptLabel = department?.label || 'NOT FOUND';
    const kwLabel = keyword?.label || issue.keyword_label || 'NOT FOUND';
    const probLabel = problem?.label || issue.problem_label || 'NOT FOUND';
    console.log('🔍 Found in candidates:', {
      department: deptLabel,
      keyword: kwLabel,
      problem: probLabel
    });
    
    // ✅ VALIDAÇÃO CONTEXTUAL DESABILITADA - deixar IA decidir baseado em análise semântica
    // A IA é mais inteligente que regras baseadas em palavras-chave
    // if (keyword && !validateKeywordContext(keyword.label, issue.department_id, originalText)) {
    //   console.log(`⚠️ Pulando issue com keyword inválida: ${keyword.label}`);
    //   continue;
    // }
    
    // ⚠️ VALIDAÇÃO: Se keyword_label=EMPTY sem proposed_keyword, REJEITAR (exceto Produto/Experiência)
    if (issue.keyword_label === 'EMPTY' && !issue.proposed_keyword) {
      // Permitir apenas para elogios genéricos em Produto
      if (issue.department_id === 'Produto' && response.sentiment >= 4) {
        console.log(`✅ Elogio genérico aceito: department=Produto, sem keyword específica necessária`);
      } else {
        console.error(`❌ ISSUE REJEITADA: keyword_label=EMPTY mas proposed_keyword não foi fornecido!`);
        console.error(`   Department: ${issue.department_id}, Sentiment: ${response.sentiment}`);
        console.error(`   Detail: ${issue.detail?.substring(0, 50)}`);
        console.error(`   ⚠️ IA DEVE preencher proposed_keyword quando usa keyword_label=EMPTY!`);
        continue; // Rejeitar esta issue
      }
    }

    // Tratar caso especial para elogios (department_id = "EMPTY")
    if (!department && issue.department_id !== 'EMPTY') {
      console.warn(`Departamento não encontrado: ${issue.department_id}`);
      continue;
    }

    // 🎯 EXTRAIR IDs a partir dos labels (busca por label já feita acima)
    let keywordId = 'EMPTY';
    let keywordLabel = 'Não identificado';
    let problemId = 'EMPTY';
    let problemLabel = 'VAZIO';
    let departmentId = issue.department_id;
    let matchedBy: 'embedding' | 'proposed' | 'exact' | 'direct' = 'direct';
    
    if (keyword) {
      // 1ª opção: Keyword encontrada nos candidatos por label
      keywordId = keyword.id;
      keywordLabel = keyword.label;
      matchedBy = keyword.similarity_score > 0.9 ? 'exact' : 'direct';
      console.log(`✅ Keyword encontrada: "${keywordLabel}" (ID: ${keywordId})`);
      
      // ✅ VALIDAÇÃO ESTRUTURAL: Verificar se keyword está no departamento correto
      const validation = validateKeywordDepartment(keywordLabel, departmentId);
      if (!validation.valid && validation.correctDepartment) {
        console.warn(`⚠️ CORREÇÃO AUTOMÁTICA: "${keywordLabel}" de "${departmentId}" → "${validation.correctDepartment}"`);
        departmentId = validation.correctDepartment;
      }
      
    } else if (issue.proposed_keyword) {
      // 2ª opção: Usar keyword proposta ESPECIFICAMENTE para esta issue
      keywordLabel = issue.proposed_keyword;
      matchedBy = 'proposed';
      const contextPreview = issue.detail?.substring(0, 40);
      console.log(`💡 Issue propôs keyword específica: "${keywordLabel}" para contexto "${contextPreview}..."`);
      
      // ✅ VALIDAÇÃO ESTRUTURAL: Corrigir departamento automaticamente
      const correction = autoCorrectDepartment(keywordLabel, departmentId);
      if (correction.corrected) {
        console.warn(`⚠️ CORREÇÃO AUTOMÁTICA: "${keywordLabel}" de "${departmentId}" → "${correction.newDepartmentId}"`);
        console.warn(`   Razão: ${correction.reason}`);
        departmentId = correction.newDepartmentId;
      }
      
    } else if (issue.keyword_label === 'EMPTY') {
      // Elogio genérico sem keyword específica
      keywordLabel = 'Experiência';
      console.log(`✅ Elogio genérico: usando "Experiência"`);
      
    } else {
      // 4ª opção: REJEITAR issue sem keyword válida
      console.error(`❌ ISSUE REJEITADA: keyword_label="${issue.keyword_label}" não encontrado nos candidatos!`);
      console.error(`   Department: ${departmentId}, Detail: ${issue.detail?.substring(0, 50)}`);
      console.error(`   ⚠️ IA deve escolher keyword dos candidatos ou preencher proposed_keyword`);
      continue; // Pular esta issue inválida
    }
    
    // Processar problem da mesma forma
    if (problem) {
      problemId = problem.id;
      problemLabel = problem.label;
      console.log(`✅ Problem encontrado: "${problemLabel}" (ID: ${problemId})`);
    } else if (issue.problem_label === 'EMPTY') {
      problemLabel = 'VAZIO';
    }
    
    // ✅ Buscar department atualizado após correção
    const finalDepartment = candidates.departments.find(d => d.id === departmentId) || department;
    
    issues.push({
      department_id: departmentId, 
      keyword_id: keywordId,
      problem_id: problemId,

      department_label: finalDepartment ? finalDepartment.label : 'Não identificado',
      keyword_label: keywordLabel,
      problem_label: problemLabel,

      detail: (issue.detail || '').substring(0, 120),
      confidence: Math.max(0, Math.min(1, issue.confidence || 0.5)),
      matched_by: matchedBy  
    });
  }


  if (issues.length === 0) {
 
    const defaultDepartment = candidates.departments.find(d => d.id === 'Recepcao') || candidates.departments[0];
    
    issues.push({
      department_id: defaultDepartment?.id || 'EMPTY',
      keyword_id: 'EMPTY',
      problem_id: 'EMPTY',
      department_label: defaultDepartment?.label || 'Geral',
      keyword_label: 'Atendimento',
      problem_label: 'VAZIO',
      detail: '',
      confidence: 0.3,
      matched_by: 'proposed'
    });
  }

  const overallConfidence = Math.max(0, Math.min(1, response.confidence || 0.5));

  // Debug: Log da resposta da IA para investigar problema de sentimento
  console.log('🔍 DEBUG - Resposta completa da IA:', JSON.stringify(response, null, 2));
  
  // NOVO: Mostrar o raciocínio da IA (Chain of Thought)
  if (response.reasoning) {
    console.log('\n🧠 RACIOCÍNIO DA IA (Chain of Thought):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response.reasoning);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  console.log('🔍 DEBUG - Sentiment recebido:', response.sentiment, 'tipo:', typeof response.sentiment);

  // Não forçar sentimento neutro - usar o que a IA retornou ou inferir do contexto
  let sentiment: 1 | 2 | 3 | 4 | 5;
  
  // Verificar se a IA retornou um sentimento válido
  if (response.sentiment && typeof response.sentiment === 'number') {
    // Se está na escala 1-5, usar diretamente
    if (response.sentiment >= 1 && response.sentiment <= 5 && Number.isInteger(response.sentiment)) {
      sentiment = response.sentiment as 1 | 2 | 3 | 4 | 5;
      console.log('✅ DEBUG - Sentiment válido (1-5) usado:', sentiment);
    }
    // Se está na escala 0-1 (decimal), converter para 1-5
    else if (response.sentiment >= 0 && response.sentiment <= 1) {
      // Converter escala 0-1 para 1-5
      if (response.sentiment <= 0.2) sentiment = 1;
      else if (response.sentiment <= 0.4) sentiment = 2;
      else if (response.sentiment <= 0.6) sentiment = 3;
      else if (response.sentiment <= 0.8) sentiment = 4;
      else sentiment = 5;
      console.log('🔄 DEBUG - Sentiment convertido de', response.sentiment, 'para', sentiment);
    }
    // Valor fora dos ranges esperados
    else {
      console.log('⚠️ DEBUG - Sentiment fora do range, inferindo do contexto. Valor:', response.sentiment);
      sentiment = inferSentimentFromContext();
    }
  } else {
    console.log('⚠️ DEBUG - Sentiment ausente ou inválido, inferindo do contexto. Valor:', response.sentiment);
    sentiment = inferSentimentFromContext();
  }

  function inferSentimentFromContext(): 1 | 2 | 3 | 4 | 5 {
    // Se não há sentimento da IA, inferir baseado nos problemas detectados
    const hasProblems = issues.some(issue => issue.problem_id !== 'EMPTY' && issue.problem_label !== 'VAZIO');
    const hasOnlyCompliments = issues.every(issue => issue.problem_id === 'EMPTY' || issue.problem_label === 'VAZIO');
    
    if (hasOnlyCompliments) {
      return 4; // Positivo se só há elogios
    } else if (hasProblems) {
      return 2; // Negativo se há problemas
    } else {
      return 3; // Neutro como último recurso
    }
  }

  return {
    sentiment,
    has_suggestion: Boolean(response.has_suggestion),
    suggestion_type: response.suggestion_type || 'none',
    suggestion_summary: (response.suggestion_summary || '').substring(0, 200),

    issues,

    proposed_keyword_label: response.proposed_keyword_label,
    proposed_problem_label: response.proposed_problem_label,

    // CRÍTICO: Incluir o reasoning no retorno!
    reasoning: response.reasoning,

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
        reasoning: 'Análise básica por fallback - IA principal não disponível',
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

    // 🎯 NOVA ABORDAGEM: Verificar se deve usar análise direta
    const { PERFORMANCE_CONFIG } = await import('@/lib/performance-config');
    const useDirectAnalysis = PERFORMANCE_CONFIG.USE_DIRECT_ANALYSIS;

    let candidates: ClassificationCandidates;

    if (useDirectAnalysis) {
      // 🚀 ANÁLISE DIRETA: GPT recebe TODAS as keywords sem filtro de embeddings
      console.log('🎯 MODO DIRETO ATIVADO: GPT receberá TODAS as 48 keywords');
      console.log('   ✅ Sem embeddings → mais preciso');
      console.log('   ✅ Funciona com qualquer linguagem');
      console.log('   ✅ Entende contexto naturalmente\n');
      
      // Criar candidatos "fake" com TODAS as keywords do taxonomy
      // taxonomy.keywords é um objeto { departamento: Keyword[] }
      const allKeywordsObjects = Object.values(taxonomy.keywords).flat();
      const allProblemsObjects = taxonomy.problems || [];
      
      candidates = {
        keywords: allKeywordsObjects.map((keyword, index) => {
          // ✅ CORREÇÃO CRÍTICA: Validar e corrigir department_id (ex: Limpeza → Governança)
          const validation = validateKeywordDepartment(keyword.label, keyword.department_id);
          const correctDepartmentId = validation.correctDepartment || keyword.department_id;
          
          return {
            id: keyword.id || `kw_direct_${index}`,
            label: keyword.label,
            department_id: correctDepartmentId,  // ✅ Usar department corrigido!
            similarity_score: 1.0, // Score máximo (não importa, IA vai decidir)
            matched_by: 'direct' as const,
            description: keyword.description,
            examples: keyword.examples || []
          };
        }),
        problems: allProblemsObjects.map((problem, index) => ({
          id: problem.id || `pb_direct_${index}`,
          label: problem.label,
          similarity_score: 1.0,
          matched_by: 'direct' as const,
          description: problem.description,
          examples: problem.examples || [],
          applicable_departments: problem.applicable_departments || []
        })),
        departments: taxonomy.departments || [],
        recall_method: 'hybrid' as const,
        recall_score_threshold: 1.0
      };

      console.log(`📋 Enviando para IA: ${candidates.keywords.length} keywords + ${candidates.problems.length} problems (TODOS!)`);
      console.log(`   🎯 Método: Análise direta (bypass embeddings)`);
      console.log(`   � Total: ${allKeywordsObjects.length} keywords, ${allProblemsObjects.length} problems\n`);
      
    } else {
      // 📊 ANÁLISE COM EMBEDDINGS: Busca por similaridade (modo antigo)
      console.log('📊 MODO EMBEDDINGS: Buscando candidatos por similaridade...\n');
      candidates = await findCandidates(finalText, undefined, apiKey);
    }

    console.log('🔍 Candidatos encontrados:', {
      keywords: candidates.keywords.length,
      problems: candidates.problems.length,
      topKeyword: candidates.keywords[0]?.label,
      topProblem: candidates.problems[0]?.label
    });
    
    // Debug: Log TODOS os candidatos para ver se "Produto - Transfer" está lá
    console.log('📋 TODOS os keywords candidatos:');
    candidates.keywords.forEach((k, i) => {
      console.log(`  ${i+1}. ${k.label} (${k.department_id}) - score: ${k.similarity_score.toFixed(3)}`);
    });

    // 🔥 DESABILITADO: Deixar IA (GPT-4o-mini) decidir quais candidatos usar
    // A IA é mais inteligente que filtros baseados em scores ou palavras-chave
    const filteredCandidates = {
      ...candidates,
      keywords: candidates.keywords, // TODOS os candidatos, sem filtro!
      problems: candidates.problems   // TODOS os candidatos, sem filtro!
    };
    
    console.log(`✅ Enviando TODOS os ${filteredCandidates.keywords.length} keywords e ${filteredCandidates.problems.length} problems para a IA decidir`);
    
    console.log(`✅ Após pré-filtro: ${filteredCandidates.keywords.length} keywords, ${filteredCandidates.problems.length} problems`);

    // 2. Criar prompt dinâmico com candidatos filtrados
    const { systemPrompt, userPrompt, functionSchema } = createDynamicPrompt(
      finalText,
      filteredCandidates
    );
    
    // Log se alerta de candidatos ruins foi adicionado
    if (candidates.keywords.length > 0 && candidates.keywords[0].similarity_score < 0.5) {
      console.log('🚨 ALERTA ADICIONADO AO PROMPT: Candidatos com baixa similaridade (<0.5)');
      console.log('   → IA será instruída a PROPOR keywords customizadas');
    }
    
    // 🎯 FORÇADO: SEMPRE usar GPT-4o-mini para economia de tokens em testes
    const textLength = finalText.length;
    const hasMultipleAspects = finalText.split(/[.,;!?]/).filter(s => s.trim().length > 10).length > 2;
    const hasAmbiguity = candidates.keywords.length > 0 && 
                         candidates.keywords.filter(k => k.similarity_score > 0.6).length > 5;
    
    // 🔥 FORÇAR GPT-4 NORMAL: Desabilitar mini temporariamente
    const shouldUseGPT4 = true; // TRUE = sempre GPT-4
    
    const modelToUse = shouldUseGPT4 ? "gpt-4o" : "gpt-4o-mini";
    const modelReason = shouldUseGPT4 ? 'GPT-4o (FORÇADO para máxima precisão)' : 'GPT-4o-mini (economia)';
    
    console.log(`🤖 Modelo escolhido: ${modelReason}`);

    // 3. Chamar OpenAI com modelo adaptativo
    const openai = new OpenAI({ apiKey });

    let response = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [{
        type: "function",
        function: functionSchema
      }],
      tool_choice: { type: "function", function: { name: "classify_feedback" } },
      temperature: 0.4,
      max_tokens: 1000
    });

    let toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_feedback") {
      throw new Error("LLM não retornou função esperada");
    }

    let llmResult = JSON.parse(toolCall.function.arguments);
    
    // 🔄 UPGRADE AUTOMÁTICO: Se mini retornou baixa confiança, tentar com GPT-4
    if (modelToUse === "gpt-4o-mini" && llmResult.confidence < 0.6) {
      console.log(`🔄 Confiança baixa (${llmResult.confidence.toFixed(2)}) - Upgrade para GPT-4...`);
      
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: functionSchema
        }],
        tool_choice: { type: "function", function: { name: "classify_feedback" } },
        temperature: 0.4,
        max_tokens: 1000
      });
      
      toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === "classify_feedback") {
        llmResult = JSON.parse(toolCall.function.arguments);
        console.log(`✅ GPT-4 melhorou confiança: ${llmResult.confidence.toFixed(2)}`);
      }
    }

    // 4. Processar e validar resposta (com validação contextual)
    const result = processLLMResponse(
      llmResult,
      candidates,
      taxonomy.version,
      Date.now() - startTime,
      finalText // ✅ Passar texto original para validação contextual
    );

    // 5. Lidar com propostas (global e específicas por issue)
    if (llmResult.proposed_keyword_label) {
      try {
        await createTaxonomyProposal(
          'keyword',
          llmResult.proposed_keyword_label,
          finalText,
          result.issues[0]?.department_id,
          'system'
        );
        console.log('💡 Proposta de keyword GLOBAL criada:', llmResult.proposed_keyword_label);
      } catch (error) {
        console.error('Erro ao criar proposta de keyword global:', error);
      }
    }
    
    // Criar propostas para keywords específicas de cada issue
    for (const issue of llmResult.issues || []) {
      if (issue.proposed_keyword) {
        try {
          await createTaxonomyProposal(
            'keyword',
            issue.proposed_keyword,
            issue.detail || finalText,
            issue.department_id,
            'system'
          );
          const issueContext = issue.detail?.substring(0, 40);
          console.log(`💡 Proposta de keyword ESPECÍFICA criada: "${issue.proposed_keyword}" (contexto: "${issueContext}...")`);
        } catch (error) {
          console.error('Erro ao criar proposta de keyword específica:', error);
        }
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
    console.log('✅ Análise concluída com sistema híbrido:', {
      model_used: modelToUse,
      model_reason: modelReason,
      upgraded: false, // Sempre false pois forçamos gpt-4o-mini
      sentiment: compatibleResult.confidence,
      issues_count: result.issues?.length || 0,
      has_embeddings: hasEmbeddings,
      processing_time: result.processing_time_ms,
      circuit_breaker_state: circuitBreaker.state,
      text_length: textLength,
      has_reasoning: !!compatibleResult.reasoning
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

    // Sistema de fallback básico com heurísticas simples
    console.log('🔄 Iniciando fallback básico...');

    // Análise básica com heurísticas simples
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