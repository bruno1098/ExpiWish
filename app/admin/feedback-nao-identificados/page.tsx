"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, AlertCircle, Eye, Building2, Users, Calendar, Edit3 } from "lucide-react"
import { formatDateBR, cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAllAnalyses, saveRecentEdit, getRecentEdits } from "@/lib/firestore-service"
import { getAllHotels } from "@/lib/auth-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}

interface HotelStats {
  hotelId: string
  hotelName: string
  totalUnidentified: number
  totalEdited: number
  avgRating: number
  lastActivity?: string
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
      "text-sm px-2 py-1 rounded-full border font-medium",
      colorClass
    )}>
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
              const keyword = feedback.keyword?.toLowerCase() || ''
              const sector = feedback.sector?.toLowerCase() || ''
              const problem = feedback.problem?.toLowerCase() || ''
              
              return keyword.includes('não identificado') ||
                     keyword.includes('vazio') ||
                     keyword === '' ||
                     sector.includes('não identificado') ||
                     sector.includes('vazio') ||
                     sector === '' ||
                     problem.includes('não identificado') ||
                     problem === 'não identificado'
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
      
      setRecentEdits(editsWithHotelNames.slice(0, 10)) // Limitar a 10 itens
      
      // Atualizar estatísticas com contagem de edições
      setHotelStats(prev => prev.map(stat => {
        // Filtrar edições que correspondem a este hotel
        // Verificar tanto hotelId quanto possível mapeamento reverso
        const hotelEdits = editsWithHotelNames.filter(edit => {
          // Comparação direta de IDs
          if (edit.hotelId === stat.hotelId) return true
          
          // Verificar se o nome do hotel corresponde
          if (edit.hotelName && edit.hotelName === stat.hotelName) return true
          
          // Verificar mapeamento reverso nos nomes dos hotéis
          const mappedId = Object.keys(hotelNames).find(id => hotelNames[id] === edit.hotelName)
          if (mappedId === stat.hotelId) return true
          
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

  const getSentimentBadge = (rating: number) => {
    if (rating >= 4) return <Badge className="bg-green-100 text-green-800">Positivo</Badge>
    if (rating <= 2) return <Badge className="bg-red-100 text-red-800">Negativo</Badge>
    return <Badge className="bg-yellow-100 text-yellow-800">Neutro</Badge>
  }

  const filteredHotels = selectedHotel === 'all' 
    ? Object.keys(unidentifiedByHotel) 
    : [selectedHotel]

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

  const totalUnidentified = Object.values(unidentifiedByHotel).reduce((sum, feedbacks) => sum + feedbacks.length, 0)
  const totalHotels = Object.keys(unidentifiedByHotel).length

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
              <p className="text-2xl font-bold text-green-600">{recentEdits.length}</p>
            </div>
            <Edit3 className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
              <p className="text-2xl font-bold text-purple-600">
                {recentEdits.filter(edit => {
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="by-hotel" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Por Hotel ({totalHotels})
          </TabsTrigger>
          <TabsTrigger value="recent-edits" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edições Recentes ({recentEdits.length})
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
                                {feedback.problem || 'Não identificado'}
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
          {recentEdits.length > 0 ? (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Histórico de Correções</h3>
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
                  {recentEdits.map((edit) => (
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
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            {edit.oldClassification.sector}
                          </Badge>
                          <br />
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            {edit.oldClassification.keyword}
                          </Badge>
                          <br />
                          <Badge variant="secondary" className="text-xs bg-red-50 text-red-600">
                            {edit.oldClassification.problem || 'Não identificado'}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className={cn("text-xs border font-medium", getSectorColor(edit.newClassification.sector))}>
                            {edit.newClassification.sector}
                          </Badge>
                          <br />
                          <KeywordBadge keyword={edit.newClassification.keyword} sector={edit.newClassification.sector} />
                          <br />
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
                {hotelStats.map((stat) => (
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