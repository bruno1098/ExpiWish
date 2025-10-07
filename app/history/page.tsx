'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllAnalyses, clearAnalysesCache } from '@/lib/firestore-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateBR } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { RequireAuth } from '@/lib/auth-context';
import SharedDashboardLayout from "../shared-layout";
import { History, Calendar, Star, Eye, Trash2, AlertTriangle, X, ArrowUpDown, ArrowUp, ArrowDown, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';



function HistoryPageContent() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<{id: string, date: string} | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  
  // Estados para ocultar/mostrar análises
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(true); // Por padrão, mostrar análises ocultas no histórico
  const [hidingAll, setHidingAll] = useState(false);
  const [hideAllModalOpen, setHideAllModalOpen] = useState(false);
  
  // Estados para ordenação
  const [sortBy, setSortBy] = useState<'date' | 'feedbacks' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const router = useRouter();
  const { userData } = useAuth();
  const { toast } = useToast();

  // Função para recarregar as análises do Firebase
  const reloadAnalyses = async () => {
    try {
      setLoading(true);
      // Limpar cache do firestore-service
      clearAnalysesCache();
      
      // Limpar qualquer cache local também
      if (typeof window !== 'undefined') {
        localStorage.removeItem('analyses-cache');
      }
      
      const data = await getAllAnalyses(userData?.hotelId, true);
      setAnalyses(data);
    } catch (error) {
      console.error('Erro ao recarregar análises:', error);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const fetchAnalyses = async () => {
      setLoading(true);
      try {
        // Buscar análises do hotel do usuário autenticado (incluindo ocultas para o histórico)
        const data = await getAllAnalyses(userData?.hotelId, true);
        setAnalyses(data);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userData?.hotelId) {
    fetchAnalyses();
    } else {
      setLoading(false);
    }
  }, [userData?.hotelId]);

  // Função para aplicar ordenação local
  const sortAnalyses = (data: any[]) => {
    return [...data].sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'date':
          // Ordenar por data de importação
          valueA = getDateValue(a.importDate);
          valueB = getDateValue(b.importDate);
          break;
          
        case 'feedbacks':
          // Ordenar por quantidade de feedbacks
          valueA = a.data?.length || 0;
          valueB = b.data?.length || 0;
          break;
          
        case 'rating':
          // Ordenar por avaliação média
          valueA = a.analysis?.averageRating || 0;
          valueB = b.analysis?.averageRating || 0;
          break;
          
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
      }
    });
  };

  // Função auxiliar para extrair valor de data
  const getDateValue = (timestamp: any) => {
    if (!timestamp) return new Date('1900-01-01').getTime();
    
    if (typeof timestamp === 'object' && timestamp.toDate) {
      return timestamp.toDate().getTime();
    } else if (timestamp instanceof Date) {
      return timestamp.getTime();
    } else {
      return new Date(timestamp).getTime();
    }
  };

  // Aplicar filtro e ordenação sempre que os dados ou critérios mudarem
  const filteredAndSortedAnalyses = React.useMemo(() => {
    let filtered = analyses;
    
    // Aplicar filtro de visibilidade se necessário
    if (!showHidden) {
      filtered = analyses.filter(analysis => !analysis.hidden);
    }
    
    return sortAnalyses(filtered);
  }, [analyses, sortBy, sortOrder, showHidden]);

  // Função para mudar ordenação
  const handleSortChange = (newSortBy: 'date' | 'feedbacks' | 'rating') => {
    if (sortBy === newSortBy) {
      // Se já está ordenando por este critério, inverter a ordem
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Novo critério, usar ordem padrão
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'date' ? 'desc' : 'desc'); // Data mais recente primeiro, outros maior primeiro
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data desconhecida';
    
    let date: Date;
    
    // Tratar diferentes formatos de timestamp
    if (typeof timestamp === 'object' && timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // Já é um objeto Date
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      // String ou número - converter para Date
      date = new Date(timestamp);
    } else {
      return 'Data inválida';
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    // Converter Date para string ISO e usar formatDateBR
    return formatDateBR(date.toISOString());
  };

  const handleViewAnalysis = (id: string) => {
    router.push(`/history/${id}`);
  };

  const handleDeleteAnalysis = (analysisId: string, analysisDate: string) => {
    setAnalysisToDelete({ id: analysisId, date: analysisDate });
    setDeleteModalOpen(true);
  };

  const confirmDeleteAnalysis = async () => {
    if (!analysisToDelete) return;
    
    setDeletingInProgress(true);
    setDeletingId(analysisToDelete.id);
    
    try {
      // Chamar API para marcar análise como excluída
      const response = await fetch('/api/delete-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: analysisToDelete.id,
          reason: 'Análise removida pelo usuário'
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Verificar se é erro específico de análise já excluída
        if (responseData.error?.includes('já foi excluída')) {
          toast({
            title: "Análise Já Excluída",
            description: "Esta análise já foi removida anteriormente.",
            variant: "destructive",
          });
          // Forçar recarregamento completo da lista
          setTimeout(async () => {
            await reloadAnalyses();
          }, 500);
          return;
        }
        throw new Error(responseData.error || 'Falha ao excluir análise');
      }

      // SOLUÇÃO: Pequeno delay e recarregar a lista completa do Firebase
      // Dar tempo para o Firebase processar a exclusão
      setTimeout(async () => {
        await reloadAnalyses();
      }, 500);
      
      toast({
        title: "Análise Excluída",
        description: "A análise foi removida com sucesso e não aparecerá mais nos dashboards.",
      });
      
    } catch (error: any) {
      console.error('Erro ao excluir análise:', error);
      toast({
        title: "Erro ao Excluir",
        description: error.message || "Não foi possível excluir a análise. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setDeletingInProgress(false);
      setDeleteModalOpen(false);
      setAnalysisToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setAnalysisToDelete(null);
  };

  // Função para ocultar/mostrar análise
  const handleToggleVisibility = async (analysisId: string, currentlyHidden: boolean, analysisDate: string) => {
    setHidingId(analysisId);
    
    try {
      const response = await fetch('/api/hide-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: analysisId,
          hidden: !currentlyHidden, // Inverter o estado atual
          reason: currentlyHidden ? 'Mostrado novamente pelo usuário' : 'Ocultado dos dashboards pelo usuário'
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Falha ao alterar visibilidade da análise');
      }

      // Recarregar a lista para refletir as mudanças
      setTimeout(async () => {
        await reloadAnalyses();
      }, 300);
      
      toast({
        title: currentlyHidden ? "Análise Mostrada" : "Análise Ocultada",
        description: currentlyHidden 
          ? "A análise voltará a aparecer nos dashboards e gráficos."
          : "A análise foi ocultada dos dashboards e gráficos, mas permanece no histórico.",
      });
      
    } catch (error: any) {
      console.error('Erro ao alterar visibilidade:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a visibilidade da análise.",
        variant: "destructive"
      });
    } finally {
      setHidingId(null);
    }
  };

  // Função para ocultar todas as análises visíveis de uma vez
  const handleHideAll = async () => {
    setHideAllModalOpen(false);
    setHidingAll(true);
    
    try {
      // Filtrar apenas as análises que estão visíveis (não ocultas)
      const visibleAnalyses = analyses.filter(analysis => !analysis.hidden);
      
      if (visibleAnalyses.length === 0) {
        toast({
          title: "Nenhuma análise para ocultar",
          description: "Todas as análises já estão ocultas.",
          variant: "default",
        });
        return;
      }
      
      // Ocultar cada análise sequencialmente
      let successCount = 0;
      let errorCount = 0;
      
      for (const analysis of visibleAnalyses) {
        try {
          const response = await fetch('/api/hide-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              analysisId: analysis.id,
              hidden: true,
              reason: 'Ocultado em lote pelo usuário'
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Erro ao ocultar análise ${analysis.id}:`, error);
          errorCount++;
        }
      }
      
      // Recarregar a lista após ocultar todas
      setTimeout(async () => {
        await reloadAnalyses();
      }, 500);
      
      // Mostrar resultado
      if (errorCount === 0) {
        toast({
          title: "Todas as Análises Ocultadas",
          description: `${successCount} análise(s) foram ocultadas com sucesso dos dashboards.`,
        });
      } else {
        toast({
          title: "Ocultação Parcial",
          description: `${successCount} análise(s) ocultadas, ${errorCount} falharam.`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error('Erro ao ocultar todas as análises:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ocultar todas as análises.",
        variant: "destructive"
      });
    } finally {
      setHidingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Carregando histórico...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Excluir Análise
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {analysisToDelete && (
                <>
                  Tem certeza que deseja excluir a análise de{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {analysisToDelete.date}
                  </span>
                  ?
                  <br />
                  <span className="text-red-600 dark:text-red-400 font-medium mt-2 block">
                    Esta ação não pode ser desfeita.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={deletingInProgress}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAnalysis}
              disabled={deletingInProgress}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deletingInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Análise
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Ocultar Todas */}
      <Dialog open={hideAllModalOpen} onOpenChange={setHideAllModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
              <EyeOff className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Ocultar Todas as Análises
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Tem certeza que deseja ocultar todas as análises visíveis?
              <br />
              <span className="text-orange-600 dark:text-orange-400 font-medium mt-2 block">
                Elas não aparecerão mais nos dashboards, mas permanecerão no histórico.
              </span>
              <br />
              <span className="text-sm text-muted-foreground">
                Total de análises que serão ocultadas: <strong>{analyses.filter(a => !a.hidden).length}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setHideAllModalOpen(false)}
              disabled={hidingAll}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleHideAll}
              disabled={hidingAll}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
            >
              {hidingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Ocultando...
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ocultar Todas
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    <div className="p-6 max-w-7xl mx-auto">
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Histórico de Análises</h1>
              <p className="text-muted-foreground">
                Veja o histórico de todas as análises realizadas para o hotel {userData?.hotelName}.
              </p>
            </div>
          </div>
          
          {/* Controle de Ordenação */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Ordenar
                {sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleSortChange('date')}>
                <Calendar className="h-4 w-4 mr-2" />
                Por Data
                {sortBy === 'date' && (
                  sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-auto" /> : <ArrowUp className="h-3 w-3 ml-auto" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('feedbacks')}>
                <Eye className="h-4 w-4 mr-2" />
                Por Quantidade
                {sortBy === 'feedbacks' && (
                  sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-auto" /> : <ArrowUp className="h-3 w-3 ml-auto" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('rating')}>
                <Star className="h-4 w-4 mr-2" />
                Por Avaliação
                {sortBy === 'rating' && (
                  sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-auto" /> : <ArrowUp className="h-3 w-3 ml-auto" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Tabs defaultValue="all">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">Todas as Análises</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant={showHidden ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-2"
            >
              {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showHidden ? 'Mostrar Todas' : 'Ocultar Análises Ocultas'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideAllModalOpen(true)}
              disabled={hidingAll || analyses.filter(a => !a.hidden).length === 0}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              title="Ocultar todas as análises visíveis dos dashboards"
            >
              {hidingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-orange-600" />
                  Ocultando...
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Ocultar Todas
                </>
              )}
            </Button>
          </div>
        </div>
        
        <TabsContent value="all">
          <Card className="overflow-hidden">

            
            {filteredAndSortedAnalyses.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <History className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      Nenhuma análise encontrada
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Importe dados para começar a ver o histórico de análises do hotel {userData?.hotelName}.
                    </p>
                    <Button onClick={() => router.push('/import')}>
                      Importar Dados
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data
                      </div>
                    </TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Qtd. Feedbacks</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        Média
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Ações
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAnalyses.map((analysis) => (
                    <TableRow 
                      key={analysis.id}
                      className={`transition-all duration-500 ${
                        deletingId === analysis.id 
                          ? 'opacity-50 bg-red-50 dark:bg-red-950/20 animate-pulse' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <TableCell>
                        <span className="font-medium">
                          {formatDate(analysis.importDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {analysis.hotelName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {analysis.data?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">
                            {analysis.analysis?.averageRating
                              ? Number(analysis.analysis.averageRating).toFixed(1)
                              : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {analysis.hidden ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <EyeOff className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">Oculta</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                              <Eye className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-700 dark:text-green-400">Visível</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAnalysis(analysis.id)}
                            className="h-8 px-3 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVisibility(analysis.id, analysis.hidden, formatDate(analysis.importDate))}
                            disabled={hidingId === analysis.id}
                            className={`h-8 px-3 text-xs ${
                              analysis.hidden 
                                ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30' 
                                : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                            }`}
                            title={analysis.hidden ? 'Mostrar nos dashboards' : 'Ocultar dos dashboards'}
                          >
                            {hidingId === analysis.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-current" />
                            ) : analysis.hidden ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnalysis(analysis.id, formatDate(analysis.importDate))}
                            disabled={deletingId === analysis.id}
                            className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            {deletingId === analysis.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-red-600" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}

// Componente com proteção de autenticação
export default function HistoryPage() {
  return (
    <SharedDashboardLayout>
      <HistoryPageContent />
    </SharedDashboardLayout>
  );
}