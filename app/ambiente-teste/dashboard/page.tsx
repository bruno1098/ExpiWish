"use client";

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, FileText, BarChart4, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import SharedDashboardLayout from "../../shared-layout";
import { RequireAdmin } from "@/lib/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function TestDashboardContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalFeedbacks: 0,
    totalAnalyses: 0,
    positivePercentage: 0,
    negativePercentage: 0,
    neutralPercentage: 0,
    ratingDistribution: [],
    sourceDistribution: [],
    languageDistribution: [],
    problemDistribution: [],
  });

  // Função para buscar todas análises do ambiente de teste
  const fetchTestAnalyses = async () => {
    setIsLoading(true);
    try {
      const analysesRef = collection(db, "analyses");
      const q = query(analysesRef, where("isTestEnvironment", "==", true));
      const querySnapshot = await getDocs(q);
      
      const analysesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAnalyses(analysesData);
      
      // Processar estatísticas
      processStats(analysesData);
      
      toast({
        title: "Dados atualizados",
        description: `${analysesData.length} análises de teste encontradas`,
      });
    } catch (error) {
      console.error("Erro ao buscar análises de teste:", error);
      toast({
        title: "Erro",
        description: "Falha ao buscar análises do ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Processar estatísticas dos dados de teste
  const processStats = (analysesData: any[]) => {
    // Combinar todos os feedbacks de todas as análises
    let allFeedbacks: any[] = [];
    analysesData.forEach(analysis => {
      if (analysis.data && Array.isArray(analysis.data)) {
        allFeedbacks = [...allFeedbacks, ...analysis.data];
      }
    });
    
    // Calcular estatísticas básicas
    const totalFeedbacks = allFeedbacks.length;
    const positiveFeedbacks = allFeedbacks.filter(f => f.sentiment === 'positive').length;
    const negativeFeedbacks = allFeedbacks.filter(f => f.sentiment === 'negative').length;
    const neutralFeedbacks = totalFeedbacks - positiveFeedbacks - negativeFeedbacks;
    
    // Processamento de distribuições
    const ratingDistribution = processRatingDistribution(allFeedbacks);
    const sourceDistribution = processSourceDistribution(allFeedbacks);
    const languageDistribution = processLanguageDistribution(allFeedbacks);
    const problemDistribution = processProblemDistribution(allFeedbacks);
    
    setStats({
      totalFeedbacks,
      totalAnalyses: analysesData.length,
      positivePercentage: totalFeedbacks ? Math.round((positiveFeedbacks / totalFeedbacks) * 100) : 0,
      negativePercentage: totalFeedbacks ? Math.round((negativeFeedbacks / totalFeedbacks) * 100) : 0,
      neutralPercentage: totalFeedbacks ? Math.round((neutralFeedbacks / totalFeedbacks) * 100) : 0,
      ratingDistribution,
      sourceDistribution,
      languageDistribution,
      problemDistribution,
    });
  };

  // Processar distribuição de avaliações
  const processRatingDistribution = (feedbacks: any[]) => {
    const distribution: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    feedbacks.forEach(feedback => {
      const rating = String(feedback.rating || '0');
      if (rating in distribution) {
        distribution[rating]++;
      }
    });
    
    return Object.entries(distribution).map(([rating, count]) => ({
      name: `${rating} estrela${rating !== '1' ? 's' : ''}`,
      value: count
    }));
  };

  // Processar distribuição de fontes
  const processSourceDistribution = (feedbacks: any[]) => {
    const distribution: Record<string, number> = {};
    
    feedbacks.forEach(feedback => {
      const source = (feedback.source || 'Desconhecido').trim();
      distribution[source] = (distribution[source] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .map(([source, count]) => ({ name: source, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Processar distribuição de idiomas
  const processLanguageDistribution = (feedbacks: any[]) => {
    const distribution: Record<string, number> = {};
    
    feedbacks.forEach(feedback => {
      const language = (feedback.language || 'Desconhecido').trim();
      distribution[language] = (distribution[language] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .map(([language, count]) => ({ name: language, value: count }))
      .sort((a, b) => b.value - a.value);
  };

  // Processar distribuição de problemas
  const processProblemDistribution = (feedbacks: any[]) => {
    const distribution: Record<string, number> = {};
    
    feedbacks.forEach(feedback => {
      if (!feedback.problem) return;
      
      const problems = feedback.problem.split(';');
      problems.forEach((problem: string) => {
        const p = problem.trim();
        if (p) {
          distribution[p] = (distribution[p] || 0) + 1;
        }
      });
    });
    
    return Object.entries(distribution)
      .map(([problem, count]) => ({ name: problem, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  // Renderização customizada de tooltips para os gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-2 shadow-sm">
          <p className="font-medium">{label || payload[0].name}</p>
          <p>Quantidade: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  // Carregar dados quando o componente montar
  useEffect(() => {
    fetchTestAnalyses();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push('/ambiente-teste')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Dashboard de Teste</h1>
          <Badge variant="outline" className="text-yellow-600 bg-yellow-100/50">
            Ambiente de Teste
          </Badge>
        </div>
        
        <Button 
          variant="outline"
          disabled={isLoading}
          onClick={fetchTestAnalyses}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando dados de teste...</p>
        </div>
      ) : analyses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum dado disponível</CardTitle>
            <CardDescription>
              Você ainda não importou nenhum dado no ambiente de teste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground mb-4">
                Importe alguns dados de exemplo para visualizar o dashboard de teste.
              </p>
              <Button 
                onClick={() => router.push('/import')}
              >
                Ir para importação
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Total de Feedbacks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalFeedbacks}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Sentimento Positivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.positivePercentage}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Sentimento Negativo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.negativePercentage}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Total de Análises</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalAnalyses}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Gráficos */}
          <Tabs defaultValue="ratings" className="space-y-6">
            <TabsList>
              <TabsTrigger value="ratings">Avaliações</TabsTrigger>
              <TabsTrigger value="sources">Fontes</TabsTrigger>
              <TabsTrigger value="languages">Idiomas</TabsTrigger>
              <TabsTrigger value="problems">Problemas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ratings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Avaliações</CardTitle>
                  <CardDescription>
                    Distribuição das avaliações por número de estrelas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.ratingDistribution}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#8884d8">
                          {stats.ratingDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Principais Fontes</CardTitle>
                  <CardDescription>
                    Distribuição dos feedbacks por fonte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.sourceDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.sourceDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="languages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Idiomas</CardTitle>
                  <CardDescription>
                    Distribuição dos feedbacks por idioma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.languageDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.languageDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="problems" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Principais Problemas</CardTitle>
                  <CardDescription>
                    Problemas mais mencionados nos feedbacks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.problemDistribution}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 100, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#8884d8">
                          {stats.problemDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Lista de análises */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Análises de Teste Importadas</CardTitle>
              <CardDescription>
                Lista de todas as análises importadas no ambiente de teste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{analysis.hotelName || 'Hotel não especificado'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {analysis.data?.length || 0} feedbacks • Importado em{' '}
                            {analysis.importDate?.toDate
                              ? new Intl.DateTimeFormat('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }).format(analysis.importDate.toDate())
                              : 'Data desconhecida'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/history/${analysis.id}`)}
                        >
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Adicionar o componente de dashboard para ambiente de teste, protegido por RequireAdmin
export default function TestDashboard() {
  return (
    <RequireAdmin>
      <SharedDashboardLayout>
        <TestDashboardContent />
      </SharedDashboardLayout>
    </RequireAdmin>
  );
} 