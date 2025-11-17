"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllAnalyses } from "@/lib/firestore-service";
import { RequireAdmin, useAuth } from "@/lib/auth-context";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// import removido: Accordion não é mais usado nesta página
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
import { ChartDetailModal } from '@/components/chart-detail-modal';
import { 
  ModernChart,
  ProblemsChart,
  RatingsChart,
  DepartmentsChart,
  HotelsChart,
  KeywordsChart,
  ApartmentsChart,
  SourcesChart,
  ProblemsTrendChart,
  ProblemsBySentimentChart,
  ProblemsDistributionChart
} from "@/components/modern-charts";
import DetailProblem from "@/app/admin/components/detail_problem";
import {
  formatDateBR,
  filterValidFeedbacks,
  isValidProblem,
  isValidSectorOrKeyword,
  processSectorDistribution as processValidSectorDistribution,
  processKeywordDistribution as processValidKeywordDistribution,
  processProblemDistribution as processValidProblemDistribution,
  getFeedbackKeywords,
  getFeedbackSectors,
  extractComplimentsFromFeedback,
  hasCompliment,
  buildComplimentPhraseDistribution,
  buildComplimentSectorDistribution,
  buildComplimentKeywordDistribution
} from "@/lib/utils";
import { AdminProblemsVisualizationOptions } from "./ProblemsVisualizationOptions";

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
  averageRating: number;
  sentiment: number;
  mainHotel: string;
  hotels: Map<string, number>;
  topProblems: Array<{problem: string; count: number}>;
  ratingDistribution: number[];
  problemsTotal: number;
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
const renderModernChart = (
  chartType: string,
  data: any[],
  onChartClick: (item: any, type: string) => void,
  type: string,
  height?: number
) => {
  const chartData = data.map(item => ({
    label: item.name || item.label,
    value: item.value,
    name: item.name || item.label
  }));

  const handleClick = (item: any, index: number) => {
    onChartClick(item, type);
  };

  if (chartType === 'bar') {
    return <ModernChart data={chartData} type="bar" onClick={handleClick} height={height} />;
  }
  
  if (chartType === 'pie') {
    return <ModernChart data={chartData} type="pie" onClick={handleClick} height={height} />;
  }
  
  if (chartType === 'horizontalBar') {
    return <ModernChart data={chartData} type="horizontalBar" onClick={handleClick} height={height} />;
  }

  if (chartType === 'line') {
    return <ModernChart data={chartData} type="line" onClick={handleClick} height={height} />;
  }
  
  // Fallback
  return <ModernChart data={chartData} type="bar" onClick={handleClick} height={height} />;
};

// Componente principal
function AdminDashboardContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, userData, loading: authLoading } = useAuth();
  
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
    chartData: any[];
    tableData: any[];
    chartType: 'bar' | 'pie' | 'line' | 'horizontalBar';
    chartHeight?: number;
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
    // Aplicar filtros globais sobre a base correta:
    // se houver filtro de hotel, usar dados do hotel; caso contrário, usar todos os dados
    const baseData = isFilterApplied
      ? (filteredData?.data || [])
      : (analysisData?.data || []);
    const filtered = applyGlobalFilters(baseData);
    setGlobalFilteredData(filtered);
  }, [dateRange, sentimentFilter, sourceFilter, languageFilter, apartmentFilter, hiddenRatings, analysisData?.data, filteredData?.data, isFilterApplied]);

  // Função para aplicar filtros globais
  const applyGlobalFilters = useCallback((data: any[]) => {
    if (!data || data.length === 0) return [];
    
    return data.filter((feedback: any) => {
      // Filtro para remover feedbacks excluídos
      if (feedback.deleted === true) {
        return false;
      }
      
      // Filtro para remover "não identificados" do dashboard principal
      if (isNotIdentifiedFeedback(feedback)) {
        return false;
      }
      
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
  
  // Atualizar dados filtrados quando a base de dados mudar (dados originais ou dados por hotel)
  useEffect(() => {
    const baseData = isFilterApplied
      ? (filteredData?.data || [])
      : (analysisData?.data || []);
    const filtered = applyGlobalFilters(baseData);
    setGlobalFilteredData(filtered);
  }, [analysisData?.data, filteredData?.data, isFilterApplied, applyGlobalFilters]);

  // Função para diagnóstico
  const runDiagnostics = async () => {
    
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

  // Função para verificar se há filtros aplicados
  const hasFiltersApplied = () => {
    return (dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || apartmentFilter !== 'all' || hiddenRatings.length > 0 || selectedHotel !== 'todos');
  };

  // Função helper para identificar feedbacks "não identificados"
  const isNotIdentifiedFeedback = (feedback: any): boolean => {
    if (!feedback) return false;
    
    const keyword = feedback.keyword?.toLowerCase()?.trim() || '';
    const problem = feedback.problem?.toLowerCase()?.trim() || '';
    const department = feedback.department?.toLowerCase()?.trim() || '';
    const sector = feedback.sector?.toLowerCase()?.trim() || '';
    
    // Verificar se há problemas válidos no feedback
    const problems = problem.split(',').map((p: string) => p.trim());
    const hasValidProblems = problems.some((p: string) => {
      const normalizedProblem = p.toLowerCase().trim();
      const invalidProblems = [
        'VAZIO', 
        'sem problemas', 
        'nao identificado', 
        'não identificado',
        'Não identificado',
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
             normalizedProblem.length > 2;
    });
    
    // Se há problemas válidos, não considerar como "não identificado"
    if (hasValidProblems) {
      return false;
    }
    
    // Verificar se há keywords válidas
    const keywords = keyword.split(',').map((k: string) => k.trim());
    const hasValidKeywords = keywords.some((k: string) => {
      const normalizedKeyword = k.toLowerCase().trim();
      return normalizedKeyword !== 'não identificado' && 
             normalizedKeyword !== 'nao identificado' &&
             normalizedKeyword !== '' &&
             normalizedKeyword.length > 2;
    });
    
    // Se há keywords válidas, não considerar como "não identificado"
    if (hasValidKeywords) {
      return false;
    }
    
    // Só considerar "não identificado" se EXPLICITAMENTE marcado como tal
    const hasExplicitNotIdentified = 
      keyword.includes('não identificado') ||
      problem.includes('não identificado') ||
      department.includes('não identificado') ||
      sector.includes('não identificado');
    
    return hasExplicitNotIdentified;
  };

  // Função centralizada para obter dados consistentes
  const getCurrentData = () => {
    // Sempre preferir os dados já filtrados globalmente (aplicando período, sentimento, fontes, idioma, ratings ocultas, apartamento, etc.)
    // Quando há filtro de hotel aplicado, globalFilteredData contém os filtros globais sobre os feedbacks desse hotel.
    // Como fallback, usa filteredData.data (apenas hotel) ou analysisData.data (sem filtros globais).
    const baseData = isFilterApplied
      ? (globalFilteredData.length > 0 ? globalFilteredData : (filteredData?.data || []))
      : (globalFilteredData.length > 0 ? globalFilteredData : (analysisData?.data || []));

    // Remover feedbacks explicitamente marcados como "não identificado"
    return (baseData || []).filter((feedback: any) => !isNotIdentifiedFeedback(feedback));
  };

  const complimentFeedbacks = useMemo(() => {
    const data = getCurrentData();
    if (!data || data.length === 0) {
      return [];
    }
    return data.filter((feedback: any) => hasCompliment(feedback));
  }, [
    analysisData,
    filteredData,
    globalFilteredData,
    isFilterApplied,
    dateRange,
    sentimentFilter,
    sourceFilter,
    languageFilter,
    apartmentFilter,
    hiddenRatings
  ]);

  const complimentsByPhrase = useMemo(
    () => buildComplimentPhraseDistribution(complimentFeedbacks),
    [complimentFeedbacks]
  );

  const complimentsBySector = useMemo(
    () => buildComplimentSectorDistribution(complimentFeedbacks),
    [complimentFeedbacks]
  );

  const complimentsByKeyword = useMemo(
    () => buildComplimentKeywordDistribution(complimentFeedbacks),
    [complimentFeedbacks]
  );

  const complimentsBySource = useMemo(
    () => processSourceDistribution(complimentFeedbacks),
    [complimentFeedbacks]
  );

  const complimentsByHotel = useMemo(() => {
    if (complimentFeedbacks.length === 0) {
      return [];
    }

    const counts: Record<string, number> = {};

    complimentFeedbacks.forEach((feedback: any) => {
      const hotelName = feedback.hotel || 'Não identificado';
      const compliments = extractComplimentsFromFeedback(feedback);
      const increment = compliments.length > 0 ? compliments.length : 1;
      counts[hotelName] = (counts[hotelName] || 0) + increment;
    });

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [complimentFeedbacks]);

  const complimentsRatingDistribution = useMemo(
    () => processRatingDistribution(complimentFeedbacks),
    [complimentFeedbacks]
  );

  const complimentsTrend = useMemo(() => {
    if (complimentFeedbacks.length === 0) {
      return { period: 'day', data: [] as Array<{ label: string; value: number }> };
    }

    const complimentsWithMarker = complimentFeedbacks.map((feedback: any) => ({
      ...feedback,
      complimentMarker: 'Elogios'
    }));

    const { period, data } = getTimePeriodData(complimentsWithMarker, 'complimentMarker');
    const aggregated = data.map((item: any) => {
      const total = Object.entries(item).reduce((sum, [key, val]) => {
        if (key === 'period') return sum;
        return sum + (typeof val === 'number' ? val : 0);
      }, 0);

      return {
        label: item.period,
        value: total
      };
    });

    return { period, data: aggregated };
  }, [complimentFeedbacks]);

  const recentCompliments = useMemo(
    () =>
      [...complimentFeedbacks]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 12),
    [complimentFeedbacks]
  );

  const complimentsSummary = useMemo(() => {
    if (complimentFeedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        share: 0,
        totalPhrases: 0,
        uniquePhrases: 0,
        averageRating: 0,
        highlightSector: '—',
        highlightHotel: '—',
        topCompliment: '—'
      };
    }

    const baseData = getCurrentData();
    const totalPhrases = complimentFeedbacks.reduce(
      (sum, feedback) => sum + extractComplimentsFromFeedback(feedback).length,
      0
    );

    const averageRating =
      complimentFeedbacks.reduce((sum, feedback) => sum + (feedback.rating || 0), 0) /
      complimentFeedbacks.length;

    const share =
      (baseData?.length || 0) > 0
        ? (complimentFeedbacks.length / baseData.length) * 100
        : 0;

    return {
      totalFeedbacks: complimentFeedbacks.length,
      share,
      totalPhrases,
      uniquePhrases: complimentsByPhrase.length,
      averageRating,
      highlightSector: complimentsBySector[0]?.label || '—',
      highlightHotel: complimentsByHotel[0]?.label || '—',
      topCompliment: complimentsByPhrase[0]?.label || '—'
    };
  }, [
    complimentFeedbacks,
    complimentsByPhrase,
    complimentsBySector,
    complimentsByHotel,
    analysisData,
    filteredData,
    globalFilteredData,
    isFilterApplied,
    dateRange,
    sentimentFilter,
    sourceFilter,
    languageFilter,
    apartmentFilter,
    hiddenRatings
  ]);

  // Função para lidar com cliques em gráficos
  const handleChartClick = (data: any, type: string) => {
    const dataToUse = getCurrentData();

    if (!dataToUse) {
      toast({
        title: "Erro",
        description: "Dados não disponíveis",
        variant: "destructive",
      });
      return;
    }

    const isComplimentFlow = type.startsWith('compliment');
    const baseDataset = isComplimentFlow ? complimentFeedbacks : dataToUse;

    if (!baseDataset || baseDataset.length === 0) {
      toast({
        title: "Nenhum dado disponível",
        description: isComplimentFlow
          ? "Não há elogios disponíveis para este critério."
          : "Não há feedbacks disponíveis para este critério.",
        variant: "destructive",
      });
      return;
    }

    let filteredFeedbacks: any[] = [];
    let value = "";

    switch (type) {
      case 'rating': {
        const rating = parseInt(data.label);
        filteredFeedbacks = baseDataset.filter((feedback: any) => Math.floor(feedback.rating) === rating);
        value = `${rating} estrela${rating !== 1 ? 's' : ''}`;
        break;
      }

      case 'problem': {
        const problemLabel = data.label || data.name;
        const norm = (s: string) => s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        const extractLabelParts = (raw: string): { department: string; problem: string } => {
          const normalizedDash = raw.replace(' – ', ' - ');
          const parts = normalizedDash.split('-');
          const department = (parts[0] || '').trim();
          const problem = parts.length > 1 ? parts.slice(1).join('-').trim() : '';
          return { department, problem };
        };
        const { department, problem } = extractLabelParts(String(problemLabel));
        const depTarget = norm(department);
        const probTarget = norm(problem);
        filteredFeedbacks = baseDataset.filter((feedback: any) => {
          if (Array.isArray(feedback?.allProblems)) {
            return feedback.allProblems.some((p: any) => {
              const pMain = norm(String(p?.problem || ''));
              const pDept = norm(String((p?.sector ?? p?.department) ?? ''));
              return pDept === depTarget && pMain.includes(probTarget);
            });
          }
          const sectorRaw = String(feedback?.sector || feedback?.department || '').trim();
          const sectors = sectorRaw ? sectorRaw.split(/[;,|]/).map((s: string) => norm(s)) : [];
          const sectorMatches = sectors.includes(depTarget);
          if (!sectorMatches) return false;
          const main = norm(String(feedback?.problem_main || ''));
          if (main && main.includes(probTarget)) return true;
          if (typeof feedback?.problem === 'string') {
            const parts = feedback.problem.split(';').map((s: string) => norm(String(s).split('-').slice(1).join('-').trim()));
            return parts.some((s: string) => s.includes(probTarget));
          }
          return false;
        });
        value = problemLabel;
        break;
      }

      case 'hotel': {
        const hotelLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => feedback.hotel === hotelLabel);
        value = hotelLabel;
        break;
      }

      case 'source': {
        const sourceLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => feedback.source === sourceLabel);
        value = sourceLabel;
        break;
      }

      case 'apartamento': {
        const apRaw = String(data.name || data.label || '').trim();
        let apt = apRaw;
        let hotelForApt = '';
        if (apRaw.includes(' - Apt ')) {
          const [h, a] = apRaw.split(' - Apt ');
          hotelForApt = h.trim();
          apt = a.trim();
        } else if (apRaw.startsWith('Apt ')) {
          apt = apRaw.replace(/^Apt\s+/, '').trim();
        }
        filteredFeedbacks = baseDataset.filter((feedback: any) => {
          const matchesApt = String(feedback.apartamento) === apt;
          if (hotelForApt) {
            return matchesApt && String(feedback.hotel) === hotelForApt;
          }
          return matchesApt;
        });
        value = hotelForApt ? `${hotelForApt} – Apt ${apt}` : `Apartamento ${apt}`;
        break;
      }

      case 'keyword': {
        const keywordLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => {
          if (feedback.keyword && typeof feedback.keyword === 'string') {
            return feedback.keyword.split(';').map((k: string) => k.trim()).includes(keywordLabel);
          }
          return false;
        });
        value = keywordLabel;
        break;
      }

      case 'sector': {
        const sectorLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => {
          if (feedback.sector && typeof feedback.sector === 'string') {
            const sectors = feedback.sector.split(';').map((s: string) => s.trim());
            const normalizedSectors = sectors.map((s: string) => normalizeDepartmentName(s));
            return normalizedSectors.includes(sectorLabel) && sectors.every((s: string) => s !== 'VAZIO');
          }
          if (feedback.department && typeof feedback.department === 'string') {
            const departments = feedback.department.split(';').map((d: string) => d.trim());
            const normalizedDepartments = departments.map((d: string) => normalizeDepartmentName(d));
            return normalizedDepartments.includes(sectorLabel) && departments.every((d: string) => d !== 'VAZIO');
          }
          return false;
        });
        value = sectorLabel;
        break;
      }

      case 'language': {
        const languageLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => feedback.language === languageLabel);
        value = languageLabel;
        break;
      }

      case 'compliment': {
        const complimentLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) =>
          extractComplimentsFromFeedback(feedback).some(
            (compliment: string) => compliment.toLowerCase() === complimentLabel.toLowerCase()
          )
        );
        value = complimentLabel;
        break;
      }

      case 'complimentSector': {
        const sectorLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) =>
          getFeedbackSectors(feedback).some((sector: string) => sector === sectorLabel)
        );
        value = sectorLabel;
        break;
      }

      case 'complimentKeyword': {
        const keywordLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) =>
          getFeedbackKeywords(feedback).some((keyword: string) => keyword === keywordLabel)
        );
        value = keywordLabel;
        break;
      }

      case 'complimentHotel': {
        const hotelLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => feedback.hotel === hotelLabel);
        value = hotelLabel;
        break;
      }

      case 'complimentSource': {
        const sourceLabel = data.label || data.name;
        filteredFeedbacks = baseDataset.filter((feedback: any) => feedback.source === sourceLabel);
        value = sourceLabel;
        break;
      }

      case 'complimentRating': {
        const numericRating = parseInt(String(data.label || data.value).replace(/[^0-9]/g, ''), 10);
        filteredFeedbacks = baseDataset.filter((feedback: any) => Math.floor(feedback.rating) === numericRating);
        value = `${numericRating} estrela${numericRating !== 1 ? 's' : ''}`;
        break;
      }

      case 'complimentOverview': {
        filteredFeedbacks = [...baseDataset];
        value = 'Todos os elogios';
        break;
      }

      default:
        return;
    }

    if (filteredFeedbacks.length === 0) {
      toast({
        title: "Nenhum feedback encontrado",
        description: isComplimentFlow
          ? "Não há elogios disponíveis para este critério."
          : `Não há feedbacks disponíveis para ${type === 'rating' ? 'esta avaliação' : 'este critério'}`,
        variant: "destructive",
      });
      return;
    }

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
      percentage: baseDataset.length > 0 ? Number(((filteredFeedbacks.length / baseDataset.length) * 100).toFixed(1)) : 0,
      recentFeedbacks: filteredFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      topKeywords: ['keyword', 'complimentKeyword'].includes(type) ? [] : getTopKeywordsForItem(filteredFeedbacks),
      topProblems: type === 'problem' || isComplimentFlow ? [] : getTopProblemsForItem(filteredFeedbacks),
      topHotels: ['hotel', 'complimentHotel'].includes(type) ? [] : getTopHotelsForItem(filteredFeedbacks),
      monthlyTrend: getMonthlyTrendForItem(filteredFeedbacks),
      topCompliments: buildComplimentPhraseDistribution(filteredFeedbacks).slice(0, 5)
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

  // Função para validar problemas considerando o contexto (permite VAZIO quando há outros problemas)
  const isValidProblemWithContext = (problem: string, allProblems: string[]): boolean => {
    if (!problem || typeof problem !== 'string') return false;
    
    const normalizedProblem = problem.toLowerCase().trim();
    
    // Se for VAZIO, só é válido se houver outros problemas válidos no mesmo feedback
    if (normalizedProblem === 'vazio') {
      const otherValidProblems = allProblems.filter(p => 
        p.toLowerCase().trim() !== 'vazio' && isValidProblem(p)
      );
      return otherValidProblems.length > 0;
    }
    
    // Para outros problemas, usar a validação normal
    return isValidProblem(problem);
  };

  // Função para determinar o período de agrupamento automaticamente
  function getTimePeriodData(data: any[], sourceField: string = 'language') {
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
  }

  // Função para abrir modal de gráfico grande
  const handleViewChart = (
    type: string,
    title: string,
    data: any[],
    chartType: 'bar' | 'pie' | 'line' | 'horizontalBar',
    options?: { chartLimit?: number; tableData?: any[]; chartHeight?: number }
  ) => {
    const chartData = options?.chartLimit ? data.slice(0, options.chartLimit) : data;
    const tableData = options?.tableData ?? data;
    const computedHeight = options?.chartHeight ?? (
      chartType === 'horizontalBar'
        ? Math.max(440, Math.min(chartData.length * 28, 1200))
        : undefined
    );

    setSelectedChart({
      type,
      title,
      chartData,
      tableData,
      chartType,
      chartHeight: computedHeight,
    });
    setChartModalOpen(true);
  };

  // Abrir painel de detalhes com visão geral (sem filtro específico)
  const openDetailOverview = (label: string) => {
    const dataToUse = getCurrentData();
    if (!dataToUse || dataToUse.length === 0) {
      toast({
        title: "Nenhum feedback encontrado",
        description: "Não há feedbacks disponíveis no período/escopo atual",
        variant: "destructive",
      });
      return;
    }

    const filteredFeedbacks = dataToUse;

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
      percentage: Number(((filteredFeedbacks.length / dataToUse.length) * 100).toFixed(1)),
      recentFeedbacks: filteredFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      topKeywords: getTopKeywordsForItem(filteredFeedbacks),
      topProblems: getTopProblemsForItem(filteredFeedbacks),
      topHotels: getTopHotelsForItem(filteredFeedbacks),
      monthlyTrend: getMonthlyTrendForItem(filteredFeedbacks)
    };

    setSelectedItem({
      type: 'general',
      value: label,
      data: { label },
      feedbacks: filteredFeedbacks,
      stats
    });
    setDetailPanelOpen(true);
  };

  // Funções de processamento de dados - usando dados centralizados
  function processRatingDistribution(data?: any[]) {
    const dataToUse = data || getCurrentData();
    if (!dataToUse) return [];
    
    const ratingCounts: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    dataToUse.forEach(feedback => {
      if (feedback.rating && feedback.rating >= 1 && feedback.rating <= 5) {
        ratingCounts[feedback.rating.toString()]++;
      }
    });
    
    return Object.entries(ratingCounts)
      .map(([rating, count]) => ({ label: rating + ' estrela' + (rating === '1' ? '' : 's'), value: count }));
  }

  const processProblemDistribution = (data?: any[]) => {
    const dataToUse = data || getCurrentData();
    if (!dataToUse) return [];
    
    const problemCounts: Record<string, number> = {};
    
    dataToUse.forEach(feedback => {
      // Usar allProblems se disponível (dados separados), senão usar problem concatenado
      if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
        feedback.allProblems.forEach((problemObj: any) => {
          if (problemObj.problem) {
            const trimmedProblem = problemObj.problem.trim();
            // Contar apenas problemas válidos que não sejam VAZIO e não comecem com '+'
            if (trimmedProblem && 
                isValidProblem(trimmedProblem) && 
                trimmedProblem.toLowerCase() !== 'vazio' &&
                !trimmedProblem.startsWith('+')) {
              problemCounts[trimmedProblem] = (problemCounts[trimmedProblem] || 0) + 1;
            }
          }
        });
      } else if (feedback.problem) {
        // Fallback para dados antigos concatenados
        const allProblems = feedback.problem.split(';').map((p: string) => p.trim());
        
        // Verificar se o feedback tem pelo menos um problema válido (incluindo VAZIO se acompanhado)
        const hasValidProblems = allProblems.some((problem: string) => 
          isValidProblemWithContext(problem, allProblems)
        );
        
        // Se o feedback tem problemas válidos, contar todos os problemas válidos exceto VAZIO
        if (hasValidProblems) {
          allProblems.forEach((problem: string) => {
            const trimmedProblem = problem.trim();
            // Contar apenas problemas válidos que não sejam VAZIO e não comecem com '+'
            if (trimmedProblem && 
                isValidProblem(trimmedProblem) && 
                trimmedProblem.toLowerCase() !== 'vazio' &&
                !trimmedProblem.startsWith('+')) {
              problemCounts[trimmedProblem] = (problemCounts[trimmedProblem] || 0) + 1;
            }
          });
        }
      }
    });
    
    return Object.entries(problemCounts)
      .map(([problem, count]) => ({ label: problem, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  };

  function processSourceDistribution(data?: any[]) {
    const dataToUse = data || getCurrentData();
    if (!dataToUse) return [];
    
    const sourceCounts: Record<string, number> = {};
    
    dataToUse.forEach((feedback: any) => {
      const source = feedback.source || 'Não especificado';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ label: source, value: count }))
      .sort((a, b) => b.value - a.value);
  }

  const processApartamentoDistribution = (data?: any[]) => {
    const dataToUse = data || getCurrentData();
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

  // Função para normalizar nomes de departamentos (unificar variações de manutenção e programa de vendas)
  const normalizeDepartmentName = (departmentName: string): string => {
    const trimmed = departmentName.trim();
    
    // Verificar se contém "manutenção" (case-insensitive)
    if (trimmed.toLowerCase().includes('manutenção') || 
        trimmed.toLowerCase().includes('manutencao')) {
      return 'Manutenção';
    }
    
    // Verificar se contém "programa de vendas" (case-insensitive)
    if (trimmed.toLowerCase().includes('programa de vendas')) {
      return 'EG';
    }
    
    return trimmed;
  };

  const processSectorDistribution = (data?: any[]) => {
    // Usar dados fornecidos ou função centralizada para garantir consistência
    const dataToUse = data && data.length > 0 ? data : getCurrentData();
    
    // Contar feedbacks por departamento
    const sectorCounts: Record<string, number> = {};
    
    (dataToUse || []).forEach(feedback => {
      if (feedback.sector) {
        const allSectors = feedback.sector.split(';').map((s: string) => s.trim());
        
        // Contar cada ocorrência de setor válida, independente de problemas
        allSectors.forEach((sector: string) => {
          const trimmedSector = sector.trim();
          if (trimmedSector && trimmedSector !== 'VAZIO' && !trimmedSector.startsWith('+')) { // Filtrar "+X outros" e VAZIO
            // Normalizar o nome do departamento para unificar variações de manutenção e EG
            const normalizedSector = normalizeDepartmentName(trimmedSector);
            sectorCounts[normalizedSector] = (sectorCounts[normalizedSector] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(sectorCounts)
      .map(([sector, count]) => ({ label: sector, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  // Nova função melhorada para contar problemas por departamento
  const processDepartmentProblemsDistribution = (data?: any[]) => {
    const dataToUse = data && data.length > 0 ? data : getCurrentData();
    
    // Contar problemas específicos por departamento
    const departmentProblems: Record<string, number> = {};
    
    (dataToUse || []).forEach(feedback => {
      if (feedback.problem && feedback.sector) {
        const allProblems = feedback.problem.split(';').map((p: string) => p.trim());
        const allSectors = feedback.sector.split(';').map((s: string) => s.trim());
        
        // Para cada problema válido, contar em cada departamento válido
        allProblems.forEach((problem: string) => {
          const trimmedProblem = problem.trim();
          // Filtrar problemas que começam com '+' (como '+2 outros')
          if (trimmedProblem && trimmedProblem !== 'VAZIO' && trimmedProblem.toLowerCase() !== 'sem problemas' && !trimmedProblem.startsWith('+')) {
            allSectors.forEach((sector: string) => {
              const trimmedSector = sector.trim();
              if (trimmedSector && trimmedSector !== 'VAZIO') {
                // Normalizar o nome do departamento para unificar variações de manutenção
                const normalizedSector = normalizeDepartmentName(trimmedSector);
                departmentProblems[normalizedSector] = (departmentProblems[normalizedSector] || 0) + 1;
              }
            });
          }
        });
      }
    });
    
    return Object.entries(departmentProblems)
      .map(([department, problemCount]) => ({ 
        label: department, 
        value: problemCount,
        name: department
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  const processKeywordDistribution = (data?: any[]) => {
    const keywordCounts: Record<string, number> = {};
    
    // Usar dados fornecidos ou função centralizada para garantir consistência
    const dataToUse = data && data.length > 0 ? data : getCurrentData();
    
    (dataToUse || []).forEach(feedback => {
      // Usar allProblems se disponível (dados separados), senão usar keyword concatenado
      if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
        feedback.allProblems.forEach((problemObj: any) => {
          if (problemObj.keyword) {
            const trimmedKeyword = problemObj.keyword.trim();
            if (trimmedKeyword && trimmedKeyword !== 'VAZIO') {
              keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1;
            }
          }
        });
      } else if (feedback.keyword) {
        // Fallback para dados antigos concatenados
        feedback.keyword.split(';').forEach((keyword: string) => {
          const trimmedKeyword = keyword.trim();
          if (trimmedKeyword && trimmedKeyword !== 'VAZIO') {
            keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ label: keyword, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  };

  // Função para processar problemas por apartamento
  const processApartamentoProblemsDistribution = () => {
    const dataToUse = getCurrentData();
    if (!dataToUse) return [];

    const apartamentoProblems = new Map<string, number>();

    dataToUse.forEach((feedback: any) => {
      if (!feedback.apartamento) return;

      let hasValidProblems = false;

      // Processar problemas do feedback
      if (feedback.problems && Array.isArray(feedback.problems)) {
        feedback.problems.forEach((problem: string) => {
          if (isValidProblem(problem)) {
            hasValidProblems = true;
          }
        });
      } else if (feedback.problem && typeof feedback.problem === 'string') {
        const problems = feedback.problem.split(';').map((p: string) => p.trim());
        problems.forEach((problem: string) => {
          if (isValidProblem(problem)) {
            hasValidProblems = true;
          }
        });
      }

      // Se o apartamento tem problemas válidos, incrementar contador
      if (hasValidProblems) {
        const apartamento = feedback.apartamento.toString();
        apartamentoProblems.set(apartamento, (apartamentoProblems.get(apartamento) || 0) + 1);
      }
    });

    return Array.from(apartamentoProblems.entries())
      .map(([apartamento, count]) => ({ name: apartamento, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  const processApartamentosPorHotel = () => {
    const dataToUse = getCurrentData();
    if (!dataToUse) return [];

    const hotelApartamentos: Record<string, Set<string>> = {};
    
    dataToUse.forEach((feedback: any) => {
      if (feedback.hotel && feedback.apartamento) {
        const hotel = feedback.hotel.toString();
        const apartamento = feedback.apartamento.toString();
        
        if (!hotelApartamentos[hotel]) {
          hotelApartamentos[hotel] = new Set();
        }
        hotelApartamentos[hotel].add(apartamento);
      }
    });

    return Object.entries(hotelApartamentos)
      .map(([hotel, apartamentosSet]) => ({ 
        name: hotel, 
        value: apartamentosSet.size 
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Novo: distribuição por par Hotel – Apartamento (feedbacks)
  const processHotelApartamentoDistribution = () => {
    const dataToUse = getCurrentData();
    if (!dataToUse) return [];

    const pairCounts: Record<string, number> = {};

    (dataToUse || []).forEach((feedback: any) => {
      const apt = feedback?.apartamento ? String(feedback.apartamento) : null;
      const hotel = feedback?.hotel ? String(feedback.hotel) : null;
      if (!apt) return;
      const hotelLabel = hotel || 'Hotel não especificado';
      const key = `${hotelLabel}||${apt}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });

    return Object.entries(pairCounts)
      .map(([key, count]) => {
        const [hotel, apt] = key.split('||');
        return { label: `${hotel} - Apt ${apt}`, value: count };
      })
      .sort((a, b) => b.value - a.value);
  };

  // Novo: problemas válidos por par Hotel – Apartamento
  const processApartamentoProblemsDistributionByHotel = () => {
    const dataToUse = getCurrentData();
    if (!dataToUse) return [];

    const pairCounts: Record<string, number> = {};

    (dataToUse || []).forEach((feedback: any) => {
      const apt = feedback?.apartamento ? String(feedback.apartamento) : null;
      const hotel = feedback?.hotel ? String(feedback.hotel) : null;
      if (!apt) return;

      let hasValidProblems = false;
      if (Array.isArray(feedback?.problems)) {
        hasValidProblems = feedback.problems.some((p: string) => isValidProblem(p));
      } else if (typeof feedback?.problem === 'string') {
        hasValidProblems = feedback.problem
          .split(';')
          .map((p: string) => p.trim())
          .some((p: string) => isValidProblem(p));
      }

      if (hasValidProblems) {
        const hotelLabel = hotel || 'Hotel não especificado';
        const key = `${hotelLabel}||${apt}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    });

    return Object.entries(pairCounts)
      .map(([key, count]) => {
        const [hotel, apt] = key.split('||');
        return { label: `${hotel} - Apt ${apt}`, value: count };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  // Novo: agrupamento por Hotel com lista de Apartamentos e contagem de feedbacks
  const processHotelsWithApartmentsGrouped = (maxApartmentsPerHotel = 10) => {
    const dataToUse = getCurrentData();
    if (!dataToUse) return [];

    const groups: Record<string, Record<string, number>> = {};

    (dataToUse || []).forEach((feedback: any) => {
      const apt = feedback?.apartamento ? String(feedback.apartamento) : null;
      const hotel = feedback?.hotel ? String(feedback.hotel) : null;
      if (!apt) return;
      const hotelLabel = hotel || 'Hotel não especificado';
      if (!groups[hotelLabel]) groups[hotelLabel] = {};
      groups[hotelLabel][apt] = (groups[hotelLabel][apt] || 0) + 1;
    });

    const result = Object.entries(groups).map(([hotel, aptCounts]) => {
      const apartamentos = Object.entries(aptCounts)
        .map(([apt, count]) => ({
          label: `Apt ${apt}`,
          value: count
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, maxApartmentsPerHotel);

    const total = Object.values(aptCounts).reduce((acc, n) => acc + n, 0);

      return { hotel, total, apartamentos };
    });

    return result.sort((a, b) => b.total - a.total);
  };

  // Novo: agrupamento por Hotel com contagem de problemas válidos por apartamento
  const processHotelsWithApartmentsProblemsGrouped = (maxApartmentsPerHotel = 10) => {
    const dataToUse = getCurrentData();
    if (!dataToUse) return [];

    const groups: Record<string, Record<string, number>> = {};

    (dataToUse || []).forEach((feedback: any) => {
      const apt = feedback?.apartamento ? String(feedback.apartamento) : null;
      const hotel = feedback?.hotel ? String(feedback.hotel) : null;
      if (!apt) return;

      let hasValidProblems = false;
      if (Array.isArray(feedback?.problems)) {
        hasValidProblems = feedback.problems.some((p: string) => isValidProblem(p));
      } else if (typeof feedback?.problem === 'string') {
        hasValidProblems = feedback.problem
          .split(';')
          .map((p: string) => p.trim())
          .some((p: string) => isValidProblem(p));
      }
      if (!hasValidProblems) return;

      const hotelLabel = hotel || 'Hotel não especificado';
      if (!groups[hotelLabel]) groups[hotelLabel] = {};
      groups[hotelLabel][apt] = (groups[hotelLabel][apt] || 0) + 1;
    });

    const result = Object.entries(groups).map(([hotel, aptCounts]) => {
      const apartamentos = Object.entries(aptCounts)
        .map(([apt, count]) => ({
          label: `Apt ${apt}`,
          value: count
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, maxApartmentsPerHotel);

      const total = Object.values(aptCounts).reduce((acc, n) => acc + n, 0);

      return { hotel, total, apartamentos };
    });

    return result.sort((a, b) => b.total - a.total);
  };

  const processApartamentoDetailsData = () => {
    const dataToUse = getCurrentData();
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

      const problemsTotal = Array.from(stat.problems.values()).reduce((acc, n) => acc + n, 0);

      return {
        apartamento,
        count: stat.count,
        averageRating,
        sentiment,
        mainHotel,
        hotels: stat.hotels,
        topProblems,
        ratingDistribution: stat.ratings,
        problemsTotal,
      } as ApartamentoDetail;
    }).sort((a, b) => b.count - a.count);
  };

  // Dados estatísticos por hotel
  const hotelStats = useMemo((): HotelStat[] => {
    const dataToUse = getCurrentData();
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
  }, [analysisData, filteredData, isFilterApplied, globalFilteredData, dateRange, sentimentFilter, sourceFilter, languageFilter, hiddenRatings, apartmentFilter]);

  // Função para buscar dados administrativos
  const fetchData = async () => {
    const startTime = performance.now();
    try {
      console.log('🚀 Iniciando carregamento do dashboard administrativo...');
      
      // Carregar hotéis e análises em paralelo para melhor performance
      const dataLoadStart = performance.now();
      const [hotelsSnapshot, analyses] = await Promise.all([
        getDocs(collection(db, "hotels")),
        getAllAnalyses()
      ]);
      const dataLoadTime = performance.now() - dataLoadStart;
      
      const hotelsData = hotelsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.hotelId || doc.id,
          name: data.name || doc.id
        };
      });
      setHotels(hotelsData);
      console.log(`📊 Carregados ${hotelsData.length} hotéis e ${analyses?.length || 0} análises em ${dataLoadTime.toFixed(2)}ms`);

      if (analyses && analyses.length > 0) {
        // Calcular a data mais recente dos feedbacks para a análise combinada
        const allDates = analyses.flatMap((analysis: any) => 
          analysis.data?.map((f: any) => new Date(f.date)).filter((date: Date) => !isNaN(date.getTime())) || []
        );
        
        const mostRecentFeedbackDate = allDates.length > 0 
          ? new Date(Math.max(...allDates.map((date: Date) => date.getTime())))
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

        // Filtrar por data e feedbacks excluídos
        const filterByDate = (feedback: any) => {
          // Filtrar feedbacks excluídos
          if (feedback.deleted === true) return false;
          
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
            
            return;
          }
          
          const filteredData = analysis.data.filter(filterByDate);
          totalFeedbacks += filteredData.length;
          
          const hotelDisplayName = (analysis as any).hotelDisplayName || analysis.hotelName || "Hotel não especificado";
          const hotelDocId = (analysis as any).hotelDocId || analysis.hotelId || "";
          allFeedbacks.push(
            ...filteredData.map((f: any) => ({
              ...f,
              hotel: hotelDisplayName,
              hotelName: hotelDisplayName,
              hotelId: f.hotelId || hotelDocId,
            }))
          );
          
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
            
            const hotelName = f.hotel || (analysis as any).hotelDisplayName || analysis.hotelName || "Hotel não especificado";
            hotelMap.set(hotelName, (hotelMap.get(hotelName) || 0) + 1);
            
            if (f.source) {
              sourceMap.set(f.source, (sourceMap.get(f.source) || 0) + 1);
            }
            
            if (f.language) {
              languageMap.set(f.language, (languageMap.get(f.language) || 0) + 1);
            }
            
            if (f.keyword) {
              f.keyword.split(';').forEach((keyword: string) => {
                const trimmedKeyword = keyword.trim();
                if (trimmedKeyword) {
                  keywordMap.set(trimmedKeyword, (keywordMap.get(trimmedKeyword) || 0) + 1);
                }
              });
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
        
        // Atualizar dados filtrados imediatamente após carregar do Firebase
        if (combinedAnalysis?.data) {
          const filtered = applyGlobalFilters(combinedAnalysis.data);
          setGlobalFilteredData(filtered);
        }
        
        // Salvar dados no cache após carregamento bem-sucedido
        saveToCache(combinedAnalysis, hotelsData);
      }
      
      // Simular um pequeno atraso para garantir uma transição suave
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ Dashboard carregado com sucesso em ${totalTime.toFixed(2)}ms`);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      const errorTime = performance.now() - startTime;
      console.log(`❌ Erro no carregamento após ${errorTime.toFixed(2)}ms`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para aplicar filtro por hotel
  const normalizeStringForHotel = (s: string) => {
    try {
      return (s || "")
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    } catch {
      return (s || "").toLowerCase().trim();
    }
  };

  const matchesHotel = (feedback: any, hotelId: string, hotelName: string) => {
    const nfName = normalizeStringForHotel(feedback.hotel || feedback.hotelName || "");
    const nfId = normalizeStringForHotel(feedback.hotelId || "");
    const nhId = normalizeStringForHotel(hotelId || "");
    const nhName = normalizeStringForHotel(hotelName || "");

    // Igualdade por ID
    if (nfId && nhId && nfId === nhId) return true;

    // Igualdade por nome normalizado
    if (nfName && nhName && nfName === nhName) return true;

    // Fallback de substring para variações (ex.: "wish foz" vs "wish foz do iguacu")
    if (nfName && nhName && (nfName.includes(nhName) || nhName.includes(nfName))) return true;

    // Fallback de substring para IDs normalizados (ex.: "wish foz" vs "wish foz do iguacu" em IDs)
    if (nfId && nhId && (nfId.includes(nhId) || nhId.includes(nfId))) return true;

    return false;
  };

  const applyHotelFilter = (hotelId: string) => {
    if (hotelId === "todos") {
      setFilteredData(null);
      setIsFilterApplied(false);
      setSelectedHotel("todos");
      
      // Restaurar globalFilteredData com todos os hotéis
      if (analysisData?.data) {
        const filtered = applyGlobalFilters(analysisData.data);
        setGlobalFilteredData(filtered);
      }
      
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
    
    // Compatibilizar diferentes formatos de referência de hotel nos feedbacks
    const filteredFeedbacks = analysisData.data.filter((feedback: any) => {
      return matchesHotel(feedback, hotelId, hotelName);
    });
    
    if (filteredFeedbacks.length === 0) {
      // Quando não há feedbacks, ainda aplicar o filtro para evitar manter dados do hotel anterior
      const emptyAnalysis: AnalysisData = {
        ...analysisData,
        hotelId: hotelId,
        hotelName: hotelName,
        data: [],
        analysis: {
          averageRating: 0,
          positiveSentiment: 0,
          ratingDistribution: [],
          problemDistribution: [],
          hotelDistribution: [{ label: hotelName, value: 0 }],
          sourceDistribution: [],
          languageDistribution: [],
          keywordDistribution: [],
          apartamentoDistribution: [],
          recentFeedbacks: []
        }
      };
      setFilteredData(emptyAnalysis);
      setIsFilterApplied(true);
      setGlobalFilteredData([]);
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
    
    // Também aplicar filtros globais nos dados do hotel selecionado
    const globallyFilteredHotelData = applyGlobalFilters(filteredFeedbacks);
    setGlobalFilteredData(globallyFilteredHotelData);
    
    toast({
      title: "Filtro aplicado",
      description: `Mostrando dados para ${hotelName}`,
    });
  };

  // Função para limpar cache do localStorage
  const clearDashboardCache = useCallback(() => {
    try {
      localStorage.removeItem('admin-dashboard-cache');
      localStorage.removeItem('admin-dashboard-timestamp');
      console.log('🗑️ Cache do dashboard limpo');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }, []);

  // Função para carregar dados do cache
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem('admin-dashboard-cache');
      const cacheTimestamp = localStorage.getItem('admin-dashboard-timestamp');
      
      if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const maxCacheAge = 5 * 60 * 1000; // 5 minutos
        
        if (cacheAge < maxCacheAge) {
          const parsedData = JSON.parse(cachedData);
          console.log('📦 Carregando dados do cache (idade:', Math.round(cacheAge / 1000), 'segundos)');
          
          setAnalysisData(parsedData.analysisData);
          setHotels(parsedData.hotels);
          
          // Atualizar dados filtrados imediatamente após carregar do cache
          if (parsedData.analysisData?.data) {
            const filtered = applyGlobalFilters(parsedData.analysisData.data);
            setGlobalFilteredData(filtered);
          }
          
          // Mostrar toast informativo sobre cache
          toast({
            title: "Dashboard carregado do cache",
            description: "Dados carregados rapidamente do cache local.",
          });
          
          return true;
        } else {
          console.log('🕒 Cache expirado, removendo...');
          clearDashboardCache();
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      clearDashboardCache();
      return false;
    }
  }, [clearDashboardCache, toast]);

  // Função para salvar dados no cache
  const saveToCache = useCallback((analysisData: AnalysisData, hotels: Hotel[]) => {
    try {
      const cacheData = {
        analysisData,
        hotels,
        timestamp: Date.now()
      };
      
      localStorage.setItem('admin-dashboard-cache', JSON.stringify(cacheData));
      localStorage.setItem('admin-dashboard-timestamp', Date.now().toString());
      console.log('💾 Dados salvos no cache');
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
      // Se falhar ao salvar, limpar cache corrompido
      clearDashboardCache();
    }
  }, [clearDashboardCache]);

  // Effect para carregar dados - com cache otimizado
  useEffect(() => {
    // Só carregar dados quando a autenticação estiver completa e o usuário for admin
    if (authLoading || !isAuthenticated || userData?.role !== 'admin') {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Primeiro, tentar carregar do cache
        const cacheLoaded = loadFromCache();
        
        if (!cacheLoaded) {
          // Se não há cache, buscar dados do Firebase
          await fetchData();
          // Notificar sucesso no carregamento
          toast({
            title: "Dashboard carregado",
            description: "Dados de todos os hotéis foram carregados com sucesso.",
          });
        } else {
          // Se carregou do cache, também definir isLoading como false
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro no carregamento",
          description: "Houve um problema ao carregar os dados. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    loadData();
  }, [authLoading, isAuthenticated, userData, loadFromCache, toast]); // Dependências otimizadas

  // Função para forçar recarregamento dos dados
  const forceReload = useCallback(async () => {
    clearDashboardCache();
    setIsLoading(true);
    try {
      await fetchData();
      toast({
        title: "Dashboard atualizado",
        description: "Dados recarregados com sucesso do servidor.",
      });
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
      toast({
        title: "Erro na atualização",
        description: "Houve um problema ao recarregar os dados.",
        variant: "destructive",
      });
    }
  }, [clearDashboardCache, toast]);

  // Listener para sincronização entre abas: invalida cache quando staff ocultar/excluir análises
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'admin-dashboard-cache-invalidated') {
        forceReload();
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if ((window as any).BroadcastChannel) {
        bc = new BroadcastChannel('admin-dashboard-sync');
        bc.onmessage = (evt: MessageEvent) => {
          const data = (evt && evt.data) || {};
          if (data.type === 'invalidate_admin_cache') {
            forceReload();
          }
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel não disponível:', err);
    }

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [forceReload]);

  // Calcular totais baseados nos dados filtrados
  const totalFeedbacks = globalFilteredData?.length || 0;
  const totalHotels = useMemo(() => {
    if (!globalFilteredData || globalFilteredData.length === 0) return 0;
    const hotelSet = new Set(globalFilteredData.map(f => f.hotel || f.hotelName || "Hotel não especificado"));
    return hotelSet.size;
  }, [globalFilteredData]);
  
  // Calcular métricas filtradas
  const filteredMetrics = useMemo(() => {
    if (!globalFilteredData || globalFilteredData.length === 0) {
      return {
        averageRating: 0,
        positiveSentiment: 0
      };
    }
    
    const totalRating = globalFilteredData.reduce((acc, f) => acc + (f.rating || 0), 0);
    const averageRating = totalRating / globalFilteredData.length;
    
    const positiveCount = globalFilteredData.filter(f => f.sentiment === 'positive').length;
    const positiveSentiment = Math.round((positiveCount / globalFilteredData.length) * 100);
    
    return {
      averageRating,
      positiveSentiment
    };
  }, [globalFilteredData]);
  
  // Função para formatar data (usando a função utilitária)
  const formatDate = (dateString: string) => {
    return formatDateBR(dateString);
  };

  // Renderização condicional - removida a segunda tela de carregamento
  // O carregamento agora é gerenciado apenas pelo HotelLoadingScreen no login

  // Mostrar estado de carregamento enquanto os dados estão sendo buscados ou autenticação está em andamento
  if (isLoading || authLoading) {
    return (
      <div className="p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-background rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Carregando Dashboard Administrativo</h2>
            <p className="text-muted-foreground">
              Buscando dados de todos os hotéis e processando análises...
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
              <span>Carregamento otimizado em andamento...</span>
            </div>
          </div>
        </div>
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
          <div className="flex items-center gap-4">
            {/* Logo da Empresa */}
            <div className="flex-shrink-0">
              <div className="relative h-16 w-16">
                <Image 
                  src="/adminLogo.png" 
                  alt="Logo Grupo Wish" 
                  fill
                  className="object-contain filter drop-shadow-lg"
                  priority
                  sizes="64px"
                />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold">Painel Administrativo</h2>
              <p className="text-muted-foreground">
                Visão geral consolidada de todos os hotéis do grupo
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            {/* Botão de Filtros Sutil */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  hasFiltersApplied()
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {hasFiltersApplied() && (
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

              <ChartDetailModal isOpen={detailPanelOpen} selectedItem={selectedItem} onOpenChange={setDetailPanelOpen} />

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
                          {Array.from(new Set((getCurrentData() || []).map(f => f.source).filter(Boolean))).map(source => (
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
                          {Array.from(new Set((getCurrentData() || []).map(f => f.language).filter(Boolean))).map(language => (
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
                          {Array.from(new Set((getCurrentData() || []).map(f => f.apartamento).filter(Boolean))).map(apartamento => (
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
                              {globalFilteredData.length} de {(getCurrentData() || []).length} feedbacks identificados
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(((getCurrentData() || []).length > 0 ? (globalFilteredData.length / (getCurrentData() || []).length) * 100 : 0))}%` }}
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
              onClick={forceReload}
              disabled={isLoading}
              title="Força o recarregamento dos dados, limpando o cache"
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
              onValueChange={applyHotelFilter}
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
                {(!filteredMetrics.averageRating || isNaN(filteredMetrics.averageRating)) 
                  ? "0.0" 
                  : filteredMetrics.averageRating.toFixed(1)}
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
                {(!filteredMetrics.positiveSentiment || isNaN(filteredMetrics.positiveSentiment)) 
                  ? "0" 
                  : filteredMetrics.positiveSentiment}%
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
            <TabsTrigger value="compliments">Elogios</TabsTrigger>
            <TabsTrigger value="ratings">Avaliações</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
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
                      processRatingDistribution(),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[430px]">
                  <RatingsChart 
                    key={`ratings-chart-${Date.now()}`}
                    data={processRatingDistribution()}
                    onClick={(item) => handleChartClick(item, 'rating')}
                  />
                </div>
              </Card>

              {/* Distribuição de Problemas */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Principais Problemas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDetailOverview('Principais Problemas')}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[430px]">
                  <ProblemsChart 
                    key={`problems-chart-${Date.now()}`}
                    data={processProblemDistribution()}
                    onClick={(item) => handleChartClick(item, 'problem')}
                    maxItems={6}
                    contextRows={getCurrentData()}
                  />
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
                      processKeywordDistribution().slice(0, 15),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[450px]">
                  <KeywordsChart 
                    key={`keywords-chart-${Date.now()}`}
                    data={processKeywordDistribution()}
                    onClick={(item) => handleChartClick(item, 'keyword')}
                    maxItems={8}
                  />
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
                      processSectorDistribution(),
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <DepartmentsChart 
                    key={`departments-chart-${Date.now()}`}
                    data={processSectorDistribution()}
                    onClick={(item) => handleChartClick(item, 'sector')}
                  />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Análise de Apartamentos */}
              <Card className="p-4">
                                <h3 className="text-lg font-semibold mb-4">Análise de Apartamentos</h3>
                <div className="h-[430px]">
                  <ApartmentsChart 
                    key={`apartments-chart-${Date.now()}`}
                    data={processApartamentoDistribution().map(item => ({
                      label: item.name,
                      value: item.value,
                      name: item.name
                    }))}
                    onClick={(item) => handleChartClick(item, 'apartamento')}
                    maxItems={8}
                  />
                </div>
                              </Card>

              {/* Distribuição por Fonte */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Distribuição por Fonte</h3>
                <div className="h-[480px]">
                  <SourcesChart 
                    key={`sources-chart-${Date.now()}`}
                    data={processSourceDistribution()}
                    onClick={(item) => handleChartClick(item, 'source')}
                  />
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
              <div className="h-[480px]">
                <HotelsChart 
                  key={`hotels-chart-${Date.now()}`}
                  data={hotelStats.map(stat => ({
                    label: stat.hotel,
                    value: stat.totalFeedbacks,
                    rating: parseFloat(stat.averageRating),
                    sentiment: stat.sentiment
                  }))}
                  onClick={(item: any) => handleChartClick({label: item.label}, 'hotel')}
                />
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
            <AdminProblemsVisualizationOptions 
              filteredData={getCurrentData()} 
              setSelectedItem={setSelectedItem} 
              setChartDetailOpen={setDetailPanelOpen}
            />
        {/* Seção movida: Detalhamento de Problemas aparecerá ao final da aba */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição de Problemas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'problem',
                      'Distribuição de Problemas',
                      processProblemDistribution().slice(0, 10),
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <ProblemsDistributionChart 
                    data={processProblemDistribution().slice(0, 10)}
                    onClick={(item: any) => handleChartClick(item, 'problem')}
                  />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Departamentos com Mais Problemas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'sector',
                      'Departamentos com Mais Problemas',
                      processDepartmentProblemsDistribution(),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <DepartmentsChart 
                    data={processDepartmentProblemsDistribution()}
                    onClick={(item: any) => handleChartClick(item, 'sector')}
                  />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Tendência de Problemas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'problem',
                      'Tendência de Problemas ao Longo do Tempo',
                      processProblemDistribution().slice(0, 8),
                      'line'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <ProblemsTrendChart 
                    data={processProblemDistribution().slice(0, 8)}
                    onClick={(item: any) => handleChartClick(item, 'problem')}
                  />
                </div>
              </Card>
            </div>

        {/* Detalhamento de Problemas — seção final */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold">Detalhamento de Problemas</h3>
          </div>
          <div className="w-full">
            <DetailProblem rows={getCurrentData()} maxProblems={24} maxDetails={12} />
          </div>
        </Card>
          </TabsContent>

          {/* Elogios */}
          <TabsContent value="compliments" className="space-y-4">
            {complimentFeedbacks.length === 0 ? (
              <Card className="p-8 text-center border-2 border-dashed">
                <h3 className="text-xl font-semibold mb-2">Nenhum elogio identificado</h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros ou amplie o período para visualizar os elogios mapeados pela IA.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Panorama de Elogios</h3>
                    <p className="text-muted-foreground">
                      Indicadores automáticos com base nos feedbacks positivos das redes monitoradas.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleChartClick({ label: 'Elogios', name: 'Elogios' }, 'complimentOverview')}
                  >
                    Ver todos os elogios
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Feedbacks com elogios</h4>
                    <div className="text-3xl font-bold mt-2">{complimentsSummary.totalFeedbacks}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {complimentsSummary.share.toFixed(1)}% dos feedbacks atuais
                    </p>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Elogios mapeados</h4>
                    <div className="text-3xl font-bold mt-2">{complimentsSummary.totalPhrases}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {complimentsSummary.uniquePhrases} tipos únicos destacados
                    </p>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Hotel mais elogiado</h4>
                    <div className="text-2xl font-bold mt-2">{complimentsSummary.highlightHotel}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {complimentsByHotel[0]?.value || 0} citações positivas
                    </p>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Departamento mais elogiado</h4>
                    <div className="text-2xl font-bold mt-2">{complimentsSummary.highlightSector}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {complimentsBySector[0]?.value || 0} elogios registrados
                    </p>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Avaliação média (elogios)</h4>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-bold text-yellow-600">
                        {complimentsSummary.averageRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 5</span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${complimentsSummary.averageRating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Principais elogios</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChart(
                          'compliment',
                          'Principais elogios',
                          complimentsByPhrase,
                          'horizontalBar',
                          { chartLimit: 30 }
                        )}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    <div className="h-[430px]">
                      <ModernChart
                        type="horizontalBar"
                        data={complimentsByPhrase.slice(0, 12)}
                        onClick={(item: any) => handleChartClick(item, 'compliment')}
                      />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Departamentos mais elogiados</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChart('complimentSector', 'Departamentos mais elogiados', complimentsBySector, 'bar')}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    <div className="h-[430px]">
                      <DepartmentsChart
                        data={complimentsBySector.slice(0, 12)}
                        onClick={(item: any) => handleChartClick(item, 'complimentSector')}
                      />
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Palavras-chave elogiadas</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChart('complimentKeyword', 'Palavras-chave elogiadas', complimentsByKeyword, 'bar')}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    <div className="h-[430px]">
                      <KeywordsChart
                        data={complimentsByKeyword.slice(0, 12)}
                        onClick={(item: any) => handleChartClick(item, 'complimentKeyword')}
                      />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Hotéis com mais elogios</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChart('complimentHotel', 'Hotéis com mais elogios', complimentsByHotel, 'bar')}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    <div className="h-[430px]">
                      <ModernChart
                        type="horizontalBar"
                        data={complimentsByHotel.slice(0, 12)}
                        onClick={(item: any) => handleChartClick(item, 'complimentHotel')}
                      />
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Fontes com mais elogios</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChart('complimentSource', 'Fontes com mais elogios', complimentsBySource, 'pie')}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    <div className="h-[430px]">
                      <ModernChart
                        type="pie"
                        data={complimentsBySource}
                        onClick={(item: any) => handleChartClick(item, 'complimentSource')}
                      />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Avaliações dos elogios</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChart('complimentRating', 'Avaliações dos elogios', complimentsRatingDistribution, 'bar')}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                    <div className="h-[430px]">
                      <RatingsChart
                        data={complimentsRatingDistribution}
                        onClick={(item: any) => handleChartClick(item, 'complimentRating')}
                      />
                    </div>
                  </Card>
                </div>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Evolução dos elogios</h3>
                  <div className="h-[420px]">
                    <ModernChart type="line" data={complimentsTrend.data} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Agrupamento automático: {complimentsTrend.period === 'day' ? 'por dia' : complimentsTrend.period === 'week' ? 'por semana' : 'por mês'}
                  </p>
                </Card>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Elogios recentes</h3>
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    {recentCompliments.map((feedback: any, index: number) => {
                      const compliments = extractComplimentsFromFeedback(feedback);
                      return (
                        <div
                          key={`${feedback.id || feedback.date}-${index}`}
                          className="p-4 border rounded-lg hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${feedback.rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                                  />
                                ))}
                              </div>
                              <Badge variant="outline" className="px-2 py-0.5 text-xs">
                                {feedback.rating}/5
                              </Badge>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <div>{formatDateBR(feedback.date)}</div>
                              {feedback.hotel && <div>{feedback.hotel}</div>}
                              {feedback.source && <div>{cleanDataWithSeparator(feedback.source)}</div>}
                            </div>
                          </div>

                          {compliments.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {compliments.map((compliment: string, complimentIndex: number) => (
                                <p key={complimentIndex} className="text-sm font-medium">
                                  • {compliment}
                                </p>
                              ))}
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                            {feedback.comment}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {feedback.keyword && (
                              <Badge variant="outline">{cleanDataWithSeparator(feedback.keyword)}</Badge>
                            )}
                            {feedback.sector && (
                              <Badge variant="outline">{cleanDataWithSeparator(feedback.sector)}</Badge>
                            )}
                            {feedback.apartamento && (
                              <Badge variant="outline">Apto {cleanDataWithSeparator(String(feedback.apartamento))}</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
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
                      processRatingDistribution(),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[430px]">
                  <RatingsChart 
                    data={processRatingDistribution()}
                    onClick={(item) => handleChartClick(item, 'rating')}
                  />
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
                <div className="h-[480px]">
                  <ModernChart 
                    data={[
                      { label: 'Positivo', value: (getCurrentData() || []).filter(f => f.sentiment === 'positive').length, name: 'Positivo' },
                      { label: 'Negativo', value: (getCurrentData() || []).filter(f => f.sentiment === 'negative').length, name: 'Negativo' },
                      { label: 'Neutro', value: (getCurrentData() || []).filter(f => f.sentiment === 'neutral').length, name: 'Neutro' }
                    ]}
                    type="pie"
                    onClick={(item) => handleChartClick(item, 'sentiment')}
                  />
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Volume de Feedbacks por Fonte</h3>
              <div className="h-[480px]">
                <SourcesChart 
                  data={processSourceDistribution()}
                  onClick={(item: any) => handleChartClick(item, 'source')}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground mt-2">
                Agrupamento automático: {(() => {
                  const { period } = getTimePeriodData(getCurrentData() || [], 'source');
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

          {/* Departamentos */}
          <TabsContent value="departments" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Departamentos com Mais Problemas */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ranking de Problemas por Departamento</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'sector',
                      'Ranking de Problemas por Departamento',
                      processDepartmentProblemsDistribution(),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <DepartmentsChart 
                    data={processDepartmentProblemsDistribution()}
                    onClick={(item: any) => handleChartClick(item, 'sector')}
                  />
                </div>
              </Card>

              {/* Distribuição de Feedbacks por Departamento */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição de Feedbacks por Departamento</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'sector',
                      'Distribuição de Feedbacks por Departamento',
                      processSectorDistribution(),
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <ModernChart 
                    data={processSectorDistribution().map(item => ({ ...item, name: item.label }))}
                    type="pie"
                    onClick={(item: any) => handleChartClick(item, 'sector')}
                  />
                </div>
              </Card>
            </div>

            {/* Tabela detalhada de departamentos */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Análise Detalhada por Departamento</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 bg-muted border-b text-left">Departamento</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Total de Problemas</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Total de Feedbacks</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">% Problemas/Feedbacks</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Principais Problemas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processDepartmentProblemsDistribution()
                      .slice(0, 15)
                      .map((dept: any, index: number) => {
                        const dataToUse = getCurrentData();
                        const totalFeedbacks = processSectorDistribution().find(s => s.label === dept.label)?.value || 0;

                        // Percentual de feedbacks COM pelo menos um problema (capado em 100%)
                        const departmentFeedbacks = (dataToUse || []).filter((item: any) => {
                          if (item.sector && typeof item.sector === 'string') {
                            const sectors = item.sector.split(';').map((s: string) => s.trim());
                            const normalizedSectors = sectors.map((s: string) => normalizeDepartmentName(s));
                            return normalizedSectors.includes(dept.label);
                          }
                          return false;
                        });

                        const feedbacksWithProblemsCount = departmentFeedbacks.filter((item: any) => {
                          if (item.problem && typeof item.problem === 'string') {
                            const problems = Array.from<string>(
                              new Set<string>(
                                item.problem.split(';').map((p: string) => p.trim())
                              )
                            );
                            return problems.some((p) => isValidProblem(p) && p.toLowerCase() !== 'vazio' && !p.startsWith('+'));
                          }
                          return false;
                        }).length;

                        const problemPercentage = totalFeedbacks > 0
                          ? Math.min(100, ((feedbacksWithProblemsCount / totalFeedbacks) * 100)).toFixed(1)
                          : '0';
                        
                        // Buscar principais problemas deste departamento
                        const departmentProblems = departmentFeedbacks
                          .flatMap((item: any) => {
                            if (item.problem && typeof item.problem === 'string') {
                              return (item.problem
                                .split(';')
                                .map((p: string) => p.trim()) as string[])
                                .filter((p: string) => p && isValidProblem(p) && p.toLowerCase() !== 'vazio' && !p.startsWith('+'));
                            }
                            return [];
                          })
                          .reduce((acc: Record<string, number>, problem: string) => {
                            acc[problem] = (acc[problem] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                        
                        const topProblems = Object.entries(departmentProblems)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .slice(0, 3)
                          .map(([problem, count]) => `${problem} (${count})`);
                        
                        return (
                          <tr key={dept.label} className="hover:bg-muted/50">
                            <td className="py-2 px-4 border-b font-medium">{dept.label}</td>
                            <td className="py-2 px-4 border-b text-center">
                              <Badge variant="destructive">{dept.value}</Badge>
                            </td>
                            <td className="py-2 px-4 border-b text-center">{totalFeedbacks}</td>
                            <td className="py-2 px-4 border-b text-center">{problemPercentage}%</td>
                            <td className="py-2 px-4 border-b text-sm">
                              {topProblems.length > 0 ? topProblems.join(', ') : 'Nenhum problema identificado'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Palavras-chave */}
          <TabsContent value="keywords" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Palavras-chave Mais Frequentes */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Palavras-chave Mais Frequentes</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'keyword',
                      'Palavras-chave Mais Frequentes',
                      processKeywordDistribution(),
                      'bar'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <KeywordsChart 
                    data={processKeywordDistribution()}
                    onClick={(item: any) => handleChartClick(item, 'keyword')}
                  />
                </div>
              </Card>

              {/* Nuvem de Palavras-chave */}
              <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Distribuição de Palavras-chave</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewChart(
                      'keyword',
                      'Distribuição de Palavras-chave',
                      processKeywordDistribution().slice(0, 10),
                      'pie'
                    )}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <div className="h-[480px]">
                  <ModernChart 
                    data={processKeywordDistribution().slice(0, 10).map(item => ({ ...item, name: item.label }))}
                    type="pie"
                    onClick={(item: any) => handleChartClick(item, 'keyword')}
                  />
                </div>
              </Card>
            </div>

            {/* Tabela de palavras-chave */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Lista de Palavras-chave</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 bg-muted border-b text-left">Palavra-chave</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Frequência</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">% do Total</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Departamentos Principais</th>
                      <th className="py-2 px-4 bg-muted border-b text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processKeywordDistribution()
                      .slice(0, 20)
                      .map((keyword: any, index: number) => {
                        const dataToUse = getCurrentData();
                        const totalKeywords = processKeywordDistribution().reduce((sum, k) => sum + k.value, 0);
                        const percentage = totalKeywords > 0 ? ((keyword.value / totalKeywords) * 100).toFixed(1) : '0';
                        
                        // Buscar departamentos relacionados a esta palavra-chave
                        const keywordDepartments = (dataToUse || [])
                          .filter((item: any) => {
                            if (item.keyword && typeof item.keyword === 'string') {
                              return item.keyword.split(';').map((k: string) => k.trim()).includes(keyword.label);
                            }
                            return false;
                          })
                          .flatMap((item: any) => {
                            if (item.sector && typeof item.sector === 'string') {
                              return item.sector.split(';').map((s: string) => s.trim()).filter((s: string) => s && s !== 'VAZIO');
                            }
                            return [];
                          })
                          .reduce((acc: Record<string, number>, sector: string) => {
                            acc[sector] = (acc[sector] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                        
                        const topDepartments = Object.entries(keywordDepartments)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .slice(0, 2)
                          .map(([dept, count]) => `${dept} (${count})`);
                        
                        return (
                          <tr key={keyword.label} className="hover:bg-muted/50">
                            <td className="py-2 px-4 border-b font-medium">{keyword.label}</td>
                            <td className="py-2 px-4 border-b text-center">
                              <Badge variant="secondary">{keyword.value}</Badge>
                            </td>
                            <td className="py-2 px-4 border-b text-center">{percentage}%</td>
                            <td className="py-2 px-4 border-b text-sm">
                              {topDepartments.length > 0 ? topDepartments.join(', ') : 'Nenhum departamento identificado'}
                            </td>
                            <td className="py-2 px-4 border-b text-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleChartClick(keyword, 'keyword')}
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
          </TabsContent>

          {/* Apartamentos */}
          <TabsContent value="apartamentos" className="space-y-4">
            {/* Único card grande agrupando por hotel */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="p-4">
                <CardHeader>
                  <CardTitle>Hotéis e Apartamentos</CardTitle>
                  <CardDescription>
                    Agrupado por Hotel — apartamentos com mais problemas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {processHotelsWithApartmentsProblemsGrouped().map(group => (
                      <div key={group.hotel} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Hotel className="h-4 w-4 text-purple-500" />
                            <span className="font-semibold">{group.hotel}</span>
                          </div>
                          <Badge variant="outline">{group.total} problemas</Badge>
                        </div>
                        <div className="h-[280px]">
                          <ModernChart 
                            type="horizontalBar"
                            categoryType="apartment"
                            data={group.apartamentos}
                            contextRows={processApartamentoDetailsData()}
                            onClick={(item: any) => {
                              const aptLabel = String(item?.label || '').replace(/^Apt\s+/i, '');
                              handleChartClick({ label: `${group.hotel} - Apt ${aptLabel}` }, 'apartamento');
                            }}
                          />
                        </div>
                      </div>
                    ))}
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
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 text-blue-500 mr-2" />
                              <span className="font-semibold text-lg">{ap.apartamento}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 border-b text-center text-sm">
                            <Badge variant="outline" className="font-medium">
                              {ap.mainHotel}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 border-b text-center">
                            <div className="flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                              <span className="font-bold text-lg">{ap.count.toLocaleString()}</span>
                            </div>
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
                              <Badge 
                                className={
                                  ap.sentiment >= 70 ? "bg-green-500 text-white hover:bg-green-600" : 
                                  ap.sentiment >= 50 ? "bg-yellow-500 text-white hover:bg-yellow-600" : 
                                  "bg-red-500 text-white hover:bg-red-600"
                                }
                              >
                                {ap.sentiment.toFixed(1)}%
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

      {/* Painel Lateral Interativo Moderno */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[42rem] bg-background border-l border-border shadow-2xl transform transition-all duration-500 ease-in-out ${
        'translate-x-full'
      }`}>
        {selectedItem && (
          <div className="h-full flex flex-col">
            {/* Cabeçalho Moderno */}
            <div className="relative p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        {['hotel', 'complimentHotel'].includes(selectedItem.type) && <Building2 className="h-5 w-5" />}
                        {selectedItem.type === 'problem' && <AlertCircle className="h-5 w-5" />}
                        {['rating', 'compliment', 'complimentRating', 'complimentOverview'].includes(selectedItem.type) && <Star className="h-5 w-5" />}
                        {['keyword', 'complimentKeyword'].includes(selectedItem.type) && <Tag className="h-5 w-5" />}
                        {['source', 'complimentSource'].includes(selectedItem.type) && <Globe className="h-5 w-5" />}
                        {!['hotel', 'complimentHotel', 'problem', 'rating', 'compliment', 'complimentRating', 'complimentOverview', 'keyword', 'complimentKeyword', 'source', 'complimentSource'].includes(selectedItem.type) && <BarChart3 className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {selectedItem.type === 'hotel' ? 'Hotel' :
                           selectedItem.type === 'complimentHotel' ? 'Hotel elogiado' :
                           selectedItem.type === 'keyword' ? 'Palavra-chave' : 
                           selectedItem.type === 'complimentKeyword' ? 'Palavra-chave elogiada' :
                           selectedItem.type === 'problem' ? 'Problema' :
                           selectedItem.type === 'sector' ? 'Departamento' :
                           selectedItem.type === 'complimentSector' ? 'Departamento elogiado' :
                           selectedItem.type === 'source' ? 'Fonte' :
                           selectedItem.type === 'complimentSource' ? 'Fonte dos elogios' :
                           selectedItem.type === 'language' ? 'Idioma' :
                           selectedItem.type === 'rating' ? 'Avaliação' :
                           selectedItem.type === 'complimentRating' ? 'Avaliação (elogios)' :
                           selectedItem.type === 'compliment' ? 'Elogio' :
                           selectedItem.type === 'complimentOverview' ? 'Elogios' :
                           selectedItem.type}
                        </h3>
                        <p className="text-sm text-blue-100 opacity-90">{selectedItem.value}</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDetailPanelOpen(false)}
                    className="text-white hover:bg-white/20 h-10 w-10 rounded-full p-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Métricas Destacadas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedItem.stats.totalOccurrences}</div>
                    <div className="text-xs text-blue-100 opacity-75">Ocorrências</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedItem.stats.percentage}%</div>
                    <div className="text-xs text-blue-100 opacity-75">do Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedItem.stats.averageRating.toFixed(1)}</div>
                    <div className="text-xs text-blue-100 opacity-75">Avaliação Média</div>
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
                    <ModernChart 
                      data={[
                        { label: 'Positivo', value: selectedItem.stats.sentimentDistribution?.positive ?? 0 },
                        { label: 'Neutro', value: selectedItem.stats.sentimentDistribution?.neutral ?? 0 },
                        { label: 'Negativo', value: selectedItem.stats.sentimentDistribution?.negative ?? 0 }
                      ].filter(item => item.value > 0)}
                      onClick={() => {}}
                      type="pie"
                    />
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
                    <RatingsChart 
                      data={[
                        { label: '1⭐', value: selectedItem.stats.ratingDistribution?.[1] ?? 0 },
                        { label: '2⭐', value: selectedItem.stats.ratingDistribution?.[2] ?? 0 },
                        { label: '3⭐', value: selectedItem.stats.ratingDistribution?.[3] ?? 0 },
                        { label: '4⭐', value: selectedItem.stats.ratingDistribution?.[4] ?? 0 },
                        { label: '5⭐', value: selectedItem.stats.ratingDistribution?.[5] ?? 0 }
                      ]}
                      onClick={() => {}}
                    />
                  </div>
                </Card>

                {/* Tendência Mensal */}
                {selectedItem.stats.monthlyTrend?.length > 1 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Tendência Mensal
                    </h4>
                    <div className="h-40">
                      <ModernChart 
                        data={selectedItem.stats.monthlyTrend.map((item: any) => ({ label: item.month, value: item.count }))}
                        onClick={() => {}}
                        type="line"
                      />
                    </div>
                  </Card>
                )}

                {/* Hotéis Afetados */}
                {selectedItem.stats.topHotels?.length > 0 && (
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
                {selectedItem.stats.topKeywords?.length > 0 && (
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

                {/* Elogios Relacionados */}
                {selectedItem.stats.topCompliments?.length > 0 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-3">
                        <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Principais Elogios Relacionados
                    </h4>
                    <div className="space-y-3">
                      {selectedItem.stats.topCompliments.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <span className="font-medium">{cleanDataWithSeparator(item.label ?? item.compliment)}</span>
                          <Badge variant="outline" className="px-3 py-1">{item.value ?? item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Problemas Relacionados */}
                {selectedItem.stats.topProblems?.length > 0 && (
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
      {false && (
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
                <div
                  className="bg-muted/10 rounded-lg p-4"
                  style={{ height: selectedChart.chartHeight ?? 500 }}
                >
                  <div className="w-full h-full">
                    {renderModernChart(
                      selectedChart.chartType,
                      selectedChart.chartData,
                      handleChartClick,
                      selectedChart.type,
                      selectedChart.chartHeight ?? 500
                    )}
                  </div>
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
                             selectedChart.type === 'sentiment' ? 'Sentimento' :
                             selectedChart.type === 'compliment' ? 'Elogio' :
                             selectedChart.type === 'complimentSector' ? 'Departamento' :
                             selectedChart.type === 'complimentKeyword' ? 'Palavra-chave' :
                             selectedChart.type === 'complimentSource' ? 'Fonte' :
                             selectedChart.type === 'complimentRating' ? 'Avaliação' :
                             selectedChart.type === 'complimentHotel' ? 'Hotel' :
                             'Item'}
                          </th>
                          <th className="py-3 px-4 bg-muted border-b text-center font-semibold">Quantidade</th>
                          <th className="py-3 px-4 bg-muted border-b text-center font-semibold">Percentual</th>
                          <th className="py-3 px-4 bg-muted border-b text-center font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const tableData = selectedChart.tableData || [];
                          const total = tableData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
                          return tableData.map((item: any, index: number) => {
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
                          });
                        })()}
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