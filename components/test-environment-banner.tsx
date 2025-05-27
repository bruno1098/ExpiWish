"use client";

import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function TestEnvironmentBanner() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);

  useEffect(() => {
    // Verificar se estamos em ambiente de teste
    const checkTestEnvironment = async () => {
      try {
        // Verificar pelo localStorage primeiro (para rápida resposta UI)
        const testFlag = localStorage.getItem('isTestEnvironment') === 'true';
        setIsTestActive(testFlag);
        setIsVisible(testFlag);
        
        // Confirmar com API
        const response = await fetch('/api/test-environment');
        if (response.ok) {
          const data = await response.json();
          setIsTestActive(data.active);
          setIsVisible(data.active);
          
          // Atualizar localStorage baseado na resposta real
          if (data.active) {
            localStorage.setItem('isTestEnvironment', 'true');
          } else {
            localStorage.removeItem('isTestEnvironment');
          }
        }
      } catch (error) {
        console.error("Erro ao verificar ambiente de teste:", error);
      }
    };
    
    checkTestEnvironment();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-500 text-black py-2 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span className="font-medium">Você está em um ambiente de teste. Dados inseridos aqui não afetarão o ambiente de produção.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="default" 
          className="bg-white text-yellow-700 hover:bg-yellow-100 border-yellow-600"
          onClick={() => router.push('/ambiente-teste')}
        >
          Gerenciar Ambiente
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white text-yellow-700 hover:bg-yellow-100 border-yellow-600"
          onClick={() => router.push('/ambiente-teste/dashboard')}
        >
          Dashboard
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-black hover:bg-yellow-400"
          onClick={() => {
            localStorage.removeItem('isTestEnvironment');
            setIsVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 