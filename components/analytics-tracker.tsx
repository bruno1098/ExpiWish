"use client";

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import { analyticsService } from '@/lib/analytics-service';
import { useWebVitals } from '@/hooks/use-web-vitals';
import { devPerf, devAuth } from '@/lib/dev-logger';

export function AnalyticsTracker() {
  const { isAuthenticated, userData } = useAuth();
  const pathname = usePathname();
  const { vitalsStats } = useWebVitals();

  // Tracking de page views
  useEffect(() => {
    if (isAuthenticated && userData && pathname) {
      const trackPageView = async () => {
        try {
          await analyticsService.trackUserAccess(
            userData.uid,
            userData.email,
            userData.role,
            userData.hotelId,
            userData.hotelName,
            'page_view',
            pathname
          );
          devAuth(`📊 Page view registrada: ${pathname}`);
        } catch (error) {
          devPerf('❌ Erro ao registrar page view:', error);
        }
      };

      // Delay pequeno para evitar tracking excessivo
      const timer = setTimeout(trackPageView, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userData, pathname]);

  // Tracking de performance Web Vitals
  useEffect(() => {
    if (pathname && vitalsStats.current.lcp && vitalsStats.current.lcp > 0) {
      const trackPerformance = async () => {
        try {
          // Calcular tempo de carregamento estimado
          const loadTime = performance.now();
          
          await analyticsService.trackPerformanceMetrics(
            pathname,
            {
              cls: vitalsStats.current.cls,
              fid: vitalsStats.current.fid,
              fcp: vitalsStats.current.fcp,
              lcp: vitalsStats.current.lcp,
              ttfb: vitalsStats.current.ttfb,
              inp: vitalsStats.current.inp
            },
            loadTime,
            userData?.uid
          );
          devPerf(`⚡ Performance registrada: ${pathname} - LCP: ${vitalsStats.current.lcp}ms`);
        } catch (error) {
          devPerf('❌ Erro ao registrar performance:', error);
        }
      };

      // Só trackear se temos dados válidos
      if (vitalsStats.current.lcp && vitalsStats.current.lcp > 0) {
        trackPerformance();
      }
    }
  }, [pathname, vitalsStats.current, userData?.uid]);

  // Tracking de login/logout
  useEffect(() => {
    if (userData) {
      const trackLogin = async () => {
        try {
          await analyticsService.trackUserAccess(
            userData.uid,
            userData.email,
            userData.role,
            userData.hotelId,
            userData.hotelName,
            'login',
            '/auth/login',
            {
              loginTime: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          );
          devAuth(`🔐 Login registrado: ${userData.email}`);
        } catch (error) {
          devPerf('❌ Erro ao registrar login:', error);
        }
      };

      trackLogin();
    }
  }, [userData?.uid]); // Só triggerar quando o UID muda (novo login)

  // Tracking de logout (cleanup ao desmontar ou perder auth)
  useEffect(() => {
    return () => {
      if (userData) {
        const trackLogout = async () => {
          try {
            await analyticsService.trackUserAccess(
              userData.uid,
              userData.email,
              userData.role,
              userData.hotelId,
              userData.hotelName,
              'logout',
              pathname || '/auth/login',
              {
                logoutTime: new Date().toISOString(),
                sessionDuration: analyticsService.getCurrentSession().duration
              }
            );
            devAuth(`🚪 Logout registrado: ${userData.email}`);
          } catch (error) {
            devPerf('❌ Erro ao registrar logout:', error);
          }
        };

        trackLogout();
      }
    };
  }, [!isAuthenticated]); // Triggerar quando perder autenticação

  // Inicializar Google Analytics se disponível
  useEffect(() => {
    // Você pode configurar o GA_TRACKING_ID nas variáveis de ambiente
    const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;
    
    if (GA_TRACKING_ID && typeof window !== 'undefined') {
      analyticsService.initializeGoogleAnalytics(GA_TRACKING_ID);
      devPerf('🔧 Google Analytics configurado:', GA_TRACKING_ID);
    }
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
} 