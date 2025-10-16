import { doc, setDoc, collection, query, where, getDocs, orderBy, limit, Timestamp, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { devPerf, devAuth } from "./dev-logger";

// Interfaces para tracking
export interface UserAccessEvent {
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'staff';
  hotelId: string;
  hotelName: string;
  timestamp: Timestamp;
  sessionId: string;
  userAgent: string;
  ipAddress?: string;
  page: string;
  action: 'login' | 'logout' | 'page_view' | 'action';
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  timestamp: Timestamp;
  page: string;
  userId?: string;
  sessionId: string;
  metrics: {
    cls: number | null;
    fid: number | null;
    fcp: number | null;
    lcp: number | null;
    ttfb: number | null;
    inp: number | null;
  };
  loadTime: number;
  userAgent: string;
}

export interface AnalyticsStats {
  totalAccess: number;
  uniqueUsers: number;
  averageSessionTime: number;
  topPages: Array<{ page: string; views: number; avgLoadTime: number }>;
  dailyAccess: Array<{ date: string; count: number }>;
  userDistribution: {
    admin: number;
    staff: number;
  };
  hotelDistribution: Array<{ hotelName: string; accessCount: number }>;
  performanceAverages: {
    cls: number;
    fid: number;
    fcp: number;
    lcp: number;
    ttfb: number;
    inp: number;
    loadTime: number;
  };
}

// Configuração do Google Analytics
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

class AnalyticsService {
  private sessionId: string;
  private sessionStartTime: number;
  private isInitialized: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  // Inicializar Google Analytics
  initializeGoogleAnalytics(trackingId: string) {
    if (typeof window === 'undefined' || this.isInitialized) return;

    try {
      // Adicionar script do Google Analytics
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      document.head.appendChild(script1);

      // Inicializar dataLayer
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', trackingId, {
        page_title: document.title,
        page_location: window.location.href,
        send_page_view: true
      });

      this.isInitialized = true;
      devPerf('✅ Google Analytics inicializado:', trackingId);
    } catch (error) {
      devPerf('❌ Erro ao inicializar Google Analytics:', error);
    }
  }

  // Gerar ID de sessão único
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obter informações do navegador
  private getUserAgent(): string {
    return typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
  }

  // Tracking de acesso de usuário
  async trackUserAccess(
    userId: string,
    userEmail: string,
    userRole: 'admin' | 'staff',
    hotelId: string,
    hotelName: string,
    action: 'login' | 'logout' | 'page_view' | 'action',
    page: string,
    metadata?: Record<string, any>
  ) {
    try {
      const accessEvent: UserAccessEvent = {
        userId,
        userEmail,
        userRole,
        hotelId,
        hotelName,
        timestamp: Timestamp.now(),
        sessionId: this.sessionId,
        userAgent: this.getUserAgent(),
        page,
        action,
        metadata
      };

      // Salvar no Firestore
      await addDoc(collection(db, "analytics_access"), accessEvent);

      // Enviar para Google Analytics se disponível
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', action, {
          event_category: 'User Access',
          event_label: `${userRole} - ${hotelName}`,
          user_id: userId,
          custom_map: {
            hotel_id: hotelId,
            hotel_name: hotelName,
            user_role: userRole
          }
        });
      }

      devAuth(`📊 Acesso registrado: ${action} - ${userEmail} - ${page}`);
    } catch (error) {
      devPerf('❌ Erro ao registrar acesso:', error);
    }
  }

  // Tracking de métricas de performance
  async trackPerformanceMetrics(
    page: string,
    metrics: {
      cls: number | null;
      fid: number | null;
      fcp: number | null;
      lcp: number | null;
      ttfb: number | null;
      inp: number | null;
    },
    loadTime: number,
    userId?: string
  ) {
    try {
      const performanceMetric: PerformanceMetric = {
        timestamp: Timestamp.now(),
        page,
        userId,
        sessionId: this.sessionId,
        metrics,
        loadTime,
        userAgent: this.getUserAgent()
      };

      // Salvar no Firestore
      await addDoc(collection(db, "analytics_performance"), performanceMetric);

      // Enviar Core Web Vitals para Google Analytics
      if (typeof window !== 'undefined' && window.gtag) {
        // Enviar métricas individuais
        if (metrics.lcp) {
          window.gtag('event', 'web_vitals', {
            event_category: 'Web Vitals',
            event_label: 'LCP',
            value: Math.round(metrics.lcp),
            custom_map: { metric_name: 'LCP', page_path: page }
          });
        }

        if (metrics.cls) {
          window.gtag('event', 'web_vitals', {
            event_category: 'Web Vitals',
            event_label: 'CLS',
            value: Math.round(metrics.cls * 1000), // CLS em milissegundos
            custom_map: { metric_name: 'CLS', page_path: page }
          });
        }

        if (metrics.fid) {
          window.gtag('event', 'web_vitals', {
            event_category: 'Web Vitals',
            event_label: 'FID',
            value: Math.round(metrics.fid),
            custom_map: { metric_name: 'FID', page_path: page }
          });
        }
      }

      devPerf(`⚡ Performance registrada: ${page} - LCP: ${metrics.lcp}ms, CLS: ${metrics.cls}`);
    } catch (error) {
      devPerf('❌ Erro ao registrar performance:', error);
    }
  }

  // Obter estatísticas de analytics
  async getAnalyticsStats(days: number = 30): Promise<AnalyticsStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startTimestamp = Timestamp.fromDate(startDate);

      // Debug: verificar se há dados na coleção
      console.log('🔍 DEBUG - Verificando dados de analytics...');
      console.log('📅 Período:', startDate.toISOString(), 'até', new Date().toISOString());

      // Query para acessos
      const accessQuery = query(
        collection(db, "analytics_access"),
        where("timestamp", ">=", startTimestamp),
        orderBy("timestamp", "desc")
      );

      // Query para performance
      const performanceQuery = query(
        collection(db, "analytics_performance"),
        where("timestamp", ">=", startTimestamp),
        orderBy("timestamp", "desc")
      );

      const [accessSnapshot, performanceSnapshot] = await Promise.all([
        getDocs(accessQuery),
        getDocs(performanceQuery)
      ]);

      // Processar dados de acesso
      const accessData = accessSnapshot.docs.map(doc => doc.data() as UserAccessEvent);
      const performanceData = performanceSnapshot.docs.map(doc => doc.data() as PerformanceMetric);

      console.log('📊 Dados encontrados:', {
        totalAccessEvents: accessData.length,
        totalPerformanceEvents: performanceData.length,
        sampleAccessData: accessData.slice(0, 3).map(a => ({
          userId: a.userId,
          userRole: a.userRole,
          action: a.action,
          page: a.page,
          timestamp: a.timestamp.toDate().toISOString()
        }))
      });

      // Calcular estatísticas
      const stats = this.calculateStats(accessData, performanceData);
      
      devPerf(`📊 Stats calculadas: ${accessData.length} acessos, ${performanceData.length} métricas`);
      return stats;
    } catch (error) {
      devPerf('❌ Erro ao obter stats:', error);
      console.error('❌ Erro detalhado:', error);
      return this.getEmptyStats();
    }
  }

  // Calcular estatísticas
  private calculateStats(accessData: UserAccessEvent[], performanceData: PerformanceMetric[]): AnalyticsStats {
    // Usuários únicos
    const uniqueUsers = new Set(accessData.map(a => a.userId)).size;

    // Distribuição por role - contar usuários únicos por role, não total de acessos
    const uniqueUsersByRole = accessData.reduce((acc, curr) => {
      if (!acc[curr.userRole]) {
        acc[curr.userRole] = new Set();
      }
      acc[curr.userRole].add(curr.userId);
      return acc;
    }, {} as Record<string, Set<string>>);

    const userDistribution = {
      admin: uniqueUsersByRole.admin?.size || 0,
      staff: uniqueUsersByRole.staff?.size || 0
    };

    // Debug logs para verificar os dados
    console.log('🔍 DEBUG - Analytics calculateStats:');
    console.log('📊 Total de eventos de acesso:', accessData.length);
    console.log('👥 Usuários únicos totais:', uniqueUsers);
    console.log('🔑 Usuários únicos por role:', {
      admin: Array.from(uniqueUsersByRole.admin || []),
      staff: Array.from(uniqueUsersByRole.staff || [])
    });
    console.log('📈 Distribuição final:', userDistribution);

    // Top páginas
    const pageViews = accessData
      .filter(a => a.action === 'page_view')
      .reduce((acc, curr) => {
        if (!acc[curr.page]) acc[curr.page] = { views: 0, totalLoadTime: 0, count: 0 };
        acc[curr.page].views++;
        return acc;
      }, {} as Record<string, { views: number; totalLoadTime: number; count: number }>);

    // Adicionar dados de performance às páginas
    performanceData.forEach(p => {
      if (pageViews[p.page]) {
        pageViews[p.page].totalLoadTime += p.loadTime;
        pageViews[p.page].count++;
      }
    });

    const topPages = Object.entries(pageViews)
      .map(([page, data]) => ({
        page,
        views: data.views,
        avgLoadTime: data.count > 0 ? data.totalLoadTime / data.count : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Acessos diários
    const dailyAccess = this.calculateDailyAccess(accessData);

    // Distribuição por hotel
    const hotelDistribution = Object.entries(
      accessData.reduce((acc, curr) => {
        acc[curr.hotelName] = (acc[curr.hotelName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([hotelName, accessCount]) => ({ hotelName, accessCount }))
     .sort((a, b) => b.accessCount - a.accessCount);

    // Médias de performance
    const performanceAverages = this.calculatePerformanceAverages(performanceData);

    // Tempo médio de sessão (estimativa baseada em acessos)
    const averageSessionTime = this.calculateAverageSessionTime(accessData);

    return {
      totalAccess: accessData.length,
      uniqueUsers,
      averageSessionTime,
      topPages,
      dailyAccess,
      userDistribution,
      hotelDistribution,
      performanceAverages
    };
  }

  // Calcular acessos diários
  private calculateDailyAccess(accessData: UserAccessEvent[]) {
    const dailyData = accessData.reduce((acc, curr) => {
      const date = curr.timestamp.toDate().toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dailyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Calcular médias de performance
  private calculatePerformanceAverages(performanceData: PerformanceMetric[]) {
    if (performanceData.length === 0) {
      return { cls: 0, fid: 0, fcp: 0, lcp: 0, ttfb: 0, inp: 0, loadTime: 0 };
    }

    const totals = performanceData.reduce((acc, curr) => ({
      cls: acc.cls + (curr.metrics.cls || 0),
      fid: acc.fid + (curr.metrics.fid || 0),
      fcp: acc.fcp + (curr.metrics.fcp || 0),
      lcp: acc.lcp + (curr.metrics.lcp || 0),
      ttfb: acc.ttfb + (curr.metrics.ttfb || 0),
      inp: acc.inp + (curr.metrics.inp || 0),
      loadTime: acc.loadTime + curr.loadTime
    }), { cls: 0, fid: 0, fcp: 0, lcp: 0, ttfb: 0, inp: 0, loadTime: 0 });

    const count = performanceData.length;
    return {
      cls: totals.cls / count,
      fid: totals.fid / count,
      fcp: totals.fcp / count,
      lcp: totals.lcp / count,
      ttfb: totals.ttfb / count,
      inp: totals.inp / count,
      loadTime: totals.loadTime / count
    };
  }

  // Calcular tempo médio de sessão
  private calculateAverageSessionTime(accessData: UserAccessEvent[]): number {
    const sessions = accessData.reduce((acc, curr) => {
      if (!acc[curr.sessionId]) {
        acc[curr.sessionId] = { start: curr.timestamp.toDate().getTime(), end: curr.timestamp.toDate().getTime() };
      } else {
        acc[curr.sessionId].end = Math.max(acc[curr.sessionId].end, curr.timestamp.toDate().getTime());
      }
      return acc;
    }, {} as Record<string, { start: number; end: number }>);

    const sessionTimes = Object.values(sessions).map(s => s.end - s.start);
    return sessionTimes.length > 0 ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length : 0;
  }

  // Retornar stats vazias em caso de erro
  private getEmptyStats(): AnalyticsStats {
    return {
      totalAccess: 0,
      uniqueUsers: 0,
      averageSessionTime: 0,
      topPages: [],
      dailyAccess: [],
      userDistribution: { admin: 0, staff: 0 },
      hotelDistribution: [],
      performanceAverages: { cls: 0, fid: 0, fcp: 0, lcp: 0, ttfb: 0, inp: 0, loadTime: 0 }
    };
  }

  // Método para obter sessão atual
  getCurrentSession() {
    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      duration: Date.now() - this.sessionStartTime
    };
  }
}

// Instância singleton
export const analyticsService = new AnalyticsService();