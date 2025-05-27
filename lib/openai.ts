import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

// Função para atualizar a instância do OpenAI
const updateOpenAIInstance = () => {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem("openai-api-key") : null;
  
  if (apiKey) {
    openaiInstance = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  } else {
    openaiInstance = null;
  }
}

// Atualizar quando a API key mudar
if (typeof window !== 'undefined') {
  window.addEventListener('apiKeyChanged', updateOpenAIInstance);
  updateOpenAIInstance(); // Inicializar na primeira vez
}

export function getApiKey() {
  return typeof window !== 'undefined' ? localStorage.getItem("openai-api-key") : null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 15;
const BASE_DELAY = 1000; // 1 segundo

export async function analyzeWithGPT(
  texto: string,
  useFineTuned = false,
  retryCount = 0
): Promise<{ rating: number; keyword: string; sector: string; problem: string }> {
  
  if (!openaiInstance) {
    console.error("Erro: openaiInstance não foi inicializado corretamente.");
    throw new Error('API Key não configurada. Configure nas Configurações.');
  }

  // Usar o sistema de cache para melhorar desempenho
  if (!analyzeWithGPT.cache) {
    analyzeWithGPT.cache = new Map();
  }

  const cacheKey = texto.trim().toLowerCase().slice(0, 100);
  if (analyzeWithGPT.cache.has(cacheKey)) {
    return analyzeWithGPT.cache.get(cacheKey);
  }

  if (!texto || texto.trim() === '') {
    console.log("Texto vazio recebido para análise:", texto);
    return {
      rating: 3,
      keyword: 'Não identificado',
      sector: 'Não identificado',
      problem: 'Não identificado'
    };
  }

  // Usando GPT-3.5-turbo (mais barato)
  const modelId = "gpt-3.5-turbo";
  
  // Código original com modelo fine-tuned (comentado)
  // const modelId = "ft:gpt-4o-2024-08-06:personal:treino3:B5DXUVXY";

  try {
    // Mantenha o sentimentPrompt existente, mas adicione/substitua apenas o sectorPrompt:
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
1. NUNCA use "Sem problemas" como um SETOR - este termo é exclusivo para a coluna de PROBLEMAS.
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

    // Voltar a fazer as duas chamadas separadas como no código original
    const [sentimentResponse, sectorResponse] = await Promise.all([
      openaiInstance.chat.completions.create({
        messages: [{ role: "user", content: sentimentPrompt }],
        model: modelId,
        temperature: 0.3,
      }),
      openaiInstance.chat.completions.create({
        messages: [{ role: "user", content: sectorPrompt }],
        model: modelId,
        temperature: 0.3,
      })
    ]);

    const rating = parseInt(sentimentResponse.choices[0].message.content?.trim() || "3");
    const response = sectorResponse.choices[0].message.content?.trim() || "Não identificado, Não identificado, Não identificado";

    // Dividir a resposta em três partes: palavras-chave, setores e problemas
    const parts = response.split(',').map(part => part.trim());

    // Garantir que temos pelo menos 3 partes
    let keywords = "Não identificado";
    let sectors = "Não identificado";
    let problems = "Não identificado";

    if (parts.length >= 3) {
      keywords = parts[0];
      sectors = parts[1];
      problems = parts[2];
      
      // Separar os elementos
      const keywordArray = keywords.split(';').map(k => k.trim());
      const sectorArray = sectors.split(';').map(s => s.trim());
      const problemArray = problems.split(';').map(p => p.trim());
      
      // Remover duplicatas nos setores (sem usar spread operator)
      const uniqueSectors: string[] = [];
      sectorArray.forEach(sector => {
        if (!uniqueSectors.includes(sector)) {
          uniqueSectors.push(sector);
        }
      });
      
      // Remover "Sem problemas" dos setores
      const validSectors: string[] = [];
      uniqueSectors.forEach(sector => {
        if (sector !== "Sem problemas" && sector !== "") {
          validSectors.push(sector);
        }
      });
      
      // Se não houver setores válidos, usar "Não identificado"
      if (validSectors.length === 0) {
        validSectors.push("Não identificado");
      }
      
      // Corrigir os problemas, garantindo que "Sem problemas" seja usado corretamente
      const validProblems: string[] = [];
      problemArray.forEach(problem => {
        if (problem.trim() !== "") {
          validProblems.push(problem.trim());
        }
      });
      
      if (validProblems.length === 0) {
        validProblems.push("Não identificado");
      }
      
      // Ajustar o número de elementos para ser consistente
      const validKeywords: string[] = [];
      keywordArray.forEach(keyword => {
        if (keyword.trim() !== "") {
          validKeywords.push(keyword.trim());
        }
      });
      
      if (validKeywords.length === 0) {
        validKeywords.push("Não identificado");
      }
      
      // Limitar ao menor comprimento entre palavras-chave, setores e problemas
      const minLength = Math.min(
        validKeywords.length,
        validSectors.length,
        validProblems.length
      );
      
      // Caso o número de elementos seja diferente, ajustar para o mesmo tamanho
      const normalizedKeywords = validKeywords.slice(0, minLength);
      const normalizedSectors = validSectors.slice(0, minLength);
      const normalizedProblems = validProblems.slice(0, minLength);
      
      // Ajustar strings finais
      keywords = normalizedKeywords.join('; ');
      sectors = normalizedSectors.join('; ');
      problems = normalizedProblems.join('; ');
    }

    const result = {
      rating: isNaN(rating) ? 3 : rating,
      keyword: keywords,  // Manter como string para compatibilidade
      sector: sectors,    // Manter como string para compatibilidade
      problem: problems   // Manter como string para compatibilidade
    };
    
    // Armazenar no cache
    analyzeWithGPT.cache.set(cacheKey, result);
    
    return result;
  } catch (error: any) {
    // Se for erro de rate limit e ainda não excedeu o número máximo de tentativas
    if (error?.message?.includes('Rate limit') && retryCount < MAX_RETRIES) {
      const waitTime = BASE_DELAY * Math.pow(2, retryCount); // Backoff exponencial
      await delay(waitTime);
      return analyzeWithGPT(texto, useFineTuned, retryCount + 1);
    }
    
    throw error;
  }
}

// Adicionar a propriedade cache à função
analyzeWithGPT.cache = new Map();