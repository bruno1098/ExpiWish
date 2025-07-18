"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getAllAnalyses } from "@/lib/firestore-service"
import { Feedback } from "@/types"
import { formatDateBR } from "@/lib/utils"
import { 
  Trash2, 
  Search, 
  Calendar, 
  Star, 
  RotateCcw,
  AlertCircle,
  Download,
  User
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeletedFeedback extends Feedback {
  deletedAt?: string
  deletedBy?: string
  deletedReason?: string
}

export default function DeletedFeedbacksPage() {
  const [deletedFeedbacks, setDeletedFeedbacks] = useState<DeletedFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const loadDeletedFeedbacks = async () => {
    setLoading(true)
    try {
      const allAnalyses = await getAllAnalyses()
      
      const deletedFeedbacks: DeletedFeedback[] = []
      
      allAnalyses.forEach((analysis: any) => {
        if (analysis.data && Array.isArray(analysis.data)) {
          analysis.data.forEach((feedback: any) => {
            // Buscar apenas feedbacks marcados como deletados
            if (feedback.deleted) {
              deletedFeedbacks.push({
                ...feedback,
                hotelName: analysis.hotelName || 'Hotel não identificado'
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeletedFeedbacks()
  }, [])

  const filteredFeedbacks = deletedFeedbacks.filter(feedback =>
    feedback.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    feedback.hotel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (feedback.deletedBy && feedback.deletedBy.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const restoreFeedback = async (feedbackId: string) => {
    if (!window.confirm('Tem certeza que deseja restaurar este feedback? Ele voltará a aparecer nas análises.')) {
      return
    }

    try {
      // Implementar API para restaurar feedback (remover flag deleted)
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

      // Recarregar lista
      loadDeletedFeedbacks()

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando feedbacks excluídos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            Feedbacks Excluídos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Histórico de comentários removidos das análises
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={exportDeletedFeedbacks}
            variant="outline"
            className="flex items-center gap-2"
            disabled={filteredFeedbacks.length === 0}
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
              {deletedFeedbacks.length}
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
              {filteredFeedbacks.length}
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
        {filteredFeedbacks.length === 0 ? (
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
          filteredFeedbacks.map((feedback) => (
            <Card key={feedback.id} className="border border-red-100 dark:border-red-900/30">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        EXCLUÍDO
                      </Badge>
                      <Badge variant="outline">
                        {feedback.hotel}
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
    </div>
  )
} 