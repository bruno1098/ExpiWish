'use client'

import React, { useState, useEffect, useMemo, useCallback, useReducer, memo } from "react"
import { useAuth } from "@/lib/auth-context"
import { getAllAnalyses } from "@/lib/firestore-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Feedback, Analysis } from "@/types"
import { formatDateBR, cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { DateRange } from "react-day-picker"
import { useSlideUpCounter } from "@/hooks/use-slide-up-counter"
import { ChevronLeft, ChevronRight, RefreshCw, Download, Filter, Search, Calendar, Star, TrendingUp, ArrowDown, Minus, MessageSquare, Edit, Trash2, Save, X, Copy, Eye, Clock, MapPin, User, Lightbulb, FileText, AlertTriangle, CheckCircle2, XCircle, Minus as MinusIcon } from "lucide-react"

// 🚀 PERFORMANCE: Helper function para split por delimiter
const splitByDelimiter = (str: string): string[] => {
  if (!str) return []
  return str.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
}

// 🚀 PERFORMANCE OPTIMIZATION: Reducer para gerenciar estados complexos
type FilterState = {
  sentiment: string;
  sector: string;
  keyword: string;
  problem: string;
  import: string;
  search: string;
  dateRange: DateRange | undefined;
  quickDate: string;
}

type FilterAction = 
  | { type: 'SET_SENTIMENT'; payload: string }
  | { type: 'SET_SECTOR'; payload: string }
  | { type: 'SET_KEYWORD'; payload: string }
  | { type: 'SET_PROBLEM'; payload: string }
  | { type: 'SET_IMPORT'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_DATE_RANGE'; payload: DateRange | undefined }
  | { type: 'SET_QUICK_DATE'; payload: string }
  | { type: 'CLEAR_ALL' }

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_SENTIMENT':
      return { ...state, sentiment: action.payload }
    case 'SET_SECTOR':
      return { ...state, sector: action.payload }
    case 'SET_KEYWORD':
      return { ...state, keyword: action.payload }
    case 'SET_PROBLEM':
      return { ...state, problem: action.payload }
    case 'SET_IMPORT':
      return { ...state, import: action.payload }
    case 'SET_SEARCH':
      return { ...state, search: action.payload }
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload }
    case 'SET_QUICK_DATE':
      return { ...state, quickDate: action.payload }
    case 'CLEAR_ALL':
      return {
        sentiment: 'all',
        sector: 'all',
        keyword: 'all',
        problem: 'all',
        import: 'all',
        search: '',
        dateRange: undefined,
        quickDate: 'all'
      }
    default:
      return state
  }
}

// 🚀 PERFORMANCE: Memo para stats card
const StatsCard = memo(({ icon: Icon, title, value, color, gradient }: {
  icon: any;
  title: string;
  value: number | string;
  color: string;
  gradient: string;
}) => {
  const numericValue = typeof value === 'number' ? value : 0
  const counterResult = useSlideUpCounter(numericValue, { duration: 1000 })
  const animatedValue = typeof counterResult === 'object' ? counterResult.value : counterResult
  
  return (
    <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <div className={`absolute inset-0 ${gradient} opacity-10`} />
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <div className={`p-3 ${gradient} rounded-xl shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? Math.round(animatedValue) : value}
          </p>
        </div>
      </CardHeader>
    </Card>
  )
})

// 🚀 PERFORMANCE: Virtualized feedback item com memo
const FeedbackItem = memo(({ 
  feedback, 
  onEdit, 
  onDelete,
  isEditing,
  isDeleting 
}: {
  feedback: Feedback;
  onEdit: (feedback: Feedback) => void;
  onDelete: (feedback: Feedback) => void;
  isEditing: boolean;
  isDeleting: boolean;
}) => {
  const getSentimentIcon = useCallback((sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'negative': return <XCircle className="h-4 w-4 text-red-600" />
      case 'neutral': return <MinusIcon className="h-4 w-4 text-yellow-600" />
      default: return null
    }
  }, [])

  const getSentimentColor = useCallback((sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200'
      case 'negative': return 'bg-red-100 text-red-800 border-red-200'  
      case 'neutral': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={getSentimentColor(feedback.sentiment)}>
                {getSentimentIcon(feedback.sentiment)}
                <span className="ml-1 capitalize">{feedback.sentiment}</span>
              </Badge>
              <Badge variant="outline">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                {feedback.rating}★
              </Badge>
              {feedback.sector && (
                <Badge variant="secondary">{feedback.sector}</Badge>
              )}
            </div>
            
            {feedback.keyword && (
              <div className="text-sm text-muted-foreground">
                <strong>Categoria:</strong> {feedback.keyword}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(feedback)}
              disabled={isEditing}
            >
              {isEditing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(feedback)}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{feedback.comment}</p>
          
          {feedback.problem && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Problema Identificado</p>
                  <p className="text-sm text-amber-700">{feedback.problem}</p>
                </div>
              </div>
            </div>
          )}

          {feedback.has_suggestion && feedback.suggestion_summary && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Sugestão</p>
                  <p className="text-sm text-blue-700">{feedback.suggestion_summary}</p>
                </div>
              </div>
            </div>
          )}

          {(feedback.compliments || feedback.positive_details) && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-800">Elogios e Aspectos Positivos</p>
                  {feedback.compliments && (
                    <div className="flex flex-wrap gap-1">
                      {feedback.compliments.split(";").filter(c => c.trim()).map((compliment, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                          <Star className="h-3 w-3 mr-1" />
                          {compliment.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {feedback.positive_details && (
                    <p className="text-sm text-green-700">{feedback.positive_details}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateBR(feedback.date)}
            </div>
            {feedback.source && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {feedback.source}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// 🚀 PERFORMANCE: Componente principal otimizado
export default function OptimizedAnalysisPage() {
  const { userData } = useAuth()
  const { toast } = useToast()
  
  // Estados básicos
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Estados de interação
  const [editingFeedbacks, setEditingFeedbacks] = useState<Set<string>>(new Set())
  const [deletingFeedbacks, setDeletingFeedbacks] = useState<Set<string>>(new Set())
  
  // Reducer para filtros
  const [filters, dispatchFilter] = useReducer(filterReducer, {
    sentiment: 'all',
    sector: 'all', 
    keyword: 'all',
    problem: 'all',
    import: 'all',
    search: '',
    dateRange: undefined,
    quickDate: 'all'
  })

  // 🚀 PERFORMANCE: Memoized filtered feedbacks com otimizações
  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks.length) return []
    
    return feedbacks.filter((feedback) => {
      // Early returns para performance
      if (feedback.deleted) return false
      
      if (filters.sentiment !== "all" && feedback.sentiment !== filters.sentiment) return false
      if (filters.sector !== "all" && !feedback.sector.toLowerCase().includes(filters.sector.toLowerCase())) return false
      if (filters.keyword !== "all" && !feedback.keyword.toLowerCase().includes(filters.keyword.toLowerCase())) return false
      if (filters.problem !== "all" && (!feedback.problem || !feedback.problem.toLowerCase().includes(filters.problem.toLowerCase()))) return false
      if (filters.import !== "all" && feedback.importId !== filters.import) return false
      if (filters.search && !feedback.comment.toLowerCase().includes(filters.search.toLowerCase())) return false
      
      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const feedbackDate = new Date(feedback.date)
        if (filters.dateRange.from && feedbackDate < filters.dateRange.from) return false
        if (filters.dateRange.to && feedbackDate > filters.dateRange.to) return false
      }
      
      return true
    }).sort((a, b) => {
      const dateA = new Date((a as any).importDate?.seconds ? (a as any).importDate.seconds * 1000 : (a as any).importDate || 0)
      const dateB = new Date((b as any).importDate?.seconds ? (b as any).importDate.seconds * 1000 : (b as any).importDate || 0)
      return dateB.getTime() - dateA.getTime()
    })
  }, [feedbacks, filters])

  // 🚀 PERFORMANCE: Memoized stats
  const stats = useMemo(() => ({
    total: filteredFeedbacks.length,
    positive: filteredFeedbacks.filter(f => f.sentiment === 'positive').length,
    negative: filteredFeedbacks.filter(f => f.sentiment === 'negative').length,
    neutral: filteredFeedbacks.filter(f => f.sentiment === 'neutral').length,
    averageRating: filteredFeedbacks.length > 0 
      ? (filteredFeedbacks.reduce((acc, f) => acc + f.rating, 0) / filteredFeedbacks.length).toFixed(1) 
      : '0'
  }), [filteredFeedbacks])

  // 🚀 PERFORMANCE: Memoized filter options
  const filterOptions = useMemo(() => ({
    sectors: Array.from(new Set(feedbacks.flatMap(f => splitByDelimiter(f.sector)))),
    keywords: Array.from(new Set(feedbacks.flatMap(f => splitByDelimiter(f.keyword)))),
    problems: Array.from(new Set(feedbacks.flatMap(f => splitByDelimiter(f.problem || '')))),
  }), [feedbacks])

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!userData?.uid) return
      
      let allFeedbacks: Feedback[] = []
      
      if (userData.role === 'admin') {
        const allAnalyses = await getAllAnalyses(undefined, false)
        setAnalyses(allAnalyses)
        
        allFeedbacks = allAnalyses.flatMap(analysis => 
          (analysis.data || []).map((feedback: any) => ({
            ...feedback,
            hotelId: analysis.hotelId,
            analysisId: analysis.id
          }))
        )
      } else {
        // Para staff, buscar apenas análises do próprio hotel
        const allAnalyses = await getAllAnalyses(undefined, false)
        const hotelAnalyses = allAnalyses.filter(analysis => analysis.hotelId === userData.hotelId)
        if (hotelAnalyses.length > 0) {
          setAnalyses(hotelAnalyses)
          allFeedbacks = hotelAnalyses.flatMap(analysis =>
            (analysis.data || []).map((feedback: any) => ({
              ...feedback,
              hotelId: analysis.hotelId,
              analysisId: analysis.id
            }))
          )
        }
      }
      
      setFeedbacks(allFeedbacks)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [userData, toast])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Event handlers com useCallback
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await loadData()
      toast({
        title: "Dados Atualizados",
        description: "Os dados foram recarregados com sucesso",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [loadData, toast])

  const handleEditFeedback = useCallback((feedback: Feedback) => {
    // Implementar edição otimizada
    setEditingFeedbacks(prev => new Set(prev).add(feedback.id))
    
    // Simular operação async
    setTimeout(() => {
      setEditingFeedbacks(prev => {
        const newSet = new Set(prev)
        newSet.delete(feedback.id)
        return newSet
      })
    }, 2000)
  }, [])

  const handleDeleteFeedback = useCallback((feedback: Feedback) => {
    setDeletingFeedbacks(prev => new Set(prev).add(feedback.id))
    
    // Simular operação async
    setTimeout(() => {
      setDeletingFeedbacks(prev => {
        const newSet = new Set(prev)
        newSet.delete(feedback.id)
        return newSet
      })
      
      // Remove feedback da lista
      setFeedbacks(prev => prev.filter(f => f.id !== feedback.id))
      
      toast({
        title: "Feedback Removido",
        description: "O feedback foi removido com sucesso",
      })
    }, 1500)
  }, [toast])

  const clearFilters = useCallback(() => {
    dispatchFilter({ type: 'CLEAR_ALL' })
  }, [])

  const exportData = useCallback(() => {
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
  }, [filteredFeedbacks, toast])

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
    <div className="p-4 space-y-6 w-full min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Análise Detalhada (Otimizada)
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
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
            variant="outline"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Atualizar
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          icon={MessageSquare}
          title="Total de Feedbacks"
          value={stats.total}
          color="bg-blue-500"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatsCard
          icon={TrendingUp}
          title="Positivos"
          value={stats.positive}
          color="bg-green-500"
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatsCard
          icon={Minus}
          title="Neutros"
          value={stats.neutral}
          color="bg-yellow-500"
          gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
        />
        <StatsCard
          icon={ArrowDown}
          title="Negativos"
          value={stats.negative}
          color="bg-red-500"
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
        />
        <StatsCard
          icon={Star}
          title="Média Geral"
          value={`${stats.averageRating}★`}
          color="bg-purple-500"
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
        />
      </div>

      {/* Filters */}
      <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Filtros de Análise</h3>
              <p className="text-sm text-gray-600">Refine sua busca para encontrar insights específicos</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                Buscar Comentários
              </label>
              <Input
                placeholder="Digite sua busca..."
                value={filters.search}
                onChange={(e) => dispatchFilter({ type: 'SET_SEARCH', payload: e.target.value })}
                className="bg-white/80"
              />
            </div>

            {/* Sentiment Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Sentimento</label>
              <Select
                value={filters.sentiment}
                onValueChange={(value) => dispatchFilter({ type: 'SET_SENTIMENT', payload: value })}
              >
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="positive">Positivo</SelectItem>
                  <SelectItem value="neutral">Neutro</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sector Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Setor</label>
              <Select
                value={filters.sector}
                onValueChange={(value) => dispatchFilter({ type: 'SET_SECTOR', payload: value })}
              >
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Keyword Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Palavra-chave</label>
              <Select
                value={filters.keyword}
                onValueChange={(value) => dispatchFilter({ type: 'SET_KEYWORD', payload: value })}
              >
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filterOptions.keywords.map((keyword) => (
                    <SelectItem key={keyword} value={keyword}>
                      {keyword}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Resultados ({filteredFeedbacks.length})
          </h2>
        </div>

        <div className="grid gap-4">
          {filteredFeedbacks.map((feedback) => (
            <FeedbackItem
              key={feedback.id}
              feedback={feedback}
              onEdit={handleEditFeedback}
              onDelete={handleDeleteFeedback}
              isEditing={editingFeedbacks.has(feedback.id)}
              isDeleting={deletingFeedbacks.has(feedback.id)}
            />
          ))}
        </div>

        {filteredFeedbacks.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum feedback encontrado
            </h3>
            <p className="text-gray-500">
              Tente ajustar os filtros para encontrar os feedbacks desejados.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
