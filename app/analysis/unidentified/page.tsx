"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, AlertCircle, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAllAnalyses } from "@/lib/firestore-service"
import SharedDashboardLayout from "../../shared-layout"

interface UnidentifiedFeedback {
  id: string
  comment: string
  rating: number
  keyword: string
  sector: string
  problem: string
  date: string
  source: string
}

export default function UnidentifiedFeedbacks() {
  const router = useRouter()
  const { userData } = useAuth()
  const [unidentifiedFeedbacks, setUnidentifiedFeedbacks] = useState<UnidentifiedFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchUnidentifiedFeedbacks()
  }, [userData])

  const fetchUnidentifiedFeedbacks = async () => {
    try {
      setLoading(true)
      
      if (!userData?.hotelId) {
        setLoading(false)
        return
      }

      const analyses = await getAllAnalyses()
      
      if (analyses && analyses.length > 0) {
        const userHotelAnalyses = analyses.filter((analysis: any) => 
          analysis.hotelId === userData.hotelId
        )
        
        let allFeedbacks: any[] = []
        userHotelAnalyses.forEach((analysis: any) => {
          if (analysis.data && Array.isArray(analysis.data)) {
            allFeedbacks = [...allFeedbacks, ...analysis.data]
          }
        })
        
        // Filtrar apenas feedbacks não identificados
        const unidentified = allFeedbacks.filter(feedback => {
          const keyword = feedback.keyword?.toLowerCase() || ''
          const sector = feedback.sector?.toLowerCase() || ''
          
          const isNotIdentified = 
            keyword.includes('não identificado') ||
            keyword.includes('vazio') ||
            keyword === '' ||
            sector.includes('não identificado') ||
            sector.includes('vazio') ||
            sector === ''
          
          return isNotIdentified
        })
        
        setUnidentifiedFeedbacks(unidentified)
      }
    } catch (error) {
      console.error('Erro ao carregar feedbacks não identificados:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDetails = (feedbackId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [feedbackId]: !prev[feedbackId]
    }))
  }

  const getSentimentBadge = (rating: number) => {
    if (rating >= 4) return <Badge className="bg-green-100 text-green-800">Positivo</Badge>
    if (rating <= 2) return <Badge className="bg-red-100 text-red-800">Negativo</Badge>
    return <Badge className="bg-yellow-100 text-yellow-800">Neutro</Badge>
  }

  if (loading) {
    return (
      <SharedDashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </SharedDashboardLayout>
    )
  }

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-700">Feedbacks Não Identificados</h1>
              <p className="text-muted-foreground">
                Comentários que não foram classificados corretamente pela IA
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Não Identificados</p>
                <p className="text-2xl font-bold text-orange-600">{unidentifiedFeedbacks.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
                <p className="text-2xl font-bold text-orange-600">
                  {unidentifiedFeedbacks.length > 0 
                    ? (unidentifiedFeedbacks.reduce((sum, f) => sum + f.rating, 0) / unidentifiedFeedbacks.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <Eye className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Precisam Revisão</p>
                <p className="text-2xl font-bold text-orange-600">
                  {unidentifiedFeedbacks.filter(f => f.comment.length > 10).length}
                </p>
              </div>
              <EyeOff className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Aviso */}
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Sobre os Feedbacks Não Identificados</h3>
              <p className="text-sm text-orange-700 mt-1">
                Estes comentários não foram classificados corretamente pela IA e não aparecem nos dashboards principais. 
                Isso ajuda a manter a qualidade dos dados e evita poluição das análises. Você pode revisar manualmente 
                estes comentários para identificar padrões de melhoria na classificação.
              </p>
            </div>
          </div>
        </Card>

        {/* Lista de Feedbacks */}
        {unidentifiedFeedbacks.length > 0 ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Lista de Feedbacks Não Identificados</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Palavra-chave</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unidentifiedFeedbacks.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      {new Date(feedback.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">⭐{feedback.rating}</span>
                        {getSentimentBadge(feedback.rating)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className={`${showDetails[feedback.id] ? '' : 'truncate'}`}>
                        {feedback.comment}
                      </div>
                      {feedback.comment.length > 100 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDetails(feedback.id)}
                          className="mt-1 h-6 text-xs"
                        >
                          {showDetails[feedback.id] ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Menos
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Mais
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                        {feedback.keyword || 'Não identificado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                        {feedback.sector || 'Não identificado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-800">Excelente!</h3>
                <p className="text-muted-foreground">
                  Todos os feedbacks foram identificados corretamente pela IA. Não há comentários não classificados.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </SharedDashboardLayout>
  )
} 