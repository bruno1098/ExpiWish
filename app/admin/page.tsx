"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllAnalyses } from "@/lib/firestore-service";
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
  TrendingDown,
  Eye,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  XCircle,
  MessageSquare,
  Hotel,
  Building2,
  Filter,
  X,
  Tag,
  Globe,
  AlertCircle,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
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
  LineChart,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { 
  filterValidFeedbacks, 
  isValidProblem, 
  isValidSectorOrKeyword,
  processSectorDistribution as processValidSectorDistribution,
  processKeywordDistribution as processValidKeywordDistribution,
  processProblemDistribution as processValidProblemDistribution
} from "@/lib/utils";

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
    sourceDistribution: Array<{label: string; value: number}>;
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
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Componente de tooltip customizado para os gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm shadow-lg p-3 rounded-md border border-border">
        {label && <p className="font-medium text-foreground mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            <span style={{ color: entry.color }}>{entry.name}: </span>
            {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Componente para renderizar gráficos no modal
const renderChart = (chartType: string, data: any[], onChartClick: (item: any, type: string) => void, type: string) => {
  if (chartType === 'bar') {
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <RechartsTooltip />
        <Bar 
          dataKey="value" 
          fill="#8884d8"
          onClick={(_, index) => {
            const item = data[index];
            onChartClick(item, type);
          }}
        />
      </BarChart>
    );
  }
  
  if (chartType === 'pie') {
    return (
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
          nameKey={data[0]?.name ? 'name' : 'label'}
          onClick={(dataItem, index) => {
            const item = data[index];
            onChartClick(item, type);
          }}
        >
          {data.map((_: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip />
        <Legend />
      </PieChart>
    );
  }
  
  // Fallback - retorna um gráfico vazio
  return (
    <BarChart data={[]}>
      <XAxis />
      <YAxis />
    </BarChart>
  );
};

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
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ 
    start: null, 
    end: null 
  });

  // Estados para filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [apartmentFilter, setApartmentFilter] = useState('all');
  const [hiddenRatings, setHiddenRatings] = useState<number[]>([]);
  const [globalFilteredData, setGlobalFilteredData] = useState<any[]>([]);

  // Estados para modal de detalhes
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<any[]>([]);

  // Estados para o painel lateral interativo
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: string;
    value: string;
    data: any;
    feedbacks: any[];
    stats: any;
  } | null>(null);
  
  // Estado para modal de todos os comentários
  const [allCommentsModalOpen, setAllCommentsModalOpen] = useState(false);
  const [allCommentsData, setAllCommentsData] = useState<any[]>([]);

  // Estados para o modal de gráfico grande
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<{
    type: string;
    title: string;
    data: any[];
    chartType: 'bar' | 'pie' | 'line';
  } | null>(null);

  // Controlar scroll da página de fundo quando modais estão abertos
  useEffect(() => {
    if (detailPanelOpen || allCommentsModalOpen || chartModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup ao desmontar componente
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [detailPanelOpen, allCommentsModalOpen, chartModalOpen]);

  // Estados para abas expandidas
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<string>("asc");
  
  // Controlar scroll quando modal de filtros está aberto
  useEffect(() => {
    if (filtersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [filtersOpen]);

  // Auto-aplicar filtros quando qualquer filtro é alterado
  useEffect(() => {
    if (analysisData?.data) {
      const filtered = applyGlobalFilters(analysisData.data);
      setGlobalFilteredData(filtered);
    }
  }, [dateRange, sentimentFilter, sourceFilter, languageFilter, apartmentFilter, hiddenRatings, analysisData?.data]);

  // Função para aplicar filtros globais
  const applyGlobalFilters = useCallback((data: any[]) => {
    if (!data || data.length === 0) return [];
    
    return data.filter((feedback: any) => {
      // Filtro de estrelas (ocultar avaliações selecionadas)
      if (hiddenRatings.includes(feedback.rating)) {
        return false;
      }
      
      // Filtro de data
      if (dateRange.start || dateRange.end) {
        const feedbackDate = new Date(feedback.date);
        if (dateRange.start && feedbackDate < dateRange.start) return false;
        if (dateRange.end && feedbackDate > dateRange.end) return false;
      }
      
      // Filtro de sentimento
      if (sentimentFilter !== 'all' && feedback.sentiment !== sentimentFilter) {
        return false;
      }
      
      // Filtro de fonte
      if (sourceFilter !== 'all' && feedback.source !== sourceFilter) {
        return false;
      }
      
      // Filtro de idioma
      if (languageFilter !== 'all' && feedback.language !== languageFilter) {
        return false;
      }
      
      // Filtro de apartamento
      if (apartmentFilter !== 'all' && feedback.apartamento !== apartmentFilter) {
        return false;
      }
      
      return true;
    });
  }, [hiddenRatings, dateRange, sentimentFilter, sourceFilter, languageFilter, apartmentFilter]);
  
  // Atualizar dados filtrados apenas quando os dados originais mudarem (não quando filtros mudarem)
  useEffect(() => {
    if (analysisData?.data) {
      setGlobalFilteredData(analysisData.data);
    }
  }, [analysisData?.data]);

  // Função para diagnóstico
  const runDiagnostics = async () => {
    console.log("Executando diagnóstico completo...");
    
    try {
      // Buscar hotéis primeiro
      const hotelsRef = collection(db, "hotels");
      const hotelsSnapshot = await getDocs(hotelsRef);
      
      // Buscar na nova estrutura analyse
      const analyseRef = collection(db, "analyse");
      const analyseSnapshot = await getDocs(analyseRef);
      
      // Contar feedbacks na nova estrutura
      let totalFeedbacks = 0;
      const feedbacksByHotel: { [key: string]: number } = {};
      
      for (const hotelDoc of analyseSnapshot.docs) {
        try {
          const feedbacksRef = collection(db, "analyse", hotelDoc.id, "feedbacks");
          const feedbacksSnapshot = await getDocs(feedbacksRef);
          const feedbackCount = feedbacksSnapshot.docs.length;
          
          feedbacksByHotel[hotelDoc.id] = feedbackCount;
          totalFeedbacks += feedbackCount;
        } catch (error) {
          console.log(`Erro ao contar feedbacks para hotel ${hotelDoc.id}:`, error);
          feedbacksByHotel[hotelDoc.id] = 0;
        }
      }
      
      const info = [
        `=== DIAGNÓSTICO FIRESTORE ===`,
        `Timestamp: ${new Date().toISOString()}`,
        ``,
        `Coleção 'analyse' (nova estrutura):`,
        `- Total de hotéis com dados: ${analyseSnapshot.docs.length}`,
        `- Total de feedbacks: ${totalFeedbacks}`,
        ``,
        `Feedbacks por hotel:`,
        ...Object.entries(feedbacksByHotel).map(([hotelId, count]) => 
          `- ${hotelId}: ${count} feedbacks`
        ),
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
    
    // Usar dados filtrados globalmente se filtros estão ativos
    const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
      ? globalFilteredData 
      : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
      
    if (!dataToUse) {
      toast({
        title: "Erro",
        description: "Dados não disponíveis",
        variant: "destructive",
      });
      return;
    }

    let filteredFeedbacks: any[] = [];
    let value = "";

    switch (type) {
      case 'rating':
        const rating = parseInt(data.label);
        filteredFeedbacks = dataToUse.filter((feedback: any) => 
          Math.floor(feedback.rating) === rating
        );
        value = `${rating} estrela${rating !== 1 ? 's' : ''}`;
        break;

      case 'problem':
        const problemLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.filter((feedback: any) => {
          if (feedback.problems && Array.isArray(feedback.problems)) {
            return feedback.problems.includes(problemLabel);
          }
          if (feedback.problem && typeof feedback.problem === 'string') {
            return feedback.problem.split(';').map((p: string) => p.trim()).includes(problemLabel);
          }
          return false;
        });
        value = problemLabel;
        break;

      case 'hotel':
        const hotelLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.filter((feedback: any) => 
          feedback.hotel === hotelLabel
        );
        value = hotelLabel;
        break;

      case 'source':
        const sourceLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.filter((feedback: any) => 
          feedback.source === sourceLabel
        );
        value = sourceLabel;
        break;

      case 'apartamento':
        const apartamentoLabel = data.name || data.label;
        filteredFeedbacks = dataToUse.filter((feedback: any) => 
          feedback.apartamento === apartamentoLabel
        );
        value = `Apartamento ${apartamentoLabel}`;
        break;

      case 'keyword':
        const keywordLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.filter((feedback: any) => {
          if (feedback.keyword && typeof feedback.keyword === 'string') {
            return feedback.keyword.split(';').map((k: string) => k.trim()).includes(keywordLabel);
          }
          return false;
        });
        value = keywordLabel;
        break;

      case 'sector':
        const sectorLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.filter((feedback: any) => {
          if (feedback.sector && typeof feedback.sector === 'string') {
            return feedback.sector === sectorLabel;
          }
          if (feedback.department && typeof feedback.department === 'string') {
            return feedback.department === sectorLabel;
          }
          return false;
        });
        value = sectorLabel;
        break;

      case 'language':
        const languageLabel = data.label || data.name;
        filteredFeedbacks = dataToUse.filter((feedback: any) => 
          feedback.language === languageLabel
        );
        value = languageLabel;
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

    // Calcular estatísticas específicas do item
    const stats = {
      totalOccurrences: filteredFeedbacks.length,
      averageRating: filteredFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / filteredFeedbacks.length || 0,
      sentimentDistribution: {
        positive: filteredFeedbacks.filter(f => f.sentiment === 'positive').length,
        neutral: filteredFeedbacks.filter(f => f.sentiment === 'neutral').length,
        negative: filteredFeedbacks.filter(f => f.sentiment === 'negative').length,
      },
      ratingDistribution: {
        1: filteredFeedbacks.filter(f => f.rating === 1).length,
        2: filteredFeedbacks.filter(f => f.rating === 2).length,
        3: filteredFeedbacks.filter(f => f.rating === 3).length,
        4: filteredFeedbacks.filter(f => f.rating === 4).length,
        5: filteredFeedbacks.filter(f => f.rating === 5).length,
      },
      percentage: dataToUse ? ((filteredFeedbacks.length / dataToUse.length) * 100).toFixed(1) : 0,
      recentFeedbacks: filteredFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
      topKeywords: type !== 'keyword' ? getTopKeywordsForItem(filteredFeedbacks) : [],
      topProblems: type !== 'problem' ? getTopProblemsForItem(filteredFeedbacks) : [],
      topHotels: type !== 'hotel' ? getTopHotelsForItem(filteredFeedbacks) : [],
      monthlyTrend: getMonthlyTrendForItem(filteredFeedbacks)
    };
    
    setSelectedItem({
      type,
      value,
      data,
      feedbacks: filteredFeedbacks,
      stats
    });
    setDetailPanelOpen(true);
  };

  // Funções auxiliares para estatísticas no admin
  const getTopKeywordsForItem = (feedbacks: any[]) => {
    const keywordCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      if (f.keyword) {
        f.keyword.split(';').forEach((k: string) => {
          const keyword = k.trim();
          if (keyword) keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      }
    });
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));
  };

  const getTopProblemsForItem = (feedbacks: any[]) => {
    const problemCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      if (f.problem) {
        f.problem.split(';').forEach((p: string) => {
          const problem = p.trim();
          if (problem && isValidProblem(problem)) {
            problemCounts[problem] = (problemCounts[problem] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(problemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([problem, count]) => ({ problem, count }));
  };

  const handleViewAllComments = () => {
    if (selectedItem) {
      setAllCommentsData(selectedItem.feedbacks);
      setAllCommentsModalOpen(true);
    }
  };

  const getTopHotelsForItem = (feedbacks: any[]) => {
    const hotelCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      const hotel = f.hotel || "Não especificado";
      hotelCounts[hotel] = (hotelCounts[hotel] || 0) + 1;
    });
    return Object.entries(hotelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hotel, count]) => ({ hotel, count }));
  };

  const getMonthlyTrendForItem = (feedbacks: any[]) => {
    const monthCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      const month = new Date(f.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    return Object.entries(monthCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));
  };

  // Função helper para filtrar problemas válidos (remover VAZIO e variações)
  const isValidProblem = (problem: string): boolean => {
    if (!problem || typeof problem !== 'string') return false;
    
    const normalizedProblem = problem.toLowerCase().trim();
    
    // Lista de problemas inválidos que devem ser filtrados
    const invalidProblems = [
      'vazio', 
      'sem problemas', 
      'nao identificado', 
      'não identificado',
      'sem problema',
      'nenhum problema',
      'ok',
      'tudo ok',
      'sem',
      'n/a',
      'na',
      '-',
      ''
    ];
    
    return !invalidProblems.includes(normalizedProblem) && 
           !normalizedProblem.includes('vazio') &&
           !normalizedProblem.includes('sem problemas') &&
           normalizedProblem.length > 2; // Evitar problemas muito curtos
  };

  // Função para determinar o período de agrupamento automaticamente
  const getTimePeriodData = (data: any[], sourceField: string = 'language') => {
    if (!data || data.length === 0) return { period: 'day', data: [] };
    
    // Encontrar o range de datas
    const dates = data.map(item => new Date(item.date)).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let period: string;
    let formatFunction: (date: Date) => string;
    
    if (daysDiff <= 14) {
      // Menos de 2 semanas: agrupar por dia
      period = 'day';
      formatFunction = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } else if (daysDiff <= 60) {
      // Entre 2 semanas e 2 meses: agrupar por semana
      period = 'week';
      formatFunction = (date: Date) => {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `Sem ${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
      };
    } else {
      // Mais de 2 meses: agrupar por mês
      period = 'month';
      formatFunction = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    }
    
    const periodCounts: Record<string, any> = {};
    
    data.forEach(feedback => {
      const date = new Date(feedback.date);
      const periodKey = formatFunction(date);
      const source = feedback[sourceField] || 'Outros';
      
      if (!periodCounts[periodKey]) {
        periodCounts[periodKey] = {};
      }
      periodCounts[periodKey][source] = (periodCounts[periodKey][source] || 0) + 1;
    });
    
    const result = Object.entries(periodCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periodKey, sources]) => ({
        period: periodKey,
        ...sources
      }));
    
    return { period, data: result };
  };

  // Função para abrir modal de gráfico grande
  const handleViewChart = (type: string, title: string, data: any[], chartType: 'bar' | 'pie' | 'line') => {
    setSelectedChart({ type, title, data, chartType });
    setChartModalOpen(true);
  };

  // Funções de processamento de dados
  const processRatingDistribution = (data: any[]) => {
    const ratingCounts: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    data.forEach(feedback => {
      if (feedback.rating && feedback.rating >= 1 && feedback.rating <= 5) {
        ratingCounts[feedback.rating.toString()]++;
      }
    });
    
    return Object.entries(ratingCounts)
      .map(([rating, count]) => ({ label: rating + ' estrela' + (rating === '1' ? '' : 's'), value: count }));
  };

  const processProblemDistribution = (data: any[]) => {
    const problemCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      if (feedback.problem) {
        feedback.problem.split(';').forEach((problem: string) => {
          const trimmedProblem = problem.trim();
          if (trimmedProblem && isValidProblem(trimmedProblem)) {
            problemCounts[trimmedProblem] = (problemCounts[trimmedProblem] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(problemCounts)
      .filter(([problem]) => isValidProblem(problem)) // Dupla verificação
      .map(([problem, count]) => ({ label: problem, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  };

  const processSourceDistribution = (analysis: any) => {
    // Usar dados filtrados globalmente se filtros estão ativos
    const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
      ? globalFilteredData 
      : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
      
    if (!dataToUse) return [];
    
    const sourceCounts: Record<string, number> = {};
    
    dataToUse.forEach((feedback: any) => {
      const source = feedback.source || 'Não especificado';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ label: source, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processApartamentoDistribution = (analysis: any) => {
    // Usar dados filtrados globalmente se filtros estão ativos
    const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
      ? globalFilteredData 
      : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
      
    if (!dataToUse) return [];
    
    const apartamentoCounts: Record<string, number> = {};
    
    dataToUse.forEach((feedback: any) => {
      if (feedback.apartamento) {
        const apartamento = feedback.apartamento.toString();
        apartamentoCounts[apartamento] = (apartamentoCounts[apartamento] || 0) + 1;
      }
    });
    
    return Object.entries(apartamentoCounts)
      .map(([apartamento, count]) => ({ name: apartamento, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  };

  const processSectorDistribution = (data: any[]) => {
    if (!analysisData?.analysis?.keywordDistribution) return [];
    
    // Se temos dados filtrados, usar as funções utilitárias
    if (data && data.length > 0) {
      return processValidSectorDistribution(data).slice(0, 15);
    }
    
    // Caso contrário, usar dados da análise original
    const sectorCounts: Record<string, number> = {};
    
    if (analysisData.data && Array.isArray(analysisData.data)) {
      analysisData.data.forEach(feedback => {
        if (feedback.sector && isValidSectorOrKeyword(feedback.sector)) {
          // Separar por ; e remover duplicatas
          const sectors = Array.from(new Set(feedback.sector.split(';').map((s: string) => s.trim()))) as string[];
          
          sectors.forEach((sector: string) => {
            if (isValidSectorOrKeyword(sector)) {
              sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
            }
          });
        }
      });
    }
    
    return Object.entries(sectorCounts)
      .map(([sector, count]) => ({ label: sector, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  const processKeywordDistribution = (data: any[]) => {
    if (!analysisData?.analysis?.keywordDistribution) return [];
    
    // Se temos dados filtrados, usar as funções utilitárias
    if (data && data.length > 0) {
      return processValidKeywordDistribution(data).slice(0, 20);
    }
    
    // Caso contrário, usar dados da análise original
    const keywordCounts: Record<string, number> = {};
    
    if (analysisData.data && Array.isArray(analysisData.data)) {
      analysisData.data.forEach(feedback => {
        if (feedback.keyword && isValidSectorOrKeyword(feedback.keyword)) {
          // Separar por ; e remover duplicatas
          const keywords = Array.from(new Set(feedback.keyword.split(';').map((k: string) => k.trim()))) as string[];
          
          keywords.forEach((keyword: string) => {
            if (isValidSectorOrKeyword(keyword)) {
              keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            }
          });
        }
      });
    }
    
    return Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ label: keyword, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  };

  const processApartamentoDetailsData = () => {
    // Usar dados filtrados globalmente se filtros estão ativos
    const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
      ? globalFilteredData 
      : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
      
    if (!dataToUse) return [];

    const apartamentoMap = new Map<string, {
      count: number;
      totalRating: number;
      positiveCount: number;
      problems: Map<string, number>;
      hotels: Map<string, number>;
      ratings: number[];
    }>();

    dataToUse.forEach((feedback: any) => {
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
          if (isValidProblem(problem)) {
            apartamentoStat.problems.set(problem, (apartamentoStat.problems.get(problem) || 0) + 1);
          }
        });
      } else if (feedback.problem) {
        const problems: string[] = feedback.problem.split(';')
          .map((p: string) => p.trim())
          .filter((p: string) => p && isValidProblem(p));
        
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
    // Usar dados filtrados globalmente se filtros estão ativos
    const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
      ? globalFilteredData 
      : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
      
    if (!dataToUse) return [];

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

    dataToUse.forEach((feedback: any) => {
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
          if (isValidProblem(problem)) {
            hotelStat.problems.set(problem, (hotelStat.problems.get(problem) || 0) + 1);
          }
        });
      } else if (feedback.problem) {
        const problems: string[] = feedback.problem.split(';')
          .map((p: string) => p.trim())
          .filter((p: string) => p && isValidProblem(p));
        
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
  }, [analysisData, filteredData, isFilterApplied, globalFilteredData, dateRange, sentimentFilter, sourceFilter, languageFilter, hiddenRatings]);

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
      
      // Buscar análises usando a nova estrutura
      const analyses = await getAllAnalyses();
      
      console.log("Total de análises encontradas:", analyses.length);
      
      if (analyses && analyses.length > 0) {
        // Calcular a data mais recente dos feedbacks para a análise combinada
        const allDates = analyses.flatMap((analysis: any) => 
          analysis.data?.map((f: any) => new Date(f.date)).filter((date: Date) => !isNaN(date.getTime())) || []
        );
        
        const mostRecentFeedbackDate = allDates.length > 0 
          ? new Date(Math.max(...allDates.map(date => date.getTime())))
          : new Date();

        // Criar análise combinada
        let combinedAnalysis: AnalysisData = {
          id: "combined",
          hotelId: "all",
          hotelName: "Todos os Hotéis",
          importDate: mostRecentFeedbackDate, // Usar a data mais recente dos feedbacks
          data: [],
          analysis: {
            averageRating: 0,
            positiveSentiment: 0,
            ratingDistribution: [],
            problemDistribution: [],
            hotelDistribution: [],
            sourceDistribution: [],
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
        const languageMap = new Map<string, number>();
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
            
            if (f.language) {
              languageMap.set(f.language, (languageMap.get(f.language) || 0) + 1);
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
          sourceDistribution: Array.from(sourceMap.entries())
            .map(([label, value]) => ({ label, value })),
          languageDistribution: Array.from(languageMap.entries())
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
        averageRating: 0,
        positiveSentiment: 0,
        ratingDistribution: [],
        problemDistribution: [],
        hotelDistribution: [],
        sourceDistribution: [],
        languageDistribution: [],
        keywordDistribution: [],
        apartamentoDistribution: [],
        recentFeedbacks: []
      }
    };
    
    // Recalcular métricas para dados filtrados
    let totalRating = 0;
    let positiveSentimentCount = 0;
    
    const ratingMap = new Map<string, number>();
    const problemMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    const languageMap = new Map<string, number>();
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
      
      if (feedback.language) {
        languageMap.set(feedback.language, (languageMap.get(feedback.language) || 0) + 1);
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
      sourceDistribution: Array.from(sourceMap.entries())
        .map(([label, value]) => ({ label, value })),
      languageDistribution: Array.from(languageMap.entries())
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
  }, [dateRange]); // Removido selectedHotel daqui

  // Calcular totais
  const totalFeedbacks = analysisData?.data.length || 0;
  const totalHotels = analysisData?.analysis.hotelDistribution.length || 0;
  
  // Função para formatar data (usando a função utilitária)
  const formatDate = (dateString: string) => {
    return formatDateBR(dateString);
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

  // Função para processar e limpar dados com duplicatas separados por ";"
  const cleanDataWithSeparator = (text: string | null | undefined): string => {
    if (!text || typeof text !== 'string') return '';
    
    // Se contém ";", dividir, remover duplicatas e reunir
    if (text.includes(';')) {
      const items = text.split(';')
        .map(item => item.trim())
        .filter(item => item && item !== 'VAZIO' && item.toLowerCase() !== 'vazio');
      
      if (items.length === 0) return '';
      
      const uniqueItems = Array.from(new Set(items));
      return uniqueItems.join(', ');
    }
    
    // Para texto simples, verificar se não é VAZIO
    if (text === 'VAZIO' || text.toLowerCase() === 'vazio') return '';
    
    return text;
  };

  // Função para aplicar presets de data
  const applyDatePreset = (days: number) => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);
    
    setDateRange({
      start: startDate,
      end: today
    });
  };

  // Validação de datas
  const validateDateRange = (startDate: Date | null, endDate: Date | null) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fim do dia de hoje
    
    if (startDate && endDate) {
      // Data final não pode ser antes da inicial
      if (endDate < startDate) {
        return 'A data final não pode ser anterior à data inicial';
      }
      // Data final não pode ser depois de hoje
      if (endDate > today) {
        return 'A data final não pode ser posterior a hoje';
      }
    }
    
    if (startDate && startDate > today) {
      return 'A data inicial não pode ser posterior a hoje';
    }
    
    if (endDate && endDate > today) {
      return 'A data final não pode ser posterior a hoje';
    }
    
    return null;
  };

  // Função melhorada para definir data inicial
  const handleStartDateChange = (date: Date | null) => {
    const error = validateDateRange(date, dateRange.end);
    if (!error) {
      setDateRange(prev => ({ ...prev, start: date }));
    } else {
      toast({
        title: "Data inválida",
        description: error,
        variant: "destructive",
      });
    }
  };

  // Função melhorada para definir data final
  const handleEndDateChange = (date: Date | null) => {
    const error = validateDateRange(dateRange.start, date);
    if (!error) {
      setDateRange(prev => ({ ...prev, end: date }));
    } else {
      toast({
        title: "Data inválida",
        description: error,
        variant: "destructive",
      });
    }
  };

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
            {/* Botão de Filtros Sutil */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0)
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {(dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {[
                      dateRange.start || dateRange.end ? 1 : 0,
                      sentimentFilter !== 'all' ? 1 : 0,
                      sourceFilter !== 'all' ? 1 : 0,
                      languageFilter !== 'all' ? 1 : 0,
                      hiddenRatings.length > 0 ? 1 : 0
                    ].reduce((sum, val) => sum + val, 0)}
                  </span>
                )}
              </Button>

              {/* Modal de Filtros Premium */}
              {filtersOpen && analysisData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFiltersOpen(false)}>
                  {/* Overlay Premium */}
                  <div 
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setFiltersOpen(false)}
                  />
                  
                  {/* Modal Container Responsivo */}
                  <div 
                    className="relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl max-h-[95vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                      {/* Header Compacto */}
                      <div className="relative p-5 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
                        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 shadow-lg">
                                <Filter className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white leading-tight truncate">Filtros Administrativos</h3>
                                <p className="text-sm text-blue-100 opacity-90 font-medium hidden sm:block">Controle total dos dados</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFiltersOpen(false)}
                              className="text-white hover:bg-white/10 h-10 w-10 rounded-full p-0 backdrop-blur-sm border border-white/20 flex-shrink-0"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo Moderno e Responsivo */}
                      <div className="p-6 max-h-[calc(95vh-120px)] overflow-y-auto">
                        <div className="grid gap-6 lg:grid-cols-3">
                      {/* Filtro de Data com Presets */}
                      <div className="space-y-3 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Período de Análise</label>
                        </div>
                        
                        {/* Presets de Data */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => applyDatePreset(7)}
                            className="text-xs h-8"
                          >
                            📅 7 dias
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => applyDatePreset(30)}
                            className="text-xs h-8"
                          >
                            📅 30 dias
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => applyDatePreset(90)}
                            className="text-xs h-8"
                          >
                            📅 90 dias
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Data inicial</label>
                            <DatePicker 
                              date={dateRange.start} 
                              onChange={handleStartDateChange}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Data final</label>
                            <DatePicker 
                              date={dateRange.end} 
                              onChange={handleEndDateChange}
                            />
                          </div>
                        </div>
                        
                        {/* Validação visual */}
                        {dateRange.start && dateRange.end && validateDateRange(dateRange.start, dateRange.end) && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            ⚠️ {validateDateRange(dateRange.start, dateRange.end)}
                          </div>
                        )}
                      </div>

                      {/* Filtro de Sentimento */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Análise de Sentimento</label>
                        </div>
                        <select 
                          value={sentimentFilter} 
                          onChange={(e) => setSentimentFilter(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value="all">🌐 Todos os sentimentos</option>
                          <option value="positive">😊 Positivos</option>
                          <option value="neutral">😐 Neutros</option>
                          <option value="negative">😞 Negativos</option>
                        </select>
                      </div>

                      {/* Filtro de Fonte */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                          </div>
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Plataforma de Origem</label>
                        </div>
                        <select 
                          value={sourceFilter} 
                          onChange={(e) => setSourceFilter(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value="all">🌐 Todas as plataformas</option>
                          {Array.from(new Set(analysisData.data.map(f => f.source).filter(Boolean))).map(source => (
                            <option key={source} value={source}>📱 {source}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro de Idioma */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                          </div>
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Idioma do Feedback</label>
                        </div>
                        <select 
                          value={languageFilter} 
                          onChange={(e) => setLanguageFilter(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value="all">🗣️ Todos os idiomas</option>
                          {Array.from(new Set(analysisData.data.map(f => f.language).filter(Boolean))).map(language => (
                            <option key={language} value={language}>
                              {language === 'portuguese' ? '🇧🇷' : language === 'english' ? '🇺🇸' : language === 'spanish' ? '🇪🇸' : '🌍'} {language}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro de Apartamento */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Apartamento</label>
                        </div>
                        <select 
                          value={apartmentFilter} 
                          onChange={(e) => setApartmentFilter(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value="all">🏠 Todos os apartamentos</option>
                          {Array.from(new Set(analysisData.data.map(f => f.apartamento).filter(Boolean))).map(apartamento => (
                            <option key={apartamento} value={apartamento}>🏢 Apto {apartamento}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro de Estrelas */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          </div>
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ocultar Avaliações</label>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map(rating => (
                            <label key={rating} className="group">
                              <input
                                type="checkbox"
                                checked={hiddenRatings.includes(rating)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setHiddenRatings(prev => [...prev, rating]);
                                  } else {
                                    setHiddenRatings(prev => prev.filter(r => r !== rating));
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={`flex flex-col items-center p-2 sm:p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                hiddenRatings.includes(rating) 
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30' 
                                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}>
                                <span className="text-sm sm:text-lg">{rating}⭐</span>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  {hiddenRatings.includes(rating) ? 'Oculto' : 'Visível'}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                        {hiddenRatings.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setHiddenRatings([])}
                            className="w-full mt-2 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            🔄 Mostrar Todas as Estrelas
                          </Button>
                        )}
                      </div>

                      {/* Resumo dos filtros */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Resultados da filtragem:</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {globalFilteredData.length} de {analysisData.data.length} feedbacks
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(globalFilteredData.length / analysisData.data.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setDateRange({ start: null, end: null });
                              setSentimentFilter('all');
                              setSourceFilter('all');
                              setLanguageFilter('all');
                              setApartmentFilter('all');
                              setHiddenRatings([]);
                            }}
                            className="flex-1 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            🗑️ Limpar Filtros
                          </Button>
                          <Button 
                            onClick={() => setFiltersOpen(false)}
                            className="flex-1 bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 hover:from-slate-900 hover:via-blue-900 hover:to-indigo-900 text-white"
                          >
                            ✅ Fechar
                          </Button>
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição de Avaliações</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'rating',
                      'Distribuição de Avaliações',
                      processRatingDistribution(globalFilteredData),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processRatingDistribution(globalFilteredData)}>
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Principais Problemas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'problem',
                      'Principais Problemas',
                      processProblemDistribution(globalFilteredData),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={processProblemDistribution(globalFilteredData).slice(0, 6)}
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
                      <RechartsTooltip content={<CustomTooltip />} />
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

              {/* Principais Palavras-chave */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Principais Palavras-chave</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'keyword',
                      'Principais Palavras-chave',
                      processKeywordDistribution(globalFilteredData || []).slice(0, 15),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={processKeywordDistribution(globalFilteredData || []).slice(0, 8)}
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
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        name="Quantidade" 
                        fill="#00C49F"
                        onClick={(data) => handleChartClick(data, 'keyword')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Distribuição por Departamento */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição por Departamento</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'sector',
                      'Distribuição por Departamento',
                      processSectorDistribution(globalFilteredData || []),
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processSectorDistribution(globalFilteredData || [])}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }: any) => `${name ? name.substring(0, 15) + '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="label"
                        onClick={(data, index) => {
                          const item = processSectorDistribution(globalFilteredData || [])[index];
                          handleChartClick(item, 'sector');
                        }}
                      >
                        {processSectorDistribution(globalFilteredData || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Análise de Apartamentos */}
              <Card className="p-4">
                                <h3 className="text-lg font-semibold mb-4">Análise de Apartamentos</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processApartamentoDistribution(analysisData.analysis).slice(0, 8)}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                              </Card>

              {/* Distribuição por Fonte */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Distribuição por Fonte</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processSourceDistribution(analysisData.analysis)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="label"
                      >
                        {processSourceDistribution(analysisData.analysis).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              </div>
          </TabsContent>

          {/* Hotéis */}
          <TabsContent value="hotels" className="space-y-4">
            {/* Resumo por hotel */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Comparação entre Hotéis</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'hotel',
                    'Comparação entre Hotéis',
                    hotelStats.map(stat => ({
                      label: stat.hotel,
                      value: stat.totalFeedbacks
                    })),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
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
                    <RechartsTooltip content={<CustomTooltip />} />
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
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Problemas Mais Comuns</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'problem',
                      'Problemas Mais Comuns',
                      processProblemDistribution(globalFilteredData),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={processProblemDistribution(globalFilteredData).slice(0, 15)}
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
                      <RechartsTooltip content={<CustomTooltip />} />
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

              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição de Problemas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'problem',
                      'Distribuição de Problemas',
                      processProblemDistribution(globalFilteredData).slice(0, 10),
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processProblemDistribution(globalFilteredData).slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }: any) => `${name ? name.substring(0, 15) + '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="label"
                        onClick={(data, index) => {
                          const item = processProblemDistribution(globalFilteredData)[index];
                          handleChartClick(item, 'problem');
                        }}
                      >
                        {processProblemDistribution(globalFilteredData).slice(0, 10).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
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
                    {processProblemDistribution(globalFilteredData)
                      .slice(0, 20)
                      .map((problem: ProblemItem, index: number) => {
                        const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
                          ? globalFilteredData 
                          : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
                        
                        const hotelEntries = Object.entries(
                          (dataToUse || [])
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

                        const totalProblems = processProblemDistribution(globalFilteredData)
                          .reduce((sum: number, p: ProblemItem) => sum + p.value, 0);
                        const percentage = totalProblems > 0 ? ((problem.value / totalProblems) * 100).toFixed(1) : "0";

                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
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
              {/* Distribuição de Avaliações */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição de Avaliações</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'rating',
                      'Distribuição de Avaliações',
                      processRatingDistribution(globalFilteredData),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processRatingDistribution(globalFilteredData)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        fill="#8884d8"
                        onClick={(data) => handleChartClick(data, 'rating')}
                      >
                        {processRatingDistribution(globalFilteredData).map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              parseInt(entry.label) >= 4 ? '#4CAF50' : 
                              parseInt(entry.label) >= 3 ? '#FFC107' : 
                              '#F44336'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Análise de Sentimentos */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Análise de Sentimentos</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'sentiment',
                      'Análise de Sentimentos',
                      [
                        { name: 'Positivo', value: globalFilteredData.filter(f => f.sentiment === 'positive').length },
                        { name: 'Negativo', value: globalFilteredData.filter(f => f.sentiment === 'negative').length },
                        { name: 'Neutro', value: globalFilteredData.filter(f => f.sentiment === 'neutral').length }
                      ],
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Positivo', value: globalFilteredData.filter(f => f.sentiment === 'positive').length },
                          { name: 'Negativo', value: globalFilteredData.filter(f => f.sentiment === 'negative').length },
                          { name: 'Neutro', value: globalFilteredData.filter(f => f.sentiment === 'neutral').length }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        onClick={(data) => handleChartClick(data, 'sentiment')}
                      >
                        <Cell fill="#4CAF50" />
                        <Cell fill="#F44336" />
                        <Cell fill="#FFC107" />
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Volume de Feedbacks por Fonte</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(() => {
                      const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
                        ? globalFilteredData 
                        : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
                      return getTimePeriodData(dataToUse || [], 'source').data;
                    })()}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    {processSourceDistribution(analysisData?.analysis).map((source: any, index: number) => (
                      <Area 
                        key={source.label}
                        type="monotone" 
                        dataKey={source.label} 
                        stackId="1" 
                        stroke={COLORS[index % COLORS.length]} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-center text-muted-foreground mt-2">
                Agrupamento automático: {(() => {
                  const dataToUse = (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || hiddenRatings.length > 0) 
                    ? globalFilteredData 
                    : (isFilterApplied && filteredData ? filteredData.data : analysisData?.data);
                  const { period } = getTimePeriodData(dataToUse || [], 'source');
                  switch(period) {
                    case 'day': return 'por dia (dados recentes)';
                    case 'week': return 'por semana (dados de algumas semanas)';
                    case 'month': return 'por mês (dados de vários meses)';
                    default: return 'por período';
                  }
                })()}
              </div>
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
                        <RechartsTooltip content={<CustomTooltip />} />
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
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
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

      {/* Painel Lateral Interativo Melhorado */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[48rem] bg-background border-l border-border shadow-2xl transform transition-all duration-500 ease-in-out ${
        detailPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedItem && (
          <div className="h-full flex flex-col">
            {/* Cabeçalho Compacto */}
            <div className="relative p-5 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 shadow-lg">
                        {selectedItem.type === 'hotel' && <Building2 className="h-5 w-5" />}
                        {selectedItem.type === 'problem' && <AlertCircle className="h-5 w-5" />}
                        {selectedItem.type === 'rating' && <Star className="h-5 w-5" />}
                        {selectedItem.type === 'keyword' && <Tag className="h-5 w-5" />}
                        {selectedItem.type === 'source' && <Globe className="h-5 w-5" />}
                        {!['hotel', 'problem', 'rating', 'keyword', 'source'].includes(selectedItem.type) && <BarChart3 className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold leading-tight truncate">
                          {selectedItem.type === 'keyword' ? 'Palavra-chave' : 
                           selectedItem.type === 'problem' ? 'Problema' :
                           selectedItem.type === 'sector' ? 'Departamento' :
                           selectedItem.type === 'source' ? 'Fonte' :
                           selectedItem.type === 'language' ? 'Idioma' :
                           selectedItem.type === 'rating' ? 'Avaliação' :
                           selectedItem.type === 'hotel' ? 'Hotel' : selectedItem.type}
                        </h3>
                        <p className="text-sm text-blue-100 opacity-90 font-medium truncate">{cleanDataWithSeparator(selectedItem.value)}</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDetailPanelOpen(false)}
                    className="text-white hover:bg-white/10 h-10 w-10 rounded-full p-0 backdrop-blur-sm border border-white/20 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Métricas Compactas */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 text-center">
                    <div className="text-2xl font-bold text-white">{selectedItem.stats.totalOccurrences}</div>
                    <div className="text-xs text-blue-100 opacity-75 font-medium">Ocorrências</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 text-center">
                    <div className="text-2xl font-bold text-white">{selectedItem.stats.percentage}%</div>
                    <div className="text-xs text-blue-100 opacity-75 font-medium">do Total</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 text-center">
                    <div className="text-2xl font-bold text-white">{selectedItem.stats.averageRating.toFixed(1)}</div>
                    <div className="text-xs text-blue-100 opacity-75 font-medium">Avaliação Média</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo Principal Melhorado */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Botão Call-to-Action Premium */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4 -m-6 mb-6 border-b">
                  <Button 
                    onClick={handleViewAllComments}
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                    size="lg"
                  >
                    <MessageSquare className="h-5 w-5 mr-3" />
                    Ver TODOS os {selectedItem.stats.totalOccurrences} Comentários
                    <ExternalLink className="h-4 w-4 ml-3" />
                  </Button>
                </div>

              {/* Cards de Informação com Design Moderno */}
              <div className="grid gap-6">
                {/* Avaliação Média */}
                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                      <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    Avaliação Média
                  </h4>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">{selectedItem.stats.averageRating.toFixed(1)}</div>
                    <div className="text-2xl">
                      {Array.from({length: 5}, (_, i) => (
                        <span key={i} className={i < Math.round(selectedItem.stats.averageRating) ? "text-yellow-500" : "text-gray-300"}>
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Distribuição de Sentimentos */}
                <Card className="p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Distribuição de Sentimentos
                  </h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Positivo', value: selectedItem.stats.sentimentDistribution.positive, fill: '#10B981' },
                            { name: 'Neutro', value: selectedItem.stats.sentimentDistribution.neutral, fill: '#F59E0B' },
                            { name: 'Negativo', value: selectedItem.stats.sentimentDistribution.negative, fill: '#EF4444' }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        >
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Distribuição de Avaliações */}
                <Card className="p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                      <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Distribuição de Avaliações
                  </h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { rating: '1⭐', value: selectedItem.stats.ratingDistribution[1] },
                        { rating: '2⭐', value: selectedItem.stats.ratingDistribution[2] },
                        { rating: '3⭐', value: selectedItem.stats.ratingDistribution[3] },
                        { rating: '4⭐', value: selectedItem.stats.ratingDistribution[4] },
                        { rating: '5⭐', value: selectedItem.stats.ratingDistribution[5] }
                      ]}>
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Tendência Mensal */}
                {selectedItem.stats.monthlyTrend.length > 1 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Tendência Mensal
                    </h4>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedItem.stats.monthlyTrend}>
                          <XAxis dataKey="month" />
                          <YAxis />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* Hotéis Afetados */}
                {selectedItem.stats.topHotels.length > 0 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      Principais Hotéis
                    </h4>
                    <div className="space-y-3">
                      {selectedItem.stats.topHotels.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <span className="font-medium">{item.hotel}</span>
                          <Badge variant="secondary" className="px-3 py-1">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Palavras-chave Relacionadas */}
                {selectedItem.stats.topKeywords.length > 0 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mr-3">
                        <Tag className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      Principais Palavras-chave
                    </h4>
                    <div className="space-y-3">
                      {selectedItem.stats.topKeywords.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <span className="font-medium">{cleanDataWithSeparator(item.keyword)}</span>
                          <Badge variant="secondary" className="px-3 py-1">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Problemas Relacionados */}
                {selectedItem.stats.topProblems.length > 0 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      Problemas Relacionados
                    </h4>
                    <div className="space-y-3">
                      {selectedItem.stats.topProblems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <span className="font-medium">{cleanDataWithSeparator(item.problem)}</span>
                          <Badge variant="destructive" className="px-3 py-1">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Premium para fechar o painel */}
      {detailPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-500" 
          onClick={() => setDetailPanelOpen(false)}
        />
      )}

      {/* Modal para Ver Todos os Comentários - Melhorado */}
      <Dialog open={allCommentsModalOpen} onOpenChange={setAllCommentsModalOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-6 border-b">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              Todos os Comentários {selectedItem && `(${allCommentsData.length})`}
            </DialogTitle>
            <DialogDescription className="text-lg">
              {selectedItem && `Comentários relacionados a: ${cleanDataWithSeparator(selectedItem.value)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-6">
              {allCommentsData.map((feedback: any, idx: number) => (
                <Card key={idx} className="p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-5 w-5 ${
                              i < feedback.rating 
                                ? "text-yellow-500 fill-yellow-500" 
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <Badge variant="outline" className="px-3 py-1 font-semibold">
                        {feedback.rating}/5
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-foreground">
                        {feedback.hotel || 'Hotel não identificado'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateBR(feedback.date)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-base leading-relaxed text-foreground">{feedback.comment}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {feedback.source && cleanDataWithSeparator(feedback.source) && (
                      <Badge variant="secondary" className="px-3 py-1 text-sm">
                        📍 {cleanDataWithSeparator(feedback.source)}
                      </Badge>
                    )}
                    {feedback.sector && cleanDataWithSeparator(feedback.sector) && (
                      <Badge variant="outline" className="px-3 py-1 text-sm">
                        🏢 {cleanDataWithSeparator(feedback.sector)}
                      </Badge>
                    )}
                    {feedback.keyword && cleanDataWithSeparator(feedback.keyword) && (
                      <Badge variant="outline" className="px-3 py-1 text-sm">
                        🏷️ {cleanDataWithSeparator(feedback.keyword)}
                      </Badge>
                    )}
                    {feedback.problem && cleanDataWithSeparator(feedback.problem) && (
                      <Badge variant="destructive" className="px-3 py-1 text-sm">
                        ⚠️ {cleanDataWithSeparator(feedback.problem)}
                      </Badge>
                    )}
                    {feedback.apartamento && cleanDataWithSeparator(feedback.apartamento) && (
                      <Badge variant="outline" className="px-3 py-1 text-sm">
                        🚪 {cleanDataWithSeparator(feedback.apartamento)}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
              
              {allCommentsData.length === 0 && (
                <div className="text-center py-20">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-muted-foreground mb-3">
                    Nenhum comentário encontrado
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    Não há comentários disponíveis para este critério.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Gráfico Grande */}
      <Dialog open={chartModalOpen} onOpenChange={setChartModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedChart?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {selectedChart && (
              <div className="space-y-6">
                {/* Gráfico Grande */}
                <div className="h-[500px] bg-muted/10 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(selectedChart.chartType, selectedChart.data, handleChartClick, selectedChart.type)}
                  </ResponsiveContainer>
                </div>

                {/* Dados Tabulares */}
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Dados Detalhados</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="py-3 px-4 bg-muted border-b text-left font-semibold">
                            {selectedChart.type === 'rating' ? 'Avaliação' :
                             selectedChart.type === 'keyword' ? 'Palavra-chave' :
                             selectedChart.type === 'sector' ? 'Departamento' :
                             selectedChart.type === 'problem' ? 'Problema' :
                             selectedChart.type === 'sentiment' ? 'Sentimento' : 'Item'}
                          </th>
                          <th className="py-3 px-4 bg-muted border-b text-center font-semibold">Quantidade</th>
                          <th className="py-3 px-4 bg-muted border-b text-center font-semibold">Percentual</th>
                          <th className="py-3 px-4 bg-muted border-b text-center font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedChart.data.map((item: any, index: number) => {
                          const total = selectedChart.data.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
                          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                          const itemName = item.name || item.label;
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                              <td className="py-3 px-4 border-b font-medium">{itemName}</td>
                              <td className="py-3 px-4 border-b text-center">{item.value}</td>
                              <td className="py-3 px-4 border-b text-center">
                                <Badge variant="outline">{percentage}%</Badge>
                              </td>
                              <td className="py-3 px-4 border-b text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleChartClick(item, selectedChart.type);
                                    setChartModalOpen(false);
                                  }}
                                >
                                  Ver Feedbacks
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
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