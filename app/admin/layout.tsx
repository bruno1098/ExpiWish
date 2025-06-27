"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import DarkThemeLayout from "@/components/dark-theme-layout"
import { RequireAdmin } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  
  // Detectar tema escuro e evitar problemas de hidratação
  useEffect(() => {
    setIsMounted(true)
    
    // Verificar apenas se o usuário selecionou o tema escuro (não o sistema)
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark)
    
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
      observer.disconnect();
    };
  }, []);

  // Aplicar variável CSS baseada no estado da sidebar (sempre 80px inicialmente)
  useEffect(() => {
    if (isMounted) {
      const sidebarWidth = '80px' // Sempre começar com 80px
      document.documentElement.style.setProperty('--sidebar-width', sidebarWidth)
    }
  }, [isMounted])

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
      
      <main className="md:ml-[var(--sidebar-width)] transition-all duration-500 ease-out">
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
      
        <div className="p-4 md:p-6 transition-all duration-500 ease-out">
          {children}
        </div>
      </main>
      <Toaster />
    </>
  );

  return (
    <RequireAdmin>
      <div className="h-full relative">
        {isMounted && isDarkMode ? (
          <DarkThemeLayout>
            <MainContent />
          </DarkThemeLayout>
        ) : (
          <MainContent />
        )}
      </div>
    </RequireAdmin>
  )
} 