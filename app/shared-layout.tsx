"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import TestEnvironmentBanner from "@/components/test-environment-banner"
import { RequireAuth } from "@/lib/auth-context"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Importar o componente
import DarkThemeLayout from "@/components/dark-theme-layout"

export default function SharedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Detectar tema escuro e evitar problemas de hidratação
  useEffect(() => {
    setIsMounted(true)
    
    // Verificar se o sistema está no modo escuro ou se o usuário selecionou o tema escuro
    const isDark = 
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
      document.documentElement.classList.contains('dark');
    
    setIsDarkMode(isDark)
    
    // Ouvir mudanças no tema
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const darkModeChangeHandler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', darkModeChangeHandler);
    
    // Observar mudanças na classe da raiz do documento
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', darkModeChangeHandler);
      observer.disconnect();
    };
  }, []);

  // Conteúdo principal que vai dentro ou fora do layout escuro
  const MainContent = () => (
    <>
        {/* Barra lateral para desktop - sempre visível */}
        <div className="hidden md:flex h-full md:fixed md:inset-y-0 z-[80]">
          <Sidebar />
        </div>
        
        {/* Barra lateral móvel - visível apenas quando ativada */}
        {isMounted && showMobileSidebar && (
          <div className="md:hidden fixed inset-0 z-[90] bg-black/50" onClick={() => setShowMobileSidebar(false)}>
            <div className="h-full w-72" onClick={(e) => e.stopPropagation()}>
              <Sidebar />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 text-white"
                onClick={() => setShowMobileSidebar(false)}
              >
                <X size={24} />
              </Button>
            </div>
          </div>
        )}
        
        <main className="md:pl-[var(--sidebar-width,288px)] transition-all duration-300">
          {/* Banner do ambiente de teste */}
          {isMounted && <TestEnvironmentBanner />}
          
          <Header>
            {isMounted && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden mr-2"
                onClick={() => setShowMobileSidebar(true)}
              >
                <Menu size={24} />
              </Button>
            )}
          </Header>
        
        <div className="p-4 md:p-6">
          {children}
        </div>
        </main>
    </>
  );

  // Renderizar com ou sem o tema escuro
  return (
    <RequireAuth>
      <div className="h-full relative">
        {isMounted && isDarkMode ? (
          <DarkThemeLayout>
            <MainContent />
          </DarkThemeLayout>
        ) : (
          <MainContent />
        )}
      </div>
    </RequireAuth>
  );
} 