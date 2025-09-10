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

// Contador para garantir IDs únicos mesmo com timestamps idênticos
let idCounter = 0;

// Função para gerar ID único no formato ddmmaa_hhmmss_mmm_counter
const generateUniqueId = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const millisecond = now.getMilliseconds().toString().padStart(3, '0');
  
  // Incrementar contador para garantir unicidade
  idCounter = (idCounter + 1) % 10000; // Reset a cada 10000 para manter o ID curto
  const counter = idCounter.toString().padStart(4, '0');
  
  // Formato: ddmmaa_hhmmss_mmm_counter
  return `${day}${month}${year}_${hour}${minute}${second}_${millisecond}_${counter}`;
};

// Componente loading simples
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Importação dinâmica simplificada
const ImportPageContent = dynamic(
  () => import('./ImportPageContent'),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

export default function ImportPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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