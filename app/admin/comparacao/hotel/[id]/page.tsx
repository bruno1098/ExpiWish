"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { ArrowLeft, Hotel, Star, MessageSquare, AlertTriangle, Users, TrendingUp, Calendar, MapPin } from "lucide-react"
import { getAllAnalyses } from "@/lib/firestore-service"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useParams } from "next/navigation"
import dynamic from 'next/dynamic'
import type { Feedback, Analysis } from "@/types"

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
  lastUpdate: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

export default function HotelDetalhes() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const hotelId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [hotelData, setHotelData] = useState<HotelDetailData | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (userData && mounted) {
      fetchHotelData()
    }
  }, [hotelId, userData, mounted])

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

      // Processar problemas
      const problemCounts: Record<string, number> = {}
      allFeedbacks.forEach(f => {
        if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
          problemCounts[f.problem] = (problemCounts[f.problem] || 0) + 1
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
          
          if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
            apartmentData[f.apartamento].problems++
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
        apartmentDetails,
        monthlyTrend,
        sourceDistribution,
        recentFeedbacks,
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

  if (loading || !mounted) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Feedbacks</p>
              <p className="text-2xl font-bold">{hotelData.totalFeedbacks}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sentimento Positivo</p>
              <p className="text-2xl font-bold text-green-600">{hotelData.positiveSentiment}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Problemas Identificados</p>
              <p className="text-2xl font-bold text-red-600">{hotelData.problemCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Apartamentos</p>
              <p className="text-2xl font-bold">{hotelData.apartmentDetails.length}</p>
            </div>
            <Hotel className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="problems">Problemas</TabsTrigger>
          <TabsTrigger value="apartments">Apartamentos</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Sentimentos */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Distribuição de Sentimentos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positivo', value: hotelData.positiveSentiment, fill: '#22c55e' },
                      { name: 'Neutro', value: hotelData.neutralSentiment, fill: '#64748b' },
                      { name: 'Negativo', value: hotelData.negativeSentiment, fill: '#ef4444' }
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
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Departamentos com Mais Feedbacks</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hotelData.topSectors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Fontes de Feedback */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição por Fonte</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hotelData.sourceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="problems" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Principais Problemas Identificados</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-4">Lista de Problemas</h4>
                <div className="space-y-2">
                  {hotelData.topProblems.map((problem, index) => (
                    <div key={problem.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium">{problem.name}</span>
                      <Badge variant={index < 3 ? "destructive" : "outline"}>
                        {problem.count} ocorrências
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Distribuição Visual</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hotelData.topProblems.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apartments" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Análise por Apartamento</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-3 bg-muted border-b text-left">Apartamento</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Feedbacks</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Avaliação</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Problemas</th>
                    <th className="py-2 px-3 bg-muted border-b text-center">Sentimento</th>
                  </tr>
                </thead>
                <tbody>
                  {hotelData.apartmentDetails.slice(0, 20).map((apt, index) => (
                    <tr key={apt.apartment} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="py-2 px-3 border-b font-medium">{apt.apartment}</td>
                      <td className="py-2 px-3 border-b text-center">{apt.feedbacks}</td>
                      <td className="py-2 px-3 border-b text-center">
                        <div className="flex items-center justify-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className={getStatusColor(apt.avgRating)}>{apt.avgRating}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 border-b text-center">
                        <Badge variant={apt.problems > 5 ? "destructive" : apt.problems > 2 ? "outline" : "default"}>
                          {apt.problems}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 border-b text-center">
                        <Badge 
                          variant={apt.sentiment === 'positive' ? "default" : apt.sentiment === 'negative' ? "destructive" : "secondary"}
                        >
                          {apt.sentiment === 'positive' ? 'Positivo' : apt.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-4">Apartamentos com Mais Feedbacks</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={hotelData.apartmentDetails.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="apartment" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="feedbacks" fill="#8884d8" />
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
            <h3 className="text-lg font-semibold mb-4">Feedbacks Recentes</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {hotelData.recentFeedbacks.map((feedback, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{feedback.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {feedback.source} • {feedback.date}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span>{feedback.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm">{feedback.comment}</p>
                  {feedback.problem && feedback.problem !== 'VAZIO' && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {feedback.problem}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 