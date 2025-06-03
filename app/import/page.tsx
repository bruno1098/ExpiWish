"use client"

import { useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileType, CheckCircle2 } from "lucide-react"
import { storeFeedbacks } from "@/lib/feedback"
import { analyzeWithGPT } from "@/lib/openai-client"
import { useToast } from "@/components/ui/use-toast"
import type { ToastProps } from "@/components/ui/use-toast"
import type { Feedback } from "@/types"
import { saveAnalysis } from "@/lib/firestore-service"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { RequireAuth } from "@/lib/auth-context"
import SharedDashboardLayout from "../shared-layout"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

// Configurações de processamento
const BATCH_SIZE = 40;
const DELAY_BETWEEN_BATCHES = 50;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Função para gerar ID único
const generateUniqueId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes que não suportam crypto.randomUUID
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// Componente loading melhorado
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
        <div className="absolute inset-0 animate-pulse rounded-full h-16 w-16 border-2 border-blue-200"></div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Carregando Análise Inteligente
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Preparando ferramentas de IA...
        </p>
      </div>
    </div>
  </div>
);

// Importação dinâmica otimizada para produção
const ImportPageContent = dynamic(
  () => import('./ImportPageContent').then((mod) => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

export default function ImportPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Garantir hidratação adequada
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <LoadingSpinner />;
  }

  return (
    <RequireAuth>
      <ImportPageContent />
    </RequireAuth>
  );
}