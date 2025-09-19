// Métricas para acompanhar resolução de problemas
export interface ProblemMetrics {
  // Identificação
  problemId: string;
  problem: string;
  problem_detail: string;
  department: string;
  
  // Métricas de impacto
  totalOccurrences: number;
  averageRating: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  
  // Análise temporal
  firstOccurrence: Date;
  lastOccurrence: Date;
  peakMonth: string;
  
  // Impacto financeiro estimado
  estimatedRevenueImpact: number; // baseado em ratings perdidos
  guestsAffected: number;
  
  // Resolução
  status: 'pending' | 'in_progress' | 'resolved';
  actionTaken?: string;
  assignedTo?: string;
  targetResolutionDate?: Date;
  
  // Sugestões dos clientes
  clientSuggestions: string[];
  implementedSuggestions: string[];
}

export const calculateProblemImpact = (
  occurrences: number, 
  avgRating: number, 
  baseRating: number = 4.0
): number => {
  // Fórmula: (perda de rating) * ocorrências * fator de conversão
  const ratingLoss = Math.max(0, baseRating - avgRating);
  const impactMultiplier = 100; // R$ por ponto de rating perdido
  
  return ratingLoss * occurrences * impactMultiplier;
};

export const getProblemTrend = (
  monthlyData: Array<{ month: string; count: number }>
): 'increasing' | 'stable' | 'decreasing' => {
  if (monthlyData.length < 2) return 'stable';
  
  const recent = monthlyData.slice(-3);
  const older = monthlyData.slice(-6, -3);
  
  const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.count, 0) / older.length || recentAvg;
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (changePercent > 15) return 'increasing';
  if (changePercent < -15) return 'decreasing';
  return 'stable';
};