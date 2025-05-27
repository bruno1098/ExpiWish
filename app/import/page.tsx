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

// Componente loading simples
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Importação dinâmica do componente principal com loading
const ImportPageContent = dynamic(() => import('./ImportPageContent'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

export default function ImportPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingSpinner />;
  }

  return <ImportPageContent />;
}