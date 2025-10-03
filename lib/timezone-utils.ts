/**
 * Utilitários de Timezone para Horário de Brasília (America/Sao_Paulo)
 */

/**
 * Retorna timestamp atual no horário de Brasília (UTC-3)
 * Formato ISO 8601: "2025-10-03T11:41:39.832-03:00"
 */
export function getBrasiliaTimestamp(): string {
  return new Date().toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, (_, m, d, y, h, min, s) => {
    return `${y}-${m}-${d}T${h}:${min}:${s}-03:00`;
  });
}

/**
 * Converte um Date object para horário de Brasília (UTC-3)
 * Formato ISO 8601: "2025-10-03T11:41:39.832-03:00"
 */
export function toBrasiliaTimestamp(date: Date = new Date()): string {
  const brasiliaTime = date.toLocaleString('sv-SE', { 
    timeZone: 'America/Sao_Paulo'
  });
  
  // Adicionar milissegundos e timezone
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${brasiliaTime}.${ms}-03:00`;
}

/**
 * Retorna timestamp atual formatado para exibição
 * Formato: "03/10/2025 11:41:39"
 */
export function getBrasiliaTimestampFormatted(): string {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Converte ISO timestamp UTC para horário de Brasília
 */
export function utcToBrasilia(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return toBrasiliaTimestamp(date);
}
