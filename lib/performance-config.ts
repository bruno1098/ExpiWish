const isProduction = process.env.NODE_ENV === 'production';

// Configurações base de Performance do Sistema de Análise
const BASE_PERFORMANCE_CONFIG = {
  // 🎯 NOVA ABORDAGEM: Análise Direta sem Embeddings
  // Quando true, GPT recebe TODAS as keywords e decide diretamente
  // Quando false, usa embeddings para pre-filtrar candidatos
  USE_DIRECT_ANALYSIS: true,          // ✅ ATIVADO: Mais preciso, funciona com qualquer linguagem
  
  // Configurações de Chunk/Batch - OTIMIZADO PARA GPT-4o-mini
  CHUNK_SIZE: 100,                    // Tamanho do chunk para processamento
  CONCURRENT_REQUESTS: 4,             // 🔥 AUMENTADO: Mini aguenta bem (era 2)
  REQUEST_DELAY: 100,                 // 🔥 REDUZIDO: Mini é mais rápido (era 500ms)
  
  // Configurações de Delay
  DELAY_BETWEEN_BATCHES: 300,         // 🔥 REDUZIDO: Mini tem 10k RPM (era 1000ms)
  DELAY_BETWEEN_CHUNKS: 300,          // 🔥 REDUZIDO: Mini é rápido (era 1000ms)
  RETRY_BASE_DELAY: 1000,             // Delay base para retry
  
  // Configurações de Retry
  MAX_RETRIES: 3,                     // Número máximo de tentativas
  RETRY_BACKOFF_MULTIPLIER: 2,        // Multiplicador do backoff exponencial
  
  // Configurações de Rate Limiting
  RATE_LIMIT_WINDOW: 60 * 1000,       // Janela de rate limit (1 minuto)
  MAX_REQUESTS_PER_MINUTE: 500,       // 🔥 AUMENTADO: Mini tem 10k RPM (era 60)
  
  // Configurações de Cache
  CACHE_EXPIRY: 30 * 60 * 1000,       // Expiração do cache (30 minutos)
  CACHE_MAX_SIZE: 1000,               // Tamanho máximo do cache
  
  // Configurações de Timeout
  REQUEST_TIMEOUT: 30000,             // Timeout de requisição (30 segundos)
  ANALYSIS_TIMEOUT: 120000,           // Timeout de análise total (2 minutos)
};

function applyEnvironmentOverrides(config: typeof BASE_PERFORMANCE_CONFIG) {
  if (!isProduction) {
    return config;
  }

  // Em produção precisamos ser conservadores para não estourar quotas
  return {
    ...config,
    USE_DIRECT_ANALYSIS: false,
    CONCURRENT_REQUESTS: 2,
    REQUEST_DELAY: 400,
    DELAY_BETWEEN_BATCHES: 800,
    DELAY_BETWEEN_CHUNKS: 800,
    MAX_REQUESTS_PER_MINUTE: 180,
  };
}

export const PERFORMANCE_CONFIG = applyEnvironmentOverrides(BASE_PERFORMANCE_CONFIG);

// Configurações para diferentes tipos de carga
export const PERFORMANCE_PROFILES = {
  // Perfil para cargas pequenas (< 100 itens) - OTIMIZADO PARA MINI
  LIGHT: {
    ...PERFORMANCE_CONFIG,
    CHUNK_SIZE: 50,
    CONCURRENT_REQUESTS: 4,           // 🔥 AUMENTADO: mini aguenta (era 2)
    DELAY_BETWEEN_BATCHES: 250,       // 🔥 REDUZIDO: mini é rápido (era 1000ms)
    REQUEST_DELAY: 100,               // 🔥 REDUZIDO
  },
  
  // Perfil para cargas médias (100-500 itens) - OTIMIZADO PARA MINI
  MEDIUM: {
    ...PERFORMANCE_CONFIG,
    CHUNK_SIZE: 100,
    CONCURRENT_REQUESTS: 5,           // 🔥 AUMENTADO: mini aguenta bem (era 2)
    DELAY_BETWEEN_BATCHES: 300,       // 🔥 REDUZIDO: mini tem 10k RPM (era 1500ms)
    REQUEST_DELAY: 150,               // 🔥 REDUZIDO
  },
  
  // Perfil para cargas grandes (> 500 itens) - OTIMIZADO PARA MINI
  HEAVY: {
    ...PERFORMANCE_CONFIG,
    CHUNK_SIZE: 150,
    CONCURRENT_REQUESTS: 6,           // 🔥 AUMENTADO: mini aguenta muito (era 3)
    DELAY_BETWEEN_BATCHES: 400,       // 🔥 REDUZIDO: mini é robusto (era 2000ms)
    REQUEST_DELAY: 200,               // 🔥 REDUZIDO: era 1000ms
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