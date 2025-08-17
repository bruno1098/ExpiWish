"use client"

import { useState, useEffect, useRef } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Upload, FileType, CheckCircle2, FolderOpen, Coffee, Zap, Brain, Clock, SparklesIcon, FileIcon, BarChart3, RefreshCw, AlertCircle, Timer, X, Settings, Users } from "lucide-react"
import { storeFeedbacks } from "@/lib/feedback"
import { analyzeWithGPT } from "@/lib/openai-client"
import { useToast } from "@/components/ui/use-toast"
import type { ToastProps } from "@/components/ui/use-toast"
import type { Feedback } from "@/types"
import { saveAnalysis } from "@/lib/firestore-service"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import SharedDashboardLayout from "../shared-layout"
import { cn } from "@/lib/utils"
import { getPerformanceProfile, estimateProcessingTime, formatEstimatedTime } from "@/lib/performance-config"

// Configurações de processamento - OTIMIZADAS PARA PERFORMANCE
const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES = 20;
const CONCURRENT_REQUESTS = 5;
const REQUEST_DELAY = 50;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Função para gerar ID único no formato ddmmaa_hhmmss_mmm
const generateUniqueId = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const millisecond = now.getMilliseconds().toString().padStart(3, '0');
  
  // Formato: ddmmaa_hhmmss_mmm
  return `${day}${month}${year}_${hour}${minute}${second}_${millisecond}`;
};

// Mensagens motivadoras baseadas no progresso
const getMotivationalMessage = (progress: number, totalItems: number) => {
  if (progress < 10) {
    return {
      title: "Iniciando análise inteligente",
      description: "Preparando os motores da IA para analisar seus feedbacks",
      icon: <Zap className="h-5 w-5 text-blue-500" />
    };
  } else if (progress < 25) {
    return {
      title: "IA trabalhando na análise",
      description: totalItems > 100 ? "Arquivo grande detectado. Recomendamos aguardar - você pode usar outras abas enquanto processamos" : "Analisando padrões e sentimentos dos feedbacks",
      icon: <Brain className="h-5 w-5 text-purple-500" />
    };
  } else if (progress < 50) {
    return {
      title: "Processamento em andamento",
      description: totalItems > 200 ? "Nossa IA está trabalhando continuamente. Aproveite para outras atividades" : "Identificando problemas e oportunidades nos dados",
      icon: <SparklesIcon className="h-5 w-5 text-yellow-500" />
    };
  } else if (progress < 75) {
    return {
      title: "Finalizando análise",
      description: totalItems > 300 ? "Processo quase concluído. Aguarde mais alguns instantes" : "Organizando insights e estatísticas finais",
      icon: <Clock className="h-5 w-5 text-green-500" />
    };
  } else if (progress < 95) {
    return {
      title: "Aplicando últimos ajustes",
      description: "Finalizando o processamento com inteligência artificial",
      icon: <SparklesIcon className="h-5 w-5 text-pink-500" />
    };
  } else {
    return {
      title: "Quase pronto",
      description: "Salvando análise na nuvem. Você receberá os resultados em breve",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    };
  }
};

// Componente de progresso animado
const AnimatedProgress = ({ value, className }: { value: number; className?: string }) => {
  return (
    <div className={cn("relative", className)}>
      <Progress 
        value={value} 
        className="h-3 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-full"
      />
      <div 
        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${value}%` }}
      >
        <div className="h-full w-full bg-white/20 animate-pulse rounded-full"></div>
        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-full"></div>
      </div>
    </div>
  );
};

// Componente de estatísticas em tempo real melhorado
const LiveStats = ({ processed, total, currentStep, retryCount, errorCount, startTime, performanceProfile }: { 
  processed: number; 
  total: number; 
  currentStep: string;
  retryCount: number;
  errorCount: number;
  startTime: Date | null;
  performanceProfile?: any;
}) => {
  const [processingRate, setProcessingRate] = useState(0);
  const [eta, setEta] = useState("");

  useEffect(() => {
    if (startTime && processed > 0) {
      const elapsedMs = Date.now() - startTime.getTime();
      const elapsedSeconds = elapsedMs / 1000;
      const rate = processed / elapsedSeconds;
      setProcessingRate(rate);
      
      if (rate > 0) {
        const remainingItems = total - processed;
        const remainingSeconds = remainingItems / rate;
        
        if (remainingSeconds < 60) {
          setEta(`${Math.ceil(remainingSeconds)}s restantes`);
        } else if (remainingSeconds < 3600) {
          setEta(`${Math.ceil(remainingSeconds / 60)}min restantes`);
        } else {
          setEta(`${Math.ceil(remainingSeconds / 3600)}h restantes`);
        }
      }
    }
  }, [processed, startTime, total]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <FileIcon className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Processados</span>
        </div>
        <div className="text-2xl font-bold text-blue-600 mt-1">{processed}</div>
        <div className="text-xs text-blue-500 mt-1">{total > 0 ? Math.round((processed / total) * 100) : 0}% concluído</div>
      </div>
      
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Velocidade</span>
        </div>
        <div className="text-2xl font-bold text-purple-600 mt-1">{processingRate.toFixed(1)}</div>
        <div className="text-xs text-purple-500 mt-1">itens/segundo</div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">ETA</span>
        </div>
        <div className="text-lg font-bold text-emerald-600 mt-1">{eta || "Calculando..."}</div>
        <div className="text-xs text-emerald-500 mt-1">{total - processed} restantes</div>
      </div>
      
      {retryCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Tentativas</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{retryCount}</div>
        </div>
      )}
      
      {errorCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900 dark:text-red-100">Erros</span>
          </div>
          <div className="text-2xl font-bold text-red-600 mt-1">{errorCount}</div>
        </div>
      )}
      
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 col-span-2 md:col-span-1">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-900 dark:text-green-100">Perfil</span>
        </div>
        <div className="text-sm font-semibold text-green-600 mt-1">
          {performanceProfile ? 
            `${performanceProfile.CHUNK_SIZE} itens/lote` : 
            'Automático'
          }
        </div>
        <div className="text-xs text-green-500 mt-1">
          {performanceProfile?.CONCURRENT_REQUESTS || 5} paralelo
        </div>
      </div>
    </div>
  );
};

function ImportPageContent() {
  const { toast } = useToast()
  const [progress, setProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [complete, setComplete] = useState(false)
  const router = useRouter()
  const { userData } = useAuth();
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [isTestEnvironment, setIsTestEnvironment] = useState(false);
  
  // Estados para o controle do modelo
  const [useNormalMode, setUseNormalMode] = useState(true);
  const [lastProgressToast, setLastProgressToast] = useState(0);

  // Estados para a UI melhorada
  const [processedItems, setProcessedItems] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [currentStep, setCurrentStep] = useState("Preparando...");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // AbortController para cancelar requisições em andamento
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref para o input file
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para o AlertDialog de API Key
  const [showApiKeyAlert, setShowApiKeyAlert] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Estados para o modal de confirmação de nome do arquivo
  const [showFileNameConfirmation, setShowFileNameConfirmation] = useState(false);
  const [fileToConfirm, setFileToConfirm] = useState<File | null>(null);

  useEffect(() => {
    const checkTestEnvironment = async () => {
      try {
        if (typeof window !== 'undefined') {
          const testFlag = localStorage.getItem('isTestEnvironment') === 'true';
          setIsTestEnvironment(testFlag);
        }
        
        const response = await fetch('/api/test-environment');
        if (response.ok) {
          const data = await response.json();
          setIsTestEnvironment(data.active);
          
          if (typeof window !== 'undefined') {
            if (data.active) {
              localStorage.setItem('isTestEnvironment', 'true');
            } else {
              localStorage.removeItem('isTestEnvironment');
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar ambiente de teste:", error);
      }
    };
    
    const handleApiKeyChanged = () => {
      // Se há um arquivo pendente e agora há uma API key, processar o arquivo
      if (pendingFile && checkApiKey()) {
        setShowApiKeyAlert(false);
        const fileToProcess = pendingFile;
        setPendingFile(null);
        
        // Verificar se precisa de confirmação de nome do arquivo
        const hotelName = userData?.hotelName || '';
        if (!validateFileName(fileToProcess.name, hotelName)) {
          setFileToConfirm(fileToProcess);
          setShowFileNameConfirmation(true);
        } else {
          processFileWithAccountHotel(fileToProcess);
        }
      }
    };
    
    checkTestEnvironment();

    // Listener para mudanças na API key
    window.addEventListener('apiKeyChanged', handleApiKeyChanged);

    // Event listeners globais SIMPLIFICADOS - apenas prevenir comportamento padrão
    const preventDefaultDrop = (e: DragEvent) => {
      const target = e.target as Element;
      const isInDropzone = target?.closest('[data-dropzone="true"]');
      
      // Apenas prevenir fora da dropzone
      if (!isInDropzone) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Adicionar apenas os listeners essenciais
    document.addEventListener('dragover', preventDefaultDrop, false);
    document.addEventListener('drop', preventDefaultDrop, false);

    // Cleanup
    return () => {
      document.removeEventListener('dragover', preventDefaultDrop, false);
      document.removeEventListener('drop', preventDefaultDrop, false);
      window.removeEventListener('apiKeyChanged', handleApiKeyChanged);
    };
  }, [pendingFile]);

  // Hook para calcular tempo estimado
  useEffect(() => {
    if (importing && startTime && progress > 5) {
      const elapsedTime = Date.now() - startTime.getTime();
      const estimatedTotal = (elapsedTime / progress) * 100;
      const remainingTime = estimatedTotal - elapsedTime;
      
      if (remainingTime > 0) {
        const minutes = Math.ceil(remainingTime / (60 * 1000));
        if (minutes > 1) {
          setEstimatedTime(`~${minutes} minutos restantes`);
        } else {
          setEstimatedTime("Quase terminando...");
        }
      }
    }
  }, [progress, importing, startTime]);

  // Função para verificar se a API key está configurada
  const checkApiKey = () => {
    const apiKey = localStorage.getItem('openai-api-key');
    return apiKey && apiKey.trim() !== '';
  };

  // Função para validar o nome do arquivo
  const validateFileName = (fileName: string, hotelName: string): boolean => {
    if (!hotelName) return false;
    
    // Converter para lowercase para comparação case-insensitive
    const fileNameLower = fileName.toLowerCase();
    const hotelNameLower = hotelName.toLowerCase();
    
    // Verificar se o nome do hotel está presente no nome do arquivo
    // Também aceitar variações comuns como "wish", "hotel", etc.
    const hotelKeywords = [
      hotelNameLower,
      'wish',
      'hotel',
      'feedback',
     
    ];
    
    return hotelKeywords.some(keyword => fileNameLower.includes(keyword));
  };

  const onDrop = async (files: File[]) => {
    if (files.length === 0) return;
    setAcceptedFiles(files);

    if (!userData || !userData.hotelId) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar autenticado e associado a um hotel para importar dados.",
        variant: "destructive",
      } as ToastProps);
      return;
    }

    // Verificar se a API key está configurada antes de processar
    if (!checkApiKey()) {
      setPendingFile(files[0]);
      setShowApiKeyAlert(true);
      return;
    }

    const file = files[0];
    const hotelName = userData?.hotelName || '';
    
    // Validar o nome do arquivo
    if (!validateFileName(file.name, hotelName)) {
      setFileToConfirm(file);
      setShowFileNameConfirmation(true);
      return;
    }

    processFileWithAccountHotel(file);
  };

  // Funções para lidar com o AlertDialog de API Key
  const handleGoToSettings = () => {
    setShowApiKeyAlert(false);
    setPendingFile(null);
    router.push('/settings');
  };

  const handleCancelApiKeyAlert = () => {
    setShowApiKeyAlert(false);
    setPendingFile(null);
  };

  // Funções para lidar com o modal de confirmação de nome do arquivo
  const handleConfirmFileName = () => {
    if (fileToConfirm) {
      setShowFileNameConfirmation(false);
      const file = fileToConfirm;
      setFileToConfirm(null);
      processFileWithAccountHotel(file);
    }
  };

  const handleCancelFileNameConfirmation = () => {
    setShowFileNameConfirmation(false);
    setFileToConfirm(null);
  };

  const processFileWithAccountHotel = async (file: File) => {
    setImporting(true);
    setProgress(0);
    setLastProgressToast(0);
    setStartTime(new Date());
    setCurrentStep("Lendo arquivo...");
    setRetryCount(0);
    setErrorCount(0);
    setIsCancelled(false);
    setIsProcessing(true);
    
    // Criar novo AbortController para esta análise
    abortControllerRef.current = new AbortController();
    
    toast({
      title: "Iniciando Análise Inteligente",
      description: `Preparando para processar ${file.name} com nossa IA`,
    });

    try {
      let data: any[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      const hotelName = userData?.hotelName || '';
      const hotelId = userData?.hotelId || '';

      setCurrentStep("Extraindo dados do arquivo...");
      setProgress(5);

      // Função helper para formatar data do Excel
      const formatExcelDate = (excelDate: any): string => {

        // Se não há data, não usar fallback - retornar data atual com aviso
        if (excelDate == null || excelDate === '' || excelDate === undefined) {
          console.error('⚠️ ATENÇÃO: Data da coluna B está vazia! Usando data atual como fallback.');
          console.error('Isso pode indicar que:');
          console.error('1. A coluna B não contém dados de data');
          console.error('2. O formato da planilha está diferente do esperado');
          console.error('3. As datas estão em outra coluna');
          return new Date().toISOString();
        }
        
        try {
          let date: Date;
          
          // CASO 1: Número (Serial Date do Excel)
          if (typeof excelDate === 'number') {
            
            // Excel serial date: 1 = 1/1/1900, ajuste para JavaScript
            if (excelDate > 0 && excelDate < 2958466) { // Validar range razoável (1900-9999)
              date = new Date((excelDate - 25569) * 86400 * 1000);
              console.log('✅ Data convertida do serial:', date.toISOString());
            } else {
              console.error('❌ Número serial fora do range válido:', excelDate);
              return new Date().toISOString();
            }
          } 
          // CASO 2: String com formato de data
          else if (typeof excelDate === 'string' && excelDate.trim() !== '') {
            
            const trimmedDate = excelDate.trim();
            
            // Formato brasileiro DD/MM/YYYY ou DD/MM/YY
            if (trimmedDate.includes('/')) {
              const parts = trimmedDate.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                let year = parts[2];
                
                // Ajustar ano de 2 dígitos
                if (year.length === 2) {
                  const currentYear = new Date().getFullYear();
                  const century = Math.floor(currentYear / 100) * 100;
                  year = (parseInt(year) + century).toString();
                }
                
                const isoString = `${year}-${month}-${day}`;
                date = new Date(isoString);
                console.log('✅ Data convertida do formato DD/MM/YYYY:', isoString, '→', date.toISOString());
              } else {
                date = new Date(trimmedDate);
              }
            }
            // Formato ISO YYYY-MM-DD
            else if (trimmedDate.includes('-')) {
              date = new Date(trimmedDate);
              console.log('✅ Data convertida do formato ISO:', date.toISOString());
            }
            // Outros formatos
            else {
              date = new Date(trimmedDate);
              console.log('✅ Data convertida (formato automático):', date.toISOString());
            }
          }
          // CASO 3: Já é um objeto Date
          else if (excelDate instanceof Date) {
            
            date = excelDate;
          }
          // CASO 4: Formato não reconhecido
          else {
            console.error('❌ Formato de data não reconhecido:', excelDate);
            console.error('Tipo recebido:', typeof excelDate);
            console.error('Valor:', excelDate);
            return new Date().toISOString();
          }
          
          // Validar se a data resultante é válida
          if (isNaN(date.getTime())) {
            console.error('❌ Data inválida após conversão:', date);
            console.error('Valor original:', excelDate);
            return new Date().toISOString();
          }
          
          // Verificar se a data está em um range razoável
          const year = date.getFullYear();
          if (year < 1900 || year > 2100) {
            console.error('❌ Data fora do range esperado (1900-2100):', date);
            console.error('Valor original:', excelDate);
            return new Date().toISOString();
          }
          
          const result = date.toISOString();

          return result;
          
        } catch (error) {
          console.error('❌ ERRO ao processar data:', error);
          console.error('Valor original:', excelDate);
          console.error('Tipo:', typeof excelDate);
          return new Date().toISOString();
        }
      };

      if (extension === 'xlsx') {
        const { read, utils } = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const range = utils.decode_range(worksheet['!ref'] || 'A1');
        const rows = [];
        
        // Começar da linha 2 para pular o cabeçalho (índice 1 = linha 2 no Excel)
        for (let row = 1; row <= range.e.r; row++) {
          const cellB = worksheet[utils.encode_cell({ r: row, c: 1 })]; // Coluna B (data do feedback)
          const dataFeedback = cellB?.v || cellB?.w; // Tentar valor formatado (.w) se valor bruto (.v) não existir

          const nomeHotel = worksheet[utils.encode_cell({ r: row, c: 2 })]?.v;
          const fonte = worksheet[utils.encode_cell({ r: row, c: 3 })]?.v;
          const idioma = worksheet[utils.encode_cell({ r: row, c: 4 })]?.v;
          const pontuacao = worksheet[utils.encode_cell({ r: row, c: 5 })]?.v;
          const url = worksheet[utils.encode_cell({ r: row, c: 6 })]?.v;
          const autor = worksheet[utils.encode_cell({ r: row, c: 7 })]?.v;
          const titulo = worksheet[utils.encode_cell({ r: row, c: 8 })]?.v;
          const texto = worksheet[utils.encode_cell({ r: row, c: 9 })]?.v;
          const apartamento = worksheet[utils.encode_cell({ r: row, c: 10 })]?.v;
          
          if (texto && 
              typeof texto === 'string' && 
              texto.trim() !== '' && 
              texto.trim().length > 5 && 
              !/^\d+$/.test(texto.trim()) &&
              !/^[^\w\s]+$/.test(texto.trim())) {
            
            const formattedDate = formatExcelDate(dataFeedback);
            
            rows.push({
              dataFeedback: formattedDate, // Usar data real do feedback
              nomeHotel: nomeHotel || hotelName,
              fonte: fonte || '',
              idioma: idioma || '',
              pontuacao: pontuacao || 0,
              texto: texto.trim(),
              url: url || '',
              autor: autor || '',
              titulo: titulo || '',
              apartamento: apartamento || ''
            });
          }
        }
        
        data = rows;
      } else if (extension === 'csv') {
        const Papa = (await import('papaparse')).default;
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        
        data = (result.data as any[])
          .filter(row => {
            return row && 
                   typeof row === 'object' && 
                   row.texto && 
                   typeof row.texto === 'string' &&
                   row.texto.trim().length > 5 &&
                   !/^\d+$/.test(row.texto.trim()) &&
                   !/^[^\w\s]+$/.test(row.texto.trim());
          })
          .map(row => {
            return {
              ...row,
              texto: row.texto.trim(),
              nomeHotel: hotelName,
              dataFeedback: formatExcelDate(row.data) // Usar data do CSV se disponível
            };
          });
      }
      
      if (data.length === 0) {
        toast({
          title: "Nenhum Texto Válido Encontrado",
          description: "Verifique se a coluna J contém os feedbacks em texto.",
          variant: "destructive",
        } as ToastProps);
        setImporting(false);
        return;
      }
      
      // Definir totais para estatísticas
      setTotalItems(data.length);
      setProcessedItems(0);
      setProgress(10);

      const processDataInChunks = async (data: any[]): Promise<Feedback[]> => {
        const result: Feedback[] = [];
        
        // Usar configurações adaptativas baseadas no tamanho dos dados
        const performanceProfile = getPerformanceProfile(data.length);
        const chunkSize = performanceProfile.CHUNK_SIZE;
        const concurrentRequests = performanceProfile.CONCURRENT_REQUESTS;
        const requestDelay = performanceProfile.REQUEST_DELAY;
        const delayBetweenBatches = performanceProfile.DELAY_BETWEEN_BATCHES;
        
        // Mostrar estimativa de tempo
        const estimatedSeconds = estimateProcessingTime(data.length);
        const estimatedTimeStr = formatEstimatedTime(estimatedSeconds);
        setEstimatedTime(estimatedTimeStr);
        
        setCurrentStep(`Processando ${data.length} itens com perfil ${data.length < 100 ? 'LEVE' : data.length < 500 ? 'MÉDIO' : 'PESADO'} - ${estimatedTimeStr}`);
        
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }

        // Obter a API Key das configurações
        const apiKey = localStorage.getItem('openai-api-key');
        if (!apiKey) {
          throw new Error('API Key não configurada. Configure nas Configurações para usar a análise inteligente.');
        }
        
        setCurrentStep("Analisando feedbacks com IA...");

        // Função helper para fazer retry com backoff exponencial
        const retryWithBackoff = async (fn: Function, maxRetries: number = performanceProfile.MAX_RETRIES): Promise<any> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const result = await fn();
              if (attempt > 1) {
                setRetryCount(prev => prev - 1);
              }
              return result;
            } catch (error: any) {
              const isLastAttempt = attempt === maxRetries;
              
              if (attempt === 1) {
                setRetryCount(prev => prev + 1);
              }
              
              if (isLastAttempt || !error.message.includes('HTTP error! status: 5')) {
                if (isLastAttempt) {
                  setErrorCount(prev => prev + 1);
                  setRetryCount(prev => Math.max(0, prev - 1));
                }
                throw error;
              }
              
              const delayTime = Math.pow(performanceProfile.RETRY_BACKOFF_MULTIPLIER, attempt - 1) * performanceProfile.RETRY_BASE_DELAY;
              setCurrentStep(`Resolvendo problemas temporários... (tentativa ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delayTime));
            }
          }
        };

        // Função para processar um batch em paralelo
        const processBatchParallel = async (batch: any[]): Promise<Feedback[]> => {
          const batchResults: Feedback[] = [];
          
          // Verificar cancelamento antes de processar
          if (isCancelled) {
            throw new Error('Análise cancelada pelo usuário');
          }
          
          // Dividir o batch em grupos menores para processamento paralelo
          const groups = [];
          for (let i = 0; i < batch.length; i += concurrentRequests) {
            groups.push(batch.slice(i, i + concurrentRequests));
          }
          
          for (const group of groups) {
            // Verificar cancelamento a cada grupo
            if (isCancelled) {
              throw new Error('Análise cancelada pelo usuário');
            }
            // Processar cada grupo em paralelo
            const promises = group.map(async (row, index) => {
              // Verificar cancelamento antes de processar cada item
              if (isCancelled || abortControllerRef.current?.signal.aborted) {
                throw new Error('Análise cancelada pelo usuário');
              }
              
              // Pequeno delay escalonado para evitar sobrecarga
              await delay(index * requestDelay);
              
              try {
                const analysisResult = await retryWithBackoff(async () => {
                  // Verificar cancelamento antes de fazer a requisição
                  if (isCancelled || abortControllerRef.current?.signal.aborted) {
                    throw new Error('Análise cancelada pelo usuário');
                  }
                  
                  const response = await fetch('/api/analyze-feedback', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      texto: row.texto,
                      apiKey: apiKey,
                    }),
                    signal: abortControllerRef.current?.signal, // Adicionar signal para cancelamento
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const result = await response.json();
                  
                  if (result.error) {
                    throw new Error(result.error);
                  }

                  return result;
                });

                const rating = analysisResult.rating || 3;
                
                // Processar múltiplos problemas da nova estrutura
                let allProblems: Array<{keyword: string, sector: string, problem: string}> = [];
                let keyword = 'Não identificado';
                let sector = 'Não identificado';
                let problem = '';
                
                if (analysisResult.problems && Array.isArray(analysisResult.problems)) {
                  // Nova estrutura com múltiplos problemas
                  allProblems = analysisResult.problems;
                  // Concatenar todos os problemas com separador ";" removendo duplicatas
                  if (allProblems.length > 0) {
                    // Usar Set para remover duplicatas
                    const uniqueKeywords = Array.from(new Set(allProblems.map(p => p.keyword)));
                    const uniqueSectors = Array.from(new Set(allProblems.map(p => p.sector)));
                    const uniqueProblems = Array.from(new Set(allProblems.map(p => p.problem).filter(p => p.trim() !== '')));
                    
                    keyword = uniqueKeywords.join(';');
                    sector = uniqueSectors.join(';');
                    problem = uniqueProblems.join(';');
                  }
                } else if (analysisResult.response && typeof analysisResult.response === 'string') {
                  // Compatibilidade com estrutura antiga
                  const rawResponse = analysisResult.response;
                  const parts = rawResponse.split(',').map((part: string) => part.trim());
                  keyword = parts[0] || 'Não identificado';
                  sector = parts[1] || 'Não identificado';
                  problem = parts[2] || '';
                  
                  // Adicionar como problema único
                  allProblems = [{ keyword, sector, problem }];
                }
                    
                return {
                  id: generateUniqueId(),
                  date: row.dataFeedback,
                  comment: row.texto,
                  rating: rating,
                  sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
                  keyword: keyword,
                  sector: sector,
                  problem: problem,
                  hotel: row.nomeHotel,
                  hotelId: hotelId,
                  source: row.fonte || '',
                  language: row.idioma || '',
                  score: row.pontuacao || undefined,
                  url: row.url || undefined,
                  author: row.autor || undefined,
                  title: row.titulo || undefined,
                  apartamento: row.apartamento || undefined,
                  allProblems: allProblems // Armazenar todos os problemas detectados
                } as Feedback;
                  
              } catch (error: any) {
                // Se for cancelamento, propagar o erro
                if (error.message.includes('cancelada') || error.name === 'AbortError') {
                  throw error;
                }
                
                console.error(`Erro ao processar feedback após todas as tentativas:`, error);
                
                return {
                  id: generateUniqueId(),
                  date: row.dataFeedback,
                  comment: row.texto,
                  rating: 3,
                  sentiment: 'neutral',
                  keyword: 'Erro de Processamento',
                  sector: 'Não identificado',
                  problem: 'Falha na análise',
                  hotel: row.nomeHotel,
                  hotelId: hotelId,
                  source: row.fonte || '',
                  language: row.idioma || '',
                  score: row.pontuacao || undefined,
                  url: row.url || undefined,
                  author: row.autor || undefined,
                  title: row.titulo || undefined,
                  apartamento: row.apartamento || undefined,
                  allProblems: [] // Armazenar um array vazio para problemas
                } as Feedback;
              }
            });
            
            // Aguardar todas as requisições do grupo terminarem
            try {
              const groupResults = await Promise.all(promises);
              batchResults.push(...groupResults);
            } catch (error: any) {
              // Se alguma promessa foi cancelada, parar imediatamente
              if (error.message.includes('cancelada') || error.name === 'AbortError') {
                throw error;
              }
              // Se for outro erro, continuar com os resultados parciais
              throw error;
            }
            
            // Atualizar progresso
            const currentProcessed = result.length + batchResults.length;
            setProcessedItems(currentProcessed);
            const analysisProgress = 10 + ((currentProcessed / data.length) * 80);
            setProgress(Math.min(analysisProgress, 90));
          }
          
          return batchResults;
        };

        for (let i = 0; i < chunks.length; i++) {
          // Verificar se foi cancelado
          if (isCancelled) {
            throw new Error('Análise cancelada pelo usuário');
          }
          
          const chunk = chunks[i];
          
          setCurrentStep(`Analisando lote ${i + 1}/${chunks.length} (${chunk.length} itens) - ${Math.round(((i + 1) / chunks.length) * 100)}% dos lotes`);
          
          // Processar chunk em paralelo
          const chunkResults = await processBatchParallel(chunk);
          result.push(...chunkResults);
          
          // Verificar novamente após processar o chunk
          if (isCancelled) {
            
            throw new Error('Análise cancelada pelo usuário');
          }
          
          // Pausa otimizada entre chunks baseada no perfil
          if (i < chunks.length - 1) {
            await delay(delayBetweenBatches);
          }
        }

        return result;
      };

      setCurrentStep("Processando com inteligência artificial...");
      const feedbacks = await processDataInChunks(data);
      
      setCurrentStep("Organizando resultados...");
      setProgress(90);
      
      setCurrentStep("Salvando na nuvem...");
      setProgress(95);
      
      // Salvar os feedbacks no Firestore
      const saved = await storeFeedbacks(feedbacks);
      
      // Preparar análise para salvar
      // Calcular a data mais recente dos feedbacks ou a data média
      const feedbackDates = feedbacks
        .map(f => new Date(f.date))
        .filter(date => !isNaN(date.getTime()));
      
      const mostRecentFeedbackDate = feedbackDates.length > 0 
        ? new Date(Math.max(...feedbackDates.map(date => date.getTime())))
        : new Date();

      const analysisToSave = {
        id: generateUniqueId(),
        hotelId: hotelId,
        hotelName: hotelName,
        importDate: mostRecentFeedbackDate, // Usar a data mais recente dos feedbacks
        data: feedbacks,
        analysis: {
          totalFeedbacks: feedbacks.length,
          averageRating: feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length,
          positiveSentiment: Math.round((feedbacks.filter(f => f.sentiment === 'positive').length / feedbacks.length) * 100),
          responseRate: 85,
          hotelDistribution: processHotelDistribution(feedbacks),
          sourceDistribution: processSourceDistribution(feedbacks),
          languageDistribution: processLanguageDistribution(feedbacks),
          ratingDistribution: processRatingDistribution(feedbacks),
          problemDistribution: processProblemDistribution(feedbacks),
          keywordDistribution: processKeywordDistribution(feedbacks),
          apartamentoDistribution: processApartamentoDistribution(feedbacks),
          recentFeedbacks: feedbacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
        }
      };

      await saveAnalysis(analysisToSave);
      
      // Salvar dados no localStorage para a tela de análise
      localStorage.setItem('analysis-feedbacks', JSON.stringify(feedbacks));
      localStorage.setItem('analysis-data', JSON.stringify(analysisToSave));
      // Salvar ID do hotel atual para validação posterior
      if (userData?.hotelId) {
        localStorage.setItem('current-hotel-id', userData.hotelId);
      }

      setProgress(100);
      setCurrentStep("Concluído!");
      setComplete(true);
      
      toast({
        title: "Análise Concluída",
        description: errorCount > 0 
          ? `${feedbacks.length} feedbacks analisados com ${errorCount} erros recuperados`
          : `${feedbacks.length} feedbacks analisados com sucesso`,
      });

    } catch (error: any) {
      console.error("Erro durante o processamento:", error);
      
      if (error.message.includes('cancelada') || error.name === 'AbortError') {
        // Não mostrar toast de erro para cancelamentos
        setCurrentStep("Análise cancelada com sucesso");
        toast({
          title: "Análise Interrompida",
          description: "O processamento foi cancelado pelo usuário.",
          variant: "default",
        });
      } else {
        toast({
          title: "Erro no Processamento",
          description: error.message,
          variant: "destructive",
        } as ToastProps);
      }
    } finally {
      setImporting(false);
      setIsProcessing(false);
      
      // Limpar AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  const resetImportState = () => {
    setAcceptedFiles([]);
    setImporting(false);
    setProgress(0);
    setComplete(false);
    setLastProgressToast(0);
    setIsCancelled(false);
    setIsProcessing(false);
    
    // Limpar o AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const cancelAnalysis = () => {
    setIsCancelled(true);
    setIsProcessing(false);
    setImporting(false);
    setCurrentStep("Cancelando análise...");
    
    // Abortar todas as requisições HTTP em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    toast({
      title: "Análise Cancelada",
      description: "Cancelando todas as requisições em andamento...",
      variant: "destructive",
    });
    
    // Reset após um pequeno delay para mostrar o status
    setTimeout(() => {
      setCurrentStep("Análise cancelada pelo usuário");
      setTimeout(() => {
        resetImportState();
      }, 1000);
    }, 1000);
  };

  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      onDrop(fileArray);
    }
    event.target.value = '';
  };

  // Estados para drag and drop nativo
  const [isDragActive, setIsDragActive] = useState(false);

  // Função para processar arquivos
  const handleFileDrop = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length > 0) {
      const file = fileArray[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv' || extension === 'xlsx') {
        toast({
          title: "Arquivo detectado!",
          description: `Processando ${file.name}`,
        });
        onDrop(fileArray);
      } else {
        toast({
          title: "Arquivo não suportado",
          description: `Arquivo ${file.name} não é suportado. Use CSV ou XLSX.`,
          variant: "destructive",
        });
      }
    }
  };

  // Handlers para drag and drop nativo
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Verificar se realmente saiu da dropzone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    e.dataTransfer.dropEffect = 'copy';
    return false;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragActive(false);
    
    // Tentar obter arquivos via items primeiro
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      const fileArray: File[] = [];
      
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            fileArray.push(file);
          }
        }
      }
      
      if (fileArray.length > 0) {
        handleFileDrop(fileArray);
        return;
      }
    }
    
    // Fallback para files
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files);
      handleFileDrop(fileArray);
      return;
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handler para paste (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const items = e.clipboardData?.items;
    if (items) {
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      
      if (files.length > 0) {
        handleFileDrop(files);
      }
    }
  };

  const processHotelDistribution = (data: Feedback[]) => {
    const hotelCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const hotel = feedback.hotel;
      if (hotel) {
        hotelCounts[hotel] = (hotelCounts[hotel] || 0) + 1;
      }
    });
    
    return Object.entries(hotelCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const processSourceDistribution = (data: Feedback[]) => {
    return Object.entries(
      data.reduce((acc, item) => {
        if (item.source) {
          if (!acc[item.source]) acc[item.source] = 0;
          acc[item.source]++;
        }
        return acc;
      }, {} as Record<string, number>)
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));
  };

  const processLanguageDistribution = (data: Feedback[]) => {
    return Object.entries(
      data.reduce((acc, item) => {
        if (item.language) {
          if (!acc[item.language]) acc[item.language] = 0;
          acc[item.language]++;
        }
        return acc;
      }, {} as Record<string, number>)
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));
  };

  const processRatingDistribution = (data: Feedback[]) => {
    const ratings = [1, 2, 3, 4, 5];
    return ratings.map(rating => ({
      rating,
      count: data.filter(item => item.rating === rating).length
    }));
  };

  const processSectorDistribution = (data: Feedback[]) => {
    const sectorMap: Record<string, string> = {
      "atendimento": "Atendimento",
      "limpeza": "Limpeza",
      "conforto": "Conforto",
      "localização": "Localização",
      "alimentação": "Alimentação",
      "infraestrutura": "Infraestrutura",
      "serviços": "Serviços",
      "preço": "Preço",
      "quarto": "Quarto",
      "banheiro": "Banheiro",
      "piscina": "Piscina",
      "café da manhã": "Café da Manhã",
      "internet": "Internet",
      "estacionamento": "Estacionamento",
      "academia": "Academia",
      "spa": "Spa",
      "entretenimento": "Entretenimento",
      "segurança": "Segurança",
      "acessibilidade": "Acessibilidade",
      "sustentabilidade": "Sustentabilidade"
    };
    
    return Object.entries(
      data.reduce((acc, item) => {
        if (item.sector) {
          let sector = item.sector.toLowerCase();
          let mappedSector = sectorMap[sector] || item.sector;
          
          for (const [key, value] of Object.entries(sectorMap)) {
            if (sector.includes(key)) {
              mappedSector = value;
              break;
            }
          }
          
          if (!acc[mappedSector]) acc[mappedSector] = 0;
          acc[mappedSector]++;
        }
        return acc;
      }, {} as Record<string, number>)
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
  };

  const processKeywordDistribution = (data: Feedback[]) => {
    const keywordCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const keyword = feedback.keyword;
      if (keyword) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    });
    
    return Object.entries(keywordCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const processProblemDistribution = (data: Feedback[]) => {
    const problemMap: Record<string, string> = {
      "ruído": "Ruído",
      "barulho": "Ruído",
      "música": "Ruído",
      "som": "Ruído",
      "sujo": "Limpeza",
      "limpo": "Limpeza",
      "limpeza": "Limpeza",
      "higiene": "Limpeza",
      "cama": "Conforto",
      "travesseiro": "Conforto",
      "colchão": "Conforto",
      "ar-condicionado": "Conforto",
      "temperatura": "Conforto",
      "frio": "Conforto",
      "calor": "Conforto",
      "pequeno": "Espaço",
      "apertado": "Espaço",
      "espaçoso": "Espaço",
      "grande": "Espaço",
      "caro": "Preço Alto",
      "atendimento": "Atendimento",
      "grosseiro": "Atendimento",
      "mal-educado": "Atendimento",
      "wifi": "Internet",
      "internet": "Internet",
      "conexão": "Internet",
      "comida": "Alimentação",
      "café": "Alimentação",
      "refeição": "Alimentação"
    };
    
    return Object.entries(
      data.reduce((acc, item) => {
        if (item.problem) {
          let matched = false;
          
          for (const [key, group] of Object.entries(problemMap)) {
            if (item.problem.toLowerCase().includes(key)) {
              if (!acc[group]) acc[group] = 0;
              acc[group]++;
              matched = true;
              break;
            }
          }
          
          if (!matched) {
            if (!acc["Outros"]) acc["Outros"] = 0;
            acc["Outros"]++;
          }
        }
        
        return acc;
      }, {} as Record<string, number>)
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
  };

  const processApartamentoDistribution = (data: Feedback[]) => {
    const apartamentoCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const apartamento = feedback.apartamento;
      if (apartamento) {
        apartamentoCounts[apartamento] = (apartamentoCounts[apartamento] || 0) + 1;
      }
    });
    
    return Object.entries(apartamentoCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Importar Feedbacks
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Faça upload de arquivos CSV ou XLSX para análise inteligente com nossa IA. 
            Nossa inteligência artificial transformará seus feedbacks em insights valiosos.
          </p>
          
          {/* Representação da estrutura esperada do Excel */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Formato Esperado do Arquivo
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 dark:bg-blue-950/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700 w-16">A</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">B</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">C</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">D</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">E</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">F</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">G</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">H</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">I</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100 border-r border-gray-200 dark:border-gray-700">J</th>
                      <th className="px-3 py-2 text-left font-medium text-blue-900 dark:text-blue-100">K</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 font-mono">1</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Data</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Nome do Hotel</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Fonte</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Idioma</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Pontuação</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">URL</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Autor</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 font-medium">Título</td>
                      <td className="px-3 py-2 text-blue-700 dark:text-blue-300 border-r border-gray-200 dark:border-gray-700 font-bold">Texto</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">N Apartamento</td>
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 font-mono">2</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">15/01/2024</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">Hotel Exemplo</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">Google</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">Português</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">5</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 truncate">https://...</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">João Silva</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">Excelente!</td>
                      <td className="px-3 py-2 text-blue-600 dark:text-blue-400 border-r border-gray-200 dark:border-gray-700 font-medium">Hotel incrível, atendimento...</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">101</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <p><strong>Importante:</strong> A coluna A deve estar vazia, os dados começam na coluna B.</p>
              <p><strong>Estrutura:</strong> B=Data, C=Nome do Hotel, D=Fonte, E=Idioma, F=Pontuação, G=URL, H=Autor, I=Título, J=Texto, K=N Apartamento</p>
              <p><strong>Texto principal:</strong> A coluna J (Texto) é a mais importante - contém os feedbacks para análise.</p>
              <p><strong>Apartamento:</strong> A coluna K (N Apartamento) é opcional - pode conter informações sobre quartos/suítes.</p>
              <p><strong>Formato:</strong> Aceita arquivos .xlsx e .csv com essa estrutura.</p>
            </div>
          </div>
        </div>

        {!importing && !complete && (
          <div className="space-y-6">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-12 transition-all duration-300 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer dropzone-area bg-card focus:ring-2 focus:ring-primary focus:border-primary",
                isDragActive && "border-primary bg-primary/10 scale-105 shadow-lg",
                importing && "opacity-50 cursor-not-allowed"
              )}
              data-dropzone="true"
              id="file-dropzone"
              tabIndex={0}
              style={{ outline: 'none', position: 'relative', zIndex: 10 }}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleClick}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }}
            >
              <input 
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                disabled={importing}
              />
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className={cn(
                  "relative p-6 rounded-full transition-all duration-300",
                  isDragActive ? "bg-primary/20 scale-110" : "bg-muted/50"
                )}>
                  <Upload className={cn(
                    "h-16 w-16 transition-colors duration-300",
                    isDragActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  {isDragActive && (
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold">
                    {isDragActive 
                      ? "Solte o arquivo aqui" 
                      : "Importar Arquivo de Feedbacks"
                    }
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {isDragActive 
                      ? "Pronto para analisar seus dados com inteligência artificial"
                      : "Arraste e solte um arquivo aqui ou use o botão abaixo"
                    }
                  </p>
                </div>
                
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4" />
                    <span>CSV, XLSX</span>
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span>Análise com IA</span>
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span>Drag & Drop</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
        
        {importing && !complete && (
          <div className="space-y-8">
            {/* Mensagem Motivadora */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-800 rounded-full shadow-md">
                  {getMotivationalMessage(progress, totalItems).icon}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                    {getMotivationalMessage(progress, totalItems).title}
                  </h3>
                  <p className="text-blue-700 dark:text-blue-200">
                    {getMotivationalMessage(progress, totalItems).description}
                  </p>
                  {estimatedTime && (
                    <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">
                      ⏱️ {estimatedTime}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Barra de Progresso Animada */}
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">Progresso da Análise</h4>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {Math.round(progress)}%
                  </span>
                  {isProcessing && !isCancelled && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={cancelAnalysis}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
              
              <AnimatedProgress value={progress} />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentStep}</span>
                <span>{processedItems}/{totalItems} itens</span>
              </div>
              
              {isCancelled && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-red-600 animate-spin" />
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <span className="text-sm text-red-800 dark:text-red-200 font-medium">
                      Cancelando análise...
                    </span>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                      Interrompendo requisições em andamento e limpando recursos.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Estatísticas em Tempo Real */}
            {totalItems > 0 && (
              <LiveStats 
                processed={processedItems} 
                total={totalItems} 
                currentStep={currentStep} 
                retryCount={retryCount}
                errorCount={errorCount}
                startTime={startTime}
                performanceProfile={getPerformanceProfile(totalItems)}
              />
            )}

            {/* Dicas durante o processamento */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Coffee className="h-5 w-5 text-blue-600" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Dica Profissional:</strong> Você pode minimizar esta aba e continuar trabalhando. 
                    Nossa IA continuará processando em segundo plano.
                  </div>
                </div>
                {isProcessing && !isCancelled && (
                  <div className="flex items-center gap-3">
                    <X className="h-5 w-5 text-blue-600" />
                                         <div className="text-sm text-blue-800 dark:text-blue-200">
                       <strong>Cancelamento:</strong> Você pode cancelar a análise a qualquer momento clicando no botão &quot;Cancelar&quot; acima.
                     </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
        
        {complete && (
          <Card className="p-12 text-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
            <div className="space-y-6">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-green-800 dark:text-green-200">
                  Análise Concluída com Sucesso
                </h3>
                <p className="text-lg text-green-700 dark:text-green-300 max-w-md mx-auto">
                  Todos os seus feedbacks foram analisados com inteligência artificial. 
                  Os insights estão prontos para visualização.
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mx-auto max-w-sm">
                  <div className="text-3xl font-bold text-green-600">{processedItems}</div>
                  <div className="text-sm text-muted-foreground">feedbacks analisados</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => router.push("/analysis")}
                  size="lg"
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <BarChart3 className="h-5 w-5" />
                  Ver Análise
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetImportState}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  Importar Novo Arquivo
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* AlertDialog para API Key não configurada */}
      <AlertDialog open={showApiKeyAlert} onOpenChange={setShowApiKeyAlert}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Chave de API Necessária
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Para analisar feedbacks com inteligência artificial, é necessário configurar uma chave de API.
              </p>
              <p className="text-sm text-muted-foreground">
                Você pode configurar sua própria chave nas Configurações ou, se não possuir uma chave, 
                entre em contato com o administrador do sistema para obter acesso.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogCancel onClick={handleCancelApiKeyAlert} className="sm:order-1">
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={handleGoToSettings}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white sm:order-2"
            >
              <Settings className="h-4 w-4" />
              Ir para Configurações
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para confirmação de nome do arquivo */}
      <AlertDialog open={showFileNameConfirmation} onOpenChange={setShowFileNameConfirmation}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirmação de Importação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Tem certeza que deseja importar o arquivo <strong>{fileToConfirm?.name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Você está logado com o hotel <strong>{userData?.hotelName}</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogCancel onClick={handleCancelFileNameConfirmation} className="sm:order-1">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFileName}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white sm:order-2"
            >
              <Upload className="h-4 w-4" />
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SharedDashboardLayout>
  )
}

export default ImportPageContent;