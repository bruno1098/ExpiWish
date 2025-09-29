"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAllAnalyses } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ModernChart, ProblemsChart, HotelsChart, RatingsChart, DepartmentsChart, SourcesChart, ApartmentsChart, KeywordsChart, ProblemsTrendChart } from '@/components/modern-charts';
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
import { ChartDetailModal } from '@/components/chart-detail-modal';
import { AdvancedProblemsView } from '@/app/components/AdvancedProblemsView';
import { 
  Star, 
  Filter, 
  MessageSquare, 
  ExternalLink, 
  X, 
  Building2, 
  AlertCircle, 
  AlertTriangle,
  Tag, 
  Globe, 
  BarChart3 
} from "lucide-react";
import { formatDateBR, filterValidFeedbacks } from "@/lib/utils";
import { ProblemsVisualizationOptions } from './ProblemsVisualizationOptions';

// Definir a interface AnalysisData
interface AnalysisData {
  id: string;
  hotelId: string;
  hotelName: string;
  importDate: any;
  data: any[];
  analysis: any;
}

// Componentes modernos de gráficos já importados

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
  
  // Estados para o modal de detalhes do gráfico
  const [chartDetailOpen, setChartDetailOpen] = useState(false);
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
  
  // Função para processar dados das análises
  const processAnalysesData = (analyses: any[]) => {
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
            // Filtrar feedbacks excluídos
            const validFeedbacks = analysis.data.filter((feedback: any) => feedback.deleted !== true);
            
            // Como as análises já foram filtradas por hotelId na consulta do Firestore,
            // podemos incluir todos os feedbacks válidos desta análise
            allFeedbacks = [...allFeedbacks, ...validFeedbacks];
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
           setSelectedHotel(userData?.hotelName || '');
        } else {
          setAnalysisData(null);
        }
      } else {
        setAnalysisData(null);
      }
    } else {
      setAnalysisData(null);
    }
  };
  
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
    
    // Primeiro, filtrar feedbacks válidos (excluir "Não identificados")
    const validFeedbacks = filterValidFeedbacks(data);
    
    return validFeedbacks.filter((feedback: any) => {
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
          // Buscar análises específicas para o hotel do usuário (excluindo ocultas)
          const analyses = await getAllAnalyses(userData.hotelId, false);
          processAnalysesData(analyses);

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
    
    const value = data.name || data.label;
    let filteredFeedbacks: any[] = [];

    // Implementação específica para cada tipo, igual ao admin
    switch (type) {
      case 'rating':
        const ratingLabel = data.label || data.name;
        
        // Extrair o número do label "X estrela(s)"
        const rating = parseInt(ratingLabel.split(' ')[0]);
        
        filteredFeedbacks = filteredData.filter((feedback: any) => {
          const feedbackRating = Math.floor(feedback.rating);
          
          return feedbackRating === rating;
        });
        break;

      case 'problem':
        const problemLabel = data.label || data.name;
        
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
        
        filteredFeedbacks = filteredData.filter((feedback: any) => 
          feedback.source === sourceLabel
        );
        break;

      case 'language':
        const languageLabel = data.label || data.name;
        
        filteredFeedbacks = filteredData.filter((feedback: any) => 
          feedback.language === languageLabel
        );
        break;

      case 'keyword':
        const keywordLabel = data.label || data.name;
        
        filteredFeedbacks = filteredData.filter((feedback: any) => {
          if (feedback.keyword && typeof feedback.keyword === 'string') {
            return feedback.keyword.split(';').map((k: string) => k.trim()).includes(keywordLabel);
          }
          return false;
        });
        break;

      case 'sector':
        const sectorLabel = data.label || data.name;
        
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
        
        return;
    }

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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
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
    setChartDetailOpen(true);
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

  // Nova função para processar problem_detail específicos
  const processProblemDetailsDistribution = (data: any[]) => {
    const problemDetails: Record<string, any> = {};
    
    data.forEach(feedback => {
      if (feedback.allProblems && Array.isArray(feedback.allProblems)) {
        feedback.allProblems.forEach((problemObj: any) => {
          if (problemObj.problem_detail && problemObj.problem_detail.trim() !== '') {
            const key = `${problemObj.problem}_${problemObj.problem_detail}`;
            if (!problemDetails[key]) {
              problemDetails[key] = {
                problem: problemObj.problem,
                problem_detail: problemObj.problem_detail,
                sector: problemObj.sector || problemObj.keyword,
                count: 0,
                totalRating: 0,
                examples: [],
                suggestions: new Set()
              };
            }
            problemDetails[key].count++;
            problemDetails[key].totalRating += feedback.rating || 0;
            problemDetails[key].examples.push(feedback.comment);
            if (feedback.suggestion_summary) {
              problemDetails[key].suggestions.add(feedback.suggestion_summary);
            }
          }
        });
      }
    });

    return Object.values(problemDetails)
      .map((detail: any) => ({
        ...detail,
        averageRating: detail.count > 0 ? detail.totalRating / detail.count : 0,
        suggestions: Array.from(detail.suggestions)
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 30);
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

  // Nova função melhorada para contar problemas por departamento
  const processDepartmentProblemsDistribution = () => {
    const departmentProblems: Record<string, number> = {};
    
    filteredData.forEach(feedback => {
      if (feedback.problem && feedback.sector) {
        const allProblems = feedback.problem.split(';').map((p: string) => p.trim());
        const allSectors = feedback.sector.split(';').map((s: string) => s.trim());
        
        // Para cada problema válido, contar em cada departamento válido
        allProblems.forEach((problem: string) => {
          const trimmedProblem = problem.trim();
          if (trimmedProblem && trimmedProblem !== 'VAZIO' && trimmedProblem.toLowerCase() !== 'sem problemas') {
            allSectors.forEach((sector: string) => {
              const trimmedSector = sector.trim();
              if (trimmedSector && trimmedSector !== 'VAZIO') {
                departmentProblems[trimmedSector] = (departmentProblems[trimmedSector] || 0) + 1;
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

  // Função para processar problemas por apartamento
  const processApartamentoProblemsDistribution = () => {
    const apartamentoProblems: Record<string, number> = {};
    
    filteredData.forEach(feedback => {
      if (feedback.apartamento && feedback.problem) {
        const apartamento = feedback.apartamento.toString();
        const allProblems = feedback.problem.split(';').map((p: string) => p.trim());
        
        // Para cada problema válido, contar no apartamento
        allProblems.forEach((problem: string) => {
          const trimmedProblem = problem.trim();
          if (trimmedProblem && trimmedProblem !== 'VAZIO' && trimmedProblem.toLowerCase() !== 'sem problemas' && isValidProblem(trimmedProblem)) {
            apartamentoProblems[apartamento] = (apartamentoProblems[apartamento] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(apartamentoProblems)
      .map(([apartamento, problemCount]) => ({ 
        label: `Apto ${apartamento}`, 
        value: problemCount,
        name: apartamento
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  };

  const processApartamentosPorHotel = () => {
    const hotelApartamentos: Record<string, Set<string>> = {};
    
    filteredData.forEach(feedback => {
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
        label: hotel, 
        value: apartamentosSet.size,
        name: hotel
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Componente para renderizar gráficos no modal
  const renderChart = (chartType: string, data: any[], onChartClick: (item: any, type: string) => void, type: string) => {
    const handleClick = (item: any, index: number) => {
      onChartClick(item, type);
    };

    if (chartType === 'bar') {
      return <ModernChart data={data} type="bar" onClick={handleClick} />;
    }
    
    if (chartType === 'pie') {
      return <ModernChart data={data} type="pie" onClick={handleClick} />;
    }
    
    if (chartType === 'horizontalBar') {
      return <ModernChart data={data} type="horizontalBar" onClick={handleClick} />;
    }
    
    // Fallback - retorna um gráfico de barras
    return <ModernChart data={data} type="bar" onClick={handleClick} />;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300">
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
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
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
              <div className="h-[430px]">
                <RatingsChart 
                  data={processRatingDistribution(filteredData)}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'rating');
                  }}
                />
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
              <div className="h-[480px]">
                <ModernChart 
                  data={[
                    { label: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                    { label: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                    { label: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
                  ]}
                  type="pie"
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'sentiment');
                  }}
                />
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
              <div className="h-[450px]">
                <KeywordsChart 
                  data={processKeywordDistribution(filteredData).slice(0, 8)}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'keyword');
                  }}
                />
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
              <div className="h-[480px]">
                <ModernChart 
                  type="pie"
                  data={processSectorDistribution()}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'sector');
                  }}
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
                  {processKeywordDistribution(filteredData)
                    .slice(0, 15)
                    .map((keyword: any, index: number) => {
                      const totalKeywords = processKeywordDistribution(filteredData).reduce((sum, k) => sum + k.value, 0);
                      const percentage = totalKeywords > 0 ? ((keyword.value / totalKeywords) * 100).toFixed(1) : '0';
                      
                      // Buscar departamentos relacionados a esta palavra-chave
                      const keywordDepartments = filteredData
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

        {/* Problemas - NOVA VISUALIZAÇÃO DETALHADA */}
        <TabsContent value="problems" className="space-y-6">
          {/* Novo Sistema de Visualização de Problemas Detalhados */}
          <ProblemsVisualizationOptions 
            filteredData={filteredData}
            setSelectedItem={setSelectedItem}
            setChartDetailOpen={setChartDetailOpen}
          />

          {/* Gráfico de Backup (caso necessário) - Mantido como fallback */}
          <Card className="p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📊 Visão Clássica - Problemas Resumidos</h3>
              <Button
                onClick={() => handleViewChart('problem', 'Principais Problemas', processProblemDistribution(filteredData), 'bar')}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Completo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Para comparação: visualização resumida tradicional (genérica)
            </p>
            <div className="h-[400px]">
              <ProblemsChart 
                data={processProblemDistribution(filteredData).slice(0, 15)}
                onClick={(item: any, index: number) => {
                  console.log(`Clique no problema: ${item.label || item.name}`);
                  handleChartClick(item, 'problem');
                }}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Departamentos */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ranking de Problemas por Departamento */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
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
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
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

          {/* Tabela de departamentos */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Análise Detalhada por Departamento</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-4 bg-muted border-b text-left">Departamento</th>
                    <th className="py-2 px-4 bg-muted border-b text-center">Total de Problemas</th>
                    <th className="py-2 px-4 bg-muted border-b text-center">Total de Feedbacks</th>
                    <th className="py-2 px-4 bg-muted border-b text-center">% de Problemas</th>
                    <th className="py-2 px-4 bg-muted border-b text-center">Principais Problemas</th>
                    <th className="py-2 px-4 bg-muted border-b text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processDepartmentProblemsDistribution()
                    .slice(0, 15)
                    .map((department: any, index: number) => {
                      // Calcular feedbacks totais para este departamento
                      const departmentFeedbacks = filteredData.filter((item: any) => {
                        if (item.sector && typeof item.sector === 'string') {
                          return item.sector.split(';').map((s: string) => s.trim()).includes(department.label);
                        }
                        return false;
                      }).length;
                      
                      const problemPercentage = departmentFeedbacks > 0 ? ((department.value / departmentFeedbacks) * 100).toFixed(1) : '0';
                      
                      // Buscar principais problemas deste departamento
                      const departmentProblems = filteredData
                        .filter((item: any) => {
                          if (item.sector && typeof item.sector === 'string') {
                            return item.sector.split(';').map((s: string) => s.trim()).includes(department.label);
                          }
                          return false;
                        })
                        .flatMap((item: any) => {
                          if (item.problem && typeof item.problem === 'string') {
                            return item.problem.split(';').map((p: string) => p.trim()).filter((p: string) => p && p !== 'VAZIO' && p.toLowerCase() !== 'sem problemas');
                          }
                          return [];
                        })
                        .reduce((acc: Record<string, number>, problem: string) => {
                          acc[problem] = (acc[problem] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                      
                      const topProblems = Object.entries(departmentProblems)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .slice(0, 2)
                        .map(([problem, count]) => `${problem} (${count})`);
                      
                      return (
                        <tr key={department.label} className="hover:bg-muted/50">
                          <td className="py-2 px-4 border-b font-medium">{department.label}</td>
                          <td className="py-2 px-4 border-b text-center">
                            <Badge variant="destructive">{department.value}</Badge>
                          </td>
                          <td className="py-2 px-4 border-b text-center">
                            <Badge variant="secondary">{departmentFeedbacks}</Badge>
                          </td>
                          <td className="py-2 px-4 border-b text-center">{problemPercentage}%</td>
                          <td className="py-2 px-4 border-b text-sm">
                            {topProblems.length > 0 ? topProblems.join(', ') : 'Nenhum problema identificado'}
                          </td>
                          <td className="py-2 px-4 border-b text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleChartClick(department, 'sector')}
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

        {/* Palavras-chave */}
        <TabsContent value="keywords" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Palavras-chave Mais Frequentes */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Palavras-chave Mais Frequentes</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'keyword',
                    'Palavras-chave Mais Frequentes',
                    processKeywordDistribution(filteredData),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[480px]">
                <KeywordsChart 
                  data={processKeywordDistribution(filteredData)}
                  onClick={(item: any) => handleChartClick(item, 'keyword')}
                />
              </div>
            </Card>

            {/* Distribuição de Palavras-chave */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Distribuição de Palavras-chave</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'keyword',
                    'Distribuição de Palavras-chave',
                    processKeywordDistribution(filteredData).slice(0, 10),
                    'pie'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[480px]">
                <ModernChart 
                  data={processKeywordDistribution(filteredData).slice(0, 10).map(item => ({ ...item, name: item.label }))}
                  type="pie"
                  onClick={(item: any) => handleChartClick(item, 'keyword')}
                />
              </div>
            </Card>
          </div>
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
              <div className="h-[480px]">
                <ModernChart 
                  type="pie"
                  data={processLanguageDistribution(filteredData)}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'language');
                  }}
                  categoryType="language"
                />
              </div>
            </Card>

            {/* Avaliação Média por Idioma */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Avaliação Média por Idioma</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'language',
                    'Avaliação Média por Idioma',
                    processLanguageDistribution(filteredData).map((lang: any) => {
                      const feedbacksDoIdioma = filteredData.filter((f: any) => f.language === lang.label);
                      const avgRating = feedbacksDoIdioma.length > 0 
                        ? feedbacksDoIdioma.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbacksDoIdioma.length 
                        : 0;
                      return { label: lang.label, value: avgRating };
                    }),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[480px]">
                <ModernChart 
                  type="bar"
                  data={processLanguageDistribution(filteredData).map((lang: any) => {
                    const feedbacksDoIdioma = filteredData.filter((f: any) => f.language === lang.label);
                    const avgRating = feedbacksDoIdioma.length > 0 
                      ? feedbacksDoIdioma.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbacksDoIdioma.length 
                      : 0;
                    return { label: lang.label, value: parseFloat(avgRating.toFixed(1)) };
                  })}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'language');
                  }}
                  categoryType="language"
                />
              </div>
            </Card>
          </div>

         
        </TabsContent>

        {/* Fontes dos Comentários */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Volume de Feedbacks por Fonte */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Volume de Feedbacks por Fonte</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'source',
                    'Volume de Feedbacks por Fonte',
                    processSourceDistribution(filteredData),
                    'pie'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[480px]">
                <SourcesChart 
                  data={processSourceDistribution(filteredData)}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'source');
                  }}
                  categoryType="source"
                />
              </div>
            </Card>

            {/* Avaliação Média por Fonte */}
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
              <div className="h-[480px]">
                <ModernChart 
                  type="bar"
                  data={processSourceDistribution(filteredData).map((source: any) => {
                    const feedbacksDaFonte = filteredData.filter((f: any) => f.source === source.label);
                    const avgRating = feedbacksDaFonte.length > 0 
                      ? feedbacksDaFonte.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbacksDaFonte.length 
                      : 0;
                    return { label: source.label, value: parseFloat(avgRating.toFixed(1)) };
                  })}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'source');
                  }}
                  categoryType="source"
                />
              </div>
            </Card>
          </div>

          {/* Distribuição de Sentimentos por Fonte */}
          <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Sentimentos por Fonte</h3>
            <div className="h-[480px]">
              <ModernChart 
                type="bar"
                data={processSourceDistribution(filteredData).map((source: any) => {
                  const feedbacksDaFonte = filteredData.filter((f: any) => f.source === source.label);
                  const positivos = feedbacksDaFonte.filter((f: any) => f.sentiment === 'positive').length;
                  const negativos = feedbacksDaFonte.filter((f: any) => f.sentiment === 'negative').length;
                  const neutros = feedbacksDaFonte.filter((f: any) => f.sentiment === 'neutral').length;
                  const total = feedbacksDaFonte.length;
                  const sentimentScore = total > 0 ? ((positivos - negativos) / total * 100) : 0;
                  return { label: source.label, value: parseFloat(sentimentScore.toFixed(1)) };
                })}
                onClick={(item: any, index: number) => {
                  handleChartClick(item, 'source');
                }}
                categoryType="source"
              />
            </div>
          </Card>
        </TabsContent>

        {/* Apartamentos */}
        <TabsContent value="apartamentos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
              <div className="h-[480px]">
                <ApartmentsChart 
                  data={processApartamentoDistribution().slice(0, 15)}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'apartamento');
                  }}
                />
              </div>
            </Card>

            {/* Problemas por Apartamento */}
            <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Problemas por Apartamento</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewChart(
                    'apartamento',
                    'Problemas por Apartamento',
                    processApartamentoProblemsDistribution(),
                    'bar'
                  )}
                >
                  Ver Detalhes
                </Button>
              </div>
              <div className="h-[480px]">
                <ModernChart 
                  type="bar"
                  data={processApartamentoProblemsDistribution()}
                  onClick={(item: any, index: number) => {
                    handleChartClick({name: item.name}, 'apartamento');
                  }}
                />
              </div>
              <div className="flex justify-center mt-2 space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full mr-1"></div>
                  <span>Quantidade de Problemas por Apartamento</span>
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
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="font-semibold text-lg">{ap.apartamento}</span>
                        </div>
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
              <div className="h-[430px]">
                <RatingsChart 
                  data={processRatingDistribution(filteredData)}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'rating');
                  }}
                />
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
              <div className="h-[480px]">
                <ModernChart 
                  type="pie"
                  data={[
                    { label: 'Positivo', value: filteredData.filter(f => f.sentiment === 'positive').length },
                    { label: 'Negativo', value: filteredData.filter(f => f.sentiment === 'negative').length },
                    { label: 'Neutro', value: filteredData.filter(f => f.sentiment === 'neutral').length }
                  ]}
                  onClick={(item: any, index: number) => {
                    handleChartClick(item, 'sentiment');
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Evolução das Avaliações ao Longo do Tempo */}
          <Card className="p-4 hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
            <h3 className="text-lg font-semibold mb-4">Evolução das Avaliações ao Longo do Tempo</h3>
            <div className="h-[480px]">
              <ModernChart 
                type="bar"
                data={getTimePeriodData(filteredData, 'rating').data.map((item: any) => ({
                  label: item.period,
                  value: (item['1'] || 0) + (item['2'] || 0) + (item['3'] || 0) + (item['4'] || 0) + (item['5'] || 0)
                }))}
              />
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
                        <Badge
                          key={idx}
                          variant="outline"
                          className={
                            idx === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800" : 
                            idx === 1 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800" : 
                            "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800"
                          }
                          title={idx === 0 && feedback.problem_detail ? feedback.problem_detail : problem.trim()}
                        >
                          {problem.trim()}
                        </Badge>
                      ))}
                    </div>
                    {feedback.problem_detail && (
                      <p className="text-xs text-muted-foreground mt-1">{feedback.problem_detail}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Painel Lateral Interativo Premium */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[42rem] bg-background border-l border-border shadow-2xl transform transition-all duration-500 ease-in-out ${
        'translate-x-full'
      }`}>
        {selectedItem && (
          <div className="h-full flex flex-col">
            {/* Cabeçalho Premium com Gradiente */}
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
                    onClick={() => setChartDetailOpen(false)}
                    className="text-white hover:bg-white/20 h-10 w-10 rounded-full p-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Métricas Premium Destacadas */}
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
                      <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Distribuição de Sentimentos
                  </h4>
                  <div className="h-48">
                    <ModernChart 
                      type="pie"
                      data={[
                        { label: 'Positivo', value: selectedItem.stats.sentimentDistribution.positive },
                        { label: 'Neutro', value: selectedItem.stats.sentimentDistribution.neutral },
                        { label: 'Negativo', value: selectedItem.stats.sentimentDistribution.negative }
                      ].filter(item => item.value > 0)}
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
                        { label: '1⭐', value: selectedItem.stats.ratingDistribution[1] },
                        { label: '2⭐', value: selectedItem.stats.ratingDistribution[2] },
                        { label: '3⭐', value: selectedItem.stats.ratingDistribution[3] },
                        { label: '4⭐', value: selectedItem.stats.ratingDistribution[4] },
                        { label: '5⭐', value: selectedItem.stats.ratingDistribution[5] }
                      ]}
                    />
                  </div>
                </Card>

                {/* Tendência Mensal */}
                {selectedItem.stats.monthlyTrend.length > 1 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Tendência Mensal
                    </h4>
                    <div className="h-40">
                      <ModernChart 
                        type="line"
                        data={selectedItem.stats.monthlyTrend.map((item: any) => ({
                          label: item.month,
                          value: item.count
                        }))}
                      />
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
      {false && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-500" 
          onClick={() => setChartDetailOpen(false)}
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
                  <ModernChart 
                    type={selectedChart.chartType === 'pie' ? 'pie' : 'bar'}
                    data={selectedChart.data}
                    onClick={(item: any, index: number) => handleChartClick(item, selectedChart.type)}
                  />
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

      <ChartDetailModal isOpen={chartDetailOpen} selectedItem={selectedItem} onOpenChange={setChartDetailOpen} />

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

// Componente exportado diretamente
export default function Dashboard() {
  return <DashboardContent />;
}