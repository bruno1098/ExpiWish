import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISODateLocal } from "./data-utils";
import { KEYWORD_SEMANTIC_CONTEXT } from "./semantic-enrichment";
import { KEYWORD_DEPARTMENT_MAP } from "./taxonomy-validation";

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

// Conjuntos derivados dinamicamente da taxonomia atual
const ALLOWED_DEPARTMENTS = new Set<string>(Object.values(KEYWORD_DEPARTMENT_MAP));
const ALLOWED_KEYWORDS = new Set<string>(Object.keys(KEYWORD_SEMANTIC_CONTEXT));

// Função para verificar se um problema é válido (não é "Não identificado" ou vazio inválido)
export function isValidProblem(problem: string): boolean {
  if (!problem || typeof problem !== 'string') return false;
  const cleanProblem = problem.trim();

  // "VAZIO" é um placeholder válido quando não há problema associado
  if (cleanProblem === 'VAZIO') return true;

  // Rejeitar termos inválidos/placeholder
  const invalidTerms = ['não identificado', 'nao identificado', 'não analisado', 'nao analisado'];
  const lowerProblem = cleanProblem.toLowerCase();
  if (invalidTerms.some(term => lowerProblem.includes(term))) return false;

  // Problema deve seguir o padrão "Departamento - Nome do problema" e departamento deve existir
  const match = cleanProblem.match(/^\s*([^\-]+?)\s*-\s*(.+?)\s*$/);
  if (!match) return false;
  const dept = match[1].trim();
  const core = match[2].trim();
  if (!dept || !core) return false;

  return ALLOWED_DEPARTMENTS.has(dept);
}

// Função para verificar se um setor/keyword é válido
export function isValidSectorOrKeyword(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const cleanValue = value.trim();

  // Válido se for keyword do contexto semântico ou um departamento conhecido
  if (ALLOWED_KEYWORDS.has(cleanValue) || ALLOWED_DEPARTMENTS.has(cleanValue)) {
    return true;
  }

  // Invalidar placeholders explícitos
  const invalidTerms = ['não identificado', 'nao identificado'];
  const lowerValue = cleanValue.toLowerCase();
  return !invalidTerms.some(term => lowerValue === term);
}

// Função para filtrar feedbacks válidos (remove não identificados)
export function filterValidFeedbacks(feedbacks: any[]) {
  return feedbacks.filter(feedback => {
    const keyword = feedback.keyword || '';
    const sector = feedback.sector || '';
    
    // Verificar termos explicitamente inválidos
    const invalidTerms = [
      'não identificado',
      'nao identificado',
      'VAZIO',
      ''
    ];
    
    const isKeywordInvalid = invalidTerms.some(term => 
      keyword.toLowerCase().trim() === term.toLowerCase()
    );
    
    const isSectorInvalid = invalidTerms.some(term => 
      sector.toLowerCase().trim() === term.toLowerCase()
    );
    
    // Aceitar feedbacks que tenham pelo menos keyword OU sector válidos
    // (excluir apenas quando AMBOS são inválidos)
    return !(isKeywordInvalid && isSectorInvalid);
  });
}

// Função para processar distribuição de setores removendo duplicatas e inválidos
export function processSectorDistribution(data: any[]) {
  const validFeedbacks = filterValidFeedbacks(data);
  const sectorCounts: Record<string, number> = {};
  
  validFeedbacks.forEach(feedback => {
    // Usar allProblems se disponível (dados separados), senão usar sector concatenado
    if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
      feedback.allProblems.forEach((problemObj: any) => {
        if (problemObj.sector && isValidSectorOrKeyword(problemObj.sector)) {
          const trimmedSector = problemObj.sector.trim();
          if (trimmedSector && trimmedSector !== 'VAZIO') {
            sectorCounts[trimmedSector] = (sectorCounts[trimmedSector] || 0) + 1;
          }
        }
      });
    } else if (feedback.sector) {
      // Fallback para dados antigos concatenados
      // Separar por ; e remover duplicatas
      const sectors = Array.from(new Set(feedback.sector.split(';').map((s: string) => s.trim()))) as string[];
      
      sectors.forEach((sector: string) => {
        if (isValidSectorOrKeyword(sector) && 
            sector !== 'VAZIO' && 
            !sector.startsWith('+')) { // Filtrar "+X outros" dos dados antigos
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
    // Usar allProblems se disponível (dados separados), senão usar keyword concatenado
    if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
      feedback.allProblems.forEach((problemObj: any) => {
        if (problemObj.keyword && isValidSectorOrKeyword(problemObj.keyword)) {
          const trimmedKeyword = problemObj.keyword.trim();
          if (trimmedKeyword && trimmedKeyword !== 'VAZIO') {
            keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1;
          }
        }
      });
    } else if (feedback.keyword) {
      // Fallback para dados antigos concatenados
      // Separar por ; e remover duplicatas
      const keywords = Array.from(new Set(feedback.keyword.split(';').map((k: string) => k.trim()))) as string[];
      
      keywords.forEach((keyword: string) => {
        if (isValidSectorOrKeyword(keyword) && 
            keyword !== 'VAZIO' && 
            !keyword.startsWith('+')) { // Filtrar "+X outros" dos dados antigos
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
    // Usar allProblems se disponível (dados separados), senão usar problem concatenado
    if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
      feedback.allProblems.forEach((problemObj: any) => {
        if (problemObj.problem && isValidProblem(problemObj.problem)) {
          const trimmedProblem = problemObj.problem.trim();
          if (trimmedProblem && 
              trimmedProblem.toLowerCase() !== 'vazio' && 
              !trimmedProblem.startsWith('+')) {
            problemCounts[trimmedProblem] = (problemCounts[trimmedProblem] || 0) + 1;
          }
        }
      });
    } else if (feedback.problem) {
      // Fallback para dados antigos concatenados
      // Separar por ; e remover duplicatas
      const problems = Array.from(new Set(feedback.problem.split(';').map((p: string) => p.trim()))) as string[];
      
      problems.forEach((problem: string) => {
        if (isValidProblem(problem) && 
            problem.toLowerCase() !== 'vazio' && 
            !problem.startsWith('+')) {
          problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        }
      });
    }
  });
  
  return Object.entries(problemCounts)
    .map(([problem, count]) => ({ label: problem, value: count }))
    .sort((a, b) => b.value - a.value);
}

// Funções utilitárias para extrair dados separados de feedbacks
// Sempre prioriza allProblems quando disponível, filtra "+X outros" dos dados antigos

export function getFeedbackKeywords(feedback: any): string[] {
  if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
    // Usar dados separados
    const keywords = feedback.allProblems
      .map((problemObj: any) => problemObj.keyword)
      .filter((keyword: string) => keyword && isValidSectorOrKeyword(keyword))
      .map((keyword: string) => keyword.trim());
    return Array.from(new Set(keywords));
  } else if (feedback.keyword) {
    // Fallback para dados concatenados, filtrando "+X outros"
    return Array.from(new Set(
      feedback.keyword.split(';')
        .map((k: string) => k.trim())
        .filter((k: string) => k && isValidSectorOrKeyword(k) && !k.startsWith('+'))
    ));
  }
  return [];
}

export function getFeedbackSectors(feedback: any): string[] {
  if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
    // Usar dados separados
    const sectors = feedback.allProblems
      .map((problemObj: any) => problemObj.sector)
      .filter((sector: string) => sector && isValidSectorOrKeyword(sector))
      .map((sector: string) => sector.trim());
    return Array.from(new Set(sectors));
  } else if (feedback.sector) {
    // Fallback para dados concatenados, filtrando "+X outros"
    return Array.from(new Set(
      feedback.sector.split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s && isValidSectorOrKeyword(s) && !s.startsWith('+'))
    ));
  }
  return [];
}

export function getFeedbackProblems(feedback: any): string[] {
  if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
    // Usar dados separados
    const problems = feedback.allProblems
      .map((problemObj: any) => problemObj.problem)
      .filter((problem: string) => problem && isValidProblem(problem))
      .map((problem: string) => problem.trim());
    return Array.from(new Set(problems));
  } else if (feedback.problem) {
    // Fallback para dados concatenados, filtrando "+X outros"
    return Array.from(new Set(
      feedback.problem.split(';')
        .map((p: string) => p.trim())
        .filter((p: string) => p && isValidProblem(p) && !p.startsWith('+'))
    ));
  }
  return [];
}

export function extractComplimentsFromFeedback(feedback: any): string[] {
  if (!feedback) return [];

  const normalizeCompliment = (text: string) =>
    text.replace(/^[-•\s]+/, '').trim();

  const complimentsSource =
    typeof feedback?.compliments === 'string' && feedback.compliments.trim().length > 0
      ? feedback.compliments
      : typeof feedback?.positive_details === 'string'
        ? feedback.positive_details
        : '';

  const complimentsList: string[] = complimentsSource
    ? complimentsSource
        .split(/[\n;|,]/)
        .map((item: string) => normalizeCompliment(item))
        .filter((item: string) => item && item.toLowerCase() !== 'vazio' && item.length > 1)
    : [];

  const uniqueCompliments: string[] = Array.from(new Set(complimentsList));
  if (uniqueCompliments.length > 0) {
    return uniqueCompliments;
  }

  const rating = typeof feedback?.rating === 'number' ? feedback.rating : 0;
  const sentiment = typeof feedback?.sentiment === 'string' ? feedback.sentiment.toLowerCase() : '';
  const problems = getFeedbackProblems(feedback).filter((problem: string) => problem.toLowerCase() !== 'vazio');

  if (problems.length === 0 && (rating >= 4 || sentiment === 'positive')) {
    return ['Elogio geral'];
  }

  return [];
}

export function hasCompliment(feedback: any): boolean {
  return extractComplimentsFromFeedback(feedback).length > 0;
}

export function buildComplimentPhraseDistribution(feedbacks: any[]) {
  const counts: Record<string, number> = {};

  feedbacks.forEach(feedback => {
    extractComplimentsFromFeedback(feedback).forEach((compliment: string) => {
      const sanitized = typeof compliment === 'string'
        ? compliment.replace(/\s+/g, ' ').trim()
        : '';
      const label = sanitized.length > 0 ? sanitized : 'Elogio sem descrição';
      counts[label] = (counts[label] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildComplimentSectorDistribution(feedbacks: any[]) {
  const counts: Record<string, number> = {};

  feedbacks.forEach(feedback => {
    if (!hasCompliment(feedback)) {
      return;
    }

    getFeedbackSectors(feedback).forEach((sector: string) => {
      if (sector && sector.toLowerCase() !== 'vazio') {
        counts[sector] = (counts[sector] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildComplimentKeywordDistribution(feedbacks: any[]) {
  const counts: Record<string, number> = {};

  feedbacks.forEach(feedback => {
    if (!hasCompliment(feedback)) {
      return;
    }

    getFeedbackKeywords(feedback).forEach((keyword: string) => {
      if (keyword && keyword.toLowerCase() !== 'vazio') {
        counts[keyword] = (counts[keyword] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// Função para obter o primeiro keyword válido (para compatibilidade)
export function getFeedbackPrimaryKeyword(feedback: any): string {
  const keywords = getFeedbackKeywords(feedback);
  return keywords.length > 0 ? keywords[0] : 'Não identificado';
}

// Função para obter o primeiro setor válido (para compatibilidade)
export function getFeedbackPrimarySector(feedback: any): string {
  const sectors = getFeedbackSectors(feedback);
  return sectors.length > 0 ? sectors[0] : 'Não identificado';
}

// Função para obter o primeiro problema válido (para compatibilidade)
export function getFeedbackPrimaryProblem(feedback: any): string {
  const problems = getFeedbackProblems(feedback);
  return problems.length > 0 ? problems[0] : '';
}