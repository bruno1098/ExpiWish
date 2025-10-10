import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISODateLocal } from "./data-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateBR(dateInput: string | Date): string {
  try {
    let date: Date;
    
    // Se já é um Date object, usar diretamente
    if (dateInput instanceof Date) {
      date = dateInput;
    }
    // Se é string ISO, parsear manualmente
    else if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = parseISODateLocal(dateInput);
    }
    // Outros formatos de string
    else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    }
    else {
      return 'Data inválida';
    }
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Data inválida';
  }
}

export function formatDateTime(dateInput: string | Date): string {
  try {
    let date: Date;
    
    // Se já é um Date object, usar diretamente
    if (dateInput instanceof Date) {
      date = dateInput;
    }
    // Se é string ISO, parsear manualmente
    else if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = parseISODateLocal(dateInput);
    }
    // Outros formatos de string
    else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    }
    else {
      return 'Data inválida';
    }
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Data inválida';
  }
}

// Keywords oficiais válidas - SINCRONIZADO com a API
const VALID_KEYWORDS = [
  "A&B - Café da manhã", "A&B - Serviço", "A&B - Variedade", "A&B - Preço",
  "Limpeza - Quarto", "Limpeza - Banheiro", "Limpeza - Áreas sociais", "Enxoval",
  "Manutenção - Quarto", "Manutenção - Banheiro", "Manutenção - Instalações",
  "Ar-condicionado", "Elevador", "Frigobar", "Infraestrutura",
  "Lazer - Variedade", "Lazer - Estrutura", "Spa", "Piscina",
  "Tecnologia - Wi-fi", "Tecnologia - TV", "Comodidade", "Estacionamento",
  "Atendimento", "Acessibilidade", "Reserva de cadeiras (pool)", "Processo",
  "Custo-benefício", "Comunicação", "Check-in - Atendimento", "Check-out - Atendimento",
  "Concierge", "Cotas", "Reservas", "Água", "Recreação",
  "Travesseiro", "Colchão", "Espelho"
];

// Departamentos oficiais válidos - SINCRONIZADO com a API
const VALID_DEPARTMENTS = [
  "A&B", "Governança", "Manutenção", "Manutenção - Quarto", "Manutenção - Instalações",
  "Lazer", "TI", "Produto", "Operações", "Qualidade", "Recepção", 
  "Programa de vendas", "Comercial"
];

// Problemas padronizados válidos
const VALID_PROBLEMS = [
  "Demora no Atendimento", "Espaço Insuficiente", "Qualidade da Comida",
  "Não Funciona", "Muito Frio/Quente", "Conexão Instável", "Falta de Limpeza",
  "Ruído Excessivo", "Capacidade Insuficiente", "Falta de Cadeiras", 
  "Preço Alto", "Falta de Variedade", "Qualidade Baixa", "Falta de Manutenção",
  "Demora no Check-in", "Demora no Check-out", "Falta de Acessibilidade",
  "Comunicação Ruim", "Processo Lento", "Falta de Equipamento", "Fila Longa",
  "Qualidade de Bebida", "Falta de Disponibilidade", "VAZIO"
];

// Função para verificar se um problema é válido (não é "Não identificado" ou vazio inválido)
export function isValidProblem(problem: string): boolean {
  if (!problem || typeof problem !== 'string') return false;
  
  const cleanProblem = problem.trim();
  
  // Se está na lista de problemas válidos, é válido
  if (VALID_PROBLEMS.includes(cleanProblem)) return true;
  
  // Verificar termos inválidos
  const invalidTerms = [
    'não identificado',
    'nao identificado',
    'não analisado',
    'nao analisado'
  ];
  
  const lowerProblem = cleanProblem.toLowerCase();
  return !invalidTerms.some(term => lowerProblem.includes(term));
}

// Função para verificar se um setor/keyword é válido
export function isValidSectorOrKeyword(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const cleanValue = value.trim();
  
  // Se está nas listas oficiais, é válido
  if (VALID_KEYWORDS.includes(cleanValue) || VALID_DEPARTMENTS.includes(cleanValue)) {
    return true;
  }
  
  // Verificar termos explicitamente inválidos
  const invalidTerms = [
    'não identificado',
    'nao identificado'
  ];
  
  const lowerValue = cleanValue.toLowerCase();
  return !invalidTerms.some(term => lowerValue === term);
}

// Função para filtrar feedbacks válidos (remove não identificados)
export function filterValidFeedbacks(feedbacks: any[]) {
  return feedbacks.filter(feedback => {
    const keyword = feedback.keyword || '';
    const sector = feedback.sector || '';
    
    // Verificar se não é "não identificado" explicitamente
    const hasValidKeyword = isValidSectorOrKeyword(keyword);
    const hasValidSector = isValidSectorOrKeyword(sector);
    
    // Pelo menos keyword e sector devem ser válidos
    return hasValidKeyword && hasValidSector;
  });
}

// Função para processar distribuição de setores removendo duplicatas e inválidos
export function processSectorDistribution(data: any[]) {
  const validFeedbacks = filterValidFeedbacks(data);
  const sectorCounts: Record<string, number> = {};
  
  validFeedbacks.forEach(feedback => {
    if (feedback.sector) {
      // Separar por ; e remover duplicatas
      const sectors = Array.from(new Set(feedback.sector.split(';').map((s: string) => s.trim()))) as string[];
      
      sectors.forEach((sector: string) => {
        if (isValidSectorOrKeyword(sector)) {
          sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        }
      });
    }
  });
  
  return Object.entries(sectorCounts)
    .map(([sector, count]) => ({ label: sector, value: count }))
    .sort((a, b) => b.value - a.value);
}

// Função para processar distribuição de keywords removendo duplicatas e inválidos
export function processKeywordDistribution(data: any[]) {
  const validFeedbacks = filterValidFeedbacks(data);
  const keywordCounts: Record<string, number> = {};
  
  validFeedbacks.forEach(feedback => {
    if (feedback.keyword) {
      // Separar por ; e remover duplicatas
      const keywords = Array.from(new Set(feedback.keyword.split(';').map((k: string) => k.trim()))) as string[];
      
      keywords.forEach((keyword: string) => {
        if (isValidSectorOrKeyword(keyword)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
    }
  });
  
  return Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ label: keyword, value: count }))
    .sort((a, b) => b.value - a.value);
}

// Função para processar distribuição de problemas removendo duplicatas e inválidos
export function processProblemDistribution(data: any[]) {
  const validFeedbacks = filterValidFeedbacks(data);
  const problemCounts: Record<string, number> = {};
  
  validFeedbacks.forEach(feedback => {
    if (feedback.problem) {
      // Separar por ; e remover duplicatas
      const problems = Array.from(new Set(feedback.problem.split(';').map((p: string) => p.trim()))) as string[];
      
      problems.forEach((problem: string) => {
        if (isValidProblem(problem)) {
          problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        }
      });
    }
  });
  
  return Object.entries(problemCounts)
    .map(([problem, count]) => ({ label: problem, value: count }))
    .sort((a, b) => b.value - a.value);
} 