/**
 * Sistema de logging de performance para monitorar IA vs fallbacks
 */

interface PerformanceMetric {
  timestamp: number;
  type: 'ai_success' | 'ai_fallback_textual' | 'ai_fallback_basic' | 'ai_fallback_emergency';
  processing_time_ms: number;
  confidence?: number;
  error_type?: string;
  text_length: number;
  has_embeddings: boolean;
  circuit_breaker_state?: string;
  user_agent?: string;
  ip?: string;
}

interface PerformanceStats {
  total_requests: number;
  success_rate: number;
  avg_processing_time: number;
  avg_confidence: number;
  fallback_rates: {
    textual: number;
    basic: number;
    emergency: number;
  };
  error_distribution: Record<string, number>;
  embeddings_usage_rate: number;
  last_updated: number;
}

class PerformanceLogger {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 10000; // Manter últimas 10k métricas
  private readonly STATS_CACHE_TTL = 60000; // Cache stats por 1 minuto
  private cachedStats: PerformanceStats | null = null;
  private lastStatsUpdate = 0;

  /**
   * Registra uma métrica de performance
   */
  logMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Limitar tamanho do array
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Invalidar cache de stats
    this.cachedStats = null;

    // Log para console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Performance Metric:', {
        type: metric.type,
        time: metric.processing_time_ms + 'ms',
        confidence: metric.confidence,
        embeddings: metric.has_embeddings
      });
    }
  }

  /**
   * Registra sucesso da IA
   */
  logAISuccess(processingTime: number, confidence: number, textLength: number, hasEmbeddings: boolean, circuitBreakerState?: string) {
    this.logMetric({
      type: 'ai_success',
      processing_time_ms: processingTime,
      confidence,
      text_length: textLength,
      has_embeddings: hasEmbeddings,
      circuit_breaker_state: circuitBreakerState
    });
  }

  /**
   * Registra uso de fallback textual
   */
  logTextualFallback(processingTime: number, confidence: number, textLength: number, errorType: string) {
    this.logMetric({
      type: 'ai_fallback_textual',
      processing_time_ms: processingTime,
      confidence,
      error_type: errorType,
      text_length: textLength,
      has_embeddings: false
    });
  }

  /**
   * Registra uso de fallback básico
   */
  logBasicFallback(processingTime: number, confidence: number, textLength: number, errorType: string) {
    this.logMetric({
      type: 'ai_fallback_basic',
      processing_time_ms: processingTime,
      confidence,
      error_type: errorType,
      text_length: textLength,
      has_embeddings: false
    });
  }

  /**
   * Registra uso de fallback de emergência
   */
  logEmergencyFallback(processingTime: number, textLength: number, errorType: string, userAgent?: string, ip?: string) {
    this.logMetric({
      type: 'ai_fallback_emergency',
      processing_time_ms: processingTime,
      confidence: 0,
      error_type: errorType,
      text_length: textLength,
      has_embeddings: false,
      user_agent: userAgent,
      ip: ip
    });
  }

  /**
   * Calcula estatísticas de performance
   */
  getStats(): PerformanceStats {
    const now = Date.now();
    
    // Retornar cache se ainda válido
    if (this.cachedStats && (now - this.lastStatsUpdate) < this.STATS_CACHE_TTL) {
      return this.cachedStats;
    }

    if (this.metrics.length === 0) {
      return {
        total_requests: 0,
        success_rate: 0,
        avg_processing_time: 0,
        avg_confidence: 0,
        fallback_rates: { textual: 0, basic: 0, emergency: 0 },
        error_distribution: {},
        embeddings_usage_rate: 0,
        last_updated: now
      };
    }

    const total = this.metrics.length;
    const successes = this.metrics.filter(m => m.type === 'ai_success').length;
    const textualFallbacks = this.metrics.filter(m => m.type === 'ai_fallback_textual').length;
    const basicFallbacks = this.metrics.filter(m => m.type === 'ai_fallback_basic').length;
    const emergencyFallbacks = this.metrics.filter(m => m.type === 'ai_fallback_emergency').length;
    const withEmbeddings = this.metrics.filter(m => m.has_embeddings).length;

    const avgProcessingTime = this.metrics.reduce((sum, m) => sum + m.processing_time_ms, 0) / total;
    const metricsWithConfidence = this.metrics.filter(m => m.confidence !== undefined);
    const avgConfidence = metricsWithConfidence.length > 0 
      ? metricsWithConfidence.reduce((sum, m) => sum + (m.confidence || 0), 0) / metricsWithConfidence.length
      : 0;

    // Distribuição de erros
    const errorDistribution: Record<string, number> = {};
    this.metrics.forEach(m => {
      if (m.error_type) {
        errorDistribution[m.error_type] = (errorDistribution[m.error_type] || 0) + 1;
      }
    });

    const stats: PerformanceStats = {
      total_requests: total,
      success_rate: (successes / total) * 100,
      avg_processing_time: Math.round(avgProcessingTime),
      avg_confidence: Math.round(avgConfidence * 100) / 100,
      fallback_rates: {
        textual: Math.round((textualFallbacks / total) * 100 * 100) / 100,
        basic: Math.round((basicFallbacks / total) * 100 * 100) / 100,
        emergency: Math.round((emergencyFallbacks / total) * 100 * 100) / 100
      },
      error_distribution: errorDistribution,
      embeddings_usage_rate: Math.round((withEmbeddings / total) * 100 * 100) / 100,
      last_updated: now
    };

    // Cache stats
    this.cachedStats = stats;
    this.lastStatsUpdate = now;

    return stats;
  }

  /**
   * Obtém métricas recentes (últimas N)
   */
  getRecentMetrics(count: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Obtém métricas por período
   */
  getMetricsByPeriod(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Detecta problemas de performance
   */
  detectIssues(): string[] {
    const stats = this.getStats();
    const issues: string[] = [];

    if (stats.total_requests < 10) {
      return issues; // Não analisar com poucos dados
    }

    // Taxa de sucesso baixa
    if (stats.success_rate < 80) {
      issues.push(`Taxa de sucesso baixa: ${stats.success_rate.toFixed(1)}%`);
    }

    // Tempo de processamento alto
    if (stats.avg_processing_time > 5000) {
      issues.push(`Tempo de processamento alto: ${stats.avg_processing_time}ms`);
    }

    // Taxa de fallback de emergência alta
    if (stats.fallback_rates.emergency > 5) {
      issues.push(`Taxa de fallback de emergência alta: ${stats.fallback_rates.emergency}%`);
    }

    // Confidence baixa
    if (stats.avg_confidence < 0.6) {
      issues.push(`Confidence média baixa: ${stats.avg_confidence}`);
    }

    // Uso baixo de embeddings
    if (stats.embeddings_usage_rate < 50) {
      issues.push(`Uso baixo de embeddings: ${stats.embeddings_usage_rate}%`);
    }

    return issues;
  }

  /**
   * Limpa métricas antigas
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000) { // 24 horas por padrão
    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (this.metrics.length !== initialLength) {
      this.cachedStats = null; // Invalidar cache
      console.log(`🧹 Limpeza de métricas: ${initialLength - this.metrics.length} métricas antigas removidas`);
    }
  }

  /**
   * Exporta métricas para análise externa
   */
  exportMetrics(): {
    stats: PerformanceStats;
    recent_metrics: PerformanceMetric[];
    issues: string[];
  } {
    return {
      stats: this.getStats(),
      recent_metrics: this.getRecentMetrics(50),
      issues: this.detectIssues()
    };
  }
}

// Instância singleton
export const performanceLogger = new PerformanceLogger();

// Limpeza automática a cada hora
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    performanceLogger.cleanup();
  }, 60 * 60 * 1000); // 1 hora
}