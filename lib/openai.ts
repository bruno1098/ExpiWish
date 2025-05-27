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
  
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API Key não configurada. Configure nas Configurações.');
  }

  if (!texto || texto.trim() === '') {
    return {
      rating: 3,
      keyword: 'Não identificado',
      sector: 'Não identificado',
      problem: 'Não identificado'
    };
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

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
        throw new Error('Limite de API atingido. Verifique suas configurações de faturamento.');
      }
      
      throw new Error(errorData.error || 'Erro na análise');
    }

    const result = await response.json();
    return result;

  } catch (error: any) {
    if (retryCount < MAX_RETRIES && !error.message.includes('API Key') && !error.message.includes('Limite')) {
      const delay = BASE_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return analyzeWithGPT(texto, useFineTuned, retryCount + 1);
    }
    
    throw error;
  }
}

// Adicionar a propriedade cache à função
analyzeWithGPT.cache = new Map();