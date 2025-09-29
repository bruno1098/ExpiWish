"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, AlertCircle, Eye, EyeOff, Edit3, Save, X, Plus, Trash2, Info, MessageSquare, Star, Calendar } from "lucide-react"
import { formatDateBR, cn } from "@/lib/utils"
import { filterValidFeedbacks, isValidProblem, isValidSectorOrKeyword } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAllAnalyses, updateFeedbackInFirestore, saveRecentEdit, getRecentEdits } from "@/lib/firestore-service"
import SharedDashboardLayout from "../../shared-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { EnhancedProblemEditor } from "@/components/enhanced-problem-editor"

// Estilos para scroll otimizado
const scrollbarStyles = `
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

  /* Dark mode */
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

  /* Layout da tabela com header fixo */
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
    background: linear-gradient(to right, #ea580c, #dc2626);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    border-bottom: 3px solid #f97316;
  }

  .dark .fixed-header {
    background: linear-gradient(to right, #9a3412, #7c2d12);
    border-bottom: 3px solid #ea580c;
  }

  .scrollable-body {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .scrollable-body::-webkit-scrollbar {
    width: 16px !important;
    height: 16px !important;
    background: #e2e8f0 !important;
  }

  .scrollable-body::-webkit-scrollbar-track {
    background: #e2e8f0 !important;
    border-radius: 8px !important;
  }

  .scrollable-body::-webkit-scrollbar-thumb {
    background: #64748b !important;
    border-radius: 8px !important;
    border: 2px solid #e2e8f0 !important;
    min-height: 40px !important;
  }

  .scrollable-body::-webkit-scrollbar-thumb:hover {
    background: #475569 !important;
  }

  .scrollable-body::-webkit-scrollbar-corner {
    background: #e2e8f0 !important;
  }

  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  /* Animações de exclusão */
  .feedback-deleting {
    animation: deleteSlideOut 1.5s ease-in-out forwards;
    background: linear-gradient(90deg, #fee2e2, #fecaca) !important;
    border-left: 4px solid #ef4444 !important;
  }

  .dark .feedback-deleting {
    background: linear-gradient(90deg, #7f1d1d, #991b1b) !important;
  }

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
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    z-index: 10;
    animation: flagAppear 0.5s ease-out;
  }

  .dark .feedback-edited-flag {
    background: #16a34a;
  }

  @keyframes deleteSlideOut {
    0% {
      opacity: 1;
      transform: translateX(0);
      max-height: 80px;
      margin-bottom: 0;
    }
    50% {
      opacity: 0.5;
      transform: translateX(-20px);
      max-height: 80px;
      margin-bottom: 0;
    }
    100% {
      opacity: 0;
      transform: translateX(-100%);
      max-height: 0;
      margin-bottom: 0;
      padding-top: 0;
      padding-bottom: 0;
      border: none;
    }
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

  @keyframes flagAppear {
    0% {
      opacity: 0;
      transform: scale(0) rotate(-180deg);
    }
    50% {
      transform: scale(1.2) rotate(-90deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
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
    border: 1px solid #374151;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to { 
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

interface UnidentifiedFeedback {
  id: string
  comment: string
  rating: number
  keyword: string
  sector: string
  problem: string
  date: string
  source: string
  sentiment?: string
  allProblems?: Array<{keyword: string, sector: string, problem: string, problem_detail?: string}>
  deleted?: boolean
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

// Definir mapeamento de departamentos para cores com gradientes elegantes
const sectorColors: Record<string, string> = {
  'A&B': 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm',
  'Governança': 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/40 dark:to-pink-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 shadow-sm',
  'Manutenção': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Manutenção - Quarto': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Manutenção - Banheiro': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Manutenção - Instalações': 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
  'Lazer': 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 shadow-sm',
  'TI': 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 shadow-sm',
  'Operações': 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 shadow-sm',
  'Produto': 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 shadow-sm',
  'Marketing': 'bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/40 dark:to-rose-900/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700 shadow-sm',
  'Comercial': 'bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/40 dark:to-teal-900/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700 shadow-sm',
  'Qualidade': 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/40 dark:to-gray-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm',
  'Recepção': 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/40 dark:to-cyan-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700 shadow-sm',
  'Programa de vendas': 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 shadow-sm'
};

// Função para obter a cor com base no departamento
const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
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

// Componente para editar um problema individual
const ProblemEditor = ({ 
  problem, 
  onUpdate, 
  onRemove, 
  canRemove = true 
}: { 
  problem: { id: string; keyword: string; sector: string; problem: string; problem_detail?: string };
  onUpdate: (updated: { keyword: string; sector: string; problem: string; problem_detail?: string }) => void;
  onRemove?: () => void;
  canRemove?: boolean;
}) => {
  const [keyword, setKeyword] = useState(problem.keyword);
  const [sector, setSector] = useState(problem.sector);
  const [problemText, setProblemText] = useState(problem.problem);
  const [keywordInputMode, setKeywordInputMode] = useState(false);
  const [sectorInputMode, setSectorInputMode] = useState(false);
  const [problemInputMode, setProblemInputMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Sincronizar com props quando mudarem
  useEffect(() => {
    setKeyword(problem.keyword);
    setSector(problem.sector);
    setProblemText(problem.problem);
    setForceUpdate(prev => prev + 1);
  }, [problem.keyword, problem.sector, problem.problem]);

  useEffect(() => {
    onUpdate({ keyword, sector, problem: problemText });
  }, [keyword, sector, problemText, onUpdate]);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setForceUpdate(prev => prev + 1);
  };

  const handleSectorChange = (value: string) => {
    setSector(value);
    setForceUpdate(prev => prev + 1);
  };

  const handleProblemChange = (value: string) => {
    setProblemText(value);
    setForceUpdate(prev => prev + 1);
    if (value !== 'VAZIO') {
      setProblemInputMode(false);
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
                key={`keyword-input-${forceUpdate}`}
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                className="text-sm"
                placeholder="Digite palavra-chave personalizada"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setKeywordInputMode(false)} className="text-xs">
                  OK
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setKeyword(problem.keyword);
                  setKeywordInputMode(false);
                }} className="text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Select key={`keyword-${forceUpdate}`} value={keyword} onValueChange={handleKeywordChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione palavra-chave" />
                </SelectTrigger>
                <SelectContent>
                  {commonKeywords.map((kw) => (
                    <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setKeywordInputMode(true)}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                + Personalizar
              </Button>
            </div>
          )}
        </div>

        {/* Departamento */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Departamento
          </label>
          {sectorInputMode ? (
            <div className="space-y-2">
              <Input
                key={`sector-input-${forceUpdate}`}
                value={sector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="text-sm"
                placeholder="Digite departamento personalizado"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  if (sector.trim()) {
                    setSectorInputMode(false);
                  }
                }} className="text-xs">
                  OK
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setSector(problem.sector);
                  setSectorInputMode(false);
                }} className="text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Select key={`sector-${forceUpdate}`} value={sector} onValueChange={handleSectorChange}>
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSectorInputMode(true)}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                + Personalizar
              </Button>
            </div>
          )}
        </div>

        {/* Problema */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Problema
          </label>
          {problemInputMode ? (
            <div className="space-y-2">
              <Input
                key={`problem-input-${forceUpdate}`}
                value={problemText}
                onChange={(e) => handleProblemChange(e.target.value)}
                className="text-sm"
                placeholder="Digite problema personalizado"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProblemInputMode(false)} className="text-xs">
                  OK
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setProblemText(problem.problem);
                  setProblemInputMode(false);
                }} className="text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Select key={`problem-${forceUpdate}`} value={problemText} onValueChange={handleProblemChange}>
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setProblemInputMode(true)}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                + Personalizar
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

// Componente para Modal de Edição
const EditFeedbackModal = ({ feedback, onSave }: { feedback: UnidentifiedFeedback, onSave: (updatedFeedback: UnidentifiedFeedback) => void }) => {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedProblems, setEditedProblems] = useState<Array<{id: string, keyword: string, sector: string, problem: string, problem_detail?: string}>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
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
          keyword: keywords[i] || keywords[0] || 'Comodidade',
          sector: sectors[i] || sectors[0] || 'Produto', 
          problem: problems[i] || problems[0] || 'VAZIO',
          problem_detail: ''
        })
      }
      
      setEditedProblems(problemsArray)
    }
  }, [feedback, isEditing])

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleUpdateProblem = (id: string, updated: {keyword: string, sector: string, problem: string, problem_detail?: string}) => {
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
    setEditedProblems([
      ...editedProblems,
      { 
        id: `problem-${Date.now()}-${editedProblems.length}`,
        keyword: 'Comodidade', 
        sector: 'Produto', 
        problem: 'VAZIO',
        problem_detail: ''
      }
    ])
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
      
      // Salvar no Firebase
      await updateFeedbackInFirestore(feedback.id, updatedFeedback)
      
      // Salvar no histórico de edições
      await saveRecentEdit({
        feedbackId: feedback.id,
        hotelId: feedback.id.split('_')[0] || 'unknown',
        hotelName: 'Hotel não identificado',
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
        modifiedBy: 'Colaborador',
        page: 'unidentified'
      })
      
      setIsEditing(false)
      
      // Chamar callback para atualizar a lista local
      onSave(updatedFeedback)
      
      toast({
        title: "Análise Atualizada",
        description: "As alterações foram salvas com sucesso. O feedback agora aparecerá nos dashboards.",
      })
      
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
    setShowDeleteConfirm(true)
  }

  const confirmDeleteFeedback = async () => {
    setIsDeleting(true)
    setShowDeleteConfirm(false)
    
    try {
      // Chamar API para marcar feedback como excluído
      const response = await fetch('/api/delete-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackId: feedback.id,
          reason: 'Conteúdo irrelevante ou spam'
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao excluir feedback')
      }

      toast({
        title: "Comentário Excluído",
        description: "O comentário foi marcado como excluído e removido das visualizações.",
        duration: 3000,
      })

      // Fechar modal e atualizar lista
      onSave({ ...feedback, deleted: true })

    } catch (error) {
      console.error('Erro ao excluir feedback:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30">
          <Edit3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Editar Feedback Não Identificado - {feedback.rating} estrelas
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar Análise
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteFeedback}
                    disabled={isSaving || isDeleting}
                    className="flex items-center gap-2 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 transition-all duration-200 hover:shadow-md"
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
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
                    onClick={handleCancelEdit}
                    disabled={isSaving || isDeleting}
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={isSaving || isDeleting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Data</p>
              <p className="text-sm text-foreground">{formatDateBR(feedback.date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Avaliação</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <span className="text-sm text-foreground font-medium">{feedback.rating}/5</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
              <Badge className="bg-orange-100 text-orange-800">Não Identificado</Badge>
            </div>
          </div>

          {/* Comentário Principal */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Comentário</h3>
            <div className="p-4 bg-background border-2 border-border rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {feedback.comment}
              </p>
            </div>
          </div>

          {/* Análise IA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Análise da IA</h4>
              {isEditing && (
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  Modo de Edição Ativo
                </div>
              )}
            </div>
            
            {isEditing ? (
              // Modo de edição
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                    <Edit3 className="h-4 w-4" />
                    <span className="text-sm font-medium">Editando Análise</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Você está corrigindo a classificação da IA. Após salvar, este feedback aparecerá nos dashboards normalmente.
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
                  onClick={handleAddProblem}
                  className="w-full border-dashed border-2 h-12 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Problema ({editedProblems.length})
                </Button>
              </div>
            ) : (
              // Modo de visualização
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Departamento</h4>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {feedback.sector || 'Não identificado'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Palavra-chave</h4>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {feedback.keyword || 'Não identificado'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Problema</h4>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {feedback.problem || 'Não identificado'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Confirmar Exclusão
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Tem certeza que deseja excluir este feedback? O comentário será marcado como excluído e removido das visualizações.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteFeedback}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}

interface RecentAnalysis {
  id: string
  comment: string
  rating: number
  date: string
  source: string
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

export default function UnidentifiedFeedbacks() {
  const router = useRouter()
  const { userData } = useAuth()
  const { toast } = useToast()
  const [unidentifiedFeedbacks, setUnidentifiedFeedbacks] = useState<UnidentifiedFeedback[]>([])
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({})
  const [deletingFeedbacks, setDeletingFeedbacks] = useState<Set<string>>(new Set())
  const [showDeletedIndicator, setShowDeletedIndicator] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [feedbackToDelete, setFeedbackToDelete] = useState<UnidentifiedFeedback | null>(null)
  const [editingFeedbacks, setEditingFeedbacks] = useState<Set<string>>(new Set())
  const [editedFeedbacks, setEditedFeedbacks] = useState<Set<string>>(new Set())
  const [showEditedIndicator, setShowEditedIndicator] = useState(false)

  const loadRecentAnalyses = async () => {
    try {
      if (userData?.hotelId) {
        const recentEdits = await getRecentEdits(7, userData.hotelId)
        // Mapear os dados do Firebase para a interface RecentAnalysis
        const recentAnalyses = recentEdits.slice(0, 10).map((edit: any) => ({
          id: edit.id,
          comment: edit.comment || '',
          rating: edit.rating || 0,
          date: edit.date || '',
          source: edit.source || 'Sistema',
          oldClassification: edit.oldClassification || { keyword: '', sector: '', problem: '' },
          newClassification: edit.newClassification || { keyword: '', sector: '', problem: '' },
          modifiedAt: edit.modifiedAt || edit.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          modifiedBy: edit.modifiedBy || 'Colaborador'
        }))
        setRecentAnalyses(recentAnalyses)
      }
    } catch (error) {
      console.error('Erro ao carregar análises recentes:', error)
    }
  }

  useEffect(() => {
    // Limpar localStorage quando o usuário muda para evitar dados de outros hotéis
    if (userData?.hotelId) {
      const storedHotelId = localStorage.getItem('current-hotel-id')
      if (storedHotelId && storedHotelId !== userData.hotelId) {
        // Hotel mudou, limpar dados antigos
        localStorage.removeItem('analysis-feedbacks')
        console.log('Dados do localStorage limpos devido à mudança de hotel')
      }
      localStorage.setItem('current-hotel-id', userData.hotelId)
    }
    
    fetchUnidentifiedFeedbacks()
    loadRecentAnalyses()
    
    // Injetar estilos de barra de rolagem
    const styleElement = document.createElement('style')
    styleElement.textContent = scrollbarStyles
    document.head.appendChild(styleElement)
    
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [userData])

  const fetchUnidentifiedFeedbacks = async () => {
    setLoading(true)
    try {
      // Primeiro tentar carregar do localStorage (dados da página de análise atual)
      let feedbacksToAnalyze: any[] = []
      
      const storedFeedbacks = localStorage.getItem('analysis-feedbacks')
      if (storedFeedbacks) {
        try {
          const parsedFeedbacks = JSON.parse(storedFeedbacks)
          
          // Verificar se os dados do localStorage são do hotel atual
          const storedHotelId = localStorage.getItem('current-hotel-id')
          if (storedHotelId === userData?.hotelId) {
            feedbacksToAnalyze = parsedFeedbacks
            console.log('Dados carregados do localStorage para o hotel atual')
          } else {
            console.log('Dados do localStorage são de outro hotel, ignorando')
            localStorage.removeItem('analysis-feedbacks')
          }
        } catch (error) {
          console.error('Erro ao parsear localStorage:', error)
        }
      }
      
      // Se não tem dados no localStorage, buscar do Firebase
      if (feedbacksToAnalyze.length === 0) {
        // Garantir que apenas dados do hotel atual sejam carregados
        if (!userData?.hotelId) {
          console.error('Hotel ID não encontrado para o usuário')
          setLoading(false)
          return
        }
        
        const allAnalyses = await getAllAnalyses(userData.hotelId, false)
        allAnalyses.forEach((analysis: any) => {
          if (analysis.data && Array.isArray(analysis.data)) {
            feedbacksToAnalyze.push(...analysis.data)
          }
        })
      }
      
      const unidentifiedFeedbacks: UnidentifiedFeedback[] = []

      feedbacksToAnalyze.forEach((feedback: any) => {
        // Critérios para feedback não identificado
        const hasInvalidKeyword = !isValidSectorOrKeyword(feedback.keyword);
        const hasInvalidSector = !isValidSectorOrKeyword(feedback.sector);
        const hasInvalidProblem = !isValidProblem(feedback.problem);
        
        const hasExplicitNotIdentified = 
          feedback.keyword?.toLowerCase().includes('não identificado') ||
          feedback.sector?.toLowerCase().includes('não identificado') ||
          feedback.problem?.toLowerCase().includes('não identificado');
        
        // Detectar comentários problemáticos/spam
        const comment = feedback.comment?.toLowerCase() || '';
        const isSpamOrGibberish = 
          comment.length < 5 || // Muito curto
          /^[^a-záéíóúàâêôãõç\s]*$/.test(comment) || // Apenas caracteres especiais/números
          /^[a-z]{1,3}(\1)*$/.test(comment) || // Repetição como "aaa", "bbb"
          comment.match(/^[a-z]{1,2}([a-z])\1{2,}$/); // Padrões como "dfnsdfd"
        
        // Feedback é não identificado se:
        // 1. Keyword, sector OU problem inválidos OU
        // 2. Contém "não identificado" explicitamente (em qualquer campo) OU  
        // 3. Comentário é spam/gibberish
        const isUnidentified = 
          hasInvalidKeyword || 
          hasInvalidSector || 
          hasInvalidProblem ||
          hasExplicitNotIdentified ||
          isSpamOrGibberish;

        // Excluir feedbacks marcados como deletados
        const isNotDeleted = !feedback.deleted;

        if (isUnidentified && isNotDeleted) {
          
          unidentifiedFeedbacks.push({
            id: feedback.id || `feedback_${Math.random()}`,
            comment: feedback.comment || '',
            rating: feedback.rating || 3,
            keyword: feedback.keyword || 'Não identificado',
            sector: feedback.sector || 'Não identificado', 
            problem: feedback.problem || '',
            date: feedback.date || new Date().toISOString(),
            source: feedback.source || 'Não especificado',
            sentiment: feedback.sentiment,
            allProblems: feedback.allProblems || []
          })
        }
      })

      setUnidentifiedFeedbacks(unidentifiedFeedbacks)
    } catch (error) {
      console.error('Erro ao buscar feedbacks não identificados:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveRecentAnalysis = async (
    originalFeedback: UnidentifiedFeedback, 
    updatedFeedback: UnidentifiedFeedback
  ) => {
    // Verificar se houve mudanças reais na classificação
    const hasChanges = 
      originalFeedback.keyword !== updatedFeedback.keyword ||
      originalFeedback.sector !== updatedFeedback.sector ||
      originalFeedback.problem !== updatedFeedback.problem;
    
    if (!hasChanges) {
      // Se não houve mudanças na classificação, não salvar como edição
      return;
    }

    const recentAnalysis = {
      id: originalFeedback.id,
      comment: originalFeedback.comment,
      rating: originalFeedback.rating,
      date: originalFeedback.date,
      source: originalFeedback.source,
      hotelId: userData?.hotelId || 'unknown',
      hotelName: userData?.hotelName || 'Hotel Desconhecido',
      oldClassification: {
        keyword: originalFeedback.keyword,
        sector: originalFeedback.sector,
        problem: originalFeedback.problem
      },
      newClassification: {
        keyword: updatedFeedback.keyword,
        sector: updatedFeedback.sector,
        problem: updatedFeedback.problem
      },
      modifiedAt: new Date().toISOString(),
      modifiedBy: userData?.email || 'Usuário'
    }

    try {
      // Salvar no Firebase
      await saveRecentEdit(recentAnalysis)
      
      // Também manter no localStorage local para exibição imediata
      const stored = localStorage.getItem('recent-analyses')
      const existing = stored ? JSON.parse(stored) : []
      
      // Verificar se já existe uma edição recente do mesmo feedback (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const existingRecentEdit = existing.find((analysis: RecentAnalysis) => 
        analysis.id === recentAnalysis.id && 
        analysis.modifiedAt > fiveMinutesAgo
      );
      
      let updated;
      if (existingRecentEdit) {
        // Atualizar a edição existente ao invés de criar uma nova
        updated = existing.map((analysis: RecentAnalysis) => 
          analysis.id === recentAnalysis.id && analysis.modifiedAt > fiveMinutesAgo
            ? { ...recentAnalysis, oldClassification: analysis.oldClassification } // Manter a classificação original da primeira edição
            : analysis
        );
      } else {
        // Remover edições antigas do mesmo feedback e adicionar a nova no início
        const filtered = existing.filter((analysis: RecentAnalysis) => analysis.id !== recentAnalysis.id)
        updated = [recentAnalysis, ...filtered].slice(0, 20) // Manter apenas 20
      }
      
      localStorage.setItem('recent-analyses', JSON.stringify(updated))
      setRecentAnalyses(updated.slice(0, 10))

    } catch (error) {
      console.error('Erro ao salvar análise recente:', error)
    }
  }

  const handleFeedbackSaved = async (updatedFeedback: UnidentifiedFeedback) => {
    // Encontrar o feedback original para comparação
    const originalFeedback = unidentifiedFeedbacks.find(f => f.id === updatedFeedback.id)
    
    if (originalFeedback) {
      // Salvar na lista de análises recentes (Firebase + localStorage)
      await saveRecentAnalysis(originalFeedback, updatedFeedback)
    }
    
    // Se o feedback foi marcado como deletado, aplicar animação
    if (updatedFeedback.deleted) {
      // Adicionar ao estado de feedbacks sendo excluídos
      setDeletingFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      
      // Mostrar indicador de exclusão
      setShowDeletedIndicator(true)
      
      // Remover da lista após a animação
      setTimeout(() => {
        setUnidentifiedFeedbacks(prev => prev.filter(f => f.id !== updatedFeedback.id))
        setDeletingFeedbacks(prev => {
          const newSet = new Set(Array.from(prev))
          newSet.delete(updatedFeedback.id)
          return newSet
        })
      }, 1500)
      
      // Esconder indicador após 2 segundos
      setTimeout(() => {
        setShowDeletedIndicator(false)
      }, 2000)
      
      return
    }
    
    // Verificar se o feedback ainda deve ser considerado não identificado após a edição
    const hasInvalidKeyword = !isValidSectorOrKeyword(updatedFeedback.keyword);
    const hasInvalidSector = !isValidSectorOrKeyword(updatedFeedback.sector);
    const hasInvalidProblem = !isValidProblem(updatedFeedback.problem);
    
    const hasExplicitNotIdentified = 
      updatedFeedback.keyword?.toLowerCase().includes('não identificado') ||
      updatedFeedback.sector?.toLowerCase().includes('não identificado') ||
      updatedFeedback.problem?.toLowerCase().includes('não identificado');
    
    const isProblematicComment = 
      updatedFeedback.comment?.length < 10 ||
      /^[^a-zA-ZÀ-ÿ]*$/.test(updatedFeedback.comment || '') ||
      /^(.)\1{4,}/.test(updatedFeedback.comment || '') ||
      /(test|teste|aaa|bbb|ccc|xxx|yyy|zzz|123|abc)/i.test(updatedFeedback.comment || '');
    
    const shouldStillBeUnidentified = 
      hasInvalidKeyword || hasInvalidSector || hasInvalidProblem || 
      hasExplicitNotIdentified || isProblematicComment;
    
    if (shouldStillBeUnidentified) {
      // Atualizar o feedback na lista primeiro
      setUnidentifiedFeedbacks(prev => 
        prev.map(f => f.id === updatedFeedback.id ? updatedFeedback : f)
      )
      
      // Adicionar animação de edição e flag
      setEditingFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      setEditedFeedbacks(prev => new Set([...Array.from(prev), updatedFeedback.id]))
      
      // Mostrar indicador de edição
      setShowEditedIndicator(true)
      
      // Remover animação de edição após 3 segundos, mas manter a flag
      setTimeout(() => {
        setEditingFeedbacks(prev => {
          const newSet = new Set(Array.from(prev))
          newSet.delete(updatedFeedback.id)
          return newSet
        })
      }, 3000)
      
      // Esconder indicador após 3 segundos
      setTimeout(() => {
        setShowEditedIndicator(false)
      }, 3000)
      
      // Remover a flag de editado após 5 segundos para dar tempo de ver
      setTimeout(() => {
        setEditedFeedbacks(prev => {
          const newSet = new Set(Array.from(prev))
          newSet.delete(updatedFeedback.id)
          return newSet
        })
      }, 5000)
      
      toast({
        title: "Feedback Atualizado",
        description: "O feedback foi atualizado mas ainda precisa de mais correções para ser totalmente identificado.",
        variant: "default"
      })
    } else {
      // Remove da lista de não identificados (feedback totalmente identificado)
      setUnidentifiedFeedbacks(prev => prev.filter(f => f.id !== updatedFeedback.id))
      
      toast({
        title: "Feedback Reclassificado",
        description: "O feedback foi corrigido e agora aparece nos dashboards principais.",
      })
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
          
                    <div className="flex gap-2">
            {/* Botão para forçar reload do Firebase */}
            <Button 
              variant="outline" 
              onClick={async () => {
                
                localStorage.removeItem('analysis-feedbacks')
                await fetchUnidentifiedFeedbacks()
                toast({
                  title: "Dados Atualizados",
                  description: "Recarregados diretamente do Firebase",
                })
              }}
              className="text-xs"
            >
              🔄 Firebase
            </Button>
            
            {/* Botão de debug temporário */}
            <Button 
              variant="outline" 
              onClick={() => {

                console.log('- "Não identificado":', isValidSectorOrKeyword('Não identificado'))
                console.log('- "A&B":', isValidSectorOrKeyword('A&B'))
                console.log('- "Manutenção":', isValidSectorOrKeyword('Manutenção'))
                console.log('- "Comodidade":', isValidSectorOrKeyword('Comodidade'))
                console.log('- "Produto":', isValidSectorOrKeyword('Produto'))

                console.log('- "Não identificado":', isValidProblem('Não identificado'))
                console.log('- "VAZIO":', isValidProblem('VAZIO'))
                console.log('- "Demora no Atendimento":', isValidProblem('Demora no Atendimento'))
                console.log('- "":', isValidProblem(''))
                console.log('- undefined:', isValidProblem(undefined as any))
                
                // Buscar e mostrar alguns exemplos dos dados
                const storedFeedbacks = localStorage.getItem('analysis-feedbacks')
                if (storedFeedbacks) {
                  const feedbacks = JSON.parse(storedFeedbacks)
                  
                  feedbacks.slice(0, 5).forEach((f: any, i: number) => {
                    
                  })
                  
                  // Procurar por feedbacks com "Não identificado" no problema
                  const problemsWithNotIdentified = feedbacks.filter((f: any) => 
                    f.problem?.toLowerCase().includes('não identificado')
                  )
                  
                  problemsWithNotIdentified.slice(0, 3).forEach((f: any, i: number) => {
                    
                  })
                }
              }}
              className="text-xs"
            >
              🧪 Debug
            </Button>
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

        {/* Informações sobre critérios de detecção */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Critérios de Detecção Atualizados
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Os feedbacks aparecem aqui quando:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li><strong>Keywords, setores ou problemas inválidos:</strong> Não constam nas listas oficiais da IA</li>
                <li><strong>Marcados explicitamente:</strong> Contêm "não identificado" em qualquer campo (keyword, setor, problema)</li>
                <li><strong>Comentários problemáticos:</strong> Muito curtos (&lt; 5 chars), apenas símbolos ou padrões como "dfnsdfd"</li>
                <li><strong>Spam ou gibberish:</strong> Detectados automaticamente por padrões suspeitos</li>
              </ul>
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>✅ Melhoria:</strong> Se poucos feedbacks aparecem aqui, significa que a IA está funcionando melhor 
                  e identificando corretamente mais comentários!
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Aviso */}
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Sobre os Feedbacks Não Identificados</h3>
              <p className="text-sm text-orange-700 mt-1">
                Estes comentários incluem textos irrelevantes (como "conforme meu relato acima", "VICE ACIMA"), 
                comentários de teste, ou textos que a IA não conseguiu classificar corretamente. Eles não aparecem nos 
                dashboards principais para manter a qualidade dos dados. Aqui você pode revisar casos especiais e 
                identificar padrões para melhorar a classificação.
              </p>
            </div>
          </div>
        </Card>

        {/* Lista de Feedbacks */}
        {unidentifiedFeedbacks.length > 0 ? (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-semibold">Lista de Feedbacks Não Identificados</h3>
              <Badge variant="secondary" className="ml-auto">
                {unidentifiedFeedbacks.length} feedbacks
              </Badge>
            </div>
            
            <div className="table-with-fixed-header" style={{ height: '600px' }}>
              <Table>
                <TableHeader className="fixed-header">
                  <TableRow>
                    <TableHead className="text-white font-semibold w-32">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data
                      </div>
                    </TableHead>
                    <TableHead className="text-white font-semibold w-32">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Avaliação
                      </div>
                    </TableHead>
                    <TableHead className="text-white font-semibold min-w-96">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comentário
                      </div>
                    </TableHead>
                    <TableHead className="text-white font-semibold w-48">Palavra-chave</TableHead>
                    <TableHead className="text-white font-semibold w-48">Departamento</TableHead>
                    <TableHead className="text-white font-semibold w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              
              <div className="scrollable-body custom-scrollbar">
                <Table>
                  <TableBody>
                    {unidentifiedFeedbacks.map((feedback) => (
                      <TableRow key={feedback.id} className={`border-b border-gray-200 dark:border-gray-700 ${deletingFeedbacks.has(feedback.id) ? 'feedback-deleting' : ''} ${editingFeedbacks.has(feedback.id) ? 'feedback-editing' : ''}`}>
                        {editedFeedbacks.has(feedback.id) && (
                          <div className="feedback-edited-flag">✓</div>
                        )}
                        <TableCell className="w-32">
                          <div className="text-sm font-medium">
                            {formatDateBR(feedback.date)}
                          </div>
                        </TableCell>
                        <TableCell className="w-32">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">⭐{feedback.rating}</span>
                            {getSentimentBadge(feedback.rating)}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-96">
                          <div className={`${showDetails[feedback.id] ? '' : 'line-clamp-2'} text-sm`}>
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
                        <TableCell className="w-48">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                {feedback.keyword || 'Não identificado'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-48">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                {feedback.sector || 'Não identificado'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-32">
                          <EditFeedbackModal feedback={feedback} onSave={handleFeedbackSaved} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
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

        {/* Tabela de Análises Recentes */}
        {recentAnalyses.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold">Análises Recentes</h3>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-600">
                {recentAnalyses.length} reclassificação{recentAnalyses.length !== 1 ? 'ões' : ''} nos últimos 7 dias
              </Badge>
            </div>
            
            <div className="table-with-fixed-header" style={{ height: '500px' }}>
              <Table>
                <TableHeader className="fixed-header">
                  <TableRow>
                    <TableHead className="text-white font-semibold w-40">Data Modificação</TableHead>
                    <TableHead className="text-white font-semibold min-w-80">Comentário</TableHead>
                    <TableHead className="text-white font-semibold w-24">⭐ Nota</TableHead>
                    <TableHead className="text-white font-semibold w-64">Classificação Anterior</TableHead>
                    <TableHead className="text-white font-semibold w-64">Nova Classificação</TableHead>
                    <TableHead className="text-white font-semibold w-40">Modificado por</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              
              <div className="scrollable-body custom-scrollbar">
                <Table>
                  <TableBody>
                {recentAnalyses.map((analysis) => (
                  <TableRow key={`${analysis.id}-${analysis.modifiedAt}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {formatDateBR(analysis.modifiedAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(analysis.modifiedAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={analysis.comment}>
                        {analysis.comment}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateBR(analysis.date)} • {analysis.source}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{analysis.rating}</span>
                        {getSentimentBadge(analysis.rating)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            {analysis.oldClassification.sector}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                            {analysis.oldClassification.keyword}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs bg-red-50 text-red-600">
                            {analysis.oldClassification.problem || 'Não identificado'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={cn("text-xs border font-medium", getSectorColor(analysis.newClassification.sector))}>
                            {analysis.newClassification.sector}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <KeywordBadge keyword={analysis.newClassification.keyword} sector={analysis.newClassification.sector} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {analysis.newClassification.problem === 'VAZIO' ? (
                              <span className="italic text-gray-500">Sem problemas</span>
                            ) : (
                              analysis.newClassification.problem
                            )}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {analysis.modifiedBy}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Histórico de Correções</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Esta tabela mostra as correções manuais feitas nos últimos 7 dias. As classificações antigas (em vermelho) foram 
                corrigidas para as novas classificações (em cores por departamento) e agora aparecem nos dashboards principais.
              </p>
            </div>
          </Card>
        )}        </div>
        
        {/* Indicador de exclusão */}
        {showDeletedIndicator && (
          <div className="feedback-deleted-indicator">
            Feedback excluído com sucesso!
          </div>
        )}
        
        {/* Indicador de edição */}
        {showEditedIndicator && (
          <div className="feedback-edited-indicator">
            Feedback editado com sucesso!
          </div>
        )}
      </SharedDashboardLayout>
    )
}