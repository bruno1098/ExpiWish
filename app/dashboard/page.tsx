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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
import { Star } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailData | null>(null);
  
  // Adicionar estado para dateRange
  const [dateRange, setDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null,
  });
  
  const router = useRouter();

  // Adicionar a função handleViewHistory
  const handleViewHistory = () => {
    router.push('/history');
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (userData?.hotelId) {
          // Buscar análises específicas para o hotel do usuário
          const analyses = await getAllAnalyses(userData.hotelId);
          
          if (analyses && analyses.length > 0) {
            // Filtrar análises que têm todos os campos necessários
            const validAnalyses = analyses.filter(a => 
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
              
              validAnalyses.forEach(analysis => {
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
    if (!analysisData?.data) return [];

    return analysisData.data.filter((feedback: any) => {
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
          return (feedback.sentiment || '').trim().toLowerCase() === value.trim().toLowerCase();
        case 'apartamento':
          return String(feedback.apartamento) === value.replace('Apto ', '');
        default:
          return false;
      }
    });
  };

  // Função para lidar com clique nos gráficos
  const handleChartClick = (data: any, type: string) => {
    const value = data.name || data.label;
    const filteredFeedbacks = filterFeedbacksByCriteria(type, value);
    
    setSelectedDetail({
      title: `${type === 'rating' ? 'Avaliação' : type === 'problem' ? 'Problema' : type === 'source' ? 'Fonte' : type === 'language' ? 'Idioma' : 'Sentimento'}: ${value}`,
      data: filteredFeedbacks,
      type: type as any
    });
  };

  // Adicione todas as funções de processamento
  const processHotelDistribution = (data: any[]) => {
    console.log("Processando distribuição de hotéis:", data.map(item => item.hotel));
    
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
      const source = feedback.hotel || 'Não especificado';
      if (source) {
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      }
    });
    
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ label: source, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processLanguageDistribution = (data: any[]) => {
    const languageCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const language = feedback.language;
      if (language) {
        languageCounts[language] = (languageCounts[language] || 0) + 1;
      }
    });
    
    return Object.entries(languageCounts)
      .map(([language, count]) => ({ label: language, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processRatingDistribution = (data: any[]) => {
    const ratingCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    
    data.forEach(feedback => {
      const rating = feedback.rating;
      if (rating && rating >= 1 && rating <= 5) {
        ratingCounts[String(rating)] = (ratingCounts[String(rating)] || 0) + 1;
      }
    });
    
    return Object.entries(ratingCounts)
      .map(([rating, count]) => ({ label: rating, value: count }))
      .sort((a, b) => Number(a.label) - Number(b.label)); // Ordenar de 1 a 5
  };

  const processProblemDistribution = (data: any[]) => {
    const problemCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      if (feedback.problem) {
        const problems = feedback.problem.split(';').map((p: string) => p.trim());
        
        problems.forEach((problem: string) => {
          if (problem && problem !== 'Não identificado' && problem !== 'Sem problemas') {
            problemCounts[problem] = (problemCounts[problem] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(problemCounts)
      .map(([problem, count]) => ({ label: problem, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  const processKeywordDistribution = (data: any[]) => {
    const keywordCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      if (feedback.keyword) {
        const keywords = feedback.keyword.split(';').map((k: string) => k.trim());
        
        keywords.forEach((keyword: string) => {
          if (keyword) {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ label: keyword, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  // Função para processar dados de apartamentos
  const processApartamentoDistribution = () => {
    if (!analysisData?.data) return [];
    
    const apartamentoMap = new Map<string, number>();
    
    analysisData.data.forEach((feedback: any) => {
      if (feedback.apartamento !== null && feedback.apartamento !== undefined) {
        const apartamentoStr = String(feedback.apartamento);
        if (apartamentoStr.trim() !== '') {
          apartamentoMap.set(apartamentoStr, (apartamentoMap.get(apartamentoStr) || 0) + 1);
        }
      }
    });
    
    return Array.from(apartamentoMap.entries())
      .map(([apartamento, count]) => ({ label: `Apto ${apartamento}`, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
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
            .filter((p: string) => p);
          
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
          <div className="flex flex-wrap gap-2">
            <DatePicker date={dateRange.start} onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))} />
            <DatePicker date={dateRange.end} onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))} />
          </div>
        </div>
      </div>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all duration-300">
        <Card className="p-4 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Feedbacks</h3>
          <p className="text-2xl font-bold">{analysisData.analysis.totalFeedbacks}</p>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Avaliação Média</h3>
          <p className="text-2xl font-bold">
            <span className={
              analysisData.analysis.averageRating >= 4 ? 'text-green-600 dark:text-green-400 font-bold' : 
              analysisData.analysis.averageRating >= 3 ? 'text-yellow-600 dark:text-yellow-400 font-bold' : 
              'text-red-600 dark:text-red-400 font-bold'
            }>
              {analysisData.analysis.averageRating.toFixed(1)} ⭐
            </span>
          </p>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Sentimento Positivo</h3>
          <p className="text-2xl font-bold">{analysisData.analysis.positiveSentiment}%</p>
        </Card>
        <Card className="p-4 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Taxa de Resposta</h3>
          <p className="text-2xl font-bold">{analysisData.analysis.responseRate}%</p>
        </Card>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="problems">Problemas</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="languages">Fontes do Comentário</TabsTrigger>
          <TabsTrigger value="apartamentos">Apartamentos</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-300">
            {/* Distribuição de Avaliações */}
            <Card className="p-4 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4">Distribuição de Avaliações</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysisData.analysis.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#8884d8"
                      onClick={(_, index) => {
                        const item = analysisData.analysis.ratingDistribution[index];
                        handleChartClick(item, 'rating');
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Distribuição de Sentimentos */}
            <Card className="p-4 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4">Distribuição de Sentimentos</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positivo', value: analysisData.analysis.positiveSentiment },
                        { name: 'Negativo', value: 100 - analysisData.analysis.positiveSentiment }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => handleChartClick(data, 'sentiment')}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Problemas */}
        <TabsContent value="problems" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Principais Problemas Identificados</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analysisData.analysis.problemDistribution}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={150} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    fill="#8884d8"
                    onClick={(_, index) => {
                      const item = analysisData.analysis.problemDistribution[index];
                      handleChartClick(item, 'problem');
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Fontes */}
        <TabsContent value="sources" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Distribuição por Fonte</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processSourceData(analysisData.analysis.sourceDistribution)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(_, index) => {
                      const item = processSourceData(analysisData.analysis.sourceDistribution)[index];
                      handleChartClick(item, 'source');
                    }}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {processSourceData(analysisData.analysis.sourceDistribution).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Fontes do Comentário */}
        <TabsContent value="languages" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Fontes do Comentário</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processLanguageData(analysisData.analysis.languageDistribution)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(_, index) => {
                      const item = processLanguageData(analysisData.analysis.languageDistribution)[index];
                      handleChartClick(item, 'language');
                    }}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {processLanguageData(analysisData.analysis.languageDistribution).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Apartamentos */}
        <TabsContent value="apartamentos" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 transition-all duration-300">
            {/* Distribuição por apartamento */}
            <Card className="p-4 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Apartamentos</h3>
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
                      dataKey="label" 
                      type="category" 
                      width={60} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      name="Quantidade de Feedbacks"
                      dataKey="value"
                      fill="#8884d8"
                      onClick={(_, index) => {
                        const item = processApartamentoDistribution()[index];
                        handleChartClick({ name: item.label.replace('Apto ', '') }, 'apartamento');
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
            <Card className="p-4 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4">Avaliação vs Sentimento por Apartamento</h3>
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
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background/95 backdrop-blur-sm shadow-lg p-3 rounded-md border border-border">
                              <p className="font-bold text-foreground">Apartamento {data.apartamento}</p>
                              <p className="text-sm text-muted-foreground">Feedbacks: {data.count}</p>
                              <p className="text-sm text-muted-foreground">Avaliação: {data.averageRating.toFixed(1)} ★</p>
                              <p className="text-sm text-muted-foreground">Sentimento: {data.sentiment}%</p>
                              {data.topProblems && data.topProblems.length > 0 && (
                                <p className="text-sm text-muted-foreground">Problema principal: {data.topProblems[0].problem}</p>
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
                          fill={entry.averageRating >= 4 ? '#4CAF50' : entry.averageRating >= 3 ? '#FFC107' : '#F44336'}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center mt-2 space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#4CAF50] rounded-full mr-1"></div>
                  <span>Avaliação Excelente (4+ estrelas)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#FFC107] rounded-full mr-1"></div>
                  <span>Avaliação Boa (3+ estrelas)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[#F44336] rounded-full mr-1"></div>
                  <span>Avaliação Baixa (&lt;3 estrelas)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabela detalhada de apartamentos */}
          <Card className="p-4">
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
                            ap.averageRating >= 4 ? 'text-green-600 dark:text-green-400 font-bold' : 
                            ap.averageRating >= 3 ? 'text-yellow-600 dark:text-yellow-400 font-bold' : 
                            'text-red-600 dark:text-red-400 font-bold'
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
                            <Badge key={idx} variant="outline" className={
                              idx === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800" : 
                              idx === 1 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800" : 
                              "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800"
                            }>
                              {problem.problem} ({problem.count})
                            </Badge>
                          ))}
                          {ap.topProblems.length === 0 && (
                            <span className="text-green-600 dark:text-green-400 text-sm">Sem problemas registrados</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 border-b text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleChartClick({name: ap.apartamento}, 'apartamento')}
                        >
                          Ver Feedbacks
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedbacks Recentes */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Feedbacks Recentes</h3>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {analysisData.analysis.recentFeedbacks.slice(0, 5).map((feedback: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{feedback.title}</p>
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
              <div key={index} className="p-4 border rounded-lg">
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
                          idx === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800" : 
                          idx === 1 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800" : 
                          "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
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