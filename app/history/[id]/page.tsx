'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAnalysisById, getAllAnalyses, updateFeedbackInFirestore } from '@/lib/firestore-service';
import { formatDateBR, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, AlertCircle, Eye, EyeOff, Edit3, Save, X, Plus, Trash2, Star, Calendar, MessageSquare, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import SharedDashboardLayout from '../../shared-layout';

// Estilos CSS para rolagem otimizada
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

  /* Modo escuro */
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

  /* Layout da tabela com scroll simples */
  .table-container {
    max-height: 600px;
    overflow: auto;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .table-container::-webkit-scrollbar {
    width: 16px !important;
    height: 16px !important;
    background: #e2e8f0 !important;
  }

  .table-container::-webkit-scrollbar-track {
    background: #e2e8f0 !important;
    border-radius: 8px !important;
  }

  .table-container::-webkit-scrollbar-thumb {
    background: #64748b !important;
    border-radius: 8px !important;
    border: 2px solid #e2e8f0 !important;
    min-height: 40px !important;
  }

  .table-container::-webkit-scrollbar-thumb:hover {
    background: #475569 !important;
  }

  .table-container::-webkit-scrollbar-corner {
    background: #e2e8f0 !important;
  }

  .dark .table-container {
    border-color: #374151;
  }

  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
`;

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
  return sectorColors[sector?.trim()] || 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-800';
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
      setKeywordInput(keyword);
    }
    setKeywordInputMode(!keywordInputMode);
  };

  const handleProblemInputModeToggle = () => {
    if (!problemInputMode) {
      setProblemInput(problemText);
    }
    setProblemInputMode(!problemInputMode);
  };

  const handleKeywordInputSave = () => {
    if (keywordInput.trim()) {
      setKeyword(keywordInput.trim());
      setKeywordInputMode(false);
    }
  };

  const handleProblemInputSave = () => {
    if (problemInput.trim()) {
      setProblemText(problemInput.trim());
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
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="text-sm"
                placeholder="Digite palavra-chave personalizada"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleKeywordInputSave} className="text-xs">
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
                onClick={handleKeywordInputModeToggle}
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
                className="text-sm"
                placeholder="Digite problema personalizado"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleProblemInputSave} className="text-xs">
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
                onClick={handleProblemInputModeToggle}
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
const EditFeedbackModal = ({ feedback, onSave }: { feedback: any, onSave: (updatedFeedback: any) => void }) => {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedProblems, setEditedProblems] = useState<Array<{id: string, keyword: string, sector: string, problem: string}>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    // Inicializar problemas para edição
    if (feedback.allProblems && feedback.allProblems.length > 0) {
      setEditedProblems(feedback.allProblems.map((problem: any, index: number) => ({
        id: `problem-${Date.now()}-${index}`,
        ...problem
      })))
    } else {
      // Converter formato antigo para novo
      const keywords = feedback.keyword?.split(';').map((k: string) => k.trim()) || ['']
      const sectors = feedback.sector?.split(';').map((s: string) => s.trim()) || ['']
      const problems = feedback.problem ? feedback.problem.split(';').map((p: string) => p.trim()) : ['']
      
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
        description: "As alterações foram salvas com sucesso e aparecerão nos dashboards.",
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
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Editar Feedback - {feedback.rating} estrelas
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
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
              <p className="text-sm font-medium text-muted-foreground mb-1">Fonte</p>
              <Badge className="bg-blue-100 text-blue-800">{feedback.source || 'Web'}</Badge>
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
                    Você está corrigindo a classificação da IA. Após salvar, as alterações aparecerão nos dashboards.
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
              <div className="space-y-4">
                {/* Mostrar múltiplos problemas se existirem */}
                {editedProblems.map((problem, index) => (
                  <div key={problem.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Departamento</h4>
                      <Badge variant="outline" className={cn("text-sm border font-medium", getSectorColor(problem.sector))}>
                        {problem.sector}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Palavra-chave</h4>
                      <KeywordBadge keyword={problem.keyword} sector={problem.sector} />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Problema</h4>
                      <Badge variant="secondary" className="text-sm">
                        {problem.problem === 'VAZIO' ? (
                          <span className="italic text-gray-500">Sem problemas</span>
                        ) : (
                          problem.problem
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AnalysisDetailPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const params = useParams();
  const router = useRouter();
  const { userData } = useAuth();
  const { toast } = useToast();
  const id = params?.id as string;

  // Injetar estilos de rolagem
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = scrollbarStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    fetchAnalysisData();
  }, [id, userData]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!id || !userData?.hotelId) {
        setError('ID da análise ou dados do usuário não encontrados');
        return;
      }

      // Buscar todas as análises e encontrar a que tem o ID correspondente
      const allAnalyses = await getAllAnalyses();
      
      if (!allAnalyses || allAnalyses.length === 0) {
        setError('Nenhuma análise encontrada');
        return;
      }

      // Filtrar análises do hotel do usuário
      const userHotelAnalyses = allAnalyses.filter((analysis: any) => 
        analysis.hotelId === userData.hotelId
      );

      // Encontrar a análise específica
      const specificAnalysis = userHotelAnalyses.find((analysis: any) => analysis.id === id);

      if (!specificAnalysis) {
        setError('Análise não encontrada');
        return;
      }

      setAnalysis(specificAnalysis);

      // Extrair os feedbacks da análise
      if (specificAnalysis.data && Array.isArray(specificAnalysis.data)) {
        setFeedbacks(specificAnalysis.data);
      } else {
        setFeedbacks([]);
      }

    } catch (err) {
      console.error('Erro ao carregar análise:', err);
      setError('Erro ao carregar a análise');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackUpdate = (updatedFeedback: any) => {
    setFeedbacks(prev => prev.map(feedback => 
      feedback.id === updatedFeedback.id ? updatedFeedback : feedback
    ));
    
    toast({
      title: "Feedback Atualizado",
      description: "As alterações foram salvas e aparecerão nos dashboards.",
    });
  };

  const toggleDetails = (feedbackId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [feedbackId]: !prev[feedbackId]
    }));
  };

  const getSentimentBadge = (rating: number) => {
    if (rating >= 4) return <Badge className="bg-green-100 text-green-800">Positivo</Badge>;
    if (rating <= 2) return <Badge className="bg-red-100 text-red-800">Negativo</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Neutro</Badge>;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data desconhecida';
    
    try {
      const date = timestamp.toDate();
      return formatDateBR(date);
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <SharedDashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  if (error) {
    return (
      <SharedDashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </Card>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-blue-700">{analysis?.hotelName || 'Análise de Feedbacks'}</h1>
            <p className="text-muted-foreground">
              Importado em: {formatDate(analysis?.importDate)} • {feedbacks.length} comentários
            </p>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
                <p className="text-xl font-bold">
                  {feedbacks.length > 0 
                    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div>
                <p className="text-sm text-muted-foreground">Positivos</p>
                <p className="text-xl font-bold text-green-600">
                  {feedbacks.filter(f => f.rating >= 4).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div>
                <p className="text-sm text-muted-foreground">Neutros</p>
                <p className="text-xl font-bold text-yellow-600">
                  {feedbacks.filter(f => f.rating === 3).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div>
                <p className="text-sm text-muted-foreground">Negativos</p>
                <p className="text-xl font-bold text-red-600">
                  {feedbacks.filter(f => f.rating <= 2).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista de Feedbacks */}
        {feedbacks.length > 0 ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Comentários ({feedbacks.length})</h3>
            </div>
            <div className="table-container custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Avaliação
                      </div>
                    </TableHead>
                    <TableHead className="w-[300px]">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comentário
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Palavra-chave
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px]">
                      Departamento
                    </TableHead>
                    <TableHead className="w-[100px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell className="w-[120px]">
                        {formatDateBR(feedback.date)}
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">⭐{feedback.rating}</span>
                          {getSentimentBadge(feedback.rating)}
                        </div>
                      </TableCell>
                      <TableCell className="w-[300px]">
                        <div className={`${showDetails[feedback.id] ? '' : 'line-clamp-2'}`}>
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
                      <TableCell className="w-[180px]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <KeywordBadge keyword={feedback.keyword} sector={feedback.sector} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className={cn("text-sm border font-medium", getSectorColor(feedback.sector))}>
                              {feedback.sector}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <EditFeedbackModal feedback={feedback} onSave={handleFeedbackUpdate} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-600">Nenhum Comentário</h3>
                <p className="text-muted-foreground">
                  Esta análise não contém comentários para exibir.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </SharedDashboardLayout>
  );
}