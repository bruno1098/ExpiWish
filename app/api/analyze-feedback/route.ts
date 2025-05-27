import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
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
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: 'Não identificado'
      });
    }

    const openai = new OpenAI({
      apiKey: apiKey
    });

    const sentimentPrompt = `Analise cuidadosamente o seguinte comentário de cliente de hotel, considerando os aspectos positivos e negativos. Classifique em uma escala de 1 a 5 estrelas, onde:

    1 = Muito insatisfeito/Péssimo (predominantemente críticas graves)
    2 = Insatisfeito/Ruim (mais críticas que elogios)
    3 = Neutro/Regular (equilíbrio entre pontos positivos e negativos)
    4 = Satisfeito/Bom (mais elogios que críticas)
    5 = Muito satisfeito/Excelente (predominantemente elogios)

    Regras importantes de classificação:
    - Se houver críticas a aspectos de segurança ou manutenção essencial, a nota não deve ser maior que 3
    - Se houver problemas estruturais ou de funcionamento básico, mesmo com outros pontos positivos, a nota deve ser 2 ou 3
    - Comentários que misturam elogios e críticas devem ser analisados pela gravidade das críticas:
      * Críticas graves (segurança, limpeza, problemas estruturais) = nota máxima 3
      * Críticas leves (detalhes estéticos, pequenos inconvenientes) = pode manter nota 4
    - A nota 5 deve ser reservada para comentários genuinamente positivos sem críticas significativas
    - A nota 1 deve ser usada quando há problemas graves ou múltiplas críticas sérias

    Comentário para análise: "${texto}"
    
    Retorne apenas o número da avaliação.`;

    const sectorPrompt = `Analise o seguinte comentário de cliente de hotel e identifique as palavras-chave mais relevantes, seus setores correspondentes e os problemas específicos.

Use EXATAMENTE as opções das listas abaixo:

Lista de PALAVRAS-CHAVE e SETORES (associação obrigatória):
| Palavra-chave               | Setor                     |
|-----------------------------|---------------------------|
| A&B - Café da manhã         | A&B                      |
| A&B - Serviço              | A&B                      |
| A&B - Variedade            | A&B                      |
| A&B - Preço                | A&B                      |
| Academia                    | Lazer                    |
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

Lista de PROBLEMAS PADRONIZADOS (use APENAS estes termos):
- Quarto pequeno
- Quarto desconfortável
- Café limitado
- Poucas opções
- Poucas opções de jantar
- Atendimento ruim
- Atendimento lento
- Wi-Fi instável
- Equipamentos antigos
- Limpeza inadequada
- Barulho excessivo
- Preço alto
- Manutenção precária
- Poucas atividades
- Falta estrutura
- Localização ruim
- Ar-condicionado ruim
- TV com problemas
- Banheiro pequeno
- Check-in demorado
- Estacionamento lotado
- Estacionamento pago
- Abordagem comercial indesejada
- Distância da estrutura
- Sem problemas (SOMENTE quando não há críticas)

REGRAS ESTRITAS:
1. NUNCA use "Sem problemas" como SETOR - este termo é exclusivo para a coluna de PROBLEMAS.
2. NUNCA repita o mesmo setor mais de uma vez em um comentário.
3. Para cada palavra-chave, associe EXATAMENTE UM setor e UM problema correspondente.
4. Se o comentário for positivo sobre um aspecto, use "Sem problemas" APENAS na coluna de PROBLEMAS.
5. NUNCA inclua mais de 3 conjuntos de palavra-chave/setor/problema por comentário.
6. Mantenha a MESMA ORDEM entre palavras-chave, setores e problemas.

FORMATO DE RESPOSTA: 
"Palavra-chave1; Palavra-chave2; Palavra-chave3, Setor1; Setor2; Setor3, Problema1; Problema2; Problema3"

Comentário para análise: "${texto}"

LEMBRE-SE:
- NUNCA use "Sem problemas" como SETOR
- NUNCA repita o mesmo setor mais de uma vez
- Limite-se a no máximo 3 conjuntos (se o comentário mencionar mais, escolha os 3 mais relevantes)`;

    const [sentimentResponse, sectorResponse] = await Promise.all([
      openai.chat.completions.create({
        messages: [{ role: "user", content: sentimentPrompt }],
        model: "gpt-3.5-turbo",
        temperature: 0.3,
      }),
      openai.chat.completions.create({
        messages: [{ role: "user", content: sectorPrompt }],
        model: "gpt-3.5-turbo",
        temperature: 0.3,
      })
    ]);

    const rating = parseInt(sentimentResponse.choices[0].message.content?.trim() || "3");
    const response = sectorResponse.choices[0].message.content?.trim() || "Não identificado, Não identificado, Não identificado";

    // Processar a resposta
    const parts = response.split(',').map(part => part.trim());
    let keywords = "Não identificado";
    let sectors = "Não identificado";
    let problems = "Não identificado";

    if (parts.length >= 3) {
      keywords = parts[0];
      sectors = parts[1];
      problems = parts[2];
      
      const keywordList = keywords.split(';').map(k => k.trim()).filter(k => k);
      const sectorList = sectors.split(';').map(s => s.trim()).filter(s => s);
      const problemList = problems.split(';').map(p => p.trim()).filter(p => p);
      
      keywords = keywordList[0] || "Não identificado";
      sectors = sectorList[0] || "Não identificado";
      problems = problemList[0] || "Não identificado";
    }

    return NextResponse.json({
      rating,
      keyword: keywords,
      sector: sectors,
      problem: problems
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