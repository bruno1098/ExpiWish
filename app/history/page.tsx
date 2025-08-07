'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllAnalyses } from '@/lib/firestore-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateBR } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { RequireAuth } from '@/lib/auth-context';
import SharedDashboardLayout from "../shared-layout";
import { History, Calendar, Star, Eye, Trash2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';



function HistoryPageContent() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<{id: string, date: string} | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();
  const { toast } = useToast();



  useEffect(() => {
    const fetchAnalyses = async () => {
      setLoading(true);
      try {
        // Buscar apenas análises do hotel do usuário autenticado
        const data = await getAllAnalyses(userData?.hotelId);
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

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Data desconhecida';
    
    const date = timestamp.toDate();
    return formatDateBR(date);
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
          // Remover da lista local mesmo assim
          setAnalyses(prev => prev.filter(analysis => analysis.id !== analysisToDelete.id));
          return;
        }
        throw new Error(responseData.error || 'Falha ao excluir análise');
      }

      // Remover da lista local
      setAnalyses(prev => prev.filter(analysis => analysis.id !== analysisToDelete.id));
      
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

    <div className="p-6 max-w-7xl mx-auto">
      <div className="space-y-2 mb-6">
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
      </div>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas as Análises</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card className="overflow-hidden">

            
            {analyses.length === 0 ? (
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
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Ações
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((analysis) => (
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