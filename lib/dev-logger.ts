"use client";
// Detectar ambiente
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Logger para desenvolvimento (funciona normal)
export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

// Logger para erros (sempre funciona)
export const devError = (...args: any[]) => {
  console.error(...args);
};

// Logger para warnings (sempre funciona)
export const devWarn = (...args: any[]) => {
  console.warn(...args);
};

// Logger para informações importantes (sempre funciona)
export const devInfo = (...args: any[]) => {
  if (isDevelopment) {
    console.info(...args);
  }
};

// Logger para debug detalhado (só desenvolvimento)
export const devDebug = (...args: any[]) => {
  if (isDevelopment) {
    console.debug('🐛', ...args);
  }
};

// Logger para performance (só desenvolvimento)
export const devPerf = (label: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(`⚡ ${label}:`, ...args);
  }
};

// Logger para dados (só desenvolvimento)
export const devData = (label: string, data: any) => {
  if (isDevelopment) {
    console.log(`📊 ${label}:`, data);
  }
};

// Logger para autenticação (importante - sempre funciona em dev)
export const devAuth = (...args: any[]) => {
  if (isDevelopment) {
    console.log('🔐', ...args);
  }
};

// Logger para análise (só desenvolvimento)
export const devAnalysis = (...args: any[]) => {
  if (isDevelopment) {
    console.log('🤖', ...args);
  }
};

// Logger para importação (só desenvolvimento)
export const devImport = (...args: any[]) => {
  if (isDevelopment) {
    console.log('📥', ...args);
  }
};

// Logger para filtros (só desenvolvimento)
export const devFilter = (...args: any[]) => {
  if (isDevelopment) {
    console.log('🔍', ...args);
  }
};

// Função para logs condicionais mais complexos
export const conditionalLog = (condition: boolean, ...args: any[]) => {
  if (isDevelopment && condition) {
    console.log(...args);
  }
};

// Status do sistema de logging
export const getLoggerStatus = () => ({
  isDevelopment,
  isProduction,
  logsEnabled: isDevelopment,
  environment: process.env.NODE_ENV || 'unknown'
});

// Substituir console.log padrão por versão inteligente (só em desenvolvimento)
if (typeof window !== 'undefined' && isDevelopment) {
  // No browser, em desenvolvimento
  (window as any).devLog = devLog;
  (window as any).loggerStatus = getLoggerStatus();
}

// Logs especiais que nunca são removidos (críticos)
export const criticalLog = (...args: any[]) => {
  console.log('🚨 CRITICAL:', ...args);
};

export const errorLog = (...args: any[]) => {
  console.error('❌ ERROR:', ...args);
};

export const successLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log('✅ SUCCESS:', ...args);
  }
}; 