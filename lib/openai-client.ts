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

  // Usar o sistema de cache para melhorar desempenho
  const cacheKey = texto.trim().toLowerCase().slice(0, 100);
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
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

  try {
    const response = await fetch('/api/analyze-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texto,
        apiKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 429) {
        throw new Error('exceeded your current quota');
      }
      
      throw new Error(errorData.error || 'Erro na análise');
    }

    const result = await response.json();
    const rating = result.rating;
    const responseText = result.response;

    // Processar a resposta (mantendo a lógica original)
    const parts = responseText.split(',').map((part: string) => part.trim());

    let keywords = "Não identificado";
    let sectors = "Não identificado";
    let problems = "Não identificado";

    if (parts.length >= 3) {
      keywords = parts[0];
      sectors = parts[1];
      problems = parts[2];
      
      const keywordList = keywords.split(';').map((k: string) => k.trim()).filter((k: string) => k);
      const sectorList = sectors.split(';').map((s: string) => s.trim()).filter((s: string) => s);
      const problemList = problems.split(';').map((p: string) => p.trim()).filter((p: string) => p);
      
      keywords = keywordList[0] || "Não identificado";
      sectors = sectorList[0] || "Não identificado";
      problems = problemList[0] || "Não identificado";
    }

    const finalResult = {
      rating,
      keyword: keywords,
      sector: sectors,
      problem: problems
    };

    // Armazenar no cache
    analysisCache.set(cacheKey, finalResult);

    return finalResult;

  } catch (error: any) {
    console.error("Erro na análise (tentativa " + (retryCount + 1) + "):", error);
    
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