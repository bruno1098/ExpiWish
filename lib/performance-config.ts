// Configurações de Performance do Sistema de Análise
export const PERFORMANCE_CONFIG = {
  // Configurações de Chunk/Batch
  CHUNK_SIZE: 100,                    // Tamanho do chunk para processamento
  CONCURRENT_REQUESTS: 5,             // Número máximo de requisições simultâneas
  REQUEST_DELAY: 50,                  // Delay entre requisições (ms)
  
  // Configurações de Delay
  DELAY_BETWEEN_BATCHES: 200,         // Delay entre lotes (ms)
  DELAY_BETWEEN_CHUNKS: 200,          // Delay entre chunks (ms)
  RETRY_BASE_DELAY: 1000,             // Delay base para retry (ms)
  
  // Configurações de Retry
  MAX_RETRIES: 3,                     // Número máximo de tentativas
  RETRY_BACKOFF_MULTIPLIER: 2,        // Multiplicador do backoff exponencial
  
  // Configurações de Rate Limiting
  RATE_LIMIT_WINDOW: 60 * 1000,       // Janela de rate limit (1 minuto)
  MAX_REQUESTS_PER_MINUTE: 180,       // Máximo de requests por minuto
  
  // Configurações de Cache
  CACHE_EXPIRY: 30 * 60 * 1000,       // Expiração do cache (30 minutos)
  CACHE_MAX_SIZE: 1000,               // Tamanho máximo do cache
  
  // Configurações de Timeout
  REQUEST_TIMEOUT: 30000,             // Timeout de requisição (30 segundos)
  ANALYSIS_TIMEOUT: 120000,           // Timeout de análise total (2 minutos)
};

// Configurações para diferentes tipos de carga
export const PERFORMANCE_PROFILES = {
  // Perfil para cargas pequenas (< 100 itens)
  LIGHT: {
    ...PERFORMANCE_CONFIG,
    CHUNK_SIZE: 50,
    CONCURRENT_REQUESTS: 3,
    DELAY_BETWEEN_BATCHES: 100,
  },
  
  // Perfil para cargas médias (100-500 itens)
  MEDIUM: {
    ...PERFORMANCE_CONFIG,
    CHUNK_SIZE: 100,
    CONCURRENT_REQUESTS: 5,
    DELAY_BETWEEN_BATCHES: 200,
  },
  
  // Perfil para cargas grandes (> 500 itens)
  HEAVY: {
    ...PERFORMANCE_CONFIG,
    CHUNK_SIZE: 150,
    CONCURRENT_REQUESTS: 8,
    DELAY_BETWEEN_BATCHES: 300,
    REQUEST_DELAY: 100,
  },
};

// Função para selecionar perfil baseado no tamanho dos dados
export function getPerformanceProfile(dataSize: number) {
  if (dataSize < 100) {
    return PERFORMANCE_PROFILES.LIGHT;
  } else if (dataSize < 500) {
    return PERFORMANCE_PROFILES.MEDIUM;
  } else {
    return PERFORMANCE_PROFILES.HEAVY;
  }
}

// Função para calcular estimativa de tempo
export function estimateProcessingTime(dataSize: number): number {
  const profile = getPerformanceProfile(dataSize);
  const chunksCount = Math.ceil(dataSize / profile.CHUNK_SIZE);
  const requestsPerChunk = Math.ceil(profile.CHUNK_SIZE / profile.CONCURRENT_REQUESTS);
  
  // Tempo estimado por requisição (incluindo processamento da IA)
  const avgRequestTime = 2000; // 2 segundos por requisição
  
  // Tempo total estimado
  const totalTime = chunksCount * (
    requestsPerChunk * (avgRequestTime / profile.CONCURRENT_REQUESTS) + 
    profile.DELAY_BETWEEN_BATCHES
  );
  
  return Math.ceil(totalTime / 1000); // Retorna em segundos
}

// Função para formatar tempo estimado
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `~${seconds} segundos`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minuto${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `~${hours} hora${hours > 1 ? 's' : ''}`;
  }
} 