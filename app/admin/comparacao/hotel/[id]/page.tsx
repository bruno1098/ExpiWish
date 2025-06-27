"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { ArrowLeft, Hotel, Star, MessageSquare, AlertTriangle, Users, TrendingUp, Calendar, MapPin, Eye, ChevronDown, ChevronUp, Filter, ThumbsUp, ThumbsDown, Minus, Building2, Tag } from "lucide-react"
import { getAllAnalyses } from "@/lib/firestore-service"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useParams } from "next/navigation"
import dynamic from 'next/dynamic'
import type { Feedback, Analysis } from "@/types"
import { formatDateBR } from "@/lib/utils"

interface HotelDetailData {
  hotelId: string
  hotelName: string
  totalFeedbacks: number
  averageRating: number
  positiveSentiment: number
  negativeSentiment: number
  neutralSentiment: number
  problemCount: number
  topProblems: Array<{ name: string; count: number }>
  topSectors: Array<{ name: string; count: number }>
  topKeywords: Array<{ name: string; count: number }>
  apartmentDetails: Array<{ 
    apartment: string; 
    feedbacks: number; 
    avgRating: number; 
    problems: number;
    sentiment: string;
  }>
  monthlyTrend: Array<{ month: string; rating: number; feedbacks: number }>
  sourceDistribution: Array<{ source: string; count: number }>
  recentFeedbacks: Feedback[]
  positiveFeedbacks: Feedback[]
  negativeFeedbacks: Feedback[]
  neutralFeedbacks: Feedback[]
  lastUpdate: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

// Função helper para filtrar problemas válidos (igual ao dashboard)
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
    '',
    'não',
    'nao'
  ];
  
  return !invalidProblems.includes(normalizedProblem) && 
         !normalizedProblem.includes('vazio') &&
         !normalizedProblem.includes('sem problemas') &&
         normalizedProblem.length > 2; // Evitar problemas muito curtos
};

export default function HotelDetalhes() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const hotelId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [hotelData, setHotelData] = useState<HotelDetailData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [expandedComments, setExpandedComments] = useState<{[key: string]: boolean}>({})
  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')
  const [showAllComments, setShowAllComments] = useState(false)
  const [showProblemsDetail, setShowProblemsDetail] = useState(false)
  const [selectedProblemDetail, setSelectedProblemDetail] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (userData && mounted) {
      fetchHotelData()
    }
  }, [hotelId, userData, mounted])

  // Controlar scroll do body quando modal estiver aberto
  useEffect(() => {
    if (showProblemsDetail) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup quando componente desmontar
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showProblemsDetail])

  const fetchHotelData = async () => {
    if (!userData) return
    
    try {
      setLoading(true)
      
      // Se for admin, buscar todas as análises, senão filtrar por hotel
      const allAnalyses = userData?.role === 'admin' 
        ? await getAllAnalyses()
        : await getAllAnalyses(userData?.hotelId)
      
      if (!allAnalyses || allAnalyses.length === 0) {
        toast({
          title: "Nenhum Dado Encontrado",
          description: "Não há análises disponíveis para este hotel.",
          variant: "destructive"
        })
        return
      }

      // Filtrar análises para o hotel específico
      const hotelAnalyses = allAnalyses.filter((analysis: any) => 
        analysis.hotelId === hotelId || analysis.hotelName === hotelId
      )

      if (hotelAnalyses.length === 0) {
        toast({
          title: "Hotel Não Encontrado",
          description: "Não há dados disponíveis para este hotel.",
          variant: "destructive"
        })
        return
      }

      // Combinar todos os feedbacks do hotel
      let allFeedbacks: Feedback[] = []
      
      hotelAnalyses.forEach((analysis: any) => {
        if (analysis.data && Array.isArray(analysis.data)) {
          allFeedbacks = [...allFeedbacks, ...analysis.data]
        }
      })

      if (allFeedbacks.length === 0) {
        return
      }

      const hotelName = hotelAnalyses[0].hotelName || hotelId
      const totalFeedbacks = allFeedbacks.length
      const averageRating = allFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedbacks
      
      const sentimentCounts = allFeedbacks.reduce((acc, f) => {
        const sentiment = f.sentiment || 'neutral'
        acc[sentiment] = (acc[sentiment] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const positiveSentiment = Math.round((sentimentCounts.positive || 0) / totalFeedbacks * 100)
      const negativeSentiment = Math.round((sentimentCounts.negative || 0) / totalFeedbacks * 100)
      const neutralSentiment = Math.round((sentimentCounts.neutral || 0) / totalFeedbacks * 100)

      // Separar feedbacks por sentimento
      const positiveFeedbacks = allFeedbacks.filter(f => f.sentiment === 'positive')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const negativeFeedbacks = allFeedbacks.filter(f => f.sentiment === 'negative')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const neutralFeedbacks = allFeedbacks.filter(f => f.sentiment === 'neutral')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Processar problemas
      const problemCounts: Record<string, number> = {}
      allFeedbacks.forEach(f => {
        if (f.problem && f.problem.trim() !== '') {
          // Dividir múltiplos problemas separados por ';'
          f.problem.split(';').forEach((problem: string) => {
            const trimmedProblem = problem.trim()
            if (trimmedProblem && isValidProblem(trimmedProblem)) {
              problemCounts[trimmedProblem] = (problemCounts[trimmedProblem] || 0) + 1
            }
          })
        }
      })
      
      const topProblems = Object.entries(problemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Processar departamentos
      const sectorCounts: Record<string, number> = {}
      allFeedbacks.forEach(f => {
        if (f.sector) {
          sectorCounts[f.sector] = (sectorCounts[f.sector] || 0) + 1
        }
      })
      
      const topSectors = Object.entries(sectorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // Processar palavras-chave
      const keywordCounts: Record<string, number> = {}
      allFeedbacks.forEach(f => {
        if (f.keyword && f.keyword.trim() !== '') {
          // Dividir múltiplas palavras-chave separadas por ';'
          f.keyword.split(';').forEach((keyword: string) => {
            const trimmedKeyword = keyword.trim()
            if (trimmedKeyword && trimmedKeyword.length > 2) {
              keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1
            }
          })
        }
      })
      
      const topKeywords = Object.entries(keywordCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Processar apartamentos
      const apartmentData: Record<string, { 
        feedbacks: number; 
        totalRating: number; 
        problems: number;
        sentiments: Record<string, number>
      }> = {}
      
      allFeedbacks.forEach(f => {
        if (f.apartamento) {
          if (!apartmentData[f.apartamento]) {
            apartmentData[f.apartamento] = { feedbacks: 0, totalRating: 0, problems: 0, sentiments: {} }
          }
          apartmentData[f.apartamento].feedbacks++
          apartmentData[f.apartamento].totalRating += (f.rating || 0)
          
          if (f.problem && f.problem.trim() !== '') {
            // Contar problemas válidos
            const hasValidProblem = f.problem.split(';').some((problem: string) => {
              const trimmedProblem = problem.trim()
              return trimmedProblem && isValidProblem(trimmedProblem)
            })
            if (hasValidProblem) {
              apartmentData[f.apartamento].problems++
            }
          }
          
          const sentiment = f.sentiment || 'neutral'
          apartmentData[f.apartamento].sentiments[sentiment] = (apartmentData[f.apartamento].sentiments[sentiment] || 0) + 1
        }
      })

      const apartmentDetails = Object.entries(apartmentData)
        .map(([apartment, data]) => {
          const avgRating = data.totalRating / data.feedbacks
          const dominantSentiment = Object.entries(data.sentiments)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
          
          return {
            apartment,
            feedbacks: data.feedbacks,
            avgRating: Number(avgRating.toFixed(1)),
            problems: data.problems,
            sentiment: dominantSentiment
          }
        })
        .sort((a, b) => b.feedbacks - a.feedbacks)

      // Tendência mensal
      const monthlyData: Record<string, { total: number; sum: number }> = {}
      allFeedbacks.forEach(f => {
        if (f.date) {
          const month = new Date(f.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' })
          if (!monthlyData[month]) {
            monthlyData[month] = { total: 0, sum: 0 }
          }
          monthlyData[month].total++
          monthlyData[month].sum += (f.rating || 0)
        }
      })

      const monthlyTrend = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          rating: Number((data.sum / data.total).toFixed(1)),
          feedbacks: data.total
        }))
        .sort((a: { month: string; rating: number; feedbacks: number }, b: { month: string; rating: number; feedbacks: number }) => new Date(a.month).getTime() - new Date(b.month).getTime())

      // Distribuição por fonte
      const sourceCounts: Record<string, number> = {}
      allFeedbacks.forEach(f => {
        if (f.source) {
          sourceCounts[f.source] = (sourceCounts[f.source] || 0) + 1
        }
      })
      
      const sourceDistribution = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a: { source: string; count: number }, b: { source: string; count: number }) => b.count - a.count)

      // Feedbacks recentes
      const recentFeedbacks = allFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)

      const lastUpdate = hotelAnalyses
        .map((a: any) => a.importDate?.toDate?.() || new Date(a.importDate))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
        ?.toLocaleDateString('pt-BR') || 'N/A'

      setHotelData({
        hotelId,
        hotelName,
        totalFeedbacks,
        averageRating: Number(averageRating.toFixed(1)),
        positiveSentiment,
        negativeSentiment,
        neutralSentiment,
        problemCount: topProblems.reduce((sum, p) => sum + p.count, 0),
        topProblems,
        topSectors,
        topKeywords,
        apartmentDetails,
        monthlyTrend,
        sourceDistribution,
        recentFeedbacks,
        positiveFeedbacks,
        negativeFeedbacks,
        neutralFeedbacks,
        lastUpdate
      })

    } catch (error) {
      console.error('Erro ao buscar dados do hotel:', error)
      toast({
        title: "Erro ao Carregar Dados",
        description: "Não foi possível carregar os dados do hotel.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600"
    if (rating >= 3.5) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusText = (rating: number) => {
    if (rating >= 4.5) return "Excelente"
    if (rating >= 3.5) return "Bom"
    return "Precisa de Atenção"
  }

  // Função para filtrar dados baseado no sentimento selecionado
  const getFilteredData = () => {
    if (!hotelData) return null

    let filteredFeedbacks = hotelData.recentFeedbacks
    if (selectedSentiment === 'positive') {
      filteredFeedbacks = hotelData.positiveFeedbacks
    } else if (selectedSentiment === 'negative') {
      filteredFeedbacks = hotelData.negativeFeedbacks
    } else if (selectedSentiment === 'neutral') {
      filteredFeedbacks = hotelData.neutralFeedbacks
    }

    // Recalcular problemas baseado nos feedbacks filtrados
    const problemCounts: Record<string, number> = {}
    filteredFeedbacks.forEach(f => {
      if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
        problemCounts[f.problem] = (problemCounts[f.problem] || 0) + 1
      }
    })
    
    const filteredTopProblems = Object.entries(problemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Recalcular setores baseado nos feedbacks filtrados
    const sectorCounts: Record<string, number> = {}
    filteredFeedbacks.forEach(f => {
      if (f.sector) {
        sectorCounts[f.sector] = (sectorCounts[f.sector] || 0) + 1
      }
    })
    
    const filteredTopSectors = Object.entries(sectorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Recalcular apartamentos baseado nos feedbacks filtrados
    const apartmentData: Record<string, { 
      feedbacks: number; 
      totalRating: number; 
      problems: number;
      sentiments: Record<string, number>
    }> = {}
    
    filteredFeedbacks.forEach(f => {
      if (f.apartamento) {
        if (!apartmentData[f.apartamento]) {
          apartmentData[f.apartamento] = { feedbacks: 0, totalRating: 0, problems: 0, sentiments: {} }
        }
        apartmentData[f.apartamento].feedbacks++
        apartmentData[f.apartamento].totalRating += (f.rating || 0)
        
        if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
          apartmentData[f.apartamento].problems++
        }
        
        const sentiment = f.sentiment || 'neutral'
        apartmentData[f.apartamento].sentiments[sentiment] = (apartmentData[f.apartamento].sentiments[sentiment] || 0) + 1
      }
    })

    const filteredApartmentDetails = Object.entries(apartmentData)
      .map(([apartment, data]) => {
        const avgRating = data.totalRating / data.feedbacks
        const dominantSentiment = Object.entries(data.sentiments)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
        
        return {
          apartment,
          feedbacks: data.feedbacks,
          avgRating: Number(avgRating.toFixed(1)),
          problems: data.problems,
          sentiment: dominantSentiment
        }
      })
      .sort((a, b) => b.feedbacks - a.feedbacks)

    return {
      ...hotelData,
      filteredFeedbacks,
      filteredTopProblems,
      filteredTopSectors,
      filteredApartmentDetails,
      filteredTotalFeedbacks: filteredFeedbacks.length,
      filteredAverageRating: filteredFeedbacks.length > 0 
        ? Number((filteredFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / filteredFeedbacks.length).toFixed(1))
        : 0,
      filteredProblemCount: filteredTopProblems.reduce((sum, p) => sum + p.count, 0)
    }
  }

  if (loading || !mounted) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 animate-pulse">Carregando dados do hotel...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hotelData) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Hotel Não Encontrado</h2>
          <p className="text-muted-foreground mb-6">
            Não foi possível encontrar dados para este hotel.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{hotelData.hotelName}</h1>
            <p className="text-muted-foreground">
              Análise detalhada e métricas de performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(hotelData.averageRating)}>
            {getStatusText(hotelData.averageRating)}
          </Badge>
          <div className="text-right">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="font-semibold text-lg">{hotelData.averageRating}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Atualizado em {hotelData.lastUpdate}
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {selectedSentiment !== 'all' ? 'Feedbacks Filtrados' : 'Total de Feedbacks'}
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {(() => {
                  const filteredData = getFilteredData()
                  return selectedSentiment !== 'all' && filteredData 
                    ? filteredData.filteredTotalFeedbacks 
                    : hotelData.totalFeedbacks
                })()}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">
                {selectedSentiment !== 'all' ? 'Avaliação Filtrada' : 'Sentimento Positivo'}
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {(() => {
                  const filteredData = getFilteredData()
                  return selectedSentiment !== 'all' && filteredData 
                    ? `${filteredData.filteredAverageRating}/5`
                    : `${hotelData.positiveSentiment}%`
                })()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">
                {selectedSentiment !== 'all' ? 'Problemas Filtrados' : 'Problemas Identificados'}
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {(() => {
                  const filteredData = getFilteredData()
                  return selectedSentiment !== 'all' && filteredData 
                    ? filteredData.filteredProblemCount 
                    : hotelData.problemCount
                })()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {selectedSentiment !== 'all' ? 'Apartamentos Filtrados' : 'Apartamentos'}
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {(() => {
                  const filteredData = getFilteredData()
                  return selectedSentiment !== 'all' && filteredData 
                    ? filteredData.filteredApartmentDetails.length 
                    : hotelData.apartmentDetails.length
                })()}
              </p>
            </div>
            <Hotel className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="problems">Problemas</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="apartments">Apartamentos</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Sentimentos */}
            <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Distribuição de Sentimentos
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Filtrado: {selectedSentiment === 'positive' ? 'Positivos' : 
                             selectedSentiment === 'negative' ? 'Negativos' : 'Neutros'}
                  </Badge>
                )}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={selectedSentiment === 'all' ? [
                      { name: 'Positivo', value: hotelData.positiveSentiment, fill: '#22c55e' },
                      { name: 'Neutro', value: hotelData.neutralSentiment, fill: '#64748b' },
                      { name: 'Negativo', value: hotelData.negativeSentiment, fill: '#ef4444' }
                    ] : [
                      { 
                        name: selectedSentiment === 'positive' ? 'Positivo' : 
                              selectedSentiment === 'negative' ? 'Negativo' : 'Neutro',
                        value: 100,
                        fill: selectedSentiment === 'positive' ? '#22c55e' : 
                              selectedSentiment === 'negative' ? '#ef4444' : '#64748b'
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Departamentos */}
            <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Departamentos com Mais Feedbacks
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs">Filtrado</Badge>
                )}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  const filteredData = getFilteredData()
                  return selectedSentiment !== 'all' && filteredData 
                    ? filteredData.filteredTopSectors 
                    : hotelData.topSectors
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Fontes de Feedback */}
          <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Distribuição por Fonte
              {selectedSentiment !== 'all' && (
                <Badge variant="outline" className="ml-2 text-xs">Filtrado</Badge>
              )}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(() => {
                const filteredData = getFilteredData()
                if (selectedSentiment !== 'all' && filteredData) {
                  // Recalcular distribuição por fonte com dados filtrados
                  const sourceCounts: Record<string, number> = {}
                  filteredData.filteredFeedbacks.forEach(f => {
                    if (f.source) {
                      sourceCounts[f.source] = (sourceCounts[f.source] || 0) + 1
                    }
                  })
                  return Object.entries(sourceCounts)
                    .map(([source, count]) => ({ source, count }))
                    .sort((a, b) => b.count - a.count)
                }
                return hotelData.sourceDistribution
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="source" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="problems" className="space-y-6">
          {/* Resumo dos Feedbacks por Sentimento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Feedbacks Positivos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-200 mt-1">{hotelData.positiveFeedbacks.length}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">{hotelData.positiveSentiment}% do total</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSentiment(selectedSentiment === 'positive' ? 'all' : 'positive')}
                  className={`transition-all duration-200 ${selectedSentiment === 'positive' 
                    ? 'bg-green-200 dark:bg-green-800 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200' 
                    : 'hover:bg-green-100 dark:hover:bg-green-900/30 border-green-300 dark:border-green-700'}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">Feedbacks Negativos</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-200 mt-1">{hotelData.negativeFeedbacks.length}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{hotelData.negativeSentiment}% do total</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSentiment(selectedSentiment === 'negative' ? 'all' : 'negative')}
                  className={`transition-all duration-200 ${selectedSentiment === 'negative' 
                    ? 'bg-red-200 dark:bg-red-800 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200' 
                    : 'hover:bg-red-100 dark:hover:bg-red-900/30 border-red-300 dark:border-red-700'}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-gray-200 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Minus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Feedbacks Neutros</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-1">{hotelData.neutralFeedbacks.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{hotelData.neutralSentiment}% do total</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSentiment(selectedSentiment === 'neutral' ? 'all' : 'neutral')}
                  className={`transition-all duration-200 ${selectedSentiment === 'neutral' 
                    ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-200' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/30 border-gray-300 dark:border-gray-600'}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Filtros e Controles */}
          <Card className="p-4 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Filter className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Filtros:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSentiment === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSentiment('all')}
                  className={`transition-all duration-200 ${selectedSentiment === 'all' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  Todos ({hotelData.totalFeedbacks})
                </Button>
                <Button
                  variant={selectedSentiment === 'positive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSentiment('positive')}
                  className={`transition-all duration-200 ${selectedSentiment === 'positive' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                    : 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 bg-white dark:bg-gray-800'}`}
                >
                  Positivos ({hotelData.positiveFeedbacks.length})
                </Button>
                <Button
                  variant={selectedSentiment === 'negative' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSentiment('negative')}
                  className={`transition-all duration-200 ${selectedSentiment === 'negative' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                    : 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-gray-800'}`}
                >
                  Negativos ({hotelData.negativeFeedbacks.length})
                </Button>
                <Button
                  variant={selectedSentiment === 'neutral' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSentiment('neutral')}
                  className={`transition-all duration-200 ${selectedSentiment === 'neutral' 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600' 
                    : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/20 bg-white dark:bg-gray-800'}`}
                >
                  Neutros ({hotelData.neutralFeedbacks.length})
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Problemas */}
            <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
                Principais Problemas Identificados
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs">Filtrado</Badge>
                )}
              </h3>
              <div className="space-y-3">
                {(() => {
                  const filteredData = getFilteredData()
                  const problemsToShow = selectedSentiment !== 'all' && filteredData 
                    ? filteredData.filteredTopProblems 
                    : hotelData.topProblems
                  
                  if (problemsToShow.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Nenhum problema encontrado
                        </h4>
                        <p className="text-gray-500 dark:text-gray-500">
                          Não há problemas identificados para o filtro selecionado.
                        </p>
                      </div>
                    )
                  }

                  return problemsToShow.map((problem, index) => (
                    <div key={problem.name} className="group">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200 bg-white dark:bg-gray-800/50">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{problem.name}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {(() => {
                              const totalFeedbacks = selectedSentiment !== 'all' && filteredData 
                                ? filteredData.filteredTotalFeedbacks 
                                : hotelData.totalFeedbacks
                              return ((problem.count / totalFeedbacks) * 100).toFixed(1)
                            })()}% dos feedbacks filtrados
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={index < 3 ? "destructive" : "outline"} 
                            className={`text-xs ${index < 3 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                              : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {problem.count} ocorrências
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowProblemsDetail(true)
                              setSelectedProblemDetail(problem.name)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </Button>
                        </div>
                      </div>
                      
                      {selectedProblemDetail === problem.name && (
                        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-red-400 dark:border-red-500">
                          <h5 className="font-medium text-sm mb-3 text-gray-900 dark:text-gray-100">
                            Comentários relacionados a "{problem.name}":
                          </h5>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {(() => {
                              const filteredData = getFilteredData()
                              const feedbacksToFilter = selectedSentiment !== 'all' && filteredData 
                                ? filteredData.filteredFeedbacks 
                                : hotelData.recentFeedbacks
                              
                              const problemFeedbacks = feedbacksToFilter.filter(f => f.problem === problem.name)

                              return problemFeedbacks.slice(0, 5).map((feedback, idx) => (
                                <div key={idx} className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-xs text-gray-600 dark:text-gray-400">
                                      {feedback.source} • {feedback.apartamento || 'N/A'}
                                    </span>
                                    <div className="flex items-center">
                                      <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                      <span className="text-xs text-gray-700 dark:text-gray-300">{feedback.rating}</span>
                                    </div>
                                  </div>
                                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{feedback.comment}</p>
                                </div>
                              ))
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </Card>

            {/* Gráfico de Problemas */}
            <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Distribuição Visual dos Problemas
                  {selectedSentiment !== 'all' && (
                    <Badge variant="outline" className="text-xs">Filtrado</Badge>
                  )}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProblemsDetail(true)}
                  className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400"
                >
                  <Eye className="h-4 w-4" />
                  Detalhes
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={(() => {
                    const filteredData = getFilteredData()
                    return (selectedSentiment !== 'all' && filteredData 
                      ? filteredData.filteredTopProblems 
                      : hotelData.topProblems
                    ).slice(0, 8)
                  })()}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} stroke="#6b7280" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value} ocorrências`, 'Quantidade']}
                    labelFormatter={(label) => `Problema: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#ef4444" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Comentários Detalhados por Sentimento */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentários Detalhados
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2">
                    {selectedSentiment === 'positive' ? 'Positivos' : 
                     selectedSentiment === 'negative' ? 'Negativos' : 'Neutros'}
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Mostrando {showAllComments ? 'todos' : 'primeiros 10'} comentários
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllComments(!showAllComments)}
                >
                  {showAllComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAllComments ? 'Mostrar Menos' : 'Mostrar Todos'}
                </Button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(() => {
                let feedbacksToShow = hotelData.recentFeedbacks;
                
                if (selectedSentiment === 'positive') {
                  feedbacksToShow = hotelData.positiveFeedbacks;
                } else if (selectedSentiment === 'negative') {
                  feedbacksToShow = hotelData.negativeFeedbacks;
                } else if (selectedSentiment === 'neutral') {
                  feedbacksToShow = hotelData.neutralFeedbacks;
                }

                const limit = showAllComments ? feedbacksToShow.length : 10;
                
                if (feedbacksToShow.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-600 mb-2">
                        Nenhum comentário encontrado
                      </h4>
                      <p className="text-gray-500">
                        {selectedSentiment === 'positive' ? 'Não há feedbacks positivos' :
                         selectedSentiment === 'negative' ? 'Não há feedbacks negativos' :
                         selectedSentiment === 'neutral' ? 'Não há feedbacks neutros' :
                         'Não há comentários disponíveis'} para este hotel.
                      </p>
                    </div>
                  );
                }
                
                return feedbacksToShow.slice(0, limit).map((feedback, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    feedback.sentiment === 'positive' ? 'border-l-green-400 bg-green-50' :
                    feedback.sentiment === 'negative' ? 'border-l-red-400 bg-red-50' :
                    'border-l-gray-400 bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{feedback.title || 'Sem título'}</h5>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>{feedback.source}</span>
                          <span>•</span>
                          <span>{feedback.apartamento || 'Apartamento não informado'}</span>
                          <span>•</span>
                          <span>{formatDateBR(feedback.date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={feedback.sentiment === 'positive' ? 'default' : 
                                 feedback.sentiment === 'negative' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {feedback.sentiment === 'positive' ? 'Positivo' : 
                           feedback.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                        </Badge>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-medium">{feedback.rating}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 leading-relaxed mb-3">{feedback.comment}</p>
                    
                    <div className="flex items-center gap-2">
                      {feedback.sector && (
                        <Badge variant="outline" className="text-xs">
                          {feedback.sector}
                        </Badge>
                      )}
                      {feedback.problem && feedback.problem !== 'VAZIO' && feedback.problem !== 'Não' && (
                        <Badge variant="destructive" className="text-xs">
                          {feedback.problem}
                        </Badge>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
          
          {/* Modal/Dialog Detalhado dos Problemas */}
          {showProblemsDetail && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header do Modal */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Análise Detalhada dos Problemas
                    {selectedSentiment !== 'all' && (
                      <Badge variant="outline" className="text-xs">
                        Filtrado: {selectedSentiment === 'positive' ? 'Positivos' : 
                                  selectedSentiment === 'negative' ? 'Negativos' : 'Neutros'}
                      </Badge>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedProblemDetail && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProblemDetail(null)}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar à Lista
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowProblemsDetail(false)
                        setSelectedProblemDetail(null)
                      }}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      ✕ Fechar
                    </Button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-120px)] bg-white dark:bg-gray-900">
                  {!selectedProblemDetail ? (
                    // Visão Geral Simplificada
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          Resumo Geral dos Problemas
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Clique em qualquer problema para ver análise detalhada e todos os feedbacks relacionados
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                          const filteredData = getFilteredData()
                          const feedbacksToFilter = selectedSentiment !== 'all' && filteredData 
                            ? filteredData.filteredFeedbacks 
                            : hotelData.recentFeedbacks
                          
                          // Filtrar apenas problemas que têm comentários nos dados filtrados
                          const problemsWithComments = (selectedSentiment !== 'all' && filteredData 
                            ? filteredData.filteredTopProblems 
                            : hotelData.topProblems
                          ).filter(problem => {
                            const hasComments = feedbacksToFilter.some(f => f.problem === problem.name)
                            return hasComments
                          })

                          if (problemsWithComments.length === 0) {
                            return (
                              <div className="col-span-full text-center py-12">
                                <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                  Nenhum problema com comentários
                                </h4>
                                <p className="text-gray-500 dark:text-gray-500">
                                  Não há problemas com comentários disponíveis para o filtro selecionado.
                                </p>
                              </div>
                            )
                          }

                          return problemsWithComments.map((problem, index) => {
                            const problemFeedbackCount = feedbacksToFilter.filter(f => f.problem === problem.name).length
                            
                            return (
                              <Card 
                                key={problem.name}
                                className="p-4 cursor-pointer hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-200 border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600 bg-white dark:bg-gray-800/50"
                                onClick={() => setSelectedProblemDetail(problem.name)}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                      {problem.name}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant={index < 3 ? "destructive" : "outline"}
                                        className={`text-xs ${index < 3 
                                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                        }`}
                                      >
                                        #{index + 1}
                                      </Badge>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {problemFeedbackCount} comentários
                                      </span>
                                    </div>
                                  </div>
                                  <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Ocorrências:</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">{problem.count}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">% do Total:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                      {(() => {
                                        const totalFeedbacks = selectedSentiment !== 'all' && filteredData 
                                          ? filteredData.filteredTotalFeedbacks 
                                          : hotelData.totalFeedbacks
                                        return ((problem.count / totalFeedbacks) * 100).toFixed(1)
                                      })()}%
                                    </span>
                                  </div>
                                  <div className="mt-3 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                      style={{ 
                                        width: `${(() => {
                                          const maxCount = Math.max(...problemsWithComments.map(p => p.count))
                                          return (problem.count / maxCount) * 100
                                        })()}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              </Card>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  ) : (
                    // Visão Detalhada do Problema Específico
                    <div className="p-6">
                      {(() => {
                        const filteredData = getFilteredData()
                        const feedbacksToFilter = selectedSentiment !== 'all' && filteredData 
                          ? filteredData.filteredFeedbacks 
                          : hotelData.recentFeedbacks
                        
                        const problemFeedbacks = feedbacksToFilter.filter(f => f.problem === selectedProblemDetail)
                        
                        // Verificar se o problema tem feedbacks
                        if (problemFeedbacks.length === 0) {
                          return (
                            <div className="text-center py-16">
                              <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                Nenhum comentário encontrado
                              </h3>
                              <p className="text-gray-500 dark:text-gray-500 mb-6">
                                Não há feedbacks relacionados ao problema "{selectedProblemDetail}" no filtro atual.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setSelectedProblemDetail(null)}
                                className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600"
                              >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar à Lista de Problemas
                              </Button>
                            </div>
                          )
                        }
                        
                        const selectedProblem = (selectedSentiment !== 'all' && filteredData 
                          ? filteredData.filteredTopProblems 
                          : hotelData.topProblems
                        ).find(p => p.name === selectedProblemDetail)

                        if (!selectedProblem) {
                          return (
                            <div className="text-center py-16">
                              <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                Problema não encontrado
                              </h3>
                              <p className="text-gray-500 dark:text-gray-500 mb-6">
                                O problema selecionado não foi encontrado nos dados atuais.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setSelectedProblemDetail(null)}
                                className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600"
                              >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar à Lista de Problemas
                              </Button>
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-6">
                            {/* Header do Problema */}
                            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
                                    {selectedProblem.name}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                      <span className="text-red-700 dark:text-red-300">
                                        {selectedProblem.count} ocorrências
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageSquare className="h-4 w-4 text-red-600" />
                                      <span className="text-red-700 dark:text-red-300">
                                        {problemFeedbacks.length} feedbacks relacionados
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 text-yellow-500" />
                                      <span className="text-red-700 dark:text-red-300">
                                        Média: {problemFeedbacks.length > 0 
                                          ? (problemFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / problemFeedbacks.length).toFixed(1)
                                          : 'N/A'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="destructive" className="text-lg px-3 py-1">
                                  {(() => {
                                    const totalFeedbacks = selectedSentiment !== 'all' && filteredData 
                                      ? filteredData.filteredTotalFeedbacks 
                                      : hotelData.totalFeedbacks
                                    return ((selectedProblem.count / totalFeedbacks) * 100).toFixed(1)
                                  })()}% do total
                                </Badge>
                              </div>
                            </div>

                            {/* Lista de Todos os Feedbacks */}
                            <div>
                              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Todos os Feedbacks Relacionados ({problemFeedbacks.length})
                              </h4>
                              
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                {problemFeedbacks
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .map((feedback, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/50 ${
                                      feedback.sentiment === 'positive' 
                                        ? 'border-l-4 border-l-green-400 bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                                        : feedback.sentiment === 'negative' 
                                        ? 'border-l-4 border-l-red-400 bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                        : 'border-l-4 border-l-gray-400 bg-gray-50/30 dark:bg-gray-800/10 border-gray-200 dark:border-gray-600'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                          {feedback.title || 'Feedback sem título'}
                                        </h5>
                                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {feedback.source}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Hotel className="h-3 w-3" />
                                            {feedback.apartamento || 'N/A'}
                                          </span>
                                                                    <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateBR(feedback.date)}
                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Badge 
                                          variant={feedback.sentiment === 'positive' ? 'default' : 
                                                 feedback.sentiment === 'negative' ? 'destructive' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {feedback.sentiment === 'positive' ? 'Positivo' : 
                                           feedback.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                                        </Badge>
                                        <div className="flex items-center">
                                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                          <span className="font-medium text-gray-900 dark:text-gray-100">{feedback.rating}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                                      {feedback.comment}
                                    </p>
                                    
                                    <div className="flex items-center gap-2">
                                      {feedback.sector && (
                                        <Badge variant="outline" className="text-xs">
                                          {feedback.sector}
                                        </Badge>
                                      )}
                                      {feedback.keyword && (
                                        <Badge variant="secondary" className="text-xs">
                                          {feedback.keyword}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Análise de Departamentos
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Filtrado: {selectedSentiment === 'positive' ? 'Positivos' : 
                              selectedSentiment === 'negative' ? 'Negativos' : 'Neutros'}
                  </Badge>
                )}
              </h3>
            </div>

            {/* Gráfico de Departamentos */}
            <div className="mb-8">
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Distribuição por Departamento
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={(() => {
                    const filteredData = getFilteredData()
                    return (selectedSentiment !== 'all' && filteredData 
                      ? filteredData.filteredTopSectors 
                      : hotelData.topSectors
                    ).slice(0, 10)
                  })()}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} stroke="#6b7280" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value} feedbacks`, 'Quantidade']}
                    labelFormatter={(label) => `Departamento: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lista Detalhada de Departamentos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const filteredData = getFilteredData()
                const sectorsToShow = selectedSentiment !== 'all' && filteredData 
                  ? filteredData.filteredTopSectors 
                  : hotelData.topSectors

                return sectorsToShow.map((sector, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">{sector.name}</h5>
                      <Badge variant="outline">{sector.count} feedbacks</Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {((sector.count / hotelData.totalFeedbacks) * 100).toFixed(1)}% do total
                    </div>
                  </Card>
                ))
              })()}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5 text-green-600" />
                Análise de Palavras-chave
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Filtrado: {selectedSentiment === 'positive' ? 'Positivos' : 
                              selectedSentiment === 'negative' ? 'Negativos' : 'Neutros'}
                  </Badge>
                )}
              </h3>
            </div>

            {/* Gráfico de Palavras-chave */}
            <div className="mb-8">
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Principais Palavras-chave
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={(() => {
                    const filteredData = getFilteredData()
                    const keywordsToShow = selectedSentiment !== 'all' && filteredData 
                      ? (() => {
                          // Recalcular keywords para dados filtrados
                          const keywordCounts: Record<string, number> = {}
                          filteredData.filteredFeedbacks.forEach(f => {
                            if (f.keyword && f.keyword.trim() !== '') {
                              f.keyword.split(';').forEach((keyword: string) => {
                                const trimmedKeyword = keyword.trim()
                                if (trimmedKeyword && trimmedKeyword.length > 2) {
                                  keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1
                                }
                              })
                            }
                          })
                          return Object.entries(keywordCounts)
                            .map(([name, count]) => ({ name, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 10)
                        })()
                      : hotelData.topKeywords.slice(0, 10)

                    return keywordsToShow
                  })()}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} stroke="#6b7280" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value} ocorrências`, 'Quantidade']}
                    labelFormatter={(label) => `Palavra-chave: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#10b981" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lista Detalhada de Palavras-chave */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const filteredData = getFilteredData()
                const keywordsToShow = selectedSentiment !== 'all' && filteredData 
                  ? (() => {
                      // Recalcular keywords para dados filtrados
                      const keywordCounts: Record<string, number> = {}
                      filteredData.filteredFeedbacks.forEach(f => {
                        if (f.keyword && f.keyword.trim() !== '') {
                          f.keyword.split(';').forEach((keyword: string) => {
                            const trimmedKeyword = keyword.trim()
                            if (trimmedKeyword && trimmedKeyword.length > 2) {
                              keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1
                            }
                          })
                        }
                      })
                      return Object.entries(keywordCounts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                    })()
                  : hotelData.topKeywords

                return keywordsToShow.map((keyword, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">{keyword.name}</h5>
                      <Badge variant="outline">{keyword.count} ocorrências</Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {((keyword.count / hotelData.totalFeedbacks) * 100).toFixed(1)}% do total
                    </div>
                  </Card>
                ))
              })()}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apartments" className="space-y-6">
          <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Análise por Apartamento
              {selectedSentiment !== 'all' && (
                <Badge variant="outline" className="ml-2 text-xs">Filtrado</Badge>
              )}
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Apartamento</th>
                    <th className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center text-gray-700 dark:text-gray-300">Feedbacks</th>
                    <th className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center text-gray-700 dark:text-gray-300">Avaliação</th>
                    <th className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center text-gray-700 dark:text-gray-300">Problemas</th>
                    <th className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center text-gray-700 dark:text-gray-300">Sentimento</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredData = getFilteredData()
                    const apartmentsToShow = selectedSentiment !== 'all' && filteredData 
                      ? filteredData.filteredApartmentDetails 
                      : hotelData.apartmentDetails
                    
                    if (apartmentsToShow.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <Hotel className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                            <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                              Nenhum apartamento encontrado
                            </h4>
                            <p className="text-gray-500 dark:text-gray-500">
                              Não há dados de apartamentos para o filtro selecionado.
                            </p>
                          </td>
                        </tr>
                      )
                    }

                    return apartmentsToShow.slice(0, 20).map((apt, index) => (
                      <tr key={apt.apartment} className={`${index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/30" : "bg-white dark:bg-gray-900/20"} hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors`}>
                        <td className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-900 dark:text-gray-100">{apt.apartment}</td>
                        <td className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center text-gray-700 dark:text-gray-300">{apt.feedbacks}</td>
                        <td className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center">
                          <div className="flex items-center justify-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className={`${getStatusColor(apt.avgRating)} dark:opacity-90`}>{apt.avgRating}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center">
                          <Badge 
                            variant={apt.problems > 5 ? "destructive" : apt.problems > 2 ? "outline" : "default"}
                            className={apt.problems > 5 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : apt.problems > 2 
                              ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            }
                          >
                            {apt.problems}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 border-b border-gray-200 dark:border-gray-600 text-center">
                          <Badge 
                            variant={apt.sentiment === 'positive' ? "default" : apt.sentiment === 'negative' ? "destructive" : "secondary"}
                            className={apt.sentiment === 'positive' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : apt.sentiment === 'negative' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                            }
                          >
                            {apt.sentiment === 'positive' ? 'Positivo' : apt.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Apartamentos com Mais Feedbacks
                {selectedSentiment !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs">Filtrado</Badge>
                )}
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={(() => {
                  const filteredData = getFilteredData()
                  return (selectedSentiment !== 'all' && filteredData 
                    ? filteredData.filteredApartmentDetails 
                    : hotelData.apartmentDetails
                  ).slice(0, 10)
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="apartment" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar 
                    dataKey="feedbacks" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {hotelData.monthlyTrend.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Evolução da Avaliação Média</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hotelData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedbacks Recentes
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {hotelData.recentFeedbacks.length} comentários disponíveis
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllComments(!showAllComments)}
                >
                  {showAllComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAllComments ? 'Mostrar Menos' : 'Ver Todos'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {hotelData.recentFeedbacks
                .slice(0, showAllComments ? hotelData.recentFeedbacks.length : 5)
                .map((feedback, index) => (
                <div key={index} className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                  feedback.sentiment === 'positive' ? 'border-l-4 border-l-green-400 bg-green-50/30' :
                  feedback.sentiment === 'negative' ? 'border-l-4 border-l-red-400 bg-red-50/30' :
                  'border-l-4 border-l-gray-400 bg-gray-50/30'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900">{feedback.title || 'Feedback sem título'}</h5>
                        <Badge 
                          variant={feedback.sentiment === 'positive' ? 'default' : 
                                 feedback.sentiment === 'negative' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {feedback.sentiment === 'positive' ? 'Positivo' : 
                           feedback.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {feedback.source}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Hotel className="h-3 w-3" />
                          {feedback.apartamento || 'Apartamento não informado'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateBR(feedback.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-medium">{feedback.rating}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedComments(prev => ({
                          ...prev,
                          [`feedback-${index}`]: !prev[`feedback-${index}`]
                        }))}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed mb-3 line-clamp-2">
                    {feedback.comment}
                  </p>
                  
                  {expandedComments[`feedback-${index}`] && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h6 className="font-medium text-sm mb-2">Comentário Completo:</h6>
                      <p className="text-gray-700 leading-relaxed mb-4">{feedback.comment}</p>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {feedback.sector && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Setor:</span>
                            <Badge variant="outline" className="text-xs">
                              {feedback.sector}
                            </Badge>
                          </div>
                        )}
                        {feedback.problem && feedback.problem !== 'VAZIO' && feedback.problem !== 'Não' && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Problema:</span>
                            <Badge variant="destructive" className="text-xs">
                              {feedback.problem}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3">
                    {feedback.sector && (
                      <Badge variant="outline" className="text-xs">
                        {feedback.sector}
                      </Badge>
                    )}
                    {feedback.problem && feedback.problem !== 'VAZIO' && feedback.problem !== 'Não' && (
                      <Badge variant="destructive" className="text-xs">
                        Problema: {feedback.problem}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 