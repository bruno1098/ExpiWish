"use client"

import { useState, useEffect, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileType, CheckCircle2, FolderOpen, Coffee, Zap, Brain, Clock, SparklesIcon, FileIcon, BarChart3, RefreshCw, AlertCircle } from "lucide-react"
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

// Configurações de processamento
const BATCH_SIZE = 40;
const DELAY_BETWEEN_BATCHES = 50;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Função para gerar ID único
const generateUniqueId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
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

// Componente de estatísticas em tempo real
const LiveStats = ({ processed, total, currentStep, retryCount, errorCount }: { 
  processed: number; 
  total: number; 
  currentStep: string;
  retryCount: number;
  errorCount: number;
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <FileIcon className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Processados</span>
        </div>
        <div className="text-2xl font-bold text-blue-600 mt-1">{processed}</div>
      </div>
      
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Restantes</span>
        </div>
        <div className="text-2xl font-bold text-purple-600 mt-1">{total - processed}</div>
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
          <span className="text-sm font-medium text-green-900 dark:text-green-100">Fase Atual</span>
        </div>
        <div className="text-sm font-semibold text-green-600 mt-1">{currentStep}</div>
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

  // Ref para o input file
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    checkTestEnvironment();
  }, []);

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

    // Remover toda a lógica de detecção de hotéis e processar o arquivo diretamente
    processFileWithAccountHotel(files[0]);
  };

  const processFileWithAccountHotel = async (file: File) => {
    setImporting(true);
    setProgress(0);
    setLastProgressToast(0);
    setStartTime(new Date());
    setCurrentStep("Lendo arquivo...");
    setRetryCount(0);
    setErrorCount(0);
    
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

      if (extension === 'xlsx') {
        const { read, utils } = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const range = utils.decode_range(worksheet['!ref'] || 'A1');
        const rows = [];
        
        // Começar da linha 2 para pular o cabeçalho (índice 1 = linha 2 no Excel)
        for (let row = 1; row <= range.e.r; row++) {
          const data = worksheet[utils.encode_cell({ r: row, c: 1 })]?.v;
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
            
            rows.push({
              data: data || '',
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
              nomeHotel: hotelName
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
        const chunkSize = 50; // Reduzido drasticamente para evitar sobrecarregar a API
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
        const retryWithBackoff = async (fn: Function, maxRetries: number = 3): Promise<any> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const result = await fn();
              // Se teve retry mas agora deu certo, resetar contador
              if (attempt > 1) {
                setRetryCount(prev => prev - 1);
              }
              return result;
            } catch (error: any) {
              const isLastAttempt = attempt === maxRetries;
              
              // Incrementar contador de tentativas na primeira falha
              if (attempt === 1) {
                setRetryCount(prev => prev + 1);
              }
              
              // Se for o último tentativa ou erro não relacionado à API, lança o erro
              if (isLastAttempt || !error.message.includes('HTTP error! status: 5')) {
                if (isLastAttempt) {
                  setErrorCount(prev => prev + 1);
                  setRetryCount(prev => Math.max(0, prev - 1));
                }
                throw error;
              }
              
              // Calcular delay com backoff exponencial: 1s, 2s, 4s
              const delayTime = Math.pow(2, attempt - 1) * 1000;
              
              // Atualizar step com informação de retry
              setCurrentStep(`Resolvendo problemas temporários... (tentativa ${attempt + 1}/${maxRetries})`);
              
              await new Promise(resolve => setTimeout(resolve, delayTime));
            }
          }
        };

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          setCurrentStep(`Analisando lote ${i + 1}/${chunks.length}...`);
          
          // Processar sequencialmente ao invés de Promise.all para evitar sobrecarregar
          for (let j = 0; j < chunk.length; j++) {
            const row = chunk[j];
            
            try {
              const analysisResult = await retryWithBackoff(async () => {
                const response = await fetch('/api/analyze-feedback', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    texto: row.texto,
                    apiKey: apiKey,
                  }),
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
              const rawResponse = analysisResult.response || "Não identificado, Não identificado, ";
              
              const parts = rawResponse.split(',').map((part: string) => part.trim());
              const keyword = parts[0] || 'Não identificado';
              const sector = parts[1] || 'Não identificado';
              const problem = parts[2] || '';
                  
              const feedback: Feedback = {
                id: generateUniqueId(),
                date: new Date().toISOString(),
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
                apartamento: row.apartamento || undefined
              };

              result.push(feedback);

              // Atualizar progresso em tempo real
              const currentProcessed = result.length;
              setProcessedItems(currentProcessed);
              
              // Calcular progresso (10% para leitura do arquivo, 80% para análise, 10% para salvamento)
              const analysisProgress = 10 + ((currentProcessed / data.length) * 80);
              setProgress(Math.min(analysisProgress, 90));
                  
            } catch (error: any) {
              console.error(`Erro ao processar feedback ${j} após todas as tentativas:`, error);
              
              // Criar feedback com dados padrão quando falha após todas as tentativas
              const feedback: Feedback = {
                id: generateUniqueId(),
                date: new Date().toISOString(),
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
                apartamento: row.apartamento || undefined
              };

              result.push(feedback);
            }
            
            // Pequeno delay entre cada feedback para não sobrecarregar
            await delay(10);
          }
          
          // Pausa maior entre chunks para não sobrecarregar a API
          if (i < chunks.length - 1) {
            await delay(900); // Aumentado para 2 segundos entre chunks
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
      const analysisToSave = {
        id: generateUniqueId(),
        hotelId: hotelId,
        hotelName: hotelName,
        importDate: new Date(),
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
      console.log("Dados salvos no localStorage para análise");

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
      toast({
        title: "Erro no Processamento",
        description: error.message,
        variant: "destructive",
      } as ToastProps);
    } finally {
      setImporting(false);
    }
  };

  const resetImportState = () => {
    setAcceptedFiles([]);
    setImporting(false);
    setProgress(0);
    setComplete(false);
    setLastProgressToast(0);
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    disabled: importing,
    multiple: false,
    noClick: true,
    noKeyboard: true
  });

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
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={importing}
        />

        {!importing && !complete && (
          <div className="space-y-6">
            <Card 
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 transition-all duration-300 hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
                isDragActive && "border-primary bg-primary/10 scale-105 shadow-lg",
                importing && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
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
                </div>
              </div>
            </Card>
            
            <div className="text-center">
              <p className="text-muted-foreground mb-4">ou</p>
              <Button 
                onClick={openFileSelector}
                disabled={importing}
                size="lg"
                className="flex items-center gap-3 px-8 py-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <FolderOpen className="h-5 w-5" />
                Selecionar Arquivo
              </Button>
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
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {Math.round(progress)}%
                </span>
              </div>
              
              <AnimatedProgress value={progress} />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentStep}</span>
                <span>{processedItems}/{totalItems} itens</span>
              </div>
            </Card>

            {/* Estatísticas em Tempo Real */}
            {totalItems > 0 && (
              <LiveStats 
                processed={processedItems} 
                total={totalItems} 
                currentStep={currentStep} 
                retryCount={retryCount}
                errorCount={errorCount}
              />
            )}

            {/* Dicas durante o processamento */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Coffee className="h-5 w-5 text-blue-600" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Dica Profissional:</strong> Você pode minimizar esta aba e continuar trabalhando. 
                  Nossa IA continuará processando em segundo plano.
                </div>
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
    </SharedDashboardLayout>
  )
}

export default ImportPageContent; 