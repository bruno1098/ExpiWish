/**
 * Sistema de Reranking e Score de Coerência
 * 
 * Usa múltiplos sinais para reordenar candidatos e melhorar precisão:
 * 1. Similaridade de embedding (base)
 * 2. Coerência departamento-keyword (validação estrutural)
 * 3. Frequência histórica (keywords mais usadas têm prioridade)
 * 4. Contexto da frase (análise sintática)
 */

import { KEYWORD_DEPARTMENT_MAP, validateKeywordDepartment } from './taxonomy-validation';

interface RerankCandidate {
  id: string;
  label: string;
  department_id: string;
  similarity_score: number;
}

interface RerankingSignals {
  embedding_score: number;      // 0-1: similaridade do embedding
  structural_score: number;      // 0-1: coerência departamento-keyword
  frequency_score: number;       // 0-1: quão comum é esta keyword
  context_score: number;         // 0-1: match com contexto da frase
  final_score: number;           // 0-1: score combinado
}

/**
 * Pesos para cada sinal no cálculo do score final
 */
const RERANKING_WEIGHTS = {
  embedding: 0.40,    // Similaridade semântica continua importante
  structural: 0.30,   // Coerência estrutural muito importante
  frequency: 0.15,    // Histórico importa moderadamente
  context: 0.15       // Contexto da frase complementa
};

/**
 * Mapa de frequência de keywords (atualizado dinamicamente)
 * Quanto mais uma keyword é usada, maior sua prior probability
 */
const keywordFrequency: Record<string, number> = {
  "A&B - Serviço": 150,
  "A&B - Gastronomia": 120,
  "A&B - Café da manhã": 100,
  "Limpeza - Quarto": 90,
  "Tecnologia - Wi-fi": 85,
  "Atendimento": 80,
  "Recepção - Atendimento": 75,
  "Localização": 70,
  "Experiência": 65,
  // ... outras keywords têm frequência menor
};

const maxFrequency = Math.max(...Object.values(keywordFrequency));

/**
 * Calcula score de coerência estrutural
 */
function calculateStructuralScore(
  keywordLabel: string,
  departmentId: string
): number {
  const validation = validateKeywordDepartment(keywordLabel, departmentId);
  
  if (validation.valid) {
    return 1.0; // Perfeito!
  }
  
  if (validation.correctDepartment) {
    // Keyword existe mas está no departamento errado
    return 0.0; // Penalizar fortemente
  }
  
  // Keyword desconhecida - meio termo
  return 0.5;
}

/**
 * Calcula score de frequência (prior probability)
 */
function calculateFrequencyScore(keywordLabel: string): number {
  const frequency = keywordFrequency[keywordLabel] || 1;
  return frequency / maxFrequency;
}

/**
 * Calcula score de contexto (análise sintática simples)
 */
function calculateContextScore(
  keywordLabel: string,
  userText: string
): number {
  const textLower = userText.toLowerCase();
  const keywordLower = keywordLabel.toLowerCase();
  
  let score = 0.5; // Score base
  
  // 1. Palavras da keyword aparecem no texto?
  const keywordWords = keywordLower.split(/[-\s]+/);
  const matchedWords = keywordWords.filter(w => w.length > 2 && textLower.includes(w));
  
  if (matchedWords.length > 0) {
    score += 0.3 * (matchedWords.length / keywordWords.length);
  }
  
  // 2. Regras específicas para diferenciar A&B Serviço vs Operações Atendimento
  const foodTokens = [
    'restaurante', 'café', 'cafe', 'café da manhã', 'almoço', 'jantar',
    'cardápio', 'menu', 'pedido', 'comanda', 'garçom', 'garçonete', 'maître',
    'bar', 'comida', 'prato', 'bebida', 'lanche', 'room service'
  ];
  const opsAttTokens = [
    'atendimento', 'atencioso', 'educado', 'cordial', 'equipe', 'staff', 'serviço',
    'tempo de resposta', 'demora', 'rápido', 'lento'
  ];
  const govServiceTokens = [
    'camareira', 'camareiras', 'arrumadeira', 'pessoal da limpeza',
    'equipe de limpeza', 'housekeeping', 'serviço de governança',
    'serviço das camareiras', 'serviço de arrumação',
    'camareiras atenciosas', 'camareiras educadas', 'camareiras simpáticas',
    'camareiras mal educadas', 'camareiras grossas'
  ];
  
  const hasFood = foodTokens.some(t => textLower.includes(t));
  const hasOpsAtt = opsAttTokens.some(t => textLower.includes(t));
  const hasGovService = govServiceTokens.some(t => textLower.includes(t));
  
  // A&B - Serviço: precisa de termos de comida/bebida
  if (keywordLower === 'a&b - serviço') {
    if (hasFood) score += 0.25; // reforço quando há contexto de A&B
    if (!hasFood && hasOpsAtt) score -= 0.25; // penalizar quando contexto é só atendimento
  }
  
  // Operações - Atendimento: reforçar quando texto fala de atendimento geral
  if (keywordLower === 'operações - atendimento') {
    if (hasOpsAtt && !hasFood) score += 0.25;
    if (hasFood) score -= 0.15; // reduzir quando há forte contexto de A&B
  }
  
  // Governança - Serviço: reforçar quando menciona camareiras/arrumação
  if (keywordLower === 'governança - serviço') {
    if (hasGovService) score += 0.30;
  }
  
  // 3. Contexto negativo/positivo
  const isNegative = /não|nunca|péssimo|ruim|horrível|terrível/.test(textLower);
  const isPositive = /ótimo|excelente|maravilhoso|perfeito|adorei/.test(textLower);
  
  // Keywords de problemas devem ter score maior em contexto negativo
  if (keywordLower.includes("problema") || keywordLower.includes("falha")) {
    if (isNegative) score += 0.2;
    if (isPositive) score -= 0.2;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Reordena candidatos usando múltiplos sinais
 */
export function rerankCandidates(
  candidates: RerankCandidate[],
  userText: string,
  requiredDepartment?: string
): Array<RerankCandidate & { reranking_signals: RerankingSignals }> {
  
  console.log(`🎯 Reranking ${candidates.length} candidatos...`);
  
  const rankedCandidates = candidates.map(candidate => {
    const signals: RerankingSignals = {
      embedding_score: candidate.similarity_score,
      structural_score: calculateStructuralScore(candidate.label, candidate.department_id),
      frequency_score: calculateFrequencyScore(candidate.label),
      context_score: calculateContextScore(candidate.label, userText),
      final_score: 0
    };
    
    // Calcular score final ponderado
    signals.final_score = 
      signals.embedding_score * RERANKING_WEIGHTS.embedding +
      signals.structural_score * RERANKING_WEIGHTS.structural +
      signals.frequency_score * RERANKING_WEIGHTS.frequency +
      signals.context_score * RERANKING_WEIGHTS.context;
    
    // PENALIZAÇÃO FORTE: se departamento está errado estruturalmente, zerar score
    if (requiredDepartment && signals.structural_score === 0.0) {
      signals.final_score = 0.0;
      console.warn(`❌ Penalizando "${candidate.label}" - departamento errado`);
    }
    
    return {
      ...candidate,
      reranking_signals: signals
    };
  });
  
  // Ordenar por score final
  rankedCandidates.sort((a, b) => b.reranking_signals.final_score - a.reranking_signals.final_score);
  
  // Log top 3
  console.log('🏆 Top 3 após reranking:');
  rankedCandidates.slice(0, 3).forEach((c, i) => {
    console.log(`   ${i + 1}. "${c.label}" (score: ${c.reranking_signals.final_score.toFixed(3)})`);
    console.log(`      emb: ${c.reranking_signals.embedding_score.toFixed(2)}, ` +
                `struct: ${c.reranking_signals.structural_score.toFixed(2)}, ` +
                `freq: ${c.reranking_signals.frequency_score.toFixed(2)}, ` +
                `ctx: ${c.reranking_signals.context_score.toFixed(2)}`);
  });
  
  return rankedCandidates;
}

/**
 * Atualiza frequência de uma keyword (aprendizado online)
 */
export function updateKeywordFrequency(keywordLabel: string) {
  if (!keywordFrequency[keywordLabel]) {
    keywordFrequency[keywordLabel] = 1;
  } else {
    keywordFrequency[keywordLabel]++;
  }
}

/**
 * Retorna estatísticas de reranking
 */
export function getRerankingStats() {
  return {
    total_keywords_tracked: Object.keys(keywordFrequency).length,
    most_frequent: Object.entries(keywordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, freq]) => ({ label, frequency: freq })),
    weights: RERANKING_WEIGHTS
  };
}
