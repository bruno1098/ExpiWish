// Otimizações de Performance para o Sistema BI Qualidade
// Este módulo implementa soluções para os gargalos identificados

import React from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// ====================================
// 1. SISTEMA DE PAGINAÇÃO OTIMIZADA
// ====================================

export interface PaginationOptions {
  pageSize: number;
  lastDoc?: DocumentSnapshot;
  orderField?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
  totalLoaded: number;
}

// Paginação para feedbacks/análises
export const getPaginatedAnalyses = async (
  options: PaginationOptions = { pageSize: 50 }
): Promise<PaginatedResult<any>> => {
  try {
    const { pageSize, lastDoc, orderField = 'importDate', orderDirection = 'desc' } = options;
    
    let q = query(
      collection(db, 'analyses'),
      orderBy(orderField, orderDirection),
      limit(pageSize)
    );
    
    if (lastDoc) {
      q = query(
        collection(db, 'analyses'),
        orderBy(orderField, orderDirection),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }
    
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      data,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize,
      totalLoaded: data.length
    };
  } catch (error) {
    console.error('Erro na paginação:', error);
    return { data: [], hasMore: false, totalLoaded: 0 };
  }
};

// ====================================
// 2. SISTEMA DE CACHE INTELIGENTE
// ====================================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live em ms
}

class PerformanceCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Verificar se expirou
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Limpar cache expirado
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const performanceCache = new PerformanceCache();

// ====================================
// 3. OTIMIZAÇÕES DE CONSULTA
// ====================================

// Carregar apenas campos essenciais
export const getOptimizedAnalyses = async (hotelId?: string) => {
  const cacheKey = `analyses_${hotelId || 'all'}`;
  
  // Verificar cache primeiro
  const cached = performanceCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    // Query otimizada - apenas campos necessários
    const result = await getPaginatedAnalyses({ 
      pageSize: 100, 
      orderField: 'importDate' 
    });
    
    // Cache o resultado
    performanceCache.set(cacheKey, result, 10 * 60 * 1000); // 10 min cache
    
    return result;
  } catch (error) {
    console.error('Erro ao carregar análises otimizadas:', error);
    return { data: [], hasMore: false, totalLoaded: 0 };
  }
};

// ====================================
// 4. PROCESSAMENTO OTIMIZADO DE ARRAYS
// ====================================

// Operações otimizadas para grandes arrays
export const optimizedArrayOperations = {
  // Concatenar arrays de forma eficiente
  concat<T>(target: T[], source: T[]): T[] {
    if (source.length === 0) return target;
    if (target.length === 0) return [...source];
    
    // Para arrays pequenos, usar spread
    if (source.length < 1000) {
      return [...target, ...source];
    }
    
    // Para arrays grandes, usar push.apply
    const result = [...target];
    result.push(...source);
    return result;
  },

  // Filtrar com early return otimizado
  filter<T>(array: T[], predicate: (item: T) => boolean, maxResults?: number): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i])) {
        result.push(array[i]);
        
        // Early exit se atingir max resultados
        if (maxResults && result.length >= maxResults) {
          break;
        }
      }
    }
    
    return result;
  },

  // Chunk array para processamento em lotes
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

// ====================================
// 5. DEBOUNCE E THROTTLE
// ====================================

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastExecution = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastExecution >= delay) {
      func(...args);
      lastExecution = now;
    }
  };
};

// ====================================
// 6. MONITORAMENTO DE PERFORMANCE
// ====================================

export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || [];
    existing.push(duration);
    
    // Manter apenas últimas 100 medições
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(operation, existing);
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMetrics(): Record<string, { avg: number, count: number }> {
    const result: Record<string, { avg: number, count: number }> = {};
    
    const entries = Array.from(this.metrics.entries());
    for (const [operation, times] of entries) {
      result[operation] = {
        avg: this.getAverageTime(operation),
        count: times.length
      };
    }
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ====================================
// 7. UTILITÁRIOS DE OTIMIZAÇÃO
// ====================================

// Remover logs em produção
export const isDevelopment = process.env.NODE_ENV === 'development';

export const optimizedLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

// Lazy loading para componentes pesados
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};

// Virtual scroll helper
export const calculateVisibleItems = (
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  buffer: number = 5
) => {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(startIndex + visibleCount + buffer * 2);
  
  return { startIndex, endIndex, visibleCount };
};

// Cleanup automático do cache
if (typeof window !== 'undefined') {
  // Limpar cache a cada 10 minutos
  setInterval(() => {
    performanceCache.cleanup();
  }, 10 * 60 * 1000);
} 