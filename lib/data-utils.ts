/**
 * Utilitários para manipulação de datas respeitando o fuso horário de Brasília (UTC-3)
 */

/**
 * Converte string ISO YYYY-MM-DD para Date object no fuso local
 * 
 * ⚠️ PROBLEMA CRÍTICO: new Date("YYYY-MM-DD") interpreta como UTC meia-noite
 *    Em Brasília (UTC-3), isso causa -1 dia: "2025-09-23" vira "2025-09-22 21:00"
 * 
 * ✅ SOLUÇÃO: Parse manual criando Date no fuso local
 * 
 * @param isoString String no formato YYYY-MM-DD
 * @returns Date object no fuso local
 */
export function parseISODateLocal(isoString: string): Date {
  if (!isoString || !isoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error(`Formato inválido. Esperado YYYY-MM-DD, recebido: ${isoString}`);
  }
  
  const [year, month, day] = isoString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Converte um objeto Date para string no formato YYYY-MM-DD sem perder o fuso local
 * 
 * ❌ PROBLEMA: date.toISOString() converte para UTC, mudando a data
 *    Exemplo: 27/09/2025 00:00 BRT → 2025-09-27T03:00:00.000Z (dia 27 vira 26!)
 * 
 * ✅ SOLUÇÃO: Usar getFullYear/Month/Date que mantém o fuso local
 *    Exemplo: 27/09/2025 00:00 BRT → 2025-09-27
 * 
 * @param date Objeto Date para converter
 * @returns String no formato YYYY-MM-DD
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtém a data/hora atual no horário local do sistema
 * 
 * ⚠️ IMPORTANTE: O sistema já roda no fuso local (Brasília).
 *    Não é necessário ajustar manualmente, pois new Date() já retorna hora local.
 *    A conversão manual causava duplicação do ajuste de fuso horário.
 * 
 * @returns Date object no fuso horário local (Brasília)
 */
export function getNowBrasilia(): Date {
  // Retorna data/hora local do sistema (já está em BRT)
  return new Date();
}

/**
 * Converte uma data do Excel (serial number) para string YYYY-MM-DD
 * Excel usa serial dates: 1 = 1/1/1900
 * 
 * ❌ PROBLEMA: new Date() com timestamp cria em UTC, causando diferença de fuso
 *    Exemplo: Serial 45569 (25/09/2025) em UTC vira 24/09 às 21h no BRT
 * 
 * ✅ SOLUÇÃO: Criar a data já no fuso local usando Date.UTC() com offset do Brasil
 * 
 * @param excelSerial Número serial do Excel
 * @returns String no formato YYYY-MM-DD
 */
export function excelSerialToDate(excelSerial: number): string {
  if (excelSerial <= 0 || excelSerial >= 2958466) {
    throw new Error(`Serial do Excel fora do range válido: ${excelSerial}`);
  }
  
  // Excel usa 1900-01-01 como serial 1
  // Bug do Excel: considera 1900 bissexto (não é!)
  // Serial 60 = 29/02/1900 (dia que não existe)
  
  // Data base: 1899-12-30 (serial 0 no Excel) em UTC
  const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30, 0, 0, 0, 0);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  
  // Ajustar pelo bug do Excel (para datas >= 60, subtrair 1)
  let adjustedSerial = excelSerial;
  if (excelSerial > 59) {
    adjustedSerial = excelSerial - 1;
  }
  
  // Calcular timestamp UTC
  const targetUTC = EXCEL_EPOCH_UTC + (adjustedSerial * MS_PER_DAY);
  const dateUTC = new Date(targetUTC);
  
  // ✅ CRÍTICO: Extrair componentes UTC e criar data local
  // Isso evita problemas de conversão de fuso horário
  const year = dateUTC.getUTCFullYear();
  const month = dateUTC.getUTCMonth();
  const day = dateUTC.getUTCDate();
  
  // Criar nova data no fuso local com os mesmos valores
  const localDate = new Date(year, month, day);
  
  return toLocalDateString(localDate);
}

/**
 * Converte data brasileira DD/MM/YYYY para YYYY-MM-DD
 * 
 * @param brazilianDate String no formato DD/MM/YYYY ou DD/MM/YY
 * @returns String no formato YYYY-MM-DD
 */
export function brazilianDateToISO(brazilianDate: string): string {
  const parts = brazilianDate.trim().split('/');
  
  if (parts.length !== 3) {
    throw new Error(`Formato inválido: ${brazilianDate}. Esperado: DD/MM/YYYY`);
  }
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  let year = parts[2];
  
  // Ajustar ano de 2 dígitos (ex: 25 → 2025)
  if (year.length === 2) {
    const currentYear = new Date().getFullYear();
    const century = Math.floor(currentYear / 100) * 100;
    year = (parseInt(year) + century).toString();
  }
  
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data para exibição no formato brasileiro com hora
 * 
 * ✅ CORREÇÃO: Parse manual para strings ISO YYYY-MM-DD
 * 
 * @param date Date object ou string ISO
 * @returns String no formato DD/MM/YYYY HH:mm
 */
export function formatBrazilianDateTime(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // ✅ Usar função centralizada para parse de ISO
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dateObj = parseISODateLocal(date);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  return dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

/**
 * Formata uma data para exibição no formato brasileiro sem hora
 * 
 * ✅ CORREÇÃO: Parse manual para strings ISO YYYY-MM-DD
 * 
 * @param date Date object ou string ISO
 * @returns String no formato DD/MM/YYYY
 */
export function formatBrazilianDate(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // ✅ Usar função centralizada para parse de ISO
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dateObj = parseISODateLocal(date);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
}
