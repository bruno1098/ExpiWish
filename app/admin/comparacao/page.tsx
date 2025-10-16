"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModernChart, ProblemsChart, HotelsChart, RatingsChart } from '@/components/modern-charts'
import { useRouter } from "next/navigation"
import { Hotel, Star, MessageSquare, AlertTriangle, Users, Award, BarChart3, ArrowRight, Search, Filter, Calendar, Home, Eye, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { getAllAnalyses } from "@/lib/firestore-service"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import type { Feedback, Analysis } from "@/types"
import { filterValidFeedbacks, isValidProblem } from "@/lib/utils"

interface HotelSummary {
  hotelId: string
  hotelName: string
  totalFeedbacks: number
  averageRating: number
  positiveSentiment: number
  negativeSentiment: number
  problemCount: number
  lastUpdate: string
  isProblematic: boolean
}

interface ProblemResult {
  problem: string
  totalOccurrences: number
  hotels: Array<{
    hotelId: string
    hotelName: string
    occurrences: number
    averageRating: number
    apartments: Array<{
      apartment: string
      count: number
      avgRating: number
    }>
  }>
}

interface ProblemSummary {
  name: string
  count: number
  hotels: number
  percentage: number
}

// Tooltip personalizado com design circular e elegante
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          />
          <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        </div>
        {payload.map((entry: any, index: number) => {
          // Mapear nomes técnicos para nomes amigáveis
          const friendlyNames: { [key: string]: string } = {
            'value': 'Valor',
            'count': 'Ocorrências',
            'occurrences': 'Ocorrências',
            'name': 'Nome',
            'percentage': 'Porcentagem',
            'hotels': 'Hotéis Afetados',
            'cases': 'Casos'
          }
          
          const displayName = friendlyNames[entry.dataKey] || friendlyNames[entry.name] || entry.name || 'Ocorrências'
          
          return (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{displayName}:</span> {
                entry.dataKey === 'percentage' ? `${entry.value}%` :
                typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value
              }
            </p>
          )
        })}
      </div>
    )
  }
  return null
}

// Modal para detalhes dos gráficos
const ChartDetailModal = ({ isOpen, onClose, title, data, type }: {
  isOpen: boolean
  onClose: () => void
  title: string
  data: any[]
  type: 'problems' | 'hotels' | 'general'
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {title}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕ Fechar
          </Button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6">
          <div className="space-y-4">
            {data.map((item, index) => (
              <Card key={index} className="p-4 hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.name || item.hotelName || item.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count || item.value || item.occurrences} ocorrências
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                      {item.percentage ? `${item.percentage}%` : 'Detalhes'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HoteisPage() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [hotelsData, setHotelsData] = useState<HotelSummary[]>([])
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([])
  
  // Estados para busca de problemas
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedHotelFilter, setSelectedHotelFilter] = useState<string>("all")
  const [problemResults, setProblemResults] = useState<ProblemResult[]>([])
  const [commonProblems, setCommonProblems] = useState<ProblemSummary[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Estados para modal de detalhes
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    title: string
    data: any[]
    type: 'problems' | 'hotels' | 'general'
  }>({
    title: '',
    data: [],
    type: 'general'
  })

  // Controlar scroll quando modal estiver aberto
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [modalOpen])

  const openModal = (title: string, data: any[], type: 'problems' | 'hotels' | 'general') => {
    setModalData({ title, data, type })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalData({ title: '', data: [], type: 'general' })
  }

  useEffect(() => {
    fetchHotelsData()
  }, [])

  useEffect(() => {
    if (allFeedbacks.length > 0) {
      calculateCommonProblems()
    }
  }, [allFeedbacks])

  useEffect(() => {
    if (searchTerm || selectedHotelFilter !== "all") {
      searchProblems()
    } else {
      setProblemResults([])
    }
  }, [searchTerm, selectedHotelFilter, allFeedbacks])

  const fetchHotelsData = async () => {
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
      let consolidatedFeedbacks: Feedback[] = []
      
      allAnalyses.forEach((analysis: any) => {
        const hotelKey = analysis.hotelId || analysis.hotelName || 'Unknown'
        if (!hotelGroups[hotelKey]) {
          hotelGroups[hotelKey] = []
        }
        hotelGroups[hotelKey].push(analysis)
        
        // Consolidar todos os feedbacks para busca (excluindo feedbacks deletados e "Não identificados")
        if (analysis.data && Array.isArray(analysis.data)) {
          const validFeedbacks = analysis.data
            .filter((feedback: any) => feedback.deleted !== true)
            .map((feedback: Feedback) => ({
              ...feedback,
              hotelId: analysis.hotelId || hotelKey,
              hotelName: analysis.hotelName || hotelKey
            }))
          const filteredValidFeedbacks = filterValidFeedbacks(validFeedbacks);
          consolidatedFeedbacks = [...consolidatedFeedbacks, ...filteredValidFeedbacks]
        }
      })

      setAllFeedbacks(consolidatedFeedbacks)

      // Processar dados de cada hotel
      const processedHotels: HotelSummary[] = Object.entries(hotelGroups).map(([hotelKey, analyses]) => {
        let allFeedbacks: Feedback[] = []
        
        analyses.forEach(analysis => {
          if (analysis.data && Array.isArray(analysis.data)) {
            // Filtrar feedbacks excluídos e "Não identificados"
            const validFeedbacks = analysis.data.filter((feedback: any) => feedback.deleted !== true);
            const filteredValidFeedbacks = filterValidFeedbacks(validFeedbacks);
            allFeedbacks = [...allFeedbacks, ...filteredValidFeedbacks]
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

        // Contar problemas válidos
        const problemCount = allFeedbacks.filter(f => 
          f.problem && 
          f.problem.trim() !== '' && 
          f.problem !== 'Não' && 
          f.problem !== 'VAZIO'
        ).length

        const lastUpdate = analyses
          .map(a => a.importDate?.toDate?.() || new Date(a.importDate))
          .sort((a, b) => b.getTime() - a.getTime())[0]
          ?.toLocaleDateString('pt-BR') || 'N/A'

        // Definir se o hotel é problemático (critérios mais balanceados)
        const isProblematic = (
          averageRating < 3.0 || // Avaliação realmente baixa
          negativeSentiment > 40 || // Alto sentimento negativo
          (averageRating < 3.5 && negativeSentiment > 25) || // Avaliação média com sentimento negativo moderado
          (averageRating < 4.0 && negativeSentiment > 30 && (problemCount / totalFeedbacks) > 0.5) // Combinação de fatores
        )

        return {
          hotelId,
          hotelName,
          totalFeedbacks,
          averageRating: Number(averageRating.toFixed(1)),
          positiveSentiment,
          negativeSentiment,
          problemCount,
          lastUpdate,
          isProblematic
        }
      }).filter(Boolean) as HotelSummary[]

      // Ordenar por rating decrescente
      processedHotels.sort((a, b) => b.averageRating - a.averageRating)

      setHotelsData(processedHotels)

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

  // Função para normalizar texto para busca inteligente
  const normalizeSearchText = (text: string): string => {
    if (!text) return ''
    
    return text
      .toLowerCase() // Converter para minúsculas
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[&]/g, ' e ') // Substituir & por "e" para evitar matches em A&B
      .replace(/[^\w\s]/g, ' ') // Remover pontuação, hífens, etc (manter apenas letras, números e espaços)
      .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
      .trim() // Remover espaços no início/fim
  }

  // Função para verificar se um termo de busca corresponde a um problema
  const isSearchMatch = (problemText: string, searchTerm: string): boolean => {
    const normalizedProblem = normalizeSearchText(problemText)
    const normalizedSearch = normalizeSearchText(searchTerm)
    
    // Se a busca for muito curta (1-2 caracteres), ser mais rigoroso
    if (normalizedSearch.length <= 2) {
      return normalizedProblem === normalizedSearch
    }
    
    // Busca exata normalizada (mais precisa)
    if (normalizedProblem.includes(normalizedSearch)) {
      return true
    }
    
    // Busca por palavras individuais - mais rigorosa
    const searchWords = normalizedSearch.split(' ').filter(word => word.length >= 3) // Mínimo 3 caracteres
    const problemWords = normalizedProblem.split(' ').filter(word => word.length >= 2)
    
    if (searchWords.length === 0) return false
    
    // Cada palavra de busca precisa ter match significativo
    return searchWords.every(searchWord => {
      return problemWords.some(problemWord => {
        // Match exato
        if (problemWord === searchWord) return true
        
        // Match parcial: palavra do problema contém palavra de busca (mínimo 3 chars)
        if (searchWord.length >= 3 && problemWord.includes(searchWord)) return true
        
        // Match parcial reverso: palavra de busca contém palavra do problema (ambas >= 3 chars)
        if (problemWord.length >= 3 && searchWord.includes(problemWord)) return true
        
        // Similaridade para palavras maiores (evitar matches soltos)
        if (searchWord.length >= 4 && problemWord.length >= 4) {
          // Verificar se começam igual (primeiros 3 caracteres)
          if (searchWord.substring(0, 3) === problemWord.substring(0, 3)) return true
        }
        
        return false
      })
    })
  }

  const calculateCommonProblems = () => {
    if (!allFeedbacks || allFeedbacks.length === 0) {
      setCommonProblems([]);
      return;
    }

    // Usar apenas feedbacks válidos
    const validFeedbacks = filterValidFeedbacks(allFeedbacks);
    
    const problemCounts: Record<string, number> = {};
    const hotelCounts: Record<string, Set<string>> = {};

    validFeedbacks.forEach(feedback => {
      if (feedback.problem && isValidProblem(feedback.problem)) {
        // Separar problemas por ; e remover duplicatas
        const problems = Array.from(new Set(feedback.problem.split(';').map((p: string) => p.trim()))) as string[];
        
        problems.forEach(problem => {
          if (isValidProblem(problem)) {
            problemCounts[problem] = (problemCounts[problem] || 0) + 1;
            
            if (!hotelCounts[problem]) {
              hotelCounts[problem] = new Set();
            }
            hotelCounts[problem].add(feedback.hotelName || feedback.hotelId || 'Unknown');
          }
        });
      }
    });

    const totalProblems = Object.values(problemCounts).reduce((sum, count) => sum + count, 0);

    const commonProblemsData: ProblemSummary[] = Object.entries(problemCounts)
      .map(([problem, count]) => ({
        name: problem,
        count,
        hotels: hotelCounts[problem]?.size || 0,
        percentage: totalProblems > 0 ? Math.round((count / totalProblems) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    setCommonProblems(commonProblemsData);
  };

  const searchProblems = async () => {
    if (!searchTerm && selectedHotelFilter === "all") {
      setProblemResults([])
      return
    }

    setSearchLoading(true)

    try {
      let filteredFeedbacks = allFeedbacks.filter(feedback => 
        feedback.problem && 
        feedback.problem.trim() !== '' && 
        feedback.problem !== 'Não' && 
        feedback.problem !== 'VAZIO'
      )

      // Filtrar por hotel se selecionado
      if (selectedHotelFilter !== "all") {
        filteredFeedbacks = filteredFeedbacks.filter(feedback => 
          (feedback as any).hotelId === selectedHotelFilter || (feedback as any).hotelName === selectedHotelFilter
        )
      }

      // Filtrar por termo de busca com busca inteligente
      if (searchTerm) {
        filteredFeedbacks = filteredFeedbacks.filter(feedback =>
          isSearchMatch(feedback.problem || '', searchTerm)
        )
      }

      // Agrupar resultados por problema
      const problemGroups: Record<string, {
        problem: string
        totalOccurrences: number
        hotels: Map<string, {
          hotelId: string
          hotelName: string
          occurrences: number
          totalRating: number
          apartments: Map<string, { count: number; totalRating: number }>
        }>
      }> = {}

      filteredFeedbacks.forEach(feedback => {
        const problem = feedback.problem!
        const hotelKey = (feedback as any).hotelId || (feedback as any).hotelName || 'Unknown'
        
        if (!problemGroups[problem]) {
          problemGroups[problem] = {
            problem,
            totalOccurrences: 0,
            hotels: new Map()
          }
        }

        problemGroups[problem].totalOccurrences++

        if (!problemGroups[problem].hotels.has(hotelKey)) {
          problemGroups[problem].hotels.set(hotelKey, {
            hotelId: (feedback as any).hotelId || hotelKey,
            hotelName: (feedback as any).hotelName || hotelKey,
            occurrences: 0,
            totalRating: 0,
            apartments: new Map()
          })
        }

        const hotelData = problemGroups[problem].hotels.get(hotelKey)!
        hotelData.occurrences++
        hotelData.totalRating += (feedback.rating || 0)

        if (feedback.apartamento) {
          if (!hotelData.apartments.has(feedback.apartamento)) {
            hotelData.apartments.set(feedback.apartamento, { count: 0, totalRating: 0 })
          }
          const aptData = hotelData.apartments.get(feedback.apartamento)!
          aptData.count++
          aptData.totalRating += (feedback.rating || 0)
        }
      })

      // Converter para formato final
      const results: ProblemResult[] = Object.values(problemGroups)
        .map(group => ({
          problem: group.problem,
          totalOccurrences: group.totalOccurrences,
          hotels: Array.from(group.hotels.values()).map(hotel => ({
            hotelId: hotel.hotelId,
            hotelName: hotel.hotelName,
            occurrences: hotel.occurrences,
            averageRating: Number((hotel.totalRating / hotel.occurrences).toFixed(1)),
            apartments: Array.from(hotel.apartments.entries()).map(([apt, data]) => ({
              apartment: apt,
              count: data.count,
              avgRating: Number((data.totalRating / data.count).toFixed(1))
            })).sort((a, b) => b.count - a.count)
          })).sort((a, b) => b.occurrences - a.occurrences)
        }))
        .sort((a, b) => b.totalOccurrences - a.totalOccurrences)

      setProblemResults(results)

    } catch (error) {
      console.error('Erro na busca:', error)
      toast({
        title: "Erro na Busca",
        description: "Não foi possível realizar a busca.",
        variant: "destructive"
      })
    } finally {
      setSearchLoading(false)
    }
  }

  const getStatusColor = (hotel: HotelSummary) => {
    if (hotel.averageRating >= 4.5) return "bg-green-100 text-green-800"
    if (hotel.averageRating >= 3.5) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getStatusText = (hotel: HotelSummary) => {
    if (hotel.averageRating >= 4.5) return "Excelente"
    if (hotel.averageRating >= 3.5) return "Bom"
    return "Precisa de Atenção"
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

  const problematicHotels = hotelsData.filter(h => h.isProblematic)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestão de Hotéis
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Visão geral e análise comparativa dos hotéis da rede
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => router.push('/admin/comparacao/analise')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <BarChart3 className="h-4 w-4" />
            Comparar Hotéis
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/admin/comparacao/problematicos')}
            className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300"
          >
            <AlertTriangle className="h-4 w-4" />
            Hotéis Problemáticos
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => openModal('Detalhes dos Hotéis', hotelsData.map(h => ({name: h.hotelName, count: h.totalFeedbacks, value: h.averageRating})), 'hotels')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total de Hotéis</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 group-hover:scale-105 transition-transform duration-200">
                {hotelsData.length}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Clique para ver detalhes</p>
            </div>
            <div className="relative">
              <Hotel className="h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-blue-200 dark:bg-blue-700 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30 border-yellow-200 dark:border-yellow-800 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => openModal('Avaliações dos Hotéis', hotelsData.map(h => ({name: h.hotelName, value: h.averageRating, count: h.totalFeedbacks})), 'hotels')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Avaliação Média</p>
              <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 group-hover:scale-105 transition-transform duration-200">
                {hotelsData.length > 0 
                  ? (hotelsData.reduce((sum, h) => sum + h.averageRating, 0) / hotelsData.length).toFixed(1)
                  : '0.0'
                }
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Média da rede</p>
            </div>
            <div className="relative">
              <Star className="h-10 w-10 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-yellow-200 dark:bg-yellow-700 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => openModal('Total de Feedbacks por Hotel', hotelsData.map(h => ({name: h.hotelName, count: h.totalFeedbacks, percentage: Math.round((h.totalFeedbacks / hotelsData.reduce((sum, hotel) => sum + hotel.totalFeedbacks, 0)) * 100)})), 'hotels')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">Total de Feedbacks</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 group-hover:scale-105 transition-transform duration-200">
                {hotelsData.reduce((sum, h) => sum + h.totalFeedbacks, 0).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Comentários analisados</p>
            </div>
            <div className="relative">
              <MessageSquare className="h-10 w-10 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-green-200 dark:bg-green-700 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => openModal('Hotéis Problemáticos', problematicHotels.map(h => ({name: h.hotelName, count: h.problemCount, value: h.averageRating, negativeSentiment: h.negativeSentiment})), 'hotels')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">Hotéis Problemáticos</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 group-hover:scale-105 transition-transform duration-200">
                {problematicHotels.length}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Requerem atenção</p>
            </div>
            <div className="relative">
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-red-200 dark:bg-red-700 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sistema de Abas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Busca por Problemas
          </TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Lista de Hotéis */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Lista de Hotéis</h2>
            <div className="space-y-4">
              {hotelsData.map((hotel, index) => (
                <div 
                  key={hotel.hotelId} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{hotel.hotelName}</h3>
                        <Badge className={getStatusColor(hotel)}>
                          {getStatusText(hotel)}
                        </Badge>
                        {hotel.isProblematic && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Atenção
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {hotel.totalFeedbacks} feedbacks • {hotel.problemCount} problemas identificados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold text-lg">{hotel.averageRating}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Última atualização: {hotel.lastUpdate}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-green-600 font-medium">{hotel.positiveSentiment}% positivo</p>
                      <p className="text-sm text-red-600">{hotel.negativeSentiment}% negativo</p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/comparacao/hotel/${hotel.hotelId}`)}
                      className="flex items-center gap-2 hover:shadow-md transition-all duration-200"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Hotéis que Precisam de Atenção */}
          {problematicHotels.length > 0 && (
            <Card className="p-6 border-red-200">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="text-xl font-semibold text-red-700">Hotéis que Precisam de Atenção</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {problematicHotels.map(hotel => (
                  <Card key={hotel.hotelId} className="p-4 border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{hotel.hotelName}</h3>
                      <Badge variant="destructive">Atenção</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Avaliação:</span>
                        <span className="font-medium">{hotel.averageRating}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Problemas:</span>
                        <span className="font-medium text-red-600">{hotel.problemCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sentimento Negativo:</span>
                        <span className="font-medium text-red-600">{hotel.negativeSentiment}%</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3 flex items-center gap-2 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                      onClick={() => router.push(`/admin/comparacao/hotel/${hotel.hotelId}`)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Analisar Problemas
                    </Button>
                  </Card>
                ))}
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={() => router.push('/admin/comparacao/problematicos')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Análise Completa dos Problemas
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Aba: Busca por Problemas */}
        <TabsContent value="search" className="space-y-6">
          {/* Filtros de Busca */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Busca Inteligente por Problemas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar Problema</label>
                <Input
                  placeholder="Ex: wifi, agua, ruido, ar condicionado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Busca inteligente: ignora acentos, maiúsculas e pontuação
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Filtrar por Hotel</label>
                <Select value={selectedHotelFilter} onValueChange={setSelectedHotelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os hotéis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os hotéis</SelectItem>
                    {hotelsData.map(hotel => (
                      <SelectItem key={hotel.hotelId} value={hotel.hotelId}>
                        {hotel.hotelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {searchTerm && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  🔍 Buscando por: <strong>"{searchTerm}"</strong>
                  {selectedHotelFilter !== "all" && (
                    <>
                      {" "}em{" "}
                      <strong>
                        {hotelsData.find(h => h.hotelId === selectedHotelFilter)?.hotelName}
                      </strong>
                    </>
                  )}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Termo normalizado: "<strong>{normalizeSearchText(searchTerm)}</strong>" 
                  • Busca palavras com 3+ caracteres para maior precisão
                </div>
              </div>
            )}
          </Card>

          {/* Problemas Mais Comuns */}
          {!searchTerm && selectedHotelFilter === "all" && (
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Problemas Mais Comuns</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal('Análise Completa dos Problemas', commonProblems, 'problems')}
                  className="flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                >
                  <Eye className="h-4 w-4" />
                  Ver Todos
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {commonProblems.slice(0, 12).map((problem, index) => (
                  <div
                    key={problem.name}
                    className="p-4 border border-purple-200 dark:border-purple-700 rounded-xl cursor-pointer hover:bg-gradient-to-br hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 group"
                    onClick={() => setSearchTerm(problem.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
                        {problem.name}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700"
                      >
                        {problem.count} casos
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {problem.hotels} hotéis • {problem.percentage}% dos problemas
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(problem.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {commonProblems.length > 12 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Distribuição Visual</h4>
                    <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                      Top 15 problemas
                    </Badge>
                  </div>
                  <ProblemsChart
                    data={commonProblems.slice(0, 15).map(problem => ({
                      label: problem.name,
                      value: problem.count
                    }))}
                    onClick={(item) => setSearchTerm(item.label)}
                    maxItems={15}
                    contextRows={allFeedbacks}
                  />
                </div>
              )}
            </Card>
          )}

          {/* Resultados da Busca */}
          {searchLoading && (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Buscando problemas...</p>
            </Card>
          )}

          {!searchLoading && problemResults.length > 0 && (
            <div className="space-y-4">
              <Card className="p-4 bg-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-blue-800">
                    Resultados da Busca
                  </h3>
                  <Badge className="bg-blue-100 text-blue-800">
                    {problemResults.length} problema(s) encontrado(s)
                  </Badge>
                </div>
              </Card>

              {problemResults.map((result, index) => (
                <Card key={result.problem} className="p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">{result.problem}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {result.totalOccurrences} ocorrências
                      </Badge>
                      <Badge variant="secondary">
                        {result.hotels.length} hotéis afetados
                      </Badge>
                    </div>
                  </div>

                  {/* Gráfico de Distribuição por Hotel */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Distribuição por Hotel</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
                          {result.hotels.length} hotéis afetados
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(`Detalhes: ${result.problem}`, result.hotels.map(h => ({name: h.hotelName, count: h.occurrences, value: h.averageRating})), 'hotels')}
                          className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <HotelsChart
                      data={result.hotels.map(hotel => ({
                        label: hotel.hotelName,
                        value: hotel.occurrences
                      }))}
                    />
                  </div>

                  {/* Detalhes por Hotel */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Detalhes por Hotel</h4>
                    {result.hotels.map(hotel => (
                      <div key={hotel.hotelId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold">{hotel.hotelName}</h5>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              {hotel.occurrences} casos
                            </Badge>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="font-medium">{hotel.averageRating}</span>
                            </div>
                          </div>
                        </div>

                        {/* Apartamentos Afetados */}
                        {hotel.apartments.length > 0 && (
                          <div>
                            <h6 className="font-medium mb-2 text-sm">
                              Apartamentos Mais Afetados:
                            </h6>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {hotel.apartments.slice(0, 8).map(apt => (
                                <div key={apt.apartment} className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-400">
                                  <div className="font-medium">{apt.apartment}</div>
                                  <div className="text-muted-foreground">
                                    {apt.count} casos • ⭐ {apt.avgRating}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!searchLoading && (searchTerm || selectedHotelFilter !== "all") && problemResults.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-600">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">
                    Tente buscar por outros termos ou remover filtros.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes */}
      <ChartDetailModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalData.title}
        data={modalData.data}
        type={modalData.type}
      />
    </div>
  )
}