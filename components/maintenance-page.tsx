'use client';

import { useEffect, useState } from 'react';
import { Wrench, Clock, Mail, Phone, AlertTriangle } from 'lucide-react';
import { MAINTENANCE_CONFIG, getMaintenanceStatus } from '@/lib/maintenance-config';

export function MaintenancePage() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [dots, setDots] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Marca que estamos no cliente para evitar erro de hidratação
    setIsClient(true);
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const dotsTimer = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(dotsTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efeitos de fundo animados */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 bg-white/20 rounded-full animate-ping`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo e título */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Wrench className="w-10 h-10 text-white animate-bounce" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/50 to-purple-600/50 rounded-2xl blur-lg -z-10 animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              {MAINTENANCE_CONFIG.TITLE}
            </span>
          </h1>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            <span className="text-xl text-gray-300 font-medium">{MAINTENANCE_CONFIG.SUBTITLE}</span>
            <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          </div>
        </div>

        {/* Card principal */}
        <div className="relative">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl">
            {/* Status */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 backdrop-blur-sm rounded-full border border-yellow-400/30">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-200 font-semibold">Em Manutenção</span>
              </div>
            </div>

            {/* Mensagem principal */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {MAINTENANCE_CONFIG.MAIN_MESSAGE}{dots}
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                {MAINTENANCE_CONFIG.DESCRIPTION}
              </p>
            </div>

            {/* Informações de tempo */}
            {MAINTENANCE_CONFIG.SHOW_CURRENT_TIME && (
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Horário Atual</h3>
                  </div>
                  <div suppressHydrationWarning>
                    {isClient && currentTime ? (
                      <>
                        <p className="text-2xl font-mono text-blue-300">
                          {currentTime.toLocaleTimeString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {currentTime.toLocaleDateString('pt-BR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-mono text-blue-300">
                          --:--:--
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Carregando...
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <Wrench className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Status</h3>
                  </div>
                  <p className="text-lg text-purple-300 font-semibold">
                    {getMaintenanceStatus()}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Atualizações em andamento
                  </p>
                </div>
              </div>
            )}

            {/* Informações de contato */}
            {MAINTENANCE_CONFIG.SHOW_CONTACT_INFO && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Precisa de Ajuda?
                </h3>
                <p className="text-gray-300 mb-4">
                  Se você tem alguma urgência ou precisa acessar informações críticas, entre em contato com nossa equipe de suporte.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{MAINTENANCE_CONFIG.SUPPORT_EMAIL}</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-300">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{MAINTENANCE_CONFIG.SUPPORT_PHONE}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mensagem de agradecimento */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-gray-400 text-sm">
                Agradecemos sua compreensão. Voltaremos em breve com uma experiência ainda melhor!
              </p>
            </div>
          </div>

          {/* Efeito de brilho no card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-xl -z-10"></div>
        </div>

        {/* Indicador de carregamento */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}