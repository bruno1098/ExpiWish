"use client";

import { useState, useEffect } from "react";
import { RequireAdmin } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  Monitor, 
  Zap,
  Eye,
  Building,
  Calendar,
  Gauge,
  RefreshCw,
  Download,
  Filter
} from "lucide-react";
import { analyticsService, AnalyticsStats } from "@/lib/analytics-service";
import { useWebVitals } from "@/hooks/use-web-vitals";
import { devPerf } from "@/lib/dev-logger";

// Cores para gráficos
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { vitalsStats, getMetricRating, clearHistory } = useWebVitals();

  // Carregar dados de analytics
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      devPerf(`📊 Carregando analytics para ${selectedPeriod} dias...`);
      const analyticsData = await analyticsService.getAnalyticsStats(selectedPeriod);
      setStats(analyticsData);
      setLastUpdate(new Date());
      devPerf('✅ Analytics carregados:', analyticsData);
    } catch (error) {
      devPerf('❌ Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  // Função para formatar tempo
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Função para formatar duração de sessão
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Obter cor da métrica
  const getMetricColor = (rating: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
      case 'good': return 'text-green-400';
      case 'needs-improvement': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
    }
  };

  // Preparar dados para gráfico de Web Vitals
  const webVitalsChartData = [
    { name: 'LCP', atual: vitalsStats.current.lcp || 0, média: vitalsStats.average.lcp || 0, limite: 2500 },
    { name: 'FID', atual: vitalsStats.current.fid || 0, média: vitalsStats.average.fid || 0, limite: 100 },
    { name: 'CLS', atual: (vitalsStats.current.cls || 0) * 1000, média: (vitalsStats.average.cls || 0) * 1000, limite: 100 },
    { name: 'FCP', atual: vitalsStats.current.fcp || 0, média: vitalsStats.average.fcp || 0, limite: 1800 },
    { name: 'TTFB', atual: vitalsStats.current.ttfb || 0, média: vitalsStats.average.ttfb || 0, limite: 800 }
  ];

  if (loading) {
    return (
      <RequireAdmin>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400">Carregando analytics...</p>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Analytics & Performance
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Monitoramento de performance e análise de uso da plataforma
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Seletor de período */}
              <div className="flex gap-2">
                {[7, 30, 90].map(period => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period} dias
                  </Button>
                ))}
              </div>
              
              <Button onClick={loadAnalytics} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Última atualização */}
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Última atualização: {lastUpdate.toLocaleString('pt-BR')}
          </div>

          {/* Tabs principais */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              
              {/* Cards de métricas principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
                    <Activity className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats?.totalAccess.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Últimos {selectedPeriod} dias
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
                    <Users className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats?.uniqueUsers || 0}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Usuários diferentes
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatDuration(stats?.averageSessionTime || 0)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Por sessão
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance Geral</CardTitle>
                    <Gauge className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatTime(stats?.performanceAverages.lcp || 0)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      LCP médio
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Acessos diários */}
                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Acessos Diários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={stats?.dailyAccess || []}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Distribuição por tipo de usuário */}
                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-500" />
                      Distribuição de Usuários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Administradores', value: stats?.userDistribution.admin || 0 },
                            { name: 'Colaboradores', value: stats?.userDistribution.staff || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[0, 1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Top páginas e hotéis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Páginas mais acessadas */}
                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-500" />
                      Páginas Mais Acessadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats?.topPages.slice(0, 5).map((page, index) => (
                        <div key={page.page} className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium text-sm">{page.page}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{page.views} visualizações</div>
                            <div className="text-xs text-slate-500">
                              {formatTime(page.avgLoadTime)} média
                            </div>
                          </div>
                        </div>
                      )) || <p className="text-slate-500 text-center py-4">Nenhum dado disponível</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Acessos por hotel */}
                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-indigo-500" />
                      Acessos por Hotel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats?.hotelDistribution.slice(0, 5).map((hotel, index) => (
                        <div key={hotel.hotelName} className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium text-sm">{hotel.hotelName}</span>
                          </div>
                          <div className="text-sm font-semibold">
                            {hotel.accessCount} acessos
                          </div>
                        </div>
                      )) || <p className="text-slate-500 text-center py-4">Nenhum dado disponível</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Performance */}
            <TabsContent value="performance" className="space-y-6">
              
              {/* Web Vitals atuais */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { name: 'LCP', value: vitalsStats.current.lcp, label: 'Maior Renderização de Conteúdo' },
                  { name: 'FID', value: vitalsStats.current.fid, label: 'Atraso da Primeira Interação' },
                  { name: 'CLS', value: vitalsStats.current.cls, label: 'Mudança Cumulativa de Layout' },
                  { name: 'FCP', value: vitalsStats.current.fcp, label: 'Primeira Renderização de Conteúdo' },
                  { name: 'TTFB', value: vitalsStats.current.ttfb, label: 'Tempo até o Primeiro Byte' }
                ].map(metric => {
                  const rating = getMetricRating(metric.name, metric.value);
                  return (
                    <Card key={metric.name} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getMetricColor(rating)}`}>
                          {metric.value ? (
                            metric.name === 'CLS' ? 
                              (metric.value * 1000).toFixed(0) + 'ms' : 
                              formatTime(metric.value)
                          ) : '-'}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {metric.label}
                        </p>
                        <Badge 
                          variant={rating === 'good' ? 'default' : rating === 'needs-improvement' ? 'secondary' : 'destructive'}
                          className="mt-2 text-xs"
                        >
                          {rating === 'good' ? 'Bom' : rating === 'needs-improvement' ? 'Regular' : 'Ruim'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Gráfico de Web Vitals */}
              <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Métricas de Performance - Atual vs Média vs Limite
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={webVitalsChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [formatTime(Number(value)), name]} />
                      <Bar dataKey="atual" fill="#3b82f6" name="Atual" />
                      <Bar dataKey="média" fill="#10b981" name="Média" />
                      <Bar dataKey="limite" fill="#ef4444" name="Limite" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Estatísticas de Web Vitals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Histórico de Medições</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Total de medições:</span>
                        <span className="font-semibold">{vitalsStats.count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Última atualização:</span>
                        <span className="font-semibold text-xs">
                          {new Date(vitalsStats.current.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <Button 
                        onClick={clearHistory} 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        Limpar Histórico
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Performance do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Tempo médio de carregamento:</span>
                        <span className="font-semibold">
                          {formatTime(stats?.performanceAverages.loadTime || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">LCP médio:</span>
                        <span className="font-semibold">
                          {formatTime(stats?.performanceAverages.lcp || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">TTFB médio:</span>
                        <span className="font-semibold">
                          {formatTime(stats?.performanceAverages.ttfb || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Usuários */}
            <TabsContent value="users" className="space-y-6">
              <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Análise de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                      Análise detalhada de usuários em desenvolvimento...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Tempo Real */}
            <TabsContent value="realtime" className="space-y-6">
              <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Monitoramento em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
                      <div className="text-2xl font-bold text-green-500">
                        {vitalsStats.current.lcp ? '🟢' : '🔴'}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Status LCP</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
                      <div className="text-2xl font-bold">
                        {analyticsService.getCurrentSession().duration < 300000 ? '🟢' : '🟡'}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Sessão Ativa</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
                      <div className="text-2xl font-bold text-blue-500">
                        {formatDuration(analyticsService.getCurrentSession().duration)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Duração da Sessão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RequireAdmin>
  );
} 