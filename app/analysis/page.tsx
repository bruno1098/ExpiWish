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
import { useSearchParams } from 'next/navigation'
import { getAnalysisById } from '@/lib/firestore-service'
import SharedDashboardLayout from "../shared-layout"

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
  positive: "bg-green-100 text-green-800 border-green-300",
  neutral: "bg-blue-100 text-blue-800 border-blue-300",
  negative: "bg-red-100 text-red-800 border-red-300"
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => (
  <span className={`px-3 py-1 rounded-full text-sm border ${sentimentBadges[sentiment as keyof typeof sentimentBadges]}`}>
    {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro'}
  </span>
)

// Definir mapeamento de setores para cores
const sectorColors: Record<string, string> = {
  'A&B': 'bg-blue-50 text-blue-600 border-blue-300',
  'Governança': 'bg-red-50 text-red-600 border-red-300',
  'Manutenção': 'bg-orange-50 text-orange-600 border-orange-300',
  'Lazer': 'bg-green-50 text-green-600 border-green-300',
  'TI': 'bg-purple-50 text-purple-600 border-purple-300',
  'Operações': 'bg-yellow-50 text-yellow-600 border-yellow-300',
  'Produto': 'bg-indigo-50 text-indigo-600 border-indigo-300',
  'Marketing': 'bg-pink-50 text-pink-600 border-pink-300',
  'Comercial': 'bg-cyan-50 text-cyan-600 border-cyan-300'
};

// Função para obter a cor com base no setor
const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 text-gray-600 border-gray-300';
};

// Adicionar este componente para exibir palavras-chave com cores baseadas no setor
const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  // Mapa de cores para setores
  const sectorColors: Record<string, string> = {
    'A&B': 'bg-blue-50 text-blue-600 border-blue-300',
    'Governança': 'bg-red-50 text-red-600 border-red-300',
    'Manutenção': 'bg-orange-50 text-orange-600 border-orange-300',
    'Lazer': 'bg-green-50 text-green-600 border-green-300',
    'TI': 'bg-purple-50 text-purple-600 border-purple-300',
    'Operações': 'bg-yellow-50 text-yellow-600 border-yellow-300',
    'Produto': 'bg-indigo-50 text-indigo-600 border-indigo-300',
    'Marketing': 'bg-pink-50 text-pink-600 border-pink-300',
    'Comercial': 'bg-cyan-50 text-cyan-600 border-cyan-300'
  };
  
  const colorClass = sectorColors[sector] || 'bg-gray-50 text-gray-600 border-gray-300';
  
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
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Análise de Feedbacks</h2>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedbacks.map((feedback) => (
                <TableRow key={feedback.id} className="hover:bg-gray-50">
                  <TableCell className="text-sm">
                    {new Date(feedback.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <Tooltip>
                      <TooltipTrigger className="max-w-[300px] truncate">
                        {feedback.comment}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[500px] whitespace-pre-wrap">
                        {feedback.comment}
                      </TooltipContent>
                    </Tooltip>
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
                          className="text-sm bg-gray-50 text-gray-600 px-2 py-1 rounded-full border border-gray-300 inline-block mr-1 mb-1"
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
                      {feedback.problem.split(';').map((problem, index) => {
                        const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                        const colorClass = sectorColors[sector] || 'bg-gray-50 text-gray-600 border-gray-300';
                        
                        return (
                          <span 
                            key={index} 
                            className={`text-sm px-2 py-1 rounded-full border ${colorClass} inline-block mr-1 mb-1`}
                          >
                            {problem.trim()}
                          </span>
                        );
                      })}
                    </div>
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