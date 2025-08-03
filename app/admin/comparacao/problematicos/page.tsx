"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModernChart, ProblemsChart, HotelsChart, RatingsChart, DepartmentsChart, SourcesChart, ApartmentsChart } from '@/components/modern-charts'
import { ArrowLeft, AlertTriangle, Brain, Loader2, TrendingDown, Users, Star, Target, Zap } from "lucide-react"
import { getAllAnalyses } from "@/lib/firestore-service"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { getApiKey } from "@/lib/openai-client"
import type { Feedback, Analysis } from "@/types"
import { filterValidFeedbacks } from "@/lib/utils"

interface ProblematicHotel {
  hotelId: string
  hotelName: string
  totalFeedbacks: number
  averageRating: number
  positiveSentiment: number
  negativeSentiment: number
  problemCount: number
  problemPercentage: number
  criticalProblems: Array<{ name: string; count: number; severity: 'alta' | 'media' | 'baixa' }>
  worstApartments: Array<{ apartment: string; problems: number; rating: number }>
  urgentIssues: string[]
  riskLevel: 'alto' | 'medio' | 'baixo'
}

interface GPTProblematicAnalysis {
  executiveSummary: string
  priorityActions: string[]
  riskAssessment: string
  competitiveImpact: string
  recoveryPlan: Array<{ action: string; timeline: string; priority: 'alta' | 'media' | 'baixa' }>
  budgetEstimate: string
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']

export default function HoteisProblematicos() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [analyzingWithGPT, setAnalyzingWithGPT] = useState(false)
  const [problematicHotels, setProblematicHotels] = useState<ProblematicHotel[]>([])
  const [gptAnalysis, setGptAnalysis] = useState<GPTProblematicAnalysis | null>(null)

  useEffect(() => {
    fetchProblematicHotels()
  }, [])

  const fetchProblematicHotels = async () => {
    try {
      setLoading(true)
      
      const allAnalyses = await getAllAnalyses()
      
      if (!allAnalyses || allAnalyses.length === 0) {
        toast({
          title: "Nenhum Dado Encontrado",
          description: "Não há análises disponíveis.",
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

      // Processar hotéis problemáticos
      const problematicData: ProblematicHotel[] = Object.entries(hotelGroups).map(([hotelKey, analyses]) => {
        let allFeedbacks: Feedback[] = []
        
        analyses.forEach(analysis => {
          if (analysis.data && Array.isArray(analysis.data)) {
            // Filtrar feedbacks excluídos e "Não identificados"
            const validFeedbacks = filterValidFeedbacks(analysis.data.filter((feedback: any) => feedback.deleted !== true));
            allFeedbacks = [...allFeedbacks, ...validFeedbacks]
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

        // Contar problemas
        const problemCounts: Record<string, number> = {}
        allFeedbacks.forEach(f => {
          if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
            problemCounts[f.problem] = (problemCounts[f.problem] || 0) + 1
          }
        })
        
        const totalProblems = Object.values(problemCounts).reduce((sum, count) => sum + count, 0)
        const problemPercentage = Math.round((totalProblems / totalFeedbacks) * 100)

        // Definir severidade dos problemas
        const criticalProblems = Object.entries(problemCounts)
          .map(([name, count]) => {
            let severity: 'alta' | 'media' | 'baixa' = 'baixa'
            const problemRate = count / totalFeedbacks * 100
            
            if (problemRate > 15) severity = 'alta'
            else if (problemRate > 8) severity = 'media'
            
            return { name, count, severity }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Apartamentos problemáticos
        const apartmentData: Record<string, { problems: number; totalRating: number; count: number }> = {}
        allFeedbacks.forEach(f => {
          if (f.apartamento) {
            if (!apartmentData[f.apartamento]) {
              apartmentData[f.apartamento] = { problems: 0, totalRating: 0, count: 0 }
            }
            apartmentData[f.apartamento].count++
            apartmentData[f.apartamento].totalRating += (f.rating || 0)
            if (f.problem && f.problem.trim() !== '' && f.problem !== 'Não' && f.problem !== 'VAZIO') {
              apartmentData[f.apartamento].problems++
            }
          }
        })

        const worstApartments = Object.entries(apartmentData)
          .map(([apartment, data]) => ({
            apartment,
            problems: data.problems,
            rating: Number((data.totalRating / data.count).toFixed(1))
          }))
          .filter(apt => apt.problems > 0)
          .sort((a, b) => b.problems - a.problems)
          .slice(0, 5)

        // Questões urgentes
        const urgentIssues: string[] = []
        if (averageRating < 3.0) urgentIssues.push("Avaliação crítica - abaixo de 3.0")
        if (negativeSentiment > 40) urgentIssues.push(`Alto sentimento negativo - ${negativeSentiment}%`)
        if (problemPercentage > 50) urgentIssues.push(`Mais da metade dos feedbacks reportam problemas`)
        
        criticalProblems.forEach(problem => {
          if (problem.severity === 'alta') {
            urgentIssues.push(`Problema crítico: ${problem.name} (${problem.count} casos)`)
          }
        })

        // Nível de risco
        let riskLevel: 'alto' | 'medio' | 'baixo' = 'baixo'
        if (averageRating < 3.0 || negativeSentiment > 40 || (averageRating < 3.5 && negativeSentiment > 25) || (averageRating < 4.0 && negativeSentiment > 30 && problemPercentage > 50)) {
          riskLevel = 'alto'
        } else if (averageRating < 3.5 || negativeSentiment > 25 || problemPercentage > 30) {
          riskLevel = 'medio'
        }

        // Filtrar apenas hotéis realmente problemáticos (critérios mais balanceados)
        const isProblematic = (
          averageRating < 3.0 || // Avaliação realmente baixa
          negativeSentiment > 40 || // Alto sentimento negativo
          (averageRating < 3.5 && negativeSentiment > 25) || // Avaliação média com sentimento negativo moderado
          (averageRating < 4.0 && negativeSentiment > 30 && problemPercentage > 50) // Combinação de fatores
        )

        if (!isProblematic) return null

        return {
          hotelId,
          hotelName,
          totalFeedbacks,
          averageRating: Number(averageRating.toFixed(1)),
          positiveSentiment,
          negativeSentiment,
          problemCount: totalProblems,
          problemPercentage,
          criticalProblems,
          worstApartments,
          urgentIssues,
          riskLevel
        }
      }).filter(Boolean) as ProblematicHotel[]

      // Ordenar por nível de risco e problemas
      problematicData.sort((a, b) => {
        const riskOrder = { alto: 3, medio: 2, baixo: 1 }
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
        }
        return b.problemPercentage - a.problemPercentage
      })

      setProblematicHotels(problematicData)

    } catch (error) {
      console.error('Erro ao buscar hotéis problemáticos:', error)
      toast({
        title: "Erro ao Carregar Dados",
        description: "Não foi possível carregar os dados dos hotéis problemáticos.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const analyzeProblemsWithGPT = async () => {
    if (problematicHotels.length === 0) {
      toast({
        title: "Nenhum Hotel Problemático",
        description: "Não há hotéis problemáticos para analisar.",
        variant: "destructive"
      })
      return
    }

    setAnalyzingWithGPT(true)
    
    try {
      // Preparar dados dos hotéis mais problemáticos
      const topProblematicHotels = problematicHotels.slice(0, 3).map(hotel => ({
        nome: hotel.hotelName,
        avaliacaoMedia: hotel.averageRating,
        problemas: hotel.problemCount,
        percentualProblemas: hotel.problemPercentage,
        sentimentoNegativo: hotel.negativeSentiment,
        nivelRisco: hotel.riskLevel,
        problemasCriticos: hotel.criticalProblems.slice(0, 3),
        apartamentosProblematicos: hotel.worstApartments.slice(0, 3),
        questoesUrgentes: hotel.urgentIssues
      }))

      const prompt = `
Você é um consultor sênior em hotelaria. Analise estes hotéis problemáticos e forneça um plano de recuperação estratégico:

${JSON.stringify(topProblematicHotels, null, 2)}

Forneça uma análise em JSON com o seguinte formato:
{
  "executiveSummary": "Resumo executivo da situação crítica (máx 200 palavras)",
  "priorityActions": ["Ação prioritária 1", "Ação prioritária 2", "Ação prioritária 3"],
  "riskAssessment": "Avaliação detalhada dos riscos ao negócio",
  "competitiveImpact": "Impacto na competitividade e reputação da marca",
  "recoveryPlan": [
    {"action": "Ação específica", "timeline": "Prazo", "priority": "alta"},
    {"action": "Outra ação", "timeline": "Prazo", "priority": "media"}
  ],
  "budgetEstimate": "Estimativa de investimento necessário para recuperação"
}

Seja específico, prático e focado em recuperação rápida da reputação e satisfação dos clientes.
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
        // Fallback se não conseguir fazer parse
        setGptAnalysis({
          executiveSummary: result.response,
          priorityActions: ["Implementar correções nos problemas mais críticos", "Treinar equipe para melhor atendimento", "Monitorar satisfação do cliente diariamente"],
          riskAssessment: "Situação requer atenção imediata para evitar perda de clientes",
          competitiveImpact: "Impacto negativo na competitividade e reputação da marca",
          recoveryPlan: [
            {action: "Correção imediata dos problemas infraestruturais", timeline: "15 dias", priority: "alta"},
            {action: "Treinamento da equipe", timeline: "30 dias", priority: "alta"},
            {action: "Implementação de sistema de monitoramento", timeline: "45 dias", priority: "media"}
          ],
          budgetEstimate: "Investimento estimado necessário para recuperação: R$ 50.000 - R$ 150.000"
        })
      }

      toast({
        title: "Análise Concluída",
        description: "Plano de recuperação gerado com sucesso.",
      })

    } catch (error) {
      console.error('Erro na análise GPT:', error)
      toast({
        title: "Erro na Análise",
        description: "Não foi possível gerar o plano de recuperação.",
        variant: "destructive"
      })
    } finally {
      setAnalyzingWithGPT(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'alto': return 'bg-red-100 text-red-800 border-red-200'
      case 'medio': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'baixo': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'baixa': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
            <h1 className="text-3xl font-bold text-red-700">Hotéis Problemáticos</h1>
            <p className="text-muted-foreground">
              Análise crítica e plano de recuperação
            </p>
          </div>
        </div>
        
        <Button 
          onClick={analyzeProblemsWithGPT}
          disabled={analyzingWithGPT || problematicHotels.length === 0}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
        >
          {analyzingWithGPT ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {analyzingWithGPT ? 'Analisando...' : 'Gerar Plano de Recuperação'}
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
                🔍 Análise de Hotéis Problemáticos em Desenvolvimento
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Esta funcionalidade está sendo aprimorada constantemente. Os insights de recuperação são gerados para auxiliar na gestão estratégica.
              </p>
            </div>
          </div>
          <div className="text-2xl">
            🧪
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Hotéis Problemáticos</p>
              <p className="text-2xl font-bold text-red-600">{problematicHotels.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Risco Alto</p>
              <p className="text-2xl font-bold text-red-600">
                {problematicHotels.filter(h => h.riskLevel === 'alto').length}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Risco Médio</p>
              <p className="text-2xl font-bold text-yellow-600">
                {problematicHotels.filter(h => h.riskLevel === 'medio').length}
              </p>
            </div>
            <Users className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Problemas Totais</p>
              <p className="text-2xl font-bold text-blue-600">
                {problematicHotels.reduce((sum, h) => sum + h.problemCount, 0)}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Plano de Recuperação GPT */}
      {gptAnalysis && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-800">Plano de Recuperação Estratégico</h2>
          </div>

          {/* Aviso Beta na Análise */}
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
            <p className="text-xs text-purple-700 dark:text-purple-300">
              ⚠️ <strong>Versão Beta:</strong> Esta análise de recuperação está sendo constantemente aprimorada. 
              Os planos de ação podem variar conforme melhoramos o algoritmo de geração de estratégias.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-red-700">🚨 Resumo Executivo</h3>
              <p className="text-sm text-gray-700 mb-4">{gptAnalysis.executiveSummary}</p>
              
              <h3 className="font-semibold mb-2 text-red-700">⚡ Ações Prioritárias</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {gptAnalysis.priorityActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Zap className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 text-red-700">📊 Avaliação de Risco</h3>
              <p className="text-sm text-gray-700 mb-4">{gptAnalysis.riskAssessment}</p>
              
              <h3 className="font-semibold mb-2 text-red-700">🎯 Impacto Competitivo</h3>
              <p className="text-sm text-gray-700">{gptAnalysis.competitiveImpact}</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg">
              <h3 className="font-semibold mb-3 text-red-700">📋 Plano de Ação Detalhado</h3>
              <div className="space-y-3">
                {gptAnalysis.recoveryPlan.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-gray-600">Prazo: {item.timeline}</p>
                    </div>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg">
              <h3 className="font-semibold mb-3 text-red-700">💰 Estimativa de Investimento</h3>
              <p className="text-sm text-gray-700">{gptAnalysis.budgetEstimate}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Hotéis Problemáticos */}
      {problematicHotels.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="problems">Problemas Críticos</TabsTrigger>
            <TabsTrigger value="apartments">Apartamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {problematicHotels.map((hotel, index) => (
              <Card key={hotel.hotelId} className="p-6 border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{hotel.hotelName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {hotel.totalFeedbacks} feedbacks • {hotel.problemCount} problemas ({hotel.problemPercentage}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getRiskColor(hotel.riskLevel)}>
                      Risco {hotel.riskLevel}
                    </Badge>
                    <div className="text-right">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold text-lg">{hotel.averageRating}</span>
                      </div>
                      <p className="text-sm text-red-600">{hotel.negativeSentiment}% negativo</p>
                    </div>
                  </div>
                </div>

                {/* Questões Urgentes */}
                {hotel.urgentIssues.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-red-700 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Questões Urgentes
                    </h4>
                    <div className="space-y-1">
                      {hotel.urgentIssues.map((issue, idx) => (
                        <div key={idx} className="text-sm text-red-700 bg-red-50 p-2 rounded border-l-4 border-red-400">
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gráfico de Problemas */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-3">Principais Problemas</h4>
                  <ProblemsChart
                    data={hotel.criticalProblems.map(problem => ({
                      label: problem.name,
                      value: problem.count
                    }))}
                  />
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="problems" className="space-y-4">
            {problematicHotels.map(hotel => (
              <Card key={hotel.hotelId} className="p-6 border-red-200">
                <h3 className="text-xl font-semibold mb-4">{hotel.hotelName} - Problemas Críticos</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Problemas por Severidade</h4>
                    <div className="space-y-2">
                      {hotel.criticalProblems.map((problem, index) => (
                        <div key={problem.name} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{problem.name}</span>
                            <p className="text-xs text-gray-600">{problem.count} ocorrências</p>
                          </div>
                          <Badge className={
                            problem.severity === 'alta' ? 'bg-red-100 text-red-800' :
                            problem.severity === 'media' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {problem.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Distribuição de Problemas</h4>
                    <ModernChart
                      type="pie"
                      data={hotel.criticalProblems.map(problem => ({
                        label: problem.name,
                        value: problem.count
                      }))}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="apartments" className="space-y-4">
            {problematicHotels.map(hotel => (
              <Card key={hotel.hotelId} className="p-6 border-red-200">
                <h3 className="text-xl font-semibold mb-4">{hotel.hotelName} - Apartamentos Problemáticos</h3>
                
                {hotel.worstApartments.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {hotel.worstApartments.map((apt, index) => (
                        <Card key={apt.apartment} className="p-4 border-red-300 bg-red-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-red-800">{apt.apartment}</h4>
                            <Badge variant="destructive">{apt.problems} problemas</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Avaliação:</span>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span className="font-medium text-red-700">{apt.rating}</span>
                            </div>
                          </div>
                          {index < 3 && (
                            <Badge className="mt-2 w-full justify-center bg-red-600 text-white">
                              PRIORIDADE ALTA
                            </Badge>
                          )}
                        </Card>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold mb-4">Distribuição de Problemas por Apartamento</h4>
                      <ApartmentsChart
                        data={hotel.worstApartments.map(apt => ({
                          label: apt.apartment,
                          value: apt.problems
                        }))}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum apartamento com problemas significativos identificado</p>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Star className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-800">Excelente!</h3>
              <p className="text-muted-foreground">
                Nenhum hotel problemático identificado. Todos os hotéis estão operando dentro dos padrões aceitáveis.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}