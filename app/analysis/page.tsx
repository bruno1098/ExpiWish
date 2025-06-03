"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getFeedbacks, type Feedback } from "@/lib/feedback"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  Copy, 
  Star, 
  Filter, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  BarChart3,
  Calendar,
  Search,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react"
import { useSearchParams } from 'next/navigation'
import { getAnalysisById } from '@/lib/firestore-service'
import SharedDashboardLayout from "../shared-layout"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Mapa de cores para sentimentos
const sentimentColors = {
  positive: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400",
  neutral: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400",
  negative: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"
}

// Mapa de ícones para avaliações
const ratingIcons: Record<number, string> = {
  1: "⭐",
  2: "⭐⭐",
  3: "⭐⭐⭐",
  4: "⭐⭐⭐⭐",
  5: "⭐⭐⭐⭐⭐"
}

const sentimentBadges = {
  positive: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800",
  neutral: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
  negative: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800"
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => (
  <Badge variant="outline" className={cn(
    "px-3 py-1 rounded-full text-sm font-medium border",
    sentimentBadges[sentiment as keyof typeof sentimentBadges]
  )}>
    {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro'}
  </Badge>
)

// Definir mapeamento de departamentos para cores
const sectorColors: Record<string, string> = {
  'A&B': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 border-blue-300 dark:border-blue-800',
  'Governança': 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 border-red-300 dark:border-red-800',
  'Manutenção': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Lazer': 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-200 border-green-300 dark:border-green-800',
  'TI': 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-200 border-purple-300 dark:border-purple-800',
  'Operações': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
  'Produto': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
  'Marketing': 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-200 border-pink-300 dark:border-pink-800',
  'Comercial': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800'
};

// Função para obter a cor com base no departamento
const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
};

// Componente para badges de palavra-chave
const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  const colorClass = getSectorColor(sector);
  
  return (
    <Badge variant="outline" className={cn(
      "text-sm px-2 py-1 rounded-full border font-medium",
      colorClass
    )}>
      {keyword}
    </Badge>
  );
};

// Definir uma interface para o tipo de análise
interface Analysis {
  id: string;
  hotelName?: string;
  importDate?: any;
  data?: Feedback[];
  analysis?: any;
  [key: string]: any;
}

// Componente de estatísticas resumidas
const StatsCard = ({ icon: Icon, title, value, change, color }: {
  icon: any;
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  color: string;
}) => (
  <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            change.positive ? "text-green-600" : "text-red-600"
          )}>
            {change.positive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>{Math.abs(change.value)}%</span>
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-full", color)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </Card>
);

// Componente para Modal de Comentário Completo
const CommentModal = ({ feedback }: { feedback: Feedback }) => {
  const { toast } = useToast()
  
  const copyComment = () => {
    navigator.clipboard.writeText(feedback.comment)
    toast({
      title: "Comentário Copiado",
      description: "O comentário foi copiado para a área de transferência.",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Detalhes do Feedback - {feedback.rating} estrelas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Data</p>
              <p className="text-sm text-foreground">{formatDate(feedback.date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Avaliação</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{ratingIcons[feedback.rating] || "N/A"}</span>
                <span className="text-sm text-foreground font-medium">{feedback.rating}/5</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Sentimento</p>
              <SentimentBadge sentiment={feedback.sentiment} />
            </div>
          </div>

          {/* Comentário Principal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Comentário</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyComment}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
            <div className="p-4 bg-background border-2 border-border rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {feedback.comment}
              </p>
            </div>
          </div>

          {/* Análise IA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Departamento</h4>
              <div className="flex flex-wrap gap-1">
                {feedback.sector.split(';').map((sector, index) => (
                  <Badge 
                    key={index} 
                    variant="outline"
                    className={cn("text-sm border font-medium", getSectorColor(sector.trim()))}
                  >
                    {sector.trim()}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Palavras-chave</h4>
              <div className="flex flex-wrap gap-1">
                {feedback.keyword.split(';').map((kw, index) => {
                  const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                  return <KeywordBadge key={index} keyword={kw.trim()} sector={sector} />;
                })}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Problemas</h4>
              <div className="flex flex-wrap gap-1">
                {feedback.problem ? (
                  feedback.problem.split(';').map((problem, index) => {
                    const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                    return (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className={cn("text-sm border font-medium", getSectorColor(sector))}
                      >
                        {problem.trim()}
                      </Badge>
                    );
                  })
                ) : (
                  <Badge variant="outline" className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-800">
                    Sem problemas
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          {(feedback.source || feedback.language || feedback.apartamento) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              {feedback.source && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Fonte</p>
                  <p className="text-sm text-foreground">{feedback.source}</p>
                </div>
              )}
              {feedback.language && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Idioma</p>
                  <p className="text-sm text-foreground">{feedback.language}</p>
                </div>
              )}
              {feedback.apartamento && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Apartamento</p>
                  <p className="text-sm text-foreground">{feedback.apartamento}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AnalysisPage() {
  return (
    <SharedDashboardLayout>
      <AnalysisPageContent />
    </SharedDashboardLayout>
  );
}

function AnalysisPageContent() {
  // Estados principais
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [keywordFilter, setKeywordFilter] = useState("all")
  const [problemFilter, setProblemFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { toast } = useToast()

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedFeedbacks = localStorage.getItem('analysis-feedbacks')
        const storedAnalysis = localStorage.getItem('analysis-data')
        const storedFilters = localStorage.getItem('analysis-filters')
        
        if (storedFeedbacks) {
          const parsedFeedbacks = JSON.parse(storedFeedbacks)
          setFeedbacks(parsedFeedbacks)
          console.log('📂 Dados carregados do localStorage:', parsedFeedbacks.length, 'feedbacks')
        }
        
        if (storedAnalysis) {
          setAnalysis(JSON.parse(storedAnalysis))
        }
        
        if (storedFilters) {
          const filters = JSON.parse(storedFilters)
          setSentimentFilter(filters.sentiment || "all")
          setSectorFilter(filters.sector || "all")
          setKeywordFilter(filters.keyword || "all")
          setProblemFilter(filters.problem || "all")
          setDateFilter(filters.date || "")
          setSearchTerm(filters.search || "")
        }
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error)
      }
    }

    loadStoredData()
    setLoading(false)
  }, [])

  // Salvar filtros no localStorage quando mudam
  useEffect(() => {
    const filters = {
      sentiment: sentimentFilter,
      sector: sectorFilter,
      keyword: keywordFilter,
      problem: problemFilter,
      date: dateFilter,
      search: searchTerm
    }
    localStorage.setItem('analysis-filters', JSON.stringify(filters))
  }, [sentimentFilter, sectorFilter, keywordFilter, problemFilter, dateFilter, searchTerm])

  // Carregar análise específica se houver ID
  useEffect(() => {
    const loadAnalysis = async () => {
      if (id) {
        try {
          setLoading(true)
          const data = await getAnalysisById(id) as Analysis
          if (data && data.data) {
            setFeedbacks(data.data)
            setAnalysis(data)
            
            // Salvar no localStorage
            localStorage.setItem('analysis-feedbacks', JSON.stringify(data.data))
            localStorage.setItem('analysis-data', JSON.stringify(data))
            
            toast({
              title: "Análise Carregada",
              description: `${data.data.length} feedbacks carregados com sucesso`,
            })
          }
        } catch (error) {
          console.error('Erro ao carregar análise:', error)
          toast({
            title: "Erro",
            description: "Não foi possível carregar a análise",
            variant: "destructive"
          })
        } finally {
          setLoading(false)
        }
      }
    }

    if (id) {
      loadAnalysis()
    }
  }, [id, toast])

  // Aplicar filtros
  useEffect(() => {
    let filtered = feedbacks.filter((feedback) => {
      const matchesSentiment = sentimentFilter === "all" || feedback.sentiment === sentimentFilter
      const matchesSector = sectorFilter === "all" || feedback.sector.toLowerCase().includes(sectorFilter.toLowerCase())
      const matchesKeyword = keywordFilter === "all" || feedback.keyword.toLowerCase().includes(keywordFilter.toLowerCase())
      const matchesProblem = problemFilter === "all" || feedback.problem?.toLowerCase().includes(problemFilter.toLowerCase())
      const matchesDate = !dateFilter || feedback.date.includes(dateFilter)
      const matchesSearch = !searchTerm || feedback.comment.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSentiment && matchesSector && matchesKeyword && matchesProblem && matchesDate && matchesSearch
    })
    
    setFilteredFeedbacks(filtered)
  }, [feedbacks, sentimentFilter, sectorFilter, keywordFilter, problemFilter, dateFilter, searchTerm])

  // Calcular estatísticas
  const stats = {
    total: feedbacks.length,
    positive: feedbacks.filter(f => f.sentiment === 'positive').length,
    negative: feedbacks.filter(f => f.sentiment === 'negative').length,
    neutral: feedbacks.filter(f => f.sentiment === 'neutral').length,
    averageRating: feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1) : '0'
  }

  // Obter listas únicas para filtros
  const sectors = Array.from(new Set(feedbacks.flatMap(f => f.sector.split(';')).map(s => s.trim()).filter(Boolean)))
  const keywords = Array.from(new Set(feedbacks.flatMap(f => f.keyword.split(';')).map(k => k.trim()).filter(Boolean)))
  const problems = Array.from(new Set(feedbacks.flatMap(f => f.problem?.split(';') || []).map(p => p.trim()).filter(Boolean)))

  const clearFilters = () => {
    setSentimentFilter("all")
    setSectorFilter("all")
    setKeywordFilter("all")
    setProblemFilter("all")
    setDateFilter("")
    setSearchTerm("")
  }

  const exportData = () => {
    const dataStr = JSON.stringify(filteredFeedbacks, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `analise-feedbacks-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    toast({
      title: "Dados Exportados",
      description: `${filteredFeedbacks.length} feedbacks exportados com sucesso`,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Carregando análise...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <TooltipProvider>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Análise Detalhada
            </h1>
            <p className="text-muted-foreground mt-2">
              Explore e analise todos os feedbacks processados pela IA
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button 
              onClick={exportData}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={MessageSquare}
            title="Total de Feedbacks"
            value={stats.total}
            color="bg-blue-500"
          />
          <StatsCard
            icon={TrendingUp}
            title="Positivos"
            value={stats.positive}
            color="bg-green-500"
          />
          <StatsCard
            icon={Minus}
            title="Neutros"
            value={stats.neutral}
            color="bg-yellow-500"
          />
          <StatsCard
            icon={ArrowDown}
            title="Negativos"
            value={stats.negative}
            color="bg-red-500"
          />
          <StatsCard
            icon={Star}
            title="Média Geral"
            value={`${stats.averageRating}★`}
            color="bg-purple-500"
          />
        </div>

        {/* Filtros e Busca */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Filtros de Análise</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Busca por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos comentários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por sentimento */}
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sentimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os sentimentos</SelectItem>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="neutral">Neutro</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por departamento */}
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por palavra-chave */}
            <Select value={keywordFilter} onValueChange={setKeywordFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Palavra-chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as palavras-chave</SelectItem>
                {keywords.slice(0, 20).map((keyword) => (
                  <SelectItem key={keyword} value={keyword}>{keyword}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por problema */}
            <Select value={problemFilter} onValueChange={setProblemFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Problema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os problemas</SelectItem>
                {problems.slice(0, 20).map((problem) => (
                  <SelectItem key={problem} value={problem}>{problem}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por data */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Indicador de resultados filtrados */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando <strong>{filteredFeedbacks.length}</strong> de <strong>{feedbacks.length}</strong> feedbacks
            </span>
            {(sentimentFilter !== "all" || sectorFilter !== "all" || keywordFilter !== "all" || problemFilter !== "all" || dateFilter || searchTerm) && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Filtros ativos
              </Badge>
            )}
          </div>
        </Card>

        {/* Tabela de Feedbacks */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-none hover:bg-gradient-to-r hover:from-slate-900 hover:to-slate-800">
                  <TableHead className="font-semibold text-white">Data</TableHead>
                  <TableHead className="font-semibold text-white min-w-[300px]">Comentário</TableHead>
                  <TableHead className="font-semibold text-white">Avaliação</TableHead>
                  <TableHead className="font-semibold text-white">Sentimento</TableHead>
                  <TableHead className="font-semibold text-white">Departamento</TableHead>
                  <TableHead className="font-semibold text-white">Palavra-chave</TableHead>
                  <TableHead className="font-semibold text-white">Problema</TableHead>
                  <TableHead className="font-semibold text-white w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <MessageSquare className="h-12 w-12 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-medium text-muted-foreground">
                            Nenhum feedback encontrado
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {feedbacks.length === 0 
                              ? "Importe dados na página de Import para começar a análise"
                              : "Ajuste os filtros para ver mais resultados"
                            }
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeedbacks.map((feedback) => (
                    <TableRow key={feedback.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-sm font-medium">
                        {new Date(feedback.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <Tooltip>
                          <TooltipTrigger className="text-left cursor-pointer">
                            <p className="truncate text-sm leading-relaxed">
                              {feedback.comment.length > 40 
                                ? `${feedback.comment.substring(0, 40)}...` 
                                : feedback.comment
                              }
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Clique no ícone do olho para ver o comentário completo</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ratingIcons[feedback.rating] || "N/A"}</span>
                          <span className="text-sm font-medium">{feedback.rating}/5</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SentimentBadge sentiment={feedback.sentiment} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {feedback.sector.split(';').slice(0, 2).map((sector, index) => (
                            <Badge 
                              key={index} 
                              variant="outline"
                              className={cn("text-xs border", getSectorColor(sector.trim()))}
                            >
                              {sector.trim()}
                            </Badge>
                          ))}
                          {feedback.sector.split(';').length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{feedback.sector.split(';').length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {feedback.keyword.split(';').slice(0, 2).map((kw, index) => {
                            const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                            return <KeywordBadge key={index} keyword={kw.trim()} sector={sector} />;
                          })}
                          {feedback.keyword.split(';').length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{feedback.keyword.split(';').length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {feedback.problem ? (
                            feedback.problem.split(';').slice(0, 2).map((problem, index) => {
                              const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                              return (
                                <Badge 
                                  key={index} 
                                  variant="outline"
                                  className={cn("text-xs border", getSectorColor(sector))}
                                >
                                  {problem.trim()}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem problemas</span>
                          )}
                          {feedback.problem && feedback.problem.split(';').length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{feedback.problem.split(';').length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <CommentModal feedback={feedback} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </TooltipProvider>
    </div>
  )
}