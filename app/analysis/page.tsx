"use client"

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react"
import { useSlideUpCounter, useSlideUpDecimal } from "@/hooks/use-slide-up-counter"
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
  ArrowLeft,
  Minus,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  CalendarDays,
  Lightbulb,
  History,
  Clock

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
import { EnhancedProblemEditor } from "@/components/enhanced-problem-editor"

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
    contain: layout style paint;
    isolation: isolate;
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
    overscroll-behavior: contain;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    position: relative;
    z-index: 1;
  }
  
  /* Previne o scroll da página quando dentro da tabela */
  .scrollable-body:focus-within {
    overscroll-behavior: none;
  }
  
  /* Melhora a performance do scroll */
  .scrollable-body * {
    will-change: auto;
  }
  
  /* Previne bounce/elastic scroll no macOS */
  .scrollable-body {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    overscroll-behavior-x: auto;
  }
  
  /* Garante que o scroll fique contido na área da tabela */
  .table-with-fixed-header {
    touch-action: pan-y;
    overflow: hidden;
  }
  
  /* Melhora a responsividade do scroll */
  .scrollable-body:hover {
    overscroll-behavior: none;
  }
  
  /* Previne interferência com scroll da página */
  .scrollable-body::-webkit-scrollbar {
    width: 16px !important;
    height: 16px !important;
  }
  
  /* Garante que o container da tabela não interfira com o scroll da página */
  .table-with-fixed-header:hover {
    overscroll-behavior: contain;
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
    background: #3b82f6;
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
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
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

  /* Animação de slide up para números */
  .number-slide-enter {
    animation: slideUpNumber 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  @keyframes slideUpNumber {
    0% {
      transform: translateY(100%) scale(0.8);
      opacity: 0;
    }
    30% {
      transform: translateY(20%) scale(0.9);
      opacity: 0.3;
    }
    60% {
      transform: translateY(-5%) scale(1.02);
      opacity: 0.8;
    }
    100% {
      transform: translateY(0%) scale(1);
      opacity: 1;
    }
  }

  .number-container {
    perspective: 1000px;
  }

  .number-digit {
    display: inline-block;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .number-digit.animating {
    animation: digitBounce 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  @keyframes digitBounce {
    0% {
      transform: translateY(30px) scale(0.7);
      opacity: 0;
    }
    40% {
      transform: translateY(10px) scale(0.9);
      opacity: 0.5;
    }
    70% {
      transform: translateY(-3px) scale(1.05);
      opacity: 0.9;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`;

// Função helper para dividir strings por múltiplos delimitadores
const splitByDelimiter = (str: string): string[] => {
  if (!str || str.trim() === '') return [];
  
  // Primeiro tenta separar por ponto e vírgula, depois por vírgula
  let items: string[] = [];
  if (str.includes(';')) {
    items = str.split(';');
  } else if (str.includes(',')) {
    items = str.split(',');
  } else {
    items = [str];
  }
  
  return items
    .map(item => item.trim())
    .filter(item => item !== '' && item !== 'undefined' && item !== 'null');
};

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
  positive: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/40 dark:to-green-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 shadow-sm",
  neutral: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm",
  negative: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/40 dark:to-rose-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 shadow-sm"
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  const getSentimentIcon = () => {
    switch (sentiment) {
      case 'positive': return '😊'
      case 'negative': return '😞'
      default: return '😐'
    }
  }

  return (
    <Badge variant="outline" className={cn(
      "px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 hover:scale-105 hover:shadow-md",
      sentimentBadges[sentiment as keyof typeof sentimentBadges]
    )}>
      <span className="mr-1.5">{getSentimentIcon()}</span>
      {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro'}
    </Badge>
  )
}

// Definir mapeamento de departamentos para cores com gradientes elegantes
const sectorColors: Record<string, string> = {
  'A&B': 'bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/40 dark:to-sky-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm',
  'Governança': 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/40 dark:to-rose-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 shadow-sm',
  'Manutenção': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Manutenção - Quarto': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Manutenção - Banheiro': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Manutenção - Instalações': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Lazer': 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/40 dark:to-green-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 shadow-sm',
  'TI': 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 shadow-sm',
  'Operações': 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 shadow-sm',
  'Produto': 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 shadow-sm',
  'Marketing': 'bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/40 dark:to-rose-900/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700 shadow-sm',
  'Comercial': 'bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/40 dark:to-teal-900/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700 shadow-sm',
  'Qualidade': 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/40 dark:to-gray-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm',
  'Recepção': 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/40 dark:to-emerald-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700 shadow-sm',
  'Programa de vendas': 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 shadow-sm'
};

// Componente SuggestionEditor para editar sugestões
const SuggestionEditor = ({ 
  suggestion, 
  onUpdate, 
  onRemove, 
  canRemove = true 
}: { 
  suggestion: { id: string; has_suggestion: boolean; suggestion_type: string; suggestion_summary: string };
  onUpdate: (updated: { has_suggestion: boolean; suggestion_type: string; suggestion_summary: string }) => void;
  onRemove?: () => void;
  canRemove?: boolean;
}) => {
  const [hasSuggestion, setHasSuggestion] = useState(suggestion.has_suggestion);
  const [suggestionType, setSuggestionType] = useState(suggestion.suggestion_type);
  const [suggestionSummary, setSuggestionSummary] = useState(suggestion.suggestion_summary);
  const [summaryInputMode, setSummaryInputMode] = useState(false);
  const [summaryInput, setSummaryInput] = useState(suggestion.suggestion_summary);
  const [summaryJustEdited, setSummaryJustEdited] = useState(false);
  
  // 🚀 OTIMIZAÇÃO: useRef para timeout cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Opções de tipo de sugestão
  const suggestionTypes = [
    { value: 'only', label: 'Apenas' },
    { value: 'only_suggestion', label: 'Apenas Sugestão' },
    { value: 'mixed', label: 'Mista' },
    { value: 'with_criticism', label: 'Com Crítica' },
    { value: 'with_praise', label: 'Com Elogio' },
    { value: 'none', label: 'Sem Sugestão' }
  ];

  // 🚀 CLEANUP: Limpar timeout no unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Atualizar apenas quando a suggestion prop mudar (não quando os states internos mudarem)
  useEffect(() => {
    // Só atualizar se os valores realmente mudaram comparado à prop original
    if (suggestion.has_suggestion !== hasSuggestion) {
      setHasSuggestion(suggestion.has_suggestion);
    }
    if (suggestion.suggestion_type !== suggestionType) {
      setSuggestionType(suggestion.suggestion_type);
    }
    if (suggestion.suggestion_summary !== suggestionSummary) {
      setSuggestionSummary(suggestion.suggestion_summary);
    }
    
    // Só atualizar summaryInput se não estiver em modo de edição
    if (!summaryInputMode && suggestion.suggestion_summary !== summaryInput) {
      setSummaryInput(suggestion.suggestion_summary || '');
    }
  }, [suggestion.has_suggestion, suggestion.suggestion_type, suggestion.suggestion_summary, summaryInputMode]);

  // Função para atualizar a sugestão
  const handleUpdate = () => {
    onUpdate({
      has_suggestion: hasSuggestion,
      suggestion_type: suggestionType,
      suggestion_summary: suggestionSummary
    });
  };

  // Funções para o modo de input do resumo
  const handleSummaryInputModeToggle = () => {
    setSummaryInputMode(!summaryInputMode);
    if (!summaryInputMode) {
      setSummaryInput(suggestionSummary);
    }
  };

  const handleSummaryInputSave = () => {
    setSuggestionSummary(summaryInput);
    setSummaryInputMode(false);
    setSummaryJustEdited(true);
    
    // Chamar update diretamente com os novos valores, sem depender do estado
    onUpdate({
      has_suggestion: hasSuggestion,
      suggestion_type: suggestionType,
      suggestion_summary: summaryInput // Usar o valor atual do input
    });
    
    // 🚀 OTIMIZAÇÃO: Timeout com cleanup
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSummaryJustEdited(false);
      timeoutRef.current = null;
    }, 3000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          Análise de Sugestão
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
        {/* Tem Sugestão */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Tem Sugestão
          </label>
          <Select value={hasSuggestion ? 'true' : 'false'} onValueChange={(value) => {
            const newValue = value === 'true';
            setHasSuggestion(newValue);
            
            // Se mudou para "Sim" e não tinha tipo definido, configurar um padrão
            let newType = suggestionType;
            if (newValue && (!suggestionType || suggestionType === 'none')) {
              newType = 'only_suggestion';
              setSuggestionType(newType);
            } else if (!newValue) {
              newType = 'none';
              setSuggestionType(newType);
            }
            
            // Chamar onUpdate diretamente com os novos valores
            onUpdate({
              has_suggestion: newValue,
              suggestion_type: newType,
              suggestion_summary: suggestionSummary
            });
          }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Sugestão */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Tipo de Sugestão
          </label>
          <Select value={suggestionType} onValueChange={(value) => {
            setSuggestionType(value);
            
            // Chamar onUpdate diretamente com os novos valores
            onUpdate({
              has_suggestion: hasSuggestion,
              suggestion_type: value,
              suggestion_summary: suggestionSummary
            });
          }} disabled={!hasSuggestion}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione tipo" />
            </SelectTrigger>
            <SelectContent>
              {suggestionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resumo da Sugestão */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Resumo da Sugestão
          </label>
          {summaryInputMode ? (
            <div className="space-y-2">
              <textarea
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleSummaryInputSave();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSummaryInput(suggestionSummary);
                    setSummaryInputMode(false);
                  }
                }}
                className={cn(
                  "w-full p-2 text-sm border rounded-md min-h-[80px] resize-vertical transition-all duration-300 focus:outline-none focus:ring-2",
                  summaryJustEdited 
                    ? "border-green-300 dark:border-green-700 focus:ring-green-200 dark:focus:ring-green-800 bg-white dark:bg-gray-800" 
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-800",
                  "text-gray-900 dark:text-gray-100"
                )}
                placeholder="Digite o resumo da sugestão... (Ctrl+Enter para salvar)"
                autoFocus
                disabled={!hasSuggestion}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSummaryInputSave} 
                  className={cn(
                    "text-xs transition-all duration-300",
                    summaryJustEdited 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {summaryJustEdited ? '✓ Salvo' : 'OK'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setSummaryInput(suggestionSummary);
                  setSummaryInputMode(false);
                }} className="text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <div
                className={cn(
                  "min-h-[80px] p-3 text-sm font-medium transition-all duration-500 border rounded-md cursor-pointer hover:shadow-sm",
                  summaryJustEdited 
                    ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 shadow-md ring-2 ring-green-200 dark:ring-green-800" 
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                onClick={() => {
                  if (hasSuggestion) {
                    setSummaryInputMode(true);
                    setSummaryInput(suggestionSummary || '');
                  }
                }}
              >
                {suggestionSummary || (hasSuggestion ? "Clique para adicionar resumo da sugestão..." : "Sem sugestão")}
              </div>
              {summaryJustEdited && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">
                  ✓
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSummaryInputMode(true);
                  setSummaryInput(suggestionSummary || '');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                disabled={!hasSuggestion}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Editar
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
          {hasSuggestion ? (
            <>
              <Badge variant="outline" className="text-sm border font-medium bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300">
                <Lightbulb className="h-3 w-3 mr-1" />
                {suggestionTypes.find(t => t.value === suggestionType)?.label || suggestionType}
              </Badge>
              {suggestionSummary && (
                <Badge variant="secondary" className="text-sm">
                  {suggestionSummary}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="secondary" className="text-sm italic text-gray-500">
              Sem Sugestão
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

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
  'Sem problemas',
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
  return sectorColors[sector.trim()] || 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 shadow-sm';
};

// Componente para badges de palavra-chave com design elegante
const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  const colorClass = getSectorColor(sector);
  
  return (
    <Badge variant="outline" className={cn(
      "text-sm px-3 py-1.5 rounded-full border font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default",
      colorClass
    )}>
      <span className="mr-1">🏷️</span>
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

// Componente de estatísticas resumidas modernizado
const StatsCard = ({ icon: Icon, title, value, change, color, gradient }: {
  icon: any;
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  color: string;
  gradient: string;
}) => {
  // Determina se o valor é numérico ou string (como média com decimal)
  const isNumeric = typeof value === 'number'
  const isDecimal = typeof value === 'string' && value.includes('.')
  
  // Usa animação de slide up baseada no tipo de valor
  const numericResult = isNumeric 
    ? useSlideUpCounter(value as number, { duration: 400, delay: 0 })
    : null
    
  const animatedValue = isNumeric 
    ? numericResult?.value
    : value
      
  const isAnimating = isNumeric 
    ? numericResult?.isAnimating
    : false

  return (
    <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
      <div className={cn("absolute inset-0 opacity-5", gradient)} />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-xl shadow-lg", gradient)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {change && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
              change.positive 
                ? "bg-green-100 text-green-700 border border-green-200" 
                : "bg-red-100 text-red-700 border border-red-200"
            )}>
              {change.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span>{Math.abs(change.value)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</p>
          <div className="relative overflow-hidden h-12 flex items-end number-container">
            <p className={cn(
              "text-3xl font-bold text-gray-900 leading-none tabular-nums",
              isAnimating ? "number-slide-enter" : ""
            )}>
              {String(animatedValue).split('').map((digit, index) => (
                <span 
                  key={`digit-${index}-${animatedValue}`} // Key estável baseado no valor
                  className={cn(
                    "number-digit",
                    isAnimating ? "animating" : ""
                  )}
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {digit}
                </span>
              ))}
            </p>
          </div>
        </div>
        
        <div className={cn("absolute bottom-0 left-0 right-0 h-1", gradient)} />
      </div>
    </Card>
  )
}

// Componente para Modal de Comentário Completo
const CommentModal = ({ 
  feedback, 
  onFeedbackUpdated, 
  onDeleteFeedback, 
  userData,
  allFeedbacks = [],
  currentIndex = 0,
  onNavigate
}: { 
  feedback: Feedback, 
  onFeedbackUpdated?: (updatedFeedback: Feedback) => void,
  onDeleteFeedback?: (feedback: Feedback) => void,
  userData?: any,
  allFeedbacks?: Feedback[],
  currentIndex?: number,
  onNavigate?: (index: number) => void
}) => {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedProblems, setEditedProblems] = useState<Array<{id: string, keyword: string, sector: string, problem: string, problem_detail?: string}>>([])  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [editedMetadata, setEditedMetadata] = useState({
    sentiment: '',
    rating: 0,
    language: '',
    source: '',
    apartamento: ''
  })
  // Estado unificado para edição de metadados e análise
  const [isEditingUnified, setIsEditingUnified] = useState(false)
  // Estados para edição de sugestões - agora como array igual aos problemas
  const [editedSuggestions, setEditedSuggestions] = useState<Array<{
    id: string, 
    has_suggestion: boolean, 
    suggestion_type: string, 
    suggestion_summary: string
  }>>([])
  
  // Estados para histórico de edições
  const [showEditHistory, setShowEditHistory] = useState(false)
  const [editHistory, setEditHistory] = useState<Array<{
    timestamp: Date;
    changes: any;
    user: string;
    action: string;
    oldData?: any;
    newData?: any;
  }>>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // 🚀 OTIMIZAÇÃO: Refs para timeout cleanup
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Usar o feedback correto baseado no currentIndex da lista allFeedbacks (que é filteredFeedbacks)
  const currentFeedback = allFeedbacks && allFeedbacks.length > 0 && currentIndex >= 0 && currentIndex < allFeedbacks.length 
    ? allFeedbacks[currentIndex] 
    : feedback
  
  // 🚀 OTIMIZADO: Stable ID generator para evitar re-renders desnecessários
  const generateStableId = useRef(0)
  const getStableId = useCallback(() => {
    return `stable-${generateStableId.current++}`
  }, [])

  // 🚀 OTIMIZADO: Memoizar problemas processados para evitar recálculo
  const processedProblems = useMemo(() => {
    if (currentFeedback.allProblems && currentFeedback.allProblems.length > 0) {
      return currentFeedback.allProblems.map((problem, index) => ({
        id: `problem-${currentFeedback.id}-${index}`, // ID estável baseado no feedback
        ...problem
      }))
    } else {
      // Converter formato antigo para novo
      const keywords = splitByDelimiter(currentFeedback.keyword)
      const sectors = splitByDelimiter(currentFeedback.sector)
      const problems = splitByDelimiter(currentFeedback.problem || '')
      
      const maxLength = Math.max(keywords.length, sectors.length, problems.length)
      const problemsArray = []
      
      for (let i = 0; i < maxLength; i++) {
        problemsArray.push({
          id: `problem-${currentFeedback.id}-${i}`, // ID estável
          keyword: keywords[i] || keywords[0] || 'Não identificado',
          sector: sectors[i] || sectors[0] || 'Não identificado', 
          problem: problems[i] || problems[0] || '',
          problem_detail: ''
        })
      }
      
      return problemsArray
    }
  }, [currentFeedback.allProblems, currentFeedback.keyword, currentFeedback.sector, currentFeedback.problem, currentFeedback.id])

  // 🚀 OTIMIZADO: useEffect com cleanup e dependências otimizadas
  useEffect(() => {
    setEditedProblems(processedProblems)
  }, [processedProblems])
  
  // 🚀 CLEANUP: Limpar timeouts no unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
        deleteTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Função para navegar entre feedbacks
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!onNavigate || !allFeedbacks.length) return
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(allFeedbacks.length - 1, currentIndex + 1)
    
    onNavigate(newIndex)
  }, [onNavigate, allFeedbacks.length, currentIndex])

  // 🚀 OTIMIZADO: Memoizar metadados para evitar re-renders
  const processedMetadata = useMemo(() => ({
    sentiment: currentFeedback.sentiment || '',
    rating: currentFeedback.rating || 0,
    language: currentFeedback.language || '',
    source: currentFeedback.source || '',
    apartamento: currentFeedback.apartamento || ''
  }), [currentFeedback.sentiment, currentFeedback.rating, currentFeedback.language, currentFeedback.source, currentFeedback.apartamento])

  // Inicializar metadados para edição
  useEffect(() => {
    setEditedMetadata(processedMetadata)
  }, [processedMetadata])

  // 🚀 OTIMIZADO: Memoizar sugestões para evitar re-renders
  const processedSuggestions = useMemo(() => [{
    id: `suggestion-${currentFeedback.id}-0`, // ID estável
    has_suggestion: currentFeedback.has_suggestion || false,
    suggestion_type: currentFeedback.suggestion_type || '',
    suggestion_summary: currentFeedback.suggestion_summary || ''
  }], [currentFeedback.id, currentFeedback.has_suggestion, currentFeedback.suggestion_type, currentFeedback.suggestion_summary])

  // Inicializar sugestões para edição
  useEffect(() => {
    setEditedSuggestions(processedSuggestions)
  }, [processedSuggestions])

  // 🚀 OTIMIZADO: useCallback para handlers estáveis
  const resetEditingStates = useCallback(() => {
    setIsEditing(false)
    setIsEditingMetadata(false)
  }, [])

  // Atualizar feedback quando o índice mudar
  useEffect(() => {
    if (allFeedbacks.length > 0 && allFeedbacks[currentIndex]) {
      resetEditingStates()
    }
  }, [currentIndex, allFeedbacks.length, resetEditingStates])
  
  const copyComment = useCallback(() => {
    navigator.clipboard.writeText(currentFeedback.comment)
    toast({
      title: "Comentário Copiado",
      description: "O comentário foi copiado para a área de transferência.",
    })
  }, [currentFeedback.comment, toast])

  const formatDate = useCallback((dateString: string) => {
    return formatDateBR(dateString);
  }, [])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setIsEditingMetadata(false)
    setIsEditingUnified(false)
    // Resetar para os valores originais
    if (feedback.allProblems && feedback.allProblems.length > 0) {
      setEditedProblems(feedback.allProblems.map((problem, index) => ({
        id: `problem-${feedback.id}-${index}`, // ID estável baseado no feedback
        ...problem
      })))
    }
  }, [feedback.allProblems])

  const handleUpdateProblem = useCallback((id: string, updated: {keyword: string, sector: string, problem: string, problem_detail?: string}) => {
    const newProblems = editedProblems.map(p => 
      p.id === id ? { ...p, ...updated } : p
    )
    setEditedProblems(newProblems)
  }, [editedProblems])

  const handleRemoveProblem = useCallback((id: string) => {
    if (editedProblems.length > 1) {
      const newProblems = editedProblems.filter(p => p.id !== id)
      setEditedProblems(newProblems)
    }
  }, [editedProblems])

  const handleAddProblem = useCallback(() => {
    setEditedProblems([
      ...editedProblems,
      { 
        id: `problem-${currentFeedback.id}-${editedProblems.length}`, // ID estável
        keyword: 'Insira palavra-chave', 
        sector: 'Insira departamento', 
        problem: 'VAZIO',
        problem_detail: ''
      }
    ])
  }, [editedProblems, currentFeedback.id])

  // Funções para gerenciar sugestões (similar aos problemas)
  const handleUpdateSuggestion = useCallback((id: string, updated: {has_suggestion: boolean, suggestion_type: string, suggestion_summary: string}) => {
    const newSuggestions = editedSuggestions.map(s => 
      s.id === id ? { ...s, ...updated } : s
    )
    setEditedSuggestions(newSuggestions)
  }, [editedSuggestions])

  const handleRemoveSuggestion = useCallback((id: string) => {
    if (editedSuggestions.length > 1) {
      const newSuggestions = editedSuggestions.filter(s => s.id !== id)
      setEditedSuggestions(newSuggestions)
    }
  }, [editedSuggestions])

  const handleAddSuggestion = useCallback(() => {
    // Limitar a no máximo 3 sugestões por comentário
    if (editedSuggestions.length >= 3) {
      toast({
        title: "Limite atingido",
        description: "Máximo de 3 sugestões por comentário.",
        variant: "destructive"
      });
      return;
    }
    
    setEditedSuggestions([
      ...editedSuggestions,
      { 
        id: `suggestion-${currentFeedback.id}-${editedSuggestions.length}`, // ID estável
        has_suggestion: true,
        suggestion_type: 'only_suggestion',
        suggestion_summary: ''

      }
    ])
  }, [editedSuggestions, toast, currentFeedback.id])

  // Função para buscar histórico de edições
  const handleShowEditHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      // Buscar histórico de edições recentes do Firebase
      const { getRecentEdits } = await import('@/lib/firestore-service');
      const allEdits = await getRecentEdits(30, userData?.hotelId); // 30 dias para ter mais contexto
      
      // Filtrar edições específicas deste feedback
      const feedbackEdits = allEdits.filter((edit: any) => 
        edit.feedbackId === currentFeedback.id || 
        edit.documentId === currentFeedback.id ||
        (edit.changes && edit.changes.id === currentFeedback.id)
      );
      
      // Formatar histórico para exibição
      const formattedHistory = feedbackEdits.map((edit: any) => ({
        timestamp: edit.modifiedAt ? new Date(edit.modifiedAt) : new Date(),
        changes: edit.changes || {},
        user: edit.editedBy || edit.modifiedBy || 'Usuário desconhecido',
        action: edit.action || 'Edição'
      }));
      
      // Ordenar por data mais recente primeiro
      formattedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setEditHistory(formattedHistory);
      setShowEditHistory(true);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de edições.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [currentFeedback.id, userData?.hotelId, toast])

  const handleStartEditMetadata = useCallback(() => {
    setIsEditingMetadata(true)
  }, [])

  const handleCancelEditMetadata = useCallback(() => {
    setIsEditingMetadata(false)
    // Resetar para os valores originais
    setEditedMetadata({
      sentiment: currentFeedback.sentiment || '',
      rating: currentFeedback.rating || 0,
      language: currentFeedback.language || '',
      source: currentFeedback.source || '',
      apartamento: currentFeedback.apartamento || ''
    })
  }, [currentFeedback])

  // Funções unificadas para edição de metadados e análise
  const handleStartEditUnified = useCallback(() => {
    setIsEditingUnified(true)
    setIsEditing(true)
    setIsEditingMetadata(true)
    
    // Inicializar metadados editados com valores originais
    setEditedMetadata({
      sentiment: currentFeedback.sentiment || '',
      rating: currentFeedback.rating || 0,
      language: currentFeedback.language || '',
      source: currentFeedback.source || '',
      apartamento: currentFeedback.apartamento || ''
    })
    
    // Inicializar sugestões editadas com valores originais - agora como array
    setEditedSuggestions([{
      id: `suggestion-${currentFeedback.id}-0`, // ID estável
      has_suggestion: currentFeedback.has_suggestion || false,
      suggestion_type: currentFeedback.suggestion_type || 'none',
      suggestion_summary: currentFeedback.suggestion_summary || ''
    }])
  }, [currentFeedback])

  const handleCancelEditUnified = useCallback(() => {
    setIsEditingUnified(false)
    setIsEditing(false)
    setIsEditingMetadata(false)
    
    // Resetar metadados para os valores originais
    setEditedMetadata({
      sentiment: currentFeedback.sentiment || '',
      rating: currentFeedback.rating || 0,
      language: currentFeedback.language || '',
      source: currentFeedback.source || '',
      apartamento: currentFeedback.apartamento || ''
    })
    
    // Resetar problemas para os valores originais
    if (currentFeedback.allProblems && currentFeedback.allProblems.length > 0) {
      setEditedProblems(currentFeedback.allProblems.map((problem, index) => ({
        id: `problem-${currentFeedback.id}-${index}`, // ID estável
        ...problem
      })))
    }
    
    // Resetar sugestões para os valores originais
    setEditedSuggestions([{
      id: `suggestion-${currentFeedback.id}-0`, // ID estável
      has_suggestion: currentFeedback.has_suggestion || false,
      suggestion_type: currentFeedback.suggestion_type || '',
      suggestion_summary: currentFeedback.suggestion_summary || ''
    }])
  }, [currentFeedback])

  const handleSaveUnified = useCallback(async () => {
    // Evitar múltiplas execuções simultâneas
    if (isSaving) {
      console.log('⚠️ Salvamento já em andamento, ignorando nova chamada');
      return;
    }
    
    console.log('🚀 Iniciando salvamento unificado para feedback:', currentFeedback.id);
    setIsSaving(true)
    
    try {
      // Converter problemas editados para string
      const keywords = editedProblems.map(p => p.keyword).join(';')
      const sectors = editedProblems.map(p => p.sector).join(';')
      const problems = editedProblems.map(p => p.problem).join(';')
      
      console.log('🔄 Salvando dados unificados:')
      console.log('Keywords:', keywords)
      console.log('Sectors:', sectors)
      console.log('Problems:', problems)
      
      // Criar feedback atualizado com metadados, análise e sugestões
      const updatedFeedback = {
        ...currentFeedback,
        keyword: keywords,
        sector: sectors,
        problem: problems,
        allProblems: editedProblems,
        sentiment: editedMetadata.sentiment,
        rating: editedMetadata.rating,
        language: editedMetadata.language,
        source: editedMetadata.source,
        apartamento: editedMetadata.apartamento,
        has_suggestion: editedSuggestions[0]?.has_suggestion || false,
        suggestion_type: editedSuggestions[0]?.suggestion_type as "only" | "mixed" | "none" | undefined,
        suggestion_summary: editedSuggestions[0]?.suggestion_summary || '',
        allSuggestions: editedSuggestions // Adicionar array completo
      }
      
      // Atualizar localStorage se for do hotel atual
      const storedFeedbacks = localStorage.getItem('analysis-feedbacks')
      if (storedFeedbacks) {
        const storedHotelId = localStorage.getItem('current-hotel-id')
        if (storedHotelId === userData?.hotelId) {
          const feedbacks = JSON.parse(storedFeedbacks)
          const updatedFeedbacks = feedbacks.map((f: Feedback) => 
            f.id === currentFeedback.id ? updatedFeedback : f
          )
          localStorage.setItem('analysis-feedbacks', JSON.stringify(updatedFeedbacks))
        }
      }
      
      // Salvar no Firebase
      console.log('💾 Salvando no Firebase...');
      await updateFeedbackInFirestore(currentFeedback.id, updatedFeedback)
      
      // Salvar no histórico de edições (unificado - análise e metadados)
      console.log('📝 Salvando no histórico de edições...');
      await saveRecentEdit({
        feedbackId: currentFeedback.id,
        hotelId: currentFeedback.hotelId || currentFeedback.id.split('_')[0] || 'unknown',
        hotelName: userData?.hotelName || currentFeedback.hotel || 'Hotel não identificado',
        comment: currentFeedback.comment,
        rating: editedMetadata.rating,
        date: currentFeedback.date,
        source: editedMetadata.source || 'Sistema',
        oldClassification: {
          keyword: currentFeedback.keyword || '',
          sector: currentFeedback.sector || '',
          problem: currentFeedback.problem || ''
        },
        newClassification: {
          keyword: keywords,
          sector: sectors,
          problem: problems
        },
        oldMetadata: {
          rating: currentFeedback.rating,
          sentiment: currentFeedback.sentiment,
          source: currentFeedback.source,
          language: currentFeedback.language,
          apartamento: currentFeedback.apartamento || ''
        },
        newMetadata: {
          rating: editedMetadata.rating,
          sentiment: editedMetadata.sentiment,
          source: editedMetadata.source,
          language: editedMetadata.language,
          apartamento: editedMetadata.apartamento
        },
        modifiedAt: new Date().toISOString(),
        modifiedBy: userData?.email || 'Colaborador',
        page: 'analysis-unified'
      })
      
      // Resetar estados de edição
      setIsEditingUnified(false)
      setIsEditing(false)
      setIsEditingMetadata(false)
      
      // Chamar callback para atualizar a lista principal
      onFeedbackUpdated?.(updatedFeedback)
      
      toast({
        title: "Dados Atualizados",
        description: "Metadados e análise foram salvos com sucesso.",
        duration: 2000,
      })
      
      // Fechar modal após um pequeno delay para mostrar o toast
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        saveTimeoutRef.current = null;
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentFeedback, editedMetadata, editedProblems, editedSuggestions, isSaving, onFeedbackUpdated, toast])

  const handleSaveMetadata = useCallback(async () => {
    setIsSaving(true)
    
    try {
      const updatedFeedback = {
        ...currentFeedback,
        sentiment: editedMetadata.sentiment,
        rating: editedMetadata.rating,
        language: editedMetadata.language,
        source: editedMetadata.source,
        apartamento: editedMetadata.apartamento
      }

      await updateFeedbackInFirestore(currentFeedback.id, updatedFeedback)
      
      if (onFeedbackUpdated) {
        onFeedbackUpdated(updatedFeedback)
      }

      if (userData?.email) {
        await saveRecentEdit({
          userEmail: userData.email,
          feedbackId: currentFeedback.id || '',
          editType: 'metadata',
          changes: editedMetadata,
          timestamp: new Date()
        })
      }

      setIsEditingMetadata(false)
      
      toast({
        title: "Metadados Atualizados",
        description: "Os metadados do feedback foram salvos com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao salvar metadados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar os metadados. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentFeedback, editedMetadata, isSaving, onFeedbackUpdated, toast])

  const handleSaveSuggestions = useCallback(async () => {
    setIsSaving(true)
    
    try {
      const updatedFeedback = {
        ...currentFeedback,
        has_suggestion: editedSuggestions[0]?.has_suggestion || false,
        suggestion_type: editedSuggestions[0]?.suggestion_type as 'only' | 'mixed' | 'none' | undefined,
        suggestion_summary: editedSuggestions[0]?.suggestion_summary || '',
        allSuggestions: editedSuggestions
      }

      // Atualizar localStorage se for do hotel atual
      const storedFeedbacks = localStorage.getItem('analysis-feedbacks')
      if (storedFeedbacks) {
        const storedHotelId = localStorage.getItem('current-hotel-id')
        if (storedHotelId === userData?.hotelId) {
          const feedbacks = JSON.parse(storedFeedbacks)
          const updatedFeedbacks = feedbacks.map((f: Feedback) => 
            f.id === currentFeedback.id ? updatedFeedback : f
          )
          localStorage.setItem('analysis-feedbacks', JSON.stringify(updatedFeedbacks))
        }
      }

      // Salvar no Firebase
      await updateFeedbackInFirestore(currentFeedback.id, updatedFeedback)
      
      // Salvar no histórico de edições
      await saveRecentEdit({
        feedbackId: currentFeedback.id,
        hotelId: currentFeedback.hotelId || currentFeedback.id.split('_')[0] || 'unknown',
        hotelName: userData?.hotelName || currentFeedback.hotel || 'Hotel não identificado',
        comment: currentFeedback.comment,
        rating: currentFeedback.rating,
        date: currentFeedback.date,
        source: currentFeedback.source || 'Sistema',
        oldSuggestions: {
          has_suggestion: currentFeedback.has_suggestion || false,
          suggestion_type: currentFeedback.suggestion_type || '',
          suggestion_summary: currentFeedback.suggestion_summary || ''
        },
        newSuggestions: {
          has_suggestion: editedSuggestions[0]?.has_suggestion || false,
          suggestion_type: editedSuggestions[0]?.suggestion_type || '',
          suggestion_summary: editedSuggestions[0]?.suggestion_summary || ''
        },
        modifiedAt: new Date().toISOString(),
        modifiedBy: userData?.email || 'Colaborador',
        page: 'analysis-suggestions'
      })
      
      // Chamar callback para atualizar a lista principal
      onFeedbackUpdated?.(updatedFeedback)
      
      toast({
        title: "Sugestões Atualizadas",
        description: "As sugestões foram salvas com sucesso.",
        duration: 2000,
      })
    } catch (error) {
      console.error('Erro ao salvar sugestões:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as sugestões. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentFeedback, editedSuggestions, isSaving, onFeedbackUpdated, toast])

  const handleSaveChanges = useCallback(async () => {
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
        // Verificar se os dados são do hotel atual antes de atualizar
        const storedHotelId = localStorage.getItem('current-hotel-id')
        if (storedHotelId === userData?.hotelId) {
          const feedbacks = JSON.parse(storedFeedbacks)
          const updatedFeedbacks = feedbacks.map((f: Feedback) => 
            f.id === feedback.id ? updatedFeedback : f
          )
          localStorage.setItem('analysis-feedbacks', JSON.stringify(updatedFeedbacks))
        } else {
          console.log('Dados do localStorage são de outro hotel, não atualizando')
        }
      }
      
      // Salvar no Firebase
      await updateFeedbackInFirestore(feedback.id, updatedFeedback)
      
      // Salvar no histórico de edições
      await saveRecentEdit({
        feedbackId: feedback.id,
        hotelId: feedback.hotelId || feedback.id.split('_')[0] || 'unknown',
        hotelName: userData?.hotelName || feedback.hotel || 'Hotel não identificado',
        comment: currentFeedback.comment,
        rating: currentFeedback.rating,
        date: currentFeedback.date,
        source: currentFeedback.source || 'Sistema',
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
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        saveTimeoutRef.current = null;
      }, 1000);
      
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
  }, [currentFeedback, editedProblems, editedMetadata, editedSuggestions, isSaving, onFeedbackUpdated, toast])

  const handleDeleteFeedback = useCallback(() => {
    onDeleteFeedback?.(feedback)
    setIsOpen(false)
  }, [feedback, onDeleteFeedback])

  // Função para buscar histórico de edições no CommentModal
  const handleShowEditHistoryModal = async () => {
    setLoadingHistory(true);
    // Fechar o modal principal primeiro
    setIsOpen(false);
    
    try {
      // Buscar histórico de edições recentes do Firebase
      const { getRecentEdits } = await import('@/lib/firestore-service');
      const allEdits = await getRecentEdits(30, userData?.hotelId); // 30 dias para ter mais contexto
      
      // Filtrar edições específicas deste feedback
      const feedbackEdits = allEdits.filter((edit: any) => 
        edit.feedbackId === currentFeedback.id || 
        edit.documentId === currentFeedback.id ||
        (edit.changes && edit.changes.id === currentFeedback.id)
      );
      
      // Formatar histórico para exibição com mais detalhes
      const formattedHistory = feedbackEdits.map((edit: any) => {
        console.log('Edit data:', edit); // Debug
        
        return {
          timestamp: edit.modifiedAt ? new Date(edit.modifiedAt) : new Date(),
          changes: edit.changes || edit.newClassification || edit.newMetadata || {},
          user: edit.editedBy || edit.modifiedBy || 'Usuário desconhecido',
          action: edit.action || edit.editType || 'Edição',
          oldData: edit.oldClassification || edit.oldMetadata || {},
          newData: edit.newClassification || edit.newMetadata || {}
        };
      });
      
      // Ordenar por data mais recente primeiro
      formattedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setEditHistory(formattedHistory);
      setShowEditHistory(true);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de edições.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  }

  // Função para voltar do histórico para o modal de detalhes
  const handleBackToDetails = () => {
    setShowEditHistory(false);
    setIsOpen(true);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-110"
          title="Ver detalhes do comentário"
          onClick={() => {
            setIsOpen(true)
            // Encontrar o índice correto do feedback na lista filtrada original
            const correctIndex = allFeedbacks.findIndex(f => f.id === feedback.id)
            if (correctIndex !== -1 && onNavigate) {
              onNavigate(correctIndex)
            }
          }}
        >
          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-gray-900 dark:to-blue-950/30 border-0 shadow-2xl backdrop-blur-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do Comentário</DialogTitle>
        </DialogHeader>
        
        {/* Header moderno e elegante - Altura reduzida */}
        <div className="relative sticky top-0 z-10 bg-gradient-to-r from-blue-50 via-slate-50 to-gray-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 border-b border-gray-200 dark:border-gray-700">
          {/* Botão fechar elegante */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all duration-300 z-10 group border border-gray-300 dark:border-white/20"
            title="Fechar"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-white/80 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
          </Button>

          <div className="p-4 pr-16">
            {/* Cabeçalho principal com design moderno */}
            <div className="flex items-start gap-4">
              {/* Ícone principal com gradiente */}
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                {/* Título e subtítulo */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Análise de Feedback
                    </h2>
                    
                    {/* Botões de navegação */}
                    {allFeedbacks && allFeedbacks.length > 1 && onNavigate && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigate('prev')}
                          disabled={currentIndex === 0}
                          className="h-8 px-3 text-xs bg-white/80 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 border-gray-300 dark:border-white/20"
                        >
                          ← Anterior
                        </Button>
                        
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-2">
                          {currentIndex + 1} de {allFeedbacks.length}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigate('next')}
                          disabled={currentIndex === allFeedbacks.length - 1}
                          className="h-8 px-3 text-xs bg-white/80 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 border-gray-300 dark:border-white/20"
                        >
                          Próximo →
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-blue-100/80 text-sm">
                    Detalhamento completo da avaliação do cliente
                  </p>
                </div>
                
                {/* Métricas principais */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Rating com estrelas */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/20">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-4 w-4 transition-all duration-200 ${
                            star <= currentFeedback.rating 
                              ? 'text-yellow-500 fill-yellow-500' 
                              : 'text-gray-300 dark:text-white/30'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {currentFeedback.rating}/5
                    </span>
                  </div>
                  
                  {/* Sentimento */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/20">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      currentFeedback.sentiment === 'positive' ? 'bg-green-500' :
                currentFeedback.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentFeedback.sentiment === 'positive' ? 'Positivo' :
                currentFeedback.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                    </span>
                  </div>
                  
                  {/* Data */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/20">
                    <Calendar className="h-4 w-4 text-gray-600 dark:text-blue-200" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(currentFeedback.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Barra de ações */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                {isEditing && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-100 rounded-lg border border-blue-200 dark:border-blue-400/30">
                    <Edit3 className="h-4 w-4" />
                    <span className="text-sm font-medium">Modo Edição Ativo</span>
                  </div>
                )}
              </div>

              {/* Botões de ação modernos */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteFeedback}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-700 hover:text-red-800 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:border-red-400/30 dark:hover:border-red-400/50 dark:text-red-100 dark:hover:text-white transition-all duration-300"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowEditHistoryModal}
                      disabled={loadingHistory}
                      className="flex items-center gap-1.5 text-xs bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-300 text-orange-700 hover:text-orange-800 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 dark:border-orange-400/30 dark:hover:border-orange-400/50 dark:text-orange-100 dark:hover:text-white transition-all duration-300"
                    >
                      {loadingHistory ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <History className="h-3.5 w-3.5" />
                          Histórico
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEditUnified}
                      className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 hover:border-purple-300 text-blue-700 hover:text-purple-800 dark:bg-gradient-to-r dark:from-blue-500/10 dark:to-purple-500/10 dark:hover:from-blue-500/20 dark:hover:to-purple-500/20 dark:border-blue-400/30 dark:hover:border-purple-400/50 dark:text-blue-100 dark:hover:text-purple-100 transition-all duration-300"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Editar Metadados/Análise
                    </Button>
                  </>
                ) : isEditingUnified ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditUnified}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 dark:bg-gray-500/10 dark:hover:bg-gray-500/20 dark:border-gray-400/30 dark:hover:border-gray-400/50 dark:text-gray-100 dark:hover:text-white transition-all duration-300"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveUnified}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Salvar Tudo
                        </>
                      )}
                    </Button>
                  </div>
                ) : isEditingMetadata ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditMetadata}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 dark:bg-gray-500/10 dark:hover:bg-gray-500/20 dark:border-gray-400/30 dark:hover:border-gray-400/50 dark:text-gray-100 dark:hover:text-white transition-all duration-300"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveMetadata}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Salvar Metadados
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving || isDeleting}
                      className="flex items-center gap-1.5 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-800 dark:bg-gray-500/10 dark:hover:bg-gray-500/20 dark:border-gray-400/30 dark:hover:border-gray-400/50 dark:text-gray-100 dark:hover:text-white transition-all duration-300"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving || isDeleting}
                      className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo responsivo */}
        <div className="p-4 md:p-6 space-y-4">
            {/* Informações do Feedback - Design compacto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700/30 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(currentFeedback.date)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Star className="h-4 w-4 text-white fill-current" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avaliação</p>
                {(isEditingMetadata || isEditingUnified) ? (
                  <Select value={editedMetadata.rating?.toString()} onValueChange={(value) => setEditedMetadata(prev => ({ ...prev, rating: parseInt(value) }))}>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-500">{ratingIcons[rating]}</span>
                            <span>{rating}/5</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-base text-yellow-500">{ratingIcons[currentFeedback.rating] || "N/A"}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentFeedback.rating}/5</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sentimento</p>
                {(isEditingMetadata || isEditingUnified) ? (
                  <Select value={editedMetadata.sentiment} onValueChange={(value) => setEditedMetadata(prev => ({ ...prev, sentiment: value }))}>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positivo</SelectItem>
                      <SelectItem value="neutral">Neutro</SelectItem>
                      <SelectItem value="negative">Negativo</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <SentimentBadge sentiment={currentFeedback.sentiment} />
                )}
              </div>
            </div>
          </div>

        {/* Comentário Principal - Design melhorado */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comentário do Cliente</h3>
                <Badge variant="outline" className="text-xs">
                  {currentFeedback.comment.length} caracteres
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
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {currentFeedback.comment}
              </p>
            </div>
          </div>

          {/* Análise IA - Design melhorado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Análise da Inteligência Artificial</h4>
                <Badge variant="secondary" className="text-xs">
                  IA
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
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                      <Edit3 className="h-3 w-3" />
                      <span className="text-xs font-medium">Editando Classificação</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Corrija a análise da IA se necessário. As alterações serão salvas e refletidas nos dashboards.
                    </p>
                  </div>

                  {editedProblems.map((problem, index) => (
                    <EnhancedProblemEditor
                      key={problem.id}
                      problem={problem}
                      onUpdate={(updated) => handleUpdateProblem(problem.id, updated)}
                      onRemove={() => handleRemoveProblem(problem.id)}
                      canRemove={editedProblems.length > 1}
                    />
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddProblem}
                    className="w-full border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Problema ({editedProblems.length})
                  </Button>
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
                            {problemAnalysis.problem_detail && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2" title={problemAnalysis.problem_detail}>
                                {problemAnalysis.problem_detail}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              // Exibição tradicional para problema único
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Departamento</h4>
                    <div className="flex flex-wrap gap-1">
                      {splitByDelimiter(feedback.sector).map((sector, index) => (
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
                      {splitByDelimiter(feedback.keyword).map((kw, index) => {
                        const sectors = splitByDelimiter(feedback.sector);
                        const sector = sectors[index]?.trim() || sectors[0]?.trim() || '';
                        return <KeywordBadge key={index} keyword={kw.trim()} sector={sector} />;
                      })}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Problema</h4>
                    <Badge variant="secondary" className="text-sm">
                      {feedback.problem === 'VAZIO' || feedback.problem === 'Sem problemas' ? (
                        <span className="italic text-green-600 dark:text-green-400">Sem problemas</span>
                      ) : (
                        feedback.problem || 'Não especificado'
                      )}
                    </Badge>
                    {feedback.problem_detail && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2" title={feedback.problem_detail}>
                        {feedback.problem_detail}
                      </p>
                    )}

                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Seção de Sugestões - Design melhorado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Sugestões da IA</h4>
                <Badge variant="secondary" className="text-xs">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  IA
                </Badge>
              </div>
            </div>
            
            {(isEditingMetadata || isEditingUnified) ? (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                        <Edit3 className="h-4 w-4" />
                        <span className="text-sm font-medium">Editando Sugestões</span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                        Corrija a análise de sugestões da IA se necessário. As alterações serão salvas e refletidas nos dashboards.
                      </p>
                      {editedSuggestions.map((suggestion, index) => (
                        <SuggestionEditor
                          key={suggestion.id}
                          suggestion={suggestion}
                          onUpdate={(updated) => handleUpdateSuggestion(suggestion.id, updated)}
                          onRemove={() => handleRemoveSuggestion(suggestion.id)}
                          canRemove={editedSuggestions.length > 1}
                        />
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSuggestion}
                        disabled={editedSuggestions.length >= 3}
                        className={cn(
                          "w-full border-dashed border-2 transition-all duration-200",
                          editedSuggestions.length >= 3 
                            ? "border-gray-200 text-gray-400 cursor-not-allowed" 
                            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        )}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Sugestão ({editedSuggestions.length}/3)
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveSuggestions}
                          disabled={isSaving}
                          className="flex-1"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {isSaving ? 'Salvando...' : 'Salvar Sugestões'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditedSuggestions([{
                              id: `suggestion-${feedback.id}-0`, // ID estável
                              has_suggestion: feedback.has_suggestion || false,
                              suggestion_type: feedback.suggestion_type || 'none',
                              suggestion_summary: feedback.suggestion_summary || ''
                            }])
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    feedback.has_suggestion ? (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo de Sugestão</h5>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-sm font-medium",
                              feedback.suggestion_type === 'only' || feedback.suggestion_type === 'only_suggestion'
                                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm"
                                    : feedback.suggestion_type === 'mixed'
                                ? "bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 shadow-sm"
                                : feedback.suggestion_type === 'with_criticism'
                                ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm"
                                : feedback.suggestion_type === 'with_praise'
                                ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 shadow-sm"
                                : "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 shadow-sm"
                            )}
                          >
                            <Lightbulb className="w-3 h-3 mr-1" />
                            {feedback.suggestion_type === 'only' || feedback.suggestion_type === 'only_suggestion'
                              ? 'Apenas Sugestão'
                              : feedback.suggestion_type === 'mixed'
                              ? 'Mista (Sugestão + Problema)'
                              : feedback.suggestion_type === 'with_criticism'
                              ? 'Sugestão com Crítica'
                              : feedback.suggestion_type === 'with_praise'
                              ? 'Sugestão com Elogio'
                              : 'Sem Sugestão'}
                          </Badge>
                          
                          {feedback.suggestion_summary && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resumo da Sugestão</h5>
                              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {feedback.suggestion_summary}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-sm font-medium italic">Nenhuma sugestão identificada pela IA</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
         

          {/* Informações Adicionais - Design melhorado */}
          {(currentFeedback.source || currentFeedback.language || currentFeedback.apartamento || (isEditingMetadata || isEditingUnified)) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
              
              {/* Campo Fonte */}
              {(currentFeedback.source || (isEditingMetadata || isEditingUnified)) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fonte</p>
                  {(isEditingMetadata || isEditingUnified) ? (
                    <Select 
                      value={editedMetadata.source && editedMetadata.source.trim() !== '' ? editedMetadata.source : undefined} 
                      onValueChange={(value) => setEditedMetadata(prev => ({ ...prev, source: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione a fonte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Booking">Booking</SelectItem>
                        <SelectItem value="Airbnb">Airbnb</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="TripAdvisor">TripAdvisor</SelectItem>
                        <SelectItem value="Expedia">Expedia</SelectItem>
                        <SelectItem value="Hotels.com">Hotels.com</SelectItem>
                        <SelectItem value="TrustYou Survey">TrustYou Survey</SelectItem>
                        <SelectItem value="Agoda">Agoda</SelectItem>
                        <SelectItem value="Kayak">Kayak</SelectItem>
                        <SelectItem value="Priceline">Priceline</SelectItem>
                        <SelectItem value="Trivago">Trivago</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{currentFeedback.source || 'Não informado'}</p>
                  )}
                </div>
              )}

              {/* Campo Idioma */}
              {(currentFeedback.language || (isEditingMetadata || isEditingUnified)) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Idioma</p>
                  {(isEditingMetadata || isEditingUnified) ? (
                    <Select 
                      value={editedMetadata.language && editedMetadata.language.trim() !== '' ? editedMetadata.language : undefined} 
                      onValueChange={(value) => setEditedMetadata(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione o idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">Inglês</SelectItem>
                        <SelectItem value="es">Espanhol</SelectItem>
                        <SelectItem value="fr">Francês</SelectItem>
                        <SelectItem value="de">Alemão</SelectItem>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{currentFeedback.language || 'Não informado'}</p>
                  )}
                </div>
              )}

              {/* Campo Apartamento - SEMPRE aparece no modo de edição */}
              {(isEditingMetadata || isEditingUnified) ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Apartamento</p>
                  <Input 
                    value={editedMetadata.apartamento || ''} 
                    onChange={(e) => setEditedMetadata(prev => ({ ...prev, apartamento: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="Número do apartamento"
                  />
                </div>
              ) : currentFeedback.apartamento ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Apartamento</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{currentFeedback.apartamento}</p>
                </div>
              ) : null}

            </div>
          )}
        </div>
     
      </DialogContent>
      
      {/* Modal de Histórico dentro do CommentModal */}
      {showEditHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" style={{zIndex: 1000000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[85vh] transform animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-700 flex flex-col">
            
            {/* Header compacto */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Histórico de Edições
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Alterações realizadas neste feedback
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToDetails}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                  title="Voltar para detalhes"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Voltar</span>
                </Button>
              </div>
            </div>
            
            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-4">
              {editHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma edição encontrada
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Este feedback ainda não foi editado.
                  </p>
                </div>
              ) : (
                <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                  <div className="p-8 space-y-8">
                    {editHistory.map((edit, index) => (
                      <div key={index} className="group">
                        {/* Timeline connector */}
                        <div className="flex">
                          <div className="flex flex-col items-center mr-6">
                            <div className="w-4 h-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full border-4 border-white dark:border-gray-900 shadow-lg"></div>
                            {index < editHistory.length - 1 && (
                              <div className="w-0.5 h-16 bg-gradient-to-b from-orange-200 to-transparent dark:from-orange-800 mt-2"></div>
                            )}
                          </div>
                          
                          {/* Card da edição */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group-hover:scale-[1.02]">
                              
                              {/* Header do card */}
                              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-6 border-b border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                                        <Edit3 className="w-5 h-5 text-white" />
                                      </div>
                                      <div>
                                        <h5 className="text-lg font-bold text-gray-900 dark:text-white">
                                          {edit.action}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                              {edit.user}
                                            </span>
                                          </div>
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            •
                                          </span>
                                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                            {edit.timestamp.toLocaleString('pt-BR', {
                                              day: '2-digit',
                                              month: '2-digit', 
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                        #{editHistory.length - index}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Conteúdo das alterações */}
                              <div className="p-6">
                                {/* Mostrar oldData vs newData se disponível */}
                                {edit.oldData && edit.newData ? (
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                                      <h6 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Alterações Realizadas
                                      </h6>
                                    </div>
                                    
                                    <div className="grid gap-6">
                                      {Object.keys({...edit.oldData, ...edit.newData}).map((field) => {
                                        const oldValue = edit.oldData[field];
                                        const newValue = edit.newData[field];
                                        
                                        if (oldValue === newValue) return null;
                                        
                                        const fieldName = {
                                          'keyword': 'Palavras-chave',
                                          'sector': 'Departamentos', 
                                          'problem': 'Problemas',
                                          'sentiment': 'Sentimento',
                                          'rating': 'Avaliação',
                                          'language': 'Idioma',
                                          'source': 'Fonte',
                                          'apartamento': 'Apartamento'
                                        }[field] || field;
                                        
                                        return (
                                          <div key={field} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                                            <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 px-4 py-3">
                                              <h6 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                                {fieldName}
                                              </h6>
                                            </div>
                                            
                                            <div className="grid md:grid-cols-2 gap-0">
                                              {/* Valor anterior */}
                                              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-r border-gray-200 dark:border-gray-600">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                  <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                                    Valor Anterior
                                                  </span>
                                                </div>
                                                <div className="text-sm text-red-800 dark:text-red-300 font-medium bg-white/50 dark:bg-black/20 rounded-lg p-3 border border-red-200 dark:border-red-700">
                                                  {String(oldValue === 'VAZIO' ? 'Sem problemas' : oldValue || 'Sem problemas')}
                                                </div>
                                              </div>
                                              
                                              {/* Valor novo */}
                                              <div className="p-4 bg-green-50 dark:bg-green-900/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                  <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                                                    Valor Atual
                                                  </span>
                                                </div>
                                                <div className="text-sm text-green-800 dark:text-green-300 font-medium bg-white/50 dark:bg-black/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                                                  {String(newValue === 'VAZIO' ? 'Sem problemas' : newValue || 'Sem problemas')}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : edit.changes && Object.keys(edit.changes).length > 0 ? (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                                      <h6 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Detalhes da Modificação
                                      </h6>
                                    </div>
                                    
                                    <div className="grid gap-4">
                                      {Object.entries(edit.changes).map(([field, change]: [string, any]) => {
                                        if (field === 'id' || !change) return null;
                                        
                                        const fieldName = {
                                          'sector': 'Departamento',
                                          'keyword': 'Palavra-chave', 
                                          'problem': 'Problema',
                                          'sentiment': 'Sentimento',
                                          'rating': 'Avaliação',
                                          'comment': 'Comentário',
                                          'has_suggestion': 'Tem Sugestão',
                                          'suggestion_type': 'Tipo de Sugestão',
                                          'suggestion_summary': 'Resumo da Sugestão'
                                        }[field] || field;
                                        
                                        return (
                                          <div key={field} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                                            <h6 className="font-bold text-gray-800 dark:text-gray-200 mb-3">
                                              {fieldName}
                                            </h6>
                                            {change.from !== undefined && change.to !== undefined ? (
                                              <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">De:</span>
                                                  <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-lg text-sm">
                                                    {String(change.from)}
                                                  </div>
                                                </div>
                                                <div className="space-y-1">
                                                  <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Para:</span>
                                                  <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-3 rounded-lg text-sm">
                                                    {String(change.to)}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm">
                                                {typeof change === 'object' ? JSON.stringify(change, null, 2) : String(change)}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <Edit3 className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <h6 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                      Alteração Registrada
                                    </h6>
                                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                                      Detalhes específicos das alterações não estão disponíveis
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                        {edit.timestamp.toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer compacto */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <History className="w-4 h-4" />
                  <span>
                    {editHistory.length === 1 ? '1 edição' : `${editHistory.length} edições`}
                  </span>
                </div>
                <Button 
                  onClick={handleBackToDetails}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para Detalhes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [keywordFilter, setKeywordFilter] = useState("all")
  const [problemFilter, setProblemFilter] = useState("all")
  const [importFilter, setImportFilter] = useState("all")

  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [quickDateFilter, setQuickDateFilter] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
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
  
  // Estado para navegação entre feedbacks
  const [currentModalIndex, setCurrentModalIndex] = useState(0)

  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { toast } = useToast()

  // Limpar localStorage quando o hotel muda
  useEffect(() => {
    if (userData?.hotelId) {
      const storedHotelId = localStorage.getItem('current-hotel-id')
      if (storedHotelId && storedHotelId !== userData.hotelId) {
        console.log('Hotel mudou, limpando localStorage...')
        localStorage.removeItem('analysis-feedbacks')
        localStorage.removeItem('analysis-data')
        localStorage.setItem('current-hotel-id', userData.hotelId)
      } else if (!storedHotelId) {
        localStorage.setItem('current-hotel-id', userData.hotelId)
      }
    }
  }, [userData?.hotelId])

  // Carregar dados do Firebase na inicialização
  useEffect(() => {
    const loadFirebaseData = async () => {
      try {
        setLoading(true)
        const allAnalyses = await getAllAnalyses()
        setAnalyses(allAnalyses)
        
        // Combinar todos os feedbacks de todas as análises
        const allFeedbacks: Feedback[] = []
        allAnalyses.forEach((analysis: Analysis) => {
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
  const handleFeedbackUpdated = async (updatedFeedback: Feedback) => {
    // Marcar como editado no Firebase se não foi deletado
    if (!updatedFeedback.deleted) {
      try {
        await updateFeedbackInFirestore(updatedFeedback.id, { 
          ...updatedFeedback, 
          edited: true 
        })
        updatedFeedback.edited = true
      } catch (error) {
        console.error('Erro ao marcar feedback como editado:', error)
      }
    }
    
    setFeedbacks(prevFeedbacks => 
      prevFeedbacks.map(f => 
        f.id === updatedFeedback.id ? updatedFeedback : f
      )
    )
    
    // 🚀 OTIMIZADO: filteredFeedbacks agora é calculado automaticamente via useMemo
    // Se feedback foi deletado, iniciar animação antes de remover
    if (updatedFeedback.deleted) {
      // Adicionar à lista de feedbacks sendo excluídos
       setDeletingFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      
      // Mostrar indicador de exclusão
      setShowDeletedIndicator(true)
      
      // 🚀 OTIMIZADO: filteredFeedbacks é recalculado automaticamente
      // Remover apenas da lista de animação após a animação (500ms)
      setTimeout(() => {
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
      // 🚀 OTIMIZADO: feedback é atualizado automaticamente via useMemo
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

  // Função para obter datas de importação únicas
  const getImportDates = () => {
    const importDatesMap = new Map()
    
    analyses.forEach(analysis => {
      if (analysis.importDate) {
        const date = analysis.importDate.toDate ? analysis.importDate.toDate() : new Date(analysis.importDate)
        const dateStr = format(date, 'dd/MM/yyyy', { locale: ptBR })
        const hotelName = analysis.hotelName || analysis.hotelDisplayName || 'Hotel'
        
        if (!importDatesMap.has(analysis.id)) {
          importDatesMap.set(analysis.id, {
            id: analysis.id,
            label: `${dateStr} - ${hotelName}`,
            date: date
          })
        }
      }
    })
    
    // Converter para array e ordenar por data (mais recente primeiro)
    return Array.from(importDatesMap.values()).sort((a, b) => {
      return b.date.getTime() - a.date.getTime()
    })
  }

  // Função para recarregar dados do Firebase
  const reloadData = async () => {
    try {
      setLoading(true)
      const allAnalyses = await getAllAnalyses()
      setAnalyses(allAnalyses)
      
      // Combinar todos os feedbacks de todas as análises
      const allFeedbacks: Feedback[] = []
      allAnalyses.forEach((analysis: Analysis) => {
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

  // Função para atualizar dados com feedback visual
  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true)
      await reloadData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // 🚀 OTIMIZAÇÃO CRÍTICA: Função de filtro memoizada para evitar recálculos
  const filterFeedback = useCallback((feedback: any) => {
    // Early returns para máxima performance
    if (feedback.deleted) return false
    if (sentimentFilter !== "all" && feedback.sentiment !== sentimentFilter) return false
    if (importFilter !== "all" && feedback.importId !== importFilter) return false
    
    // Cache das operações toLowerCase para evitar recálculos
    if (sectorFilter !== "all") {
      const sectorLower = feedback.sector?.toLowerCase() || ''
      const filterLower = sectorFilter.toLowerCase()
      if (!sectorLower.includes(filterLower)) return false
    }
    
    if (keywordFilter !== "all") {
      const keywordLower = feedback.keyword?.toLowerCase() || ''
      const filterLower = keywordFilter.toLowerCase()
      if (!keywordLower.includes(filterLower)) return false
    }
    
    if (problemFilter !== "all" && feedback.problem) {
      const problemLower = feedback.problem.toLowerCase()
      const filterLower = problemFilter.toLowerCase()
      if (!problemLower.includes(filterLower)) return false
    }
    
    if (searchTerm) {
      const commentLower = feedback.comment?.toLowerCase() || ''
      const searchLower = searchTerm.toLowerCase()
      if (!commentLower.includes(searchLower)) return false
    }
    
    // Filtro de data otimizado (só calcula se necessário)
    if (dateRange?.from || dateRange?.to) {
      const feedbackDate = new Date(feedback.date)
      if (dateRange.from && feedbackDate < dateRange.from) return false
      if (dateRange.to && feedbackDate > dateRange.to) return false
    }
    
    return true
  }, [sentimentFilter, sectorFilter, keywordFilter, problemFilter, importFilter, searchTerm, dateRange])

  // 🚀 OTIMIZAÇÃO CRÍTICA: Função de sort memoizada
  const sortFunction = useCallback((a: any, b: any) => {
    const dateA = new Date((a as any).importDate?.seconds ? (a as any).importDate.seconds * 1000 : (a as any).importDate || 0)
    const dateB = new Date((b as any).importDate?.seconds ? (b as any).importDate.seconds * 1000 : (b as any).importDate || 0)
    return dateB.getTime() - dateA.getTime()
  }, [])

  // 🚀 OTIMIZAÇÃO CRÍTICA: useMemo para filtros (evita recálculo a cada render)
  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks.length) return []
    
    const filtered = feedbacks.filter(filterFeedback)
    filtered.sort(sortFunction)
    return filtered
  }, [feedbacks, filterFeedback, sortFunction])

  // 🚀 OTIMIZADO: Stats calculados com useMemo
  const stats = useMemo(() => ({
    total: filteredFeedbacks.length,
    positive: filteredFeedbacks.filter(f => f.sentiment === 'positive').length,
    negative: filteredFeedbacks.filter(f => f.sentiment === 'negative').length,
    neutral: filteredFeedbacks.filter(f => f.sentiment === 'neutral').length,
    averageRating: filteredFeedbacks.length > 0 ? (filteredFeedbacks.reduce((acc, f) => acc + f.rating, 0) / filteredFeedbacks.length).toFixed(1) : '0'
  }), [filteredFeedbacks])

  // 🚀 OTIMIZADO: Listas de filtros memoizadas
  const filterOptions = useMemo(() => ({
    sectors: Array.from(new Set(feedbacks.flatMap(f => splitByDelimiter(f.sector)))),
    keywords: Array.from(new Set(feedbacks.flatMap(f => splitByDelimiter(f.keyword)))),
    problems: Array.from(new Set(feedbacks.flatMap(f => splitByDelimiter(f.problem || ''))))
  }), [feedbacks])

  // 🚀 OTIMIZADO: clearFilters com useCallback para estabilidade
  const clearFilters = useCallback(() => {
    setSentimentFilter("all")
    setSectorFilter("all")
    setKeywordFilter("all")
    setProblemFilter("all")
    setImportFilter("all")
    setDateRange(undefined)
    setQuickDateFilter("")
    setSearchTerm("")
  }, [])

  // 🚀 OTIMIZADO: exportData com useCallback
  // 🚀 OTIMIZADO: exportData com useCallback
  const exportData = useCallback(() => {
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
  }, [filteredFeedbacks, toast])

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
    <div className="p-4 space-y-6 w-full min-h-screen">
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

        {/* Cards de Estatísticas Modernizados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            icon={MessageSquare}
            title="Total de Feedbacks"
            value={stats.total}
            color="bg-blue-500"
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            icon={TrendingUp}
            title="Positivos"
            value={stats.positive}
            color="bg-green-500"
            gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          />
          <StatsCard
            icon={Minus}
            title="Neutros"
            value={stats.neutral}
            color="bg-yellow-500"
            gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
          />
          <StatsCard
            icon={ArrowDown}
            title="Negativos"
            value={stats.negative}
            color="bg-red-500"
            gradient="bg-gradient-to-br from-red-500 to-rose-600"
          />
          <StatsCard
            icon={Star}
            title="Média Geral"
            value={`${stats.averageRating}★`}
            color="bg-purple-500"
            gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
          />
        </div>

        {/* Filtros e Busca Modernizados */}
        <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Filtros de Análise</h3>
                <p className="text-sm text-gray-600">Refine sua busca para encontrar insights específicos</p>
              </div>
            </div>
           
             <div className="space-y-6">
            {/* Grid responsivo de filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {/* Busca por texto modernizada */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" />
                  Buscar Comentários
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Digite para buscar insights..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Filtro por sentimento modernizado */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Sentimento
                </label>
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-white/80 backdrop-blur-sm">
                    <SelectValue placeholder="Selecionar sentimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os sentimentos</SelectItem>
                    <SelectItem value="positive">Positivo</SelectItem>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="negative">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por departamento modernizado */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Departamento
                </label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white/80 backdrop-blur-sm">
                    <SelectValue placeholder="Selecionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os departamentos</SelectItem>
                    {filterOptions.sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por palavra-chave modernizado */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-orange-500" />
                  Palavra-chave
                </label>
                <Select value={keywordFilter} onValueChange={setKeywordFilter}>
                  <SelectTrigger className="border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 bg-white/80 backdrop-blur-sm">
                    <SelectValue placeholder="Selecionar palavra-chave" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as palavras-chave</SelectItem>
                    {filterOptions.keywords.slice(0, 20).map((keyword) => (
                      <SelectItem key={keyword} value={keyword}>{keyword}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por problema */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Problema</label>
                <Select value={problemFilter} onValueChange={setProblemFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar problema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os problemas</SelectItem>
                    {filterOptions.problems.slice(0, 20).map((problem) => (
                      <SelectItem key={problem} value={problem}>{problem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtros pré-definidos de data */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Período Rápido
                </label>
                <Select value={quickDateFilter} onValueChange={applyQuickDateFilter}>
                  <SelectTrigger className="bg-white/50 border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                    <SelectValue placeholder="Selecionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="thisMonth">Este mês</SelectItem>
                    <SelectItem value="lastMonth">Mês passado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Calendário para seleção de intervalo */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Período Personalizado
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/50 border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
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

              {/* Filtro por data de importação */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Download className="h-4 w-4" />
                  Data de Importação
                </label>
                <Select value={importFilter} onValueChange={setImportFilter}>
                  <SelectTrigger className="bg-white/50 border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                    <SelectValue placeholder="Selecionar importação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as importações</SelectItem>
                    {getImportDates().map((importDate) => (
                      <SelectItem key={importDate.id} value={importDate.id}>
                        {importDate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de atualizar */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  Atualizar Dados
                </label>
                <Button 
                  onClick={handleRefreshData} 
                  disabled={isRefreshing}
                  variant="outline"
                  className="w-full flex items-center gap-2 h-10 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Atualizando..." : "Atualizar"}
                </Button>
              </div>
            </div>
          </div>
            
            {/* Indicador de filtros ativos */}
            {(sentimentFilter !== "all" || sectorFilter !== "all" || keywordFilter !== "all" || problemFilter !== "all" || dateRange?.from || dateRange?.to || searchTerm || importFilter !== "all") && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">Filtros Ativos:</span>
                  </div>
                  
                  {/* Botão para remover todos os filtros - só aparece quando há filtros ativos */}
                  <Button 
                    onClick={clearFilters}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar Tudo
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      Busca: "{searchTerm}"
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setSearchTerm('')}
                      />
                    </Badge>
                  )}
                  {sentimentFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Sentimento: {sentimentFilter === 'positive' ? 'Positivo' : sentimentFilter === 'negative' ? 'Negativo' : 'Neutro'}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setSentimentFilter('all')}
                      />
                    </Badge>
                  )}
                  {sectorFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Departamento: {sectorFilter}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setSectorFilter('all')}
                      />
                    </Badge>
                  )}
                  {keywordFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Palavra-chave: {keywordFilter}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setKeywordFilter('all')}
                      />
                    </Badge>
                  )}
                  {problemFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Problema: {problemFilter}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setProblemFilter('all')}
                      />
                    </Badge>
                  )}
                  {(dateRange?.from || dateRange?.to) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Período: {dateRange?.from ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR }) : ''}
                      {dateRange?.to && ` - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setDateRange(undefined)}
                      />
                    </Badge>
                  )}
                  {importFilter !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Importação: {getImportDates().find(d => d.id === importFilter)?.label}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => setImportFilter('all')}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Indicador de resultados filtrados */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando <strong>{filteredFeedbacks.length}</strong> de <strong>{feedbacks.length}</strong> feedbacks
            </span>
          </div>
        </Card>

        {/* Tabela de Feedbacks */}
        <Card className="overflow-hidden shadow-lg border-0 bg-white dark:bg-gray-900">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Análise de Feedbacks</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Visualização detalhada dos comentários processados</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sistema Otimizado</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="table-with-fixed-header w-full" style={{ height: 'calc(100vh - 200px)', minHeight: '700px' }}>
            {/* Header fixo */}
            <div className="fixed-header">
              <div className="w-full">
                <div className="grid grid-cols-12 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 shadow-lg">
                  <div className="col-span-1 py-5 px-3 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-blue-300" />
                    <span className="hidden lg:inline">Data</span>
                  </div>
                  <div className="col-span-3 py-5 px-3 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1 text-blue-300" />
                    <span className="hidden lg:inline">Comentário</span>
                  </div>
                  <div className="col-span-1 py-5 px-2 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm text-center flex items-center justify-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-300" />
                    <span className="hidden xl:inline">Nota</span>
                  </div>
                  <div className="col-span-1 py-5 px-2 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm text-center flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 mr-1 text-green-300" />
                    <span className="hidden xl:inline">Sent.</span>
                  </div>
                  <div className="col-span-2 py-5 px-2 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm flex items-center">
                    <Users className="h-4 w-4 mr-1 text-purple-300" />
                    <span className="hidden lg:inline">Departamento</span>
                  </div>
                  <div className="col-span-2 py-5 px-2 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1 text-orange-300" />
                    <span className="hidden lg:inline">Palavra-chave</span>
                  </div>
                  <div className="col-span-1 py-5 px-2 border-r border-gray-700/50 dark:border-gray-800/50 font-bold text-white text-sm flex items-center">
                    <Filter className="h-4 w-4 mr-1 text-red-300" />
                    <span className="hidden lg:inline">Problema</span>
                  </div>

                  <div className="col-span-1 py-5 px-2 font-bold text-white text-sm flex items-center">
                    <Lightbulb className="h-4 w-4 mr-1 text-yellow-300" />
                    <span className="hidden xl:inline">Sugestão</span>
                    <Eye className="h-4 w-4 ml-auto text-gray-300" />

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
                            {groupFeedbacks.map((feedback, feedbackIndex) => {
                              // Encontrar o índice real do feedback na lista filtrada
                              const realIndex = filteredFeedbacks.findIndex(f => f.id === feedback.id);
                              return (
                      <div 
                        key={feedback.id} 
                        className={cn(
                          "grid grid-cols-12 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors min-h-[80px] relative w-full",
                          deletingFeedbacks.has(feedback.id) && "feedback-deleting",
                          editingFeedbacks.has(feedback.id) && "feedback-editing"
                        )}
                      >
                        {/* Flag de editado */}
                        {feedback.edited && (
                          <div className="feedback-edited-flag">
                            ✓
                          </div>
                        )}
                        <div className="col-span-1 py-4 px-2 border-r border-gray-200 dark:border-gray-800 text-xs flex items-center">
                          <span className="font-medium text-gray-600 dark:text-gray-400 truncate">
                            {formatDateBR(feedback.date)}
                          </span>
                        </div>
                        <div className="col-span-3 py-4 px-2 border-r border-gray-200 dark:border-gray-800 flex items-start">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm line-clamp-3 leading-relaxed text-gray-700 dark:text-gray-300 cursor-help">
                                  {feedback.comment.length > 120 
                                    ? `${feedback.comment.substring(0, 120)}...` 
                                    : feedback.comment
                                  }
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md text-sm leading-relaxed p-3">
                                {feedback.comment}
                              </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="col-span-1 py-4 px-2 border-r border-gray-200 dark:border-gray-800 text-center flex items-center justify-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <span className="text-base leading-none text-yellow-500">{ratingIcons[feedback.rating] || "N/A"}</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{feedback.rating}</span>
                          </div>
                        </div>
                        <div className="col-span-1 py-4 px-2 border-r border-gray-200 dark:border-gray-800 text-center flex items-center justify-center">
                          <SentimentBadge sentiment={feedback.sentiment} />
                        </div>
                        <div className="col-span-2 py-4 px-2 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <div className="flex flex-wrap gap-1 w-full">
                            {splitByDelimiter(feedback.sector).slice(0, 3).map((sector, index) => (
                              <Badge 
                                key={`${feedback.id}-sector-${index}`} 
                                variant="outline"
                                className={cn("text-xs border", getSectorColor(sector.trim()))}
                              >
                                {sector.trim().substring(0, 12)}
                              </Badge>
                            ))}
                            {splitByDelimiter(feedback.sector).length > 3 && (
                              <Badge variant="outline" className="text-xs px-1 py-1">
                                +{splitByDelimiter(feedback.sector).length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 py-4 px-2 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <div className="flex flex-wrap gap-1 w-full">
                            {(() => {
                              const keywords = splitByDelimiter(feedback.keyword);
                              const sectors = splitByDelimiter(feedback.sector);
                              return keywords.slice(0, 3).map((kw, index) => {
                                const sector = sectors[index]?.trim() || sectors[0]?.trim() || '';
                                return (
                                  <KeywordBadge 
                                    key={`${feedback.id}-keyword-${index}`} 
                                    keyword={kw.trim().substring(0, 15)} 
                                    sector={sector} 
                                  />
                                );
                              });
                            })()}
                            {splitByDelimiter(feedback.keyword).length > 3 && (
                              <Badge variant="outline" className="text-xs px-1 py-1">
                                +{splitByDelimiter(feedback.keyword).length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 py-4 px-2 border-r border-gray-200 dark:border-gray-800 flex items-start">
                          <div className="flex flex-wrap gap-1 w-full">
                            {feedback.problem ? (
                              (() => {
                                const problems = splitByDelimiter(feedback.problem);
                                return problems.slice(0, 2).map((problem, index) => {
                                  const sectors = splitByDelimiter(feedback.sector);
                                  const sector = sectors[index]?.trim() || sectors[0]?.trim() || '';
                                  const trimmedProblem = problem.trim();
                                  
                                  if (trimmedProblem === 'VAZIO' || trimmedProblem === 'Sem problemas') {
                                    return (
                                      <span key={`${feedback.id}-problem-${index}`} className="text-xs text-green-600 dark:text-green-400 italic font-medium">
                                        Sem problemas
                                      </span>
                                    );
                                  }
                                  
                                  return (
                                    feedback.problem_detail ? (
                                      <span key={`${feedback.id}-problem-${index}`} className="inline-flex">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge 
                                                variant="outline"
                                                className={cn("text-xs px-2 py-1 border", getSectorColor(sector))}
                                              >
                                                {trimmedProblem.substring(0, 18)}
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-sm text-xs leading-relaxed">
                                              {feedback.problem_detail}
                                            </TooltipContent>
                                          </Tooltip>
                                      </span>
                                    ) : (
                                      <Badge 
                                        key={index} 
                                        variant="outline"
                                        className={cn("text-xs px-2 py-1 border", getSectorColor(sector))}
                                      >
                                        {trimmedProblem.substring(0, 18)}
                                      </Badge>
                                    )
                                  );

                                });
                              })()
                            ) : (
                              <span className="text-xs text-green-600 dark:text-green-400 italic font-medium">Sem problemas</span>
                            )}
                            {feedback.problem && splitByDelimiter(feedback.problem).length > 2 && (
                              <Badge variant="outline" className="text-xs px-1 py-1">
                                +{splitByDelimiter(feedback.problem).length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="col-span-1 py-4 px-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {feedback.has_suggestion ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline"
                                      className={cn(
                                        "text-xs px-2 py-1 border cursor-help",
                                        feedback.suggestion_type === 'only' || feedback.suggestion_type === 'only_suggestion'
                                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                          : feedback.suggestion_type === 'mixed'
                                          ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700"
                                          : feedback.suggestion_type === 'with_criticism'
                                          ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700"
                                          : feedback.suggestion_type === 'with_praise'
                                          ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                                          : "bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                                      )}
                                    >
                                      {(() => {
                                        switch(feedback.suggestion_type) {
                                          case 'only':
                                          case 'only_suggestion':
                                            return 'Sugestão';
                                          case 'with_criticism':
                                            return 'Crítica';
                                          case 'with_praise':
                                            return 'Elogio';
                                          case 'mixed':
                                            return 'Misto';
                                          default:
                                            return 'Sugestão';
                                        }
                                      })()}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md text-sm leading-relaxed p-3">
                                    {feedback.suggestion_summary || 'Clique nos detalhes para adicionar um resumo da sugestão'}
                                  </TooltipContent>
                                </Tooltip>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400 italic">Sem sugestão</span>
                            )}
                          </div>
                          <CommentModal 
                            feedback={feedback} 
                            onFeedbackUpdated={handleFeedbackUpdated} 
                            onDeleteFeedback={handleDeleteFeedback} 
                            userData={userData}
                            allFeedbacks={filteredFeedbacks}
                            currentIndex={realIndex >= 0 ? realIndex : 0}
                            onNavigate={(newIndex) => {
                              // Garantir que o newIndex está dentro dos limites dos feedbacks filtrados
                              if (newIndex >= 0 && newIndex < filteredFeedbacks.length) {
                                setCurrentModalIndex(newIndex)
                              }
                            }}
                          />
                        </div>
                      </div>
                              );
                            })}
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