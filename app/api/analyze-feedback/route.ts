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
  "bingo": "Recreação",
  "recreação": "Recreação",
  "recreacao": "Recreação", 
  "tia da recreação": "Recreação",
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

// Keywords oficiais permitidas
const OFFICIAL_KEYWORDS = [
  "A&B - Café da manhã", "A&B - Serviço", "A&B - Variedade", "A&B - Preço",
  "Limpeza - Quarto", "Limpeza - Banheiro", "Limpeza - Áreas sociais", "Enxoval",
  "Manutenção - Quarto", "Manutenção - Banheiro", "Manutenção - Instalações",
  "Ar-condicionado", "Elevador", "Frigobar", "Infraestrutura",

  "Lazer - Variedade", "Lazer - Estrutura", "Spa", "Piscina",
  "Tecnologia - Wi-fi", "Tecnologia - TV", "Experiência", "Estacionamento",
  "Atendimento", "Acessibilidade", "Reserva de cadeiras (pool)", "Processo",
  "Custo-benefício", "Comunicação", "Check-in - Atendimento", "Check-out - Atendimento",
  "Concierge", "Cotas", "Reservas", "Água", "Recreação",
  "Travesseiro", "Colchão", "Espelho"
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
    const { texto, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key não configurada' },
        { status: 400 }
      );
    }

    if (!texto || texto.trim() === '') {
      return NextResponse.json({
        rating: 3,
        keyword: 'Experiência',
        sector: 'Produto',
        problem: 'VAZIO',
        problems: [{
          keyword: 'Experiência',
          sector: 'Produto', 
          problem: 'VAZIO'
        }],
        legacyFormat: 'Experiência, Produto, VAZIO'
      });
    }

    // Criar chave de cache
    const cacheKey = `${texto.trim().toLowerCase().slice(0, 100)}`;
    
    // Verificar cache
    const cached = analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return NextResponse.json(cached.data);
    }

    // Verificar se o texto contém apenas números ou caracteres não significativos
    const cleanText = texto.trim();
    const isOnlyNumbers = /^\d+$/.test(cleanText);
    const isOnlySpecialChars = /^[^\w\s]+$/.test(cleanText);
    const isTooShort = cleanText.length < 10;
    
    if (isOnlyNumbers || isOnlySpecialChars || isTooShort) {
      const defaultResponse = {
        rating: 3,
        keyword: 'Experiência',
        sector: 'Produto',
        problem: 'VAZIO',
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
      description: "Classifica o feedback do hóspede em sentimento e problemas estruturados",
      parameters: {
        type: "object",
        properties: {
          sentiment: {
            type: "integer",
            enum: [1, 2, 3, 4, 5],
            description: "1=Muito insatisfeito, 2=Insatisfeito, 3=Neutro, 4=Satisfeito, 5=Muito satisfeito"
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
                 }
              },
              required: ["keyword", "department", "problem"]
            }
          }
        },
        required: ["sentiment", "issues"]
      }
    };

    const analysisPrompt = `Você é um auditor de reputação hoteleira especializado. O comentário pode estar EM QUALQUER IDIOMA; identifique internamente e traduza se necessário.

**MISSÃO:** Analise TODO o comentário e identifique ATÉ 3 PROBLEMAS DIFERENTES. Use análise semântica inteligente para detectar QUALQUER tipo de problema, crítica, falta ou insatisfação mencionada.

**⚠️ ATENÇÃO ESPECIAL - COMENTÁRIOS IRRELEVANTES:**
ANTES de qualquer análise, verifique se o comentário é IRRELEVANTE ou INVÁLIDO:

**PADRÕES DE COMENTÁRIOS IRRELEVANTES (retornar: keyword="Experiência", department="Produto", problem="Não identificado"):**
- Referências vagas: "conforme meu relato acima", "como mencionado anteriormente", "conforme já disse", "já informei"
- Textos de preenchimento: "VICE ACIMA", "VIDE ACIMA", "ver acima", "idem acima", "igual acima"
- Comentários vazios de contexto: "mesmo problema", "igual anterior", "mesma situação", "idem"
- Textos sem sentido: "test", "teste", "...", "xxx", "nada a declarar", "n/a", "não se aplica"
- Apenas pontuação/símbolos: ".", "...", "---", "***", "sem comentários"
- Frases incompletas sem contexto: "sobre o", "em relação", "quanto ao", "a respeito"
- Redirecionamentos: "ver comentário anterior", "conforme informado", "como relatado"

**SE IDENTIFICAR QUALQUER PADRÃO ACIMA:**
- Retorne SEMPRE: keyword="Experiência", department="Produto", problem="Não identificado"
- NÃO tente analisar o conteúdo
- NÃO busque por problemas ou sentimentos

**METODOLOGIA DE ANÁLISE SEMÂNTICA (APENAS para comentários VÁLIDOS):**
1. **LEIA** cuidadosamente todo o comentário
2. **DETECTE PRIMEIRO A&B** - Procure palavras relacionadas a alimentação:
   - Palavras-chave: "food", "comida", "meal", "dinner", "lunch", "breakfast", "pasta", "restaurant", "bar", "drink", "coffee", "garçom", "waiter"
   - Se encontrar QUALQUER uma → use departamento A&B (NUNCA "Produto" ou "Experiência")
3. **IDENTIFIQUE** apenas problemas reais:
   - Faltas: "não tinha", "faltou", "senti falta", "sem..."
   - Críticas: "muito alto", "ruim", "inadequado", "pequeno demais"
   - Defeitos: "quebrado", "sujo", "não funcionava", "com problema"
   - Reclamações: "atrapalhando", "incomodou", "demorou", "difícil"
4. **IGNORE** completamente elogios e aspectos positivos:
   - "maravilhoso", "excelente", "ótimo", "agradável", "limpo", "atenciosos"
5. **CLASSIFIQUE** usando as regras abaixo

**REGRAS OBRIGATÓRIAS:**
- **PRIMEIRA PRIORIDADE:** Verifique se é comentário irrelevante/inválido. Se SIM, retorne imediatamente "Não identificado"
- **SEGUNDA PRIORIDADE:** Identifique temas de A&B (comida, bebida, restaurante, bar, café da manhã, garçom):
  * Qualquer menção a "food", "comida", "meal", "dinner", "lunch", "breakfast", "café da manhã" → use A&B
  * "restaurant", "restaurante", "bar", "garçom", "waiter", "service" (em contexto de comida) → use A&B
  * "pasta", "drink", "beverage", "coffee", "tea" e ingredientes/pratos → use A&B
  * NUNCA use "Experiência" para problemas de comida - SEMPRE use A&B
- SEMPRE seguir EXATAMENTE a tabela de mapeamento abaixo
- Se Palavra-chave = "Estacionamento" → Departamento DEVE ser "Operações"  
- Se Palavra-chave = "Enxoval" → Departamento DEVE ser "Governança"
- E assim por diante seguindo a tabela RIGOROSAMENTE
- Se houver elogios **e** problemas ➜ foque APENAS nos **problemas**
- Se houver **apenas elogios** ➜ retorne: keyword="Experiência", department="Produto", problem="VAZIO"
- Para problemas use termos ESPECÍFICOS e PADRONIZADOS:
  * Se for serviço lento: "Demora no Atendimento"
  * Se for quarto pequeno: "Espaço Insuficiente" 
  * Se for comida ruim: "Qualidade da Comida"
  * Se for ar-condicionado: "Não Funciona" ou "Muito Frio/Quente"
  * Se for WiFi: "Conexão Instável"
  * Se for limpeza: "Falta de Limpeza"
  * Se for barulho/música alta: "Ruído Excessivo"
  * Se for falta de algo: "Falta de Disponibilidade"
- Identifique até 3 PROBLEMAS diferentes
- Palavra-chave, departamento e problema devem falar do MESMO assunto
- Não use termos vagos ("Ruim", "Problema", "Coisas", "Lento")
- SEMPRE tente classificar o comentário; use "Não identificado" apenas em casos extremos
- Quando for relacionado a bar/restaurante, coloque em A&B
- JAMAIS use "Sem problemas" - use apenas "VAZIO"
- Se há contexto suficiente, escolha o departamento mais próximo da tabela

**EXEMPLOS DE ANÁLISE SEMÂNTICA:**

**COMENTÁRIOS IRRELEVANTES (classificar como "Não identificado"):**
"conforme meu relato acima" → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
"VICE ACIMA" → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
"ver comentário anterior" → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
"mesmo problema" → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
"teste" → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
"..." → keyword="Não identificado", department="Não Identificado", problem="Não identificado"
Sempre tente aproximar o maximo possivel os comentarios com os departamentos e palavra chave, use Não identificado somente em casos extremos, quando tiver elogios nao use Não identificado, use Produto e Experiência

**COMENTÁRIOS VÁLIDOS (análise normal):**
"Senti falta de água nas áreas comuns" → keyword="Água", department="A&B", problem="Falta de Disponibilidade"
"A música estava muito alta atrapalhando" → keyword="A&B - Serviço", department="A&B", problem="Ruído Excessivo"
"Wi-Fi não funcionava no quarto" → keyword="Tecnologia - Wi-fi", department="TI", problem="Não Funciona"
"Demora absurda no check-in" → keyword="Check-in - Atendimento", department="Recepção", problem="Demora no Check-in"
"Limpeza Simples " → keyword="Limpeza - Quarto", department="Governança", problem="Falta de Limpeza"
"Não tinha shampoo e a tornera estava emperrada." → keyword="Limpeza - Quarto", department="Governança", problem="Falta de Limpeza"
"Quarto sujo com problemas de manutenção" → keyword="Manutenção - Quarto", department="Governança", problem="Falta de Limpeza"

**EXEMPLOS ESPECÍFICOS PARA ALIMENTAÇÃO (A&B):**
"Dinner food was horrible, very low quality ingredients" → keyword="A&B - Serviço", department="A&B", problem="Qualidade da Comida"
"A comida do restaurante estava ruim" → keyword="A&B - Serviço", department="A&B", problem="Qualidade da Comida"
"Food was terrible, pasta was inedible" → keyword="A&B - Serviço", department="A&B", problem="Qualidade da Comida"
"Café da manhã sem variedade" → keyword="A&B - Café da manhã", department="A&B", problem="Falta de Variedade"
"Breakfast was limited, no options" → keyword="A&B - Café da manhã", department="A&B", problem="Falta de Variedade"
"Restaurant service was slow" → keyword="A&B - Serviço", department="A&B", problem="Demora no Atendimento"
"Garçom demorou muito para atender" → keyword="Garçom", department="A&B", problem="Demora no Atendimento"
"Bar drinks were expensive" → keyword="Bar", department="A&B", problem="Preço Alto"
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

Comentário: "${texto}"`;

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
    let processedProblems: Array<{keyword: string, sector: string, problem: string}> = [];
    
    if (result.issues && Array.isArray(result.issues)) {
      for (const issue of result.issues.slice(0, 3)) {
        // Validar e normalizar cada campo
        const validatedKeyword = validateKeyword(issue.keyword || "Experiência");
        const validatedDepartment = validateDepartment(issue.department || "Produto", validatedKeyword);
        const validatedProblem = validateProblem(issue.problem || "");
        
        processedProblems.push({
          keyword: validatedKeyword,
          sector: validatedDepartment,
          problem: validatedProblem
        });
      }
    }
    
    // Se não conseguiu processar nenhum problema, usar padrão
    if (processedProblems.length === 0) {
      processedProblems.push({
        keyword: "Experiência",
        sector: "Produto", 
        problem: ""
      });
    }

    // Compatibilidade total com formato anterior
    const firstProblem = processedProblems[0] || {
      keyword: 'Experiência',
      sector: 'Produto', 
      problem: 'VAZIO'
    };

    const finalResult = {
      rating,
      // Campos originais para compatibilidade com front-end existente
      keyword: firstProblem.keyword,
      sector: firstProblem.sector,
      problem: firstProblem.problem,
      // Formato estendido para futuras melhorias
      problems: processedProblems,
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