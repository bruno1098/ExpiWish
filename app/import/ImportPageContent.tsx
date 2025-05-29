"use client"

import { useState, useEffect, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileType, CheckCircle2, FolderOpen } from "lucide-react"
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

function ImportPageContent() {
  const { toast } = useToast()
  const [progress, setProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [complete, setComplete] = useState(false)
  const router = useRouter()
  const { userData } = useAuth();
  const [detectingHotels, setDetectingHotels] = useState(false);
  const [hotelsInFile, setHotelsInFile] = useState<string[]>([]);
  const [chosenHotelOption, setChosenHotelOption] = useState<'account' | 'file' | null>(null);
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [isTestEnvironment, setIsTestEnvironment] = useState(false);
  
  // Estados para o controle do modelo
  const [useFineTuned, setUseFineTuned] = useState(false);
  const [useNormalMode, setUseNormalMode] = useState(true);
  const [lastProgressToast, setLastProgressToast] = useState(0);

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

    setDetectingHotels(true);
    setImporting(false);
    setProgress(0);
    setComplete(false);
    setHotelsInFile([]);
    setChosenHotelOption(null);

    try {
      const file = files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'xlsx') {
        const { read, utils } = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const range = utils.decode_range(worksheet['!ref'] || 'A1');
        const hotelsDetected = new Set<string>();
        
        for (let row = 1; row <= Math.min(range.e.r, 50); row++) {
          const hotelFromFile = worksheet[utils.encode_cell({ r: row, c: 2 })]?.v;
          
          if (hotelFromFile && typeof hotelFromFile === 'string' && hotelFromFile.trim() !== '') {
            hotelsDetected.add(hotelFromFile.trim());
          }
        }
        
        if (hotelsDetected.size === 0) {
          hotelsDetected.add("Hotel do arquivo (não especificado)");
        }
        
        setHotelsInFile(Array.from(hotelsDetected));
        
      } else if (extension === 'csv') {
        const Papa = (await import('papaparse')).default;
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        
        const hotelsDetected = new Set<string>();
        const rowsToCheck = result.data.slice(0, 50);
        
        for (const row of rowsToCheck) {
          if (row && typeof row === 'object') {
            const rowObj = row as Record<string, any>;
            const hotelName = 
              (rowObj['fonte'] as string) || 
              (rowObj['hotel'] as string) || 
              (rowObj['Hotel'] as string) || 
              (rowObj['HOTEL'] as string) ||
              (rowObj['nomeHotel'] as string);
              
            if (hotelName && typeof hotelName === 'string' && hotelName.trim() !== '') {
              hotelsDetected.add(hotelName.trim());
            }
          }
        }
        
        if (hotelsDetected.size === 0) {
          hotelsDetected.add("Hotel do arquivo (não especificado)");
        }
        
        setHotelsInFile(Array.from(hotelsDetected));
      }

      setDetectingHotels(false);
      
    } catch (error: any) {
      console.error("Erro ao analisar arquivo:", error);
      toast({
        title: "Erro na Análise",
        description: error.message || "Ocorreu um erro ao analisar o arquivo.",
        variant: "destructive",
      } as ToastProps);
      setDetectingHotels(false);
    }
  };

  const processFileWithOption = async (file: File, hotelOption: 'account' | 'file') => {
    setImporting(true);
    setProgress(0);
    setLastProgressToast(0);
    
    toast({
      title: "Iniciando Análise Inteligente",
      description: `Processando arquivo com modelo ${useFineTuned ? 'otimizado' : 'padrão'}. Aguarde...`,
    });

    try {
      let data: any[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      const hotelName = userData?.hotelName || '';
      const hotelId = userData?.hotelId || '';

      if (extension === 'xlsx') {
        const { read, utils } = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const range = utils.decode_range(worksheet['!ref'] || 'A1');
        const rows = [];
        
        for (let row = 1; row <= range.e.r; row++) {
          const nomeHotel = worksheet[utils.encode_cell({ r: row, c: 1 })]?.v;
          const fonte = worksheet[utils.encode_cell({ r: row, c: 2 })]?.v;
          const idioma = worksheet[utils.encode_cell({ r: row, c: 3 })]?.v;
          const pontuacao = worksheet[utils.encode_cell({ r: row, c: 4 })]?.v;
          const url = worksheet[utils.encode_cell({ r: row, c: 5 })]?.v;
          const autor = worksheet[utils.encode_cell({ r: row, c: 6 })]?.v;
          const titulo = worksheet[utils.encode_cell({ r: row, c: 7 })]?.v;
          const texto = worksheet[utils.encode_cell({ r: row, c: 9 })]?.v;
          const apartamento = worksheet[utils.encode_cell({ r: row, c: 11 })]?.v;
          
          if (texto && 
              typeof texto === 'string' && 
              texto.trim() !== '' && 
              texto.trim().length > 5 && 
              !/^\d+$/.test(texto.trim()) &&
              !/^[^\w\s]+$/.test(texto.trim())) {
            
            rows.push({
              nomeHotel: nomeHotel || '',
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
        
        data = rows.map((row) => {
          const hotelFromFile = row.nomeHotel || row.fonte;
          
          return {
            ...row,
            nomeHotel: hotelOption === 'account' ? hotelName : (hotelFromFile || hotelName)
          };
        });
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
            const hotelFromFile = row.fonte || row.hotel || row.Hotel || row.HOTEL || row.nomeHotel;
            return {
              ...row,
              texto: row.texto.trim(),
              nomeHotel: hotelOption === 'account' ? hotelName : (hotelFromFile || hotelName)
            };
          });
      }
      
      console.log("✅ Dados válidos lidos do arquivo:", data.length);
      console.log("📝 Primeiros 3 textos da COLUNA J:", data.slice(0, 3).map(d => `"${d.texto.substring(0, 100)}..."`));
      
      if (data.length === 0) {
        toast({
          title: "Nenhum Texto Válido Encontrado",
          description: "Verifique se a coluna J contém os feedbacks em texto.",
          variant: "destructive",
        } as ToastProps);
        return;
      }
      
      const processDataInChunks = async (data: any[]): Promise<Feedback[]> => {
        const result: Feedback[] = [];
        const chunkSize = 500;
        const chunks = [];
        
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }

        if (useFineTuned) {
          console.log("🚀 INICIANDO ANÁLISE COM FINE-TUNING (GPT-4o)");
          console.log("Model ID: ft:gpt-4o-2024-08-06:pessoal:treino3:B5DXUVXY");
        } else {
          console.log("📝 INICIANDO ANÁLISE COM MODO NORMAL (GPT-3.5-turbo)");
        }

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const batches: any[][] = [];
          
          for (let j = 0; j < chunk.length; j += BATCH_SIZE) {
            batches.push(chunk.slice(j, j + BATCH_SIZE));
          }
          
          const batchPromises = batches.map(async (batch) => {
            const batchResults = await Promise.all(
              batch.map(async (row) => {
                if (!row.texto) return null;
                
                try {
                  const modelType = useFineTuned ? "Fine-tuned (GPT-4o)" : "Normal (GPT-3.5)";
                  console.log(`🔄 Analisando: "${row.texto.substring(0, 50)}..." com ${modelType}`);

                  const analysis = await analyzeWithGPT(row.texto, useFineTuned);
                  
                  console.log(`✅ Resultado: Rating=${analysis.rating}, Problem="${analysis.problem || 'VAZIO'}"`);
                  
                  const feedback: Feedback = {
                    id: generateUniqueId(),
                    date: new Date().toISOString(),
                    comment: row.texto,
                    rating: analysis.rating,
                    sentiment: analysis.rating >= 4 ? 'positive' : analysis.rating <= 2 ? 'negative' : 'neutral',
                    keyword: analysis.keyword,
                    sector: analysis.sector,
                    problem: analysis.problem,
                    hotel: hotelOption === 'account' ? userData?.hotelName || '' : (row.nomeHotel || row.fonte || ''),
                    source: row.fonte || '',
                    language: row.idioma || '',
                    score: row.pontuacao || undefined,
                    url: row.url || undefined,
                    author: row.autor || undefined,
                    title: row.titulo || undefined,
                    apartamento: row.apartamento || undefined
                  };
                  
                  return feedback;
                } catch (error: any) {
                  console.error(`❌ Erro ao processar: "${row.texto.substring(0, 30)}..."`, error);
                  if (error.message.includes('exceeded your current quota')) {
                    toast({
                      title: "Limite de Uso Atingido",
                      description: "Limite de análises atingido. Verifique suas configurações.",
                      variant: "destructive",
                    } as ToastProps);
                    throw error;
                  }
                  if (error.message.includes('API Key')) {
                    toast({
                      title: "Erro de Configuração",
                      description: "Configure a chave de API nas Configurações para usar a análise inteligente.",
                      variant: "destructive",
                    } as ToastProps);
                  }
                  return null;
                }
              })
            );
            
            return batchResults.filter((item): item is Feedback => item !== null);
          });
          
          const results = await Promise.all(batchPromises);
          for (const batchResult of results) {
            result.push(...batchResult);
          }
          
          const currentProgress = (result.length / data.length) * 100;
          setProgress(currentProgress);
          
          if (currentProgress >= 25 && lastProgressToast < 25) {
            setLastProgressToast(25);
            toast({
              title: "Análise em Progresso",
              description: "25% concluído. A IA está processando os feedbacks...",
            });
          } else if (currentProgress >= 50 && lastProgressToast < 50) {
            setLastProgressToast(50);
            toast({
              title: "Análise em Progresso",
              description: "50% concluído. Metade dos dados já foram analisados!",
            });
          } else if (currentProgress >= 75 && lastProgressToast < 75) {
            setLastProgressToast(75);
            toast({
              title: "Quase Finalizado",
              description: "75% concluído. Processando os últimos feedbacks...",
            });
          }
          
          if (i < chunks.length - 1) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        }

        console.log(`🎉 ANÁLISE FINALIZADA! ${result.length} feedbacks processados`);
        return result;
      };

      const processedData = await processDataInChunks(data);

      storeFeedbacks(processedData);
      
      toast({
        title: "Análise Inteligente Concluída",
        description: `${processedData.length} feedbacks analisados com sucesso usando ${useFineTuned ? 'modelo otimizado' : 'modelo padrão'}.`,
      });

      const analysisData: any = {
        totalFeedbacks: processedData.length,
        averageRating: processedData.reduce((acc, item) => acc + item.rating, 0) / processedData.length,
        positiveSentiment: Math.round((processedData.filter(item => item.sentiment === 'positive').length / processedData.length) * 100),
        responseRate: 0,
        hotelDistribution: processHotelDistribution(processedData),
        sourceDistribution: processSourceDistribution(processedData),
        languageDistribution: processLanguageDistribution(processedData),
        ratingDistribution: processRatingDistribution(processedData),
        sectorDistribution: processSectorDistribution(processedData),
        keywordDistribution: processKeywordDistribution(processedData),
        sentimentTrend: [],
        recentFeedbacks: processedData.slice(0, 5),
        problemDistribution: processProblemDistribution(processedData),
        apartamentoDistribution: processApartamentoDistribution(processedData)
      };
      
      if (isTestEnvironment) {
        analysisData.isTestEnvironment = true;
        
        if (hotelOption === 'account') {
          try {
            const testEnvResponse = await fetch('/api/test-environment');
            if (testEnvResponse.ok) {
              const testEnvData = await testEnvResponse.json();
              if (testEnvData.hotels && testEnvData.hotels.length > 0) {
                const testHotel = testEnvData.hotels[0];
                analysisData.hotelId = testHotel.hotelId;
                analysisData.hotelName = testHotel.name;
              }
            }
          } catch (error) {
            console.error("Erro ao obter hotel de teste:", error);
          }
        }
      }
      
      try {
        const analysisId = await saveAnalysis({
          hotelId: hotelId,
          hotelName: hotelName,
          data: processedData,
          analysis: analysisData,
          isTestEnvironment: isTestEnvironment
        });
        
        toast({
          title: "Dados Salvos com Sucesso",
          description: "Análise completa salva e disponível no painel de controle.",
        });
        
        router.push(`/analysis`);
      } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
        toast({
          title: "Erro ao Salvar",
          description: "Análise concluída, mas houve erro ao salvar. Tente novamente.",
          variant: "destructive",
        } as ToastProps);
      }
      
      setProgress(100);
      setComplete(true);
      
      toast({
        title: "Importação Finalizada",
        description: "Todos os dados foram processados e estão prontos para análise!",
      });
    } catch (error: any) {
      console.error("Erro durante a importação:", error);
      toast({
        title: "Erro na Importação",
        description: "Houve um problema durante o processamento. Verifique o arquivo e tente novamente.",
        variant: "destructive",
      } as ToastProps);
    } finally {
      setImporting(false);
    }
  };

  const resetImportState = () => {
    setAcceptedFiles([]);
    setHotelsInFile([]);
    setChosenHotelOption(null);
    setDetectingHotels(false);
    setImporting(false);
    setComplete(false);
    setProgress(0);
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    disabled: importing || detectingHotels,
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

  const handleModeChange = (mode: 'normal' | 'fineTuned') => {
    if (mode === 'normal') {
      setUseNormalMode(true);
      setUseFineTuned(false);
      console.log("🔄 Modo alterado para: NORMAL (GPT-3.5-turbo)");
      
      toast({
        title: "Modelo Padrão Selecionado",
        description: "Análise com modelo padrão ativada. Processamento eficiente e econômico.",
      });
      
    } else {
      setUseNormalMode(false);
      setUseFineTuned(true);
      console.log("🔄 Modo alterado para: FINE-TUNED (GPT-4o)");
      
      toast({
        title: "Modelo Otimizado Selecionado",
        description: "Análise com modelo otimizado ativada. Maior precisão e qualidade nos resultados.",
      });
    }
  };

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Importar Feedbacks</h2>
          <p className="text-muted-foreground">
            Arraste e solte arquivos CSV ou XLSX contendo feedbacks para análise inteligente.
          </p>
        </div>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Configuração da Análise Inteligente</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="normal-mode"
                name="ai-mode"
                checked={useNormalMode}
                onChange={() => handleModeChange('normal')}
                className="h-4 w-4"
                disabled={importing || detectingHotels}
              />
              <label htmlFor="normal-mode" className="flex flex-col">
                <span className="font-medium">Usar modo padrão</span>
                <span className="text-sm text-muted-foreground">Análise eficiente e econômica</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="optimized-mode"
                name="ai-mode"
                checked={useFineTuned}
                onChange={() => handleModeChange('fineTuned')}
                className="h-4 w-4"
                disabled={importing || detectingHotels}
              />
              <label htmlFor="optimized-mode" className="flex flex-col">
                <span className="font-medium">Usar modelo otimizado (Consome mais recursos)</span>
                <span className="text-sm text-muted-foreground">Análise de maior precisão e qualidade</span>
              </label>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Modo atual:</strong> {useFineTuned ? "Modelo Otimizado" : "Modelo Padrão"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {useFineTuned 
                ? "Maior precisão na categorização e análise de sentimentos" 
                : "Processamento rápido e eficiente para grandes volumes"
              }
            </p>
          </div>
        </Card>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={importing || detectingHotels}
        />

        {!importing && !complete && (
          <Card 
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 transition",
              isDragActive && "border-primary bg-muted/50",
              (detectingHotels) && "opacity-50"
            )}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive 
                  ? "Solte o arquivo aqui..." 
                  : detectingHotels 
                  ? "Analisando arquivo..."
                  : "Importar Arquivo de Feedbacks"
                }
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                {detectingHotels 
                  ? "Processando informações do arquivo..."
                  : "Arraste e solte um arquivo aqui ou clique no botão abaixo para selecionar"
                }
              </p>
              
              {!detectingHotels && (
                <div className="space-y-4">
                  <Button 
                    onClick={openFileSelector}
                    disabled={importing || detectingHotels}
                    className="flex items-center gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Selecionar Arquivo
                  </Button>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileType className="h-4 w-4" />
                    <span>Formatos suportados: CSV, XLSX</span>
                  </div>
                </div>
              )}
              
              {detectingHotels && (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              )}
            </div>
          </Card>
        )}
        
        {!importing && !detectingHotels && hotelsInFile.length > 0 && chosenHotelOption === null && (
          <Card className="p-6 my-6">
            <h3 className="text-xl font-bold mb-4">Seleção de Hotel</h3>
            <p className="mb-4">
              {hotelsInFile.length === 1 
                ? `O arquivo contém dados do hotel "${hotelsInFile[0]}".` 
                : `O arquivo contém dados de ${hotelsInFile.length} hotéis diferentes: ${hotelsInFile.slice(0, 3).join(', ')}${hotelsInFile.length > 3 ? '...' : ''}`
              }
            </p>
            <p className="mb-6">Como você gostaria de importar estes dados?</p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <button 
                onClick={() => {
                  setChosenHotelOption('account');
                  toast({
                    title: "Hotel da Conta Selecionado",
                    description: `Todos os dados serão atribuídos a ${userData?.hotelName}`,
                  });
                  if (acceptedFiles.length > 0) {
                    processFileWithOption(acceptedFiles[0], 'account');
                  }
                }}
                className="flex flex-col items-center justify-center h-24 p-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
                type="button"
              >
                <p className="font-bold">Usar o hotel da sua conta</p>
                <p className="text-sm text-muted-foreground">Todos os registros serão atribuídos a {userData?.hotelName}</p>
              </button>
              
              <button 
                onClick={() => {
                  setChosenHotelOption('file');
                  toast({
                    title: "Hotéis do Arquivo Selecionados",
                    description: "Mantendo os nomes de hotéis conforme estão no arquivo",
                  });
                  if (acceptedFiles.length > 0) {
                    processFileWithOption(acceptedFiles[0], 'file');
                  }
                }}
                className="flex flex-col items-center justify-center h-24 p-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
                type="button"
              >
                <p className="font-bold">Usar os hotéis do arquivo</p>
                <p className="text-sm text-muted-foreground">Manter os nomes de hotéis como estão no arquivo</p>
              </button>
            </div>
          </Card>
        )}
        
        {importing && !complete && (
          <div className="space-y-4 w-full max-w-md">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Processando com IA</h3>
              <p className="text-sm text-muted-foreground">
                Analisando feedbacks com {useFineTuned ? 'modelo otimizado' : 'modelo padrão'}. 
                Aguarde enquanto processamos seus dados...
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm font-medium">{Math.round(progress)}% concluído</p>
          </div>
        )}

        {complete && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-fit rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Importação Concluída</h3>
                <p className="text-sm text-muted-foreground">
                  Todos os dados foram importados e analisados com sucesso.
                </p>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => router.push("/analysis")}>
                  Ver Análise
                </Button>
                <Button variant="outline" onClick={resetImportState}>
                  Importar Novo Arquivo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SharedDashboardLayout>
  )
}

export default ImportPageContent; 