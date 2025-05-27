"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RequireAdmin } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Star,
  TrendingUp,
  MessageSquare,
  Hotel,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  XCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";

// Interfaces
interface AnalysisData {
  id: string;
  hotelId: string;
  hotelName: string;
  importDate: Date;
  data: any[];
  analysis: {
    averageRating: number;
    positiveSentiment: number;
    ratingDistribution: Array<{label: string; value: number}>;
    problemDistribution: Array<{label: string; value: number}>;
    hotelDistribution: Array<{label: string; value: number}>;
    languageDistribution: Array<{label: string; value: number}>;
    keywordDistribution: Array<{label: string; value: number}>;
    apartamentoDistribution: Array<{name: string; value: number}>;
    recentFeedbacks: any[];
  };
}

interface Hotel {
  id: string;
  name: string;
}

interface ProblemItem {
  label: string;
  value: number;
}

interface HotelStat {
  hotel: string;
  totalFeedbacks: number;
  averageRating: string;
  sentiment: number;
  ratingDistribution: number[];
  topProblems: Array<{problem: string; count: number}>;
  sourcesDistribution: Array<{source: string; count: number}>;
  apartamentosDistribution: Array<{apartamento: string; count: number}>;
}

interface ApartamentoDetail {
  apartamento: string;
  count: number;
  averageRating: number; // Mudado para number
  sentiment: number;
  mainHotel: string;
  hotels: Map<string, number>;
  topProblems: Array<{problem: string; count: number}>;
  ratingDistribution: number[];
}

// Cores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7300'];

// Componente principal
function AdminDashboardContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados principais
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [filteredData, setFilteredData] = useState<AnalysisData | null>(null);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [dateRange, setDateRange] = useState<{start: Date | null; end: Date | null}>({
    start: null,
    end: null
  });

  // Estados para modal de detalhes
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<any[]>([]);

  // Estados para abas expandidas
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<string>("asc");

  // Função para diagnóstico
  const runDiagnostics = async () => {
    console.log("Executando diagnóstico completo...");
    
    try {
      const analysesRef = collection(db, "analyses");
      const analysesSnapshot = await getDocs(analysesRef);
      
      const hotelsRef = collection(db, "hotels");
      const hotelsSnapshot = await getDocs(hotelsRef);
      
      const info = [
        `=== DIAGNÓSTICO FIRESTORE ===`,
        `Timestamp: ${new Date().toISOString()}`,
        ``,
        `Coleção 'analyses':`,
        `- Total de documentos: ${analysesSnapshot.docs.length}`,
        ``,
        `Documentos encontrados:`,
        ...analysesSnapshot.docs.map(doc => {
          const data = doc.data();
          return `- ID: ${doc.id}, Hotel: ${data.hotelName || 'N/A'}, Data: ${data.importDate?.toDate?.() || data.importDate}, Feedbacks: ${data.data?.length || 0}`;
        }),
        ``,
        `Coleção 'hotels':`,
        `- Total de documentos: ${hotelsSnapshot.docs.length}`,
        ``,
        `Hotéis encontrados:`,
        ...hotelsSnapshot.docs.map(doc => {
          const data = doc.data();
          return `- ID: ${doc.id}, Nome: ${data.name || 'N/A'}`;
        }),
        ``,
        `=== FIM DO DIAGNÓSTICO ===`
      ].join('\n');
      
      setDebugInfo(info);
      console.log(info);
    } catch (error) {
      console.error("Erro no diagnóstico:", error);
      setDebugInfo(`Erro no diagnóstico: ${error}`);
    }
  };

  // Função para obter cor do badge baseado na avaliação
  const getBadgeVariant = (rating: number) => {
    if (rating >= 4) return "default";
    if (rating >= 3) return "outline";
    return "destructive";
  };

  // Função para alternar expansão de hotéis
  const toggleHotelExpansion = (hotelName: string) => {
    const newExpanded = new Set(expandedHotels);
    if (newExpanded.has(hotelName)) {
      newExpanded.delete(hotelName);
    } else {
      newExpanded.add(hotelName);
    }
    setExpandedHotels(newExpanded);
  };

  // Função para ordenar hotéis
  const sortHotels = (hotels: HotelStat[]) => {
    switch (sortOrder) {
      case "desc":
        return [...hotels].sort((a, b) => b.hotel.localeCompare(a.hotel));
      case "most":
        return [...hotels].sort((a, b) => b.totalFeedbacks - a.totalFeedbacks);
      case "least":
        return [...hotels].sort((a, b) => a.totalFeedbacks - b.totalFeedbacks);
      case "asc":
      default:
        return [...hotels].sort((a, b) => a.hotel.localeCompare(b.hotel));
    }
  };

  // Função para lidar com cliques em gráficos
  const handleChartClick = (data: any, type: string) => {
    console.log("Clique no gráfico:", data, type);
    
    if (!analysisData?.data) {
      toast({
        title: "Erro",
        description: "Dados não disponíveis",
        variant: "destructive",
      });
      return;
    }

    let filteredFeedbacks: any[] = [];
    let title = "";

    const dataToUse = isFilterApplied && filteredData ? filteredData : analysisData;

    switch (type) {
      case 'rating':
        const rating = parseInt(data.label);
        filteredFeedbacks = dataToUse.data.filter((feedback: any) => 
          Math.floor(feedback.rating) === rating
        );
        title = `Feedbacks com avaliação ${rating} estrela${rating !== 1 ? 's' : ''}`;
        break;

      case 'problem':
        const problemLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.data.filter((feedback: any) => {
          if (feedback.problems && Array.isArray(feedback.problems)) {
            return feedback.problems.includes(problemLabel);
          }
          if (feedback.problem && typeof feedback.problem === 'string') {
            return feedback.problem.split(';').map((p: string) => p.trim()).includes(problemLabel);
          }
          return false;
        });
        title = `Feedbacks sobre: ${problemLabel}`;
        break;

      case 'hotel':
        const hotelLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.data.filter((feedback: any) => 
          feedback.hotel === hotelLabel
        );
        title = `Feedbacks do ${hotelLabel}`;
        break;

      case 'source':
        const sourceLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.data.filter((feedback: any) => 
          feedback.source === sourceLabel
        );
        title = `Feedbacks do ${sourceLabel}`;
        break;

      case 'apartamento':
        const apartamentoLabel = data.name || data.label;
        filteredFeedbacks = dataToUse.data.filter((feedback: any) => 
          feedback.apartamento === apartamentoLabel
        );
        title = `Feedbacks do Apartamento ${apartamentoLabel}`;
        break;

      default:
        console.log("Tipo de clique não reconhecido:", type);
        return;
    }

    console.log(`Encontrados ${filteredFeedbacks.length} feedbacks para ${type}:`, data);

    if (filteredFeedbacks.length === 0) {
      toast({
        title: "Nenhum feedback encontrado",
        description: `Não há feedbacks disponíveis para ${type === 'rating' ? 'esta avaliação' : 'este critério'}`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFeedbacks(filteredFeedbacks);
    setSelectedDetail({ title, type, data });
    setDialogOpen(true);
  };

  // Funções de processamento de dados
  const processRatingDistribution = (analysis: any) => {
    if (!analysis?.ratingDistribution) return [];
    return analysis.ratingDistribution.map((item: any) => ({
      label: `${item.label} estrela${item.label !== '1' ? 's' : ''}`,
      value: item.value
    }));
  };

  const processProblemDistribution = (analysis: any) => {
    if (!analysis?.problemDistribution) return [];
    return analysis.problemDistribution.slice(0, 20);
  };

  const processSourceDistribution = (analysis: any) => {
    if (!analysis?.languageDistribution) return [];
    return analysis.languageDistribution.map((item: any) => ({
      label: item.label,
      value: item.value
    }));
  };

  const processApartamentoDistribution = (analysis: any) => {
    if (!analysis?.apartamentoDistribution) return [];
    return analysis.apartamentoDistribution.slice(0, 20);
  };

  const processApartamentoDetailsData = () => {
    if (!analysisData?.data) return [];

    const dataToUse = isFilterApplied && filteredData ? filteredData : analysisData;
    const apartamentoMap = new Map<string, {
      count: number;
      totalRating: number;
      positiveCount: number;
      problems: Map<string, number>;
      hotels: Map<string, number>;
      ratings: number[];
    }>();

    dataToUse.data.forEach((feedback: any) => {
      if (!feedback.apartamento) return;

      if (!apartamentoMap.has(feedback.apartamento)) {
        apartamentoMap.set(feedback.apartamento, {
          count: 0,
          totalRating: 0,
          positiveCount: 0,
          problems: new Map(),
          hotels: new Map(),
          ratings: [0, 0, 0, 0, 0]
        });
      }

      const apartamentoStat = apartamentoMap.get(feedback.apartamento)!;
      apartamentoStat.count++;

      if (feedback.rating) {
        apartamentoStat.totalRating += feedback.rating;
        if (feedback.rating >= 1 && feedback.rating <= 5) {
          apartamentoStat.ratings[Math.floor(feedback.rating) - 1]++;
        }
      }

      if (feedback.sentiment === 'positive') {
        apartamentoStat.positiveCount++;
      }

      if (feedback.problems && Array.isArray(feedback.problems)) {
        feedback.problems.forEach((problem: string) => {
          apartamentoStat.problems.set(problem, (apartamentoStat.problems.get(problem) || 0) + 1);
        });
      } else if (feedback.problem) {
        const problems: string[] = feedback.problem.split(';')
          .map((p: string) => p.trim())
          .filter((p: string) => p);
        
        problems.forEach((problem: string) => {
          apartamentoStat.problems.set(problem, (apartamentoStat.problems.get(problem) || 0) + 1);
        });
      }

      const hotel = feedback.hotel || "Hotel não especificado";
      apartamentoStat.hotels.set(hotel, (apartamentoStat.hotels.get(hotel) || 0) + 1);
    });

    return Array.from(apartamentoMap.entries()).map(([apartamento, stat]) => {
      const averageRating = stat.count > 0 ? (stat.totalRating / stat.count) : 0;
      const sentiment = stat.count > 0 ? Math.round((stat.positiveCount / stat.count) * 100) : 0;
      
      // Encontrar o hotel principal (com mais feedbacks)
      const mainHotelEntry = Array.from(stat.hotels.entries()).sort((a, b) => b[1] - a[1])[0];
      const mainHotel = mainHotelEntry ? mainHotelEntry[0] : "Hotel não especificado";

      const topProblems = Array.from(stat.problems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([problem, count]) => ({ problem, count }));

      return {
        apartamento,
        count: stat.count,
        averageRating, // Agora retorna number diretamente
        sentiment,
        mainHotel,
        hotels: stat.hotels,
        topProblems,
        ratingDistribution: stat.ratings
      } as ApartamentoDetail;
    }).sort((a, b) => b.count - a.count);
  };

  // Dados estatísticos por hotel
  const hotelStats = useMemo((): HotelStat[] => {
    if (!analysisData?.data) return [];

    const dataToUse = isFilterApplied && filteredData ? filteredData : analysisData;
    const stats = new Map<string, {
      hotel: string;
      totalFeedbacks: number;
      totalRating: number;
      positiveCount: number;
      ratings: number[];
      problems: Map<string, number>;
      sources: Map<string, number>;
      apartamentos: Map<string, number>;
    }>();

    dataToUse.data.forEach((feedback: any) => {
      const hotel = feedback.hotel || "Hotel não especificado";
      
      if (!stats.has(hotel)) {
        stats.set(hotel, {
          hotel,
          totalFeedbacks: 0,
          totalRating: 0,
          positiveCount: 0,
          ratings: [0, 0, 0, 0, 0],
          problems: new Map(),
          sources: new Map(),
          apartamentos: new Map()
        });
      }
      
      const hotelStat = stats.get(hotel)!;
      hotelStat.totalFeedbacks++;
      
      if (feedback.rating) {
        hotelStat.totalRating += feedback.rating;
        if (feedback.rating >= 1 && feedback.rating <= 5) {
          hotelStat.ratings[Math.floor(feedback.rating) - 1]++;
        }
      }
      
      if (feedback.sentiment === 'positive') {
        hotelStat.positiveCount++;
      }
      
      if (feedback.problems && Array.isArray(feedback.problems)) {
        feedback.problems.forEach((problem: string) => {
          hotelStat.problems.set(problem, (hotelStat.problems.get(problem) || 0) + 1);
        });
      } else if (feedback.problem) {
        const problems: string[] = feedback.problem.split(';')
          .map((p: string) => p.trim())
          .filter((p: string) => p);
        
        problems.forEach((problem: string) => {
          hotelStat.problems.set(problem, (hotelStat.problems.get(problem) || 0) + 1);
        });
      }
      
      if (feedback.source) {
        hotelStat.sources.set(feedback.source, (hotelStat.sources.get(feedback.source) || 0) + 1);
      }
      
      if (feedback.apartamento) {
        hotelStat.apartamentos.set(feedback.apartamento, (hotelStat.apartamentos.get(feedback.apartamento) || 0) + 1);
      }
    });
    
    return Array.from(stats.values()).map(stat => ({
      hotel: stat.hotel,
      totalFeedbacks: stat.totalFeedbacks,
      averageRating: stat.totalFeedbacks ? (stat.totalRating / stat.totalFeedbacks).toFixed(1) : "0",
      sentiment: stat.totalFeedbacks ? Math.round((stat.positiveCount / stat.totalFeedbacks) * 100) : 0,
      ratingDistribution: stat.ratings,
      topProblems: Array.from(stat.problems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([problem, count]) => ({ problem, count })),
      sourcesDistribution: Array.from(stat.sources.entries())
        .map(([source, count]) => ({ source, count })),
      apartamentosDistribution: Array.from(stat.apartamentos.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([apartamento, count]) => ({ apartamento, count }))
    }));
  }, [analysisData, filteredData, isFilterApplied]);

  // Função para buscar dados administrativos
  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log("Iniciando busca de dados como admin");
      
      // Carregar todos os hotéis
      const hotelsRef = collection(db, "hotels");
      const hotelsSnapshot = await getDocs(hotelsRef);
      const hotelsData = hotelsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.hotelId || doc.id,
          name: data.name || doc.id
        };
      });
      setHotels(hotelsData);
      console.log("Hotéis carregados:", hotelsData.length);
      
      // Buscar análises
      const analysesRef = collection(db, "analyses");
      const analysesSnapshot = await getDocs(analysesRef);
      const analyses = analysesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Total de análises encontradas:", analyses.length);
      
      if (analyses && analyses.length > 0) {
        // Criar análise combinada
        let combinedAnalysis: AnalysisData = {
          id: "combined",
          hotelId: "all",
          hotelName: "Todos os Hotéis",
          importDate: new Date(),
          data: [],
          analysis: {
            averageRating: 0,
            positiveSentiment: 0,
            ratingDistribution: [],
            problemDistribution: [],
            hotelDistribution: [],
            languageDistribution: [],
            keywordDistribution: [],
            apartamentoDistribution: [],
            recentFeedbacks: []
          }
        };
        
        // Processar dados combinados
        let totalRating = 0;
        let totalSentiment = 0;
        let totalFeedbacks = 0;

        const ratingMap = new Map<string, number>();
        const problemMap = new Map<string, number>();
        const hotelMap = new Map<string, number>();
        const sourceMap = new Map<string, number>();
        const keywordMap = new Map<string, number>();
        const apartamentoMap = new Map<string, number>();
        const allFeedbacks: any[] = [];

        // Filtrar por data se necessário
        const filterByDate = (feedback: any) => {
          if (!dateRange.start && !dateRange.end) return true;
          
          const feedbackDate = new Date(feedback.date);
          
          if (dateRange.start && !dateRange.end) {
            return feedbackDate >= dateRange.start;
          }
          
          if (!dateRange.start && dateRange.end) {
            return feedbackDate <= dateRange.end;
          }
          
          return feedbackDate >= dateRange.start! && feedbackDate <= dateRange.end!;
        };

        // Processar cada análise
        analyses.forEach((analysis: any) => {
          if (!analysis.data || !Array.isArray(analysis.data)) {
            console.log("Análise sem dados válidos:", analysis.id);
            return;
          }
          
          const filteredData = analysis.data.filter(filterByDate);
          totalFeedbacks += filteredData.length;
          
          allFeedbacks.push(...filteredData.map((f: any) => ({
            ...f,
            hotel: analysis.hotelName || "Hotel não especificado"
          })));
          
          filteredData.forEach((f: any) => {
            if (f.rating) {
              totalRating += f.rating;
              const ratingStr = String(Math.floor(f.rating));
              ratingMap.set(ratingStr, (ratingMap.get(ratingStr) || 0) + 1);
            }
            
            if (f.sentiment === 'positive') {
              totalSentiment++;
            }
            
            if (f.problems && Array.isArray(f.problems)) {
              f.problems.forEach((problem: string) => {
                problemMap.set(problem, (problemMap.get(problem) || 0) + 1);
              });
            } else if (f.problem) {
              const problems: string[] = f.problem.split(';')
                .map((p: string) => p.trim())
                .filter((p: string) => p);
              
              problems.forEach((problem: string) => {
                problemMap.set(problem, (problemMap.get(problem) || 0) + 1);
              });
            }
            
            const hotelName = f.hotel || analysis.hotelName || "Hotel não especificado";
            hotelMap.set(hotelName, (hotelMap.get(hotelName) || 0) + 1);
            
            if (f.source) {
              sourceMap.set(f.source, (sourceMap.get(f.source) || 0) + 1);
            }
            
            if (f.keyword) {
              keywordMap.set(f.keyword, (keywordMap.get(f.keyword) || 0) + 1);
            }
            
            if (f.apartamento) {
              apartamentoMap.set(f.apartamento, (apartamentoMap.get(f.apartamento) || 0) + 1);
            }
          });
        });
        
        // Atualizar análise combinada
        combinedAnalysis.data = allFeedbacks;
        combinedAnalysis.analysis = {
          averageRating: totalFeedbacks > 0 ? totalRating / totalFeedbacks : 0,
          positiveSentiment: totalFeedbacks > 0 ? Math.round((totalSentiment / totalFeedbacks) * 100) : 0,
          ratingDistribution: Array.from(ratingMap.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => Number(a.label) - Number(b.label)),
          problemDistribution: Array.from(problemMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value })),
          hotelDistribution: Array.from(hotelMap.entries())
            .map(([label, value]) => ({ label, value })),
          languageDistribution: Array.from(sourceMap.entries())
            .map(([label, value]) => ({ label, value })),
          keywordDistribution: Array.from(keywordMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value })),
          apartamentoDistribution: Array.from(apartamentoMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value })),
          recentFeedbacks: allFeedbacks
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
        };
        
        setAnalysisData(combinedAnalysis);
        setFilteredData(null);
        setIsFilterApplied(false);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setIsLoading(false);
    }
  };

  // Função para aplicar filtro por hotel
  const applyHotelFilter = (hotelId: string) => {
    if (hotelId === "todos") {
      setFilteredData(null);
      setIsFilterApplied(false);
      setSelectedHotel("todos");
      
      toast({
        title: "Filtro removido",
        description: "Mostrando dados de todos os hotéis",
      });
      return;
    }
    
    setSelectedHotel(hotelId);
    
    if (!analysisData || !analysisData.data) {
      return;
    }
    
    const hotel = hotels.find(h => h.id === hotelId);
    const hotelName = hotel ? hotel.name : "Hotel desconhecido";
    
    const filteredFeedbacks = analysisData.data.filter(
      (feedback: any) => feedback.hotel === hotelName
    );
    
    if (filteredFeedbacks.length === 0) {
      toast({
        title: "Nenhum feedback encontrado",
        description: `Não há feedbacks disponíveis para o hotel ${hotelName}`,
        variant: "destructive",
      });
      return;
    }
    
    // Criar análise filtrada (similar ao código existente mas simplificado)
    const filteredAnalysis: AnalysisData = {
      ...analysisData,
      hotelId: hotelId,
      hotelName: hotelName,
      data: filteredFeedbacks,
      analysis: {
        ...analysisData.analysis
      }
    };
    
    // Recalcular métricas para dados filtrados
    let totalRating = 0;
    let positiveSentimentCount = 0;
    
    const ratingMap = new Map<string, number>();
    const problemMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    const keywordMap = new Map<string, number>();
    const apartamentoMap = new Map<string, number>();
    
    filteredFeedbacks.forEach((feedback: any) => {
      if (feedback.rating) {
        totalRating += feedback.rating;
        const ratingStr = String(Math.floor(feedback.rating));
        ratingMap.set(ratingStr, (ratingMap.get(ratingStr) || 0) + 1);
      }
      
      if (feedback.sentiment === 'positive') {
        positiveSentimentCount++;
      }
      
      if (feedback.problems && Array.isArray(feedback.problems)) {
        feedback.problems.forEach((problem: string) => {
          problemMap.set(problem, (problemMap.get(problem) || 0) + 1);
        });
      } else if (feedback.problem) {
        const problems: string[] = feedback.problem.split(';')
          .map((p: string) => p.trim())
          .filter((p: string) => p);
        
        problems.forEach((problem: string) => {
          problemMap.set(problem, (problemMap.get(problem) || 0) + 1);
        });
      }
      
      if (feedback.source) {
        sourceMap.set(feedback.source, (sourceMap.get(feedback.source) || 0) + 1);
      }
      
      if (feedback.keyword) {
        keywordMap.set(feedback.keyword, (keywordMap.get(feedback.keyword) || 0) + 1);
      }
      
      if (feedback.apartamento) {
        apartamentoMap.set(feedback.apartamento, (apartamentoMap.get(feedback.apartamento) || 0) + 1);
      }
    });
    
    filteredAnalysis.analysis = {
      averageRating: filteredFeedbacks.length > 0 ? totalRating / filteredFeedbacks.length : 0,
      positiveSentiment: filteredFeedbacks.length > 0 ? Math.round((positiveSentimentCount / filteredFeedbacks.length) * 100) : 0,
      ratingDistribution: Array.from(ratingMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      problemDistribution: Array.from(problemMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      hotelDistribution: [{ label: hotelName, value: filteredFeedbacks.length }],
      languageDistribution: Array.from(sourceMap.entries())
        .map(([label, value]) => ({ label, value })),
      keywordDistribution: Array.from(keywordMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      apartamentoDistribution: Array.from(apartamentoMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
      recentFeedbacks: filteredFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    };
    
    setFilteredData(filteredAnalysis);
    setIsFilterApplied(true);
    
    toast({
      title: "Filtro aplicado",
      description: `Mostrando dados para ${hotelName}`,
    });
  };

  // Effect para carregar dados
  useEffect(() => {
    fetchData();
  }, [selectedHotel, dateRange]);

  // Calcular totais
  const totalFeedbacks = analysisData?.data.length || 0;
  const totalHotels = analysisData?.analysis.hotelDistribution.length || 0;
  
  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Renderização condicional
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Nenhum dado encontrado</h2>
        <p className="text-muted-foreground mb-6">
          Não há dados de feedback disponíveis para análise.
        </p>
        
        <Button onClick={runDiagnostics} variant="outline" className="mb-4">
          Executar Diagnóstico
        </Button>
        
        {debugInfo && (
          <div className="mt-4 p-4 bg-muted text-left rounded text-sm overflow-auto max-h-96">
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Painel Administrativo</h2>
            <p className="text-muted-foreground">
              Visão geral consolidada de todos os hotéis do grupo
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            <Button 
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar Dados
                </>
              )}
            </Button>
            
            <Select
              value={selectedHotel}
              onValueChange={setSelectedHotel}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar Hotel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Hotéis</SelectItem>
                {hotels.map((hotel) => (
                  <SelectItem key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Data inicial</span>
                <DatePicker 
                  date={dateRange.start} 
                  onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                />
              </div>
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Data final</span>
                <DatePicker 
                  date={dateRange.end} 
                  onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(!analysisData.analysis.averageRating || isNaN(analysisData.analysis.averageRating)) 
                  ? "0.0" 
                  : analysisData.analysis.averageRating.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {totalFeedbacks} feedbacks
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sentimento Positivo</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(!analysisData.analysis.positiveSentiment || isNaN(analysisData.analysis.positiveSentiment)) 
                  ? "0" 
                  : analysisData.analysis.positiveSentiment}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Índice de satisfação geral
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Feedbacks</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFeedbacks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dateRange.start || dateRange.end ? 'No período selecionado' : 'Em todos os períodos'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hotéis Monitorados</CardTitle>
              <Hotel className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHotels}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Com dados analisados
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Abas principais */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="hotels">Hotéis</TabsTrigger>
            <TabsTrigger value="problems">Problemas</TabsTrigger>
            <TabsTrigger value="ratings">Avaliações</TabsTrigger>
            <TabsTrigger value="apartamentos">Apartamentos</TabsTrigger>
            <TabsTrigger value="hoteisApartamentos">Hotéis e Apartamentos</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Distribuição de Avaliações */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Distribuição de Avaliações</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processRatingDistribution(analysisData.analysis)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar
                        dataKey="value"
                        name="Quantidade"
                        fill="#8884d8"
                        onClick={(data) => handleChartClick(data, 'rating')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Distribuição de Problemas */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Principais Problemas</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={processProblemDistribution(analysisData.analysis).slice(0, 6)}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 100,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="label" type="category" width={90} />
                      <RechartsTooltip />
                      <Bar 
                        dataKey="value" 
                        name="Quantidade" 
                        fill="#FF8042"
                        onClick={(data) => handleChartClick(data, 'problem')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fontes dos Comentários */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Fontes dos Comentários</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processSourceDistribution(analysisData.analysis)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="label"
                        onClick={(_, index) => {
                          const item = processSourceDistribution(analysisData.analysis)[index];
                          handleChartClick(item, 'source');
                        }}
                      >
                        {processSourceDistribution(analysisData.analysis).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Feedbacks Recentes */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Feedbacks Recentes</h3>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {analysisData.analysis.recentFeedbacks.map((feedback: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getBadgeVariant(feedback.rating)}>
                              {feedback.rating || "?"} ★
                            </Badge>
                            <span className="text-sm font-medium">{feedback.hotel || "Hotel não especificado"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(feedback.date)}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-3">{feedback.comment}</p>
                        {feedback.source && (
                          <div className="mt-2 flex justify-between items-center">
                            <Badge variant="secondary" className="text-xs">
                              {feedback.source}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Sentimento: {feedback.sentiment !== undefined ? (
                                <Badge 
                                  variant={
                                    feedback.sentiment >= 70 
                                      ? "default" as "default" 
                                      : feedback.sentiment >= 50 
                                        ? "outline" as "outline" 
                                        : "destructive" as "destructive"
                                  }
                                >
                                  {feedback.sentiment}%
                                </Badge>
                              ) : "N/A"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          {/* Hotéis */}
          <TabsContent value="hotels" className="space-y-4">
            {/* Resumo por hotel */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Comparação entre Hotéis</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={hotelStats.map(stat => ({
                      name: stat.hotel,
                      feedbacks: stat.totalFeedbacks,
                      rating: parseFloat(stat.averageRating),
                      sentiment: stat.sentiment
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                      interval={0}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 5]} />
                    <YAxis yAxisId="sentiment" orientation="right" stroke="#ff7300" hide />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="feedbacks" name="Total de Feedbacks" fill="#8884d8" onClick={(data) => handleChartClick({label: data.name}, 'hotel')} />
                    <Line yAxisId="right" type="monotone" dataKey="rating" name="Avaliação Média" stroke="#82ca9d" />
                    <Line yAxisId="sentiment" type="monotone" dataKey="sentiment" name="Sentimento Positivo (%)" stroke="#ff7300" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Tabela de hotéis com detalhes */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Principais Problemas por Hotel</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 bg-muted border-b text-left">Hotel</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Feedbacks</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Avaliação</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Sentimento</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Problema Principal</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Problema Secundário</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotelStats.map((stat, index) => (
                      <tr key={index} className="hover:bg-muted/50">
                        <td className="py-2 px-4 border-b">{stat.hotel}</td>
                        <td className="py-2 px-4 border-b text-center">{stat.totalFeedbacks}</td>
                        <td className="py-2 px-4 border-b text-center">
                          <div className="flex items-center justify-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className={parseFloat(stat.averageRating) >= 4 ? 'text-green-600 font-bold' : parseFloat(stat.averageRating) >= 3 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>
                              {stat.averageRating}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          <Badge variant={stat.sentiment >= 70 ? "default" : stat.sentiment >= 50 ? "outline" : "destructive"}>
                            {stat.sentiment}%
                          </Badge>
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          {stat.topProblems && stat.topProblems.length > 0 ? (
                            <Badge variant="outline" className="bg-red-50">
                              {stat.topProblems[0].problem} ({stat.topProblems[0].count})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50">
                              Nenhum problema significativo
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          {stat.topProblems && stat.topProblems.length > 1 ? (
                            <Badge variant="outline" className="bg-yellow-50">
                              {stat.topProblems[1].problem} ({stat.topProblems[1].count})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50">
                              Nenhum problema secundário
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          <Button variant="outline" size="sm" onClick={() => handleChartClick({label: stat.hotel}, 'hotel')}>
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Cards detalhados para cada hotel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hotelStats.map((stat, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">{stat.hotel}</CardTitle>
                    <CardDescription>
                      {stat.totalFeedbacks} feedbacks analisados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Avaliação média</p>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-bold">{stat.averageRating}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-sm text-muted-foreground">Sentimento</p>
                        <div className="flex items-center justify-end">
                          <span className="font-bold">{stat.sentiment}%</span>
                          <TrendingUp className={`h-4 w-4 ml-1 ${stat.sentiment >= 70 ? 'text-green-500' : stat.sentiment >= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm mb-2">Distribuição de avaliações</p>
                      <div className="flex justify-between">
                        {stat.ratingDistribution.map((count: number, idx: number) => (
                          <div key={idx} className="flex flex-col items-center">
                            <div className="text-xs">{idx + 1}★</div>
                            <div 
                              className={`w-6 ${idx < 2 ? 'bg-red-200' : idx < 3 ? 'bg-yellow-200' : 'bg-green-200'} rounded-sm text-center text-xs`} 
                              style={{ height: `${Math.max(20, (count / Math.max(...stat.ratingDistribution)) * 80)}px` }}
                            >
                              {count > 0 && count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {stat.topProblems.length > 0 && (
                      <div>
                        <p className="text-sm mb-2">Principais problemas</p>
                        <div className="space-y-2">
                          {stat.topProblems.map((item, idx) => (
                            <div key={idx} className="relative pt-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium text-primary truncate max-w-[80%]">
                                  {item.problem}
                                </div>
                                <div className="text-xs font-medium text-primary">
                                  {item.count}
                                </div>
                              </div>
                              <div className="overflow-hidden h-2 text-xs flex rounded bg-muted">
                                <div
                                  style={{ width: `${(item.count / stat.totalFeedbacks) * 100}%` }}
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {stat.apartamentosDistribution && stat.apartamentosDistribution.length > 0 && (
                      <div>
                        <p className="text-sm mb-2">Apartamentos ({stat.apartamentosDistribution.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {stat.apartamentosDistribution.slice(0, 5).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item.apartamento}: {item.count}
                            </Badge>
                          ))}
                          {stat.apartamentosDistribution.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{stat.apartamentosDistribution.length - 5} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => handleChartClick({label: stat.hotel}, 'hotel')}
                    >
                      Ver todos os feedbacks
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Problemas */}
          <TabsContent value="problems" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Problemas Mais Comuns</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={processProblemDistribution(isFilterApplied && filteredData ? filteredData.analysis : analysisData.analysis).slice(0, 15)}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 120,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="label" type="category" width={110} />
                      <RechartsTooltip />
                      <Bar 
                        dataKey="value" 
                        name="Quantidade" 
                        fill="#FF8042"
                        onClick={(data) => handleChartClick({label: data.label}, 'problem')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Distribuição de Problemas</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processProblemDistribution(isFilterApplied && filteredData ? filteredData.analysis : analysisData.analysis).slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }: any) => `${name ? name.substring(0, 15) + '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="label"
                        onClick={(data, index) => {
                          const item = processProblemDistribution(isFilterApplied && filteredData ? filteredData.analysis : analysisData.analysis)[index];
                          handleChartClick(item, 'problem');
                        }}
                      >
                        {processProblemDistribution(isFilterApplied && filteredData ? filteredData.analysis : analysisData.analysis).slice(0, 10).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend
                        formatter={(value, entry, index) => {
                          return value.length > 20 ? value.substring(0, 20) + '...' : value;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Tabela de problemas com detalhes */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Lista de Problemas</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 bg-muted border-b text-left">Problema</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Ocorrências</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">% do Total</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Hotéis Principais</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processProblemDistribution(isFilterApplied && filteredData ? filteredData.analysis : analysisData.analysis)
                      .slice(0, 20)
                      .map((problem: ProblemItem, index: number) => {
                        const hotelEntries = Object.entries(
                          (isFilterApplied && filteredData ? filteredData : analysisData).data
                            .filter((item: any) => {
                              if (item.problems && Array.isArray(item.problems)) {
                                return item.problems.includes(problem.label);
                              }
                              if (item.problem && typeof item.problem === 'string') {
                                return item.problem.split(';').map((p: string) => p.trim()).includes(problem.label);
                              }
                              return false;
                            })
                            .reduce((acc: Record<string, number>, item: any) => {
                              const hotel = item.hotel || "Desconhecido";
                              acc[hotel] = (acc[hotel] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                        )
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .slice(0, 2)
                        .map(([hotel]) => hotel);

                        const totalProblems = processProblemDistribution(isFilterApplied && filteredData ? filteredData.analysis : analysisData.analysis)
                          .reduce((sum: number, p: ProblemItem) => sum + p.value, 0);
                        const percentage = totalProblems > 0 ? ((problem.value / totalProblems) * 100).toFixed(1) : "0";

                        return (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="py-2 px-4 border-b">{problem.label}</td>
                            <td className="py-2 px-4 border-b text-center">{problem.value}</td>
                            <td className="py-2 px-4 border-b text-center">{percentage}%</td>
                            <td className="py-2 px-4 border-b text-center">
                              {hotelEntries.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {hotelEntries.map((hotel, idx) => (
                                    <Badge key={idx} variant="outline">
                                      {hotel}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="py-2 px-4 border-b text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChartClick({label: problem.label}, 'problem')}
                              >
                                Ver feedbacks
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Avaliações */}
          <TabsContent value="ratings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Fontes dos Comentários</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processSourceDistribution(analysisData.analysis)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="label"
                        onClick={(_, index) => {
                          const item = processSourceDistribution(analysisData.analysis)[index];
                          handleChartClick(item, 'source');
                        }}
                      >
                        {processSourceDistribution(analysisData.analysis).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Avaliação Média por Fonte</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Google', rating: 4.2 },
                        { name: 'TripAdvisor', rating: 3.8 },
                        { name: 'Booking.com', rating: 4.0 },
                        { name: 'Expedia', rating: 3.9 },
                        { name: 'Facebook', rating: 4.3 }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} />
                      <RechartsTooltip />
                      <Bar dataKey="rating" name="Avaliação Média" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Nota: Este gráfico é ilustrativo. Para uma versão completa, seria necessário agrupar os dados por fonte.
                </p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Volume de Feedbacks por Fonte</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { month: 'Jan', Google: 40, TripAdvisor: 24, Booking: 35, Expedia: 18 },
                      { month: 'Fev', Google: 45, TripAdvisor: 28, Booking: 32, Expedia: 22 },
                      { month: 'Mar', Google: 38, TripAdvisor: 32, Booking: 30, Expedia: 25 },
                      { month: 'Abr', Google: 50, TripAdvisor: 35, Booking: 42, Expedia: 28 },
                      { month: 'Mai', Google: 55, TripAdvisor: 30, Booking: 38, Expedia: 30 },
                      { month: 'Jun', Google: 48, TripAdvisor: 42, Booking: 35, Expedia: 25 }
                    ]}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Google" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="TripAdvisor" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="Booking" stackId="1" stroke="#ffc658" fill="#ffc658" />
                    <Area type="monotone" dataKey="Expedia" stackId="1" stroke="#ff7300" fill="#ff7300" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Nota: Este gráfico é ilustrativo. Para uma versão completa, seria necessário agrupar os dados por períodos.
              </p>
            </Card>
          </TabsContent>

          {/* Apartamentos */}
          <TabsContent value="apartamentos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Distribuição por apartamento */}
              <Card className="p-4">
                <CardHeader>
                  <CardTitle>Distribuição por Apartamentos</CardTitle>
                  <CardDescription>
                    Quantidade de feedbacks por apartamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={processApartamentoDistribution(analysisData?.analysis).slice(0, 15)}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 60, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={60} 
                        />
                        <RechartsTooltip />
                        <Bar
                          name="Quantidade de Feedbacks"
                          dataKey="value"
                          fill="#8884d8"
                          onClick={(_, index) => {
                            const item = processApartamentoDistribution(analysisData?.analysis)[index];
                            handleChartClick(item, 'apartamento');
                          }}
                        >
                          {processApartamentoDistribution(analysisData?.analysis).slice(0, 15).map(
                            (entry: { name: string; value: number }, index: number) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            )
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Mapa de calor de avaliações */}
              <Card className="p-4">
                <CardHeader>
                  <CardTitle>Avaliação Média por Apartamento</CardTitle>
                  <CardDescription>
                    Comparação das avaliações e sentimentos por apartamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="count" 
                          name="Quantidade" 
                          domain={['dataMin', 'dataMax']}
                          label={{ value: 'Quantidade de Feedbacks', position: 'bottom', offset: 0 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="averageRating" 
                          name="Avaliação" 
                          domain={[0, 5]} 
                          label={{ value: 'Avaliação Média', angle: -90, position: 'insideLeft' }}
                        />
                        <ZAxis 
                          type="number" 
                          dataKey="sentiment" 
                          range={[50, 400]} 
                          name="Sentimento Positivo"
                        />
                        <RechartsTooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white/90 backdrop-blur-sm shadow-md p-3 rounded-md border">
                                  <p className="font-bold">Apartamento {data.apartamento}</p>
                                  <p className="text-sm">Feedbacks: {data.count}</p>
                                  <p className="text-sm">Avaliação: {data.averageRating.toFixed(1)} ★</p>
                                  <p className="text-sm">Sentimento: {data.sentiment}%</p>
                                  {data.topProblems && data.topProblems.length > 0 && (
                                    <p className="text-sm">Problema principal: {data.topProblems[0].problem}</p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter 
                          name="Apartamentos" 
                          data={processApartamentoDetailsData()} 
                          fill="#8884d8"
                          onClick={(data) => handleChartClick({name: data.apartamento}, 'apartamento')}
                        >
                          {processApartamentoDetailsData().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.sentiment >= 70 ? '#4CAF50' : entry.sentiment >= 50 ? '#FFC107' : '#F44336'}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center mt-2 space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-[#4CAF50] rounded-full mr-1"></div>
                      <span>Sentimento Positivo Alto</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-[#FFC107] rounded-full mr-1"></div>
                      <span>Sentimento Neutro</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-[#F44336] rounded-full mr-1"></div>
                      <span>Sentimento Negativo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela detalhada de apartamentos */}
            <Card className="p-4">
              <CardHeader>
                <CardTitle>Análise Detalhada por Apartamento</CardTitle>
                <CardDescription>
                  Métricas e problemas por apartamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="py-2 px-3 bg-muted border-b text-left">Apartamento</th>
                        <th className="py-2 px-3 bg-muted border-b text-center">Hotel</th>
                        <th className="py-2 px-3 bg-muted border-b text-center">Feedbacks</th>
                        <th className="py-2 px-3 bg-muted border-b text-center">Avaliação</th>
                        <th className="py-2 px-3 bg-muted border-b text-center">Sentimento</th>
                        <th className="py-2 px-3 bg-muted border-b text-left">Problemas Principais</th>
                        <th className="py-2 px-3 bg-muted border-b text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processApartamentoDetailsData().slice(0, 20).map((ap, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="py-2 px-3 border-b font-medium">
                            {ap.apartamento}
                          </td>
                          <td className="py-2 px-3 border-b text-center text-sm">
                            {ap.mainHotel}
                          </td>
                          <td className="py-2 px-3 border-b text-center">
                            {ap.count}
                          </td>
                          <td className="py-2 px-3 border-b text-center">
                            <div className="flex items-center justify-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className={
                                ap.averageRating >= 4 ? 'text-green-600 font-bold' : 
                                ap.averageRating >= 3 ? 'text-yellow-600 font-bold' : 
                                'text-red-600 font-bold'
                              }>
                                {ap.averageRating.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 border-b text-center">
                            <div className="flex justify-center">
                              <Badge variant={ap.sentiment >= 70 ? "default" : ap.sentiment >= 50 ? "outline" : "destructive"}>
                                {ap.sentiment}%
                              </Badge>
                            </div>
                          </td>
                          <td className="py-2 px-3 border-b">
                            <div className="flex flex-wrap gap-1">
                              {ap.topProblems.map((problem, idx) => (
                                <Badge key={idx} variant="outline" className={idx === 0 ? "bg-red-50" : idx === 1 ? "bg-yellow-50" : "bg-blue-50"}>
                                  {problem.problem} ({problem.count})
                                </Badge>
                              ))}
                              {ap.topProblems.length === 0 && (
                                <span className="text-green-600 text-sm">Sem problemas registrados</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 border-b text-center">
                            <Button variant="outline" size="sm" onClick={() => handleChartClick({name: ap.apartamento}, 'apartamento')}>
                              Ver Todos os Feedbacks
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hotéis e Apartamentos */}
          <TabsContent value="hoteisApartamentos" className="space-y-4">
            <div className="flex flex-col space-y-4">
              {/* Controles de filtro e ordenação */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Filtrar por Hotel</h3>
                    <Select
                      value={selectedHotel}
                      onValueChange={(value) => applyHotelFilter(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um hotel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Hotéis</SelectItem>
                        {hotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Ordenar</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={sortOrder === "asc" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setSortOrder("asc")}
                      >
                        Alfabética (A-Z)
                      </Button>
                      <Button 
                        variant={sortOrder === "desc" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setSortOrder("desc")}
                      >
                        Alfabética (Z-A)
                      </Button>
                      <Button 
                        variant={sortOrder === "most" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setSortOrder("most")}
                      >
                        Mais Feedbacks
                      </Button>
                      <Button 
                        variant={sortOrder === "least" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setSortOrder("least")}
                      >
                        Menos Feedbacks
                      </Button>
                    </div>
                  </div>
                </div>
                
                {isFilterApplied && (
                  <div className="flex mt-4">
                    <Button onClick={() => applyHotelFilter("todos")} variant="outline" size="sm">
                      <XCircle className="h-4 w-4 mr-1" />
                      Limpar Filtro
                    </Button>
                  </div>
                )}
              </Card>
              
              {/* Lista de Hotéis com Apartamentos Expansíveis */}
              <div className="space-y-4">
                {sortHotels(hotelStats)
                  .filter(hotel => !isFilterApplied || (filteredData && hotel.hotel === filteredData.hotelName))
                  .map((hotel, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleHotelExpansion(hotel.hotel)}
                            className="p-1"
                          >
                            {expandedHotels.has(hotel.hotel) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </Button>
                          <h3 className="text-lg font-bold">{hotel.hotel}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted rounded-full px-3 py-1 text-sm">
                            {hotel.totalFeedbacks} feedbacks
                          </div>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className={
                              parseFloat(hotel.averageRating) >= 4 
                                ? 'text-green-600 font-bold' 
                                : parseFloat(hotel.averageRating) >= 3 
                                  ? 'text-yellow-600 font-bold' 
                                  : 'text-red-600 font-bold'
                            }>
                              {hotel.averageRating}
                            </span>
                          </div>
                          <Badge variant={hotel.sentiment >= 70 ? "default" : hotel.sentiment >= 50 ? "outline" : "destructive"}>
                            {hotel.sentiment}%
                          </Badge>
                        </div>
                      </div>
                      
                      {expandedHotels.has(hotel.hotel) && (
                        <div className="mt-4">
                          <h4 className="text-md font-semibold mb-2">Apartamentos</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className="py-2 px-4 bg-muted border-b text-left">Apartamento</th>
                                  <th className="py-2 px-4 bg-muted border-b text-center">Feedbacks</th>
                                  <th className="py-2 px-4 bg-muted border-b text-center">Avaliação</th>
                                  <th className="py-2 px-4 bg-muted border-b text-center">Sentimento</th>
                                  <th className="py-2 px-4 bg-muted border-b text-center">Problemas</th>
                                  <th className="py-2 px-4 bg-muted border-b text-center">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {processApartamentoDetailsData()
                                  .filter(ap => ap.mainHotel === hotel.hotel)
                                  .map((ap, idx) => (
                                    <tr key={idx} className="hover:bg-muted/50">
                                      <td className="py-2 px-4 border-b font-semibold">{ap.apartamento}</td>
                                      <td className="py-2 px-4 border-b text-center">{ap.count}</td>
                                      <td className="py-2 px-4 border-b text-center">
                                        <div className="flex items-center justify-center">
                                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                          <span className={
                                            ap.averageRating >= 4 
                                              ? 'text-green-600 font-bold' 
                                              : ap.averageRating >= 3 
                                                ? 'text-yellow-600 font-bold' 
                                                : 'text-red-600 font-bold'
                                          }>
                                            {ap.averageRating.toFixed(1)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-4 border-b text-center">
                                        <Badge variant={ap.sentiment >= 70 ? "default" : ap.sentiment >= 50 ? "outline" : "destructive"}>
                                          {ap.sentiment}%
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-4 border-b">
                                        <div className="flex flex-col gap-1">
                                          {ap.topProblems.length > 0 ? (
                                            ap.topProblems.slice(0, 2).map((problem, idx) => (
                                              <Badge 
                                                key={idx}
                                                variant={idx === 0 ? "destructive" : "outline"}
                                                className={idx === 0 ? "" : "bg-yellow-50"}
                                              >
                                                {problem.problem} ({problem.count})
                                              </Badge>
                                            ))
                                          ) : (
                                            <Badge variant="outline" className="bg-green-50">
                                              Sem problemas
                                            </Badge>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2 px-4 border-b text-center">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleChartClick({label: ap.apartamento}, 'apartamento')}
                                        >
                                          Ver detalhes
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDetail?.title || "Detalhes"}</DialogTitle>
            <DialogDescription>
              {selectedFeedbacks.length} feedbacks encontrados
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto pr-4 max-h-[60vh]">
            <div className="space-y-4 py-4">
              {selectedFeedbacks.map((feedback, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      {feedback.rating && (
                        <Badge variant={getBadgeVariant(feedback.rating)}>
                          {feedback.rating} ★
                        </Badge>
                      )}
                      <span className="font-medium">{feedback.hotel || "Hotel não especificado"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(feedback.date)}
                    </span>
                  </div>
                  <p className="text-sm mb-3">{feedback.comment}</p>
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {feedback.source && (
                        <Badge variant="secondary">
                          {feedback.source}
                        </Badge>
                      )}
                      {feedback.problems && feedback.problems.map((problem: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {problem}
                        </Badge>
                      ))}
                    </div>
                    {feedback.sentiment !== undefined && (
                      <div className="flex items-center">
                        <span className="text-xs mr-2">Sentimento:</span>
                        <Badge 
                          variant={
                            feedback.sentiment >= 70 
                              ? "default" as "default" 
                              : feedback.sentiment >= 50 
                                ? "outline" as "outline" 
                                : "destructive" as "destructive"
                          }
                        >
                          {feedback.sentiment}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente com proteção de administrador
export default function AdminDashboard() {
  return (
    <RequireAdmin>
      <AdminDashboardContent />
    </RequireAdmin>
  );
}