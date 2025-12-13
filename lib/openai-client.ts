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
        useFineTuned
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido na resposta' }));
      
      if (response.status === 429) {
        throw Object.assign(new Error('exceeded your current quota'), { error_type: 'rate_limit', retry_after_ms: errorData.retry_after_ms });
      }
      
      throw Object.assign(new Error(errorData.error || `Erro HTTP ${response.status}`), { error_type: errorData.error || `http_${response.status}`, retry_after_ms: errorData.retry_after_ms });
    }

    const result = await response.json().catch(() => {
      throw new Error('Resposta inválida da API');
    });

    // Propagar erros do servidor para o fluxo de retry
    if (result && result.error) {
      throw Object.assign(new Error(result.error), { error_type: result.error, retry_after_ms: result.retry_after_ms });
    }

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
      
      // Usar apenas o primeiro problema principal (mais relevante) ao invés de concatenar
      if (allProblems.length > 0) {
        // Pegar o primeiro problema válido como principal
        const firstProblem = allProblems[0];
        keyword = firstProblem.keyword;
        sector = firstProblem.sector;
        problem = firstProblem.problem;
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
    
    // Sem fallback: continuar tentando com backoff, usando dica do servidor quando disponível
    const retryAfter = typeof error.retry_after_ms === 'number'
      ? error.retry_after_ms
      : BASE_DELAY * Math.pow(1.5, retryCount) + Math.random() * 1000;
    
    if (retryCount < MAX_RETRIES && !error.message.includes('API Key')) {
      await delay(retryAfter);
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