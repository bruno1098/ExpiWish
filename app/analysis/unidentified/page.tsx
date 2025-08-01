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
import { getAllAnalyses, updateFeedbackInFirestore, saveRecentEdit } from "@/lib/firestore-service"
import SharedDashboardLayout from "../../shared-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

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
  allProblems?: Array<{keyword: string, sector: string, problem: string}>
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

// Função para obter a cor com base no departamento
const getSectorColor = (sector: string) => {
  return sectorColors[sector.trim()] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
};

// Componente para badges de palavra-chave
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
  const [sectorInputMode, setSectorInputMode] = useState(false);
  const [problemInputMode, setProblemInputMode] = useState(false);

  useEffect(() => {
    onUpdate({ keyword, sector, problem: problemText });
  }, [keyword, sector, problemText, onUpdate]);

  const handleProblemChange = (value: string) => {
    setProblemText(value);
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
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
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
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="text-sm"
                placeholder="Digite departamento personalizado"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setSectorInputMode(false)} className="text-xs">
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
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
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
  const [editedProblems, setEditedProblems] = useState<Array<{id: string, keyword: string, sector: string, problem: string}>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
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
          problem: problems[i] || problems[0] || 'VAZIO'
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
      
      // Salvar no Firebase
      await updateFeedbackInFirestore(feedback.id, updatedFeedback)
      
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

  const handleDeleteFeedback = async () => {
    // Confirmação antes de excluir
    if (!window.confirm('Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.')) {
      return
    }

    setIsDeleting(true)
    
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
                    onClick={handleAddProblem}
                    className="w-full border-dashed border-2 h-12 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Problema ({editedProblems.length}/3)
                  </Button>
                )}
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

  const loadRecentAnalyses = () => {
    try {
      const stored = localStorage.getItem('recent-analyses')
      if (stored) {
        const analyses = JSON.parse(stored)
        // Filtrar apenas os últimos 10 e dos últimos 7 dias
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const filtered = analyses
          .filter((analysis: RecentAnalysis) => new Date(analysis.modifiedAt) > sevenDaysAgo)
          .slice(0, 10)
        
        setRecentAnalyses(filtered)
      }
    } catch (error) {
      console.error('Erro ao carregar análises recentes:', error)
    }
  }

  useEffect(() => {
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
          
          feedbacksToAnalyze = parsedFeedbacks
        } catch (error) {
          console.error('Erro ao parsear localStorage:', error)
        }
      }
      
      // Se não tem dados no localStorage, buscar do Firebase
      if (feedbacksToAnalyze.length === 0) {
        
        const allAnalyses = await getAllAnalyses()
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
      
      // Remove se já existe e adiciona no início
      const filtered = existing.filter((analysis: RecentAnalysis) => analysis.id !== recentAnalysis.id)
      const updated = [recentAnalysis, ...filtered].slice(0, 20) // Manter apenas 20
      
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
    
    // Remove da lista de não identificados
    setUnidentifiedFeedbacks(prev => prev.filter(f => f.id !== updatedFeedback.id))
    
    toast({
      title: "Feedback Reclassificado",
      description: "O feedback foi corrigido e agora aparece nos dashboards principais.",
    })
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
                      <TableRow key={feedback.id} className="border-b border-gray-200 dark:border-gray-700">
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
        )}
        </div>
      </SharedDashboardLayout>
    )
}