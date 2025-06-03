"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { ArrowLeft, Hotel, Star, MessageSquare, AlertTriangle, Brain, Loader2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import { getAllAnalyses } from "@/lib/firestore-service"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { getApiKey } from "@/lib/openai-client"
import type { Feedback, Analysis } from "@/types"

interface HotelComparisonData {
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
  apartmentIssues: Array<{ apartment: string; issues: number; avgRating: number }>
  monthlyTrend: Array<{ month: string; rating: number; feedbacks: number }>
  sourceDistribution: Array<{ source: string; count: number }>
}

interface GPTAnalysis {
  summary: string
  recommendations: string[]
  criticalIssues: string[]
  comparison: string
  actionPlan: string[]
}

interface BandeiraSummary {
  name: string
  hotels: HotelComparisonData[]
  totalFeedbacks: number
  averageRating: number
  positiveSentiment: number
  negativeSentiment: number
  totalProblems: number
  topProblems: Array<{ name: string; count: number }>
  color: string
  icon: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

export default function ComparacaoAvancada() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [analyzingWithGPT, setAnalyzingWithGPT] = useState(false)
  const [hotelsData, setHotelsData] = useState<HotelComparisonData[]>([])
  const [selectedHotels, setSelectedHotels] = useState<string[]>([])
  const [gptAnalysis, setGptAnalysis] = useState<GPTAnalysis | null>(null)

  useEffect(() => {
    fetchHotelsData()
  }, [])

  const fetchHotelsData = async () => {
    try {
      setLoading(true)
      
      const allAnalyses = await getAllAnalyses()
      
      if (!allAnalyses || allAnalyses.length === 0) {
        toast({
          title: "Nenhum Dado Encontrado",
          description: "Não há análises disponíveis para comparação.",
          variant: "destructive"
        })
        return
      }

      // Agrupar análises por hotel
      const hotelGroups: { [key: string]: Analysis[] } = {}
      
      allAnalyses.forEach((analysis: any) => {
        const hotelKey = analysis.hotelId || analysis.hotelName || 'Unknown'
        if (!hotelGroups[hotelKey]) {
          hotelGroups[hotelKey] = []
        }
        hotelGroups[hotelKey].push(analysis)
      })

      // Processar dados detalhados de cada hotel
      const processedHotels: HotelComparisonData[] = Object.entries(hotelGroups).map(([hotelKey, analyses]) => {
        let allFeedbacks: Feedback[] = []
        
        analyses.forEach(analysis => {
          if (analysis.data && Array.isArray(analysis.data)) {
            allFeedbacks = [...allFeedbacks, ...analysis.data]
          }
        })

        if (allFeedbacks.length === 0) {
          return null
        }

        const hotelName = analyses[0].hotelName || hotelKey
        const hotelId = analyses[0].hotelId || hotelKey

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

        // Problemas principais
        const problemCounts: Record<string, number> = {}
        allFeedbacks.forEach(f => {
          if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
            problemCounts[f.problem] = (problemCounts[f.problem] || 0) + 1
          }
        })
        
        const topProblems = Object.entries(problemCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Setores problemáticos
        const sectorCounts: Record<string, number> = {}
        allFeedbacks.forEach(f => {
          if (f.sector) {
            sectorCounts[f.sector] = (sectorCounts[f.sector] || 0) + 1
          }
        })
        
        const topSectors = Object.entries(sectorCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Apartamentos com problemas
        const apartmentData: Record<string, { issues: number; totalRating: number; count: number }> = {}
        allFeedbacks.forEach(f => {
          if (f.apartamento) {
            if (!apartmentData[f.apartamento]) {
              apartmentData[f.apartamento] = { issues: 0, totalRating: 0, count: 0 }
            }
            apartmentData[f.apartamento].count++
            apartmentData[f.apartamento].totalRating += (f.rating || 0)
            if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
              apartmentData[f.apartamento].issues++
            }
          }
        })

        const apartmentIssues = Object.entries(apartmentData)
          .map(([apartment, data]) => ({
            apartment,
            issues: data.issues,
            avgRating: Number((data.totalRating / data.count).toFixed(1))
          }))
          .sort((a, b) => b.issues - a.issues)
          .slice(0, 10)

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
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

        // Distribuição por fonte
        const sourceCounts: Record<string, number> = {}
        allFeedbacks.forEach(f => {
          if (f.source) {
            sourceCounts[f.source] = (sourceCounts[f.source] || 0) + 1
          }
        })
        
        const sourceDistribution = Object.entries(sourceCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)

        return {
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
          apartmentIssues,
          monthlyTrend,
          sourceDistribution
        }
      }).filter(Boolean) as HotelComparisonData[]

      setHotelsData(processedHotels)

      // Selecionar automaticamente os hotéis com mais problemas para comparação inicial
      const mostProblematic = processedHotels
        .sort((a, b) => (b.problemCount / b.totalFeedbacks) - (a.problemCount / a.totalFeedbacks))
        .slice(0, 3)
        .map(h => h.hotelId)
      
      setSelectedHotels(mostProblematic)

    } catch (error) {
      console.error('Erro ao buscar dados dos hotéis:', error)
      toast({
        title: "Erro ao Carregar Dados",
        description: "Não foi possível carregar os dados dos hotéis.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getSelectedHotelsData = () => {
    return hotelsData.filter(hotel => selectedHotels.includes(hotel.hotelId))
  }

  const analyzeWithGPT = async () => {
    if (selectedHotels.length < 2) {
      toast({
        title: "Seleção Insuficiente",
        description: "Selecione pelo menos 2 hotéis para análise comparativa.",
        variant: "destructive"
      })
      return
    }

    setAnalyzingWithGPT(true)
    
    try {
      const selectedData = getSelectedHotelsData()
      
      // Preparar dados para o GPT
      const promptData = selectedData.map(hotel => ({
        nome: hotel.hotelName,
        avaliacaoMedia: hotel.averageRating,
        totalFeedbacks: hotel.totalFeedbacks,
        sentimentoPositivo: hotel.positiveSentiment,
        sentimentoNegativo: hotel.negativeSentiment,
        principaisProblemas: hotel.topProblems.slice(0, 3),
        apartamentosProblematicos: hotel.apartmentIssues.slice(0, 3)
      }))

      const prompt = `
Você é um consultor especializado em hotelaria e gestão de propriedades. Analise estes ${selectedData.length} hotéis e forneça uma análise comparativa detalhada:

${JSON.stringify(promptData, null, 2)}

Forneça uma análise comparativa no formato JSON com:
{
  "summary": "Resumo executivo comparativo destacando qual hotel está em melhor situação e principais diferenças",
  "recommendations": ["Recomendação específica para hotel X", "Ação para hotel Y superar hotel Z", "Estratégia comparativa"],
  "criticalIssues": ["Problema mais crítico do hotel X vs Y", "Diferença alarmante entre propriedades"],
  "comparison": "Análise detalhada comparando hotel por hotel - quem está melhor em quê e por quê",
  "actionPlan": ["Ação para o hotel com pior performance", "Como o melhor hotel pode manter vantagem", "Estratégia de nivelamento"]
}

FOQUE EM:
- Qual hotel está performando melhor e por quê
- Lacunas específicas entre as propriedades
- Como os hotéis com pior performance podem alcançar os melhores
- Vantagens competitivas de cada hotel
- Recomendações específicas para cada propriedade baseadas na comparação
- Rankings claros de performance por categoria

Seja específico sobre QUAL hotel tem QUAL problema e COMO se compara aos outros.
      `

      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error('API Key do OpenAI não encontrada')
      }

      const response = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texto: prompt,
          apiKey,
        })
      })

      if (!response.ok) {
        throw new Error('Erro na análise GPT')
      }

      const result = await response.json()
      
      try {
        const analysis = JSON.parse(result.response)
        setGptAnalysis(analysis)
      } catch (parseError) {
        // Se não conseguir fazer parse do JSON, criar estrutura básica
        setGptAnalysis({
          summary: result.response,
          recommendations: [
            `Hotel com melhor performance deve manter padrões atuais`,
            `Hotéis com menor avaliação precisam de melhorias urgentes`,
            `Implementar benchmarking entre as propriedades`
          ],
          criticalIssues: [
            `Diferenças significativas de performance entre hotéis`, 
            `Necessidade de padronização de processos`
          ],
          comparison: `Análise comparativa detalhada entre os ${selectedData.length} hotéis selecionados mostra diferenças importantes de performance`,
          actionPlan: [
            `Priorizar melhorias no hotel com menor rating`,
            `Replicar boas práticas do hotel líder`,
            `Estabelecer metas de nivelamento entre propriedades`
          ]
        })
      }

      toast({
        title: "Análise Concluída",
        description: "Insights gerados com sucesso pelo GPT.",
      })

    } catch (error) {
      console.error('Erro na análise GPT:', error)
      toast({
        title: "Erro na Análise",
        description: "Não foi possível gerar insights com GPT.",
        variant: "destructive"
      })
    } finally {
      setAnalyzingWithGPT(false)
    }
  }

  const renderComparisonChart = (title: string, dataKey: string, color: string) => {
    const data = getSelectedHotelsData().map(hotel => ({
      name: hotel.hotelName,
      value: hotel[dataKey as keyof HotelComparisonData] as number
    }))

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    )
  }

  // Mapeamento das bandeiras
  const getBandeiraFromHotelName = (hotelName: string): string => {
    const lowerName = hotelName.toLowerCase()
    
    if (lowerName.includes('wish serrano') || 
        lowerName.includes('wish foz') || 
        lowerName.includes('wish bahia') || 
        lowerName.includes('wish natal')) {
      return 'wish'
    }
    
    if (lowerName.includes('prodigy gramado') || 
        lowerName.includes('prodigy santos dumont') || 
        lowerName.includes('marupiara')) {
      return 'prodigy'
    }
    
    if (lowerName.includes('linx galeão') || 
        lowerName.includes('linx confins')) {
      return 'linx'
    }
    
    return 'outros'
  }

  const getBandeirasData = (): BandeiraSummary[] => {
    const bandeiraGroups: { [key: string]: HotelComparisonData[] } = {
      wish: [],
      prodigy: [],
      linx: []
    }

    // Agrupar hotéis por bandeira
    hotelsData.forEach(hotel => {
      const bandeira = getBandeiraFromHotelName(hotel.hotelName)
      if (bandeiraGroups[bandeira]) {
        bandeiraGroups[bandeira].push(hotel)
      }
    })

    // Calcular métricas consolidadas por bandeira
    const bandeiras: BandeiraSummary[] = []

    Object.entries(bandeiraGroups).forEach(([key, hotels]) => {
      if (hotels.length > 0) {
        const totalFeedbacks = hotels.reduce((sum, h) => sum + h.totalFeedbacks, 0)
        const weightedRating = hotels.reduce((sum, h) => sum + (h.averageRating * h.totalFeedbacks), 0) / totalFeedbacks
        const weightedPositive = hotels.reduce((sum, h) => sum + (h.positiveSentiment * h.totalFeedbacks), 0) / totalFeedbacks
        const weightedNegative = hotels.reduce((sum, h) => sum + (h.negativeSentiment * h.totalFeedbacks), 0) / totalFeedbacks
        const totalProblems = hotels.reduce((sum, h) => sum + h.problemCount, 0)

        // Consolidar problemas da bandeira
        const allProblems: { [key: string]: number } = {}
        hotels.forEach(hotel => {
          hotel.topProblems.forEach(problem => {
            allProblems[problem.name] = (allProblems[problem.name] || 0) + problem.count
          })
        })

        const topProblems = Object.entries(allProblems)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        const bandeiraConfig = {
          wish: { name: 'Wish', color: '#8B5CF6', icon: '🌟' },
          prodigy: { name: 'Prodigy', color: '#10B981', icon: '🏆' },
          linx: { name: 'Linx', color: '#F59E0B', icon: '✈️' }
        }

        bandeiras.push({
          name: bandeiraConfig[key as keyof typeof bandeiraConfig].name,
          hotels,
          totalFeedbacks,
          averageRating: Number(weightedRating.toFixed(1)),
          positiveSentiment: Math.round(weightedPositive),
          negativeSentiment: Math.round(weightedNegative),
          totalProblems,
          topProblems,
          color: bandeiraConfig[key as keyof typeof bandeiraConfig].color,
          icon: bandeiraConfig[key as keyof typeof bandeiraConfig].icon
        })
      }
    })

    return bandeiras.sort((a, b) => b.averageRating - a.averageRating)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  const selectedData = getSelectedHotelsData()

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
            <h1 className="text-3xl font-bold">Comparação Avançada de Hotéis</h1>
            <p className="text-muted-foreground">
              Análise detalhada e insights com inteligência artificial
            </p>
          </div>
        </div>
        
        <Button 
          onClick={analyzeWithGPT}
          disabled={analyzingWithGPT || selectedHotels.length < 2}
          className="flex items-center gap-2"
        >
          {analyzingWithGPT ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {analyzingWithGPT ? 'Comparando...' : `Comparar ${selectedHotels.length} Hotéis com IA`}
        </Button>
      </div>

      {/* Banner Beta */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 border border-purple-300 dark:border-purple-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-purple-600 dark:bg-purple-500 text-white text-xs font-bold rounded-full">
                BETA
              </div>
              <div className="px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full">
                VERSÃO TESTE
              </div>
            </div>
            <div>
              <p className="font-semibold text-purple-800 dark:text-purple-200">
                🚀 Análise Comparativa com IA em Desenvolvimento
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Esta funcionalidade está em constante melhoria. Seus feedbacks são valiosos para aperfeiçoarmos a experiência.
              </p>
            </div>
          </div>
          <div className="text-2xl">
            🧪
          </div>
        </div>
      </div>

      {/* Seletor de Hotéis */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Selecionar Hotéis para Comparação</label>
            <Select
              value=""
              onValueChange={(value) => {
                if (selectedHotels.length < 4 && !selectedHotels.includes(value)) {
                  setSelectedHotels([...selectedHotels, value])
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Adicionar hotel (máx. 4)" />
              </SelectTrigger>
              <SelectContent>
                {hotelsData
                  .filter(hotel => !selectedHotels.includes(hotel.hotelId))
                  .map(hotel => (
                    <SelectItem key={hotel.hotelId} value={hotel.hotelId}>
                      {hotel.hotelName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-2 block">Hotéis Selecionados</label>
            <div className="flex flex-wrap gap-2">
              {selectedData.map(hotel => (
                <Badge
                  key={hotel.hotelId}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setSelectedHotels(selectedHotels.filter(id => id !== hotel.hotelId))}
                >
                  {hotel.hotelName}
                  <button className="ml-2 text-xs">×</button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Análise GPT */}
      {gptAnalysis && (
        <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200">Análise Comparativa com IA</h2>
            <Badge variant="outline" className="ml-2">
              {selectedData.length} hotéis comparados
            </Badge>
            <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600">
              🧪 BETA
            </Badge>
          </div>

          {/* Aviso Beta na Análise */}
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
            <p className="text-xs text-purple-700 dark:text-purple-300">
              ⚠️ <strong>Versão Beta:</strong> Esta análise está sendo constantemente aprimorada. 
              Os insights podem variar conforme melhoramos o algoritmo de comparação.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-200">
                📊 Resumo Comparativo
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{gptAnalysis.summary}</p>
              
              <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-200">
                ⚠️ Lacunas Críticas Identificadas
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {gptAnalysis.criticalIssues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span className="font-medium">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-200">
                💡 Estratégias de Melhoria
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-4">
                {gptAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span className="font-medium">{rec}</span>
                  </li>
                ))}
              </ul>
              
              <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-200">
                🎯 Plano de Nivelamento
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {gptAnalysis.actionPlan.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="font-medium">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
            <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-200">
              🔍 Análise Hotel por Hotel
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">{gptAnalysis.comparison}</p>
          </div>
          
          {/* Ranking Visual dos Hotéis */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-red-50 dark:from-green-900/20 dark:to-red-900/20 rounded-lg">
            <h3 className="font-semibold mb-3 text-center text-gray-800 dark:text-gray-200">🏆 Ranking de Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {selectedData
                .sort((a, b) => b.averageRating - a.averageRating)
                .map((hotel, index) => (
                  <div key={hotel.hotelId} className={`p-3 rounded-lg text-center ${
                    index === 0 ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-600' :
                    index === selectedData.length - 1 ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-600' :
                    'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-600'
                  }`}>
                    <div className="text-2xl mb-1">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}
                    </div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{hotel.hotelName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">⭐ {hotel.averageRating}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {hotel.problemCount} problemas
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="bandeiras">Bandeiras</TabsTrigger>
          <TabsTrigger value="problems">Problemas</TabsTrigger>
          <TabsTrigger value="apartments">Apartamentos</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedData.map(hotel => (
              <Card key={hotel.hotelId} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{hotel.hotelName}</h3>
                    <p className="text-sm text-muted-foreground">{hotel.totalFeedbacks} feedbacks</p>
                  </div>
                  <Hotel className="h-8 w-8 text-blue-500" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avaliação</span>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-semibold">{hotel.averageRating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Positivo</span>
                    <span className="font-semibold text-green-600">{hotel.positiveSentiment}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Problemas</span>
                    <span className="font-semibold text-red-600">{hotel.problemCount}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Gráficos Comparativos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderComparisonChart('Avaliação Média', 'averageRating', '#0088FE')}
            {renderComparisonChart('Total de Feedbacks', 'totalFeedbacks', '#00C49F')}
            {renderComparisonChart('Sentimento Positivo (%)', 'positiveSentiment', '#FFBB28')}
            {renderComparisonChart('Quantidade de Problemas', 'problemCount', '#FF8042')}
          </div>

          {/* Distribuição de Sentimentos */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Sentimentos</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={selectedData.map(hotel => ({
                  name: hotel.hotelName,
                  positivo: hotel.positiveSentiment,
                  neutro: hotel.neutralSentiment,
                  negativo: hotel.negativeSentiment
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="positivo" stackId="a" fill="#22c55e" name="Positivo" />
                <Bar dataKey="neutro" stackId="a" fill="#64748b" name="Neutro" />
                <Bar dataKey="negativo" stackId="a" fill="#ef4444" name="Negativo" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="bandeiras" className="space-y-6">
          {/* Header Bandeiras */}
          <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">🏢 Comparação por Bandeiras</h2>
              <p className="text-muted-foreground">Análise consolidada das 3 bandeiras da rede hoteleira</p>
            </div>
          </Card>

          {(() => {
            const bandeirasData = getBandeirasData()
            
            if (bandeirasData.length === 0) {
              return (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhuma bandeira encontrada nos dados disponíveis</p>
                </Card>
              )
            }

            return (
              <>
                {/* Cards Resumo das Bandeiras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {bandeirasData.map((bandeira, index) => (
                    <Card key={bandeira.name} className={`p-6 border-2 ${
                      index === 0 ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
                      index === 1 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                      'border-red-300 bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-2">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          {bandeira.icon}
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: bandeira.color }}>
                          {bandeira.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {bandeira.hotels.length} hotéis na rede
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Avaliação Geral</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-lg">{bandeira.averageRating}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total de Feedbacks</span>
                          <span className="font-semibold">{bandeira.totalFeedbacks.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Sentimento Positivo</span>
                          <span className="font-semibold text-green-600">{bandeira.positiveSentiment}%</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total de Problemas</span>
                          <Badge variant="destructive">{bandeira.totalProblems}</Badge>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium mb-2">Hotéis da Bandeira:</p>
                          <div className="space-y-1">
                            {bandeira.hotels.map(hotel => (
                              <div key={hotel.hotelId} className="flex items-center justify-between text-xs">
                                <span className="truncate">{hotel.hotelName}</span>
                                <span className="flex items-center gap-1 ml-2">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {hotel.averageRating}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Gráfico Comparativo das Bandeiras */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">📊 Performance Comparativa das Bandeiras</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={bandeirasData.map(b => ({
                        name: b.name,
                        avaliacao: b.averageRating,
                        feedbacks: b.totalFeedbacks / 100, // Dividir por 100 para escala visual
                        positivo: b.positiveSentiment,
                        problemas: b.totalProblems
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'feedbacks') return [(value as number * 100).toLocaleString(), 'Total Feedbacks']
                          return [value, name]
                        }}
                      />
                      <Bar dataKey="avaliacao" fill="#8884d8" name="Avaliação Média" />
                      <Bar dataKey="positivo" fill="#22c55e" name="Sentimento Positivo %" />
                      <Bar dataKey="feedbacks" fill="#3b82f6" name="Feedbacks (÷100)" />
                      <Bar dataKey="problemas" fill="#ef4444" name="Total Problemas" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Análise de Problemas por Bandeira */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {bandeirasData.map(bandeira => (
                    <Card key={bandeira.name} className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{bandeira.icon}</span>
                        <h3 className="text-lg font-semibold" style={{ color: bandeira.color }}>
                          {bandeira.name}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Principais Problemas da Bandeira</h4>
                          {bandeira.topProblems.length > 0 ? (
                            <div className="space-y-2">
                              {bandeira.topProblems.slice(0, 3).map((problem, index) => (
                                <div key={problem.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                  <span className="text-xs font-medium truncate">{problem.name}</span>
                                  <Badge variant="outline" className="text-xs">{problem.count}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum problema significativo</p>
                          )}
                        </div>

                        <div className="pt-3 border-t text-center">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="font-medium">Taxa de Problemas</p>
                              <p className="text-lg font-bold text-red-600">
                                {bandeira.totalFeedbacks > 0 ? 
                                  Math.round((bandeira.totalProblems / bandeira.totalFeedbacks) * 100) : 0}%
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Eficiência</p>
                              <p className="text-lg font-bold text-green-600">
                                {bandeira.positiveSentiment}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Ranking Detalhado */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">🏆 Ranking Consolidado das Bandeiras</h3>
                  <div className="space-y-4">
                    {bandeirasData.map((bandeira, index) => (
                      <div key={bandeira.name} className={`p-4 rounded-lg border-2 ${
                        index === 0 ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
                        index === 1 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
                        'border-red-300 bg-red-50 dark:bg-red-900/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </div>
                            <div>
                              <h4 className="text-xl font-bold" style={{ color: bandeira.color }}>
                                {bandeira.icon} {bandeira.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {bandeira.hotels.length} propriedades • {bandeira.totalFeedbacks.toLocaleString()} feedbacks
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end mb-1">
                              <Star className="h-5 w-5 text-yellow-500" />
                              <span className="text-2xl font-bold">{bandeira.averageRating}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {bandeira.positiveSentiment}% positivo
                            </p>
                          </div>
                        </div>

                        {/* Performance individual dos hotéis */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {bandeira.hotels.map(hotel => (
                              <div key={hotel.hotelId} className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <p className="font-medium text-sm mb-1 truncate">{hotel.hotelName}</p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {hotel.averageRating}
                                  </span>
                                  <span className="text-red-600">{hotel.problemCount} problemas</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Insights Rápidos */}
                <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">💡 Insights Rápidos das Bandeiras</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">🏆 Líder em Performance</h4>
                      <p className="text-sm">
                        <strong>{bandeirasData[0]?.name}</strong> se destaca com {bandeirasData[0]?.averageRating} de avaliação média
                        e {bandeirasData[0]?.positiveSentiment}% de sentimento positivo.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">📊 Volume de Dados</h4>
                      <p className="text-sm">
                        Total de <strong>{bandeirasData.reduce((sum, b) => sum + b.totalFeedbacks, 0).toLocaleString()} feedbacks</strong> 
                        analisados em {bandeirasData.reduce((sum, b) => sum + b.hotels.length, 0)} propriedades.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">⚠️ Oportunidade</h4>
                      <p className="text-sm">
                        <strong>{bandeirasData[bandeirasData.length - 1]?.name}</strong> tem potencial para crescer 
                        {((bandeirasData[0]?.averageRating || 0) - (bandeirasData[bandeirasData.length - 1]?.averageRating || 0)).toFixed(1)} pontos na avaliação.
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )
          })()}
        </TabsContent>

        <TabsContent value="problems" className="space-y-6">
          {selectedData.map(hotel => (
            <Card key={hotel.hotelId} className="p-6">
              <h3 className="text-xl font-semibold mb-4">{hotel.hotelName} - Análise de Problemas</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Principais Problemas */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                    Principais Problemas ({hotel.problemCount} total)
                  </h4>
                  {hotel.topProblems.length > 0 ? (
                    <div className="space-y-2">
                      {hotel.topProblems.map((problem, index) => (
                        <div key={problem.name} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm font-medium">{problem.name}</span>
                          <Badge variant="destructive">{problem.count} casos</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum problema significativo identificado</p>
                  )}
                </div>

                {/* Departamentos Afetados */}
                <div>
                  <h4 className="font-semibold mb-4">Departamentos com Mais Feedbacks</h4>
                  {hotel.topSectors.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={hotel.topSectors}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {hotel.topSectors.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="apartments" className="space-y-6">
          {selectedData.map(hotel => (
            <Card key={hotel.hotelId} className="p-6">
              <h3 className="text-xl font-semibold mb-4">{hotel.hotelName} - Apartamentos Problemáticos</h3>
              
              {hotel.apartmentIssues.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hotel.apartmentIssues.slice(0, 6).map((apt, index) => (
                      <Card key={apt.apartment} className="p-4 border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{apt.apartment}</h4>
                          <Badge variant="destructive">{apt.issues} problemas</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Avaliação média:</span>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <span className="font-medium">{apt.avgRating}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Distribuição de Problemas por Apartamento</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={hotel.apartmentIssues.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="apartment" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="issues" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum problema significativo nos apartamentos</p>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {selectedData.map(hotel => (
            <Card key={hotel.hotelId} className="p-6">
              <h3 className="text-xl font-semibold mb-4">{hotel.hotelName} - Tendências Temporais</h3>
              
              <div className="space-y-6">
                {/* Evolução das Avaliações */}
                {hotel.monthlyTrend.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Evolução da Avaliação Média
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={hotel.monthlyTrend}>
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
                  </div>
                )}

                {/* Distribuição por Fonte */}
                <div>
                  <h4 className="font-semibold mb-4">Fontes de Feedback</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hotel.sourceDistribution.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
} 