import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Cache em memória para análises repetidas
const analysisCache = new Map<string, any>();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutos

// Controle de rate limiting
let requestCount = 0;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 180; // Limite mais alto para melhor performance

// Reset do contador a cada minuto
setInterval(() => {
  requestCount = 0;
}, RATE_LIMIT_WINDOW);

// Função para normalizar texto (deve vir antes do dicionário)
function normalizeText(text: string): string {
  if (!text) return text;
  
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Dicionário raw antes da normalização
const RAW_NORMALIZATION_DICT: Record<string, string> = {
  // Keywords genéricas
  "serviço / café da manhã": "A&B - Serviço", 
  "café da manhã": "A&B - Café da manhã",
  "check-in": "Check-in - Atendimento",
  "check in": "Check-in - Atendimento",
  "check-out": "Check-out - Atendimento", 
  "check out": "Check-out - Atendimento",
  "wifi": "Tecnologia - Wi-fi",
  "wi-fi": "Tecnologia - Wi-fi",
  "wi fi": "Tecnologia - Wi-fi",
  "internet": "Tecnologia - Wi-fi",
  "ar condicionado": "Ar-condicionado",
  "ar-condicionado": "Ar-condicionado",
  "estrutura de lazer": "Lazer - Estrutura",
  "lazer estrutura": "Lazer - Estrutura",
  "manutenção do banheiro": "Manutenção - Banheiro",
  "manutenção do quarto": "Manutenção - Quarto", 
  "manutenção quarto": "Manutenção - Quarto",
  "limpeza do quarto": "Limpeza - Quarto",
  "limpeza quarto": "Limpeza - Quarto",
  "limpeza do banheiro": "Limpeza - Banheiro",
  "limpeza banheiro": "Limpeza - Banheiro",
  "limpeza das áreas sociais": "Limpeza - Áreas sociais",
  "limpeza áreas sociais": "Limpeza - Áreas sociais",
  // Problemas padronizados
  "lento": "Demora no Atendimento",
  "demora no atendimento": "Demora no Atendimento",
  "atendimento lento": "Demora no Atendimento",
  "serviço lento": "Demora no Atendimento",
  "ruído": "Ruído Excessivo",
  "barulho": "Ruído Excessivo",
  "ruído excessivo": "Ruído Excessivo",
  "muito barulho": "Ruído Excessivo",
  "barulhos": "Ruído Excessivo",
  "barulhento": "Ruído Excessivo",
  "barulhenta": "Ruído Excessivo",
  "carrinho": "Ruído Excessivo",
  "carrinhos": "Ruído Excessivo",
  "carrinho de serviço": "Ruído Excessivo",
  "carrinhos de serviço": "Ruído Excessivo",
  "quarto pequeno": "Espaço Insuficiente",
  "espaço pequeno": "Espaço Insuficiente",
  "pouco espaço": "Espaço Insuficiente",
  "comida ruim": "Qualidade da Comida",
  "qualidade da comida": "Qualidade da Comida",
  "comida sem sabor": "Qualidade da Comida",
  "não funciona": "Não Funciona",
  "quebrado": "Não Funciona",
  "com defeito": "Não Funciona",
  "conexão ruim": "Conexão Instável",
  "internet lenta": "Conexão Instável",
  "wifi lento": "Conexão Instável",
  "falta de limpeza": "Falta de Limpeza",
  "sujo": "Falta de Limpeza",
  "sem limpeza": "Falta de Limpeza",
  "preço alto": "Preço Alto",
  "caro": "Preço Alto",
  "muito caro": "Preço Alto",
  "falta de variedade": "Falta de Variedade",
  "pouca variedade": "Falta de Variedade",
  "sem variedade": "Falta de Variedade",
  // Normalizações para as novas keywords dos Excel
  "garçom": "A&B - Serviço",
  "garçons": "A&B - Serviço", 
  "garcom": "A&B - Serviço",
  "garcons": "A&B - Serviço",
  "bar": "A&B - Serviço",
  "bingo": "Lazer - Atividades de Recreação",
  "recreação": "Lazer - Atividades de Recreação",
  "recreacao": "Lazer - Atividades de Recreação", 
  "tia da recreação": "Lazer - Serviço",
  "tio": "Lazer - Serviço",
  "tia": "Lazer - Serviço",
  "monitores": "Lazer - Serviço",
  "monitor": "Lazer - Serviço",
  "karaokê": "Lazer - Atividades de Recreação",
  "karaoke": "Lazer - Atividades de Recreação",
  "fogueira": "Lazer - Atividades de Recreação",
  "piscina fria": "Muito Frio/Quente",
  "janela suja": "Falta de Limpeza",
  "janelas sujas": "Falta de Limpeza",
  "janelas do quarto sujas": "Falta de Limpeza",
  "cheiro de mofo": "Falta de Limpeza",
  "mofo": "Falta de Limpeza",
  "poucos pontos de luz": "Falta de Equipamento",
  "baixa iluminação": "Falta de Equipamento",
  "pouca luminosidade": "Falta de Equipamento",
  "falta de luminosidade": "Falta de Equipamento",
  // Adições baseadas nas edições recentes (iluminação/tomadas)
  "poucos pontos de luz elétrica": "Falta de Equipamento",
  "poucos pontos de energia": "Falta de Equipamento",
  "poucos pontos de tomada": "Falta de Equipamento",
  "poucas tomadas": "Falta de Equipamento",
  "tomadas insuficientes": "Falta de Equipamento",
  "tomada insuficiente": "Falta de Equipamento",
  "falta de tomada": "Falta de Equipamento",
  "falta de tomadas": "Falta de Equipamento",
  "iluminação insuficiente": "Falta de Equipamento",
  "iluminacao insuficiente": "Falta de Equipamento",
  // Adições baseadas nas edições recentes (modernização/antigo)
  "falta de modernização": "Falta de Manutenção",
  "falta de modernizacao": "Falta de Manutenção",
  "hotel antigo": "Falta de Manutenção",
  "estrutura antiga": "Falta de Manutenção",
  "instalações antigas": "Falta de Manutenção",
  "instalacoes antigas": "Falta de Manutenção",
  "precisa modernizar": "Falta de Manutenção",
  "precisa de modernização": "Falta de Manutenção",
  "precisa de modernizacao": "Falta de Manutenção",
  "precisa de reforma": "Falta de Manutenção",
  "precisa reforma": "Falta de Manutenção",
  "cofre": "Não Funciona",
  "fechadura": "Não Funciona",
  "torneira": "Não Funciona",
  "espirra água": "Falta de Manutenção",
  "quadro reduzido": "Capacidade Insuficiente",
  "maior variedade de frutas": "Falta de Variedade",
  "qualidade do café da manhã": "Qualidade da Comida",
  "abordagem repetitiva": "Comunicação Ruim",
  // Regras específicas para pressões de venda / multipropriedade / timeshare
  "insistência": "Comunicação Ruim",
  "insistencia": "Comunicação Ruim",
  "insistente": "Comunicação Ruim",
  "insistiram": "Comunicação Ruim",
  "pressão": "Comunicação Ruim",
  "pressao": "Comunicação Ruim",
  "pressionaram": "Comunicação Ruim",
  "coação": "Comunicação Ruim",
  "coacao": "Comunicação Ruim",
  "assédio": "Comunicação Ruim",
  "assedio": "Comunicação Ruim",
  "venda agressiva": "Comunicação Ruim",
  "vendas agressivas": "Comunicação Ruim",
  "apresentação de vendas": "Comunicação Ruim",
  "apresentacao de vendas": "Comunicação Ruim",
  "multipropriedade": "Comunicação Ruim",
  "timeshare": "Comunicação Ruim",
  "compra de multipropriedade": "Comunicação Ruim",
  "insistência para comprar": "Comunicação Ruim",
  "pressão para comprar": "Comunicação Ruim",
  "coagidos": "Comunicação Ruim",
  "salas de trabalho": "Falta de Disponibilidade",
  // Duplicatas removidas (mantidas as versões acima):
  // "garçom": "A&B - Serviço",
  // "garçons": "A&B - Serviço", 
  // "garcom": "A&B - Serviço",
  // "garcons": "A&B - Serviço",
  // "bar": "A&B - Serviço",
  // "bingo": "Recreação",
  // "recreação": "Recreação",
  // "recreacao": "Recreação", 
  // "tia da recreação": "Recreação",
  "música": "A&B - Serviço",
  "musica": "A&B - Serviço",
  "som": "A&B - Serviço",
  "restaurante": "A&B - Serviço",
  "travesseiro": "Travesseiro",
  "colchão": "Colchão",
  "colchao": "Colchão",
  "espelho": "Espelho",
  // Normalizações para problemas específicos
  "fila": "Fila Longa",
  "fila longa": "Fila Longa", 
  "fila no check-in": "Fila Longa",
  "bebida ruim": "Qualidade de Bebida",
  "drink ruim": "Qualidade de Bebida",
  "sem espelho": "Falta de Equipamento",
  "faltando espelho": "Falta de Equipamento",
  "água indisponível": "Falta de Disponibilidade",
  "sem água": "Falta de Disponibilidade",
  "música alta": "Ruído Excessivo",
  "som alto": "Ruído Excessivo",
  "música muito alta": "Ruído Excessivo",
  "barulho da música": "Ruído Excessivo",
  "volume alto": "Ruído Excessivo",
  "senti falta": "Falta de Disponibilidade",
  "faltou": "Falta de Disponibilidade",
  "não tinha": "Falta de Disponibilidade",
  "sem problemas": "VAZIO",
  // Termos de comida que devem ir para A&B
  "food": "A&B - Serviço",
  "comida": "A&B - Serviço",
  "meal": "A&B - Serviço", 
  "dinner": "A&B - Serviço",
  "lunch": "A&B - Serviço",
  "breakfast": "A&B - Café da manhã",
  "pasta": "A&B - Serviço",
  "restaurant": "A&B - Serviço",
  "drink": "A&B - Serviço",
  "beverage": "A&B - Serviço",
  "coffee": "A&B - Café da manhã",
  "tea": "A&B - Café da manhã"
};

// Dicionário normalizado para lookup eficiente
const NORMALIZATION_DICT = Object.fromEntries(
  Object.entries(RAW_NORMALIZATION_DICT).map(([k, v]) => [normalizeText(k), v])
);

// Keywords oficiais permitadas
const OFFICIAL_KEYWORDS = [
  "A&B - Café da manhã", "A&B - Serviço", "A&B - Variedade", "A&B - Preço",
  "Limpeza - Quarto", "Limpeza - Banheiro", "Limpeza - Áreas sociais", "Enxoval",
  "Manutenção - Quarto", "Manutenção - Banheiro", "Manutenção - Instalações",
  "Ar-condicionado", "Elevador", "Frigobar", "Infraestrutura",

  "Lazer - Variedade", "Lazer - Estrutura", "Spa", "Piscina",
  "Lazer - Serviço", "Lazer - Atividades de Recreação",
  "Tecnologia - Wi-fi", "Tecnologia - TV", "Experiência", "Estacionamento",
  "Atendimento", "Acessibilidade", "Reserva de cadeiras (pool)", "Processo",
  "Custo-benefício", "Comunicação", "Check-in - Atendimento", "Check-out - Atendimento",
  "Concierge", "Cotas", "Reservas", "Água", "Recreação",
  "Travesseiro", "Colchão", "Espelho", "A&B - Gastronomia"
];

// Departamentos oficiais
const OFFICIAL_DEPARTMENTS = [
  "A&B", "Governança", "Manutenção", "Manutenção - Quarto", "Manutenção - Instalações",
  "Lazer", "TI", "Produto", "Operações", "Qualidade", "Recepção", 
  "Programa de vendas", "Comercial"
];

// Problemas padronizados
const STANDARD_PROBLEMS = [
  "Demora no Atendimento", "Espaço Insuficiente", "Qualidade da Comida",
  "Não Funciona", "Muito Frio/Quente", "Conexão Instável", "Falta de Limpeza",
  "Ruído Excessivo", "Capacidade Insuficiente", "Falta de Cadeiras", 
  "Preço Alto", "Falta de Variedade", "Qualidade Baixa", "Falta de Manutenção",
  "Demora no Check-in", "Demora no Check-out", "Falta de Acessibilidade",
  "Comunicação Ruim", "Processo Lento", "Falta de Equipamento", "Fila Longa",
  "Qualidade de Bebida", "Falta de Disponibilidade", "VAZIO", "Não identificado"
];

// Arrays normalizados para busca eficiente
const NORMALIZED_KEYWORDS = OFFICIAL_KEYWORDS.map(k => normalizeText(k));
const NORMALIZED_PROBLEMS = STANDARD_PROBLEMS.map(p => normalizeText(p));

// Função para validar e corrigir keyword
function validateKeyword(keyword: string): string {
  const normalized = normalizeText(keyword);
  
  // Verificar se está na lista oficial normalizada
  const index = NORMALIZED_KEYWORDS.indexOf(normalized);
  if (index !== -1) {
    return OFFICIAL_KEYWORDS[index];
  }
  
  // Tentar encontrar correspondência próxima
  const matchIndex = NORMALIZED_KEYWORDS.findIndex(official => 
    official.includes(normalized) || normalized.includes(official)
  );
  
  if (matchIndex !== -1) {
    return OFFICIAL_KEYWORDS[matchIndex];
  }
  
  // Log para monitoramento de termos não cobertos (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log(`⚠️ Keyword não mapeada: "${keyword}" (normalizada: "${normalized}") - usando fallback "Experiência"`);
  }
  
  return "Experiência"; // Fallback
}

// Função para validar departamento
function validateDepartment(department: string, keyword: string): string {
  // Mapeamento keyword -> departamento
  const keywordToDepartment: Record<string, string> = {
    "A&B - Café da manhã": "A&B",
    "A&B - Serviço": "A&B", 
    "A&B - Variedade": "A&B",
    "A&B - Preço": "A&B",
    "A&B - Gastronomia": "A&B",
    "Limpeza - Quarto": "Governança",
    "Limpeza - Banheiro": "Governança",
    "Limpeza - Áreas sociais": "Governança",
    "Enxoval": "Governança",
    "Manutenção - Quarto": "Manutenção",
    "Manutenção - Banheiro": "Manutenção", 
    "Manutenção - Instalações": "Manutenção",
    "Ar-condicionado": "Manutenção - Quarto",
    "Elevador": "Manutenção - Instalações",
    "Frigobar": "Manutenção - Quarto",
    "Infraestrutura": "Manutenção",
    "Lazer - Variedade": "Lazer",
    "Lazer - Estrutura": "Lazer",
    "Lazer - Serviço": "Lazer",
    "Lazer - Atividades de Recreação": "Lazer",
    "Spa": "Lazer",
    "Piscina": "Lazer",
    "Tecnologia - Wi-fi": "TI",
    "Tecnologia - TV": "TI",
    "Experiência": "Produto",
    "Estacionamento": "Operações",
    "Atendimento": "Operações",
    "Acessibilidade": "Operações",
    "Reserva de cadeiras (pool)": "Operações",
    "Processo": "Operações",
    "Custo-benefício": "Operações",
    "Comunicação": "Qualidade",
    "Check-in - Atendimento": "Recepção",
    "Check-out - Atendimento": "Recepção",
    "Concierge": "Programa de vendas",
    "Cotas": "Programa de vendas", 
    // Mapear vendas/multipropriedade para Programa de vendas
    "Apresentação de vendas": "Programa de vendas",
    "Apresentacao de vendas": "Programa de vendas",
    "Multipropriedade": "Programa de vendas",
    "Timeshare": "Programa de vendas",
    "Oferta de cotas": "Programa de vendas",
    "Reservas": "Comercial",
    "Água": "Operações",
    "Recreação": "Lazer",
    "Travesseiro": "Governança",
    "Colchão": "Governança",
    "Espelho": "Produto"
  };
  
  return keywordToDepartment[keyword] || "Produto";
}

// Função para validar problema
function validateProblem(problem: string): string {
  if (!problem) {
    return "VAZIO";
  }
  
  const normalized = normalizeText(problem);

  // Primeiro, verificar se existe mapeamento explícito no dicionário de normalização
  const mappedByDictionary = NORMALIZATION_DICT[normalized];
  if (mappedByDictionary && STANDARD_PROBLEMS.includes(mappedByDictionary)) {
    return mappedByDictionary;
  }

  // Manter "VAZIO" como está (front-end espera este valor)
  if (normalized === "vazio") {
    return "VAZIO";
  }
  
  // Verificar se está na lista padrão normalizada
  const index = NORMALIZED_PROBLEMS.indexOf(normalized);
  if (index !== -1) {
    return STANDARD_PROBLEMS[index];
  }
  
  // Tentar encontrar correspondência próxima
  const matchIndex = NORMALIZED_PROBLEMS.findIndex(standard => 
    standard.includes(normalized) || normalized.includes(standard)
  );
  
  if (matchIndex !== -1) {
    return STANDARD_PROBLEMS[matchIndex];
  }
  
  return mappedByDictionary || normalized; // Manter original se não encontrar
}

export async function POST(request: NextRequest) {
  try {
    // Verificar rate limit
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Rate limit atingido. Aguarde um momento.' },
        { status: 429 }
      );
    }
    requestCount++;

    const body = await request.json();
    const { texto, comment } = body;
    
    // Usar comment se texto não estiver presente (compatibilidade)
    const feedbackText = texto || comment;
    
    // Verificar se a API key está configurada nas variáveis de ambiente
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key não configurada' },
        { status: 400 }
      );
    }

    if (!feedbackText || feedbackText.trim() === '') {
      return NextResponse.json({
        rating: 3,
        keyword: 'Experiência',
        sector: 'Produto',
        problem: 'VAZIO',
        has_suggestion: false,
        suggestion_type: 'none',
        problems: [{
          keyword: 'Experiência',
          sector: 'Produto', 
          problem: 'VAZIO'
        }],
        legacyFormat: 'Experiência, Produto, VAZIO'
      });
    }

    // Criar chave de cache
    const cacheKey = `${feedbackText.trim().toLowerCase().slice(0, 100)}`;
    
    // Verificar cache
    const cached = analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return NextResponse.json(cached.data);
    }

    // Verificar se o texto contém apenas números ou caracteres não significativos
    const cleanText = feedbackText.trim();
    const isOnlyNumbers = /^\d+$/.test(cleanText);
    const isOnlySpecialChars = /^[^\w\s]+$/.test(cleanText);
    const isTooShort = cleanText.length < 10;
    
    if (isOnlyNumbers || isOnlySpecialChars || isTooShort) {
      const defaultResponse = {
        rating: 3,
        keyword: 'Experiência',
        sector: 'Produto',
        problem: 'VAZIO',
        has_suggestion: false,
        suggestion_type: 'none',
        problems: [{
          keyword: 'Experiência',
          sector: 'Produto',
          problem: 'VAZIO'
        }],
        legacyFormat: 'Experiência, Produto, VAZIO'
      };
      
      // Cache resultado padrão
      analysisCache.set(cacheKey, {
        data: defaultResponse,
        timestamp: Date.now()
      });
      
      return NextResponse.json(defaultResponse);
    }

    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Usar sempre o GPT-4 Mini
    const model = "gpt-4o-mini";

    // Definir a função estruturada para classificação
    const classifyFunction = {
      name: "classify_feedback",
      description: "Classifica o feedback do hóspede em sentimento, problemas estruturados e detecção de sugestões",
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
            description: "true se o comentário contém alguma sugestão de melhoria, false caso contrário"
          },
          suggestion_type: {
            type: "string",
            enum: ["none", "only_suggestion", "mixed", "with_criticism", "with_praise"],
            description: "Tipo de sugestão: 'none'=sem sugestões, 'only_suggestion'=apenas sugestões, 'mixed'=sugestões com críticas/elogios, 'with_criticism'=sugestões com críticas, 'with_praise'=sugestões com elogios"
          },
          issues: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object", 
              properties: {
                keyword: {
                  type: "string",
                  enum: OFFICIAL_KEYWORDS,
                  description: "Palavra-chave oficial da tabela de mapeamento"
                },
                department: {
                  type: "string", 
                  enum: OFFICIAL_DEPARTMENTS,
                  description: "Departamento correspondente à palavra-chave"
                },
                                 problem: {
                   type: "string",
                   enum: STANDARD_PROBLEMS,
                   description: "Problema específico identificado ou 'VAZIO' se apenas elogio"
                 },
                problem_detail: {
                  type: "string",
                  description: "Breve detalhe objetivo do problema: o que exatamente não funciona/falta/está ruim. Ex.: 'Ar-condicionado sem resfriar', 'Wi‑Fi cai toda hora', 'Poucas tomadas no quarto'. Máx. 120 caracteres."
                }
              },
              required: ["keyword", "department", "problem"]
            }
          }
        },
        required: ["sentiment", "has_suggestion", "suggestion_type", "issues"]
      }
    };

    const analysisPrompt = `Você é um auditor de reputação hoteleira especializado. O comentário pode estar EM QUALQUER IDIOMA; identifique internamente e traduza se necessário.

**MISSÃO:** Analise TODO o comentário e identifique ATÉ 3 PROBLEMAS DIFERENTES. Use análise semântica inteligente para detectar QUALQUER tipo de problema, crítica, falta ou insatisfação mencionada. TAMBÉM detecte e classifique SUGESTÕES de melhoria.

**DETECÇÃO DE SUGESTÕES (OBRIGATÓRIA):**
- has_suggestion: true se o comentário contém QUALQUER sugestão de melhoria, implementação ou mudança
- suggestion_type: classifique o tipo de sugestão:
  * "none": sem sugestões
  * "only_suggestion": comentário contém APENAS sugestões (sem críticas ou elogios)
  * "with_criticism": sugestões combinadas com críticas/problemas
  * "with_praise": sugestões combinadas com elogios
  * "mixed": sugestões com críticas E elogios

**PADRÕES DE SUGESTÃO:**
- Palavras indicativas: "poderia", "deveria", "seria bom", "sugiro", "recomendo", "melhoraria se", "gostaria que", "seria interessante", "poderiam implementar", "falta", "precisam de"
- Frases condicionais: "se tivesse...", "seria melhor com...", "faltou apenas..."
- Ideias construtivas: propostas de melhorias, implementações, mudanças

**EXEMPLOS DE SUGESTÕES:**
- "Seria bom ter mais opções no café da manhã" → has_suggestion=true, suggestion_type="only_suggestion"
- "O quarto estava sujo, mas poderiam colocar mais toalhas" → has_suggestion=true, suggestion_type="with_criticism"
- "Adorei a estadia! Sugiro apenas mais atividades na piscina" → has_suggestion=true, suggestion_type="with_praise"
- "Hotel excelente, mas faltou ar-condicionado. Poderiam melhorar a limpeza também" → has_suggestion=true, suggestion_type="mixed"
- "Tudo perfeito, recomendo!" → has_suggestion=false, suggestion_type="none"

**REGRAS DE SAÍDA (OBRIGATÓRIAS):**
- Gere até 3 items em "issues". Cada item DEVE conter: keyword (uma das oficiais), department (compatível com a keyword), problem (uma das categorias padrão; use "VAZIO" somente se houver apenas elogios), e problem_detail.
- problem_detail: descreva em UMA FRASE CURTA, objetiva e concreta o que exatamente está errado/faltando/ruim, sem repetir a categoria ou a keyword. Máx. 120 caracteres. Exemplos: "Ar-condicionado não resfria", "Wi‑Fi cai frequentemente", "Poucas tomadas no quarto".
- Se problem = "VAZIO" (apenas elogio), deixe problem_detail vazio.
- Prefira o idioma do comentário original ao redigir problem_detail.

**⚠️ ATENÇÃO ESPECIAL - COMENTÁRIOS IRRELEVANTES:**
ANTES de qualquer análise, verifique se o comentário é IRRELEVANTE ou INVÁLIDO:

**PADRÕES DE COMENTÁRIOS IRRELEVANTES (classificar como "Não identificado"):**
"conforme meu relato acima" → keyword="Experiência", department="Produto", problem="Não identificado"
"VICE ACIMA" → keyword="Experiência", department="Produto", problem="Não identificado"
"ver comentário anterior" → keyword="Experiência", department="Produto", problem="Não identificado"
"mesmo problema" → keyword="Experiência", department="Produto", problem="Não identificado"
"teste" → keyword="Experiência", department="Produto", problem="Não identificado"
"..." → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
Sempre tente aproximar o maximo possivel os comentarios com os departamentos e palavra chave, use Não identificado somente em casos extremos, quando tiver elogios nao use Não identificado, use Produto e Experiência

**ATENÇÃO - VENDAS/MULTIPROPRIEDADE:** Se houver insistência/pressão/assédio/coação para comprar multipropriedade (timeshare) ou situações de venda agressiva, crie um dos items em "issues" com: keyword="Cotas", department="Programa de vendas" e problem="Comunicação Ruim". Descreva em problem_detail a situação (ex.: "Insistência para comprar multipropriedade durante a estadia").

**COMENTÁRIOS VÁLIDOS (análise normal):**
"Senti falta de água nas áreas comuns" → keyword="Água", department="A&B", problem="Falta de Disponibilidade"
"A música estava muito alta atrapalhando" → keyword="A&B - Serviço", department="A&B", problem="Ruído Excessivo"
"Wi-Fi não funcionava no quarto" → keyword="Tecnologia - Wi-fi", department="TI", problem="Não Funciona"
"Demora absurda no check-in" → keyword="Check-in - Atendimento", department="Recepção", problem="Demora no Check-in"
"Limpeza Simples " → keyword="Limpeza - Quarto", department="Governança", problem="Falta de Limpeza"
"Não tinha shampoo e a torneira estava emperrada." → keyword="Limpeza - Quarto", department="Governança", problem="Falta de Limpeza"
"Quarto sujo com problemas de manutenção" → keyword="Limpeza - Quarto", department="Governança", problem="Falta de Limpeza"

**EXEMPLOS ESPECÍFICOS PARA ALIMENTAÇÃO (A&B):**
"Dinner food was horrible, very low quality ingredients" → keyword="A&B - Serviço", department="A&B", problem="Qualidade da Comida"
"A comida do restaurante estava ruim" → keyword="A&B - Serviço", department="A&B", problem="Qualidade da Comida"
"Food was terrible, pasta was inedible" → keyword="A&B - Serviço", department="A&B", problem="Qualidade da Comida"
"Café da manhã sem variedade" → keyword="A&B - Café da manhã", department="A&B", problem="Falta de Variedade"
"Breakfast was limited, no options" → keyword="A&B - Café da manhã", department="A&B", problem="Falta de Variedade"
"Restaurant service was slow" → keyword="A&B - Serviço", department="A&B", problem="Demora no Atendimento"
"Garçom demorou muito para atender" → keyword="A&B - Serviço", department="A&B", problem="Demora no Atendimento"
"Bar drinks were expensive" → keyword="A&B - Preço", department="A&B", problem="Preço Alto"
"Meal prices too high" → keyword="A&B - Preço", department="A&B", problem="Preço Alto"

**MAPEAMENTO PALAVRA-CHAVE → DEPARTAMENTO (OBRIGATÓRIO):**

| Palavra-chave              | Departamento             |
| -------------------------- | ------------------------ |
| A&B - Café da manhã        | A&B                      |
| A&B - Serviço              | A&B                      |
| A&B - Variedade            | A&B                      |
| A&B - Preço                | A&B                      |
| Limpeza - Quarto           | Governança               |
| Limpeza - Banheiro         | Governança               |
| Limpeza - Áreas sociais    | Governança               |
| Enxoval                    | Governança               |
| Manutenção - Quarto        | Manutenção               |
| Manutenção - Banheiro      | Manutenção               |
| Manutenção - Instalações   | Manutenção               |
| Ar-condicionado            | Manutenção - Quarto      |
| Elevador                   | Manutenção - Instalações |
| Frigobar                   | Manutenção - Quarto      |
| Infraestrutura             | Manutenção               |
| Lazer - Variedade          | Lazer                    |
| Lazer - Estrutura          | Lazer                    |
| Spa                        | Lazer                    |
| Piscina                    | Lazer                    |
| Recreação                  | Lazer                    |
| Tecnologia - Wi-fi         | TI                       |
| Tecnologia - TV            | TI                       |
| Experiência                | Produto                  |
| Estacionamento             | Operações                |
| Atendimento                | Operações                |
| Acessibilidade             | Operações                |
| Reserva de cadeiras (pool) | Operações                |
| Processo                   | Operações                |
| Custo-benefício            | Operações                |
| Água                       | A&B                      |
| Recreação                  | Lazer                    |
| Travesseiro                | Governança               |
| Colchão                    | Governança               |
| Espelho                    | Produto                  |
| Comunicação                | Qualidade                |
| Check-in - Atendimento     | Recepção                 |
| Check-out - Atendimento    | Recepção                 |
| Concierge                  | Programa de vendas       |
| Cotas                      | Programa de vendas       |
| Reservas                   | Comercial                |

Comentário: "${feedbackText}"`;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: analysisPrompt }],
      tools: [{ type: "function", function: classifyFunction }],
      tool_choice: { type: "function", function: { name: "classify_feedback" } },
      temperature: 0.0
    });

    let result;
    
    if (response.choices[0].message.tool_calls?.[0]) {
      const toolCall = response.choices[0].message.tool_calls[0];
      if (toolCall.function) {
        try {
          result = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          console.error("Erro ao parsear JSON da função:", parseError);
          throw new Error("Resposta inválida da IA");
        }
      }
    }

    if (!result) {
      throw new Error("IA não retornou resultado estruturado");
    }

    // Pós-validação e normalização
    const rating = result.sentiment || 3;
    let processedProblems: Array<{keyword: string, sector: string, problem: string, problem_detail?: string}> = [];
    
    if (result.issues && Array.isArray(result.issues)) {
      for (const issue of result.issues.slice(0, 3)) {
        // Validar e normalizar cada campo
        const validatedKeyword = validateKeyword(issue.keyword || "Experiência");
        const validatedDepartment = validateDepartment(issue.department || "Produto", validatedKeyword);
        const validatedProblem = validateProblem(issue.problem || "");
        
        // Definir detalhe do problema (preferir IA; fallback heurístico curto)
        let problemDetail: string = (issue.problem_detail || issue.detail || '').toString().trim();
        if (!problemDetail) {
          const normalizedProblem = (validatedProblem || '').toLowerCase();
          // Nunca gerar detalhe quando for VAZIO ou Não identificado
          if (normalizedProblem === 'vazio' || normalizedProblem === 'não identificado' || normalizedProblem === 'nao identificado') {
            problemDetail = '';
          } else {
            const genericProblems = ["não funciona", "nao funciona"]; 
            const isGeneric = genericProblems.includes(normalizedProblem);
            if (isGeneric && validatedKeyword && validatedKeyword !== "Experiência") {
              problemDetail = `${validatedKeyword} não funciona`;
            } else if (validatedProblem) {
              // Monta um detalhe curto combinando problema + palavra-chave, sem repetir "Falta de" 2x
              if (normalizedProblem.startsWith('falta')) {
                problemDetail = `${validatedProblem} de ${validatedKeyword}`;
              } else {
                problemDetail = `${validatedProblem} em ${validatedKeyword}`;
              }
            } else {
              problemDetail = '';
            }
            // Limitar a 120 chars
            if (problemDetail.length > 120) problemDetail = problemDetail.slice(0, 117).trimEnd() + '...';
          }
        }
        
        processedProblems.push({
          keyword: validatedKeyword,
          sector: validatedDepartment,
          problem: validatedProblem,
          problem_detail: problemDetail
        });
      }
    }
    
    // Se retornou apenas placeholders (VAZIO/Não identificado), manter apenas 1.
    // Se houver problemas reais, remover placeholders e linhas de Produto/Experiência.
    if (processedProblems.length > 0) {
      const hasRealIssues = processedProblems.some(p => {
        const pr = (p.problem || '').toLowerCase();
        return pr !== 'vazio' && pr !== 'não identificado' && pr !== 'nao identificado' && pr.trim() !== '';
      });

      if (hasRealIssues) {
        processedProblems = processedProblems.filter(p => {
          const pr = (p.problem || '').toLowerCase();
          const isPlaceholder = pr === 'vazio' || pr === 'não identificado' || pr === 'nao identificado' || (p.keyword === 'Experiência' && p.sector === 'Produto');
          return !isPlaceholder;
        });
      } else {
        // Consolidar para um único item padrão
        processedProblems = [{
          keyword: 'Experiência',
          sector: 'Produto', 
          problem: 'VAZIO',
          problem_detail: ''
        }];
      }
    }
    
    // Se não conseguiu processar nenhum problema, usar padrão
    if (processedProblems.length === 0) {
      processedProblems.push({
        keyword: "Experiência",
        sector: "Produto", 
        problem: "",
        problem_detail: ''
      });
    }

    // Compatibilidade total com formato anterior
    const firstProblem = processedProblems[0] || {
      keyword: 'Experiência',
      sector: 'Produto', 
      problem: 'VAZIO',
      problem_detail: ''
    };

    // Extrair campos de sugestão da resposta da IA
    const hasSuggestion = result.has_suggestion || false;
    const suggestionType = result.suggestion_type || 'none';

    const finalResult = {
      rating,
      // Campos originais para compatibilidade com front-end existente
      keyword: firstProblem.keyword,
      sector: firstProblem.sector,
      problem: firstProblem.problem,
      problem_detail: firstProblem.problem_detail || '',
      // Novos campos de sugestão
      has_suggestion: hasSuggestion,
      suggestion_type: suggestionType,
      // Formato estendido para futuras melhorias
      problems: processedProblems,
      allProblems: processedProblems,
      // Formato legado string (se necessário)
      legacyFormat: processedProblems.map(p => 
        `${p.keyword}, ${p.sector}, ${p.problem || 'VAZIO'}`
      ).join(';')
    };

    // Cache resultado
    analysisCache.set(cacheKey, {
      data: finalResult,
      timestamp: Date.now()
    });

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Erro na análise:", error);
    
    // Tratamento específico para diferentes tipos de erro
    if (error.message.includes('exceeded your current quota')) {
      return NextResponse.json(
        { error: 'Limite de quota da API atingido. Verifique seu saldo na OpenAI.' },
        { status: 429 }
      );
    }
    
    if (error.message.includes('invalid api key')) {
      return NextResponse.json(
        { error: 'Chave de API inválida. Verifique sua configuração.' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Limite de taxa atingido. Aguarde alguns segundos.' },
        { status: 429 }
      );
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Timeout na conexão. Tente novamente.' },
        { status: 503 }
      );
    }
    
    // Log detalhado para debug
    console.error("Detalhes do erro:", {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Erro temporário no servidor. Tentando novamente...' },
      { status: 500 }
    );
  }
}