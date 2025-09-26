import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server-auth';
import { performanceLogger } from '@/lib/performance-logger';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (apenas admins podem ver métricas)
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userData) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (authResult.userData.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado - apenas admins' }, { status: 403 });
    }

    console.log('📊 Solicitação de métricas de performance...');

    // Obter parâmetros de query
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '24h';
    const format = url.searchParams.get('format') || 'summary';

    let startTime = 0;
    const endTime = Date.now();

    // Calcular período
    switch (period) {
      case '1h':
        startTime = endTime - (60 * 60 * 1000);
        break;
      case '6h':
        startTime = endTime - (6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = endTime - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = endTime - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = endTime - (24 * 60 * 60 * 1000);
    }

    if (format === 'detailed') {
      // Retornar dados detalhados
      const metrics = performanceLogger.getMetricsByPeriod(startTime, endTime);
      const stats = performanceLogger.getStats();
      const issues = performanceLogger.detectIssues();

      return NextResponse.json({
        success: true,
        period: period,
        data: {
          stats,
          metrics: metrics.slice(-100), // Últimas 100 métricas
          issues,
          summary: {
            total_requests: metrics.length,
            period_start: new Date(startTime).toISOString(),
            period_end: new Date(endTime).toISOString()
          }
        }
      });
    } else {
      // Retornar apenas resumo
      const stats = performanceLogger.getStats();
      const issues = performanceLogger.detectIssues();

      return NextResponse.json({
        success: true,
        period: period,
        data: {
          stats,
          issues,
          health_status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'warning' : 'critical',
          recommendations: generateRecommendations(stats, issues)
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao obter métricas:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Gera recomendações baseadas nas métricas
 */
function generateRecommendations(stats: any, issues: string[]): string[] {
  const recommendations: string[] = [];

  if (stats.success_rate < 90) {
    recommendations.push('Considere verificar a configuração dos embeddings');
  }

  if (stats.fallback_rates.emergency > 2) {
    recommendations.push('Taxa alta de fallback de emergência - verifique logs de erro');
  }

  if (stats.avg_processing_time > 3000) {
    recommendations.push('Tempo de processamento alto - considere otimizar prompts ou usar modelo mais rápido');
  }

  if (stats.embeddings_usage_rate < 70) {
    recommendations.push('Uso baixo de embeddings - verifique se foram gerados corretamente');
  }

  if (stats.avg_confidence < 0.7) {
    recommendations.push('Confidence baixa - considere revisar taxonomia ou retreinar embeddings');
  }

  if (recommendations.length === 0) {
    recommendations.push('Sistema funcionando bem - continue monitorando');
  }

  return recommendations;
}

// Endpoint para limpar métricas antigas (apenas admins)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || authResult.userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { older_than_hours = 24 } = body;

    performanceLogger.cleanup(older_than_hours * 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      message: `Métricas mais antigas que ${older_than_hours}h foram removidas`
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}