"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Tag,
  Building2,
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Network,
  Eye,
  ChevronRight,
  Star,
  Users,
  Calendar,
  MapPin,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { ModernChart } from "@/components/modern-charts";

// Interfaces para tipagem
interface KeywordRelation {
  keyword: string;
  count: number;
  departments: Array<{
    name: string;
    count: number;
    percentage: number;
    problems: Array<{
      name: string;
      count: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      averageRating: number;
    }>;
  }>;
  totalFeedbacks: number;
  averageRating: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  monthlyTrend: Array<{
    month: string;
    count: number;
  }>;
  topHotels: Array<{
    name: string;
    count: number;
  }>;
}

interface EnhancedKeywordRelationsProps {
  feedbacks: any[];
  selectedKeyword?: string;
  onKeywordSelect?: (keyword: string) => void;
  onViewFeedbacks?: (filters: any) => void;
}

/**
 * Componente avançado para visualizar relações entre palavras-chave, departamentos e problemas
 * com design moderno e funcionalidades interativas
 */
export const EnhancedKeywordRelations: React.FC<EnhancedKeywordRelationsProps> = ({
  feedbacks,
  selectedKeyword,
  onKeywordSelect,
  onViewFeedbacks
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'count' | 'rating' | 'sentiment'>('count');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterHotel, setFilterHotel] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [minOccurrences, setMinOccurrences] = useState<number>(1);
  const [selectedRelation, setSelectedRelation] = useState<KeywordRelation | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Processar dados para extrair relações entre palavras-chave, departamentos e problemas
  const keywordRelations = useMemo(() => {
    const relations = new Map<string, KeywordRelation>();

    feedbacks.forEach(feedback => {
      if (!feedback.keyword || feedback.keyword.trim() === '' || 
          feedback.keyword.toLowerCase().includes('não identificado')) {
        return;
      }

      const keywords = feedback.keyword.split(';').map((k: string) => k.trim()).filter(Boolean);
      const departments = feedback.sector ? 
        feedback.sector.split(';').map((d: string) => d.trim()).filter(Boolean) : 
        (feedback.department ? feedback.department.split(';').map((d: string) => d.trim()).filter(Boolean) : ['Não especificado']);
      const problems = feedback.problem ? 
        feedback.problem.split(';').map((p: string) => p.trim()).filter(Boolean) : ['Não especificado'];

      keywords.forEach((keyword: string) => {
        if (!relations.has(keyword)) {
          relations.set(keyword, {
            keyword,
            count: 0,
            departments: [],
            totalFeedbacks: 0,
            averageRating: 0,
            sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
            monthlyTrend: [],
            topHotels: []
          });
        }

        const relation = relations.get(keyword)!;
        relation.count++;
        relation.totalFeedbacks++;

        // Processar departamentos e problemas
        departments.forEach((dept: string) => {
          let deptData = relation.departments.find(d => d.name === dept);
          if (!deptData) {
            deptData = { name: dept, count: 0, percentage: 0, problems: [] };
            relation.departments.push(deptData);
          }
          deptData.count++;

          // Processar problemas dentro do departamento
          problems.forEach((problem: string) => {
            let problemData = deptData!.problems.find(p => p.name === problem);
            if (!problemData) {
              problemData = {
                name: problem,
                count: 0,
                sentiment: 'neutral' as const,
                averageRating: 0
              };
              deptData!.problems.push(problemData);
            }
            problemData.count++;
            problemData.averageRating = (problemData.averageRating * (problemData.count - 1) + feedback.rating) / problemData.count;
            
            // Determinar sentimento baseado na avaliação
            if (feedback.rating >= 4) problemData.sentiment = 'positive';
            else if (feedback.rating <= 2) problemData.sentiment = 'negative';
            else problemData.sentiment = 'neutral';
          });
        });

        // Atualizar distribuição de sentimentos
        if (feedback.sentiment === 'positive' || feedback.rating >= 4) {
          relation.sentimentDistribution.positive++;
        } else if (feedback.sentiment === 'negative' || feedback.rating <= 2) {
          relation.sentimentDistribution.negative++;
        } else {
          relation.sentimentDistribution.neutral++;
        }

        // Atualizar avaliação média
        relation.averageRating = (relation.averageRating * (relation.count - 1) + feedback.rating) / relation.count;
      });
    });

    // Calcular percentuais dos departamentos
    relations.forEach(relation => {
      relation.departments.forEach(dept => {
        dept.percentage = (dept.count / relation.totalFeedbacks) * 100;
        // Ordenar problemas por contagem
        dept.problems.sort((a, b) => b.count - a.count);
      });
      // Ordenar departamentos por contagem
      relation.departments.sort((a, b) => b.count - a.count);
    });

    return Array.from(relations.values());
  }, [feedbacks]);

  // Filtrar e ordenar relações com filtros avançados
  const filteredRelations = useMemo(() => {
    let filtered = keywordRelations.filter(relation => {
      // Filtro de busca
      const matchesSearch = relation.keyword.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de departamento
      const matchesDepartment = filterDepartment === 'all' || 
        relation.departments.some(dept => dept.name === filterDepartment);
      
      // Filtro de avaliação
      const matchesRating = filterRating === 'all' || 
        (filterRating === '5' && relation.averageRating >= 4.5) ||
        (filterRating === '4' && relation.averageRating >= 3.5 && relation.averageRating < 4.5) ||
        (filterRating === '3' && relation.averageRating >= 2.5 && relation.averageRating < 3.5) ||
        (filterRating === '2' && relation.averageRating >= 1.5 && relation.averageRating < 2.5) ||
        (filterRating === '1' && relation.averageRating < 1.5);
      
      // Filtro de sentimento
      const matchesSentiment = filterSentiment === 'all' ||
        (filterSentiment === 'positive' && relation.sentimentDistribution.positive > relation.sentimentDistribution.negative) ||
        (filterSentiment === 'negative' && relation.sentimentDistribution.negative > relation.sentimentDistribution.positive) ||
        (filterSentiment === 'neutral' && relation.sentimentDistribution.neutral >= relation.sentimentDistribution.positive && relation.sentimentDistribution.neutral >= relation.sentimentDistribution.negative);
      
      // Filtro de hotel (baseado nos feedbacks originais)
      const matchesHotel = filterHotel === 'all' || 
        feedbacks.some(f => f.hotel === filterHotel && f.keyword && f.keyword.includes(relation.keyword));
      
      // Filtro de período (últimos 30, 60, 90 dias)
      const matchesPeriod = filterPeriod === 'all' || (() => {
        const now = new Date();
        const daysAgo = parseInt(filterPeriod);
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return feedbacks.some(f => {
          const feedbackDate = new Date(f.date);
          return feedbackDate >= cutoffDate && f.keyword && f.keyword.includes(relation.keyword);
        });
      })();
      
      // Filtro de ocorrências mínimas
      const matchesMinOccurrences = relation.count >= minOccurrences;
      
      return matchesSearch && matchesDepartment && matchesRating && 
             matchesSentiment && matchesHotel && matchesPeriod && matchesMinOccurrences;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'sentiment':
          return b.sentimentDistribution.positive - a.sentimentDistribution.positive;
        default:
          return b.count - a.count;
      }
    });

    return filtered;
  }, [keywordRelations, searchTerm, sortBy, filterDepartment, filterRating, filterSentiment, filterHotel, filterPeriod, minOccurrences, feedbacks]);

  // Obter listas únicas para filtros
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    keywordRelations.forEach(relation => {
      relation.departments.forEach(dept => depts.add(dept.name));
    });
    return Array.from(depts).sort();
  }, [keywordRelations]);

  const allHotels = useMemo(() => {
    const hotels = new Set<string>();
    feedbacks.forEach(feedback => {
      if (feedback.hotel) hotels.add(feedback.hotel);
    });
    return Array.from(hotels).sort();
  }, [feedbacks]);

  // Função para obter cor do sentimento
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  // Função para renderizar estrelas
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com filtros */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            Relações Palavras-chave → Departamentos → Problemas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros básicos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar palavra-chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por departamento */}
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {allDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ordenação */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Mais frequentes</SelectItem>
                <SelectItem value="rating">Melhor avaliação</SelectItem>
                <SelectItem value="sentiment">Mais positivos</SelectItem>
              </SelectContent>
            </Select>

            {/* Botão filtros avançados */}
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
            </Button>
          </div>

          {/* Filtros avançados (expansível) */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
              {/* Filtro de avaliação */}
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Avaliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as avaliações</SelectItem>
                  <SelectItem value="5">4.5+ estrelas</SelectItem>
                  <SelectItem value="4">3.5-4.4 estrelas</SelectItem>
                  <SelectItem value="3">2.5-3.4 estrelas</SelectItem>
                  <SelectItem value="2">1.5-2.4 estrelas</SelectItem>
                  <SelectItem value="1">Menos de 1.5</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro de sentimento */}
              <Select value={filterSentiment} onValueChange={setFilterSentiment}>
                <SelectTrigger>
                  <SelectValue placeholder="Sentimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sentimentos</SelectItem>
                  <SelectItem value="positive">Predominantemente positivo</SelectItem>
                  <SelectItem value="neutral">Predominantemente neutro</SelectItem>
                  <SelectItem value="negative">Predominantemente negativo</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro de hotel */}
              <Select value={filterHotel} onValueChange={setFilterHotel}>
                <SelectTrigger>
                  <SelectValue placeholder="Hotel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os hotéis</SelectItem>
                  {allHotels.map(hotel => (
                    <SelectItem key={hotel} value={hotel}>{hotel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro de período */}
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>

              {/* Ocorrências mínimas */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Min. ocorrências</label>
                <Input
                  type="number"
                  min="1"
                  value={minOccurrences}
                  onChange={(e) => setMinOccurrences(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>

              {/* Botão limpar filtros */}
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterRating('all');
                  setFilterSentiment('all');
                  setFilterHotel('all');
                  setFilterPeriod('all');
                  setMinOccurrences(1);
                  setFilterDepartment('all');
                  setSearchTerm('');
                }}
                className="self-end"
              >
                Limpar Filtros
              </Button>
            </div>
          )}

          {/* Estatísticas */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {filteredRelations.length} palavras-chave encontradas
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {filteredRelations.reduce((sum, rel) => sum + rel.count, 0)} ocorrências totais
              </span>
            </div>
            {showAdvancedFilters && (
              <Badge variant="secondary">
                Filtros avançados ativos
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de relações */}
      <div className="grid gap-4">
        {filteredRelations.map((relation, index) => (
          <Card key={relation.keyword} className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Cabeçalho da palavra-chave */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{relation.keyword}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {relation.count} ocorrências
                        </span>
                        <span className="flex items-center gap-1">
                          {renderStars(relation.averageRating)}
                          <span className="ml-1">{relation.averageRating.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Badges de sentimento */}
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      {relation.sentimentDistribution.positive} positivos
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      {relation.sentimentDistribution.negative} negativos
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRelation(selectedRelation?.keyword === relation.keyword ? null : relation)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedRelation?.keyword === relation.keyword ? 'Ocultar' : 'Ver Detalhes'}
                    </Button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {selectedRelation?.keyword === relation.keyword && (
                  <div className="mt-6 space-y-6 border-t pt-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="departments">Departamentos</TabsTrigger>
                        <TabsTrigger value="problems">Problemas</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Gráfico de sentimentos */}
                          <Card className="p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Distribuição de Sentimentos
                            </h4>
                            <div className="h-48">
                              <ModernChart
                                type="pie"
                                data={[
                                  { label: 'Positivo', value: relation.sentimentDistribution.positive },
                                  { label: 'Neutro', value: relation.sentimentDistribution.neutral },
                                  { label: 'Negativo', value: relation.sentimentDistribution.negative }
                                ].filter(item => item.value > 0)}
                              />
                            </div>
                          </Card>

                          {/* Gráfico de departamentos */}
                          <Card className="p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Distribuição por Departamento
                            </h4>
                            <div className="h-48">
                              <ModernChart
                                type="bar"
                                data={relation.departments.slice(0, 5).map(dept => ({
                                  label: dept.name,
                                  value: dept.count
                                }))}
                              />
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="departments" className="space-y-4">
                        <div className="grid gap-4">
                          {relation.departments.map((dept, deptIndex) => (
                            <Card key={dept.name} className="p-4 border-l-4 border-l-blue-500">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                  <span className="font-semibold">{dept.name}</span>
                                  <Badge variant="secondary">{dept.count} ocorrências</Badge>
                                  <Badge variant="outline">{dept.percentage.toFixed(1)}%</Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onViewFeedbacks?.({
                                    keyword: relation.keyword,
                                    department: dept.name
                                  })}
                                >
                                  Ver Feedbacks
                                </Button>
                              </div>
                              
                              {/* Problemas do departamento */}
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium text-muted-foreground">Principais Problemas:</h5>
                                <div className="grid gap-2">
                                  {dept.problems.slice(0, 3).map((problem, problemIndex) => (
                                    <div key={problem.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className={`h-3 w-3 ${
                                          problem.sentiment === 'positive' ? 'text-green-500' :
                                          problem.sentiment === 'negative' ? 'text-red-500' : 'text-yellow-500'
                                        }`} />
                                        <span className="text-sm">{problem.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">{problem.count}</Badge>
                                        <div className="flex items-center gap-1">
                                          {renderStars(problem.averageRating)}
                                          <span className="text-xs ml-1">{problem.averageRating.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="problems" className="space-y-4">
                        <div className="grid gap-3">
                          {relation.departments.flatMap(dept => 
                            dept.problems.map(problem => ({ ...problem, department: dept.name }))
                          )
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 10)
                          .map((problem, index) => (
                            <div key={`${problem.department}-${problem.name}`} 
                                 className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`p-1 rounded ${getSentimentColor(problem.sentiment)}`}>
                                  <AlertCircle className="h-3 w-3" />
                                </div>
                                <div>
                                  <div className="font-medium">{problem.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Departamento: {problem.department}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary">{problem.count} ocorrências</Badge>
                                <div className="flex items-center gap-1">
                                  {renderStars(problem.averageRating)}
                                  <span className="text-sm ml-1">{problem.averageRating.toFixed(1)}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onViewFeedbacks?.({
                                    keyword: relation.keyword,
                                    department: problem.department,
                                    problem: problem.name
                                  })}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRelations.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Search className="h-8 w-8" />
            <p>Nenhuma palavra-chave encontrada com os filtros aplicados.</p>
          </div>
        </Card>
      )}
    </div>
  );
};