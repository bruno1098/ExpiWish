"use client";

import React from "react";

interface DarkThemeLayoutProps {
  children: React.ReactNode;
}

export default function DarkThemeLayout({ children }: DarkThemeLayoutProps) {
  return (
    <div className="dark-theme-bg">
      {/* Background com design arquitetônico e elementos visuais */}
      <div className="absolute inset-0 bg-slate-950 overflow-hidden">
        {/* Padrão geométrico no fundo */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.05) 2%, transparent 0%), 
                              radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        ></div>
        
        {/* Elementos de fundo */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-900 blur-3xl opacity-20"></div>
        <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-indigo-900 blur-3xl opacity-20"></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-cyan-900 blur-3xl opacity-20"></div>
        
        {/* Linhas decorativas */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          
          <div className="absolute left-20 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
        </div>
      </div>
      
      {/* Conteúdo */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
} 