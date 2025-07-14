"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAllAnalyses } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RequireAuth } from "@/lib/auth-context";
import SharedDashboardLayout from "../shared-layout";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, LabelList,
  Sector, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "@/types";
import { 
  Star, 
  Filter, 
  MessageSquare, 
  ExternalLink, 
  X, 
  Building2, 
  AlertCircle, 
  Tag, 
  Globe, 
  BarChart3 
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";

// Definir a interface AnalysisData
interface AnalysisData {
  id: string;
  hotelId: string;
  hotelName: string;
  importDate: any;
  data: any[];
  analysis: any;
}

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Interface para os dados de detalhamento
interface DetailData {
  title: string;
  data: any[];
  type: 'rating' | 'problem' | 'source' | 'language' | 'sentiment';
}

// Interface para o item selecionado
interface SelectedItem {
  type: 'hotel' | 'sector' | 'problem' | 'source' | 'keyword' | 'rating' | 'language' | 'sentiment' | 'all';
  value: string | number;
  data?: any;
}

// Interface para as props do CustomTooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: any;
    color: string;
    [key: string]: any;
  }>;
  label?: string;
  [key: string]: any;
}

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

function DashboardContent() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailData | null>(null);
  
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
  
  // Estados para filtros globais
  const [dateRange, setDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null,
  });
  
  // Filtros de estrelas (array com as estrelas a serem ocultadas)
  const [hiddenRatings, setHiddenRatings] = useState<number[]>([]);
  
  // Outros filtros
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [apartmentFilter, setApartmentFilter] = useState<string>('all');
  
  // Estado dos dados filtrados
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  // Estado para controlar a abertura do painel de filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Controlar scroll quando modal de filtros está aberto
  useEffect(() => {
    if (filtersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [filtersOpen]);
  
  const router = useRouter();

  // Adicionar a função handleViewHistory
  const handleViewHistory = () => {
    router.push('/history');
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
  
  // Função para aplicar filtros globais
  const applyFilters = useCallback((data: any[]) => {
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
  
  // Atualizar dados filtrados quando os filtros ou dados originais mudarem
  useEffect(() => {
    if (analysisData?.data) {
      const filtered = applyFilters(analysisData.data);
      setFilteredData(filtered);
    }
  }, [analysisData?.data, applyFilters]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (userData?.hotelId) {
          // Buscar análises específicas para o hotel do usuário
          const analyses = await getAllAnalyses(userData.hotelId);
          
          if (analyses && analyses.length > 0) {
            // Filtrar análises que têm todos os campos necessários
            const validAnalyses = analyses.filter((a: any) => 
              a && typeof a === 'object' && 
              'id' in a && 
              'hotelId' in a && 
              'hotelName' in a && 
              'importDate' in a && 
              'data' in a && 
              'analysis' in a
            );

            if (validAnalyses.length > 0) {
              // Usar a análise mais recente como base
              let combinedAnalysis = { ...validAnalyses[0] } as AnalysisData;
              
              // Coletar todos os dados de feedback de todas as análises
              let allFeedbacks: any[] = [];
              
              validAnalyses.forEach((analysis: any) => {
                if (analysis.data && Array.isArray(analysis.data)) {
                  // Adicionar logs para depuração
                  console.log(`Análise ${analysis.id} - hotelId: ${analysis.hotelId}, hotelName: ${analysis.hotelName}`);
                  console.log(`userData.hotelId: ${userData.hotelId}, userData.hotelName: ${userData.hotelName}`);
                  
                  // Como as análises já foram filtradas por hotelId na consulta do Firestore,
                  // podemos incluir todos os feedbacks desta análise
                  allFeedbacks = [...allFeedbacks, ...analysis.data];
                  
                  // Log do número de feedbacks adicionados
                  console.log(`Adicionados ${analysis.data.length} feedbacks da análise ${analysis.id}`);
                }
              });
              
              // Se temos feedbacks para mostrar
              if (allFeedbacks.length > 0) {
                // Atualizar a análise com os dados filtrados para o hotel específico
                combinedAnalysis.data = allFeedbacks;
                
                // Recalcular as estatísticas com base apenas nos feedbacks do hotel
                combinedAnalysis.analysis = {
                  ...combinedAnalysis.analysis,
                  totalFeedbacks: allFeedbacks.length,
                  averageRating: allFeedbacks.reduce((acc, item) => acc + (item.rating || 0), 0) / allFeedbacks.length,
                  positiveSentiment: Math.round((allFeedbacks.filter(item => item.sentiment === 'positive').length / allFeedbacks.length) * 100),
                  
                  // Distribuições recalculadas apenas para o hotel do usuário
                  hotelDistribution: processHotelDistribution(allFeedbacks),
                  sourceDistribution: processSourceDistribution(allFeedbacks),
                  languageDistribution: processLanguageDistribution(allFeedbacks),
                  ratingDistribution: processRatingDistribution(allFeedbacks),
                  problemDistribution: processProblemDistribution(allFeedbacks),
                  keywordDistribution: processKeywordDistribution(allFeedbacks),
                  // Usar os feedbacks filtrados como feedbacks recentes
                  recentFeedbacks: allFeedbacks.sort((a: any, b: any) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  ).slice(0, 10)
                };
                
                setAnalysisData(combinedAnalysis);
                setSelectedHotel(userData.hotelName);
              } else {
                setAnalysisData(null);
              }
            } else {
              setAnalysisData(null);
            }
          } else {
            setAnalysisData(null);
          }
        } else {
          setAnalysisData(null);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setAnalysisData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userData?.hotelId]);

  // Função para processar os dados de fonte e idioma
  const processSourceData = (data: any[]) => {
    return data.map(item => ({
      name: item.label,
      value: item.value
    }));
  };

  // Função para processar os dados de idioma
  const processLanguageData = (data: any[]) => {
    return data.map(item => ({
      name: item.label,
      value: item.value
    }));
  };

  // Função para filtrar feedbacks por critério
  const filterFeedbacksByCriteria = (type: string, value: string) => {
    // Usar os dados filtrados ao invés dos dados originais
    const baseData = filteredData || [];

    return baseData.filter((feedback: any) => {
      switch (type) {
        case 'rating':
          return String(feedback.rating) === String(value);
        case 'problem':
          if (!feedback.problem) return false;
          return feedback.problem
            .split(';')
            .map((p: string) => p.trim().toLowerCase())
            .includes(value.trim().toLowerCase());
        case 'source':
          return (feedback.source || '').trim().toLowerCase() === value.trim().toLowerCase();
        case 'language':
          return (feedback.language || '').trim().toLowerCase() === value.trim().toLowerCase();
        case 'sentiment':
          // Mapear os nomes para os valores reais de sentimento
          const sentimentMap: { [key: string]: string } = {
            'Positivo': 'positive',
            'Negativo': 'negative', 
            'Neutro': 'neutral'
          };
          const targetSentiment = sentimentMap[value] || value.toLowerCase();
          return (feedback.sentiment || '').trim().toLowerCase() === targetSentiment;
        case 'apartamento':
          return String(feedback.apartamento) === value.replace('Apto ', '');
        case 'keyword':
          if (!feedback.keyword) return false;
          return feedback.keyword
            .split(';')
            .map((k: string) => k.trim().toLowerCase())
            .includes(value.trim().toLowerCase());
        case 'sector':
          if (feedback.sector && typeof feedback.sector === 'string') {
            return feedback.sector.trim().toLowerCase() === value.trim().toLowerCase();
          }
          if (feedback.department && typeof feedback.department === 'string') {
            return feedback.department.trim().toLowerCase() === value.trim().toLowerCase();
          }
          return false;
        default:
          return false;
      }
    });
  };

  const handleViewAllComments = () => {
    if (selectedItem) {
      setAllCommentsData(selectedItem.feedbacks);
      setAllCommentsModalOpen(true);
    }
  };

  // Função para lidar com cliques nos gráficos
  const handleChartClick = (data: any, type: string) => {
    console.log("Clique no gráfico:", data, type);
    
    const value = data.name || data.label;
    let filteredFeedbacks: any[] = [];

    // Implementação específica para cada tipo, igual ao admin
    switch (type) {
      case 'rating':
        const ratingLabel = data.label || data.name;
        console.log("Filtrando por rating, label original:", ratingLabel);
        // Extrair o número do label "X estrela(s)"
        const rating = parseInt(ratingLabel.split(' ')[0]);
        console.log("Rating extraído:", rating);
        filteredFeedbacks = filteredData.filter((feedback: any) => {
          const feedbackRating = Math.floor(feedback.rating);
          console.log(`Comparando feedback rating ${feedbackRating} com ${rating}`);
          return feedbackRating === rating;
        });
        break;

      case 'problem':
        const problemLabel = data.label || data.name;
        console.log("Filtrando por problema:", problemLabel);
        filteredFeedbacks = filteredData.filter((feedback: any) => {
          if (feedback.problems && Array.isArray(feedback.problems)) {
            return feedback.problems.includes(problemLabel);
          }
          if (feedback.problem && typeof feedback.problem === 'string') {
            return feedback.problem.split(';').map((p: string) => p.trim()).includes(problemLabel);
          }
          return false;
        });
        break;

      case 'source':
        const sourceLabel = data.label || data.name;
        console.log("Filtrando por fonte:", sourceLabel);
        filteredFeedbacks = filteredData.filter((feedback: any) => 
          feedback.source === sourceLabel
        );
        break;

      case 'language':
        const languageLabel = data.label || data.name;
        console.log("Filtrando por idioma:", languageLabel);
        filteredFeedbacks = filteredData.filter((feedback: any) => 
          feedback.language === languageLabel
        );
        break;

      case 'keyword':
        const keywordLabel = data.label || data.name;
        console.log("Filtrando por palavra-chave:", keywordLabel);
        filteredFeedbacks = filteredData.filter((feedback: any) => {
          if (feedback.keyword && typeof feedback.keyword === 'string') {
            return feedback.keyword.split(';').map((k: string) => k.trim()).includes(keywordLabel);
          }
          return false;
        });
        break;

      case 'sector':
        const sectorLabel = data.label || data.name;
        console.log("Filtrando por setor:", sectorLabel);
        filteredFeedbacks = filteredData.filter((feedback: any) => {
          if (feedback.sector && typeof feedback.sector === 'string') {
            return feedback.sector === sectorLabel;
          }
          if (feedback.department && typeof feedback.department === 'string') {
            return feedback.department === sectorLabel;
          }
          return false;
        });
        break;

      case 'sentiment':
        const sentimentLabel = data.label || data.name;
        console.log("Filtrando por sentimento:", sentimentLabel);
        // Mapear os nomes para os valores reais de sentimento
        const sentimentMap: { [key: string]: string } = {
          'Positivo': 'positive',
          'Negativo': 'negative', 
          'Neutro': 'neutral'
        };
        const targetSentiment = sentimentMap[sentimentLabel] || sentimentLabel.toLowerCase();
        filteredFeedbacks = filteredData.filter((feedback: any) => 
          feedback.sentiment === targetSentiment
        );
        break;

      default:
        console.log("Tipo de clique não reconhecido:", type);
        return;
    }

    console.log(`Encontrados ${filteredFeedbacks.length} feedbacks para ${type}:`, data);

    if (filteredFeedbacks.length === 0) {
      console.log("Nenhum feedback encontrado, dados disponíveis:", filteredData.slice(0, 3));
      return;
    }
    
    const getTitle = (type: string, value: string) => {
      switch (type) {
        case 'rating': return `Avaliação: ${value}`;
        case 'problem': return `Problema: ${value}`;
        case 'source': return `Fonte: ${value}`;
        case 'language': return `Idioma: ${value}`;
        case 'sentiment': return `Sentimento: ${value}`;
        case 'keyword': return `Palavra-chave: ${value}`;
        case 'sector': return `Departamento: ${value}`;
        default: return `${type}: ${value}`;
      }
    };

    // Calcular estatísticas específicas do item baseado nos dados filtrados
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
      percentage: filteredData.length > 0 ? ((filteredFeedbacks.length / filteredData.length) * 100).toFixed(1) : 0,
      recentFeedbacks: filteredFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
      topKeywords: type !== 'keyword' ? getTopKeywordsForItem(filteredFeedbacks) : [],
      topProblems: type !== 'problem' ? getTopProblemsForItem(filteredFeedbacks) : [],
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

  // Funções auxiliares para estatísticas
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

  // Adicione todas as funções de processamento
  const processHotelDistribution = (data: any[]) => {
    const hotelCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const hotel = feedback.hotel || feedback.source || 'Não especificado';
      hotelCounts[hotel] = (hotelCounts[hotel] || 0) + 1;
    });
    
    return Object.entries(hotelCounts)
      .map(([hotel, count]) => ({ label: hotel, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processSourceDistribution = (data: any[]) => {
    const sourceCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const source = feedback.source || 'Não especificado';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ label: source, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processLanguageDistribution = (data: any[]) => {
    const langCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const language = feedback.language || 'Não especificado';
      langCounts[language] = (langCounts[language] || 0) + 1;
    });
    
    return Object.entries(langCounts)
      .map(([language, count]) => ({ label: language, value: count }))
      .sort((a, b) => b.value - a.value);
  };

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

  const processKeywordDistribution = (data: any[]) => {
    const keywordCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      if (feedback.keyword) {
        feedback.keyword.split(';').forEach((keyword: string) => {
          const trimmedKeyword = keyword.trim();
          if (trimmedKeyword) {
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

  const processSectorDistribution = () => {
    const sectorCounts: Record<string, number> = {};
    
    filteredData.forEach(feedback => {
      if (feedback.sector) {
        feedback.sector.split(';').forEach((sector: string) => {
          const trimmedSector = sector.trim();
          if (trimmedSector) {
            sectorCounts[trimmedSector] = (sectorCounts[trimmedSector] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(sectorCounts)
      .map(([sector, count]) => ({ label: sector, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  const processApartamentoDistribution = () => {
    const apartamentoCounts: Record<string, number> = {};
    
    filteredData.forEach(feedback => {
      if (feedback.apartamento) {
        const apartamento = feedback.apartamento.toString();
        apartamentoCounts[apartamento] = (apartamentoCounts[apartamento] || 0) + 1;
      }
    });
    
    return Object.entries(apartamentoCounts)
      .map(([apartamento, count]) => ({ label: `Apto ${apartamento}`, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  };

  // Função para processar detalhes dos apartamentos
  const processApartamentoDetails = () => {
    if (!analysisData?.data) return [];

    const apartamentoMap = new Map<string, {
      count: number;
      totalRating: number;
      positiveCount: number;
      problems: Map<string, number>;
      ratings: number[];
    }>();

    analysisData.data.forEach((feedback: any) => {
      if (feedback.apartamento !== null && feedback.apartamento !== undefined) {
        const apartamentoStr = String(feedback.apartamento);
        if (apartamentoStr.trim() === '') return;

        if (!apartamentoMap.has(apartamentoStr)) {
          apartamentoMap.set(apartamentoStr, {
            count: 0,
            totalRating: 0,
            positiveCount: 0,
            problems: new Map(),
            ratings: [0, 0, 0, 0, 0]
          });
        }

        const apartamentoStat = apartamentoMap.get(apartamentoStr)!;
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

        if (feedback.problem) {
          const problems: string[] = feedback.problem.split(';')
            .map((p: string) => p.trim())
            .filter((p: string) => p && isValidProblem(p));
          
          problems.forEach((problem: string) => {
            apartamentoStat.problems.set(problem, (apartamentoStat.problems.get(problem) || 0) + 1);
          });
        }
      }
    });

    return Array.from(apartamentoMap.entries()).map(([apartamento, stat]) => {
      const averageRating = stat.count > 0 ? (stat.totalRating / stat.count) : 0;
      const sentiment = stat.count > 0 ? Math.round((stat.positiveCount / stat.count) * 100) : 0;

      const topProblems = Array.from(stat.problems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([problem, count]) => ({ problem, count }));

      return {
        apartamento,
        count: stat.count,
        averageRating,
        sentiment,
        topProblems,
        ratingDistribution: stat.ratings
      };
    }).sort((a, b) => b.count - a.count);
  };

  // Função para processar dados do scatter chart
  const processApartamentoScatterData = () => {
    const details = processApartamentoDetails();
    return details.map(detail => ({
      apartamento: detail.apartamento,
      count: detail.count,
      averageRating: detail.averageRating,
      sentiment: detail.sentiment,
      topProblems: detail.topProblems
    }));
  };

  // Componente para renderizar gráficos no modal
  const renderChart = (chartType: string, data: any[], onChartClick: (item: any, type: string) => void, type: string) => {
    if (chartType === 'bar') {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <RechartsTooltip content={<CustomTooltip />} />
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
          <RechartsTooltip content={<CustomTooltip />} />
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
          Não há dados de feedback disponíveis para este hotel.
        </p>
        <Button onClick={() => router.push('/import')}>
          Importar Dados
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold">Dashboard de Feedback</h2>
        <div className="flex flex-wrap gap-2 md:gap-4 items-center">
          <Button 
            onClick={handleViewHistory}
            variant="outline"
          >
            Ver Histórico Completo
          </Button>
          
          {/* Contador de filtros ativos */}
          <Button 
            onClick={() => setFiltersOpen(true)}
            variant="outline"
            className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros Avançados
            {(dateRange.start || dateRange.end || sentimentFilter !== 'all' || sourceFilter !== 'all' || languageFilter !== 'all' || apartmentFilter !== 'all' || hiddenRatings.length > 0) && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {[
                  dateRange.start || dateRange.end,
                  sentimentFilter !== 'all',
                  sourceFilter !== 'all',
                  languageFilter !== 'all', 
                  apartmentFilter !== 'all',
                  hiddenRatings.length > 0
                ].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>
      </div>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all duration-300">
        <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Feedbacks</h3>
          <p className="text-2xl font-bold">{filteredData.length}</p>
          {filteredData.length !== analysisData.analysis.totalFeedbacks && (
            <p className="text-xs text-muted-foreground">de {analysisData.analysis.totalFeedbacks} total</p>
          )}
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
          <h3 className="text-sm font-medium text-muted-foreground">Avaliação Média</h3>
          <p className="text-2xl font-bold">
            <span className={
              (filteredData.length > 0 ? filteredData.reduce((sum, f) => sum + f.rating, 0) / filteredData.length : 0) >= 4 ? 'text-green-600 dark:text-green-400 font-bold' : 
              (filteredData.length > 0 ? filteredData.reduce((sum, f) => sum + f.rating, 0) / filteredData.length : 0) >= 3 ? 'text-yellow-600 dark:text-yellow-400 font-bold' : 
              'text-red-600 dark:text-red-400 font-bold'
            }>
              {filteredData.length > 0 ? (filteredData.reduce((sum, f) => sum + f.rating, 0) / filteredData.length).toFixed(1) : '0.0'} ⭐
            </span>
          </p>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
          <h3 className="text-sm font-medium text-muted-foreground">Sentimento Positivo</h3>
          <p className="text-2xl font-bold">
            {filteredData.length > 0 
              ? Math.round((filteredData.filter(f => f.sentiment === 'positive').length / filteredData.length) * 100)
              : 0
            }%
          </p>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
          <h3 className="text-sm font-medium text-muted-foreground">Taxa de Resposta</h3>
          <p className="text-2xl font-bold">{analysisData.analysis.responseRate}%</p>
        </Card>
      </div>

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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
          </svg>
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

        {/* Drawer de Filtros */}
        {filtersOpen && analysisData && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" 
              onClick={() => setFiltersOpen(false)}
            />
            
            {/* Drawer */}
            <div className="absolute top-full right-0 mt-3 w-[420px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Header do Drawer */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Filtros Avançados</h3>
                      <p className="text-blue-100 text-sm">Personalize sua análise de dados</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiltersOpen(false)}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Conteúdo do Drawer */}
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                {/* Filtro de Data */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Período de Análise</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Data inicial</label>
                      <DatePicker 
                        date={dateRange.start} 
                        onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Data final</label>
                      <DatePicker 
                        date={dateRange.end} 
                        onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                      />
                    </div>
                  </div>
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
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="all">🗣️ Todos os idiomas</option>
                    {Array.from(new Set(analysisData.data.map(f => f.language).filter(Boolean))).map(language => (
                      <option key={language} value={language}>
                        {language === 'portuguese' ? '🇧🇷' : language === 'english' ? '🇺🇸' : language === 'spanish' ? '🇪🇸' : '🌍'} {language}
                      </option>
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
                        <div className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          hiddenRatings.includes(rating) 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/30' 
                            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}>
                          <span className="text-lg">{rating}⭐</span>
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
                      className="w-full mt-2 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {filteredData.length} de {analysisData.data.length} feedbacks
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(filteredData.length / analysisData.data.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
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
                      🗑️ Limpar Tudo
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setFiltersOpen(false)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      ✅ Aplicar Filtros
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="problems">Problemas</TabsTrigger>
          <TabsTrigger value="ratings">Avaliações</TabsTrigger>
          <TabsTrigger value="languages">Idiomas</TabsTrigger>
          <TabsTrigger value="sources">Fontes dos Comentários</TabsTrigger>
          <TabsTrigger value="apartamentos">Apartamentos</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-300">
            {/* Distribuição de Avaliações */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Distribuição de Avaliações</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'rating',
                    'Distribuição de Avaliações',
                    processRatingDistribution(filteredData),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processRatingDistribution(filteredData)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Quantidade"
                      fill="#8884d8"
                      onClick={(data, index) => {
                        const item = processRatingDistribution(filteredData)[index];
                        handleChartClick(item, 'rating');
                      }}
                    >
                      {processRatingDistribution(filteredData).map((entry: any, index: number) => (
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

            {/* Distribuição de Sentimentos */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Análise de Sentimentos</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'sentiment',
                    'Análise de Sentimentos',
                    [
                      { name: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                      { name: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                      { name: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
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
                        { name: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                        { name: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                        { name: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      onClick={(data, index) => {
                        const item = [
                          { name: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                          { name: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                          { name: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
                        ][index];
                        handleChartClick(item, 'sentiment');
                      }}
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

            {/* Principais Palavras-chave */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Principais Palavras-chave</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'keyword',
                    'Principais Palavras-chave',
                    processKeywordDistribution(filteredData).slice(0, 15),
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
                    data={processKeywordDistribution(filteredData).slice(0, 8)}
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
                      onClick={(_, index) => {
                        const item = processKeywordDistribution(filteredData)[index];
                        handleChartClick(item, 'keyword');
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Distribuição por Departamento */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
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
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={processSectorDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }: any) => `${name ? name.substring(0, 15) + '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="label"
                      onClick={(data, index) => {
                        const item = processSectorDistribution()[index];
                        handleChartClick(item, 'sector');
                      }}
                    >
                      {processSectorDistribution().map((_: any, index: number) => (
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

        {/* Problemas */}
        <TabsContent value="problems" className="space-y-4">
          <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Principais Problemas Identificados</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewChart(
                  'problem',
                  'Principais Problemas Identificados',
                  processProblemDistribution(filteredData),
                  'bar'
                )}
              >
                Ver Detalhes
              </Button>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={processProblemDistribution(filteredData)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={150} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="#8884d8"
                    onClick={(_, index) => {
                      const item = processProblemDistribution(filteredData)[index];
                      handleChartClick(item, 'problem');
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Idiomas */}
        <TabsContent value="languages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribuição por Idioma */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Distribuição por Idioma</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'language',
                    'Distribuição por Idioma',
                    processLanguageDistribution(filteredData),
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
                      data={processLanguageDistribution(filteredData)}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="label"
                      onClick={(_, index) => {
                        const item = processLanguageDistribution(filteredData)[index];
                        handleChartClick(item, 'language');
                      }}
                    >
                      {processLanguageDistribution(filteredData).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Avaliação Média por Idioma */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Avaliação Média por Fonte</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'source',
                    'Avaliação Média por Fonte',
                    processSourceDistribution(filteredData).map((source: any) => {
                      const feedbacksDaFonte = filteredData.filter((f: any) => f.source === source.label);
                      const avgRating = feedbacksDaFonte.length > 0 
                        ? feedbacksDaFonte.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbacksDaFonte.length 
                        : 0;
                      return { label: source.label, value: avgRating };
                    }),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={processSourceDistribution(filteredData).map((source: any) => {
                      const feedbacksDaFonte = filteredData.filter((f: any) => f.source === source.label);
                      const avgRating = feedbacksDaFonte.length > 0 
                        ? feedbacksDaFonte.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbacksDaFonte.length 
                        : 0;
                      return { name: source.label, rating: avgRating.toFixed(1) };
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="rating" name="Avaliação Média" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Volume de Feedbacks por Fonte */}
          <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <h3 className="text-lg font-semibold mb-4">Volume de Feedbacks por Fonte</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={getTimePeriodData(filteredData, 'source').data}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  {processSourceDistribution(filteredData).map((source: any, index: number) => (
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
                const { period } = getTimePeriodData(filteredData, 'source');
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
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Distribuição por Apartamentos</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'apartamento',
                    'Distribuição por Apartamentos',
                    processApartamentoDistribution().slice(0, 15),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={processApartamentoDistribution().slice(0, 15)}
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
                        const item = processApartamentoDistribution()[index];
                        handleChartClick(item, 'apartamento');
                      }}
                    >
                      {processApartamentoDistribution().slice(0, 15).map(
                        (entry: { label: string; value: number }, index: number) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Mapa de calor de avaliações */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Avaliação Média por Apartamento</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'apartamento',
                    'Avaliação Média por Apartamento',
                    processApartamentoScatterData(),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
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
                      data={processApartamentoScatterData()} 
                      fill="#8884d8"
                      onClick={(data) => handleChartClick({name: data.apartamento}, 'apartamento')}
                    >
                      {processApartamentoScatterData().map((entry, index) => (
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
            </Card>
          </div>

          {/* Tabela detalhada de apartamentos */}
          <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <h3 className="text-lg font-semibold mb-4">Análise Detalhada por Apartamento</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-3 bg-muted border-b text-left">Apartamento</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Feedbacks</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Avaliação</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Sentimento</th>
                    <th className="py-2 px-3 bg-muted border-b text-left">Problemas Principais</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processApartamentoDetails().slice(0, 20).map((ap, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="py-2 px-3 border-b font-medium">
                        {ap.apartamento}
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
          </Card>
        </TabsContent>

        {/* Avaliações */}
        <TabsContent value="ratings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribuição de Avaliações */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Distribuição de Avaliações</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'rating',
                    'Distribuição de Avaliações',
                    processRatingDistribution(filteredData),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processRatingDistribution(filteredData)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Quantidade"
                      fill="#8884d8"
                      onClick={(data, index) => {
                        const item = processRatingDistribution(filteredData)[index];
                        handleChartClick(item, 'rating');
                      }}
                    >
                      {processRatingDistribution(filteredData).map((entry: any, index: number) => (
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
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Análise de Sentimentos</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'sentiment',
                    'Análise de Sentimentos',
                    [
                      { name: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                      { name: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                      { name: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
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
                        { name: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                        { name: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                        { name: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      onClick={(data, index) => {
                        const item = [
                          { name: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                          { name: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                          { name: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
                        ][index];
                        handleChartClick(item, 'sentiment');
                      }}
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

          {/* Evolução das Avaliações ao Longo do Tempo */}
          <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <h3 className="text-lg font-semibold mb-4">Evolução das Avaliações ao Longo do Tempo</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getTimePeriodData(filteredData, 'rating').data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="1" stroke="#F44336" name="1 estrela" strokeWidth={2} />
                  <Line type="monotone" dataKey="2" stroke="#FF9800" name="2 estrelas" strokeWidth={2} />
                  <Line type="monotone" dataKey="3" stroke="#FFC107" name="3 estrelas" strokeWidth={2} />
                  <Line type="monotone" dataKey="4" stroke="#8BC34A" name="4 estrelas" strokeWidth={2} />
                  <Line type="monotone" dataKey="5" stroke="#4CAF50" name="5 estrelas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-center text-muted-foreground mt-2">
              Agrupamento automático: {(() => {
                const { period } = getTimePeriodData(filteredData, 'rating');
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
      </Tabs>

      {/* Feedbacks Recentes */}
      <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
        <h3 className="text-lg font-semibold mb-4">Feedbacks Recentes</h3>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {analysisData.analysis.recentFeedbacks.slice(0, 5).map((feedback: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{feedback.author || feedback.title || "Autor não identificado"}</p>
                    <p className="text-sm text-muted-foreground">{feedback.source}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">⭐</span>
                    <span>{feedback.rating}</span>
                  </div>
                </div>
                <p className="text-sm">{feedback.comment}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {feedback.keyword.split(';').map((keyword: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-full text-xs">
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDetail?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDetail?.data.map((feedback: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{feedback.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {feedback.source} • {feedback.language} • {feedback.date}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">⭐</span>
                    <span>{feedback.rating}</span>
                  </div>
                </div>
                <p className="text-sm">{feedback.comment}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {feedback.keyword.split(';').map((keyword: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-full text-xs">
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
                {feedback.problem && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Problemas identificados:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {feedback.problem.split(';').map((problem: string, idx: number) => (
                        <Badge key={idx} variant="outline" className={
                          idx === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800" : 
                          idx === 1 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800" : 
                          "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800"
                        }>
                          {problem.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Painel Lateral Interativo Melhorado */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[42rem] bg-background border-l border-border shadow-2xl transform transition-all duration-500 ease-in-out ${
        detailPanelOpen ? 'translate-x-0' : 'translate-x-full'
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
                        {selectedItem.type === 'hotel' && <Building2 className="h-5 w-5" />}
                        {selectedItem.type === 'problem' && <AlertCircle className="h-5 w-5" />}
                        {selectedItem.type === 'rating' && <Star className="h-5 w-5" />}
                        {selectedItem.type === 'keyword' && <Tag className="h-5 w-5" />}
                        {selectedItem.type === 'source' && <Globe className="h-5 w-5" />}
                        {!['hotel', 'problem', 'rating', 'keyword', 'source'].includes(selectedItem.type) && <BarChart3 className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {selectedItem.type === 'keyword' ? 'Palavra-chave' : 
                           selectedItem.type === 'problem' ? 'Problema' :
                           selectedItem.type === 'sector' ? 'Departamento' :
                           selectedItem.type === 'source' ? 'Fonte' :
                           selectedItem.type === 'language' ? 'Idioma' :
                           selectedItem.type === 'rating' ? 'Avaliação' : selectedItem.type}
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

            {/* Conteúdo Principal */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Botão para Ver Todos os Comentários */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4 -m-6 mb-4 border-b">
                  <Button 
                    onClick={handleViewAllComments}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                    size="lg"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Ver TODOS os {selectedItem.stats.totalOccurrences} Comentários
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>

              {/* Avaliação Média */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-2" />
                  Avaliação Média
                </h4>
                <div className="text-center">
                  <div className="text-3xl font-bold">{selectedItem.stats.averageRating.toFixed(1)}</div>
                  <div className="text-yellow-500">⭐⭐⭐⭐⭐</div>
                </div>
              </Card>

              {/* Distribuição de Sentimentos */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Distribuição de Sentimentos</h4>
                <div className="h-40">
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
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Distribuição de Avaliações */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Distribuição de Avaliações</h4>
                <div className="h-32">
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
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Tendência Mensal */}
              {selectedItem.stats.monthlyTrend.length > 1 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Tendência Mensal</h4>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedItem.stats.monthlyTrend}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Palavras-chave Relacionadas */}
              {selectedItem.stats.topKeywords.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Principais Palavras-chave</h4>
                  <div className="space-y-2">
                    {selectedItem.stats.topKeywords.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm">{item.keyword}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Problemas Relacionados */}
              {selectedItem.stats.topProblems.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Problemas Relacionados</h4>
                  <div className="space-y-2">
                    {selectedItem.stats.topProblems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm">{item.problem}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Feedbacks Recentes */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Feedbacks Recentes</h4>
                <div className="space-y-3">
                  {selectedItem.stats.recentFeedbacks.map((feedback: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-yellow-500">
                            {'⭐'.repeat(feedback.rating || 0)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateBR(feedback.date)}
                        </div>
                      </div>
                      <p className="text-sm line-clamp-2">{feedback.comment}</p>
                    </div>
                  ))}
                </div>
              </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay para fechar o painel */}
      {detailPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40" 
          onClick={() => setDetailPanelOpen(false)}
        />
      )}

      {/* Modal para Ver Todos os Comentários */}
      <Dialog open={allCommentsModalOpen} onOpenChange={setAllCommentsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Todos os Comentários {selectedItem && `(${allCommentsData.length})`}
            </DialogTitle>
            <DialogDescription>
              {selectedItem && `Comentários relacionados a: ${selectedItem.value}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-4">
              {allCommentsData.map((feedback: any, idx: number) => (
                <Card key={idx} className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${
                              i < feedback.rating 
                                ? "text-yellow-500 fill-yellow-500" 
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {feedback.rating}/5
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-muted-foreground">
                        {feedback.hotel || 'Hotel não identificado'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateBR(feedback.date)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm leading-relaxed">{feedback.comment}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {feedback.source && (
                      <Badge variant="secondary" className="text-xs">
                        📍 {feedback.source}
                      </Badge>
                    )}
                    {feedback.sector && (
                      <Badge variant="outline" className="text-xs">
                        🏢 {feedback.sector}
                      </Badge>
                    )}
                    {feedback.keyword && (
                      <Badge variant="outline" className="text-xs">
                        🏷️ {feedback.keyword}
                      </Badge>
                    )}
                    {feedback.problem && feedback.problem !== 'VAZIO' && (
                      <Badge variant="destructive" className="text-xs">
                        ⚠️ {feedback.problem}
                      </Badge>
                    )}
                    {feedback.apartamento && (
                      <Badge variant="outline" className="text-xs">
                        🚪 {feedback.apartamento}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
              
              {allCommentsData.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum comentário encontrado
                  </h3>
                  <p className="text-muted-foreground">
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
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors cursor-pointer">
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

      {/* Modal de Filtros Premium */}
      {filtersOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setFiltersOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Filtros do Colaborador</h3>
                    <p className="text-sm text-blue-100 opacity-90">Personalize sua análise</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersOpen(false)}
                  className="text-white hover:bg-white/10 h-10 w-10 rounded-full p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(95vh-120px)] overflow-y-auto">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                  <label className="text-sm font-semibold">Período de Análise</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset(7)}>📅 7 dias</Button>
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset(30)}>📅 30 dias</Button>
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset(90)}>📅 90 dias</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Data inicial</label>
                      <DatePicker date={dateRange.start} onChange={handleStartDateChange} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Data final</label>
                      <DatePicker date={dateRange.end} onChange={handleEndDateChange} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Sentimento</label>
                  <select 
                    value={sentimentFilter} 
                    onChange={(e) => setSentimentFilter(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="all">Todos</option>
                    <option value="positive">Positivos</option>
                    <option value="neutral">Neutros</option>
                    <option value="negative">Negativos</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Fonte</label>
                  <select 
                    value={sourceFilter} 
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="all">Todas</option>
                    {analysisData && Array.from(new Set(analysisData.data.map(f => f.source).filter(Boolean))).map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Idioma</label>
                  <select 
                    value={languageFilter} 
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="all">Todos</option>
                    {analysisData && Array.from(new Set(analysisData.data.map(f => f.language).filter(Boolean))).map(language => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Apartamento</label>
                  <select 
                    value={apartmentFilter} 
                    onChange={(e) => setApartmentFilter(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="all">Todos</option>
                    {analysisData && Array.from(new Set(analysisData.data.map(f => f.apartamento).filter(Boolean))).map(apartamento => (
                      <option key={apartamento} value={apartamento}>Apto {apartamento}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 lg:col-span-3">
                  <label className="text-sm font-semibold">Ocultar Avaliações</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <label key={rating} className="cursor-pointer">
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
                        <div className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          hiddenRatings.includes(rating) 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}>
                          <span>{rating}⭐</span>
                          <span className="text-xs">
                            {hiddenRatings.includes(rating) ? 'Oculto' : 'Visível'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
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
                  className="flex-1"
                >
                  Limpar Filtros
                </Button>
                <Button 
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente com proteção de autenticação
export default function Dashboard() {
  return (
    <SharedDashboardLayout>
      <DashboardContent />
    </SharedDashboardLayout>
  );
} 