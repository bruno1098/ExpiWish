import { useEffect, useState } from 'react';
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { devPerf } from '@/lib/dev-logger';

export interface WebVitalsData {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  inp: number | null;
  timestamp: number;
  url: string;
}

export interface WebVitalsStats {
  current: WebVitalsData;
  average: WebVitalsData;
  count: number;
  history: WebVitalsData[];
}

// Armazenamento local das métricas
let vitalsHistory: WebVitalsData[] = [];
let currentVitals: Partial<WebVitalsData> = {
  timestamp: Date.now(),
  url: typeof window !== 'undefined' ? window.location.href : ''
};

// Função para salvar métricas no localStorage
const saveVitalsToStorage = (vitals: WebVitalsData[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('web-vitals-history', JSON.stringify(vitals.slice(-100))); // Manter só últimas 100
    } catch (error) {
      devPerf('❌ Erro ao salvar Web Vitals:', error);
    }
  }
};

// Função para carregar métricas do localStorage
const loadVitalsFromStorage = (): WebVitalsData[] => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('web-vitals-history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      devPerf('❌ Erro ao carregar Web Vitals:', error);
      return [];
    }
  }
  return [];
};

// Função para calcular médias
const calculateAverages = (history: WebVitalsData[]): WebVitalsData => {
  if (history.length === 0) {
    return {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      inp: null,
      timestamp: Date.now(),
      url: ''
    };
  }

  const totals = history.reduce((acc, curr) => ({
    cls: (acc.cls || 0) + (curr.cls || 0),
    fid: (acc.fid || 0) + (curr.fid || 0),
    fcp: (acc.fcp || 0) + (curr.fcp || 0),
    lcp: (acc.lcp || 0) + (curr.lcp || 0),
    ttfb: (acc.ttfb || 0) + (curr.ttfb || 0),
    inp: (acc.inp || 0) + (curr.inp || 0)
  }), { cls: 0, fid: 0, fcp: 0, lcp: 0, ttfb: 0, inp: 0 });

  const count = history.length;
  return {
    cls: totals.cls / count,
    fid: totals.fid / count,
    fcp: totals.fcp / count,
    lcp: totals.lcp / count,
    ttfb: totals.ttfb / count,
    inp: totals.inp / count,
    timestamp: Date.now(),
    url: 'average'
  };
};

// Handler para métricas
const handleMetric = (metric: Metric) => {
  devPerf(`📊 Web Vital: ${metric.name} = ${metric.value}`);
  
  (currentVitals as any)[metric.name.toLowerCase()] = metric.value;
  currentVitals.timestamp = Date.now();
  currentVitals.url = window.location.href;

  // Se temos todas as métricas básicas, salvar
  if (currentVitals.cls !== undefined && currentVitals.lcp !== undefined) {
    const completeVital: WebVitalsData = {
      cls: currentVitals.cls || null,
      fid: currentVitals.fid || null,
      fcp: currentVitals.fcp || null,
      lcp: currentVitals.lcp || null,
      ttfb: currentVitals.ttfb || null,
      inp: currentVitals.inp || null,
      timestamp: currentVitals.timestamp || Date.now(),
      url: currentVitals.url || window.location.href
    };

    vitalsHistory.push(completeVital);
    saveVitalsToStorage(vitalsHistory);
    
    // Reset para próxima medição
    currentVitals = {
      timestamp: Date.now(),
      url: window.location.href
    };
  }
};

export const useWebVitals = () => {
  const [vitalsStats, setVitalsStats] = useState<WebVitalsStats>({
    current: {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      inp: null,
      timestamp: Date.now(),
      url: ''
    },
    average: {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      inp: null,
      timestamp: Date.now(),
      url: 'average'
    },
    count: 0,
    history: []
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    // Carregar histórico do localStorage
    vitalsHistory = loadVitalsFromStorage();
    devPerf(`📈 Web Vitals carregados: ${vitalsHistory.length} registros`);

    // Configurar listeners para Web Vitals
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);

    setIsInitialized(true);

    // Atualizar stats iniciais
    const updateStats = () => {
      const current: WebVitalsData = {
        cls: currentVitals.cls || null,
        fid: currentVitals.fid || null,
        fcp: currentVitals.fcp || null,
        lcp: currentVitals.lcp || null,
        ttfb: currentVitals.ttfb || null,
        inp: currentVitals.inp || null,
        timestamp: currentVitals.timestamp || Date.now(),
        url: currentVitals.url || window.location.href
      };

      setVitalsStats({
        current,
        average: calculateAverages(vitalsHistory),
        count: vitalsHistory.length,
        history: [...vitalsHistory]
      });
    };

    // Atualizar stats a cada 2 segundos
    const interval = setInterval(updateStats, 2000);
    updateStats(); // Primeira atualização imediata

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized]);

  // Função para limpar histórico
  const clearHistory = () => {
    vitalsHistory = [];
    saveVitalsToStorage([]);
    setVitalsStats(prev => ({
      ...prev,
      history: [],
      count: 0,
      average: {
        cls: null,
        fid: null,
        fcp: null,
        lcp: null,
        ttfb: null,
        inp: null,
        timestamp: Date.now(),
        url: 'average'
      }
    }));
    devPerf('🗑️ Histórico de Web Vitals limpo');
  };

  // Função para obter classificação da métrica
  const getMetricRating = (name: string, value: number | null): 'good' | 'needs-improvement' | 'poor' => {
    if (value === null) return 'poor';
    
    switch (name.toLowerCase()) {
      case 'cls':
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
      case 'fid':
      case 'inp':
        return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
      case 'lcp':
        return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
      case 'fcp':
        return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
      case 'ttfb':
        return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
      default:
        return 'poor';
    }
  };

  return {
    vitalsStats,
    clearHistory,
    getMetricRating,
    isInitialized
  };
}; 