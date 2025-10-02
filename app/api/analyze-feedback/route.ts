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

**🍽️ A&B (Alimentos & Bebidas) - APENAS comida e bebida:**

**Keywords do A&B - ESCOLHA CORRETA:**

📋 **A&B - Serviço** (atendimento de pessoas do restaurante/bar):
- USAR quando fala de: garçom, atendente, serviço do restaurante, atendimento do bar
- ✅ "garçom atencioso" → A&B - Serviço
- ✅ "atendimento do restaurante" → A&B - Serviço
- ✅ "serviço do bar rápido" → A&B - Serviço
- ✅ "funcionários do café da manhã educados" → A&B - Serviço

🍽️ **A&B - Gastronomia / Café da manhã / Variedade** (sobre a COMIDA/BEBIDA em si):
- USAR quando fala da: qualidade da comida, sabor, variedade de pratos, temperatura da comida
- ✅ "comida deliciosa" → A&B - Gastronomia
- ✅ "café da manhã variado" → A&B - Café da manhã
- ✅ "pratos bem temperados" → A&B - Gastronomia
- ✅ "faltou opções vegetarianas" → A&B - Variedade

⚠️ **DIFERENÇA FUNDAMENTAL:**
- Fala de PESSOAS (garçom, atendente) = A&B - Serviço
- Fala de COMIDA/BEBIDA (sabor, qualidade) = A&B - Gastronomia/Café da manhã

**🏨 OPERAÇÕES - Atendimento geral do hotel (SEM especificar área):**
- USAR quando menciona: atendimento genérico, staff, equipe, funcionários (SEM mencionar restaurante/bar/recepção)
- ❌ NÃO usar se menciona "restaurante", "bar", "recepção" junto com atendimento
- ✅ Exemplo: "atendimento excelente" (sozinho) → Operações - Atendimento
- ✅ Exemplo: "equipe muito prestativa" → Operações - Atendimento
- ✅ Exemplo: "funcionários educados" → Operações - Atendimento

**📍 RECEPÇÃO - Chegada/Saída:**
- USAR quando menciona: recepção, check-in, check-out, recepcionista
- Exemplo: "recepcionista muito educada" → Recepção - Atendimento
- Exemplo: "check-in rápido" → Recepção - Processo

**🧹 GOVERNANÇA/LIMPEZA:**
- Quartos sujos/arrumação, camareira, roupa de cama

**🔧 MANUTENÇÃO:**
- Equipamentos quebrados, chuveiro, ar-condicionado

**🏊 LAZER:**
- Piscina, academia, spa, atividades

**💻 TI/TECNOLOGIA:**
- Wi-fi, TV, sistemas

**📍 LOCALIZAÇÃO (Produto):**
- USAR quando menciona: localização, localizado, perto de, próximo, acesso, vista, região
- keyword="Localização", department="Produto"
- Exemplo: "hotel bem localizado" → Produto - Localização
- Exemplo: "perto da praia" → Produto - Localização
- Exemplo: "localização perfeita" → Produto - Localização

**ENTENDA AS INTENÇÕES:**
- Elogios específicos → classificar na área específica (ex: A&B, Limpeza)
- Elogios genéricos ("tudo ótimo", "hotel incrível") → keyword: "Experiência", department: "Produto"
- Problemas → identificar causa raiz e departamento responsável
- Sugestões → detectar quando há proposta de melhoria

**⚡ ATENÇÃO ESPECIAL - CONTEXTO DE ATENDIMENTO:**
- "atendimento DO restaurante" → A&B - Serviço ✅
- "atendimento DO bar" → A&B - Serviço ✅
- "atendimento DA recepção" → Recepção - Atendimento ✅
- "atendimento" (sozinho) → Operações - Atendimento ✅

🔥 **EXEMPLOS DE COMPREENSÃO REAL:**

**Exemplo 1**: "O garçom João foi muito atencioso"
- **LEIA**: menciona garçom específico atendendo
- **ENTENDA**: elogio ao ATENDIMENTO de uma pessoa do restaurante
- **CLASSIFIQUE**: keyword="A&B - Serviço", department="A&B"
- **Razão**: garçom = PESSOA atendendo = Serviço (NÃO é sobre comida)

**Exemplo 1-A**: "A comida estava deliciosa"
- **LEIA**: menciona qualidade da comida
- **ENTENDA**: elogio à COMIDA, não ao atendimento
- **CLASSIFIQUE**: keyword="A&B - Gastronomia", department="A&B"
- **Razão**: fala da comida em si = Gastronomia (NÃO é sobre atendimento)

**Exemplo 1b**: "Atendimento excelente"
- **LEIA**: atendimento genérico, sem mencionar área específica
- **ENTENDA**: elogio ao atendimento geral do hotel
- **CLASSIFIQUE**: keyword="Atendimento", department="Operações"
- **Razão**: atendimento sem contexto específico = Operações

**Exemplo 1d**: "Hotel muito bem localizado e com ótimo atendimento"
- **LEIA**: dois aspectos diferentes - localização + atendimento genérico
- **ENTENDA**: elogio à localização E ao atendimento geral
- **CLASSIFIQUE**: 2 issues separadas:
  * Issue 1: keyword="Localização", department="Produto" (localização)
  * Issue 2: keyword="Atendimento", department="Operações" (atendimento SEM especificar área)
- **Razão**: múltiplos aspectos = múltiplas classificações

**Exemplo 1e**: "Hotel muito bem localizado e com ótimo atendimento do restaurante"
- **LEIA**: dois aspectos - localização + atendimento DO RESTAURANTE
- **ENTENDA**: elogio à localização E ao ATENDIMENTO/SERVIÇO das pessoas do restaurante
- **CLASSIFIQUE**: 2 issues separadas:
  * Issue 1: keyword="Localização", department="Produto"
  * Issue 2: keyword="A&B - Serviço", department="A&B" 
- **RAZÃO IMPORTANTE**: 
  * "atendimento" = PESSOAS atendendo = A&B - Serviço ✅
  * "comida boa" = ALIMENTO = A&B - Gastronomia ❌ (diferente!)

**Exemplo 1c**: "Recepcionista muito educada"
- **LEIA**: menciona especificamente recepcionista
- **ENTENDA**: elogio ao atendimento da recepção
- **CLASSIFIQUE**: keyword="Recepção - Atendimento", department="Recepção"
- **Razão**: recepcionista = departamento específico

**Exemplo 2**: "Tudo foi maravilhoso durante nossa estadia"  
- **LEIA**: elogio geral sem área específica
- **ENTENDA**: satisfação geral com a experiência hoteleira
- **CLASSIFIQUE**: 
  * keyword: "Experiência" (apenas Experiência, não Produto)
  * department: "Produto"
  * Razão: elogio genérico à experiência completa

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
   - Exemplo: "Hotel bem localizado e atendimento ótimo" = 2 issues (Localização + Atendimento)
   - Exemplo: "Café da manhã bom mas Wi-fi ruim" = 2 issues (A&B positivo + TI negativo)

2. **CONTEXTO SEMÂNTICO - ATENÇÃO AO DEPARTAMENTO CORRETO**:
   
   **🔍 REGRA FUNDAMENTAL: Leia a frase COMPLETA para identificar o contexto!**
   
   **A&B (quando menciona restaurante/bar/comida junto com atendimento):**
   - "Garçom atencioso" = A&B - Serviço ✅
   - "Atendimento do restaurante" = A&B - Serviço ✅ (palavra-chave: RESTAURANTE)
   - "Atendimento no bar" = A&B - Serviço ✅ (palavra-chave: BAR)
   - "Serviço do café da manhã" = A&B - Serviço ✅ (palavra-chave: CAFÉ DA MANHÃ)
   - "Funcionário do restaurante atencioso" = A&B - Serviço ✅
   
   **OPERAÇÕES (atendimento SEM especificar área):**
   - "Atendimento excelente" (sozinho, sem contexto) = Operações - Atendimento ✅
   - "Equipe prestativa" = Operações - Atendimento ✅
   - "Staff educado" = Operações - Atendimento ✅
   - "Funcionários" (sem especificar área) = Operações - Atendimento ✅
   
   **RECEPÇÃO (área específica):**
   - "Recepcionista atenciosa" = Recepção - Atendimento ✅
   - "Atendimento na recepção" = Recepção - Atendimento ✅
   - "Moça da recepção" = Recepção - Atendimento ✅
   
   **GOVERNANÇA:**
   - "Camareira simpática" = Governança - Atendimento ✅
   - "Funcionário da limpeza" = Governança - Serviço ✅

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

� **REGRAS ABSOLUTAS - NUNCA VIOLE:**

1. **NUNCA use "Elogio" como keyword ou department**
   - ❌ ERRADO: keyword="Elogio", department="Elogio"
   - ✅ CORRETO: Use a área específica elogiada OU "Experiência"/"Produto"

2. **Elogios GENÉRICOS (sem área específica):**
   - Exemplos: "Hotel incrível", "Adorei tudo", "Experiência maravilhosa", "Gostei muito", "Tudo perfeito"
   - ✅ SEMPRE: keyword="Experiência", department="Produto"
   - ⭐ Importante: keyword é apenas "Experiência" (não "Produto - Experiência")
   - ⭐ Razão: Elogio geral à experiência hoteleira completa

3. **Elogios ESPECÍFICOS (com área clara):**
   - Exemplo: "Café da manhã excelente" → keyword="A&B - Café da manhã", department="A&B"
   - Exemplo: "Quarto limpo" → keyword="Limpeza - Quarto", department="Governança"
   - ✅ Use o departamento/keyword correto da área elogiada

4. **NUNCA misture "Elogio" com outros termos:**
   - ❌ "Elogio - Café da manhã"
   - ✅ "A&B - Café da manhã" (se específico) ou "Experiência" (se genérico)

�💡 **SUA MISSÃO**:
- Entenda o CONTEXTO SEMÂNTICO, não apenas palavras
- Se candidatos não fazem sentido → USE proposed_keyword_label
- NUNCA use "Elogio" como keyword
- Para elogios genéricos: keyword="Experiência", department="Produto"

🎯 **PRIORIDADE MÁXIMA**: Se nenhum candidato faz sentido contextual, PROPONHA keyword apropriada.`;

  // 🚨 ALERTA VISUAL se candidatos são ruins
  const hasPoorCandidates = candidates.keywords.length > 0 && 
                            candidates.keywords[0].similarity_score < 0.45;
  
  const poorCandidatesAlert = hasPoorCandidates ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CANDIDATOS TÊM BAIXA SIMILARIDADE (< 0.45) 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ REGRA: PREFIRA candidatos com score > 0.40
⚠️ SÓ PROPONHA se NENHUM candidato faz sentido contextual

📊 Avaliando candidatos:

• Score > 0.50: ÓTIMO - Use keyword_id do candidato ✅
• Score 0.40-0.50: RAZOÁVEL - Use SE faz sentido contextual ✅
• Score < 0.40: RUIM - Só use se for exato match, senão PROPONHA ⚠️

📝 EXEMPLO:
Feedback: "Hotel bem localizado e ótimo atendimento"

Candidatos disponíveis:
- "Atendimento" (score 0.48) ← RAZOÁVEL, usa!
- "Recepção - Serviço" (score 0.42) ← RAZOÁVEL mas não é contexto certo

Issue 1 (localização):
  ✅ Nenhum candidato de localização
  → keyword_id: "EMPTY", proposed_keyword: "Localização"
  
Issue 2 (atendimento):  
  ✅ TEM candidato "Atendimento" (0.48)
  → keyword_id: "kw_atendimento" ← USA O CANDIDATO!
  ❌ NÃO propor "Experiência" se já tem "Atendimento"

📋 QUANDO PROPOR:
• "localização" SEM candidato relacionado → PROPOR "Localização"
• "atendimento restaurante" com "Atendimento" genérico disponível → USA "Atendimento"
• "garçom" SEM candidato A&B → PROPOR "A&B - Serviço"
• "comida/sabor" SEM candidato → PROPOR "A&B - Gastronomia"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : '';
  
  const userPrompt = `${poorCandidatesAlert}**FEEDBACK DO HÓSPEDE:**
"${text}"

**DEPARTAMENTOS DISPONÍVEIS:**
${candidates.departments.map(d => `- ${d.id}: ${d.label}${d.description ? ` (${d.description})` : ''}`).join('\n')}

**KEYWORDS CANDIDATAS (top por similaridade):**
${candidates.keywords.length > 0 ? candidates.keywords.map(k =>
    `- ID: ${k.id}
    Label: ${k.label}
    Dept: ${k.department_id}
    Score: ${k.similarity_score.toFixed(3)}
    ${k.description ? `Desc: ${k.description}` : ''}
    Exemplos: ${k.examples.slice(0, 2).join('; ')}`
  ).join('\n\n') : '⚠️ NENHUMA keyword candidata encontrada com boa similaridade'}

${candidates.keywords.length > 0 && candidates.keywords[0].similarity_score < 0.5 ? 
  `⚠️ ATENÇÃO: Scores de similaridade BAIXOS (< 0.5). Se nenhum candidato acima fizer sentido semântico, 
  use proposed_keyword_label para criar uma keyword apropriada ao contexto.` : ''}

**PROBLEMS CANDIDATOS (top por similaridade):**
${candidates.problems.length > 0 ? candidates.problems.map(p =>
    `- ID: ${p.id}
    Label: ${p.label}
    Score: ${p.similarity_score.toFixed(3)}
    ${p.description ? `Desc: ${p.description}` : ''}
    ${p.applicable_departments ? `Depts: ${p.applicable_departments.join(', ')}` : 'Todos depts'}
    Exemplos: ${p.examples.slice(0, 2).join('; ')}`
  ).join('\n\n') : '⚠️ NENHUM problem candidato encontrado'}

**INSTRUÇÕES CRÍTICAS PARA ANÁLISE SEMÂNTICA:**

🎯 **ANÁLISE DO SENTIMENTO PRIMEIRO:**

**SENTIMENTO 5 (Muito Satisfeito)**: Elogios entusiasmados, experiência excepcional
- Palavras: "excelente", "perfeito", "maravilhoso", "fantástico", "adorei"
- ⭐ **AÇÃO OBRIGATÓRIA**: problem_id = "EMPTY" + detail com o elogio específico
- ⭐ **IMPORTANTE**: SEMPRE use "EMPTY" para elogios - NUNCA use problem_id real

**SENTIMENTO 4 (Satisfeito)**: Elogios moderados, experiência positiva
- Palavras: "bom", "gostei", "agradável", "satisfeito", "recomendo"
- ⭐ **AÇÃO OBRIGATÓRIA**: problem_id = "EMPTY" + detail com o elogio específico
- ⭐ **IMPORTANTE**: SEMPRE use "EMPTY" para elogios - NUNCA use problem_id real

**SENTIMENTO 3 (Neutro)**: Comentários neutros, sem elogios nem críticas claras
- Palavras: "ok", "normal", "razoável", comentários factuais
- Ação: analise se há problemas sutis ou apenas observações
- Se for elogio sutil: problem_id = "EMPTY"
- Se for problema sutil: use problem_id apropriado

**SENTIMENTO 2 (Insatisfeito)**: Críticas moderadas, problemas identificados
- Palavras: "ruim", "não gostei", "decepcionado", "poderia melhorar"
- ⚠️ **AÇÃO OBRIGATÓRIA**: use problem_id apropriado + detail específico
- ⚠️ **IMPORTANTE**: NUNCA use "EMPTY" para problemas

**SENTIMENTO 1 (Muito Insatisfeito)**: Críticas severas, problemas graves
- Palavras: "péssimo", "horrível", "inaceitável", "nunca mais"
- ⚠️ **AÇÃO OBRIGATÓRIA**: use problem_id apropriado + detail específico
- ⚠️ **IMPORTANTE**: NUNCA use "EMPTY" para problemas

🧠 **MATCHING INTELIGENTE:**
- **NÃO** faça match apenas por palavras similares
- **SIM** entenda o CONTEXTO e INTENÇÃO
- **EXEMPLO**: "Gostei do atendimento" ≠ "Atendimento ruim" (mesmo tendo "atendimento")

🔍 **SELEÇÃO DE CANDIDATOS:**
- Use APENAS IDs dos candidatos fornecidos acima
- Para ELOGIOS: sempre problem_id = "EMPTY" 
- Para PROBLEMAS: escolha o problem_id mais adequado ao contexto negativo
- Se nenhum candidato serve perfeitamente: use proposed_*_label

💡 **QUANDO PROPOR NOVAS KEYWORDS (proposed_keyword_label):**

**SEMPRE PROPONHA** quando:
1. ✅ Feedback menciona **"atendimento do restaurante"** mas candidatos só tem "Check-in - Atendimento"
   → PROPOR: "A&B - Serviço" ou "A&B - Atendimento"
   
2. ✅ Feedback menciona **"qualidade da comida"** mas candidatos não tem nada de gastronomia
   → PROPOR: "A&B - Gastronomia" ou "A&B - Qualidade"
   
3. ✅ Feedback menciona **"localização"** mas candidatos não tem keyword relacionada
   → PROPOR: "Localização" ou "Produto - Localização"
   
4. ✅ Todos candidatos tem score < 0.5 (baixa similaridade)
   → PROPOR: Keyword que faz sentido semântico para o contexto

**NUNCA PROPONHA** quando:
- ❌ Já existe candidato perfeito (score > 0.7)
- ❌ Candidato razoável (score > 0.5) e faz sentido contextual

**FORMATO DA PROPOSTA:**
- Para áreas específicas: "{Departamento} - {Aspecto}"
- Exemplos: "A&B - Serviço", "Governança - Limpeza", "Recepção - Atendimento"
- Para genéricos: "Experiência", "Localização", "Custo-benefício"

⚡ **REGRAS FINAIS CRÍTICAS:**

🎯 **SEPARAÇÃO OBRIGATÓRIA DE ELOGIOS E PROBLEMAS:**
- **ELOGIOS**: SEMPRE problem_id = "EMPTY" (sentimentos 4-5)
- **PROBLEMAS**: SEMPRE problem_id válido da lista (sentimentos 1-2)
- **NEUTRO**: Analise o contexto - se positivo use "EMPTY", se negativo use problem_id

⚠️ **VALIDAÇÃO:**
- Elogios (sentiment 4-5) → problem_id = "EMPTY"
- Críticas (sentiment 1-2) → problem_id válido
- Máximo 3 issues
- Se candidatos ruins → PROPONHA nova keyword`;

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
                description: "ID da keyword ou EMPTY para elogios/propor nova"
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
              },
              proposed_keyword: {
                type: "string",
                maxLength: 100,
                description: "OPCIONAL: Propor keyword específica para esta issue se candidatos não servem"
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
    // Debug: Log do que a IA retornou
    console.log('🔍 Processing issue:', {
      department_id: issue.department_id,
      keyword_id: issue.keyword_id,
      problem_id: issue.problem_id,
      detail: issue.detail?.substring(0, 50)
    });
    
    // Buscar labels pelos IDs
    const department = candidates.departments.find(d => d.id === issue.department_id);
    const keyword = candidates.keywords.find(k => k.id === issue.keyword_id);
    const problem = candidates.problems.find(p => p.id === issue.problem_id);
    
    console.log('🔍 Found in candidates:', {
      department: department?.label || 'NOT FOUND',
      keyword: keyword?.label || 'NOT FOUND',
      problem: problem?.label || 'NOT FOUND'
    });
    
    // ✅ VALIDAÇÃO CONTEXTUAL: Só validar se keyword FOI ENCONTRADA nos candidatos
    // Se não foi encontrada, deixa a IA propor uma nova (matched_by = 'proposed')
    if (keyword && !validateKeywordContext(keyword.label, issue.department_id, originalText)) {
      console.log(`⚠️ Pulando issue com keyword inválida: ${keyword.label}`);
      continue; // Pular esta issue
    }

    // Tratar caso especial para elogios (department_id = "EMPTY")
    if (!department && issue.department_id !== 'EMPTY') {
      console.warn(`Departamento não encontrado: ${issue.department_id}`);
      continue;
    }

    // 🎯 CORREÇÃO: Usar estratégia em cascata para keywords
    let keywordLabel = 'Não identificado';
    let matchedBy: 'embedding' | 'proposed' | 'exact' = 'proposed';
    
    if (keyword) {
      // 1ª opção: Usar keyword encontrada nos candidatos
      keywordLabel = keyword.label;
      matchedBy = keyword.similarity_score > 0.9 ? 'exact' : 'embedding';
    } else if (issue.proposed_keyword) {
      // 2ª opção: Usar keyword proposta ESPECIFICAMENTE para esta issue
      keywordLabel = issue.proposed_keyword;
      matchedBy = 'proposed';
      console.log(`💡 Issue propôs keyword específica: "${keywordLabel}" para contexto "${issue.detail?.substring(0, 40)}..."`);
    } else if (globalProposedKeyword) {
      // 3ª opção: Usar keyword proposta GLOBALMENTE pela IA
      keywordLabel = globalProposedKeyword;
      matchedBy = 'proposed';
      console.log(`💡 Usando keyword proposta globalmente: ${keywordLabel}`);
    } else if (department) {
      // 4ª opção: Fallback baseado no departamento
      keywordLabel = `${department.label} - Geral`;
      matchedBy = 'proposed';
      console.log(`🔄 Fallback: usando keyword genérica do departamento: ${keywordLabel}`);
    }
    
    issues.push({
      department_id: issue.department_id,
      keyword_id: issue.keyword_id || 'EMPTY',
      problem_id: issue.problem_id || 'EMPTY',

      department_label: department ? department.label : 'Não identificado',
      keyword_label: keywordLabel,
      problem_label: problem ? problem.label : 'VAZIO',

      detail: (issue.detail || '').substring(0, 120),
      confidence: Math.max(0, Math.min(1, issue.confidence || 0.5)),
      matched_by: matchedBy  // ✅ Usar variável calculada na cascata
    });
  }

  // Se não há issues, criar uma padrão
  if (issues.length === 0) {
    // Usar um departamento que sempre existe nos candidatos
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
    
    // Log se alerta de candidatos ruins foi adicionado
    if (candidates.keywords.length > 0 && candidates.keywords[0].similarity_score < 0.45) {
      console.log('🚨 ALERTA ADICIONADO AO PROMPT: Candidatos com baixa similaridade (<0.45)');
      console.log('   → IA instruída a PREFERIR candidatos > 0.40 ao invés de propor');
      console.log('   → Só propor se nenhum candidato faz sentido contextual');
    }
    
    // Log de modelo usado
    console.log('🤖 Modelo: gpt-4o (mais inteligente, ~10x mais caro que gpt-4o-mini)');

    // 3. Chamar OpenAI
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // ✅ TROCADO: GPT-4 é mais inteligente para seguir instruções complexas
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [{
        type: "function",
        function: functionSchema
      }],
      tool_choice: { type: "function", function: { name: "classify_feedback" } },
      temperature: 0.3,  // ✅ AUMENTADO: Mais criatividade para propor keywords
      max_tokens: 1500  // ✅ AUMENTADO: Mais espaço para respostas complexas
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_feedback") {
      throw new Error("LLM não retornou função esperada");
    }

    const llmResult = JSON.parse(toolCall.function.arguments);

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
          console.log(`💡 Proposta de keyword ESPECÍFICA criada: "${issue.proposed_keyword}" (contexto: "${issue.detail?.substring(0, 40)}...")`);
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