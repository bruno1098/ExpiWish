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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Detectar tema escuro e evitar problemas de hidratação
  useEffect(() => {
    setIsMounted(true)
    
    // Verificar apenas se o usuário selecionou o tema escuro (não o sistema)
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark)

    // Verificar estado inicial da sidebar
    const storedState = localStorage.getItem('sidebarCollapsed')
    setSidebarCollapsed(storedState === 'true')
    
    // Observar mudanças na classe da raiz do documento
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });

    // Ouvir mudanças no localStorage da sidebar
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed' && e.newValue !== null) {
        setSidebarCollapsed(e.newValue === 'true')
      }
    }

    // Ouvir evento customizado da sidebar
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed)
    }

    // Função para verificar mudanças no localStorage
    const checkSidebarState = () => {
      const newState = localStorage.getItem('sidebarCollapsed')
      setSidebarCollapsed(newState === 'true')
    }

    // Verificar mudanças a cada 100ms (para capturar atualizações rápidas)
    const interval = setInterval(checkSidebarState, 100)

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('sidebarToggle', handleSidebarToggle as EventListener)
    
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sidebarToggle', handleSidebarToggle as EventListener)
      clearInterval(interval)
    };
  }, []);

  // Aplicar variável CSS baseada no estado da sidebar
  useEffect(() => {
    if (isMounted) {
      const sidebarWidth = sidebarCollapsed ? '80px' : '288px'
      document.documentElement.style.setProperty('--sidebar-width', sidebarWidth)
    }
  }, [sidebarCollapsed, isMounted])

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
        
        <main className="md:ml-[var(--sidebar-width,288px)] transition-all duration-300 ease-in-out">
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
        
        <div className="p-4 md:p-6 transition-all duration-300 ease-in-out">
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