export function getApiKey() {
  return typeof window !== 'undefined' ? localStorage.getItem("openai-api-key") : null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 15;
const BASE_DELAY = 1000; // 1 segundo

// Cache global para análises
const analysisCache = new Map<string, { rating: number; keyword: string; sector: string; problem: string }>();

export async function analyzeWithGPT(
  texto: string,
  useFineTuned = false,
  retryCount = 0
): Promise<{ rating: number; keyword: string; sector: string; problem: string }> {
  
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("Erro: API Key não configurada.");
    throw new Error('API Key não configurada. Configure nas Configurações.');
  }

  // Cache separado para fine-tuned vs padrão
  const cacheKey = `${useFineTuned ? 'ft:' : 'std:'}${texto.trim().toLowerCase().slice(0, 100)}`;
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }

  if (!texto || texto.trim() === '') {
    console.log("Texto vazio recebido para análise:", texto);
    return {
      rating: 3,
      keyword: 'Não identificado',
      sector: 'Não identificado',
      problem: ''
    };
  }

  try {
    const response = await fetch('/api/analyze-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texto,
        apiKey,
        useFineTuned
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido na resposta' }));
      
      if (response.status === 429) {
        throw new Error('exceeded your current quota');
      }
      
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const result = await response.json().catch(() => {
      throw new Error('Resposta inválida da API');
    });

    // Validação robusta da resposta
    if (!result || typeof result !== 'object') {
      console.error('Resultado da API inválido:', result);
      throw new Error('Resposta da API em formato inválido');
    }

    const rating = typeof result.rating === 'number' ? result.rating : 3;
    const responseText = result.response || '';

    console.log('Resposta recebida da API:', { rating, responseText, fullResult: result });

    // Validar se responseText é string antes de fazer split
    if (typeof responseText !== 'string') {
      console.error('responseText não é string:', responseText);
      return {
        rating,
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: ''
      };
    }

    // Processar a resposta com validação
    const parts = responseText.split(',').map((part: string) => part.trim());

    let keywords = "Não identificado";
    let sectors = "Não identificado";
    let problems = "";

    if (parts.length >= 3) {
      keywords = parts[0] || "Não identificado";
      sectors = parts[1] || "Não identificado";
      problems = parts[2] || "";
      
      // Processar keywords
      if (keywords && typeof keywords === 'string') {
        const keywordList = keywords.split(';').map((k: string) => k.trim()).filter((k: string) => k);
        keywords = keywordList[0] || "Não identificado";
      }
      
      // Processar sectors
      if (sectors && typeof sectors === 'string') {
        const sectorList = sectors.split(';').map((s: string) => s.trim()).filter((s: string) => s);
        sectors = sectorList[0] || "Não identificado";
      }
      
      // Processar problems
      if (problems && typeof problems === 'string') {
        problems = problems.trim();
        // Limpar indicadores de "sem problema"
        if (problems.toLowerCase().includes('vazio') || 
            problems.toLowerCase().includes('sem problema') ||
            problems.toLowerCase().includes('não identificado')) {
          problems = '';
        }
      } else {
        problems = '';
      }
    } else {
      console.warn('Resposta da API não tem 3 partes:', parts);
    }

    const finalResult = {
      rating,
      keyword: keywords,
      sector: sectors,
      problem: problems
    };

    console.log('Resultado final processado:', finalResult);

    // Armazenar no cache com chave diferenciada
    analysisCache.set(cacheKey, finalResult);

    return finalResult;

  } catch (error: any) {
    console.error(`Erro na análise ${useFineTuned ? '(Fine-tuned)' : '(GPT-3.5)'} (tentativa ${retryCount + 1}):`, error);
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      texto: texto.substring(0, 50) + '...'
    });
    
    // Se é erro de validação de resposta e já tentou algumas vezes, retornar resultado padrão
    if (retryCount >= 3 && (
        error.message.includes('Resposta inválida') ||
        error.message.includes('responseText não é string') ||
        error.message.includes('formato inválido')
      )) {
      console.warn('Muitas tentativas com erro de formato, retornando resultado padrão');
      return {
        rating: 3,
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: ''
      };
    }
    
    if (retryCount < MAX_RETRIES && !error.message.includes('API Key') && !error.message.includes('Limite')) {
      const delayTime = BASE_DELAY * Math.pow(1.5, retryCount) + Math.random() * 1000;
      console.log(`Tentando novamente em ${delayTime}ms...`);
      await delay(delayTime);
      return analyzeWithGPT(texto, useFineTuned, retryCount + 1);
    }
    
    throw error;
  }
}

// Função para limpar o cache se necessário
export function clearAnalysisCache() {
  analysisCache.clear();
}

// Função para obter o tamanho do cache
export function getCacheSize() {
  return analysisCache.size;
} 