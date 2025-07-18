export function getApiKey() {
  return typeof window !== 'undefined' ? localStorage.getItem("openai-api-key") : null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 15;
const BASE_DELAY = 1000; // 1 segundo

// Tipo para um problema individual
type ProblemAnalysis = {
  keyword: string;
  sector: string;
  problem: string;
};

// Cache global para análises
const analysisCache = new Map<string, { 
  rating: number; 
  keyword: string; 
  sector: string; 
  problem: string;
  allProblems: ProblemAnalysis[];
}>();

export async function analyzeWithGPT(
  texto: string,
  useFineTuned = false,
  retryCount = 0
): Promise<{ 
  rating: number; 
  keyword: string; 
  sector: string; 
  problem: string;
  allProblems: ProblemAnalysis[];
}> {
  
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
    
    const defaultResult = {
      rating: 3,
      keyword: 'Não identificado',
      sector: 'Não identificado',
      problem: '',
      allProblems: []
    };
    return defaultResult;
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

    // Processar nova estrutura com múltiplos problemas
    let allProblems: ProblemAnalysis[] = [];
    let keyword = 'Não identificado';
    let sector = 'Não identificado';
    let problem = '';
    
    if (result.problems && Array.isArray(result.problems)) {
      // Nova estrutura com array de problemas
      allProblems = result.problems.map((problem: any) => ({
        keyword: problem.keyword || 'Não identificado',
        sector: problem.sector || 'Não identificado',
        problem: problem.problem || ''
      }));
      
      // Concatenar múltiplos problemas com ponto e vírgula, removendo duplicatas
      if (allProblems.length > 0) {
        // Usar Set para remover duplicatas
        const uniqueKeywords = Array.from(new Set(allProblems.map(p => p.keyword)));
        const uniqueSectors = Array.from(new Set(allProblems.map(p => p.sector)));
        const uniqueProblems = Array.from(new Set(allProblems.map(p => p.problem).filter(p => p.trim() !== '')));
        
        keyword = uniqueKeywords.join(';');
        sector = uniqueSectors.join(';');
        problem = uniqueProblems.join(';');
      }
    } else if (result.response && typeof result.response === 'string') {
      // Compatibilidade com estrutura antiga (caso ainda seja usada)
      const parts = result.response.split(',').map((part: string) => part.trim());
      
      if (parts.length >= 3) {
        keyword = parts[0] || 'Não identificado';
        sector = parts[1] || 'Não identificado';
        problem = parts[2] || '';
        
        allProblems.push({ keyword, sector, problem });
      }
    }

    // Se não conseguiu processar nenhum problema, usar padrão
    if (allProblems.length === 0) {
      allProblems.push({
        keyword: 'Não identificado',
        sector: 'Não identificado',
        problem: ''
      });
      keyword = 'Não identificado';
      sector = 'Não identificado';
      problem = '';
    }

    const finalResult = {
      rating,
      keyword,
      sector,
      problem,
      allProblems
    };

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
        problem: '',
        allProblems: []
      };
    }
    
    if (retryCount < MAX_RETRIES && !error.message.includes('API Key') && !error.message.includes('Limite')) {
      const delayTime = BASE_DELAY * Math.pow(1.5, retryCount) + Math.random() * 1000;
      
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