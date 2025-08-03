"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Eye, 
  Copy, 
  Star, 
  Filter, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  BarChart3,
  Calendar,
  Search,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  CalendarDays
} from "lucide-react"
import { useSearchParams } from 'next/navigation'
import { getAllAnalyses, updateFeedbackInFirestore, saveRecentEdit } from '@/lib/firestore-service'
import SharedDashboardLayout from "../shared-layout"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { cn, formatDateBR } from "@/lib/utils"
import { filterValidFeedbacks, isValidProblem, isValidSectorOrKeyword } from "@/lib/utils"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

// Estilos para scrollbars SEMPRE visíveis e header fixo
const scrollbarStyles = `
  /* Scrollbars sempre visíveis - PC */
  .custom-scrollbar {
    scrollbar-width: auto !important;
    scrollbar-color: #64748b #e2e8f0 !important;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 16px !important;
    height: 16px !important;
    background: #e2e8f0 !important;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #e2e8f0 !important;
    border-radius: 8px !important;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #64748b !important;
    border-radius: 8px !important;
    border: 2px solid #e2e8f0 !important;
    min-height: 40px !important;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #475569 !important;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: #334155 !important;
  }
  
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: #e2e8f0 !important;
  }
  
  /* Dark mode scrollbars */
  .dark .custom-scrollbar {
    scrollbar-color: #64748b #1e293b !important;
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar {
    background: #1e293b !important;
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-track {
    background: #1e293b !important;
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #64748b !important;
    border-color: #1e293b !important;
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8 !important;
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-corner {
    background: #1e293b !important;
  }
  
  /* Header fixo que funciona de verdade */
  .table-with-fixed-header {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }
  
  .fixed-header {
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 50;
    background: linear-gradient(to right, #0f172a, #1e293b);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    border-bottom: 3px solid #3b82f6;
  }
  
  .dark .fixed-header {
    background: linear-gradient(to right, #020617, #0f172a);
    border-bottom: 3px solid #8b5cf6;
  }
  
  .scrollable-body {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }
  
  /* Utility para line-clamp */
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  /* Animações para exclusão de feedback */
  .feedback-deleting {
    animation: deleteSlideOut 0.8s ease-in-out forwards;
    background: linear-gradient(90deg, #fee2e2, #fecaca) !important;
    border-left: 4px solid #ef4444 !important;
    transform-origin: left center;
  }

  .dark .feedback-deleting {
    background: linear-gradient(90deg, #7f1d1d, #991b1b) !important;
  }

  @keyframes deleteSlideOut {
    0% {
      opacity: 1;
      transform: translateX(0) scale(1);
      max-height: 80px;
      margin-bottom: 0;
    }
    25% {
      opacity: 0.8;
      transform: translateX(-10px) scale(0.98);
      max-height: 80px;
      margin-bottom: 0;
    }
    50% {
      opacity: 0.5;
      transform: translateX(-30px) scale(0.95);
      max-height: 80px;
      margin-bottom: 0;
    }
    75% {
      opacity: 0.2;
      transform: translateX(-60px) scale(0.9);
      max-height: 60px;
      margin-bottom: 0;
    }
    100% {
      opacity: 0;
      transform: translateX(-100%) scale(0.8);
      max-height: 0;
      margin-bottom: 0;
      padding-top: 0;
      padding-bottom: 0;
      border: none;
    }
  }

  .feedback-deleted-indicator {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 1000;
    animation: fadeInOut 2s ease-in-out;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    20%, 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  .delete-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    animation: fadeIn 0.3s ease-out;
  }

  .delete-modal {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: slideIn 0.3s ease-out;
  }

  .dark .delete-modal {
    background: #1f2937;
    color: white;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: scale(0.95) translateY(-10px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  /* Animações para edição de feedback */
  .feedback-editing {
    animation: editPulse 3s ease-in-out forwards;
    background: linear-gradient(90deg, #dcfce7, #bbf7d0) !important;
    border-left: 4px solid #22c55e !important;
    position: relative;
    transition: all 0.3s ease;
  }

  .dark .feedback-editing {
    background: linear-gradient(90deg, #14532d, #166534) !important;
  }

  .feedback-edited-flag {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #22c55e;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  }

  .feedback-edited-indicator {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(34, 197, 94, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 1000;
    animation: fadeInOut 3s ease-in-out;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  @keyframes editPulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.8);
      background: linear-gradient(90deg, #dcfce7, #bbf7d0) !important;
    }
    15% {
      transform: scale(1.03);
      box-shadow: 0 0 0 10px rgba(34, 197, 94, 0.4);
      background: linear-gradient(90deg, #bbf7d0, #86efac) !important;
    }
    30% {
      transform: scale(1.02);
      box-shadow: 0 0 0 15px rgba(34, 197, 94, 0.2);
      background: linear-gradient(90deg, #86efac, #bbf7d0) !important;
    }
    60% {
      transform: scale(1.01);
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.1);
      background: linear-gradient(90deg, #bbf7d0, #dcfce7) !important;
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      background: linear-gradient(90deg, #dcfce7, #f3f4f6) !important;
    }
  }
`;

// Mapa de cores para sentimentos
const sentimentColors = {
  positive: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400",
  neutral: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400",
  negative: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"
}

// Mapa de ícones para avaliações
const ratingIcons: Record<number, string> = {
  1: "★",
  2: "★★",
  3: "★★★",
  4: "★★★★",
  5: "★★★★★"
}

const sentimentBadges = {
  positive: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800",
  neutral: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
  negative: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800"
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => (
  <Badge variant="outline" className={cn(
    "px-3 py-1.5 rounded-full text-sm font-medium border",
    sentimentBadges[sentiment as keyof typeof sentimentBadges]
  )}>
    {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro'}
  </Badge>
)

// Definir mapeamento de departamentos para cores
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

// Lista de departamentos disponíveis
const availableDepartments = [
  'A&B',
  'Governança', 
  'Manutenção',
  'Manutenção - Quarto',
  'Manutenção - Banheiro', 
  'Manutenção - Instalações',
  'Lazer',
  'TI',
  'Operações',
  'Produto',
  'Marketing',
  'Comercial',
  'Qualidade',
  'Recepção',
  'Programa de vendas'
];

// Lista de problemas comuns para sugestão
const commonProblems = [
  'VAZIO',
  'Demora no Atendimento',
  'Falta de Limpeza',
  'Capacidade Insuficiente',
  'Falta de Cadeiras',
  'Não Funciona',
  'Conexão Instável',
  'Ruído Excessivo',
  'Espaço Insuficiente',
  'Qualidade da Comida',
  'Muito Frio',
  'Muito Quente',
  'Pressão de Vendas',
  'Check-in Lento',
  'Check-out Lento'
];

// Lista de palavras-chave comuns
const commonKeywords = [
  'A&B - Café da manhã',
  'A&B - Serviço',
  'A&B - Variedade',
  'A&B - Preço',
  'Limpeza - Quarto',
  'Limpeza - Banheiro',
  'Limpeza - Áreas sociais',
  'Enxoval',
  'Manutenção - Quarto',
  'Manutenção - Banheiro',
  'Manutenção - Instalações',
  'Ar-condicionado',
  'Elevador',
  'Frigobar',
  'Infraestrutura',
  'Lazer - Variedade',
  'Lazer - Estrutura',
  'Spa',
  'Piscina',
  'Tecnologia - Wi-fi',
  'Tecnologia - TV',
  'Comodidade',
  'Estacionamento',
  'Atendimento',
  'Acessibilidade',
  'Reserva de cadeiras (pool)',
  'Processo',
  'Custo-benefício',
  'Comunicação',
  'Check-in - Atendimento',
  'Check-out - Atendimento',
  'Concierge',
  'Cotas',
  'Reservas'
];

// Função para obter a cor com base no departamento
const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
};

// Componente para badges de palavra-chave
const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  const colorClass = getSectorColor(sector);
  
  return (
    <Badge variant="outline" className={cn(
      "text-sm px-3 py-1.5 rounded-full border font-medium",
      colorClass
    )}>
      {keyword}
    </Badge>
  );
};

// Definir uma interface para o tipo de análise
interface Analysis {
  id: string;
  hotelName?: string;
  importDate?: any;
  data?: Feedback[];
  analysis?: any;
  [key: string]: any;
}

// Componente de estatísticas resumidas
const StatsCard = ({ icon: Icon, title, value, change, color }: {
  icon: any;
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  color: string;
}) => (
  <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            change.positive ? "text-green-600" : "text-red-600"
          )}>
            {change.positive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>{Math.abs(change.value)}%</span>
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-full", color)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </Card>
);

// Componente para Modal de Comentário Completo
const CommentModal = ({ feedback, onFeedbackUpdated, onDeleteFeedback, userData }: { 
  feedback: Feedback, 
  onFeedbackUpdated?: (updatedFeedback: Feedback) => void,
  onDeleteFeedback?: (feedback: Feedback) => void,
  userData?: any
}) => {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedProblems, setEditedProblems] = useState<Array<{id: string, keyword: string, sector: string, problem: string}>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    // Inicializar problemas para edição
    if (feedback.allProblems && feedback.allProblems.length > 0) {
      setEditedProblems(feedback.allProblems.map((problem, index) => ({
        id: `problem-${Date.now()}-${index}`,
        ...problem
      })))
    } else {
      // Converter formato antigo para novo
      const keywords = feedback.keyword.split(';').map(k => k.trim())
      const sectors = feedback.sector.split(';').map(s => s.trim())
      const problems = feedback.problem ? feedback.problem.split(';').map(p => p.trim()) : ['']
      
      const maxLength = Math.max(keywords.length, sectors.length, problems.length)
      const problemsArray = []
      
      for (let i = 0; i < maxLength; i++) {
        problemsArray.push({
          id: `problem-${Date.now()}-${i}`,
          keyword: keywords[i] || keywords[0] || 'Não identificado',
          sector: sectors[i] || sectors[0] || 'Não identificado', 
          problem: problems[i] || problems[0] || ''
        })
      }
      
      setEditedProblems(problemsArray)
    }
  }, [feedback, isEditing])
  
  const copyComment = () => {
    navigator.clipboard.writeText(feedback.comment)
    toast({
      title: "Comentário Copiado",
      description: "O comentário foi copiado para a área de transferência.",
    })
  }

  const formatDate = (dateString: string) => {
    return formatDateBR(dateString);
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Resetar para os valores originais
    if (feedback.allProblems && feedback.allProblems.length > 0) {
      setEditedProblems(feedback.allProblems.map((problem, index) => ({
        id: `problem-${Date.now()}-${index}`,
        ...problem
      })))
    }
  }

  const handleUpdateProblem = (id: string, updated: {keyword: string, sector: string, problem: string}) => {
    const newProblems = editedProblems.map(p => 
      p.id === id ? { ...p, ...updated } : p
    )
    setEditedProblems(newProblems)
  }

  const handleRemoveProblem = (id: string) => {
    if (editedProblems.length > 1) {
      const newProblems = editedProblems.filter(p => p.id !== id)
      setEditedProblems(newProblems)
    }
  }

  const handleAddProblem = () => {
    if (editedProblems.length < 3) {
      setEditedProblems([
        ...editedProblems,
        { 
          id: `problem-${Date.now()}-${editedProblems.length}`,
          keyword: 'Comodidade', 
          sector: 'Produto', 
          problem: 'VAZIO' 
        }
      ])
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    
    try {
      // Converter problemas editados de volta para formato string com ';' (removendo o ID)
      const problemsWithoutId = editedProblems.map(({ id, ...problem }) => problem)
      const keywords = problemsWithoutId.map(p => p.keyword).join(';')
      const sectors = problemsWithoutId.map(p => p.sector).join(';')
      const problems = problemsWithoutId.map(p => p.problem).join(';')
      
      // Atualizar feedback local
      const updatedFeedback = {
        ...feedback,
        keyword: keywords,
        sector: sectors,
        problem: problems,
        allProblems: problemsWithoutId
      }
      
      // Atualizar no localStorage
      const storedFeedbacks = localStorage.getItem('analysis-feedbacks')
      if (storedFeedbacks) {
        const feedbacks = JSON.parse(storedFeedbacks)
        const updatedFeedbacks = feedbacks.map((f: Feedback) => 
          f.id === feedback.id ? updatedFeedback : f
        )
        localStorage.setItem('analysis-feedbacks', JSON.stringify(updatedFeedbacks))
      }
      
      // Salvar no Firebase
      await updateFeedbackInFirestore(feedback.id, updatedFeedback)
      
      // Salvar no histórico de edições
      await saveRecentEdit({
        feedbackId: feedback.id,
        hotelId: feedback.hotelId || feedback.id.split('_')[0] || 'unknown',
        hotelName: userData?.hotelName || feedback.hotel || 'Hotel não identificado',
        comment: feedback.comment,
        rating: feedback.rating,
        date: feedback.date,
        source: feedback.source || 'Sistema',
        oldClassification: {
          keyword: feedback.keyword || '',
          sector: feedback.sector || '',
          problem: feedback.problem || ''
        },
        newClassification: {
          keyword: keywords,
          sector: sectors,
          problem: problems
        },
        modifiedAt: new Date().toISOString(),
        modifiedBy: userData?.email || 'Colaborador',
        page: 'analysis'
      })
      
      setIsEditing(false)
      
      // Chamar callback para atualizar a lista principal
      onFeedbackUpdated?.(updatedFeedback)
      
      toast({
        title: "Análise Atualizada",
        description: "As alterações foram salvas com sucesso.",
        duration: 2000,
      })
      
      // Fechar modal após um pequeno delay para mostrar o toast
      setTimeout(() => {
        setIsOpen(false)
      }, 1000)
      
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFeedback = () => {
    onDeleteFeedback?.(feedback)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-110"
          title="Ver detalhes do comentário"
          onClick={() => setIsOpen(true)}
        >
          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 border-2 border-blue-100 dark:border-blue-800/30 shadow-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Comentário</DialogTitle>
        </DialogHeader>
        {/* Header redesenhado */}
        <div className="relative flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          {/* Botão X - Posicionado corretamente */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 h-8 w-8 p-0 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 z-10 group"
            title="Fechar"
          >
            <X className="h-4 w-4 text-gray-500 group-hover:text-red-600 transition-colors" />
          </Button>

          <div className="p-6 pr-16">
            {/* Título principal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Feedback Detalhado
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`h-3.5 w-3.5 ${star <= feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {feedback.rating}/5
                  </span>
                </div>
              </div>
            </div>

            {/* Status e ações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEditing && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700 animate-pulse">
                    <Edit3 className="h-4 w-4" />
                    <span className="text-sm font-medium">Editando</span>
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(feedback.date)}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteFeedback}
                      disabled={isDeleting}
                      className="flex items-center gap-2 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 transition-all duration-200 hover:shadow-md"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEdit}
                      className="flex items-center gap-2 bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 transition-all duration-200 hover:shadow-md"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar Análise
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving || isDeleting}
                      className="flex items-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-200"
                    >
                      <Minus className="h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving || isDeleting}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Informações do Feedback - Design melhorado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(feedback.date)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Star className="h-5 w-5 text-white fill-current" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avaliação</p>
                <div className="flex items-center gap-2">
                  <span className="text-base text-yellow-500">{ratingIcons[feedback.rating] || "N/A"}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{feedback.rating}/5</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sentimento</p>
                <SentimentBadge sentiment={feedback.sentiment} />
              </div>
            </div>
          </div>

          {/* Comentário Principal - Design melhorado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comentário do Cliente</h3>
                <Badge variant="outline" className="text-xs">
                  {feedback.comment.length} caracteres
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyComment}
                className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-medium">
                {feedback.comment}
              </p>
            </div>
          </div>

          {/* Análise IA - Design melhorado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Análise da Inteligência Artificial</h4>
                <Badge variant="secondary" className="text-xs">
                  IA OpenAI
                </Badge>
              </div>
              {isEditing && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700 animate-pulse">
                  <Edit3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Modo Edição Ativo</span>
                </div>
              )}
            </div>
            
            {feedback.allProblems && feedback.allProblems.length > 0 ? (
              isEditing ? (
                // Modo de edição
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                      <Edit3 className="h-4 w-4" />
                      <span className="text-sm font-medium">Editando Classificação</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Corrija a análise da IA se necessário. As alterações serão salvas e refletidas nos dashboards.
                    </p>
                  </div>

                  {editedProblems.map((problem, index) => (
                    <ProblemEditor
                      key={problem.id}
                      problem={problem}
                      onUpdate={(updated) => handleUpdateProblem(problem.id, updated)}
                      onRemove={() => handleRemoveProblem(problem.id)}
                      canRemove={editedProblems.length > 1}
                    />
                  ))}

                  {editedProblems.length < 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddProblem}
                      className="w-full border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Problema ({editedProblems.length}/3)
                    </Button>
                  )}
                </div>
              ) : (
                // Modo visualização para múltiplos problemas
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    A IA identificou {feedback.allProblems.length} problema(s) distinto(s):
                  </p>
                  <div className="space-y-3">
                    {feedback.allProblems.map((problemAnalysis, index) => (
                      <div key={problemAnalysis.id || `problem-${index}`} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Departamento</h5>
                            <Badge 
                              variant="outline"
                              className={cn("text-sm border font-medium", getSectorColor(problemAnalysis.sector))}
                            >
                              {problemAnalysis.sector}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Palavra-chave</h5>
                            <KeywordBadge keyword={problemAnalysis.keyword} sector={problemAnalysis.sector} />
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Problema</h5>
                            <Badge variant="secondary" className="text-sm">
                              {problemAnalysis.problem === 'VAZIO' ? (
                                <span className="italic text-green-600 dark:text-green-400">Sem problemas</span>
                              ) : (
                                problemAnalysis.problem || 'Não especificado'
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              // Exibição tradicional para problema único
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Departamento</h4>
                  <div className="flex flex-wrap gap-1">
                    {feedback.sector.split(';').map((sector, index) => (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className={cn("text-sm border font-medium", getSectorColor(sector.trim()))}
                      >
                        {sector.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Palavras-chave</h4>
                  <div className="flex flex-wrap gap-1">
                    {feedback.keyword.split(';').map((kw, index) => {
                      const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                      return <KeywordBadge key={index} keyword={kw.trim()} sector={sector} />;
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Problema</h4>
                  <Badge variant="secondary" className="text-sm">
                    {feedback.problem === 'VAZIO' ? (
                      <span className="italic text-green-600 dark:text-green-400">Sem problemas</span>
                    ) : (
                      feedback.problem || 'Não especificado'
                    )}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Informações Adicionais - Design melhorado */}
          {(feedback.source || feedback.language || feedback.apartamento) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {feedback.source && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fonte</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{feedback.source}</p>
                </div>
              )}
              {feedback.language && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Idioma</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{feedback.language}</p>
                </div>
              )}
              {feedback.apartamento && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Apartamento</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{feedback.apartamento}</p>
                </div>
              )}
            </div>
          )}
          
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Componente para editar um problema individual
const ProblemEditor = ({ 
  problem, 
  onUpdate, 
  onRemove, 
  canRemove = true 
}: { 
  problem: { id: string; keyword: string; sector: string; problem: string };
  onUpdate: (updated: { keyword: string; sector: string; problem: string }) => void;
  onRemove?: () => void;
  canRemove?: boolean;
}) => {
  const [keyword, setKeyword] = useState(problem.keyword);
  const [sector, setSector] = useState(problem.sector);
  const [problemText, setProblemText] = useState(problem.problem);
  const [keywordInputMode, setKeywordInputMode] = useState(false);
  const [problemInputMode, setProblemInputMode] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [problemInput, setProblemInput] = useState('');
  const [keywordJustEdited, setKeywordJustEdited] = useState(false);
  const [problemJustEdited, setProblemJustEdited] = useState(false);

  useEffect(() => {
    onUpdate({ keyword, sector, problem: problemText });
  }, [keyword, sector, problemText, onUpdate]);

  const handleProblemChange = (value: string) => {
    setProblemText(value);
    if (value !== 'VAZIO') {
      setProblemInputMode(false);
    }
  };

  const handleKeywordInputModeToggle = () => {
    if (!keywordInputMode) {
      // Sempre usar o valor atual como ponto de partida para edição
      setKeywordInput(keyword || '');
    }
    setKeywordInputMode(!keywordInputMode);
  };

  const handleProblemInputModeToggle = () => {
    if (!problemInputMode) {
      // Sempre usar o valor atual como ponto de partida para edição
      setProblemInput(problemText || '');
    }
    setProblemInputMode(!problemInputMode);
  };

  const handleKeywordInputSave = () => {
    const trimmedValue = keywordInput.trim();
    if (trimmedValue) {
      setKeyword(trimmedValue);
      // Só sair do modo de input se o valor estiver na lista de opções predefinidas
      const isPreDefined = commonKeywords.includes(trimmedValue);
      setKeywordInputMode(!isPreDefined);
      
      // Mostrar feedback visual de sucesso
      setKeywordJustEdited(true);
      setTimeout(() => setKeywordJustEdited(false), 2000);
      
      onUpdate({ keyword: trimmedValue, sector, problem: problemText });
    } else {
      // Se o valor estiver vazio, manter no modo de edição
      setKeywordInput(keyword || '');
    }
  };

  const handleProblemInputSave = () => {
    const trimmedValue = problemInput.trim();
    if (trimmedValue) {
      setProblemText(trimmedValue);
      // Só sair do modo de input se o valor estiver na lista de opções predefinidas
      const isPreDefined = commonProblems.includes(trimmedValue);
      setProblemInputMode(!isPreDefined);
      
      // Mostrar feedback visual de sucesso
      setProblemJustEdited(true);
      setTimeout(() => setProblemJustEdited(false), 2000);
      
      onUpdate({ keyword, sector, problem: trimmedValue });
    } else {
      // Se o valor estiver vazio, manter no modo de edição
      setProblemInput(problemText || '');
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 space-y-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Análise de Problema
        </h5>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Palavra-chave */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Palavra-chave
          </label>
          {keywordInputMode ? (
            <div className="space-y-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleKeywordInputSave();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setKeywordInput(keyword);
                    setKeywordInputMode(false);
                  }
                }}
                className={cn(
                  "text-sm transition-all duration-300",
                  keywordJustEdited 
                    ? "border-green-300 dark:border-green-700 focus:ring-green-200 dark:focus:ring-green-800" 
                    : "focus:ring-blue-200 dark:focus:ring-blue-800"
                )}
                placeholder="Digite palavra-chave personalizada"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleKeywordInputSave} 
                  className={cn(
                    "text-xs transition-all duration-300",
                    keywordJustEdited 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {keywordJustEdited ? '✓ Salvo' : 'OK'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setKeywordInput(keyword);
                  setKeywordInputMode(false);
                }} className="text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Se o valor atual não está na lista predefinida, mostrar como input readonly */}
              {!commonKeywords.includes(keyword) && keyword ? (
                <div className="relative">
                  <Input
                    value={keyword}
                    readOnly
                    className={cn(
                      "text-sm font-medium transition-all duration-500",
                      keywordJustEdited 
                        ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 shadow-md ring-2 ring-green-200 dark:ring-green-800" 
                        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                    )}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    {keywordJustEdited && (
                      <div className="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">
                        ✓
                      </div>
                    )}
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      Personalizado
                    </Badge>
                  </div>
                </div>
              ) : (
                <Select value={keyword} onValueChange={setKeyword}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione palavra-chave" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonKeywords.map((kw) => (
                      <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleKeywordInputModeToggle}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                {!commonKeywords.includes(keyword) && keyword ? '✏️ Editar' : '+ Personalizar'}
              </Button>
            </div>
          )}
        </div>

        {/* Departamento */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Departamento
          </label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione departamento" />
            </SelectTrigger>
            <SelectContent>
              {availableDepartments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getSectorColor(dept).replace(/text-\w+-\d+/g, '').replace(/border-\w+-\d+/g, ''))} />
                    {dept}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Problema */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Problema
          </label>
          {problemInputMode ? (
            <div className="space-y-2">
              <Input
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProblemInputSave();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setProblemInput(problemText);
                    setProblemInputMode(false);
                  }
                }}
                className={cn(
                  "text-sm transition-all duration-300",
                  problemJustEdited 
                    ? "border-green-300 dark:border-green-700 focus:ring-green-200 dark:focus:ring-green-800" 
                    : "focus:ring-blue-200 dark:focus:ring-blue-800"
                )}
                placeholder="Digite problema personalizado"
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleProblemInputSave} 
                  className={cn(
                    "text-xs transition-all duration-300",
                    problemJustEdited 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {problemJustEdited ? '✓ Salvo' : 'OK'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setProblemInput(problemText);
                  setProblemInputMode(false);
                }} className="text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Se o valor atual não está na lista predefinida, mostrar como input readonly */}
              {!commonProblems.includes(problemText) && problemText ? (
                <div className="relative">
                  <Input
                    value={problemText}
                    readOnly
                    className={cn(
                      "text-sm font-medium transition-all duration-500",
                      problemJustEdited 
                        ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 shadow-md ring-2 ring-green-200 dark:ring-green-800" 
                        : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                    )}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    {problemJustEdited && (
                      <div className="text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">
                        ✓
                      </div>
                    )}
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      Personalizado
                    </Badge>
                  </div>
                </div>
              ) : (
                <Select value={problemText} onValueChange={handleProblemChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione problema" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonProblems.map((prob) => (
                      <SelectItem key={prob} value={prob}>
                        {prob === 'VAZIO' ? (
                          <span className="italic text-gray-500">Sem problemas</span>
                        ) : (
                          prob
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleProblemInputModeToggle}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                {!commonProblems.includes(problemText) && problemText ? '✏️ Editar' : '+ Personalizar'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview do badge */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
          <Eye className="h-3 w-3" />
          Visualização:
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn("text-sm border font-medium", getSectorColor(sector))}>
            {sector}
          </Badge>
          <KeywordBadge keyword={keyword} sector={sector} />
          <Badge variant="secondary" className="text-sm">
            {problemText === 'VAZIO' ? (
              <span className="italic text-gray-500">Sem problemas</span>
            ) : (
              problemText
            )}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default function AnalysisPage() {
  return (
    <SharedDashboardLayout>
      <AnalysisPageContent />
    </SharedDashboardLayout>
  );
}

function AnalysisPageContent() {
  const { userData } = useAuth()
  
  // Estados principais
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [keywordFilter, setKeywordFilter] = useState("all")
  const [problemFilter, setProblemFilter] = useState("all")

  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [quickDateFilter, setQuickDateFilter] = useState("all")
  
  // Estados para animação de exclusão
  const [deletingFeedbacks, setDeletingFeedbacks] = useState<Set<string>>(new Set())
  const [showDeletedIndicator, setShowDeletedIndicator] = useState(false)
  
  // Estados para animação de edição
  const [editingFeedbacks, setEditingFeedbacks] = useState<Set<string>>(new Set())
  const [editedFeedbacks, setEditedFeedbacks] = useState<Set<string>>(new Set())
  const [showEditedIndicator, setShowEditedIndicator] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // Estados para modal de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null)

  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { toast } = useToast()

  // Carregar dados do Firebase na inicialização
  useEffect(() => {
    const loadFirebaseData = async () => {
      try {
        setLoading(true)
        const allAnalyses = await getAllAnalyses()
        setAnalyses(allAnalyses)
        
        // Combinar todos os feedbacks de todas as análises
        const allFeedbacks: Feedback[] = []
        allAnalyses.forEach((analysis) => {
          if (analysis.data && Array.isArray(analysis.data)) {
            // Filtrar feedbacks excluídos e adicionar informações da importação
            const validFeedbacks = analysis.data
              .filter((feedback: any) => feedback.deleted !== true)
              .map((feedback: Feedback) => ({
                ...feedback,
                importId: analysis.id,
                importDate: analysis.importDate,
                hotelName: analysis.hotelName || analysis.hotelDisplayName
              }))
            allFeedbacks.push(...validFeedbacks)
          }
        })
        
        setFeedbacks(allFeedbacks)
        
        toast({
          title: "Dados Carregados",
          description: `${allFeedbacks.length} feedbacks carregados de ${allAnalyses.length} importações`,
        })
      } catch (error) {
        console.error('Erro ao carregar dados do Firebase:', error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadFirebaseData()
  }, [])

  // Aplicar filtros de data rápidos
  const applyQuickDateFilter = (filter: string) => {
    const now = new Date()
    let from: Date | undefined
    let to: Date | undefined
    
    switch (filter) {
      case "7days":
        from = subDays(now, 7)
        to = now
        break
      case "30days":
        from = subDays(now, 30)
        to = now
        break
      case "thisMonth":
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case "lastMonth":
        const lastMonth = subMonths(now, 1)
        from = startOfMonth(lastMonth)
        to = endOfMonth(lastMonth)
        break
      default:
        from = undefined
        to = undefined
    }
    
    setDateRange({ from, to })
    setQuickDateFilter(filter)
  }

  // Função para atualizar um feedback específico na lista
  const handleFeedbackUpdated = (updatedFeedback: Feedback) => {
    setFeedbacks(prevFeedbacks => 
      prevFeedbacks.map(f => 
        f.id === updatedFeedback.id ? updatedFeedback : f
      )
    )
    
    // Se feedback foi deletado, iniciar animação antes de remover
    if (updatedFeedback.deleted) {
      // Adicionar à lista de feedbacks sendo excluídos
       setDeletingFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      
      // Mostrar indicador de exclusão
      setShowDeletedIndicator(true)
      
      // Remover da lista após a animação (500ms)
      setTimeout(() => {
        setFilteredFeedbacks(prevFiltered => 
          prevFiltered.filter(f => f.id !== updatedFeedback.id)
        )
        setDeletingFeedbacks(prev => {
          const newSet = new Set(prev)
          newSet.delete(updatedFeedback.id)
          return newSet
        })
      }, 500)
      
      // Esconder indicador após 2 segundos
      setTimeout(() => {
        setShowDeletedIndicator(false)
      }, 2000)
    } else {
      // Atualizar feedback editado com animação
      setFilteredFeedbacks(prevFiltered => 
        prevFiltered.map(f => 
          f.id === updatedFeedback.id ? updatedFeedback : f
        )
      )
      
      // Adicionar animação de edição
      setEditingFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      
      // Adicionar flag de editado
      setEditedFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      
      // Mostrar indicador de edição
      setShowEditedIndicator(true)
      
      // Remover animação após 3 segundos
      setTimeout(() => {
        setEditingFeedbacks(prev => {
          const newSet = new Set(prev)
          newSet.delete(updatedFeedback.id)
          return newSet
        })
      }, 3000)
      
      // Remover flag de editado após 5 segundos
      setTimeout(() => {
        setEditedFeedbacks(prev => {
          const newSet = new Set(prev)
          newSet.delete(updatedFeedback.id)
          return newSet
        })
      }, 5000)
      
      // Esconder indicador após 3 segundos
      setTimeout(() => {
        setShowEditedIndicator(false)
      }, 3000)
      
      // Forçar re-render
      setForceUpdate(prev => prev + 1)
    }
    
    console.log('✅ Feedback atualizado na lista:', updatedFeedback.id, updatedFeedback.deleted ? '(deletado)' : '(editado)')
  }

  // Função para abrir modal de confirmação de exclusão
  const handleDeleteFeedback = (feedback: Feedback) => {
    setFeedbackToDelete(feedback)
    setShowDeleteConfirm(true)
  }

  // Função para confirmar exclusão
  const confirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return

    // Fechar o modal imediatamente para mostrar a animação de exclusão
    setShowDeleteConfirm(false)
    
    try {
      // Adicionar animação de saída
      setDeletingFeedbacks(prev => new Set([...Array.from(prev), feedbackToDelete.id]))
      
      const updatedFeedback = { ...feedbackToDelete, deleted: true }
      await updateFeedbackInFirestore(feedbackToDelete.id, updatedFeedback)
      
      // Aguardar a animação antes de remover (mais tempo para animação suave)
      setTimeout(() => {
        handleFeedbackUpdated(updatedFeedback)
        setDeletingFeedbacks(prev => {
          const newSet = new Set(prev)
          newSet.delete(feedbackToDelete.id)
          return newSet
        })
      }, 800) // Duração aumentada para animação mais suave
      
      toast({
        title: "Feedback excluído",
        description: "O feedback foi excluído com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao excluir feedback:', error)
      // Remover da lista de exclusão em caso de erro
      setDeletingFeedbacks(prev => {
        const newSet = new Set(prev)
        newSet.delete(feedbackToDelete.id)
        return newSet
      })
      toast({
        title: "Erro",
        description: "Não foi possível excluir o feedback.",
        variant: "destructive"
      })
    } finally {
      setFeedbackToDelete(null)
    }
  }

  // Função para recarregar dados do Firebase
  const reloadData = async () => {
    try {
      setLoading(true)
      const allAnalyses = await getAllAnalyses()
      setAnalyses(allAnalyses)
      
      // Combinar todos os feedbacks de todas as análises
      const allFeedbacks: Feedback[] = []
      allAnalyses.forEach((analysis) => {
        if (analysis.data && Array.isArray(analysis.data)) {
          // Adicionar informações da importação a cada feedback
          const feedbacksWithImportInfo = analysis.data.map((feedback: Feedback) => ({
            ...feedback,
            importId: analysis.id,
            importDate: analysis.importDate,
            hotelName: analysis.hotelName || analysis.hotelDisplayName
          }))
          allFeedbacks.push(...feedbacksWithImportInfo)
        }
      })
      
      setFeedbacks(allFeedbacks)
      
      toast({
        title: "Dados Atualizados",
        description: `${allFeedbacks.length} feedbacks carregados de ${allAnalyses.length} importações`,
      })
    } catch (error) {
      console.error('Erro ao recarregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível recarregar os dados",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    let filtered = feedbacks.filter((feedback) => {
      // Excluir feedbacks marcados como deletados
      const isNotDeleted = !feedback.deleted
      const matchesSentiment = sentimentFilter === "all" || feedback.sentiment === sentimentFilter
      const matchesSector = sectorFilter === "all" || feedback.sector.toLowerCase().includes(sectorFilter.toLowerCase())
      const matchesKeyword = keywordFilter === "all" || feedback.keyword.toLowerCase().includes(keywordFilter.toLowerCase())
      const matchesProblem = problemFilter === "all" || feedback.problem?.toLowerCase().includes(problemFilter.toLowerCase())
      
      // Filtro de data por range
      let matchesDateRange = true
      if (dateRange?.from || dateRange?.to) {
        const feedbackDate = new Date(feedback.date)
        if (dateRange.from && feedbackDate < dateRange.from) {
          matchesDateRange = false
        }
        if (dateRange.to && feedbackDate > dateRange.to) {
          matchesDateRange = false
        }
      }
      const matchesSearch = !searchTerm || feedback.comment.toLowerCase().includes(searchTerm.toLowerCase())

      return isNotDeleted && matchesSentiment && matchesSector && matchesKeyword && matchesProblem && matchesDateRange && matchesSearch
    })

    // Ordenar por data de importação para agrupar visualmente
    filtered.sort((a, b) => {
      const dateA = new Date((a as any).importDate?.seconds ? (a as any).importDate.seconds * 1000 : (a as any).importDate || 0)
      const dateB = new Date((b as any).importDate?.seconds ? (b as any).importDate.seconds * 1000 : (b as any).importDate || 0)
      return dateB.getTime() - dateA.getTime()
    })

    setFilteredFeedbacks(filtered)
  }, [feedbacks, sentimentFilter, sectorFilter, keywordFilter, problemFilter, dateRange, searchTerm])

  // Calcular estatísticas (excluindo feedbacks deletados)
  const activeFeedbacks = feedbacks.filter(f => !f.deleted)
  const stats = {
    total: activeFeedbacks.length,
    positive: activeFeedbacks.filter(f => f.sentiment === 'positive').length,
    negative: activeFeedbacks.filter(f => f.sentiment === 'negative').length,
    neutral: activeFeedbacks.filter(f => f.sentiment === 'neutral').length,
    averageRating: activeFeedbacks.length > 0 ? (activeFeedbacks.reduce((acc, f) => acc + f.rating, 0) / activeFeedbacks.length).toFixed(1) : '0'
  }

  // Obter listas únicas para filtros
  const sectors = Array.from(new Set(feedbacks.flatMap(f => f.sector.split(';')).map(s => s.trim()).filter(Boolean)))
  const keywords = Array.from(new Set(feedbacks.flatMap(f => f.keyword.split(';')).map(k => k.trim()).filter(Boolean)))
  const problems = Array.from(new Set(feedbacks.flatMap(f => f.problem?.split(';') || []).map(p => p.trim()).filter(Boolean)))

  const clearFilters = () => {
    setSentimentFilter("all")
    setSectorFilter("all")
    setKeywordFilter("all")
    setProblemFilter("all")
    setDateRange(undefined)
    setQuickDateFilter("")
    setSearchTerm("")
  }

  const exportData = () => {
    const dataStr = JSON.stringify(filteredFeedbacks, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `analise-feedbacks-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    toast({
      title: "Dados Exportados",
      description: `${filteredFeedbacks.length} feedbacks exportados com sucesso`,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Carregando análise...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <TooltipProvider>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Análise Detalhada
            </h1>
            <p className="text-muted-foreground mt-2">
              Explore e analise todos os feedbacks processados pela IA
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button 
              onClick={exportData}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            icon={MessageSquare}
            title="Total de Feedbacks"
            value={stats.total}
            color="bg-blue-500"
          />
          <StatsCard
            icon={TrendingUp}
            title="Positivos"
            value={stats.positive}
            color="bg-green-500"
          />
          <StatsCard
            icon={Minus}
            title="Neutros"
            value={stats.neutral}
            color="bg-yellow-500"
          />
          <StatsCard
            icon={ArrowDown}
            title="Negativos"
            value={stats.negative}
            color="bg-red-500"
          />
          <StatsCard
            icon={Star}
            title="Média Geral"
            value={`${stats.averageRating}★`}
            color="bg-purple-500"
          />
        </div>

        {/* Filtros e Busca */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Filtros de Análise</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Busca por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos comentários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por sentimento */}
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sentimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os sentimentos</SelectItem>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="neutral">Neutro</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por departamento */}
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por palavra-chave */}
            <Select value={keywordFilter} onValueChange={setKeywordFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Palavra-chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as palavras-chave</SelectItem>
                {keywords.slice(0, 20).map((keyword) => (
                  <SelectItem key={keyword} value={keyword}>{keyword}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por problema */}
            <Select value={problemFilter} onValueChange={setProblemFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Problema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os problemas</SelectItem>
                {problems.slice(0, 20).map((problem) => (
                  <SelectItem key={problem} value={problem}>{problem}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtros pré-definidos de data */}
            <Select value={quickDateFilter} onValueChange={applyQuickDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="thisMonth">Este mês</SelectItem>
                <SelectItem value="lastMonth">Mês passado</SelectItem>
              </SelectContent>
            </Select>

            {/* Calendário para seleção de intervalo */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecionar período"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Indicador de resultados filtrados */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando <strong>{filteredFeedbacks.length}</strong> de <strong>{feedbacks.length}</strong> feedbacks
            </span>
            {(sentimentFilter !== "all" || sectorFilter !== "all" || keywordFilter !== "all" || problemFilter !== "all" || dateRange?.from || dateRange?.to || searchTerm) && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Filtros ativos
              </Badge>
            )}
          </div>
        </Card>

        {/* Tabela de Feedbacks */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <h3 className="text-lg font-semibold">Feedbacks Analisados</h3>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Header fixo • Scrollbars visíveis • Compacto</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Otimizado"></span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="table-with-fixed-header" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
            {/* Header fixo */}
            <div className="fixed-header">
              <div className="overflow-hidden">
                <div className="flex bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900">
                  <div className="w-24 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm flex items-center">
                    Data
                  </div>
                  <div className="w-64 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm flex items-center">
                    Comentário
                  </div>
                  <div className="w-24 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm text-center flex items-center justify-center">
                    Nota
                  </div>
                  <div className="w-28 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm text-center flex items-center justify-center">
                    Sentimento
                  </div>
                  <div className="w-48 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm flex items-center">
                    Departamento
                  </div>
                  <div className="w-52 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm flex items-center">
                    Palavra-chave
                  </div>
                  <div className="w-44 py-4 px-3 border-r border-slate-700 dark:border-slate-800 font-semibold text-white text-sm flex items-center">
                    Problema
                  </div>
                  <div className="w-12 py-4 px-3 font-semibold text-white text-sm text-center flex items-center justify-center">
                    Ações
                  </div>
                </div>
              </div>
            </div>
            
            {/* Corpo da tabela com scroll */}
            <div className="scrollable-body custom-scrollbar">
              <div className="min-h-full">
                {filteredFeedbacks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      Nenhum feedback encontrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {feedbacks.length === 0 
                        ? "Importe dados na página de Import para começar a análise"
                        : "Ajuste os filtros para ver mais resultados"
                      }
                    </p>
                  </div>
                ) : (
                  <div>
                    {(() => {
                      // Agrupar feedbacks por data de importação
                      const groupedFeedbacks = filteredFeedbacks.reduce((groups, feedback) => {
                        const importDate = (feedback as any).importDate
                        
                        // Corrigir timezone: adicionar 1 dia para compensar UTC
                        let dateKey: string
                        if (importDate?.seconds) {
                          const firebaseDate = new Date(importDate.seconds * 1000)
                          // Adicionar 1 dia para compensar diferença de timezone
                          firebaseDate.setDate(firebaseDate.getDate() + 1)
                          dateKey = firebaseDate.toISOString().split('T')[0]
                        } else {
                          const fallbackDate = new Date(importDate || 0)
                          fallbackDate.setDate(fallbackDate.getDate() + 1)
                          dateKey = fallbackDate.toISOString().split('T')[0]
                        }
                        
                        if (!groups[dateKey]) {
                          groups[dateKey] = []
                        }
                        groups[dateKey].push(feedback)
                        return groups
                      }, {} as Record<string, typeof filteredFeedbacks>)

                      // Ordenar grupos por data (mais recente primeiro)
                      const sortedGroups = Object.entries(groupedFeedbacks).sort(([a], [b]) => 
                        new Date(b).getTime() - new Date(a).getTime()
                      )

                      return sortedGroups.map(([dateKey, groupFeedbacks], groupIndex) => (
                        <div key={dateKey} className="mb-6">
                          {/* Cabeçalho do grupo com data de importação */}
                          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-l-4 border-blue-500 dark:border-blue-400 px-4 py-3 mb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
                                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                  Importação de {formatDateBR(dateKey)}
                                </h4>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {groupFeedbacks.length} feedback{groupFeedbacks.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Feedbacks do grupo */}
                          <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            {groupFeedbacks.map((feedback) => (
                      <div 
                        key={feedback.id} 
                        className={cn(
                          "flex hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors min-h-[80px] relative",
                          deletingFeedbacks.has(feedback.id) && "feedback-deleting",
                          editingFeedbacks.has(feedback.id) && "feedback-editing"
                        )}
                      >
                        {/* Flag de editado */}
                        {editedFeedbacks.has(feedback.id) && (
                          <div className="feedback-edited-flag">
                            ✓
                          </div>
                        )}
                        <div className="w-24 py-4 px-3 border-r border-gray-200 dark:border-gray-800 text-xs flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400">
                            {formatDateBR(feedback.date)}
                          </span>
                        </div>
                        <div className="w-64 py-4 px-3 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <p className="text-sm line-clamp-4 leading-relaxed text-gray-700 dark:text-gray-300">
                            {feedback.comment.length > 150 
                              ? `${feedback.comment.substring(0, 150)}...` 
                              : feedback.comment
                            }
                          </p>
                        </div>
                        <div className="w-24 py-4 px-3 border-r border-gray-200 dark:border-gray-800 text-center flex items-center justify-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <span className="text-base leading-none text-yellow-500">{ratingIcons[feedback.rating] || "N/A"}</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{feedback.rating}</span>
                          </div>
                        </div>
                        <div className="w-28 py-4 px-3 border-r border-gray-200 dark:border-gray-800 text-center flex items-center justify-center">
                          <SentimentBadge sentiment={feedback.sentiment} />
                        </div>
                        <div className="w-48 py-4 px-3 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <div className="flex flex-wrap gap-1">
                            {feedback.sector.split(';').slice(0, 3).map((sector, index) => (
                              <Badge 
                                key={index} 
                                variant="outline"
                                className={cn("text-xs border", getSectorColor(sector.trim()))}
                              >
                                {sector.trim().substring(0, 15)}
                              </Badge>
                            ))}
                            {feedback.sector.split(';').length > 3 && (
                              <Badge variant="outline" className="text-sm px-2 py-1">
                                +{feedback.sector.split(';').length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="w-52 py-4 px-3 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <div className="flex flex-wrap gap-1">
                            {feedback.keyword.split(';').slice(0, 3).map((kw, index) => {
                              const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                              return (
                                <KeywordBadge 
                                  key={index} 
                                  keyword={kw.trim().substring(0, 16)} 
                                  sector={sector} 
                                />
                              );
                            })}
                            {feedback.keyword.split(';').length > 3 && (
                              <Badge variant="outline" className="text-sm px-2 py-1">
                                +{feedback.keyword.split(';').length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="w-44 py-4 px-3 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <div className="flex flex-wrap gap-1">
                            {feedback.problem ? (
                              feedback.problem.split(';').slice(0, 3).map((problem, index) => {
                                const sector = feedback.sector.split(';')[index]?.trim() || feedback.sector.split(';')[0]?.trim() || '';
                                const trimmedProblem = problem.trim();
                                
                                if (trimmedProblem === 'VAZIO') {
                                  return (
                                    <span key={index} className="text-sm text-green-600 dark:text-green-400 italic font-medium">
                                      Sem problemas
                                    </span>
                                  );
                                }
                                
                                return (
                                  <Badge 
                                    key={index} 
                                    variant="outline"
                                    className={cn("text-sm px-3 py-1.5 border", getSectorColor(sector))}
                                  >
                                    {trimmedProblem.substring(0, 14)}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-sm text-green-600 dark:text-green-400 italic font-medium">Sem problemas</span>
                            )}
                            {feedback.problem && feedback.problem.split(';').length > 3 && (
                              <Badge variant="outline" className="text-sm px-2 py-1">
                                +{feedback.problem.split(';').length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="w-12 py-4 px-3 text-center flex items-center justify-center">
                          <CommentModal feedback={feedback} onFeedbackUpdated={handleFeedbackUpdated} onDeleteFeedback={handleDeleteFeedback} userData={userData} />
                        </div>
                      </div>
                    ))}
                  </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
        
        {/* Indicador de exclusão */}
        {showDeletedIndicator && (
          <div className="feedback-deleted-indicator">
            ✓ Comentário excluído com sucesso
          </div>
        )}
        
        {/* Modal de confirmação de exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" style={{zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Confirmar Exclusão
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita e o feedback será removido permanentemente.
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full sm:w-auto transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={confirmDeleteFeedback}
                    className="w-full sm:w-auto transition-all duration-200 bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Excluir Feedback
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Indicador de feedback editado */}
        {showEditedIndicator && (
          <div className="feedback-edited-indicator">
            ✓ Feedback editado com sucesso!
          </div>
        )}
        
        {/* Indicador de feedback excluído */}
        {showDeletedIndicator && (
          <div className="feedback-deleted-indicator">
            🗑️ Feedback excluído com sucesso!
          </div>
        )}
      </TooltipProvider>
    </div>
  )
}