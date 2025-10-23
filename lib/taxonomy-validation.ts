/**
 * Sistema de Validação Estrutural Departamento ↔ Keyword
 * 
 * Garante que keywords sempre estejam associadas ao departamento correto.
 * Usa mapeamento em memória para validação ultra-rápida (sem embeddings).
 */

/**
 * Mapeamento RÍGIDO: Keyword → Departamento obrigatório
 * 
 * Esta é a "fonte da verdade" - se uma keyword está aqui, ELA SÓ PODE
 * estar associada ao departamento especificado.
 * 
 * Baseado na taxonomia oficial do Firebase (44 keywords, 10 departamentos)
 * Última atualização: 04/10/2025
 */
import { KEYWORD_SEMANTIC_CONTEXT } from './semantic-enrichment';

const FULL_KEYWORD_DEPARTMENT_MAP: Record<string, string> = {
  // ========== A&B (Alimentos & Bebidas) ==========
  "A&B - Café da manhã": "A&B",
  "A&B - Jantar": "A&B",
  "A&B - Almoço": "A&B",
  "A&B - Serviço": "A&B",
  "A&B - Gastronomia": "A&B",
  "A&B - Room Service": "A&B",
  
  // ========== GOVERNANÇA (Limpeza/Arrumação) ==========
  "Limpeza - Banheiro": "Governança",
  "Limpeza - Quarto": "Governança",
  "Limpeza - Áreas sociais": "Governança",
  "Limpeza - Enxoval": "Governança",
  "Limpeza - Amenities": "Governança",
  "Limpeza - Frigobar": "Governança",
  
  // ========== MANUTENÇÃO ==========
  "Manutenção - Ar-condicionado": "Manutenção",
  "Manutenção - Banheiro": "Manutenção",
  "Manutenção - Instalações": "Manutenção",
  "Manutenção - Quarto": "Manutenção",
  "Manutenção - Elevador": "Manutenção",
  "Manutenção - Jardinagem": "Manutenção",
  
  // ========== RECEPÇÃO ==========
  "Recepção - Estacionamento": "Recepção",
  "Recepção - Check-in": "Recepção",
  "Recepção - Check-out": "Recepção",
  "Recepção - Serviço": "Recepção",
  
  // ========== TI (Tecnologia da Informação) ==========
  "TI - TV": "TI",
  "TI - Wi-fi": "TI",
  
  // ========== LAZER ==========
  "Lazer - Estrutura": "Lazer",
  "Lazer - Variedade": "Lazer",
  "Lazer - Serviço": "Lazer",
  "Lazer - Atividades de Lazer": "Lazer",
  "Lazer - Piscina": "Lazer",
  "Lazer - Spa": "Lazer",
  "Lazer - Academia": "Lazer",
  
  // ========== PRODUTO (Características do Hotel) ==========
  "Produto - Transfer": "Produto",
  "Produto - Acessibilidade": "Produto",
  "Produto - Custo-benefício": "Produto",
  "Produto - Localização": "Produto",
  "Produto - Vista": "Produto",
  "Produto - Experiência": "Produto",
  "Produto - Modernização": "Produto",
  "Produto - All Inclusive": "Produto",
  "Produto - Isolamento Acustico": "Produto",
  
  // ========== OPERAÇÕES ==========
  "Operações - Atendimento": "Operações",
  "Operações - Cartão de acesso": "Operações",
  "Operações - Acesso ao quarto": "Operações",
  "Operações - Consumo Extra": "Operações",
  
  // ========== CORPORATIVO ==========
  "Corporativo - Marketing": "Corporativo",
  "Corporativo - Reservas": "Corporativo",
  "Corporativo - Financeiro": "Corporativo",
  
  // ========== EG (Experiência do Hóspede) ==========
  "EG - Abordagem": "EG",
}; 

// Exporta apenas as keywords presentes no semantic-enrichment
export const KEYWORD_DEPARTMENT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FULL_KEYWORD_DEPARTMENT_MAP).filter(([label]) =>
    Object.prototype.hasOwnProperty.call(KEYWORD_SEMANTIC_CONTEXT, label)
  )
);

/**
 * Mapeamento reverso: Departamento → Keywords válidas
 * Gerado automaticamente a partir do KEYWORD_DEPARTMENT_MAP
 */
export const DEPARTMENT_KEYWORDS_MAP: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  
  for (const [keyword, department] of Object.entries(KEYWORD_DEPARTMENT_MAP)) {
    if (!map[department]) {
      map[department] = [];
    }
    map[department].push(keyword);
  }
  
  return map;
})();

/**
 * Detecta padrões de departamento no label da keyword
 * 
 * Útil para keywords novas que ainda não estão no mapeamento
 */
export function inferDepartmentFromKeyword(keywordLabel: string): string | null {
  const label = keywordLabel.toLowerCase();
  
  // Padrão: "Departamento - Aspecto"
  const match = keywordLabel.match(/^([^-]+)\s*-/);
  if (match) {
    const prefix = match[1].trim();
    
    // Normalizar departamentos comuns (12 departamentos do Firebase)
    const normalizedMap: Record<string, string> = {
      "a&b": "A&B",
      "limpeza": "Governança",
      "governança": "Governança",
      "governanca": "Governança",
      "tecnologia": "TI",
      "ti": "TI",
      "manutenção": "Manutenção",
      "manutencao": "Manutenção",
      "recepção": "Recepção",
      "recepcao": "Recepção",
      "lazer": "Lazer",
      "produto": "Produto",
      "operações": "Operações",
      "operacoes": "Operações",
      "comercial": "Comercial",
      "marketing": "Marketing",
      "qualidade": "Qualidade",
      "programa de vendas": "Programa de vendas",
      "check-in": "Recepção",
      "check-out": "Recepção"
    };
    
    const normalized = normalizedMap[prefix.toLowerCase()];
    if (normalized) {
      return normalized;
    }
  }
  
  // Padrões específicos por palavras-chave
  if (label.includes("garçom") || label.includes("gastronomia") || 
      label.includes("comida") || label.includes("café") || 
      label.includes("almoço") || label.includes("jantar") ||
      label.includes("restaurante") || label.includes("bar") ||
      label.includes("room service")) {
    return "A&B";
  }
  
  if (label.includes("limpo") || label.includes("sujo") || 
      label.includes("arrumação") || label.includes("enxoval") ||
      label.includes("toalha") || label.includes("lençol") ||
      label.includes("amenities") || label.includes("frigobar")) {
    return "Governança";
  }
  
  if (label.includes("wifi") || label.includes("wi-fi") || 
      label.includes("internet") || label.includes("tv") || 
      label.includes("televisão") || label.includes("tecnologia")) {
    return "TI";
  }
  
  if (label.includes("ar condicionado") || label.includes("ar-condicionado") ||
      label.includes("chuveiro") || label.includes("manutenção") || 
      label.includes("quebrado") || label.includes("elevador") ||
      label.includes("jardinagem")) {
    return "Manutenção";
  }
  
  if (label.includes("check-in") || label.includes("check-out") || 
      label.includes("recepção") || label.includes("recepcionista") ||
      label.includes("estacionamento")) {
    return "Recepção";
  }
  
  if (label.includes("piscina") || label.includes("academia") || 
      label.includes("spa") || label.includes("lazer") ||
      label.includes("atividades")) {
    return "Lazer";
  }
  
  if (label.includes("localização") || label.includes("experiência") || 
      label.includes("custo-benefício") || label.includes("vista") ||
      label.includes("transfer") || label.includes("acessibilidade") ||
      label.includes("all inclusive") || label.includes("modernização") ||
      label.includes("isolamento")) {
    return "Produto";
  }
  
  if (label.includes("atendimento") || label.includes("cartão") ||
      label.includes("acesso ao quarto") || label.includes("consumo extra")) {
    return "Operações";
  }
  
  if (label.includes("reserva") || label.includes("marketing") ||
      label.includes("financeiro")) {
    return "Corporativo";
  }
  
  if (label.includes("abordagem")) {
    return "EG";
  }
  
  return null;
}

/**
 * Valida se uma keyword está associada ao departamento correto
 * 
 * @returns { valid: boolean, correctDepartment?: string, error?: string }
 */
export function validateKeywordDepartment(
  keywordLabel: string,
  departmentId: string
): { valid: boolean; correctDepartment?: string; error?: string } {
  
  // 1. Verificar mapeamento rígido primeiro
  const mappedDepartment = KEYWORD_DEPARTMENT_MAP[keywordLabel];
  
  if (mappedDepartment) {
    if (mappedDepartment === departmentId) {
      return { valid: true };
    } else {
      return {
        valid: false,
        correctDepartment: mappedDepartment,
        error: `Keyword "${keywordLabel}" DEVE estar em "${mappedDepartment}", não em "${departmentId}"`
      };
    }
  }
  
  // 2. Se não está no mapeamento, inferir pelo padrão
  const inferredDepartment = inferDepartmentFromKeyword(keywordLabel);
  
  if (inferredDepartment) {
    if (inferredDepartment === departmentId) {
      return { valid: true };
    } else {
      return {
        valid: false,
        correctDepartment: inferredDepartment,
        error: `Keyword "${keywordLabel}" provavelmente deveria estar em "${inferredDepartment}", não em "${departmentId}" (baseado no padrão)`
      };
    }
  }
  
  // 3. Se não conseguiu determinar, aceitar mas marcar como incerto
  console.warn(`⚠️ Não foi possível validar: "${keywordLabel}" em "${departmentId}"`);
  return { valid: true }; // Aceitar mas logar
}

/**
 * Corrige automaticamente o departamento de uma keyword se estiver errado
 */
export function autoCorrectDepartment(
  keywordLabel: string,
  currentDepartmentId: string
): { corrected: boolean; newDepartmentId: string; reason?: string } {
  
  const validation = validateKeywordDepartment(keywordLabel, currentDepartmentId);
  
  if (!validation.valid && validation.correctDepartment) {
    return {
      corrected: true,
      newDepartmentId: validation.correctDepartment,
      reason: validation.error
    };
  }
  
  return {
    corrected: false,
    newDepartmentId: currentDepartmentId
  };
}

/**
 * Filtra candidatos de keywords para incluir APENAS os do departamento correto
 * 
 * Usa no processamento pós-GPT para garantir coerência
 */
export function filterKeywordsByDepartment(
  keywords: Array<{ id: string; label: string; department_id: string; similarity_score: number }>,
  requiredDepartment?: string
): Array<{ id: string; label: string; department_id: string; similarity_score: number }> {
  
  if (!requiredDepartment) {
    return keywords;
  }
  
  return keywords.filter(kw => {
    // Usar validação estrutural
    const mappedDepartment = KEYWORD_DEPARTMENT_MAP[kw.label];
    
    if (mappedDepartment) {
      return mappedDepartment === requiredDepartment;
    }
    
    // Fallback: usar department_id atual
    return kw.department_id === requiredDepartment;
  });
}

/**
 * Verifica se uma combinação departamento+keyword faz sentido
 */
export function isValidCombination(departmentId: string, keywordLabel: string): boolean {
  const validation = validateKeywordDepartment(keywordLabel, departmentId);
  return validation.valid;
}

/**
 * Retorna estatísticas do mapeamento
 */
export function getMappingStats() {
  const totalKeywords = Object.keys(KEYWORD_DEPARTMENT_MAP).length;
  const departments = Object.keys(DEPARTMENT_KEYWORDS_MAP);
  
  const stats: Record<string, number> = {};
  for (const dept of departments) {
    stats[dept] = DEPARTMENT_KEYWORDS_MAP[dept].length;
  }
  
  return {
    total_keywords: totalKeywords,
    total_departments: departments.length,
    keywords_per_department: stats
  };
}

/**
 * Adiciona nova keyword ao mapeamento dinamicamente (runtime)
 */
const runtimeMappings: Record<string, string> = {};

export function addRuntimeMapping(keywordLabel: string, departmentId: string) {
  runtimeMappings[keywordLabel] = departmentId;
  console.log(`✅ Mapeamento runtime adicionado: "${keywordLabel}" → "${departmentId}"`);
}

export function getRuntimeMappings(): Record<string, string> {
  return { ...runtimeMappings };
}
