"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import DarkThemeLayout from "@/components/dark-theme-layout"
import { RequireAdmin } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
      <div className="h-full relative">
        <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-[#111827]">
          <Sidebar />
        </div>
        <main className="md:pl-72">
          <Header>
            <div className="md:hidden">
              <Sidebar />
            </div>
          </Header>
        <div className="p-4 md:p-6">
          {children}
        </div>
        </main>
        <Toaster />
      </div>
  );

  return (
    <RequireAdmin>
      {isMounted && isDarkMode ? (
        <DarkThemeLayout>
          <MainContent />
        </DarkThemeLayout>
      ) : (
        <MainContent />
      )}
    </RequireAdmin>
  )
} 