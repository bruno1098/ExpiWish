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
    const { texto, apiKey, useFineTuned = false } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key não configurada' },
        { status: 400 }
      );
    }

    if (!texto || texto.trim() === '') {
      return NextResponse.json({
        rating: 3,
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: ''
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
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: ''
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

    // Modelo fixo: GPT-4o-mini
    const model = "gpt-4o-mini";
    
    // Modelo fine-tuned comentado - pode ser reativado futuramente
    // const model = useFineTuned ? "ft:gpt-4o-mini-2024-07-18:personal:tuning-feliz:BccF8SYv" : "gpt-4o-mini";

    const sentimentPrompt = `### 1) CLASSIFICAÇÃO DE SENTIMENTO
Você é um auditor de reputação hoteleira. Dado um comentário de hóspede, devolva **apenas um número de 1 a 5** (sem texto extra) seguindo:
1 = Muito insatisfeito (críticas graves predominam)
2 = Insatisfeito (mais críticas que elogios)
3 = Neutro (equilíbrio)
4 = Satisfeito (mais elogios que críticas)
5 = Muito satisfeito (quase só elogios)

Comentário: "${texto}"`;

    const sectorPrompt = `### 2) PALAVRA-CHAVE, DEPARTAMENTO, PROBLEMA
Agora analise TODO o comentário (pode estar em QUALQUER idioma; identifique internamente e traduza se precisar) e identifique ATÉ 3 PROBLEMAS DIFERENTES.

FORMATO DE RESPOSTA OBRIGATÓRIO:
Palavra-chave, Departamento, Problema;Palavra-chave, Departamento, Problema;Palavra-chave, Departamento, Problema

Regras OBRIGATÓRIAS:
- SEMPRE seguir EXATAMENTE a tabela de mapeamento abaixo
- Se Palavra-chave = "Estacionamento" → Departamento DEVE ser "Operações"  
- Se Palavra-chave = "Enxoval" → Departamento DEVE ser "Governança"
- E assim por diante seguindo a tabela RIGOROSAMENTE
- Se houver elogios **e** problemas ➜ foque APENAS nos **problemas**
- Se houver **apenas elogios** ➜ retorne: \`Comodidade, Produto, VAZIO\`
- Para problemas use termos curtos (máx. 3 palavras) e tente não criar variedades, se em um você identificar que o problema é "Piscina" apenas, nos outros sobre piscina deixe da mesma forma.
- Palavra-chave, departamento e problema devem falar do MESMO assunto
- Não use termos vagos ("Ruim", "Problema", "Coisas", "Lento")
- Para PROBLEMAS, use termos ESPECÍFICOS e PADRONIZADOS:
  * Se for serviço lento: "Demora no Atendimento"
  * Se for quarto pequeno: "Espaço Insuficiente" 
  * Se for comida ruim: "Qualidade da Comida"
  * Se for ar-condicionado: "Não Funciona" ou "Muito Frio/Quente"
  * Se for WiFi: "Conexão Instável"
  * Se for limpeza: "Falta de Limpeza"
  * Se for barulho: "Ruído Excessivo"
- Identifique até 3 PROBLEMAS diferentes separados por PONTO E VÍRGULA (;)
- Cada problema no formato: Palavra-chave, Departamento, Problema
- NÃO coloque algarismos ("1.", "2." ...) nem texto extra
- NÃO devolva "Não identificado"; escolha o departamento mais próximo na tabela
- Quando for relacionado a bar, coloque em A&B (Alimentos e Bebidas)
- Para Atendimento lento: retorne "Atendimento, Operações, Demora no Atendimento"

MAPEAMENTO PALAVRA-CHAVE → DEPARTAMENTO (OBRIGATÓRIO):

| Palavra-chave              | Departamento |
| -------------------------- | ------------ |
| A&B - Café da manhã        | A&B          |
| A&B - Serviço              | A&B          |
| A&B - Variedade            | A&B          |
| A&B - Preço                | A&B          |
| Limpeza - Quarto           | Governança   |
| Limpeza - Banheiro         | Governança   |
| Limpeza - Áreas sociais    | Governança   |
| Enxoval                    | Governança   |
| Manutenção - Quarto        | Manutenção   |
| Manutenção - Banheiro      | Manutenção   |
| Manutenção - Instalações   | Manutenção   |
| Ar-condicionado            | Manutenção - Quarto |
| Elevador                   | Manutenção - Instalações |
| Frigobar                   | Manutenção - Quarto |
| Infraestrutura             | Manutenção   |
| Lazer - Variedade          | Lazer        |
| Lazer - Estrutura          | Lazer        |
| Spa                        | Lazer        |
| Piscina                    | Lazer        |
| Tecnologia - Wi-fi         | TI           |
| Tecnologia - TV            | TI           |
| Infraestrutura             | Produto      |
| Comodidade                 | Produto      |
| Estacionamento             | Operações    |
| Atendimento                | Operações    |
| Acessibilidade             | Operações    |
| Reserva de cadeiras (pool) | Operações    |
| Atendimento – Check-in     | Operações    |
| Processo                   | Operações    |
| Custo-benefício            | Operações    |
| Comunicação                | Qualidade    |
| Processo                   | Qualidade    |
| Check-in - Atendimento     | Recepção     |
| Check-out - Atendimento    | Recepção     |
| Concierge                  | Programa de vendas |
| Cotas                      | Programa de vendas |
| Reservas                   | Comercial    |

EXEMPLO DE RESPOSTA:
"A&B - Serviço, A&B, Demora no Atendimento;Piscina, Lazer, Capacidade Insuficiente;Reserva de cadeiras (pool), Operações, Falta de Cadeiras"

Comentário: "${texto}"`;

    const [sentimentResponse, sectorResponse] = await Promise.all([
      openai.chat.completions.create({
        messages: [{ role: "user", content: sentimentPrompt }],
        model: model,
        temperature: 0.0,
      }),
      openai.chat.completions.create({
        messages: [{ role: "user", content: sectorPrompt }],
        model: model,
        temperature: 0.0,
      })
    ]);

    const rating = parseInt(sentimentResponse.choices[0].message.content?.trim() || "3");
    const rawResponse = sectorResponse.choices[0].message.content?.trim() || "Comodidade, Produto, VAZIO";

    // Processar múltiplos problemas separados por ponto e vírgula
    let processedProblems: Array<{keyword: string, sector: string, problem: string}> = [];
    
    // Limpar resposta de formatação desnecessária
    let cleanResponse = rawResponse;
    if (rawResponse.includes('**') || rawResponse.includes('Resposta:') || rawResponse.includes('Análise:')) {
      const lines = rawResponse.split('\n');
      const cleanLine = lines.find(line => 
        line.includes(',') && 
        !line.includes('**') && 
        !line.includes('Resposta:') &&
        !line.includes('Análise:')
      );
      cleanResponse = cleanLine || "Comodidade, Produto, VAZIO";
    }
    
    // Separar por ponto e vírgula
    const problemEntries = cleanResponse.split(';').map(entry => entry.trim()).filter(entry => entry.length > 0);
    
    // Processar cada problema
    for (const entry of problemEntries.slice(0, 3)) { // Máximo 3 problemas
      const parts = entry.split(',').map(part => part.trim());
      
      if (parts.length >= 3) {
        let keyword = parts[0].replace(/['"]/g, '').trim();
        let sector = parts[1].replace(/['"]/g, '').trim();
        let problem = parts[2].replace(/['"]/g, '').trim();
        
        // Limpar problemas que indicam ausência de problemas
        const cleanedProblem = problem.toLowerCase().includes('vazio') || 
                              problem.toLowerCase().includes('sem problema') ||
                              problem.toLowerCase().includes('não identificado') ||
                              problem.trim() === '' ? '' : problem;
        
        processedProblems.push({
          keyword,
          sector,
          problem: cleanedProblem
        });
      }
    }
    
    // Se não conseguiu processar nenhum problema, usar padrão
    if (processedProblems.length === 0) {
      processedProblems.push({
        keyword: "Comodidade",
        sector: "Produto", 
        problem: ""
      });
    }

    // Cache resultado
    analysisCache.set(cacheKey, {
      data: {
        rating,
        problems: processedProblems
      },
      timestamp: Date.now()
    });

    return NextResponse.json({
      rating,
      problems: processedProblems
    });

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