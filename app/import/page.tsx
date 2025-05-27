"use client"

import { useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileType, CheckCircle2 } from "lucide-react"
import { read, utils } from "xlsx"
import Papa from "papaparse"
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

// Configurações de processamento
const BATCH_SIZE = 40;
const DELAY_BETWEEN_BATCHES = 50;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

  useEffect(() => {
    const checkTestEnvironment = async () => {
      try {
        // Verificar localStorage primeiro (para resposta UI rápida)
        const testFlag = localStorage.getItem('isTestEnvironment') === 'true';
        setIsTestEnvironment(testFlag);
        
        // Confirmar com a API
        const response = await fetch('/api/test-environment');
        if (response.ok) {
          const data = await response.json();
          setIsTestEnvironment(data.active);
          
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

  const onDrop = async (files: File[]) => {
    if (files.length === 0) return;
    setAcceptedFiles(files); // Guardar os arquivos para uso posterior

    // Verificar se o usuário está autenticado e tem dados do hotel
    if (!userData || !userData.hotelId) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar autenticado e associado a um hotel para importar dados.",
        variant: "destructive",
      } as ToastProps);
      return;
    }

    // Configurar estado para detecção
    setDetectingHotels(true);
    setImporting(false);
    setProgress(0);
    setComplete(false);
    setHotelsInFile([]);
    setChosenHotelOption(null);

    try {
      const file = files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      // Usar o nome do hotel do usuário autenticado
      const hotelName = userData.hotelName;

      // Detectar hotéis no arquivo
      if (extension === 'xlsx') {
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Lendo todas as células do XLSX para detectar hotéis
        const range = utils.decode_range(worksheet['!ref'] || 'A1');
        const hotelsDetected = new Set<string>();
        
        // Começando da linha 2 (índice 1) para pular o cabeçalho
        for (let row = 1; row <= Math.min(range.e.r, 50); row++) { // Limitar a 50 linhas para detecção rápida
          // Verificar coluna C (índice 2) para o nome do hotel
          const hotelFromFile = worksheet[utils.encode_cell({ r: row, c: 2 })]?.v; // Coluna C - Hotel/Fonte
          
          if (hotelFromFile && typeof hotelFromFile === 'string' && hotelFromFile.trim() !== '') {
            hotelsDetected.add(hotelFromFile.trim());
          }
        }
        
        // Sempre adicionar pelo menos um hotel (mesmo que fictício) para forçar a interface de escolha
        if (hotelsDetected.size === 0) {
          hotelsDetected.add("Hotel do arquivo (não especificado)");
        }
        
        setHotelsInFile(Array.from(hotelsDetected));
        
      } else if (extension === 'csv') {
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        
        // Detectar hotéis no CSV
        const hotelsDetected = new Set<string>();
        
        // Limitar a um máximo de 50 linhas para detecção rápida
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
        
        // Sempre adicionar pelo menos um hotel (mesmo que fictício) para forçar a interface de escolha
        if (hotelsDetected.size === 0) {
          hotelsDetected.add("Hotel do arquivo (não especificado)");
        }
        
        setHotelsInFile(Array.from(hotelsDetected));
      }

      // Agora aguardar a escolha do usuário
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
    
    try {
      let data: any[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      // Usar o nome do hotel do usuário autenticado
      const hotelName = userData?.hotelName || '';
      const hotelId = userData?.hotelId || '';

      if (extension === 'xlsx') {
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Lendo todas as células do XLSX
        const range = utils.decode_range(worksheet['!ref'] || 'A1');
        const rows = [];
        
        // Começando da linha 2 (índice 1) para pular o cabeçalho
        for (let row = 1; row <= range.e.r; row++) {
          // CORRIGIDO: Coluna C como fonte/hotel, ajustando indices
          const fonte = worksheet[utils.encode_cell({ r: row, c: 2 })]?.v;    // Coluna C - Fonte/Hotel
          const idioma = worksheet[utils.encode_cell({ r: row, c: 3 })]?.v;   // Coluna D - Idioma
          const pontuacao = worksheet[utils.encode_cell({ r: row, c: 4 })]?.v; // Coluna E - Pontuação
          const url = worksheet[utils.encode_cell({ r: row, c: 5 })]?.v;      // Coluna F - URL
          const autor = worksheet[utils.encode_cell({ r: row, c: 6 })]?.v;    // Coluna G - Autor
          const titulo = worksheet[utils.encode_cell({ r: row, c: 7 })]?.v;   // Coluna H - Título
          const texto = worksheet[utils.encode_cell({ r: row, c: 9 })]?.v;    // Coluna J - Texto
          const apartamento = worksheet[utils.encode_cell({ r: row, c: 11 })]?.v; // Coluna L - Apartamento (índice 11)
          
          if (texto) { // Só adiciona se tiver texto no comentário
            rows.push({
              nomeHotel: hotelOption === 'account' ? hotelName : (fonte || hotelName),
              hotelOriginal: fonte || hotelName, // Guardar referência
              fonte,
              idioma,
              pontuacao,
              url,
              autor,
              titulo,
              texto,
              apartamento // Adicionando o campo de apartamento
            });
          }
        }
        
        data = rows;
      } else if (extension === 'csv') {
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        
        data = (result.data as Record<string, any>[])
          .filter(row => row && typeof row === 'object')
          .map(row => {
            // Acesso seguro às propriedades usando indexação
            const rowObj = row as Record<string, any>;
            const hotelFromFile = 
              rowObj['fonte'] || 
              rowObj['hotel'] || 
              rowObj['Hotel'] || 
              rowObj['nomeHotel'];
              
            // Capturar o campo de apartamento de várias possíveis nomenclaturas
            const apartamento = 
              rowObj['apartamento'] || 
              rowObj['Apartamento'] || 
              rowObj['APARTAMENTO'] || 
              rowObj['ap'] || 
              rowObj['AP'];
              
            return {
              ...rowObj,
              hotelOriginal: hotelFromFile || hotelName, // Guardar referência
              nomeHotel: hotelOption === 'account' ? hotelName : (hotelFromFile || hotelName),
              apartamento: apartamento // Salvar o campo de apartamento
            };
          });
      }
      
      // O restante do código de processamento permanece o mesmo
      console.log("Dados lidos do arquivo:", data);
      
      // Função para processar dados em chunks e lotes
      const processDataInChunks = async (data: any[]): Promise<Feedback[]> => {
        const result: Feedback[] = [];
        const MAX_CONCURRENT_BATCHES = 3;
        
        // Dividir os dados em chunks
        const chunks = [];
        for (let i = 0; i < data.length; i += BATCH_SIZE * MAX_CONCURRENT_BATCHES) {
          chunks.push(data.slice(i, i + BATCH_SIZE * MAX_CONCURRENT_BATCHES));
        }
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          // Dividir cada chunk em lotes
          const batches = [];
          for (let j = 0; j < chunk.length; j += BATCH_SIZE) {
            batches.push(chunk.slice(j, j + BATCH_SIZE));
          }
          
          // Processar lotes em paralelo
          const batchPromises = batches.map(async (batch) => {
            const batchResults = await Promise.all(
              batch.map(async (row) => {
                if (!row.texto) return null;
                
                try {
                  const analysis = await analyzeWithGPT(row.texto);
                  
                  const feedback: Feedback = {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    comment: row.texto,
                    rating: analysis.rating,
                    sentiment: analysis.rating >= 4 ? 'positive' : analysis.rating <= 2 ? 'negative' : 'neutral',
                    keyword: analysis.keyword,
                    sector: analysis.sector,
                    problem: analysis.problem,
                    hotel: hotelOption === 'account' ? userData?.hotelName || '' : (row.fonte || ''),
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
                  console.error("Erro ao processar linha:", error);
                  if (error.message.includes('exceeded your current quota')) {
                    toast({
                      title: "Limite de API Atingido",
                      description: "Seu limite de uso da API foi atingido. Verifique suas configurações de faturamento.",
                      variant: "destructive",
                    } as ToastProps);
                    throw error;
                  }
                  if (error.message.includes('API Key')) {
                    toast({
                      title: "Erro na Análise",
                      description: "Configure a API Key nas Configurações para usar a análise avançada.",
                      variant: "destructive",
                    } as ToastProps);
                  }
                  return null;
                }
              })
            );
            
            return batchResults.filter((item): item is Feedback => item !== null);
          });
          
          // Aguardar todos os lotes do chunk atual
          const results = await Promise.all(batchPromises);
          for (const batchResult of results) {
            result.push(...batchResult);
          }
          
          // Atualizar progresso
          setProgress((result.length / data.length) * 100);
          
          // Pequeno delay entre chunks
          if (i < chunks.length - 1) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        }
        
        return result;
      };

      // Processar os dados
      const processedData = await processDataInChunks(data);

      // Salvar no armazenamento local
      storeFeedbacks(processedData);
      
      // Preparar dados para análise
      const analysisData: any = {
        totalFeedbacks: processedData.length,
        averageRating: processedData.reduce((acc, item) => acc + item.rating, 0) / processedData.length,
        positiveSentiment: Math.round((processedData.filter(item => item.sentiment === 'positive').length / processedData.length) * 100),
        responseRate: 0, // Pode ser calculado se tiver essa informação
        hotelDistribution: processHotelDistribution(processedData),
        sourceDistribution: processSourceDistribution(processedData),
        languageDistribution: processLanguageDistribution(processedData),
        ratingDistribution: processRatingDistribution(processedData),
        sectorDistribution: processSectorDistribution(processedData),
        keywordDistribution: processKeywordDistribution(processedData),
        sentimentTrend: [], // Pode ser calculado se tiver datas
        recentFeedbacks: processedData.slice(0, 5), // Últimos 5 feedbacks
        problemDistribution: processProblemDistribution(processedData),
        apartamentoDistribution: processApartamentoDistribution(processedData)
      };
      
      // Verificar se estamos em ambiente de teste
      if (isTestEnvironment) {
        // Marcar dados como pertencentes ao ambiente de teste
        analysisData.isTestEnvironment = true;
        
        // Se estiver em ambiente de teste e for opção de "conta", use o primeiro hotel de teste
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
      
      // Salvar no Firestore incluindo as informações do hotel atual
      try {
        const analysisId = await saveAnalysis({
          hotelId: hotelId, // ID do hotel do usuário autenticado
          hotelName: hotelName,
          data: processedData,
          analysis: analysisData,
          isTestEnvironment: isTestEnvironment
        });
        
        toast({
          title: "Dados Salvos no Firebase",
          description: "Os dados foram salvos com sucesso e podem ser acessados no histórico.",
        });
        
        // Redirecionar para a página de análise
        router.push(`/analysis`);
      } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
        toast({
          title: "Erro ao Salvar",
          description: "Não foi possível salvar os dados no Firebase. Tente novamente.",
          variant: "destructive",
        } as ToastProps);
      }
      
      setProgress(100);
      setComplete(true);
      
      toast({
        title: "Importação Concluída",
        description: `${processedData.length} feedbacks analisados e importados com sucesso.`,
      });
    } catch (error: any) {
      console.error("Erro durante a importação:", error);
      toast({
        title: "Erro na Importação",
        description: error.message || "Ocorreu um erro durante a importação dos dados.",
        variant: "destructive",
      } as ToastProps);
    } finally {
      setImporting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    disabled: importing,
    multiple: false,
  });

  // Funções para processar distribuições (funções auxiliares)
  const processHotelDistribution = (data: Feedback[]) => {
    const hotelCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      // Usar nomeHotel que já foi configurado conforme a escolha do usuário
      const hotel = feedback.hotel;
      if (hotel) {
        hotelCounts[hotel] = (hotelCounts[hotel] || 0) + 1;
      }
    });
    
    return Object.entries(hotelCounts)
      .map(([hotel, count]) => ({ label: hotel, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processSourceDistribution = (data: Feedback[]) => {
    return Object.entries(
      data.reduce((acc, item) => {
        const source = item.source || 'Outro';
        if (!acc[source]) acc[source] = 0;
        acc[source]++;
        return acc;
      }, {} as Record<string, number>)
    ).map(([label, value]) => ({ label, value }));
  };

  const processLanguageDistribution = (data: Feedback[]) => {
    return Object.entries(
      data.reduce((acc, item) => {
        const language = item.language || 'Outro';
        if (!acc[language]) acc[language] = 0;
        acc[language]++;
        return acc;
      }, {} as Record<string, number>)
    ).map(([label, value]) => ({ label, value }));
  };

  const processRatingDistribution = (data: Feedback[]) => {
    const ratings = [1, 2, 3, 4, 5];
    return ratings.map(rating => ({
      label: rating.toString(),
      value: data.filter(item => item.rating === rating).length
    }));
  };

  const processSectorDistribution = (data: Feedback[]) => {
    const sectorMap: Record<string, string> = {
      "atendimento": "Atendimento",
      "recepção": "Recepção",
      "limpeza": "Limpeza",
      "quarto": "Acomodações",
      "banheiro": "Acomodações",
      "café": "Alimentos e Bebidas",
      "restaurante": "Alimentos e Bebidas",
      "comida": "Alimentos e Bebidas",
      "bebida": "Alimentos e Bebidas",
      "refeição": "Alimentos e Bebidas",
      "localização": "Localização",
      "piscina": "Lazer",
      "spa": "Lazer",
      "wifi": "Tecnologia",
      "internet": "Tecnologia",
      "estacionamento": "Infraestrutura",
      "barulho": "Conforto",
      "ruído": "Conforto",
      "preço": "Valor",
      "custo": "Valor",
      "roubo": "Segurança",
      "segurança": "Segurança"
    };

    return Object.entries(
      data.reduce((acc, item) => {
        let found = false;
        
        if (item.sector) {
          const sectorKey = Object.keys(sectorMap).find(key => 
            item.sector.toLowerCase().includes(key)
          );
          
          if (sectorKey) {
            const mappedSector = sectorMap[sectorKey];
            if (!acc[mappedSector]) acc[mappedSector] = 0;
            acc[mappedSector]++;
            found = true;
          }
        }
        
        if (!found) {
          if (!acc["Outros"]) acc["Outros"] = 0;
          acc["Outros"]++;
        }
        
        return acc;
      }, {} as Record<string, number>)
    ).map(([label, value]) => ({ label, value }));
  };

  const processKeywordDistribution = (data: Feedback[]) => {
    // Primeiro, extrair todas as palavras-chave
    const allKeywords = data
      .filter(item => item.keyword)
      .flatMap(item => item.keyword.split(',').map(k => k.trim()))
      .filter(k => k.length > 1); // Filtrar palavras vazias
    
    // Contar a frequência de cada palavra-chave
    const keywordCounts = allKeywords.reduce((acc, keyword) => {
      if (!acc[keyword.toLowerCase()]) {
        acc[keyword.toLowerCase()] = 0;
      }
      acc[keyword.toLowerCase()]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Classificar por frequência e limitar aos 10 maiores
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ 
        label: label.charAt(0).toUpperCase() + label.slice(1), 
        value 
      }));
  };

  const processProblemDistribution = (data: Feedback[]) => {
    // Agrupar problemas semelhantes
    const problemMap: Record<string, string> = {
      "atraso": "Atrasos",
      "espera": "Tempo de Espera",
      "demora": "Tempo de Espera",
      "sujo": "Limpeza",
      "suja": "Limpeza",
      "limpeza": "Limpeza",
      "barulho": "Ruído",
      "ruído": "Ruído",
      "barulhento": "Ruído",
      "frio": "Temperatura",
      "quente": "Temperatura",
      "ar-condicionado": "Equipamentos",
      "defeito": "Manutenção",
      "quebrado": "Manutenção",
      "preço": "Preço Alto",
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
          
          // Verificar se o problema corresponde a um dos grupos predefinidos
          for (const [key, group] of Object.entries(problemMap)) {
            if (item.problem.toLowerCase().includes(key)) {
              if (!acc[group]) acc[group] = 0;
              acc[group]++;
              matched = true;
              break;
            }
          }
          
          // Se não corresponder a nenhum grupo, adicionar como "Outros"
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
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">Importar Feedbacks</h2>
        <p className="text-muted-foreground">
          Arraste e solte arquivos CSV ou XLSX contendo feedbacks para começar a análise.
        </p>
      </div>
      
      {/* Interface de escolha de hotel (mostrada após detecção) */}
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
      
      {detectingHotels && (
        <Card className="p-6 my-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg">Analisando arquivo...</p>
            <p className="text-sm text-muted-foreground">Detectando hotéis e preparando para importação</p>
          </div>
        </Card>
      )}
      
      {/* Área de drop zone (modificar a existente) */}
      {!importing && !detectingHotels && chosenHotelOption === null && hotelsInFile.length === 0 && (
        <Card 
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 hover:bg-muted/50 transition cursor-pointer",
            isDragActive && "border-primary bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? "Solte o arquivo aqui..." : "Arraste e solte um arquivo"}
          </h3>
            <p className="text-muted-foreground mb-4 max-w-xs">
              Arraste um arquivo CSV ou XLSX, ou clique para selecionar manualmente.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileType className="h-4 w-4" />
              <span>CSV, XLSX</span>
            </div>
          </div>
        </Card>
      )}
      
      {/* Progresso de importação e resto do componente... */}
      {!importing && !complete ? (
        <div className="space-y-4 w-full max-w-md">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Processando Importação</h3>
            <p className="text-sm text-muted-foreground">
              Estamos analisando seus dados. Isso pode levar alguns minutos dependendo do tamanho do arquivo.
            </p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm font-medium">{Math.round(progress)}%</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          {complete ? (
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
              <Button onClick={() => router.push("/analysis")}>
                Ver Análise
              </Button>
            </div>
          ) : (
            <div className="space-y-4 w-full max-w-md">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Processando Importação</h3>
                <p className="text-sm text-muted-foreground">
                  Estamos analisando seus dados. Isso pode levar alguns minutos dependendo do tamanho do arquivo.
                </p>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm font-medium">{Math.round(progress)}%</p>
          </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ImportPage() {
  return (
    <SharedDashboardLayout>
      <ImportPageContent />
    </SharedDashboardLayout>
  )
}