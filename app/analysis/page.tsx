"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getFeedbacks, type Feedback } from "@/lib/feedback"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Eye, Copy, Star } from "lucide-react"
import { useSearchParams } from 'next/navigation'
import { getAnalysisById } from '@/lib/firestore-service'
import SharedDashboardLayout from "../shared-layout"
import { useToast } from "@/components/ui/use-toast"

// Mapa de cores para sentimentos
const sentimentColors = {
  positive: "text-green-600 bg-green-50",
  neutral: "text-yellow-600 bg-yellow-50",
  negative: "text-red-600 bg-red-50"
}

// Mapa de ícones para avaliações
const ratingIcons: Record<number, string> = {
  1: "⭐",
  2: "⭐⭐",
  3: "⭐⭐⭐",
  4: "⭐⭐⭐⭐",
  5: "⭐⭐⭐⭐⭐"
}

const sentimentBadges = {
  positive: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800",
  neutral: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
  negative: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800"
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => (
  <span className={`px-3 py-1 rounded-full text-sm border ${sentimentBadges[sentiment as keyof typeof sentimentBadges]}`}>
    {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro'}
  </span>
)

// Definir mapeamento de setores para cores
const sectorColors: Record<string, string> = {
  'A&B': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 border-blue-300 dark:border-blue-800',
  'Governança': 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 border-red-300 dark:border-red-800',
  'Manutenção': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Lazer': 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-200 border-green-300 dark:border-green-800',
  'TI': 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-200 border-purple-300 dark:border-purple-800',
  'Operações': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
  'Produto': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
  'Marketing': 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-200 border-pink-300 dark:border-pink-800',
  'Comercial': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800'
};

// Função para obter a cor com base no setor
const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 text-gray-600 border-gray-300';
};

// Adicionar este componente para exibir palavras-chave com cores baseadas no setor
const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  // Mapa de cores para setores
  const sectorColors: Record<string, string> = {
    'A&B': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 border-blue-300 dark:border-blue-800',
    'Governança': 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 border-red-300 dark:border-red-800',
    'Manutenção': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-200 border-orange-300 dark:border-orange-800',
    'Lazer': 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-200 border-green-300 dark:border-green-800',
    'TI': 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-200 border-purple-300 dark:border-purple-800',
    'Operações': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
    'Produto': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
    'Marketing': 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-200 border-pink-300 dark:border-pink-800',
    'Comercial': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800'
  };
  
  const colorClass = sectorColors[sector] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
  
  return (
    <span className={`text-sm px-2 py-1 rounded-full border ${colorClass} inline-block mr-1 mb-1`}>
      {keyword}
    </span>
  );
};

// Defina uma interface para o tipo de análise
interface Analysis {
  id: string;
  hotelName?: string;
  importDate?: any;
  data?: any[];
  analysis?: any;
  [key: string]: any; // Para permitir outras propriedades
}

// Componente para Modal de Comentário Completo
const CommentModal = ({ feedback }: { feedback: Feedback }) => {
  const { toast } = useToast()
  
  const copyComment = () => {
    navigator.clipboard.writeText(feedback.comment)
    toast({
      title: "Comentário Copiado",
      description: "O comentário foi copiado para a área de transferência.",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Comentário Completo - {feedback.rating} estrelas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data</p>
              <p className="text-sm text-foreground">{formatDate(feedback.date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avaliação</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{ratingIcons[feedback.rating] || "N/A"}</span>
                <span className="text-sm text-foreground">{feedback.rating}/5</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sentimento</p>
              <SentimentBadge sentiment={feedback.sentiment} />
            </div>
          </div>

          {/* Comentário Principal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Comentário</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyComment}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
            <div className="p-4 bg-background border rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {feedback.comment}
              </p>
            </div>
          </div>

          {/* Análise IA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Setor</h4>
              <div className="flex flex-wrap gap-1">
                {feedback.sector.split(';').map((sector, index) => (
                  <span 
                    key={index} 
                    className={`text-sm px-3 py-1 rounded-full border ${getSectorColor(sector.trim())}`}
                  >
                    {sector.trim()}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Palavra-chave</h4>
              <div className="flex flex-wrap gap-1">
                {feedback.keyword.split(';').map((kw, index) => {
                  const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                  return <KeywordBadge key={index} keyword={kw.trim()} sector={sector} />;
                })}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Problema</h4>
              <div className="flex flex-wrap gap-1">
                {feedback.problem ? (
                  feedback.problem.split(';').map((problem, index) => {
                    const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                    const colorClass = sectorColors[sector] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
                    
                    return (
                      <span 
                        key={index} 
                        className={`text-sm px-3 py-1 rounded-full border ${colorClass}`}
                      >
                        {problem.trim()}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground italic">Nenhum problema identificado</span>
                )}
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          {(feedback.source || feedback.author || feedback.hotel) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              {feedback.source && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fonte</p>
                  <p className="text-sm text-foreground">{feedback.source}</p>
                </div>
              )}
              {feedback.author && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Autor</p>
                  <p className="text-sm text-foreground">{feedback.author}</p>
                </div>
              )}
              {feedback.hotel && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hotel</p>
                  <p className="text-sm text-foreground">{feedback.hotel}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AnalysisPage() {
  return (
    <SharedDashboardLayout>
      <AnalysisPageContent />
    </SharedDashboardLayout>
  );
}

function AnalysisPageContent() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [keywordFilter, setKeywordFilter] = useState("all")
  const [problemFilter, setProblemFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  useEffect(() => {
    setFeedbacks(getFeedbacks())
  }, [])

  useEffect(() => {
    const loadAnalysis = async () => {
      if (id) {
        try {
          const data = await getAnalysisById(id)
          setAnalysis(data)
        } catch (error) {
          console.error('Erro ao carregar análise:', error)
        }
      }
      setLoading(false)
    }

    loadAnalysis()
  }, [id])

  const sectors = Array.from(new Set(feedbacks.map(f => f.sector).filter(Boolean)))
  const keywords = Array.from(new Set(feedbacks.map(f => f.keyword).filter(Boolean)))
  const problems = Array.from(new Set(feedbacks.map(f => f.problem).filter(Boolean)))

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const matchesSentiment = sentimentFilter === "all" || feedback.sentiment === sentimentFilter
    const matchesSector = sectorFilter === "all" || feedback.sector === sectorFilter
    const matchesKeyword = keywordFilter === "all" || feedback.keyword === keywordFilter
    const matchesProblem = problemFilter === "all" || feedback.problem === problemFilter
    const matchesDate = !dateFilter || feedback.date.includes(dateFilter)

    return matchesSentiment && matchesSector && matchesKeyword && matchesProblem && matchesDate
  })

  return (
    <div className="p-8">
      <TooltipProvider>
        <h2 className="text-3xl font-bold mb-8 text-foreground">Análise de Feedbacks</h2>

        <div className="grid gap-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar por sentimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sentimentos</SelectItem>
                  <SelectItem value="positive" className="text-green-600">Positivo</SelectItem>
                  <SelectItem value="neutral" className="text-yellow-600">Neutro</SelectItem>
                  <SelectItem value="negative" className="text-red-600">Negativo</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4">
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar por setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4">
              <Select value={keywordFilter} onValueChange={setKeywordFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar por palavra-chave" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as palavras-chave</SelectItem>
                  {keywords.map((keyword) => (
                    <SelectItem key={keyword} value={keyword}>{keyword}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4">
              <Select value={problemFilter} onValueChange={setProblemFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrar por problema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os problemas</SelectItem>
                  {problems.map((problem) => (
                    <SelectItem key={problem} value={problem}>{problem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
                placeholder="Filtrar por data"
              />
            </Card>
          </div>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Comentário</TableHead>
                <TableHead className="font-semibold">Avaliação</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Setor</TableHead>
                <TableHead className="font-semibold">Palavra-chave</TableHead>
                <TableHead className="font-semibold">Problema</TableHead>
                <TableHead className="font-semibold w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedbacks.map((feedback) => (
                <TableRow key={feedback.id} className="hover:bg-muted/50 dark:hover:bg-muted/50">
                  <TableCell className="text-sm">
                    {new Date(feedback.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger className="max-w-[250px] truncate text-left cursor-pointer">
                          {feedback.comment}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] bg-background/95 backdrop-blur-sm border border-border text-foreground">
                          <p className="text-xs">Clique no ícone do olho para ver completo</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center">
                      <span className="text-lg">{ratingIcons[feedback.rating] || "N/A"}</span>
                      <span className="ml-2">{feedback.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <SentimentBadge sentiment={feedback.sentiment} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {feedback.sector.split(';').map((sector, index) => (
                        <span 
                          key={index} 
                          className="text-sm bg-muted text-muted-foreground px-2 py-1 rounded-full border border-border inline-block mr-1 mb-1"
                        >
                          {sector.trim()}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {feedback.keyword.split(';').map((kw, index) => {
                        const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                        return <KeywordBadge key={index} keyword={kw.trim()} sector={sector} />;
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {feedback.problem ? (
                        feedback.problem.split(';').map((problem, index) => {
                          const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                          const colorClass = sectorColors[sector] || 'bg-muted text-muted-foreground border-border';
                          
                          return (
                            <span 
                              key={index} 
                              className={`text-sm px-2 py-1 rounded-full border ${colorClass} inline-block mr-1 mb-1`}
                            >
                              {problem.trim()}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem problemas</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CommentModal feedback={feedback} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TooltipProvider>
    </div>
  )
}