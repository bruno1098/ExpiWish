import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
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

    // Verificar se o texto contém apenas números ou caracteres não significativos
    const cleanText = texto.trim();
    const isOnlyNumbers = /^\d+$/.test(cleanText);
    const isOnlySpecialChars = /^[^\w\s]+$/.test(cleanText);
    const isTooShort = cleanText.length < 10;
    
    if (isOnlyNumbers || isOnlySpecialChars || isTooShort) {
      return NextResponse.json({
        rating: 3,
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: ''
      });
    }

    const openai = new OpenAI({
      apiKey: apiKey
    });

    const model = useFineTuned ? "ft:gpt-4o-mini-2024-07-18:personal:tuning-feliz:BccF8SYv" : "gpt-3.5-turbo";

    const sentimentPrompt = useFineTuned 
      ? `Avalie este comentário de hotel: "${texto}"`
      : `Analise cuidadosamente o seguinte comentário de cliente de hotel, considerando os aspectos positivos e negativos. Classifique em uma escala de 1 a 5 estrelas, onde:

    1 = Muito insatisfeito/Péssimo (predominantemente críticas graves)
    2 = Insatisfeito/Ruim (mais críticas que elogios)
    3 = Neutro/Regular (equilíbrio entre pontos positivos e negativos)
    4 = Satisfeito/Bom (mais elogios que críticas)
    5 = Muito satisfeito/Excelente (predominantemente elogios)

    Comentário para análise: "${texto}"
    
    Retorne apenas o número da avaliação.`;

    const sectorPrompt = useFineTuned
      ? `Categorize este feedback de hotel: "${texto}"`
      : `Analise o seguinte comentário de cliente de hotel e identifique as palavras-chave mais relevantes, seus setores correspondentes e os problemas específicos.

IMPORTANTE: Se o comentário não contém críticas reais ou problemas específicos, use "VAZIO" na coluna de problemas.

Use EXATAMENTE as opções das listas abaixo:

Lista de PALAVRAS-CHAVE e SETORES (associação obrigatória):
| Palavra-chave               | Setor                     |
|-----------------------------|---------------------------|
| A&B - Café da manhã         | A&B                      |
| A&B - Serviço              | A&B                      |
| A&B - Variedade            | A&B                      |
| A&B - Preço                | A&B                      |
| Academia                   | Lazer                    |
| Limpeza - Quarto           | Governança               |
| Limpeza - Banheiro         | Governança               |
| Limpeza - Áreas sociais    | Governança               |
| Enxoval                    | Governança               |
| Manutenção - Quarto        | Manutenção              |
| Manutenção - Banheiro      | Manutenção              |
| Manutenção - Instalações   | Manutenção              |
| Lazer - Variedade          | Lazer                    |
| Lazer - Estrutura          | Lazer                    |
| Tecnologia - Wi-fi         | TI                       |
| Tecnologia - TV            | TI                       |
| Infraestrutura             | Manutenção              |
| Estacionamento             | Operações               |
| Comodidade                 | Produto                 |
| Comunicação                | Marketing               |
| Custo benefício            | Comercial               |
| Processo                   | Operações               |
| Quarto                     | Produto                 |

REGRAS CRÍTICAS PARA PROBLEMAS:
1. SÓ IDENTIFIQUE PROBLEMAS REAIS mencionados explicitamente no comentário
2. Se não há críticas ou problemas específicos mencionados, use "VAZIO"
3. Se o comentário é positivo sem críticas, use "VAZIO"
4. Se o comentário só tem números ou não faz sentido, use "VAZIO"

FORMATO DE RESPOSTA: 
"Palavra-chave, Setor, Problema"

Exemplo para comentário positivo: "Hotel maravilhoso, adorei tudo!"
Resposta: "Comodidade, Produto, VAZIO"

Exemplo para comentário com problema: "Hotel bom mas o wifi não funcionava"
Resposta: "Tecnologia - Wi-fi, TI, Wi-Fi instável"

Comentário para análise: "${texto}"`;

    const [sentimentResponse, sectorResponse] = await Promise.all([
      openai.chat.completions.create({
        messages: [{ role: "user", content: sentimentPrompt }],
        model: model,
        temperature: useFineTuned ? 0.1 : 0.3,
      }),
      openai.chat.completions.create({
        messages: [{ role: "user", content: sectorPrompt }],
        model: model,
        temperature: useFineTuned ? 0.1 : 0.3,
      })
    ]);

    const rating = parseInt(sentimentResponse.choices[0].message.content?.trim() || "3");
    const rawResponse = sectorResponse.choices[0].message.content?.trim() || "Não identificado, Não identificado, VAZIO";

    // Processar a resposta e limpar problemas vazios
    const parts = rawResponse.split(',').map((part: string) => part.trim());
    
    let processedResponse = rawResponse;
    
    if (parts.length >= 3) {
      let keywords = parts[0] || "Não identificado";
      let sectors = parts[1] || "Não identificado"; 
      let problems = parts[2] || "VAZIO";
      
      // Limpar problemas que indicam ausência de problemas
      const cleanedProblems = problems.toLowerCase().includes('vazio') || 
                             problems.toLowerCase().includes('sem problema') ||
                             problems.toLowerCase().includes('Vazio') ||
                             problems.toLowerCase().includes('VAZIO') ||
                             problems.toLowerCase().includes('não identificado') ||
                             problems.trim() === '' ? '' : problems;
      
      processedResponse = `${keywords}, ${sectors}, ${cleanedProblems}`;
    }

    return NextResponse.json({
      rating,
      response: processedResponse
    });

  } catch (error: any) {
    console.error("Erro na análise:", error);
    
    if (error.message.includes('exceeded your current quota')) {
      return NextResponse.json(
        { error: 'Limite de API atingido' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 