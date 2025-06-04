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
Agora analise TODO o comentário (pode estar em QUALQUER idioma; identifique internamente e traduza se precisar) e devolva exatamente:
**"Palavra-chave, Departamento, Problema"**

Regras obrigatórias:
- Se houver elogios **e** problemas ➜ foque no **problema**.
- Se houver **apenas elogios** ➜ retorne: \`Comodidade, Produto, VAZIO\` ou produtos que vc identificar necessario colocar em um dashboard
- Use termos curtos (máx. 3 palavras).
- Palavra-chave, departamento e problema devem falar do MESMO assunto.
- Não use termos vagos ("Ruim", "Problema", "Coisas").
- Identifique até 3 PROBLEMAS diferentes (linhas separadas).  
- Se houver apenas elogios, devolva: "Comodidade, Produto, VAZIO".
- Cada problema em **uma nova linha**, no formato exato: Palavra-chave, Departamento, Problema
- NÃO coloque algarismos ("1.", "2." ...) nem texto extra antes ou depois de cada linha
- NÃO devolva "Não identificado"; se não achar correspondência perfeita, escolha o departamento mais próximo na tabela
- No problema caso tenha Atendimento lento, ou algo relacionado, pode colocar 2 palavras e nao apenas Lento, retorne exatamente: Atendimento Lento, e o Departamento deve ser Operações.


Atenção a sinônimos: *Wi-Fi*, *Internet*, *Net* → "Tecnologia - Wi-fi" etc.

MAPEAMENTO PALAVRA-CHAVE → DEPARTAMENTO:

| Palavra-chave              | Departamento |
| -------------------------- | ------------ |
| A&B - Café da manhã        | A&B          |
| A&B - Serviço              | A&B          |
| A&B - Variedade            | A&B          |
| A&B - Preço                | A&B          |
| Academia                   | Lazer        |
| Limpeza                    | Governança   |
| Enxoval                    | Governança   |
| Manutenção - Quarto        | Manutenção   |
| Manutenção - Banheiro      | Manutenção   |
| Manutenção - Instalações   | Manutenção   |
| Manutenção - Piscina       | Manutenção   |
| Lazer - Variedade          | Lazer        |
| Lazer - Estrutura          | Lazer        |
| Piscina - Limpeza          | Lazer        |
| Piscina - Acessibilidade   | Lazer        |
| Tecnologia - Wi-fi         | TI           |
| Tecnologia - TV            | TI           |
| Infraestrutura             | Manutenção   |
| Estacionamento             | Operações    |
| Processo                   | Operações    |
| Atendimento                | Operações    |
| Acessibilidade             | Operações    |
| Reserva de cadeiras (pool) | Operações    |
| Comodidade                 | Produto      |
| Quarto                     | Produto      |
| Água (áreas comuns)        | Produto      |
| Espelho                    | Produto      |
| Comunicação                | Marketing    |
| Custo benefício            | Comercial    |
| Palavra-chave               | Departamento |
| Serviço de quarto           | A&B         |
| Bar – Serviço               | A&B         |
| Piscina – Estrutura         | Lazer        |
| Piscina – Capacidade        | Lazer        |
| Concierge                   | Operações    |
| Vendas de cotas / Timeshare | Comercial    |
| Reserva de cadeiras         | Operações    |
| Bar – Lento                 | A&B         |
| Atendimento – Check-in      | Operações    |
| Ar-condicionado             | Manutenção - Quarto |
| Elevador                    | Manutenção - Instalações |
| Spa                         | Lazer |
| Frigobar                    | Manutenção - Quarto |
| Banheiro                     | Manutenção - Banheiro |
| Quarto                       | Produto |
| Quarto                       | Produto |



Comentário: "${texto}"`;

    const [sentimentResponse, sectorResponse] = await Promise.all([
      openai.chat.completions.create({
        messages: [{ role: "user", content: sentimentPrompt }],
        model: model,
        temperature: 0.0, // Zero para máxima determinismo
      }),
      openai.chat.completions.create({
        messages: [{ role: "user", content: sectorPrompt }],
        model: model,
        temperature: 0.0, // Zero para máxima determinismo
      })
    ]);

    const rating = parseInt(sentimentResponse.choices[0].message.content?.trim() || "3");
    const rawResponse = sectorResponse.choices[0].message.content?.trim() || "Não identificado, Não identificado, VAZIO";

    // Processar a resposta para garantir formato correto
    let processedResponse = rawResponse;
    
    // Limpar respostas que não seguem o formato
    if (rawResponse.includes('**') || rawResponse.includes('Resposta:') || rawResponse.includes('Análise:')) {
      // Se a resposta contém formatação, extrair apenas a parte essencial
      const lines = rawResponse.split('\n');
      const cleanLine = lines.find(line => 
        line.includes(',') && 
        !line.includes('**') && 
        !line.includes('Resposta:') &&
        !line.includes('Análise:')
      );
      processedResponse = cleanLine || "Comodidade, Produto, VAZIO";
    }
    
    // Garantir que seja apenas uma linha
    processedResponse = processedResponse.split('\n')[0];
    
    // Processar as partes
    const parts = processedResponse.split(',').map((part: string) => part.trim());
    
    if (parts.length >= 3) {
      let keywords = parts[0] || "Não identificado";
      let sectors = parts[1] || "Não identificado"; 
      let problems = parts[2] || "VAZIO";
      
      // Limpar aspas e formatação extra
      keywords = keywords.replace(/['"]/g, '').trim();
      sectors = sectors.replace(/['"]/g, '').trim();
      problems = problems.replace(/['"]/g, '').trim();
      
      // Limpar problemas que indicam ausência de problemas
      const cleanedProblems = problems.toLowerCase().includes('vazio') || 
                             problems.toLowerCase().includes('sem problema') ||
                             problems.toLowerCase().includes('não identificado') ||
                             problems.trim() === '' ? '' : problems;
      
      processedResponse = `${keywords}, ${sectors}, ${cleanedProblems}`;
    }

    // Cache resultado
    analysisCache.set(cacheKey, {
      data: {
        rating,
        response: processedResponse
      },
      timestamp: Date.now()
    });

    return NextResponse.json({
      rating,
      response: processedResponse
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