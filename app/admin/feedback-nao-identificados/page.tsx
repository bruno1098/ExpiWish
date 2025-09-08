"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, AlertCircle, Eye, Building2, Users, Calendar, Edit3, Trash2, Search, Star, RotateCcw, Download, User } from "lucide-react"
import { formatDateBR, cn, isValidSectorOrKeyword, isValidProblem } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAllAnalyses, saveRecentEdit, getRecentEdits } from "@/lib/firestore-service"
import { getAllHotels } from "@/lib/auth-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface UnidentifiedFeedback {
  id: string
  comment: string
  rating: number
  keyword: string
  sector: string
  problem: string
  date: string
  source: string
  hotelId: string
  hotelName?: string
}

interface RecentEdit {
  id: string
  feedbackId?: string // Novo campo para compatibilidade com a nova estrutura
  comment: string
  rating: number
  date: string
  source: string
  hotelId: string
  hotelName?: string
  oldClassification: {
    keyword: string
    sector: string
    problem: string
  }
  newClassification: {
    keyword: string
    sector: string
    problem: string
  }
  modifiedAt: string
  modifiedBy?: string
  page?: string // Campo adicional presente na nova estrutura
}

interface HotelStats {
  hotelId: string
  hotelName: string
  totalUnidentified: number
  totalEdited: number
  avgRating: number
  lastActivity?: string
}

interface DeletedFeedback {
  id: string
  comment: string
  rating: number
  keyword: string
  sector: string
  problem: string
  date: string
  source: string
  hotelId: string
  hotelName?: string
  deletedAt?: string
  deletedBy?: string
  deletedReason?: string
  sentiment?: string
}

// Interface para hotéis
interface Hotel {
  id: string
  name: string
  hotelId?: string
  address?: string
  city?: string
  state?: string
  country?: string
  stars?: number
}

// Definir mapeamento de departamentos para cores (mesmo da outra tela)
const sectorColors: Record<string, string> = {
  'A&B': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 border-blue-300 dark:border-blue-800',
  'Governança': 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 border-red-300 dark:border-red-800',
  'Manutenção': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Manutenção - Quarto': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Manutenção - Banheiro': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Manutenção - Instalações': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Lazer': 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-200 border-green-300 dark:border-green-800',
  'TI': 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-200 border-purple-300 dark:border-purple-800',
  'Operações': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
  'Produto': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
  'Marketing': 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-200 border-pink-300 dark:border-pink-800',
  'Comercial': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800',
  'Qualidade': 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-200 border-slate-300 dark:border-slate-800',
  'Recepção': 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-200 border-teal-300 dark:border-teal-800',
  'Programa de vendas': 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-200 border-amber-300 dark:border-amber-800'
};

const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
};

const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  const colorClass = getSectorColor(sector);
  
  return (
    <Badge variant="outline" className={cn(
      "text-xs border font-medium",
      colorClass
    )}>
      <span className="mr-1">🏷️</span>
      {keyword}
    </Badge>
  );
};

export default function AdminUnidentifiedFeedbacks() {
  const router = useRouter()
  const { userData } = useAuth()
  const [unidentifiedByHotel, setUnidentifiedByHotel] = useState<Record<string, UnidentifiedFeedback[]>>({})
  const [recentEdits, setRecentEdits] = useState<RecentEdit[]>([])
  const [hotelStats, setHotelStats] = useState<HotelStats[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [hotelNames, setHotelNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [selectedHotel, setSelectedHotel] = useState<string>('all')
  
  // Estados para feedbacks excluídos
  const [deletedFeedbacks, setDeletedFeedbacks] = useState<DeletedFeedback[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Estados para edições recentes expandidas
  const [allRecentEdits, setAllRecentEdits] = useState<RecentEdit[]>([])
  const [showAllEdits, setShowAllEdits] = useState(false)
  const [loadingAllEdits, setLoadingAllEdits] = useState(false)
  
  const { toast } = useToast()

  // Função para verificar se um feedback ainda deve ser considerado não identificado
  const shouldBeUnidentified = (feedback: any) => {
    const hasInvalidKeyword = !isValidSectorOrKeyword(feedback.keyword)
    const hasInvalidSector = !isValidSectorOrKeyword(feedback.sector)
    const hasInvalidProblem = !isValidProblem(feedback.problem)
    
    const hasExplicitNotIdentified = 
      feedback.keyword?.toLowerCase().includes('não identificado') ||
      feedback.sector?.toLowerCase().includes('não identificado') ||
      feedback.problem?.toLowerCase().includes('não identificado')
    
    const comment = feedback.comment?.toLowerCase() || ''
    const isSpamOrGibberish = 
      comment.length < 5 ||
      /^[^a-záéíóúàâêôãõç\s]*$/.test(comment) ||
      /^[a-z]{1,3}(\1)*$/.test(comment) ||
      comment.match(/^[a-z]{1,2}([a-z])\1{2,}$/)
    
    return hasInvalidKeyword || hasInvalidSector || hasInvalidProblem || hasExplicitNotIdentified || isSpamOrGibberish
  }

  // Verificar se é admin
  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [userData, router])

  useEffect(() => {
    if (userData?.role === 'admin') {
      const loadData = async () => {
        await loadHotels()
        await fetchAllUnidentifiedFeedbacks()
        await loadRecentEdits()
        await loadDeletedFeedbacks()
      }
      loadData()
    }
  }, [userData])



  const loadHotels = async () => {
    try {
      const hotelsList = await getAllHotels()
      setHotels(hotelsList as Hotel[])
      
      // Criar mapeamento de ID do documento para nome
      const namesMap: Record<string, string> = {}
      hotelsList.forEach((hotel: any) => {
        // Usar o ID do documento como chave (que é usado nos feedbacks)
        const key = hotel.id
        namesMap[key] = hotel.name || `Hotel ${key}`
      })
      setHotelNames(namesMap)

    } catch (error) {
      console.error('Erro ao carregar hotéis:', error)
      // Fallback: usar um mapeamento padrão
      setHotelNames({})
    }
  }

  const fetchAllUnidentifiedFeedbacks = async () => {
    try {
      setLoading(true)
      
      const analyses = await getAllAnalyses()
      
      if (analyses && analyses.length > 0) {
        const hotelGroups: Record<string, UnidentifiedFeedback[]> = {}
        const statsMap: Record<string, HotelStats> = {}
        
        analyses.forEach((analysis: any) => {
          // Usar o hotelDocId (ID do documento do hotel) se disponível
          const hotelId = analysis.hotelDocId || analysis.hotelId || 'unknown'
          const hotelName = analysis.hotelDisplayName || hotelNames[hotelId] || analysis.hotelName || `Hotel ${hotelId}`
          
          if (analysis.data && Array.isArray(analysis.data)) {
            const unidentified = analysis.data.filter((feedback: any) => {
              // Excluir feedbacks deletados
              if (feedback.deleted === true) {
                return false
              }
              
              // Usar a função centralizada para verificar se é não identificado
              return shouldBeUnidentified(feedback)
            }).map((feedback: any) => ({
              ...feedback,
              hotelId,
              hotelName
            }))
            
            if (unidentified.length > 0) {
              hotelGroups[hotelId] = unidentified
              
              // Calcular estatísticas
              const avgRating = unidentified.reduce((sum: number, f: any) => sum + f.rating, 0) / unidentified.length
              
              statsMap[hotelId] = {
                hotelId,
                hotelName,
                totalUnidentified: unidentified.length,
                totalEdited: 0, // Será preenchido depois
                avgRating,
                lastActivity: undefined
              }
            } else {
              // Mesmo sem feedbacks não identificados, incluir o hotel nas estatísticas
              statsMap[hotelId] = {
                hotelId,
                hotelName,
                totalUnidentified: 0,
                totalEdited: 0,
                avgRating: 0,
                lastActivity: undefined
              }
            }
          }
        })
        
        setUnidentifiedByHotel(hotelGroups)
        setHotelStats(Object.values(statsMap))
      }
    } catch (error) {
      console.error('Erro ao carregar feedbacks não identificados de todos os hotéis:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentEdits = async () => {
    try {
      // Carregar edições de todos os usuários do Firebase
      const edits = await getRecentEdits(7) // Últimos 7 dias
      
      // Mapear com nomes dos hotéis - usar o nome que vem da edição se disponível
      const editsWithHotelNames = edits.map((edit: any) => {
        const hotelName = edit.hotelName || hotelNames[edit.hotelId] || `Hotel ${edit.hotelId}`
        return {
          ...edit,
          hotelName: hotelName
        }
      })
      
      // Armazenar todas as edições
      setAllRecentEdits(editsWithHotelNames)
      // Manter apenas 10 para exibição inicial
      setRecentEdits(editsWithHotelNames.slice(0, 10))
      
      // Atualizar estatísticas com contagem de edições
      setHotelStats(prev => prev.map(stat => {
        // Filtrar edições que correspondem a este hotel
        // Verificar tanto hotelId quanto possível mapeamento reverso
        const hotelEdits = editsWithHotelNames.filter(edit => {
          // Comparação direta de IDs
          if (edit.hotelId === stat.hotelId) {
            return true
          }
          
          // Verificar se o nome do hotel corresponde
          if (edit.hotelName && edit.hotelName === stat.hotelName) {
            return true
          }
          
          // Verificar mapeamento reverso nos nomes dos hotéis
          const mappedId = Object.keys(hotelNames).find(id => hotelNames[id] === edit.hotelName)
          if (mappedId === stat.hotelId) {
            return true
          }
          
          return false
        })
        
        return {
          ...stat,
          totalEdited: hotelEdits.length,
          lastActivity: hotelEdits
            .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())[0]?.modifiedAt
        }
      }))
    } catch (error) {
      console.error('Erro ao carregar edições recentes:', error)
      setRecentEdits([])
    }
  }

  const loadDeletedFeedbacks = async () => {
    try {
      const allAnalyses = await getAllAnalyses()
      
      const deletedFeedbacks: DeletedFeedback[] = []
      
      console.log('🔍 DEBUG - Carregando feedbacks excluídos...')
      
      allAnalyses.forEach((analysis: any) => {
        if (analysis.data && Array.isArray(analysis.data)) {
          analysis.data.forEach((feedback: any) => {
            // Buscar apenas feedbacks marcados como deletados
            if (feedback.deleted) {
              const hotelId = analysis.hotelDocId || analysis.hotelId || 'unknown'
              const hotelName = analysis.hotelDisplayName || hotelNames[hotelId] || analysis.hotelName || `Hotel ${hotelId}`
              
              console.log(`🔍 DEBUG - Processando análise: hotelId=${hotelId}, hotelName=${hotelName}`)
              
              deletedFeedbacks.push({
                ...feedback,
                hotelId: hotelId,
                hotelName: hotelName
              })
            }
          })
        }
      })
      
      // Ordenar por data de exclusão (mais recentes primeiro)
      deletedFeedbacks.sort((a, b) => {
        const dateA = new Date(a.deletedAt || a.date).getTime()
        const dateB = new Date(b.deletedAt || b.date).getTime()
        return dateB - dateA
      })
      
      setDeletedFeedbacks(deletedFeedbacks)
    } catch (error) {
      console.error('Erro ao carregar feedbacks excluídos:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os feedbacks excluídos",
        variant: "destructive"
      })
    }
  }

  const getSentimentBadge = (rating: number) => {
    if (rating >= 4) return (
      <Badge className="bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 px-3 py-1.5 rounded-full font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md">
        <span className="mr-1.5">😊</span>Positivo
      </Badge>
    )
    if (rating <= 2) return (
      <Badge className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 px-3 py-1.5 rounded-full font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md">
        <span className="mr-1.5">😞</span>Negativo
      </Badge>
    )
    return (
      <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 px-3 py-1.5 rounded-full font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md">
        <span className="mr-1.5">😐</span>Neutro
      </Badge>
    )
  }

  const restoreFeedback = async (feedbackId: string) => {
    if (!window.confirm('Tem certeza que deseja restaurar este feedback? Ele voltará a aparecer nas análises.')) {
      return
    }

    try {
      const response = await fetch('/api/restore-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedbackId }),
      })

      if (!response.ok) {
        throw new Error('Falha ao restaurar feedback')
      }

      toast({
        title: "Feedback Restaurado",
        description: "O feedback foi restaurado e voltará a aparecer nas análises.",
        duration: 3000,
      })

      // Recarregar listas
      await Promise.all([
        loadDeletedFeedbacks(),
        fetchAllUnidentifiedFeedbacks()
      ])

    } catch (error) {
      console.error('Erro ao restaurar feedback:', error)
      toast({
        title: "Erro",
        description: "Não foi possível restaurar o feedback.",
        variant: "destructive"
      })
    }
  }

  const exportDeletedFeedbacks = () => {
    const filteredFeedbacks = deletedFeedbacks.filter(feedback =>
      feedback.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feedback.hotelName && feedback.hotelName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (feedback.deletedBy && feedback.deletedBy.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    const dataStr = JSON.stringify(filteredFeedbacks, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `feedbacks-excluidos-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exportação Concluída",
      description: `${filteredFeedbacks.length} feedbacks excluídos exportados com sucesso`,
    })
  }

  // Função para carregar todas as edições recentes (expandir lista)
  const loadAllRecentEdits = async () => {
    try {
      setLoadingAllEdits(true)
      // Carregar edições dos últimos 30 dias para ter mais dados
      const edits = await getRecentEdits(30)
      
      const editsWithHotelNames = edits.map((edit: any) => {
        const hotelName = edit.hotelName || hotelNames[edit.hotelId] || `Hotel ${edit.hotelId}`
        return {
          ...edit,
          hotelName: hotelName
        }
      })
      
      // Atualizar ambos os estados
      setAllRecentEdits(editsWithHotelNames)
      setRecentEdits(editsWithHotelNames) // Mostrar todas
      setShowAllEdits(true)
      
      toast({
        title: "Lista Expandida",
        description: `${editsWithHotelNames.length} edições carregadas dos últimos 30 dias`,
      })
    } catch (error) {
      console.error('Erro ao carregar todas as edições:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar todas as edições",
        variant: "destructive"
      })
    } finally {
      setLoadingAllEdits(false)
    }
  }

  // Função para voltar à visualização limitada
  const showLimitedEdits = () => {
    setRecentEdits(allRecentEdits.slice(0, 10))
    setShowAllEdits(false)
  }

  // Função para exportar edições recentes em JSON
  const exportRecentEdits = () => {
    const editsToExport = filteredRecentEdits.map(edit => ({
      id: edit.id,
      comentario: edit.comment,
      avaliacao: edit.rating,
      data_feedback: edit.date,
      fonte: edit.source,
      hotel: {
        id: edit.hotelId,
        nome: edit.hotelName
      },
      classificacao_anterior: {
        setor: edit.oldClassification.sector,
        palavra_chave: edit.oldClassification.keyword,
        problema: edit.oldClassification.problem
      },
      nova_classificacao: {
        setor: edit.newClassification.sector,
        palavra_chave: edit.newClassification.keyword,
        problema: edit.newClassification.problem
      },
      modificado_em: edit.modifiedAt,
      modificado_por: edit.modifiedBy
    }))
    
    const dataStr = JSON.stringify(editsToExport, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `edicoes-recentes-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exportação Concluída",
      description: `${editsToExport.length} edições exportadas com sucesso`,
    })
  }

  const filteredHotels = selectedHotel === 'all' 
    ? Object.keys(unidentifiedByHotel) 
    : [selectedHotel]

  // Aplicar filtro por hotel primeiro, depois por termo de busca
  const deletedFeedbacksByHotel = selectedHotel === 'all'
    ? deletedFeedbacks
    : deletedFeedbacks.filter(feedback => {
        // Comparação mais robusta de IDs de hotéis
        const feedbackHotelId = String(feedback.hotelId || '').trim()
        const selectedHotelId = String(selectedHotel || '').trim()
        
        console.log(`🔍 DEBUG - Filtrando feedback excluído: feedbackHotelId=${feedbackHotelId}, selectedHotelId=${selectedHotelId}, feedbackHotelName=${feedback.hotelName}`)
        
        // Comparação direta
        if (feedbackHotelId === selectedHotelId) {
          console.log(`🔍 DEBUG - Match por ID direto no feedback excluído`)
          return true
        }
        
        // Verificar se o nome do hotel corresponde
        const selectedHotelName = hotelStats.find(h => h.hotelId === selectedHotel)?.hotelName
        if (selectedHotelName && feedback.hotelName === selectedHotelName) {
          console.log(`🔍 DEBUG - Match por nome no feedback excluído: selectedHotelName=${selectedHotelName}`)
          return true
        }
        
        // Verificar mapeamento reverso nos nomes dos hotéis
        const mappedId = Object.keys(hotelNames).find(id => hotelNames[id] === feedback.hotelName)
        if (mappedId === selectedHotel) {
          console.log(`🔍 DEBUG - Match por mapeamento reverso no feedback excluído: mappedId=${mappedId}`)
          return true
        }
        
        console.log(`🔍 DEBUG - Nenhum match no feedback excluído`)
        return false
      })
  
  const filteredDeletedFeedbacks = deletedFeedbacksByHotel.filter(feedback =>
    feedback.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (feedback.hotelName && feedback.hotelName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (feedback.deletedBy && feedback.deletedBy.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (userData && userData.role !== 'admin') {
    return null
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

  // Calcular estatísticas baseadas nos hotéis filtrados
  const filteredUnidentifiedData = filteredHotels.reduce((acc, hotelId) => {
    const feedbacks = unidentifiedByHotel[hotelId] || []
    acc.push(...feedbacks)
    return acc
  }, [] as UnidentifiedFeedback[])
  
  const totalUnidentified = filteredUnidentifiedData.length
  const totalHotels = filteredHotels.length
  
  // Calcular edições recentes filtradas
  const allFilteredRecentEdits = selectedHotel === 'all' 
    ? recentEdits 
    : recentEdits.filter(edit => {
        // Comparação mais robusta de IDs de hotéis - compatível com nova estrutura
        const editHotelId = String(edit.hotelId || '').trim()
        const selectedHotelId = String(selectedHotel || '').trim()
        
        // Comparação direta
        if (editHotelId === selectedHotelId) return true
        
        // Verificar correspondência parcial (para compatibilidade com mudanças de estrutura)
        if (editHotelId && selectedHotelId && 
            (editHotelId.includes(selectedHotelId) || selectedHotelId.includes(editHotelId))) {
          return true
        }
        
        // Verificar se o nome do hotel corresponde
        const selectedHotelName = hotelStats.find(h => h.hotelId === selectedHotel)?.hotelName
        if (selectedHotelName && edit.hotelName === selectedHotelName) return true
        
        // Verificar pelo feedbackId se disponível (nova estrutura)
        if (edit.feedbackId && selectedHotelId && edit.feedbackId.includes(selectedHotelId)) {
          return true
        }
        
        return false
      })
  
  // Limitar exibição baseado no estado showAllEdits
  const filteredRecentEdits = showAllEdits 
    ? allFilteredRecentEdits 
    : allFilteredRecentEdits.slice(0, 10)
  
  // Calcular feedbacks excluídos filtrados por hotel (sem considerar termo de busca)
  const filteredDeletedFeedbacksCount = selectedHotel === 'all'
    ? deletedFeedbacks.length
    : deletedFeedbacks.filter(feedback => feedback.hotelId === selectedHotel).length
  
  // Calcular estatísticas dos hotéis filtradas
  const filteredHotelStats = selectedHotel === 'all'
    ? hotelStats
    : hotelStats.filter(stat => stat.hotelId === selectedHotel)

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
            <h1 className="text-3xl font-bold text-orange-700">Admin - Feedbacks Não Identificados</h1>
            <p className="text-muted-foreground">
              Visão geral de todos os hotéis e histórico de correções
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Não Identificados</p>
              <p className="text-2xl font-bold text-orange-600">{totalUnidentified}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Hotéis com Pendências</p>
              <p className="text-2xl font-bold text-blue-600">{totalHotels}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Edições Recentes</p>
              <p className="text-2xl font-bold text-green-600">{filteredRecentEdits.length}</p>
            </div>
            <Edit3 className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredRecentEdits.filter(edit => {
                  const editDate = new Date(edit.modifiedAt)
                  const sevenDaysAgo = new Date()
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
                  return editDate > sevenDaysAgo
                }).length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filtro por Hotel */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Filtrar por Hotel:</label>
          <Select value={selectedHotel} onValueChange={setSelectedHotel}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione um hotel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Hotéis</SelectItem>
              {hotelStats.map((hotel) => (
                <SelectItem key={hotel.hotelId} value={hotel.hotelId}>
                  {hotel.hotelName} ({hotel.totalUnidentified} pendentes)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabs principais */}
      <Tabs defaultValue="by-hotel" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="by-hotel" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Por Hotel ({totalHotels})
          </TabsTrigger>
          <TabsTrigger value="recent-edits" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edições Recentes ({recentEdits.length})
          </TabsTrigger>
          <TabsTrigger value="deleted-feedbacks" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Excluídos ({deletedFeedbacks.length})
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-hotel" className="space-y-6">
          {filteredHotels.map((hotelId) => {
            const feedbacks = unidentifiedByHotel[hotelId] || []
            const hotelName = hotelNames[hotelId] || `Hotel ${hotelId}`
            
            return (
              <Card key={hotelId} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-semibold">{hotelName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} não identificado{feedbacks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-50 text-orange-600">
                    ID do Documento: {hotelId}
                  </Badge>
                </div>
                
                {feedbacks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>⭐ Nota</TableHead>
                        <TableHead>Comentário</TableHead>
                        <TableHead>Classificação Atual</TableHead>
                        <TableHead>Fonte</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbacks.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>
                            {formatDateBR(feedback.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{feedback.rating}</span>
                              {getSentimentBadge(feedback.rating)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={feedback.comment}>
                              {feedback.comment}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                {feedback.sector || 'Não identificado'}
                              </Badge>
                              <br />
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                {feedback.keyword || 'Não identificado'}
                              </Badge>
                              <br />
                              <Badge variant="secondary" className="bg-red-50 text-red-600 text-xs">
                                {feedback.problem === 'VAZIO' ? 'Sem problemas' : (feedback.problem || 'Não identificado')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {feedback.source}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">Nenhum feedback não identificado</p>
                    <p>Este hotel não possui feedbacks pendentes de classificação.</p>
                  </div>
                )}
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="recent-edits" className="space-y-4">
          {/* Header da seção de edições recentes */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-green-500" />
                Edições Recentes
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {showAllEdits 
                  ? `Mostrando todas as ${filteredRecentEdits.length} edições dos últimos 30 dias${selectedHotel !== 'all' ? ' (filtradas por hotel)' : ''}`
                  : `Mostrando ${filteredRecentEdits.length} de ${allFilteredRecentEdits.length} edições mais recentes${selectedHotel !== 'all' ? ' (filtradas por hotel)' : ''}`
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={exportRecentEdits}
                variant="outline"
                className="flex items-center gap-2"
                disabled={filteredRecentEdits.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar JSON
              </Button>
              
              {!showAllEdits ? (
                <Button
                  onClick={loadAllRecentEdits}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={loadingAllEdits}
                >
                  {loadingAllEdits ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {loadingAllEdits ? 'Carregando...' : `Ver Todas (${allRecentEdits.length > 0 ? allRecentEdits.length : 'carregar'})`}
                </Button>
              ) : (
                <Button
                  onClick={showLimitedEdits}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Mostrar Menos
                </Button>
              )}
              
              <Button
                onClick={loadRecentEdits}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          {filteredRecentEdits.length > 0 ? (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold">Histórico de Correções</h4>
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  {filteredRecentEdits.length} edições
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead>Classificação Anterior</TableHead>
                    <TableHead>Nova Classificação</TableHead>
                    <TableHead>Modificado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecentEdits.map((edit) => (
                    <TableRow key={`${edit.id}-${edit.modifiedAt}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {formatDateBR(edit.modifiedAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(edit.modifiedAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{edit.hotelName}</div>
                            <div className="text-xs text-muted-foreground">ID: {edit.hotelId}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={edit.comment}>
                          {edit.comment}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ⭐ {edit.rating} • {formatDateBR(edit.date)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            {edit.oldClassification.sector}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            {edit.oldClassification.keyword}
                          </Badge>
                          <Badge variant="secondary" className="text-xs bg-red-50 text-red-600">
                            {edit.oldClassification.problem === 'VAZIO' ? (
                              <span className="italic text-gray-500">Sem problemas</span>
                            ) : (
                              edit.oldClassification.problem || 'Não identificado'
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={cn("text-xs border font-medium", getSectorColor(edit.newClassification.sector))}>
                            {edit.newClassification.sector}
                          </Badge>
                          <KeywordBadge keyword={edit.newClassification.keyword} sector={edit.newClassification.sector} />
                          <Badge variant="secondary" className="text-xs">
                            {edit.newClassification.problem === 'VAZIO' ? (
                              <span className="italic text-gray-500">Sem problemas</span>
                            ) : (
                              edit.newClassification.problem
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {edit.modifiedBy}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <Edit3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhuma Edição Recente</h3>
              <p className="text-muted-foreground">
                Não há correções de feedbacks registradas nos últimos 7 dias.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deleted-feedbacks" className="space-y-6">
          {/* Header da seção de excluídos */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Feedbacks Excluídos
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Histórico de comentários removidos das análises
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={exportDeletedFeedbacks}
                variant="outline"
                className="flex items-center gap-2"
                disabled={filteredDeletedFeedbacks.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <Button
                onClick={loadDeletedFeedbacks}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Excluídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredDeletedFeedbacksCount}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Filtrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredDeletedFeedbacks.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Mais Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-900 dark:text-white">
                  {deletedFeedbacks.length > 0 
                    ? formatDateBR(deletedFeedbacks[0].deletedAt || deletedFeedbacks[0].date)
                    : 'Nenhum'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por comentário, hotel ou usuário que excluiu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de feedbacks excluídos */}
          <div className="space-y-4">
            {filteredDeletedFeedbacks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum feedback excluído'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm 
                      ? 'Tente ajustar os termos de busca.' 
                      : 'Não há feedbacks excluídos no momento.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredDeletedFeedbacks.map((feedback) => (
                <Card key={feedback.id} className="border border-red-100 dark:border-red-900/30">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            EXCLUÍDO
                          </Badge>
                          <Badge variant="outline">
                            {feedback.hotelName || 'Hotel não identificado'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateBR(feedback.date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {feedback.rating}/5
                          </div>
                          {feedback.deletedBy && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {feedback.deletedBy}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => restoreFeedback(feedback.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Comentário */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Comentário:
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {feedback.comment}
                      </p>
                    </div>

                    {/* Motivo da exclusão */}
                    {feedback.deletedReason && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Motivo da Exclusão:
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                          {feedback.deletedReason}
                        </p>
                      </div>
                    )}

                    {/* Metadados */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Setor:</span>
                        <p className="text-sm font-medium">{feedback.sector}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Palavra-chave:</span>
                        <p className="text-sm font-medium">{feedback.keyword}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Fonte:</span>
                        <p className="text-sm font-medium">{feedback.source}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Sentimento:</span>
                        <p className="text-sm font-medium capitalize">{feedback.sentiment}</p>
                      </div>
                    </div>

                    {/* Data de exclusão */}
                    {feedback.deletedAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                        Excluído em: {formatDateBR(feedback.deletedAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Estatísticas por Hotel</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Não Identificados</TableHead>
                  <TableHead>Edições Feitas</TableHead>
                  <TableHead>Avaliação Média</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHotelStats.map((stat) => (
                  <TableRow key={stat.hotelId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">{stat.hotelName}</div>
                          <div className="text-xs text-muted-foreground">ID: {stat.hotelId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={stat.totalUnidentified > 10 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}>
                        {stat.totalUnidentified}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={stat.totalEdited > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {stat.totalEdited}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">⭐ {stat.avgRating.toFixed(1)}</span>
                        {getSentimentBadge(Math.round(stat.avgRating))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {stat.lastActivity ? (
                        <div className="space-y-1">
                          <div className="text-sm">{formatDateBR(stat.lastActivity)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(stat.lastActivity).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem atividade</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stat.totalUnidentified === 0 ? (
                        <Badge className="bg-green-100 text-green-800">Completo</Badge>
                      ) : stat.totalUnidentified > 20 ? (
                        <Badge className="bg-red-100 text-red-800">Alta Prioridade</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Aviso para Admins */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Visão Administrativa</h3>
            <p className="text-sm text-blue-700 mt-1">
              Esta página mostra feedbacks não identificados de todos os hotéis da rede. Use as abas para navegar entre 
              a visão por hotel, histórico de edições e estatísticas. Os feedbacks em vermelho precisam de atenção manual.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}