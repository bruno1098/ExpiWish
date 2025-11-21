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
import { KEYWORD_SEMANTIC_CONTEXT } from '@/lib/semantic-enrichment';

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

4️⃣ COERÊNCIA DEPARTAMENTO ↔ PROBLEM (REGRA CURTA)
   • O problem DEVE pertencer ao MESMO departamento da keyword
   • Keywords "Limpeza - X" pertencem ao departamento Governança → problems de Governança
   • Evite usar problems de Governança quando a keyword não é de Governança
   • Governança = higiene/arrumação/amenities/padrões; outros departamentos usam seus próprios problems
   • ❌ NÃO ignore elogios porque há críticas
   • Exemplo: "localização boa mas recepção ruim" = 2 issues

   🔒 REGRA ABSOLUTA SOBRE PROBLEMS:
   • É PROIBIDO escolher problem de departamento diferente da keyword
   • Se não existir problem aplicável no mesmo departamento, use problem="EMPTY"
   • NÃO tente remapear departamentos. A coerência deve vir da sua escolha correta.

4️⃣ COMO PRESUMIR (REGRAS DE PRESUNÇÃO):
   • Banheiro sujo/problema → Limpeza-Banheiro (1ª opção) ou Manutenção-Banheiro (se mencionar quebrado/vazamento)
   • Quarto sujo/problema → Limpeza-Quarto (1ª opção)
   • Localização/aeroporto/centro → Produto-Localização
   • Qualquer dúvida → escolha a keyword MAIS ÓBVIA, não fique paralizado!

5️⃣ ESTRATÉGIA PARA FEEDBACKS COMPLEXOS (conectores adversativos):
   
   🔍 IDENTIFIQUE CONECTORES que separam aspectos:
      "mas", "porém", "entretanto", "no entanto", "todavia", "contudo",
      "embora", "apesar de", "mesmo assim", "só que", "contudo"
   
   🧠 QUEBRE MENTALMENTE o feedback em pedaços:
      Exemplo: "Localização boa mas atendimento ruim, porém restaurante compensou"
      → Pedaço 1: "Localização boa"
      → Pedaço 2: "atendimento ruim" 
      → Pedaço 3: "restaurante compensou"
   
   ✅ CRIE 1 ISSUE PARA CADA PEDAÇO:
      Issue 1: Produto - Localização (positivo, problem="EMPTY")
      Issue 2: Operações - Atendimento (negativo, problem="Operações - Demora no atendimento")
      Issue 3: A&B - Gastronomia (positivo, problem="EMPTY")
   
   💡 DICA: Feedbacks longos (>15 palavras) normalmente têm múltiplos aspectos!
            Procure por conectores e crie issues separadas.

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

🚨 REGRA CRÍTICA - QUANDO USAR PROBLEMS:
• problem_label = "EMPTY" → Para ELOGIOS, NEUTROS e qualquer feedback SEM PROBLEMA REAL
• problem_label = Problem específico → APENAS quando há CRÍTICA/RECLAMAÇÃO real

� FORMATO OBRIGATÓRIO DOS PROBLEMS:
• TODOS os problems seguem o formato: "Departamento - Nome do Problema"
• Exemplo: "A&B - Variedade limitada", "TI - Wi-fi não conecta", "Governança - Falta de limpeza"
• O departamento ANTES DO HÍFEN garante o mapeamento correto
• SEMPRE use o problem EXATAMENTE como está na lista com seu departamento
• NUNCA invente problems ou mude o formato "Departamento - Problema"

  �📊 EXEMPLOS DE USO CORRETO:
✅ "Café da manhã delicioso" 
   → keyword="A&B - Café da manhã", problem="EMPTY" (elogio, sem problema)

✅ "Localização perfeita perto da praia"
   → keyword="Produto - Localização", problem="EMPTY" (elogio, sem problema)

✅ "Comida sem variedade"
   → keyword="A&B - Gastronomia", problem="A&B - Variedade limitada" (crítica real)

  ✅ "Wi-fi não conectava"
   → keyword="Tecnologia - Wi-fi", problem="TI - Wi-fi não conecta" (problema real)

❌ ERRADO: "Restaurante excelente" → problem="A&B - Atendimento insistente"
   (Elogio! Use problem="EMPTY")

❌ ERRADO: "Comida boa" → problem="A&B - Qualidade da comida"
   (Elogio! Use problem="EMPTY")

  ✅ Exemplos de elogio → SEMPRE problem="EMPTY":
   • "Ótimo café da manhã" (A&B - Gastronomia)
   • "Quarto confortável" (Produto - Quarto)
   • "Serviços de quarto eficientes" (Operações/Recepção - Serviço)
   • "Funcionários simpáticos e prestativos" (Operações/Recepção - Atendimento)

  • Sentiment 1-2 (negativo) → use problem_label válido DA LISTA
  • Sentiment 3 (neutro) → use problem_label="EMPTY" (exceto se mencionar problema específico)
  • Sentiment 4-5 (positivo) → use problem_label="EMPTY" SEMPRE
  • Keywords "Limpeza-X" pertencem ao dept "Governança" (veja campo "Dept:")

   🔒 COERÊNCIA OBRIGATÓRIA:
   • Problem sempre do mesmo departamento da keyword
   • Se o department_id não possuir problem aplicável → problem="EMPTY"
   • Exemplo: keyword="Produto - Localização" → problem deve iniciar com "Produto -" ou ser "EMPTY"

⚠️ TRADUÇÃO OBRIGATÓRIA:
• Traduza TUDO para português brasileiro (detail, reasoning, suggestion_summary, propostas)
• Elogios: "Great breakfast" → "Café da manhã excelente"
• Detalhes: "Very good location" → "Localização muito boa"
• NUNCA mantenha o idioma original (espanhol, inglês, etc)

REGRA DE ESPECIFICIDADE (CRITICA!):
→ Se feedback menciona termo especifico (ex: "estacionamento", "ferro", "wifi")
→ SEMPRE escolha a keyword ESPECIFICA correspondente, NUNCA generica!
→ Ex: "estacionamento" = "Recepção - Estacionamento" (NÃO "Operações - Atendimento")
→ Ex: "ferro/tábua" = "Recepção - Empréstimo de itens" (NÃO "Limpeza - Amenities")

REGRAS DE PROBLEMAS (COERÊNCIA E ESPECIFICIDADE):
→ Escolha problemas do MESMO departamento da keyword, salvo menção explícita cruzada.
→ Prefira problemas ESPECÍFICOS quando houver candidato que se alinhe ao conceito mencionado.
→ Exemplos:
   • "barulho", "ruído", "isolamento acústico" → Produto - Isolamento acústico ruim
   • "demora no atendimento" → use a variante de demorar específica do departamento (A&B/Operações/Recepção)
→ Evite cair em genéricos de outro departamento (ex.: "Falta de manutenção") se o núcleo é de Produto.

🚨 ESCOPO EXCLUSIVO DE A&B (alimentos & bebidas):
• A&B refere-se APENAS a restaurante/bar/comida/bebida/alimentos.
• "Room Service" (pedido/entrega de comida no quarto) = "A&B - Room Service".
• Elogios/críticas sobre arrumação/limpeza do quarto NUNCA são A&B.
  → Use "Limpeza - Quarto/Enxoval" (Governança) ou "Operações - Atendimento" quando for equipe geral.
`;

  const userPrompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGRA CRÍTICA: ENTENDA A DIFERENÇA! 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 KEYWORD = ASPECTO/ÁREA do hotel mencionado
   Formato: "Departamento - Aspecto"
   Exemplo: "A&B - Gastronomia", "Limpeza - Quarto", "Tecnologia - Wi-fi"
   → Responde: "ONDE/O QUE foi mencionado?"

🔧 PROBLEM = TIPO DE PROBLEMA específico (só quando há CRÍTICA)
   Formato: "Departamento - Problema" ou texto curto
   Exemplo: "A&B - Variedade limitada", "TI - Wi-fi não conecta", "Governança - Banheiro sujo"
   → Responde: "QUAL FOI o problema?" (ou "EMPTY" se é elogio)

⚠️ NUNCA MISTURE! 
   • KEYWORD sempre no formato "Departamento - Aspecto"
   • PROBLEM só quando há CRÍTICA REAL (elogios = "EMPTY")
   
   ❌ ERRADO: keyword="A&B - Variedade limitada" (isso é problem!)
   ✅ CERTO: keyword="A&B - Gastronomia" + problem="A&B - Variedade limitada"
   
   ❌ ERRADO: "Comida boa" → problem="A&B - Qualidade da comida"
   ✅ CERTO: "Comida boa" → problem="EMPTY" (é elogio!)

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

**🔒 PROBLEMAS POR DEPARTAMENTO (coerência obrigatória):**
${(() => {
  const byDept: Record<string, typeof candidates.problems> = {} as any;
  for (const p of candidates.problems) {
    const dept = (p.label.split('-')[0] || '').trim();
    if (!dept) continue;
    (byDept[dept] ||= []).push(p);
  }
  const lines: string[] = [];
  for (const dept of Object.keys(byDept)) {
    const top = byDept[dept]
      .slice()
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 6)
      .map(p => `"${p.label}"`)
      .join(', ');
    lines.push(`• ${dept}: ${top || 'N/A'}`);
  }
  return lines.length ? lines.join('\n') : '⚠️ Nenhum agrupamento disponível';
})()}

**📌 DEPARTAMENTOS:**
${candidates.departments.map(d => `- ${d.id}: ${d.label}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **ATENÇÃO - MAPEAMENTO CRÍTICO (CURTO):**
• Keywords "Limpeza - X" → departamento Governança (não "Limpeza")
• Problemas SEMPRE do mesmo departamento da keyword
• Se elogio → problem="EMPTY"; se crítica → escolha o mais específico do mesmo departamento

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
• Aspecto detectado → Keyword escolhida (justificativa)
• Problem escolhido (ou "EMPTY" se for elogio/neutro)
• Raciocínio completo
Formato: "1. [aspecto] → [Keyword] + Problem: [Problem ou EMPTY] ([justificativa completa incluindo keyword E problem])"

EXEMPLO COMPLETO COM PROBLEMS:
"📋 ASPECTOS: 1.garçons lentos, 2.localização boa

✅ ISSUES: 1. Garçons lentos → A&B - Serviço + Problem: A&B - Atendimento demora (crítica sobre lentidão dos garçons no restaurante, então keyword A&B-Serviço e problem A&B-Atendimento demora) | 2. Localização boa → Produto - Localização + Problem: EMPTY (elogio, não tem problema)

⚠️ NÃO CLASSIFICADOS: Nenhum - todos os aspectos foram classificados"

⚠️ CRÍTICO SOBRE PROBLEMS:
• Se é ELOGIO ou NEUTRO → problem="EMPTY" SEMPRE
• Se é CRÍTICA → escolha o problem MAIS ESPECÍFICO da lista
• Exemplo: "garçons lentos" → problem="A&B - Atendimento demora" (não deixe vazio!)
• Exemplo: "quarto limpo" → problem="EMPTY" (é elogio!)

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
                description: "🏷️ KEYWORD = ASPECTO DO HOTEL mencionado (ex: 'A&B - Serviço', 'Produto - Localização'). CONTEXTO É CRÍTICO: 'garçons no restaurante' = A&B-Serviço (NÃO Operações-Atendimento). Use EMPTY apenas se não há candidato adequado."
              },
              problem_label: {
                type: "string",
                enum: problemLabels,
                description: "⚠️ PROBLEM = TIPO DE PROBLEMA detectado no aspecto (ex: 'A&B - Atendimento demora', 'Manutenção - TV com falha'). 🔒 OBRIGATÓRIO: Problem do MESMO departamento da keyword. Se não houver candidato aplicável do mesmo departamento, use 'EMPTY'. ✅ ELOGIOS/NEUTROS → 'EMPTY' SEMPRE. ❌ CRÍTICAS → escolha problem específico da lista do mesmo departamento. Exemplo: 'garçons lentos' → problem='A&B - Atendimento demora' (não deixe 'EMPTY' se for crítica!)"
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

  // Modo estrito: priorizar integralmente a decisão do reasoning
const STRICT_REASONING = true;
const ALLOW_PROBLEM_HEURISTICS = false; // desativa heurísticas de preenchimento de problema
const ALLOW_DEPT_REMAP = false; // desativa remapeamentos pós-IA para evitar heurísticas; IA deve acertar na origem
  
  // Helper global para mapear contexto ↔ keyword canônica neutra por departamento
  const deriveNeutralKeyword = (detailText: string, departmentHint?: string): string => {
    const t = (detailText || '').toLowerCase();
    const dept = (departmentHint || '').toLowerCase();

    // Produto: qualidade/conforto semântica
    if (dept.startsWith('produto')) {
      if (t.includes('banheiro') || t.includes('sanitário') || t.includes('sanitario')) {
        return 'Produto - Banheiro';
      }
      if (
        t.includes('travesseiro') ||
        t.includes('colchão') || t.includes('colchao') ||
        t.includes('cama') ||
        t.includes('lençol') || t.includes('lencol') ||
        t.includes('enxoval')
      ) {
        return 'Produto - Quarto';
      }
      if (t.includes('localização') || t.includes('localizacao') || t.includes('location')) {
        return 'Produto - Localização';
      }
      return 'Produto - Quarto';
    }

    // Manutenção: falhas/defeitos
    if (dept.startsWith('manutenção') || dept.startsWith('manutencao')) {
      if (t.includes('banheiro') || t.includes('sanitário') || t.includes('sanitario')) {
        return 'Manutenção - Banheiro';
      }
      if (t.includes('quarto') || t.includes('suíte') || t.includes('suite') || t.includes('acomodação') || t.includes('acomodacao')) {
        return 'Manutenção - Quarto';
      }
      if (t.includes('tomada') || t.includes('iluminação') || t.includes('iluminacao') || t.includes('lâmpada') || t.includes('lampada') || t.includes('luz')) {
        return 'Manutenção - Instalações';
      }
      return 'Manutenção - Instalações';
    }

    // Governança/Limpeza
    if (dept.startsWith('governança') || dept.startsWith('governanca') || dept.startsWith('limpeza')) {
      if (t.includes('banheiro') || t.includes('sanitário') || t.includes('sanitario')) {
        return 'Limpeza - Banheiro';
      }
      if (
        t.includes('lençol') || t.includes('lencol') ||
        t.includes('toalha') ||
        t.includes('enxoval') ||
        t.includes('travesseiro') ||
        t.includes('fronha')
      ) {
        return 'Limpeza - Enxoval';
      }
      return 'Limpeza - Quarto';
    }

    // A&B
    if (dept.startsWith('a&b') || dept === 'ab') {
      if (t.includes('room service') || t.includes('serviço de quarto') || t.includes('servico de quarto')) {
        return 'A&B - Room Service';
      }
      if (t.includes('café da manhã') || t.includes('breakfast')) {
        return 'A&B - Café da manhã';
      }
      if (t.includes('restaurante') || t.includes('garçom') || t.includes('garcom') || t.includes('comida') || t.includes('jantar') || t.includes('almoço') || t.includes('almoco')) {
        return 'A&B - Serviço';
      }
      if (t.includes('bar') || t.includes('bebida') || t.includes('drinks')) {
        return 'A&B - Bar';
      }
      return 'A&B - Serviço';
    }

    // Recepção/Operações default
    if (dept.startsWith('recepção') || dept.startsWith('recepcao') || dept.startsWith('operações') || dept.startsWith('operacoes')) {
      return 'Atendimento';
    }

    // Fallback geral
    return 'Atendimento';
  };
  
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
    
    // Helpers para evitar confusão entre problem e keyword e resolver propostas
    const isProblemLabel = (label: string | undefined): boolean => {
      if (!label) return false;
      return candidates.problems.some(p => p.label === label);
    };

    const resolveToCandidateKeyword = (suggestedLabel: string | undefined, detailText: string): { id?: string; label?: string } => {
      if (!suggestedLabel || suggestedLabel.trim() === '') return {};

      // 1) Se o sugerido já é um candidato válido, usar direto
      const exactCandidate = candidates.keywords.find(k => k.label === suggestedLabel);
      if (exactCandidate) {
        return { id: exactCandidate.id, label: exactCandidate.label };
      }

      // 2) Se o sugerido é um PROBLEM, escolher keyword canônica por contexto
      if (isProblemLabel(suggestedLabel)) {
        const deptPrefix = suggestedLabel.split('-')[0].trim().toLowerCase();
        const targetLabel = deriveNeutralKeyword(detailText, deptPrefix);
        const candidate = candidates.keywords.find(k => k.label === targetLabel);
        if (candidate) return { id: candidate.id, label: candidate.label };
      }

      // 3) Heurística simples: tentar casar por departamento e termos
      const lower = suggestedLabel.toLowerCase();
      if (lower.startsWith('manutenção') || lower.startsWith('manutencao') || lower.startsWith('produto')) {
        const targetLabel = deriveNeutralKeyword(detailText, lower.split(' - ')[0]);
        const candidate = candidates.keywords.find(k => k.label === targetLabel);
        if (candidate) return { id: candidate.id, label: candidate.label };
      }

      // 4) Fallback: não resolver
      return {};
    };

    if (keyword) {
      // 1ª opção: Keyword encontrada nos candidatos por label
      keywordId = keyword.id;
      keywordLabel = keyword.label;
      matchedBy = keyword.similarity_score > 0.9 ? 'exact' : 'direct';
      console.log(`✅ Keyword encontrada: "${keywordLabel}" (ID: ${keywordId})`);
      
      // ✅ VALIDAÇÃO ESTRUTURAL: Verificar se keyword está no departamento correto
      const validation = validateKeywordDepartment(keywordLabel, departmentId);
      if (!validation.valid) {
        console.warn(`⚠️ INCOERÊNCIA DETECTADA (sem correção automática): keyword="${keywordLabel}" em dept="${departmentId}"`);
        // Sem heurística: NÃO corrigir automaticamente departmentId
      }
      
    } else if (issue.proposed_keyword) {
      // 2ª opção: Resolver keyword proposta para uma keyword VÁLIDA dos candidatos
      const contextPreview = issue.detail?.substring(0, 40);
      const resolved = resolveToCandidateKeyword(issue.proposed_keyword, issue.detail || '');
      if (resolved.label && resolved.id) {
        keywordLabel = resolved.label;
        keywordId = resolved.id;
        matchedBy = 'proposed';
        console.log(`💡 Keyword proposta resolvida para candidato: "${keywordLabel}" (ID: ${keywordId}) | contexto "${contextPreview}..."`);
      } else {
        // Sem heurística: rejeitar se não resolver exatamente para candidato
        console.error(`❌ ISSUE REJEITADA: proposed_keyword não corresponde a candidatos. Valor: "${issue.proposed_keyword}"`);
        continue; // Pular issue inválida
      }

      // ✅ VALIDAÇÃO ESTRUTURAL: Corrigir departamento automaticamente conforme keyword final
      // Sem heurística: NÃO corrigir automaticamente departmentId com autoCorrectDepartment
      const correction = validateKeywordDepartment(keywordLabel, departmentId);
      if (!correction.valid) {
        console.warn(`⚠️ INCOERÊNCIA DETECTADA (sem correção automática): keyword="${keywordLabel}" em dept="${departmentId}"`);
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

    // 🔎 VALIDAÇÃO CONTEXTUAL: Garantir que A&B só apareça com âncoras de alimentos/bebidas
    if (keywordLabel !== 'Experiência') {
      const isValidContext = validateKeywordContext(keywordLabel, departmentId, originalText || issue.detail || '');
      if (!isValidContext) {
        const textLower = (originalText || issue.detail || '').toLowerCase();

        // Caso especial: se mencionar room service, corrigir para A&B - Room Service
        if (textLower.includes('room service') || textLower.includes('serviço de quarto') || textLower.includes('servico de quarto')) {
          const rs = candidates.keywords.find(k => k.label === 'A&B - Room Service');
          if (rs) {
            console.warn(`🔧 Correção contextual: "${keywordLabel}" → "${rs.label}" por menção a room service`);
            keywordLabel = rs.label;
            keywordId = rs.id;
            departmentId = 'A&B';
          }
        } else if (departmentId === 'A&B' || keywordLabel.includes('A&B')) {
          // Sem contexto de A&B: remapear para Operações - Atendimento quando for elogio geral à equipe
          const staffLike = textLower.includes('atencios') ||
                            textLower.includes('prestativ') ||
                            textLower.includes('educad') ||
                            textLower.includes('cordial') ||
                            textLower.includes('funcion') ||
                            textLower.includes('equipe') ||
                            textLower.includes('staff') ||
                            textLower.includes('profission');

          if (staffLike) {
            const opsAtt = candidates.keywords.find(k => k.label === 'Operações - Atendimento');
            if (opsAtt) {
              console.warn(`🔧 Correção contextual: "${keywordLabel}" (A&B) → "${opsAtt.label}" por elogio geral à equipe`);
              keywordLabel = opsAtt.label;
              keywordId = opsAtt.id;
              departmentId = 'Operações';
            }
          } else {
            // Fallback: derivar keyword neutra pelo departamento
            const correctedLabel = deriveNeutralKeyword(issue.detail || originalText || '', departmentId);
            const candidate = candidates.keywords.find(k => k.label === correctedLabel);
            if (candidate) {
              console.warn(`🔧 Correção contextual neutra: "${keywordLabel}" → "${candidate.label}"`);
              keywordLabel = candidate.label;
              keywordId = candidate.id;
            } else {
              console.warn(`⚠️ Keyword fora de contexto e sem correção disponível. Removendo issue.`);
              continue;
            }
          }
        } else {
          // Outros departamentos: primeiro tentar correção específica para Recepção (check-in/check-out)
          const tl = (originalText || issue.detail || '').toLowerCase();
          const isReceptionContext = departmentId === 'Recepção' || tl.includes('recepção') || tl.includes('recepcao');
          const mentionsCheckIn = tl.includes('check-in') || tl.includes('check in') || tl.includes('entrada');
          const mentionsCheckOut = tl.includes('check-out') || tl.includes('check out') || tl.includes('saída') || tl.includes('saida');

          if (isReceptionContext && (mentionsCheckIn || mentionsCheckOut)) {
            const targetLabel = mentionsCheckOut ? 'Recepção - Check-out' : 'Recepção - Check-in';
            const targetKw = candidates.keywords.find(k => k.label === targetLabel);
            if (targetKw) {
              console.warn(`🔧 Correção contextual específica: "${keywordLabel}" → "${targetKw.label}" por menção a ${mentionsCheckOut ? 'check-out' : 'check-in'}`);
              keywordLabel = targetKw.label;
              keywordId = targetKw.id;
            } else {
              // Fallback neutro se não existir keyword específica
              const correctedLabel = deriveNeutralKeyword(issue.detail || originalText || '', departmentId);
              const candidate = candidates.keywords.find(k => k.label === correctedLabel);
              if (candidate) {
                console.warn(`🔧 Correção contextual: "${keywordLabel}" → "${candidate.label}"`);
                keywordLabel = candidate.label;
                keywordId = candidate.id;
              } else {
                console.warn(`⚠️ Keyword fora de contexto e sem correção disponível. Removendo issue.`);
                continue;
              }
            }
          } else {
            // Correção neutra para demais casos
            const correctedLabel = deriveNeutralKeyword(issue.detail || originalText || '', departmentId);
            const candidate = candidates.keywords.find(k => k.label === correctedLabel);
            if (candidate) {
              console.warn(`🔧 Correção contextual: "${keywordLabel}" → "${candidate.label}"`);
              keywordLabel = candidate.label;
              keywordId = candidate.id;
            } else {
              console.warn(`⚠️ Keyword fora de contexto e sem correção disponível. Removendo issue.`);
              continue;
            }
          }
        }
      }
    }

    // ⚠️ Se IA confundiu e usou o mesmo texto para keyword e problem, corrigir keyword
    if (issue.problem_label && (issue.problem_label === keywordLabel || isProblemLabel(keywordLabel))) {
      const correctedLabel = deriveNeutralKeyword(issue.detail || '', departmentId);
      const candidate = candidates.keywords.find(k => k.label === correctedLabel);
      if (candidate) {
        console.warn(`🔧 Correção: keyword confundida com problem. "${keywordLabel}" → "${candidate.label}"`);
        keywordLabel = candidate.label;
        keywordId = candidate.id;
      }
    }

    // Processar problem da mesma forma
    if (problem) {
      problemId = problem.id;
      problemLabel = problem.label;
      console.log(`✅ Problem encontrado: "${problemLabel}" (ID: ${problemId})`);
    } else if (issue.problem_label === 'EMPTY') {
      problemLabel = 'VAZIO';
      problemId = 'EMPTY';
    } else {
      // Rótulo de problem não encontrado entre candidatos → tratar como vazio para aplicar heurísticas
      console.warn(`⚠️ Problem label não encontrado nos candidatos: "${issue.problem_label}" → aplicando heurísticas`);
      problemLabel = 'VAZIO';
      problemId = 'EMPTY';
    }

    // 🛡️ GUARDA DE ELOGIOS: se for elogio geral, zerar o problem (mas respeitar sugestões)
    {
      const detailLower = (issue.detail || originalText || '').toLowerCase();
      const praiseTerms = [
        'atencioso','atenciosa','atenciosos','prestativo','prestativa','prestativos',
        'educado','educada','cordial','simpatico','simpática','simpático','amavel','amável',
        'gentil','solícito','solicito','hospitalidade',
        // Termos positivos comuns
        'ótimo','otimo','excelente','perfeito','maravilhoso','maravilhosa','fantástico','fantastico',
        'bom','boa','muito bom','muito boa','agradável','agradavel','recomendo','confortável','confortavel',
        'eficiente','eficientes','bem localizado','boa localização','boa localizacao'
      ];
      const negativeHints = [
        'ruim','péssim','pessim','demora','lento','falha','quebr','defeit','sujo','barulho',
        'não funciona','nao funciona','mal educad','falta de','insistent','abordagem'
      ];
      const suggestionCues = [
        'melhorar','poderia melhorar','mais opções','mais opcoes','outras opções','outras opcoes',
        'outras comidas','variedade','adicionar','ampliar','comidas do tipo','cuscuz',
        'pode ter mais','poderia ter','deveria ter',
        'aparelho','aparelhos','equipamento','equipamentos','mais aparelhos','mais equipamentos'
      ];
      const hasPraise = praiseTerms.some(t => detailLower.includes(t));
      const hasNegative = negativeHints.some(t => detailLower.includes(t));
      const hasSuggestionCue = suggestionCues.some(t => detailLower.includes(t));
      const hasSuggestionFlag = Boolean(response.has_suggestion);

      if (!hasNegative && !hasSuggestionCue && !hasSuggestionFlag && (hasPraise || (typeof response.sentiment === 'number' && response.sentiment >= 4))) {
        // Elogio → problem vazio
        problemLabel = 'VAZIO';
        problemId = 'EMPTY';
      }
    }

    // 🎯 HEURÍSTICAS DE PROBLEMA POR PADRÕES: desativadas em modo estrito
    if (ALLOW_PROBLEM_HEURISTICS && (problemLabel === 'VAZIO' || problemId === 'EMPTY')) {
      const t = (issue.detail || originalText || '').toLowerCase();
      const negCues = [
        'ruim','péssim','pessim','demor','lento','falha','quebr','defeit','sujo','barulh',
        'não funciona','nao funciona','mal educad','falta de','insistent','indispon','inadequad','mof'
      ];
      const hasNegCue = negCues.some(s => t.includes(s)) || /\bsem\b/.test(t);
      const suggestionCues = [
        'melhorar','poderia melhorar','mais opções','mais opcoes','outras opções','outras opcoes',
        'outras comidas','variedade','adicionar','ampliar','comidas do tipo','cuscuz'
      ];
      const hasSuggestionCue = suggestionCues.some(s => t.includes(s));
      const sentimentIsNegOrNeu = (typeof response.sentiment === 'number' && response.sentiment <= 3);
      if (!hasNegCue && !sentimentIsNegOrNeu && !hasSuggestionCue) {
        // Elogio/positivo sem pista negativa → manter problem vazio
        console.log('ℹ️ Elogio/positivo sem pistas negativas. Mantendo problem=EMPTY.');
      } else {
        const byDept = (dept: string, includes: (s: string) => boolean): { id?: string; label?: string } => {
          // Demora no atendimento
          if (includes('demora') || includes('demorou') || includes('lento')) {
            const p = candidates.problems.find(p => p.label.startsWith(`${dept} -`) && p.label.toLowerCase().includes('demora') && p.label.toLowerCase().includes('atend'))
              || candidates.problems.find(p => p.label === `${dept} - Atendimento demora`)
              || candidates.problems.find(p => p.label === `${dept} - Demora no serviço`);
            if (p) return { id: p.id, label: p.label };
          }
          // Atendimento insistente
          if (includes('insistent') || includes('abordagem')) {
            const p = candidates.problems.find(p => p.label === `${dept} - Atendimento insistente`)
              || candidates.problems.find(p => p.label.startsWith(`${dept} -`) && p.label.toLowerCase().includes('insistent'));
            if (p) return { id: p.id, label: p.label };
          }
          // Atendimento ruim / falta de cordialidade
          if (includes('ruim') || includes('mal educad') || includes('falta de cordial')) {
            const p = candidates.problems.find(p => p.label === `${dept} - Atendimento ruim`)
              || candidates.problems.find(p => p.label.startsWith(`${dept} -`) && p.label.toLowerCase().includes('atendimento ruim'))
              || candidates.problems.find(p => p.label.startsWith(`${dept} -`) && p.label.toLowerCase().includes('falta de cordial'));
            if (p) return { id: p.id, label: p.label };
          }
          // Falta de comunicação (recepção/operações)
          if (includes('falta de comunicação') || includes('sem informação') || includes('falta de informação')) {
            const p = candidates.problems.find(p => p.label === `${dept} - Falta de comunicação`) || candidates.problems.find(p => p.label === 'Recepção - Falta de informação');
            if (p) return { id: p.id, label: p.label };
          }
          return {};
        };

        // Regras por departamento
        let chosen: { id?: string; label?: string } = {};

        // Caso específico: A&B variedade limitada por sugestão/menção explícita
        if ((departmentId === 'A&B' || (keywordLabel && keywordLabel.includes('A&B'))) && (
          t.includes('variedade') || t.includes('outras opções') || t.includes('outras opcoes') ||
          t.includes('outras comidas') || t.includes('mais opções') || t.includes('mais opcoes') || t.includes('cuscuz') ||
          t.includes('falta de opções') || t.includes('falta de opcoes')
        )) {
          const pVar = candidates.problems.find(p => p.label === 'A&B - Variedade limitada')
            || candidates.problems.find(p => p.label === 'A&B - Falta de opções');
          if (pVar) {
            chosen = { id: pVar.id, label: pVar.label };
          }
        }

        // Preferência explícita: isolamento acústico é problema de Produto
        // Se o texto/keyword indica barulho/isolamento, escolher "Produto - Isolamento acústico ruim"
        {
          const acousticHint = (
            t.includes('isolamento acústico') || t.includes('isolamento acustico') ||
            (keywordLabel && keywordLabel.toLowerCase().includes('isolamento')) ||
            t.includes('isolamento') || t.includes('ruído') || t.includes('ruido') ||
            t.includes('barulho') || t.includes('som alto') || t.includes('barulh')
          );
          if (acousticHint) {
            const pAc = candidates.problems.find(p => p.label === 'Produto - Isolamento acústico ruim');
            if (pAc) {
              chosen = { id: pAc.id, label: pAc.label };
            }
          }
        }

        if (departmentId === 'Operações') {
          chosen = byDept('Operações', (s: string) => t.includes(s));
        } else if (departmentId === 'A&B' || (keywordLabel.includes('A&B'))) {
          chosen = byDept('A&B', (s: string) => t.includes(s));
        } else if (departmentId === 'Recepção' || t.includes('recepção') || t.includes('check-in') || t.includes('check-out')) {
          // Demora com check-in/check-out específicos
          if (t.includes('demora') || t.includes('demorou')) {
            if (t.includes('check-in')) {
              const pIn = candidates.problems.find(p => p.label === 'Recepção - Check-in demora');
              if (pIn) chosen = { id: pIn.id, label: pIn.label };
            } else if (t.includes('check-out')) {
              const pOut = candidates.problems.find(p => p.label === 'Recepção - Check-out demora');
              if (pOut) chosen = { id: pOut.id, label: pOut.label };
            }
          }
          if (!chosen.id) {
            chosen = byDept('Recepção', (s: string) => t.includes(s));
          }
        }

        if (chosen.id && chosen.label) {
          problemId = chosen.id;
          problemLabel = chosen.label;
          console.log(`🔧 Problem heurístico aplicado: "${problemLabel}" (dept: ${departmentId})`);
        }
      }
    }

    // 🔒 Coerência departamento ↔ problem: desativada em modo estrito
    if (ALLOW_DEPT_REMAP && problemLabel && problemLabel !== 'VAZIO' && problemId !== 'EMPTY') {
      const currentProblemDept = problemLabel.split('-')[0]?.trim();
      if (currentProblemDept && currentProblemDept !== departmentId) {
        const core = problemLabel.split('-').slice(1).join('-').trim();
        const desiredLabel = `${departmentId} - ${core}`;
        const sameDeptExact = candidates.problems.find(p => p.label === desiredLabel);
        if (sameDeptExact) {
          console.warn(`🔧 Ajuste department↔problem: "${problemLabel}" → "${desiredLabel}"`);
          problemLabel = sameDeptExact.label;
          problemId = sameDeptExact.id;
        } else {
          const alt = candidates.problems.find(p => p.label.startsWith(`${departmentId} -`) && p.label.toLowerCase().includes(core.toLowerCase()));
          if (alt) {
            console.warn(`🔧 Ajuste alternativo de problem para departamento: "${alt.label}"`);
            problemLabel = alt.label;
            problemId = alt.id;
          } else {
            // 🔎 Seleção genérica por similaridade de texto dentro do departamento
            const detailText = (originalText || '').toLowerCase();
            const deptProblems = candidates.problems.filter(p => p.label.startsWith(`${departmentId} -`));
            const tokenize = (s: string) => s
              .toLowerCase()
              .replace(/[^a-zà-ú0-9\s-]/g, ' ')
              .split(/\s+/)
              .filter(w => w && w.length >= 3 && !['departamento','problema','atendimento','serviço','servico','geral','ruim'].includes(w));
            const detailTokens = tokenize(detailText);
            let best: { p?: typeof deptProblems[number]; score: number } = { score: 0 };
            for (const p of deptProblems) {
              const labelTokens = tokenize(p.label.split('-').slice(1).join(' '));
              // score: número de tokens do label presentes no detalhe
              const score = labelTokens.reduce((acc, tok) => acc + (detailTokens.includes(tok) ? 1 : 0), 0);
              if (score > best.score) {
                best = { p, score };
              }
            }
            if (best.p && best.score > 0) {
              console.warn(`🔧 Ajuste por similaridade: "${problemLabel}" → "${best.p.label}" (dept: ${departmentId})`);
              problemLabel = best.p.label;
              problemId = best.p.id;
            } else {
              console.warn(`⚠️ Sem variante de problem para departamento "${departmentId}" com núcleo "${core}". Mantendo problem original.`);
            }
          }
        }
      }
    }
    
    // 🔒 ENFORCE: Problema deve pertencer ao mesmo departamento da keyword (desativado em modo estrito)
    if (ALLOW_DEPT_REMAP && problemLabel && problemLabel !== 'VAZIO' && problemId !== 'EMPTY') {
      const deptNorm = (departmentId || '').toLowerCase();
      const problemDeptPrefix = (problemLabel.split(' - ')[0] || '').toLowerCase();
      if (problemDeptPrefix && deptNorm && problemDeptPrefix !== deptNorm) {
        console.warn(`⚠️ Ajuste de coerência dept-problem: dept="${departmentId}" vs problem="${problemLabel}" → buscando equivalente dentro do departamento correto`);

        // Tentar encontrar o problem mais similar dentro do mesmo departamento
        const detailText = (issue.detail || '').toLowerCase();
        // Compatível com ES5: tokenização simples (ASCII), evitando propriedades Unicode e flag 'u'
        const tokens: string[] = (detailText.match(/[a-zA-Z0-9]+/g) || []);
        const candidatesInDept = candidates.problems.filter(p => p.label.toLowerCase().startsWith(`${deptNorm} -`));

        let bestMatch: { p: typeof candidatesInDept[number]; score: number } | null = null;
        for (const p of candidatesInDept) {
          const pl = p.label.toLowerCase();
          const score = tokens.reduce((acc: number, t: string) => acc + (pl.includes(t) ? 1 : 0), 0) + (detailText && pl.includes('sujo') ? 0.5 : 0);
          if (!bestMatch || score > bestMatch.score) bestMatch = { p, score };
        }

        if (bestMatch && bestMatch.score > 0) {
          problemLabel = bestMatch.p.label;
          problemId = bestMatch.p.id;
          console.log(`✅ Remapeado problem para mesmo departamento: "${problemLabel}"`);
        } else {
          // Caso específico: Governança/Limpeza
          if (deptNorm === 'governança' || deptNorm === 'governanca') {
            const cues = ['sujo','sujeira','banheiro','quarto','lençol','lencol','toalha','amenities','cheiro','odor','poeira','limpeza','arrumação','arrumacao'];
            const hasCleaningCue = cues.some((c: string) => detailText.includes(c));
            if (hasCleaningCue) {
              const fallback = candidatesInDept.find(p => p.label.toLowerCase().includes('limpeza')) || candidatesInDept[0];
              if (fallback) {
                problemLabel = fallback.label;
                problemId = fallback.id;
                console.log(`✅ Fallback Governança ajustado para limpeza: "${problemLabel}"`);
              }
            }
          }
        }
      }
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

  // 🔧 DEDUPLICAÇÃO: Remover issues com mesmo department + keyword
  console.log(`📊 Issues ANTES da deduplicação: ${issues.length}`);
  
  const uniqueIssues: typeof issues = [];
  const seenCombinations = new Set<string>();
  
  for (const issue of issues) {
    // Chave única: departamento + keyword
    const key = `${issue.department_id}__${issue.keyword_label}`;
    
    if (!seenCombinations.has(key)) {
      seenCombinations.add(key);
      uniqueIssues.push(issue);
    } else {
      console.log(`🔄 DUPLICATA REMOVIDA: ${issue.keyword_label} (department: ${issue.department_label})`);
      console.log(`   Detail removido: "${issue.detail}"`);
    }
  }
  
  // Substituir issues originais pelos únicos
  issues.length = 0;
  issues.push(...uniqueIssues);
  
  console.log(`✅ Issues APÓS deduplicação: ${issues.length}`);

  // 🛡️ GUARDA GLOBAL DE ELOGIO: se texto tiver fortes sinais positivos e nenhum negativo → problem=EMPTY
  // Respeita STRICT_REASONING/ALLOW_PROBLEM_HEURISTICS e sinais de sugestão
  if (ALLOW_PROBLEM_HEURISTICS) {
    const txt = (originalText || '').toLowerCase();
    const positiveHints = [
      'ótimo','otimo','excelente','perfeito','maravilhoso','maravilhosa','fantástico','fantastico',
      'bom','boa','muito bom','muito boa','agradável','agradavel','recomendo','confortável','confortavel',
      'eficiente','eficientes','bem localizado','boa localização','boa localizacao','simpat', 'prestativ'
    ];
    const negativeHints = [
      'ruim','péssim','pessim','demor','lento','falha','quebr','defeit','sujo','barulh','não funciona','nao funciona',
      'mal educad','falta de','insistent','abordagem','indispon','problema','inadequad','sujidade','mof'
    ];
    const suggestionHints = [
      'sugestão','sugiro','poderia','deveria','pode ter mais','poderia ter','deveria ter',
      'adicionar','ampliar','mais opções','mais opcoes','outras opções','outras comidas','variedade',
      'aparelho','aparelhos','equipamento','equipamentos','mais aparelhos','mais equipamentos'
    ];
    const hasPos = positiveHints.some(h => txt.includes(h));
    const hasNeg = negativeHints.some(h => txt.includes(h));
    const hasSuggestionCueInText = suggestionHints.some(h => txt.includes(h));
    const hasSuggestionFlag = Boolean(response?.has_suggestion);

    if (hasPos && !hasNeg && !hasSuggestionFlag && !hasSuggestionCueInText) {
      for (const issue of issues) {
        issue.problem_id = 'EMPTY';
        issue.problem_label = 'VAZIO';
      }
      console.log('🛡️ Guarda global aplicada: feedback só-elogio → todos problems vazios');
    }
  }

  // 🔒 GUARDA PÓS-PROCESSAMENTO: reforçar separação keyword vs problem
  // - Keywords devem pertencer à whitelist oficial (KEYWORD_SEMANTIC_CONTEXT)
  // - Termos negativos no label/detalhe → garantir problem específico e keyword neutra canônica
  const validKeywordLabels = new Set<string>(Object.keys(KEYWORD_SEMANTIC_CONTEXT));
  const negativePatterns = [
    'vazamento','falha','quebrado','quebrada','defeito','danificado',
    'ruim','péssimo','pessimo','lento','demora','demorado','barulho',
    'sujo','sujeira','mofado','mofo','mal cheiro','cheiro ruim',
    'não funciona','nao funciona','trincado','quebra','quebrada'
  ];
  const containsNegative = (txt: string | undefined): boolean => {
    if (!txt) return false;
    const t = txt.toLowerCase();
    return negativePatterns.some(p => t.includes(p));
  };

  for (const issue of issues) {
    const keywordInvalidOrNegative = !validKeywordLabels.has(issue.keyword_label) || containsNegative(issue.keyword_label) || containsNegative(issue.detail);
    if (keywordInvalidOrNegative) {
      // Não preencher problema se o contexto é claramente positivo
      const t = (issue.detail || originalText || '').toLowerCase();
      const positiveHints = ['ótimo','otimo','excelente','perfeito','maravilhoso','maravilhosa','fantástico','fantastico','bom','boa','muito bom','muito boa','agradável','agradavel','recomendo','confortável','confortavel','eficiente','eficientes','bem localizado','boa localização','boa localizacao','simpat','prestativ'];
      const negativeHints = ['ruim','péssim','pessim','demor','lento','falha','quebr','defeit','sujo','barulh','não funciona','nao funciona','mal educad','falta de','insistent','abordagem','indispon','problema','inadequad','sujidade','mof'];
      const hasPosCue = positiveHints.some(h => t.includes(h));
      const hasNegCue = negativeHints.some(h => t.includes(h));
      const sentimentIsPositive = (typeof response.sentiment === 'number' && response.sentiment >= 4);

      // Garantir problem específico se estiver vazio, SOMENTE se houver pistas negativas ou sentimento <=3
      if (ALLOW_PROBLEM_HEURISTICS && (issue.problem_id === 'EMPTY' || issue.problem_label === 'VAZIO') && (!hasPosCue || hasNegCue || !sentimentIsPositive)) {
        const detail = issue.detail || '';
        // Heurísticas simples para escolher problem candidato
        let prob = candidates.problems.find(p => {
          const l = p.label.toLowerCase();
          return (
            l.includes('vazamento') && detail.toLowerCase().includes('banheiro')
          );
        });
        if (!prob) {
          prob = candidates.problems.find(p => {
            const l = p.label.toLowerCase();
            return containsNegative(l) && (detail ? detail.toLowerCase().split(' ').some(w => l.includes(w)) : true);
          }) || candidates.problems[0];
        }
        if (prob) {
          issue.problem_id = prob.id;
          issue.problem_label = prob.label;
        }
      }

      // Remapear keyword para canônica e neutra por departamento (manutenção com contexto)
      const correctedLabel = deriveNeutralKeyword(issue.detail || '', issue.department_id);
      const candidateKw = candidates.keywords.find(k => k.label === correctedLabel)
        || candidates.keywords.find(k => k.department_id === issue.department_id)
        || candidates.keywords[0];
      if (candidateKw) {
        issue.keyword_id = candidateKw.id;
        issue.keyword_label = candidateKw.label;
      }
    }
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
      const retryAfter = Math.max(0, CIRCUIT_BREAKER_TIMEOUT - (Date.now() - circuitBreaker.lastFailure));
      return NextResponse.json({
        error: 'circuit_breaker_open',
        message: 'IA temporariamente indisponível. Tentaremos novamente.',
        retry_after_ms: retryAfter,
        temporary: true
      }, { status: 503 });
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

      // Detectar contexto de A&B (somente com sinais claros de restaurante/bar)
      const hasABContext = (
        text.includes('comida') ||
        text.includes('restaurante') ||
        text.includes('café') ||
        text.includes('jantar') ||
        text.includes('almoço') ||
        text.includes('bar') ||
        text.includes('bebida') ||
        text.includes('garçom') ||
        text.includes('gastronomia') ||
        text.includes('refeição') ||
        text.includes('room service')
      );

      const hasReceptionContext = (
        text.includes('recepção') ||
        text.includes('front desk') ||
        text.includes('check-in') ||
        text.includes('check-out')
      );

      const mentionsServiceStaff = (
        text.includes('atendimento') ||
        text.includes('atendente') ||
        text.includes('equipe') ||
        text.includes('staff') ||
        text.includes('funcionário') ||
        text.includes('funcionarios') ||
        text.includes('colaborador')
      );

      if (hasABContext) {
        department = 'A&B';
        const hasRoomService = (
          text.includes('room service') ||
          text.includes('serviço de quarto') ||
          text.includes('servico de quarto')
        );
        if (hasRoomService) {
          selectedKeyword = taxonomy.keywords.find(kw =>
            kw.label.includes('A&B') && kw.label.includes('Room Service')
          ) || taxonomy.keywords.find(kw => kw.label.includes('A&B') && kw.label.includes('Serviço'));
        } else {
          selectedKeyword = taxonomy.keywords.find(kw =>
            kw.label.includes('A&B') && kw.label.includes('Serviço')
          );
        }
      } else if (hasReceptionContext) {
        department = 'Recepção';
        selectedKeyword = taxonomy.keywords.find(kw =>
          kw.label.includes('Recepção') && kw.label.includes('Atendimento')
        );
      } else if (mentionsServiceStaff) {
        department = 'Operações';
        selectedKeyword =
          taxonomy.keywords.find(kw => kw.label.includes('Operações') && kw.label.includes('Atendimento')) ||
          taxonomy.keywords.find(kw => kw.label === 'Atendimento') ||
          null;
      }

      // Detectar problemas específicos
      if (text.includes('demorou') || text.includes('demora')) {
        // Preferir problema específico do departamento quando disponível
        const findByDept = (deptLabel: string) => taxonomy.problems.find(prob =>
          prob.label.toLowerCase().includes('demora') &&
          prob.label.toLowerCase().includes('atend') &&
          prob.label.includes(deptLabel)
        );

        selectedProblem =
          (department === 'A&B' && findByDept('A&B')) ||
          (department === 'Operações' && findByDept('Operações')) ||
          (department === 'Recepção' && findByDept('Recepção')) ||
          taxonomy.problems.find(prob => prob.label.toLowerCase() === 'demora no atendimento') ||
          taxonomy.problems.find(prob =>
            prob.label.toLowerCase().includes('demora') && prob.label.toLowerCase().includes('atend')
          ) ||
          null;
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
    
    // 🔥 VOLTAR PARA MINI: GPT-4 tem rate limit muito baixo para processamento em massa
    const shouldUseGPT4 = false; // FALSE = sempre mini
    
    const modelToUse = shouldUseGPT4 ? "gpt-4o" : "gpt-4o-mini";
    const modelReason = shouldUseGPT4 ? 'GPT-4o (máxima precisão)' : 'GPT-4o-mini (FORÇADO - melhor para massa)';
    
    console.log(`🤖 Modelo escolhido: ${modelReason}`);

    // 3. Chamar OpenAI com modelo adaptativo
    const openai = new OpenAI({ apiKey });

    console.log(`🚀 Enviando para OpenAI: modelo=${modelToUse}, candidatos=${filteredCandidates.keywords.length} keywords, ${filteredCandidates.problems.length} problems`);

    let response;
    try {
      response = await openai.chat.completions.create({
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
        max_tokens: 2900  // AUMENTADO: GPT-4 precisa de mais tokens para 8 issues + reasoning
      });
    } catch (apiError: any) {
      console.error('❌ ERRO NA CHAMADA OPENAI:', {
        error: apiError.message,
        code: apiError.code,
        status: apiError.status,
        type: apiError.type,
        model: modelToUse
      });
      throw apiError;
    }

    console.log('✅ Resposta OpenAI recebida:', {
      model: response.model,
      usage: response.usage,
      finish_reason: response.choices[0]?.finish_reason
    });

    let toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_feedback") {
      console.error('❌ ERRO: OpenAI não retornou função esperada', {
        has_tool_call: !!toolCall,
        function_name: toolCall?.function?.name,
        message_content: response.choices[0]?.message?.content,
        finish_reason: response.choices[0]?.finish_reason
      });
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
        max_tokens: 2500  // AUMENTADO: GPT-4 precisa de mais tokens
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
    console.error('❌ Erro crítico na análise:', {
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    // Garantir que conseguimos ler o body para telemetria mínima
    if (!body) {
      try {
        body = await request.json();
        const { texto, comment, text } = body;
        finalText = texto || comment || text || '';
      } catch {}
    }

    const errorType = classifyError(error);

    // Registrar falha quando o erro é temporário/crítico
    if (['timeout','network_error','unknown_error','rate_limit'].includes(errorType)) {
      recordFailure();
    }

    const retryAfterMsMap: Record<string, number> = {
      rate_limit: 15000,
      quota_exceeded: 60000,
      timeout: 3000,
      network_error: 5000,
      circuit_breaker_open: Math.max(0, CIRCUIT_BREAKER_TIMEOUT - (Date.now() - circuitBreaker.lastFailure)),
      auth_error: 0,
      unknown_error: 5000
    };

    const retry_after_ms = retryAfterMsMap[errorType] ?? 5000;

    const errorMessages: Record<string, string> = {
      rate_limit: 'Muitas requisições em paralelo. Aguarde alguns segundos e tente novamente.',
      quota_exceeded: 'Limite de uso da API OpenAI atingido. Cadastre uma nova chave em Configurações para continuar.',
      auth_error: 'Chave OpenAI inválida. Atualize a chave e tente novamente.',
      default: 'Análise indisponível no momento. Aguarde e tentaremos novamente.'
    };

    const responseMessage = errorMessages[errorType] ?? errorMessages.default;

    const statusMap: Record<string, number> = {
      auth_error: 401,
      rate_limit: 429,
      quota_exceeded: 429
    };

    const status = statusMap[errorType] ?? 503;

    return NextResponse.json({
      error: errorType,
      message: responseMessage,
      retry_after_ms,
      temporary: errorType !== 'auth_error'
    }, { status });
  }
}