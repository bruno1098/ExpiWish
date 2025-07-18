// Logger simples para desenvolvimento vs produção
// Em produção, todos os logs são removidos automaticamente pelo script de build

const isDevelopment = process.env.NODE_ENV === 'development';

// Logger básico - só funciona em desenvolvimento
export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de erro - sempre funciona (importante para produção)
export const devError = (...args: any[]) => {
  console.error(...args);
};

// Logger de warning - sempre funciona
export const devWarn = (...args: any[]) => {
  console.warn(...args);
};

// Logger de info - só desenvolvimento
export const devInfo = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de debug - só desenvolvimento
export const devDebug = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de performance - só desenvolvimento
export const devPerf = (label: string, ...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de dados - só desenvolvimento
export const devData = (label: string, data: any) => {
  if (isDevelopment) {
    
  }
};

// Logger de autenticação - só desenvolvimento
export const devAuth = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de análise - só desenvolvimento
export const devAnalysis = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de importação - só desenvolvimento
export const devImport = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Logger de filtros - só desenvolvimento
export const devFilter = (...args: any[]) => {
  if (isDevelopment) {
    
  }
};

// Status do logger
export const getLoggerStatus = () => ({
  isDevelopment,
  isProduction: !isDevelopment,
  logsEnabled: isDevelopment
}); 