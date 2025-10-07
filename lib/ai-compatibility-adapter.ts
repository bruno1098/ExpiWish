/**
 * AI Compatibility Adapter
 * 
 * Converte a nova estrutura de IA (múltiplas issues) para o formato esperado
 * pelos componentes existentes, mantendo compatibilidade total.
 */

import type { Feedback } from '@/types';

// Nova estrutura retornada pela API de IA
export interface NewAIResponse {
  sentiment: number;
  has_suggestion: boolean;
  suggestion_type?: string;
  suggestion_summary?: string;
  reasoning?: string; // Chain of Thought: explicação das decisões da IA
  issues: Array<{
    department_id: string;
    keyword_id: string;
    problem_id: string;
    department_label: string;
    keyword_label: string;
    problem_label: string;
    detail: string;
    confidence: number;
    matched_by: 'embedding' | 'proposed' | 'exact';
  }>;
  taxonomy_version: number;
  confidence: number;
  needs_review: boolean;
  processing_time_ms: number;
  used_candidates?: {
    keywords: string[];
    problems: string[];
  };
}

// Estrutura legada esperada pelos componentes existentes
export interface LegacyFeedback {
  // Campos obrigatórios existentes
  keyword: string;
  sector: string;
  problem: string;
  
  // CRÍTICO: Campo 'rating' para estrelas (baseado em sentiment 1-5)
  rating?: number;
  
  // Novos campos opcionais (compatibilidade)
  has_suggestion?: boolean;
  suggestion_type?: string;
  suggestion_summary?: string;
  confidence?: number;
  needs_review?: boolean;
  
  // NOVO: Campo separado para elogios/detalhes positivos
  compliments?: string;
  positive_details?: string;
  
  // Chain of Thought: raciocínio da IA
  reasoning?: string;
  
  // Estrutura detalhada para futuras melhorias
  allProblems?: Array<{
    keyword: string;
    sector: string;
    problem: string;
    problem_detail: string;
    confidence: number;
    matched_by: string;
  }>;
  
  // Metadados da nova IA
  taxonomy_version?: number;
  processing_time_ms?: number;
}

/**
 * Converte resposta da nova IA para formato compatível com componentes existentes
 */
export function adaptNewAIToLegacyFormat(newResponse: NewAIResponse): LegacyFeedback {
  // Se não há issues, retornar estrutura básica
  if (!newResponse.issues || newResponse.issues.length === 0) {
    return {
      keyword: 'Não identificado',
      sector: 'Não identificado', 
      problem: '',
      rating: newResponse.sentiment || 3, // Usar sentiment ou default neutro
      has_suggestion: newResponse.has_suggestion || false,
      suggestion_type: newResponse.suggestion_type,
      suggestion_summary: newResponse.suggestion_summary,
      confidence: newResponse.confidence || 0.5,
      needs_review: true,
      taxonomy_version: newResponse.taxonomy_version,
      processing_time_ms: newResponse.processing_time_ms
    };
  }

  // Consolidar múltiplas issues em campos únicos
  const consolidatedKeywords: string[] = [];
  const consolidatedSectors: string[] = [];
  const consolidatedProblems: string[] = [];
  const consolidatedCompliments: string[] = []; // NOVO: Array para elogios
  const allProblemsDetailed: Array<{
    keyword: string;
    sector: string;
    problem: string;
    problem_detail: string;
    confidence: number;
    matched_by: string;
  }> = [];

  for (const issue of newResponse.issues) {
    // 🎯 CORREÇÃO CRÍTICA: Verificar se é elogio baseado em SENTIMENT (1-5) E problem_id
    // Sentiment 4-5 = POSITIVO → elogio
    // Sentiment 1-2 = NEGATIVO → problema
    // Sentiment 3 = NEUTRO → analisar problem_id
    
    const isProblemEmpty = issue.problem_id === 'EMPTY' || 
                          issue.problem_id === 'VAZIO' || 
                          issue.problem_label === 'VAZIO' || 
                          issue.problem_label === 'EMPTY';
    
    // ✅ NOVO: Classificar baseado em SENTIMENT PRIMEIRO, depois em problem_id
    const isCompliment = (newResponse.sentiment >= 4 && isProblemEmpty) || // Positivo + sem problema = ELOGIO
                        (newResponse.sentiment === 3 && isProblemEmpty && issue.department_id === 'EMPTY'); // Neutro sem nada = elogio genérico
    
    const isProblem = (newResponse.sentiment <= 2) || // Negativo = SEMPRE problema
                     (!isProblemEmpty); // Tem problem_id válido = problema
    
    if (isCompliment && !isProblem) {
      // ✅ É um ELOGIO VERDADEIRO - adicionar aos elogios
      if (issue.detail && issue.detail.trim() !== '') {
        consolidatedCompliments.push(issue.detail.trim());
      }
      
      // Para elogios, ainda adicionar keyword e setor para contexto
      if (issue.keyword_label && 
          issue.keyword_label !== 'EMPTY' && 
          issue.keyword_label !== 'Elogio' &&
          issue.keyword_label.trim() !== '' &&
          issue.keyword_label !== 'Não identificado') {
        consolidatedKeywords.push(issue.keyword_label.trim());
      }
      
      if (issue.department_label && 
          issue.department_label.trim() !== '' &&
          issue.department_label !== 'Não identificado') {
        consolidatedSectors.push(issue.department_label.trim());
      }
      
      // IMPORTANTE: Para elogios, adicionar a allProblemsDetailed mas SEM problem_detail
      // para que não apareça em gráficos de problemas
      allProblemsDetailed.push({
        keyword: issue.keyword_label || 'Não identificado',
        sector: issue.department_label || 'Não identificado',
        problem: '', // Vazio para elogios
        problem_detail: '', // Vazio para elogios - elogio vai em compliments
        confidence: Math.max(0, Math.min(1, issue.confidence || 0.5)),
        matched_by: issue.matched_by || 'proposed'
      });
    } else {
      // ✅ É um PROBLEMA ou CRÍTICA - processar normalmente
      if (issue.keyword_label && 
          issue.keyword_label !== 'EMPTY' && 
          issue.keyword_label !== 'Elogio' &&
          issue.keyword_label.trim() !== '' &&
          issue.keyword_label !== 'Não identificado') {
        consolidatedKeywords.push(issue.keyword_label.trim());
      }
      
      if (issue.department_label && 
          issue.department_label.trim() !== '' &&
          issue.department_label !== 'Não identificado') {
        consolidatedSectors.push(issue.department_label.trim());
      }
      
      // Adicionar problema se não vazio
      if (issue.problem_label && 
          issue.problem_label !== 'VAZIO' && 
          issue.problem_label !== 'EMPTY' &&
          issue.problem_label.trim() !== '' &&
          issue.problem_label !== 'Não identificado') {
        consolidatedProblems.push(issue.problem_label.trim());
      }
      
      // IMPORTANTE: Para problemas, adicionar com problem_detail completo
      allProblemsDetailed.push({
        keyword: issue.keyword_label || 'Não identificado',
        sector: issue.department_label || 'Não identificado',
        problem: issue.problem_label || '',
        problem_detail: issue.detail || '', // Detail completo apenas para problemas
        confidence: Math.max(0, Math.min(1, issue.confidence || 0.5)),
        matched_by: issue.matched_by || 'proposed'
      });
    }
  }

  // Remover duplicatas e consolidar com separador ";" (ordenar para consistência)
  const uniqueKeywords = Array.from(new Set(consolidatedKeywords)).sort();
  const uniqueSectors = Array.from(new Set(consolidatedSectors)).sort();
  const uniqueProblems = Array.from(new Set(consolidatedProblems)).sort();
  const uniqueCompliments = Array.from(new Set(consolidatedCompliments)).sort();

  // Lógica inteligente de consolidação
  let consolidatedKeyword = 'Não identificado';
  let consolidatedSector = 'Não identificado';
  let consolidatedProblem = '';
  let consolidatedCompliment = '';

  // Para keywords: se há múltiplas, usar separador ";" mas limitar a 3 para legibilidade
  if (uniqueKeywords.length > 0) {
    if (uniqueKeywords.length <= 3) {
      consolidatedKeyword = uniqueKeywords.join(';');
    } else {
      // Se há muitas keywords, usar as 2 primeiras + "e outros"
      consolidatedKeyword = `${uniqueKeywords.slice(0, 2).join(';')};+${uniqueKeywords.length - 2} outros`;
    }
  }

  // Para setores: similar lógica mas mais conservadora
  if (uniqueSectors.length > 0) {
    if (uniqueSectors.length <= 2) {
      consolidatedSector = uniqueSectors.join(';');
    } else {
      // Se há muitos setores, usar o primeiro + "e outros"
      consolidatedSector = `${uniqueSectors[0]};+${uniqueSectors.length - 1} outros`;
    }
  }

  // Para problemas: consolidar de forma inteligente
  if (uniqueProblems.length > 0) {
    if (uniqueProblems.length <= 2) {
      consolidatedProblem = uniqueProblems.join(';');
    } else {
      // Se há muitos problemas, usar os 2 primeiros + indicador
      consolidatedProblem = `${uniqueProblems.slice(0, 2).join(';')};+${uniqueProblems.length - 2} outros`;
    }
  }

  // Para elogios: consolidar de forma inteligente
  if (uniqueCompliments.length > 0) {
    if (uniqueCompliments.length <= 2) {
      consolidatedCompliment = uniqueCompliments.join('; ');
    } else {
      // Se há muitos elogios, usar os 2 primeiros + indicador
      consolidatedCompliment = `${uniqueCompliments.slice(0, 2).join('; ')}; +${uniqueCompliments.length - 2} outros elogios`;
    }
  }

  // Calcular confidence média ponderada
  const avgConfidence = allProblemsDetailed.length > 0 
    ? allProblemsDetailed.reduce((sum, item) => sum + item.confidence, 0) / allProblemsDetailed.length
    : newResponse.confidence || 0.5;

  return {
    // Campos consolidados para compatibilidade
    keyword: consolidatedKeyword,
    sector: consolidatedSector,
    problem: consolidatedProblem,
    
    // CRÍTICO: Adicionar 'rating' baseado em 'sentiment' (1-5)
    rating: newResponse.sentiment || 3,
    
    // Novos campos opcionais
    has_suggestion: newResponse.has_suggestion || false,
    suggestion_type: newResponse.suggestion_type,
    suggestion_summary: newResponse.suggestion_summary,
    confidence: Math.max(0, Math.min(1, avgConfidence)), // Garantir range 0-1
    needs_review: newResponse.needs_review || avgConfidence < 0.6, // Auto-review se confidence baixa
    
    // NOVO: Campos para elogios/detalhes positivos (separados de problems)
    compliments: consolidatedCompliment || undefined,
    positive_details: consolidatedCompliment || undefined,
    
    // Chain of Thought: raciocínio da IA
    reasoning: newResponse.reasoning,
    
    // Estrutura detalhada para futuras melhorias
    allProblems: allProblemsDetailed,
    
    // Metadados
    taxonomy_version: newResponse.taxonomy_version,
    processing_time_ms: newResponse.processing_time_ms
  };
}

/**
 * Detecta se um feedback já está no formato legado ou precisa de conversão
 */
export function isLegacyFormat(data: any): boolean {
  return (
    typeof data.keyword === 'string' &&
    typeof data.sector === 'string' &&
    typeof data.problem === 'string' &&
    !data.issues // Nova estrutura tem campo 'issues'
  );
}

/**
 * Converte feedback legado para incluir novos campos opcionais
 */
export function enhanceLegacyFeedback(legacyFeedback: any): LegacyFeedback {
  return {
    ...legacyFeedback,
    has_suggestion: legacyFeedback.has_suggestion || false,
    confidence: legacyFeedback.confidence || 0.7, // Assumir confiança média para dados antigos
    needs_review: legacyFeedback.needs_review || false,
    
    // NOVO: Campos para elogios (preservar se existir)
    compliments: legacyFeedback.compliments || undefined,
    positive_details: legacyFeedback.positive_details || undefined,
    
    allProblems: legacyFeedback.allProblems || [{
      keyword: legacyFeedback.keyword || 'Não identificado',
      sector: legacyFeedback.sector || 'Não identificado', 
      problem: legacyFeedback.problem || '',
      problem_detail: '',
      confidence: 0.7,
      matched_by: 'legacy'
    }]
  };
}

/**
 * Processa qualquer tipo de resposta da IA e garante formato compatível
 */
export function processAIResponse(response: any): LegacyFeedback {
  // Se já está no formato legado, apenas melhorar
  if (isLegacyFormat(response)) {
    return enhanceLegacyFeedback(response);
  }
  
  // Se é nova estrutura, converter
  if (response.issues) {
    return adaptNewAIToLegacyFormat(response as NewAIResponse);
  }
  
  // Fallback para estruturas desconhecidas
  return {
    keyword: response.keyword || 'Não identificado',
    sector: response.sector || 'Não identificado',
    problem: response.problem || '',
    rating: response.rating || response.sentiment || 3, // Tentar obter rating ou usar neutro
    has_suggestion: false,
    confidence: 0.3,
    needs_review: true
  };
}

/**
 * Cria feedback mínimo para casos de falha total (emergência)
 */
export function createEmergencyFeedback(text: string, errorMessage?: string): LegacyFeedback {
  return {
    keyword: 'Erro de Processamento',
    sector: 'Sistema',
    problem: 'Falha na Análise - Requer Revisão Manual',
    rating: 3, // Neutro em caso de erro
    has_suggestion: false,
    confidence: 0.0,
    needs_review: true,
    
    // NOVO: Campos para elogios (vazios em caso de erro)
    compliments: undefined,
    positive_details: undefined,
    
    // CRÍTICO: Reasoning para fallback de emergência
    reasoning: `Fallback de emergência ativado devido a erro no sistema: ${errorMessage || 'Erro desconhecido'}. Análise automática não foi possível.`,
    
    allProblems: [{
      keyword: 'Erro de Processamento',
      sector: 'Sistema',
      problem: 'Falha na Análise - Requer Revisão Manual',
      problem_detail: `Erro: ${errorMessage || 'Erro desconhecido'}. Texto: ${text.substring(0, 50)}...`,
      confidence: 0.0,
      matched_by: 'emergency_fallback'
    }],
    taxonomy_version: 0,
    processing_time_ms: 0
  };
}

/**
 * Cria feedback básico para casos de fallback extremo com heurísticas simples
 */
export function createBasicFeedback(text: string, rating?: number): LegacyFeedback {
  const normalizedText = text.toLowerCase().trim();
  
  // Análise de sentimento baseada em palavras-chave
  let sentiment = 3; // neutro por padrão
  let confidence = 0.3;
  
  // Palavras positivas
  const positiveWords = ['excelente', 'ótimo', 'maravilhoso', 'perfeito', 'adorei', 'amei', 'fantástico', 'incrível'];
  const negativeWords = ['péssimo', 'horrível', 'ruim', 'terrível', 'decepcionado', 'insatisfeito', 'problema'];
  
  const positiveCount = positiveWords.filter(word => normalizedText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => normalizedText.includes(word)).length;
  
  if (rating) {
    sentiment = rating;
    confidence = 0.6; // Mais confiança quando há rating explícito
  } else if (positiveCount > negativeCount) {
    sentiment = 4;
    confidence = 0.5;
  } else if (negativeCount > positiveCount) {
    sentiment = 2;
    confidence = 0.5;
  }
  
  // Detectar contexto básico
  let keyword = 'Atendimento Geral';
  let sector = 'Operações';
  let problem = '';
  
  // Contexto de restaurante/comida
  if (normalizedText.includes('comida') || normalizedText.includes('restaurante') || 
      normalizedText.includes('garçom') || normalizedText.includes('café da manhã')) {
    keyword = 'A&B - Serviço';
    sector = 'A&B';
  }
  
  // Contexto de quarto
  if (normalizedText.includes('quarto') || normalizedText.includes('cama') || 
      normalizedText.includes('banheiro') || normalizedText.includes('limpeza')) {
    keyword = 'Limpeza - Quarto';
    sector = 'Limpeza';
  }
  
  // Contexto de recepção
  if (normalizedText.includes('recepção') || normalizedText.includes('check-in') || 
      normalizedText.includes('check-out') || normalizedText.includes('atendente')) {
    keyword = 'Recepção - Serviço';
    sector = 'Recepção';
  }
  
  // Detectar problemas específicos
  if (sentiment <= 2) {
    if (normalizedText.includes('demora') || normalizedText.includes('demorou')) {
      problem = 'Demora no Atendimento';
    } else if (normalizedText.includes('sujo') || normalizedText.includes('limpo')) {
      problem = 'Falta de Limpeza';
    } else if (normalizedText.includes('frio') || normalizedText.includes('fria')) {
      problem = 'Qualidade da Refeição Abaixo do Esperado';
    } else if (normalizedText.includes('barulho') || normalizedText.includes('ruído')) {
      problem = 'Ruído Excessivo';
    } else {
      problem = 'Requer Análise Manual';
    }
  }
  
  // Detectar sugestões básicas
  const hasSuggestion = normalizedText.includes('deveria') || 
                       normalizedText.includes('poderia') || 
                       normalizedText.includes('sugiro') ||
                       normalizedText.includes('recomendo');

  // Detectar elogios para o novo campo
  let compliments = '';
  if (sentiment >= 4) {
    const complimentPhrases = [];
    if (normalizedText.includes('excelente')) complimentPhrases.push('Serviço excelente');
    if (normalizedText.includes('ótimo') || normalizedText.includes('otimo')) complimentPhrases.push('Experiência ótima');
    if (normalizedText.includes('maravilhoso')) complimentPhrases.push('Experiência maravilhosa');
    if (normalizedText.includes('adorei')) complimentPhrases.push('Cliente adorou a experiência');
    if (normalizedText.includes('recomendo')) complimentPhrases.push('Cliente recomenda');
    
    if (complimentPhrases.length > 0) {
      compliments = complimentPhrases.join('; ');
    } else if (sentiment >= 4) {
      compliments = 'Feedback positivo detectado';
    }
  }
  
  return {
    keyword: keyword,
    sector: sector,
    problem: problem,
    rating: sentiment, // Usar o sentiment calculado como rating
    has_suggestion: hasSuggestion,
    suggestion_type: hasSuggestion ? 'improvement_only' : 'none',
    suggestion_summary: hasSuggestion ? 'Sugestão detectada no texto' : '',
    confidence: confidence,
    needs_review: confidence < 0.5,
    
    // NOVO: Campos para elogios (separados de problems)
    compliments: compliments || undefined,
    positive_details: compliments || undefined,
    
    // CRÍTICO: Reasoning para fallback básico
    reasoning: 'Análise básica por heurística - Sistema de IA principal indisponível. Classificação baseada em palavras-chave e contexto simples.',
    
    allProblems: [{
      keyword: keyword,
      sector: sector,
      problem: problem,
      problem_detail: `Análise básica: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
      confidence: confidence,
      matched_by: 'basic_heuristics'
    }],
    taxonomy_version: 1,
    processing_time_ms: 0
  };
}