"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Eye, Trash2, Save, X, Plus, Check, Edit3, Search } from 'lucide-react';
import { 
  getDynamicLists, 
  addKeyword, 
  addProblem, 
  addDepartment,
  type DynamicLists 
} from '@/lib/dynamic-lists-service';
import { Textarea } from '@/components/ui/textarea';
import QuickListManager from '@/components/quick-list-manager';

// 🎨 Função para destacar termos de busca
const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  const searchLower = searchTerm.toLowerCase().trim();
  const textLower = text.toLowerCase();
  
  // Buscar todas as palavras do termo de busca
  const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
  
  let highlightedText = text;
  const highlights: Array<{start: number, end: number}> = [];
  
  // Primeiro, tentar match do termo completo
  const completeMatchIndex = textLower.indexOf(searchLower);
  if (completeMatchIndex !== -1) {
    highlights.push({
      start: completeMatchIndex,
      end: completeMatchIndex + searchLower.length
    });
  } else {
    // Se não encontrar termo completo, buscar palavras individuais
    searchWords.forEach(word => {
      let startIndex = 0;
      while ((startIndex = textLower.indexOf(word, startIndex)) !== -1) {
        highlights.push({
          start: startIndex,
          end: startIndex + word.length
        });
        startIndex += word.length;
      }
    });
  }
  
  // Ordenar e mesclar highlights sobrepostos
  highlights.sort((a, b) => a.start - b.start);
  const mergedHighlights: Array<{start: number, end: number}> = [];
  
  highlights.forEach(highlight => {
    if (mergedHighlights.length === 0) {
      mergedHighlights.push(highlight);
    } else {
      const last = mergedHighlights[mergedHighlights.length - 1];
      if (highlight.start <= last.end) {
        last.end = Math.max(last.end, highlight.end);
      } else {
        mergedHighlights.push(highlight);
      }
    }
  });
  
  // Construir JSX com highlights
  if (mergedHighlights.length === 0) return text;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  mergedHighlights.forEach((highlight, index) => {
    // Texto antes do highlight
    if (highlight.start > lastIndex) {
      parts.push(text.substring(lastIndex, highlight.start));
    }
    // Texto destacado
    parts.push(
      <span key={index} className="bg-yellow-200 dark:bg-yellow-600 font-semibold px-0.5 rounded">
        {text.substring(highlight.start, highlight.end)}
      </span>
    );
    lastIndex = highlight.end;
  });
  
  // Texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return <>{parts}</>;
};

// Cores para departamentos
const getSectorColor = (sector: string) => {
  const colorMap: Record<string, string> = {
    'A&B': 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm',
    'Governança': 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 shadow-sm',
    'Manutenção': 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/40 dark:to-red-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm',
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
  return colorMap[sector] || 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 shadow-sm';
};

const KeywordBadge = ({ keyword, sector }: { keyword: string, sector: string }) => {
  return (
    <Badge variant="outline" className={cn("text-sm border font-medium", getSectorColor(sector))}>
      {keyword}
    </Badge>
  );
};

interface ProblemData {
  id: string;
  keyword: string;
  sector: string;
  problem: string;
  problem_detail?: string; // detalhe opcional do problema
}

interface EnhancedProblemEditorProps {
  problem: ProblemData;
  onUpdate: (updated: {
    keyword: string;
    sector: string;
    problem: string;
    problem_detail?: string; // incluir detalhe opcional
  }) => void;
  onRemove?: () => void;
  canRemove?: boolean;
  organizedKeywords?: Record<string, string[]>; // keywords organizados por tópicos
  onKeywordsUpdated?: () => void; // callback para atualizar keywords na página principal
}

export const EnhancedProblemEditor: React.FC<EnhancedProblemEditorProps> = ({ 
  problem, 
  onUpdate, 
  onRemove, 
  canRemove = true,
  organizedKeywords,
  onKeywordsUpdated
}) => {
  const { toast } = useToast();
  
    // 🚀 OTIMIZAÇÃO: Refs para timeout cleanup
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const selectContentRef = useRef<HTMLDivElement>(null);
  
  // Estados locais
  const [keyword, setKeyword] = useState(problem.keyword);
  const [sector, setSector] = useState(problem.sector);
  const [problemText, setProblemText] = useState(problem.problem);
  const [problemDetail, setProblemDetail] = useState(problem.problem_detail || '')
  
  // Estados para listas dinâmicas
  const [dynamicLists, setDynamicLists] = useState<DynamicLists | null>(null);
  const [listsLoading, setListsLoading] = useState(true);
  
  // Estados para modos de edição
  const [keywordInputMode, setKeywordInputMode] = useState(false);
  const [problemInputMode, setProblemInputMode] = useState(false);
  const [departmentInputMode, setDepartmentInputMode] = useState(false);
  
  // Estados para inputs personalizados
  const [keywordInput, setKeywordInput] = useState('');
  const [problemInput, setProblemInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  
  // Estados para feedback visual
  const [keywordJustSaved, setKeywordJustSaved] = useState(false);
  const [problemJustSaved, setProblemJustSaved] = useState(false);
  const [departmentJustSaved, setDepartmentJustSaved] = useState(false);
  
  // Estados para salvamento
  const [savingKeyword, setSavingKeyword] = useState(false);
  const [savingProblem, setSavingProblem] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  
  // 🔍 Estados para busca nos selects
  const [keywordSearch, setKeywordSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  
  // Refs para os campos de busca
  const keywordSearchRef = useRef<HTMLInputElement>(null);
  const departmentSearchRef = useRef<HTMLInputElement>(null);
  const problemSearchRef = useRef<HTMLInputElement>(null);

  // Carregar listas dinâmicas
  useEffect(() => {
    const loadDynamicLists = async () => {
      try {
        const lists = await getDynamicLists();
        setDynamicLists(lists);
      } catch (error) {
        console.error('Erro ao carregar listas dinâmicas:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as listas de opções",
          variant: "destructive"
        });
      } finally {
        setListsLoading(false);
      }
    };
    
    loadDynamicLists();
  }, [toast]);

  // Função para recarregar listas após alterações
  const reloadLists = async () => {
    try {
      console.log('🔄 Recarregando listas dinâmicas...');
      const updatedLists = await getDynamicLists();
      setDynamicLists(updatedLists);
      console.log('✅ Listas atualizadas:', updatedLists);
      
      // Chamar callback para atualizar keywords na página principal
      if (onKeywordsUpdated) {
        onKeywordsUpdated();
      }
      
      // Verificar se o item atual ainda existe nas listas atualizadas
      if (keyword && !updatedLists.keywords.includes(keyword)) {
        setKeyword(''); // Limpar seleção se o item foi removido
      }
      if (sector && !updatedLists.departments.includes(sector)) {
        setSector(''); // Limpar seleção se o item foi removido
      }
      if (problemText && !updatedLists.problems.includes(problemText)) {
        setProblemText(''); // Limpar seleção se o item foi removido
      }
    } catch (error) {
      console.error('Erro ao recarregar listas:', error);
    }
  };

  // Definir commonProblems baseado nas listas dinâmicas
  const commonProblems = dynamicLists?.problems || [];
  
  // 🔍 Remover useEffect problemático - deixar o input gerenciar seu próprio foco
  
  // 🔍 BUSCA AVANÇADA: Sistema de score e relevância
  const calculateSearchScore = useCallback((text: string, searchTerm: string): number => {
    if (!searchTerm) return 0;
    
    const textLower = text.toLowerCase();
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Match exato = score máximo
    if (textLower === searchLower) return 1000;
    
    // Começa com o termo = score alto
    if (textLower.startsWith(searchLower)) return 500;
    
    // Contém o termo completo = score médio
    if (textLower.includes(searchLower)) return 100;
    
    // Busca por palavras individuais
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
    let wordScore = 0;
    
    searchWords.forEach(word => {
      if (textLower.includes(word)) {
        wordScore += 50 / searchWords.length;
      }
      // Palavra no início
      if (textLower.startsWith(word)) {
        wordScore += 30 / searchWords.length;
      }
    });
    
    // Fuzzy match simples - tolera 1-2 caracteres de diferença
    const distance = calculateLevenshteinDistance(textLower, searchLower);
    if (distance <= 2 && searchLower.length > 3) {
      wordScore += 20;
    }
    
    return wordScore;
  }, []);
  
  // Levenshtein distance para fuzzy search
  const calculateLevenshteinDistance = useCallback((str1: string, str2: string): number => {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }, []);
  
  // 🔍 Valores filtrados memoizados com ordenação por relevância
  const filteredKeywords = useMemo(() => {
    if (!organizedKeywords) {
      const keywords = dynamicLists?.keywords || [];
      if (!keywordSearch.trim()) return keywords;
      
      // Calcular scores e ordenar por relevância
      const keywordsWithScores = keywords
        .map(kw => ({
          keyword: kw,
          score: calculateSearchScore(kw, keywordSearch)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.keyword);
      
      return keywordsWithScores;
    }
    
    // Filtrar keywords organizados
    if (!keywordSearch.trim()) return organizedKeywords;
    
    const filtered: Record<string, string[]> = {};
    
    Object.entries(organizedKeywords).forEach(([topic, keywords]) => {
      // Calcular scores apenas para keywords, NÃO para o nome do departamento
      const keywordsWithScores = keywords
        .map(kw => ({
          keyword: kw,
          score: calculateSearchScore(kw, keywordSearch)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.keyword);
      
      if (keywordsWithScores.length > 0) {
        filtered[topic] = keywordsWithScores;
      }
    });
    
    return filtered;
  }, [keywordSearch, organizedKeywords, dynamicLists?.keywords, calculateSearchScore]);
  
  const filteredDepartments = useMemo(() => {
    const departments = dynamicLists?.departments || [];
    if (!departmentSearch.trim()) return departments;
    
    // Ordenar departamentos por relevância
    const departmentsWithScores = departments
      .map(dept => ({
        department: dept,
        score: calculateSearchScore(dept, departmentSearch)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.department);
    
    return departmentsWithScores;
  }, [departmentSearch, dynamicLists?.departments, calculateSearchScore]);
  
  const filteredProblems = useMemo(() => {
    if (!problemSearch.trim()) return commonProblems;
    
    // Ordenar problemas por relevância
    const problemsWithScores = commonProblems
      .map(prob => ({
        problem: prob,
        score: calculateSearchScore(prob, problemSearch)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.problem);
    
    return problemsWithScores;
  }, [problemSearch, commonProblems, calculateSearchScore]);

  // 🚀 OTIMIZAÇÃO: Debounce para evitar calls excessivos durante digitação
  useEffect(() => {
    // Limpar timeout anterior se existir
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate({ keyword, sector, problem: problemText, problem_detail: problemDetail })
      updateTimeoutRef.current = null;
    }, 300) // 300ms debounce
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    }
  }, [keyword, sector, problemText, problemDetail, onUpdate])

  // 🚀 CLEANUP: Limpar todos os timeouts no unmount
  useEffect(() => {
    return () => {
      // Limpar timeout de update
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Limpar timeouts de success feedback
      successTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      successTimeoutRefs.current = [];
    };
  }, []);

  // 🚀 OTIMIZADO: Função para mostrar feedback visual de sucesso com cleanup
  const showSuccessFeedback = useCallback((type: 'keyword' | 'problem' | 'department') => {
    const timeoutId = setTimeout(() => {
      switch (type) {
        case 'keyword':
          setKeywordJustSaved(false);
          break;
        case 'problem':
          setProblemJustSaved(false);
          break;
        case 'department':
          setDepartmentJustSaved(false);
          break;
      }
      // Remover da lista de timeouts ativos
      successTimeoutRefs.current = successTimeoutRefs.current.filter(id => id !== timeoutId);
    }, 3000);
    
    // Adicionar à lista de timeouts para cleanup
    successTimeoutRefs.current.push(timeoutId);
    
    // Definir estado imediatamente
    switch (type) {
      case 'keyword':
        setKeywordJustSaved(true);
        break;
      case 'problem':
        setProblemJustSaved(true);
        break;
      case 'department':
        setDepartmentJustSaved(true);
        break;
    }
  }, []);

  // Handlers para palavra-chave
  const handleKeywordInputModeToggle = () => {
    // Se há conteúdo e não está na lista, mostrar como seleção
    if (keyword && dynamicLists && !dynamicLists.keywords.includes(keyword)) {
      // Forçar modo de seleção para mostrar a lista
      setKeywordInputMode(false);
      return;
    }
    
    if (!keywordInputMode) {
      setKeywordInput(keyword || '');
    }
    setKeywordInputMode(!keywordInputMode);
  };

  const handleKeywordInputSave = async () => {
    const trimmedValue = keywordInput.trim();
    if (!trimmedValue) {
      toast({
        title: "Erro",
        description: "Palavra-chave não pode estar vazia",
        variant: "destructive"
      });
      return;
    }

    setSavingKeyword(true);
    try {
      // Se não está na lista atual, adicionar ao Firebase
      if (dynamicLists && !dynamicLists.keywords.includes(trimmedValue)) {
        const success = await addKeyword(trimmedValue);
        if (success) {
          // Recarregar listas
          const updatedLists = await getDynamicLists();
          setDynamicLists(updatedLists);
          
          toast({
            title: "Sucesso",
            description: `Palavra-chave "${trimmedValue}" adicionada à lista global`,
          });
        } else {
          throw new Error('Falha ao salvar no Firebase');
        }
      }
      
      setKeyword(trimmedValue);
      setKeywordInputMode(false);
      showSuccessFeedback('keyword');
      
    } catch (error) {
      console.error('Erro ao salvar palavra-chave:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a palavra-chave",
        variant: "destructive"
      });
    } finally {
      setSavingKeyword(false);
    }
  };

  // Handlers para problema
  const handleProblemInputModeToggle = () => {
    // Se há conteúdo e não está na lista, mostrar como seleção
    if (problemText && dynamicLists && !dynamicLists.problems.includes(problemText)) {
      // Forçar modo de seleção para mostrar a lista
      setProblemInputMode(false);
      return;
    }
    
    if (!problemInputMode) {
      setProblemInput(problemText || '');
    }
    setProblemInputMode(!problemInputMode);
  };

  // NOVO: handler para mudança via Select de problema
  const handleProblemChange = (value: string) => {
    setProblemText(value);
    if (value !== 'VAZIO') {
      setProblemInputMode(false);
    }
  };

  const handleProblemInputSave = async () => {
    const trimmedValue = problemInput.trim();
    if (!trimmedValue) {
      toast({
        title: "Erro",
        description: "Problema não pode estar vazio",
        variant: "destructive"
      });
      return;
    }

    setSavingProblem(true);
    try {
      // Se não está na lista atual, adicionar ao Firebase
      if (dynamicLists && !dynamicLists.problems.includes(trimmedValue)) {
        const success = await addProblem(trimmedValue);
        if (success) {
          // Recarregar listas
          const updatedLists = await getDynamicLists();
          setDynamicLists(updatedLists);
          
          toast({
            title: "Sucesso",
            description: `Problema "${trimmedValue}" adicionado à lista global`,
          });
        } else {
          throw new Error('Falha ao salvar no Firebase');
        }
      }
      
      setProblemText(trimmedValue);
      setProblemInputMode(false);
      showSuccessFeedback('problem');
      
    } catch (error) {
      console.error('Erro ao salvar problema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o problema",
        variant: "destructive"
      });
    } finally {
      setSavingProblem(false);
    }
  };

  // Handlers para departamento
  const handleDepartmentInputModeToggle = () => {
    // Se há conteúdo e não está na lista, mostrar como seleção
    if (sector && dynamicLists && !dynamicLists.departments.includes(sector)) {
      // Forçar modo de seleção para mostrar a lista
      setDepartmentInputMode(false);
      return;
    }
    
    if (!departmentInputMode) {
      setDepartmentInput(sector || '');
    }
    setDepartmentInputMode(!departmentInputMode);
  };

  const handleDepartmentInputSave = async () => {
    const trimmedValue = departmentInput.trim();
    if (!trimmedValue) {
      toast({
        title: "Erro",
        description: "Departamento não pode estar vazio",
        variant: "destructive"
      });
      return;
    }

    setSavingDepartment(true);
    try {
      // Se não está na lista atual, adicionar ao Firebase
      if (dynamicLists && !dynamicLists.departments.includes(trimmedValue)) {
        const success = await addDepartment(trimmedValue);
        if (success) {
          // Recarregar listas
          const updatedLists = await getDynamicLists();
          setDynamicLists(updatedLists);
          
          toast({
            title: "Sucesso",
            description: `Departamento "${trimmedValue}" adicionado à lista global`,
          });
        } else {
          throw new Error('Falha ao salvar no Firebase');
        }
      }
      
      setSector(trimmedValue);
      setDepartmentInputMode(false);
      showSuccessFeedback('department');
      
    } catch (error) {
      console.error('Erro ao salvar departamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o departamento",
        variant: "destructive"
      });
    } finally {
      setSavingDepartment(false);
    }
  };

  if (listsLoading) {
    return (
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-9 bg-gray-300 rounded"></div>
            <div className="h-9 bg-gray-300 rounded"></div>
            <div className="h-9 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Palavra-chave
            </label>
            {dynamicLists && (
              <QuickListManager 
                type="keyword"
                lists={dynamicLists}
                onListsUpdated={reloadLists}
                currentValue={keyword}
                onValueChange={setKeyword}
              />
            )}
          </div>
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
                className="text-sm focus:ring-blue-200 dark:focus:ring-blue-800"
                placeholder="Digite palavra-chave personalizada"
                autoFocus
                disabled={savingKeyword}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleKeywordInputSave}
                  disabled={savingKeyword}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingKeyword ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      Salvar
                    </div>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setKeywordInput(keyword);
                    setKeywordInputMode(false);
                  }}
                  disabled={savingKeyword}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={keyword} onValueChange={setKeyword} onOpenChange={(open) => {
                // Quando abrir, rolar para o topo com múltiplas tentativas
                if (open) {
                  // Tentativa imediata
                  setTimeout(() => {
                    const selectors = [
                      '[data-radix-select-content]',
                      '[role="listbox"]',
                      '.max-h-80'
                    ];
                    
                    for (const selector of selectors) {
                      const element = document.querySelector(selector);
                      if (element) {
                        element.scrollTop = 0;
                        console.log('🔝 Scroll resetado para o topo:', selector);
                        break;
                      }
                    }
                  }, 10);
                  
                  // Tentativa adicional após mais tempo
                  setTimeout(() => {
                    const elements = document.querySelectorAll('[data-radix-select-content], [role="listbox"], .max-h-80');
                    elements.forEach((element, index) => {
                      if (element) {
                        element.scrollTop = 0;
                        console.log(`🔝 Scroll resetado (tentativa 2) - elemento ${index}`);
                      }
                    });
                  }, 100);
                }
              }}>
                <SelectTrigger className={cn(
                  "h-9",
                  keywordJustSaved 
                    ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 shadow-md ring-2 ring-green-200 dark:ring-green-800" 
                    : dynamicLists && !dynamicLists.keywords.includes(keyword) && keyword
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                    : ""
                )}>
                  <div className="flex items-center justify-between w-full">
                    <span>{keyword || "Selecione palavra-chave"}</span>
                    <div className="flex items-center gap-1">
                      {keywordJustSaved && (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                      )}
                      {dynamicLists && !dynamicLists.keywords.includes(keyword) && keyword && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          Personalizado
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {/* 🔍 Campo de busca dentro do dropdown */}
                  <div 
                    className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b z-10"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <Input
                        ref={keywordSearchRef}
                        placeholder="🔍 Buscar... (Ctrl+F)"
                        value={keywordSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setKeywordSearch(e.target.value);
                          
                          // 📌 Scroll automático para o topo após filtrar
                          setTimeout(() => {
                            const selectContent = e.target.closest('[data-radix-select-content]');
                            if (selectContent) {
                              selectContent.scrollTop = 0;
                            }
                          }, 50);
                        }}
                        className="pl-8 pr-8 h-8 text-sm"
                        autoFocus
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => {
                          e.stopPropagation();
                          // Garantir que o input mantenha o foco
                          e.target.focus();
                        }}
                        onBlur={(e) => {
                          // Prevenir perda de foco durante digitação
                          if (keywordSearch) {
                            setTimeout(() => {
                              if (keywordSearchRef.current && document.activeElement !== keywordSearchRef.current) {
                                keywordSearchRef.current.focus();
                              }
                            }, 0);
                          }
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') {
                            setKeywordSearch('');
                            keywordSearchRef.current?.focus();
                          }
                        }}
                      />
                      {keywordSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setKeywordSearch('');
                            keywordSearchRef.current?.focus();
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {keywordSearch && (
                      <div className="text-xs mt-1 flex items-center justify-between">
                        <span className="text-gray-500">
                          {(() => {
                            const count = typeof filteredKeywords === 'object' && !Array.isArray(filteredKeywords)
                              ? Object.values(filteredKeywords).flat().length
                              : filteredKeywords.length;
                            return `${count} resultado${count !== 1 ? 's' : ''}`;
                          })()}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Ordenado por relevância
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {typeof filteredKeywords === 'object' && !Array.isArray(filteredKeywords) ? (
                      // Keywords organizados
                      Object.entries(filteredKeywords).map(([topic, keywords]) => (
                        <div key={topic}>
                          <div className="px-2 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b">
                            📁 {topic}
                          </div>
                          {(keywords as string[]).map((kw: string) => (
                            <SelectItem key={kw} value={kw} className="pl-6">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0", 
                                  getSectorColor(topic).split(' ').find(c => c.startsWith('from-'))?.replace('from-', 'bg-') || 'bg-gray-300'
                                )} />
                                <span className="flex-1">{highlightSearchTerm(kw, keywordSearch)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))
                    ) : (
                      // Lista simples
                      (filteredKeywords as string[]).map((kw: string) => (
                        <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleKeywordInputModeToggle}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Personalizar
                </div>
              </Button>
            </div>
          )}
        </div>

        {/* Departamento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Departamento
            </label>
            {dynamicLists && (
              <QuickListManager 
                type="department"
                lists={dynamicLists}
                onListsUpdated={reloadLists}
                currentValue={sector}
                onValueChange={setSector}
              />
            )}
          </div>
          {departmentInputMode ? (
            <div className="space-y-2">
              <Input
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDepartmentInputSave();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setDepartmentInput(sector);
                    setDepartmentInputMode(false);
                  }
                }}
                className="text-sm focus:ring-purple-200 dark:focus:ring-purple-800"
                placeholder="Digite departamento personalizado"
                autoFocus
                disabled={savingDepartment}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleDepartmentInputSave}
                  disabled={savingDepartment}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {savingDepartment ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      Salvar
                    </div>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setDepartmentInput(sector);
                    setDepartmentInputMode(false);
                  }}
                  disabled={savingDepartment}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className={cn(
                  "h-9",
                  departmentJustSaved 
                    ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 shadow-md ring-2 ring-green-200 dark:ring-green-800" 
                    : dynamicLists && !dynamicLists.departments.includes(sector) && sector
                    ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                    : ""
                )}>
                  <div className="flex items-center justify-between w-full">
                    <span>{sector || "Selecione departamento"}</span>
                    <div className="flex items-center gap-1">
                      {departmentJustSaved && (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                      )}
                      {dynamicLists && !dynamicLists.departments.includes(sector) && sector && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          Personalizado
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {/* 🔍 Campo de busca dentro do dropdown */}
                  <div 
                    className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b z-10"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <Input
                        ref={departmentSearchRef}
                        placeholder="🔍 Buscar departamento... (Ctrl+F)"
                        value={departmentSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setDepartmentSearch(e.target.value);
                          
                          // 📌 Scroll automático para o topo após filtrar
                          setTimeout(() => {
                            const selectContent = e.target.closest('[data-radix-select-content]');
                            if (selectContent) {
                              selectContent.scrollTop = 0;
                            }
                          }, 50);
                        }}
                        className="pl-8 pr-8 h-8 text-sm"
                        autoFocus
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => {
                          e.stopPropagation();
                          e.target.focus();
                        }}
                        onBlur={(e) => {
                          if (departmentSearch) {
                            setTimeout(() => {
                              if (departmentSearchRef.current && document.activeElement !== departmentSearchRef.current) {
                                departmentSearchRef.current.focus();
                              }
                            }, 0);
                          }
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') {
                            setDepartmentSearch('');
                            departmentSearchRef.current?.focus();
                          }
                        }}
                      />
                      {departmentSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDepartmentSearch('');
                            departmentSearchRef.current?.focus();
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                        >
                          <X className="h-3 w-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                    {departmentSearch && (
                      <div className="text-xs mt-1 flex items-center justify-between">
                        <span className="text-gray-500">
                          {filteredDepartments.length} resultado{filteredDepartments.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          Ordenado por relevância
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredDepartments.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Nenhum departamento encontrado
                      </div>
                    ) : (
                      filteredDepartments.map((dept: string) => (
                        <SelectItem key={dept} value={dept}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getSectorColor(dept).replace(/text-\w+-\d+/g, '').replace(/border-\w+-\d+/g, ''))} />
                            <span className="flex-1">{highlightSearchTerm(dept, departmentSearch)}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDepartmentInputModeToggle}
                className="text-xs text-purple-600 hover:text-purple-800 p-0 h-auto"
              >
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Personalizar
                </div>
              </Button>
            </div>
          )}
        </div>

        {/* Problema */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Problema
            </label>
            {dynamicLists && (
              <QuickListManager 
                type="problem"
                lists={dynamicLists}
                onListsUpdated={reloadLists}
                currentValue={problemText}
                onValueChange={setProblemText}
              />
            )}
          </div>
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
                className="text-sm focus:ring-green-200 dark:focus:ring-green-800"
                placeholder="Digite problema personalizado"
                autoFocus
                disabled={savingProblem}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleProblemInputSave}
                  disabled={savingProblem}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  {savingProblem ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      Salvar
                    </div>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setProblemInput(problemText);
                    setProblemInputMode(false);
                  }}
                  disabled={savingProblem}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
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
                  {/* 🔍 Campo de busca dentro do dropdown */}
                  <div 
                    className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b z-10"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <Input
                        ref={problemSearchRef}
                        placeholder="🔍 Buscar problema... (Ctrl+F)"
                        value={problemSearch}
                        onChange={(e) => {
                          e.stopPropagation();
                          setProblemSearch(e.target.value);
                          
                          // 📌 Scroll automático para o topo após filtrar
                          setTimeout(() => {
                            const selectContent = e.target.closest('[data-radix-select-content]');
                            if (selectContent) {
                              selectContent.scrollTop = 0;
                            }
                          }, 50);
                        }}
                        className="pl-8 pr-8 h-8 text-sm"
                        autoFocus
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => {
                          e.stopPropagation();
                          e.target.focus();
                        }}
                        onBlur={(e) => {
                          if (problemSearch) {
                            setTimeout(() => {
                              if (problemSearchRef.current && document.activeElement !== problemSearchRef.current) {
                                problemSearchRef.current.focus();
                              }
                            }, 0);
                          }
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') {
                            setProblemSearch('');
                            problemSearchRef.current?.focus();
                          }
                        }}
                      />
                      {problemSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProblemSearch('');
                            problemSearchRef.current?.focus();
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                        >
                          <X className="h-3 w-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                    {problemSearch && (
                      <div className="text-xs mt-1 flex items-center justify-between">
                        <span className="text-gray-500">
                          {filteredProblems.length} resultado{filteredProblems.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Ordenado por relevância
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredProblems.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Nenhum problema encontrado
                      </div>
                    ) : (
                      filteredProblems.map((prob: string) => (
                        <SelectItem key={prob} value={prob}>
                          {prob === 'VAZIO' ? (
                            <span className="italic text-gray-500">Sem problemas</span>
                          ) : (
                            <span className="flex-1">{highlightSearchTerm(prob, problemSearch)}</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleProblemInputModeToggle}
                className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
              >
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Personalizar
                </div>
              </Button>
              <div className="space-y-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">Detalhe do Problema (opcional)</label>
                <Textarea
                  value={problemDetail}
                  onChange={(e) => setProblemDetail(e.target.value)}
                  placeholder="Descreva detalhes adicionais do problema"
                  className="text-sm"
                  rows={3}
                />
              </div>
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
          {problemDetail && (
            <span className="text-xs text-muted-foreground">• {problemDetail}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedProblemEditor;