import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 

// Função para formatar data no formato brasileiro (dd/mm/aaaa)
export function formatDateBR(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Data inválida';
  }
}

// Função para formatar data e hora no formato brasileiro (dd/mm/aaaa HH:mm)
export function formatDateTimeBR(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'Data inválida';
  }
} 

// Função para verificar se um problema é válido (não é "Não identificado" ou vazio)
export function isValidProblem(problem: string): boolean {
  if (!problem || typeof problem !== 'string') return false;
  
  const cleanProblem = problem.trim().toLowerCase();
  
  const invalidTerms = [
    'não identificado',
    'nao identificado', 
    'vazio',
    'sem problemas',
    'sem problema',
    'nenhum problema',
    'não analisado',
    'nao analisado',
    ''
  ];
  
  return !invalidTerms.some(term => 
    cleanProblem === term || cleanProblem.includes(term)
  );
}

// Função para verificar se um setor/keyword é válido
export function isValidSectorOrKeyword(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const cleanValue = value.trim().toLowerCase();
  
  const invalidTerms = [
    'não identificado',
    'nao identificado',
    'vazio',
    ''
  ];
  
  return !invalidTerms.some(term => 
    cleanValue === term || cleanValue.includes(term)
  );
}

// Função para filtrar feedbacks válidos (remove não identificados)
export function filterValidFeedbacks(feedbacks: any[]) {
  return feedbacks.filter(feedback => {
    const keyword = feedback.keyword?.toLowerCase() || '';
    const sector = feedback.sector?.toLowerCase() || '';
    const problem = feedback.problem?.toLowerCase() || '';
    
    // Verificar se não é "não identificado"
    const hasValidKeyword = isValidSectorOrKeyword(keyword);
    const hasValidSector = isValidSectorOrKeyword(sector);
    const hasValidProblem = problem ? isValidProblem(problem) : true; // Problema pode ser vazio
    
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