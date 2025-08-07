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
import { History, Calendar, Star, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DeleteAnalysisModal from '@/app/components/DeleteAnalysisModal';



function HistoryPageContent() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<any>(null);
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

  const handleDeleteAnalysis = (analysis: any) => {
    setAnalysisToDelete(analysis);
    setDeleteModalOpen(true);
  };

  const confirmDeleteAnalysis = async (reason?: string) => {
    if (!analysisToDelete) return;

    setDeletingId(analysisToDelete.id);

    try {
      const response = await fetch('/api/delete-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          analysisId: analysisToDelete.id,
          reason 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir análise');
      }

      // Remover a análise da lista local
      setAnalyses(prev => prev.filter(analysis => analysis.id !== analysisToDelete.id));

      toast({
        title: "Sucesso",
        description: "Análise excluída com sucesso.",
      });

      // Fechar modal
      setDeleteModalOpen(false);
      setAnalysisToDelete(null);

    } catch (error) {
      console.error('Erro ao excluir análise:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir análise",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseDeleteModal = () => {
    if (deletingId) return; // Não permitir fechar durante exclusão
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
                    <TableRow key={analysis.id}>
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
                            onClick={() => handleDeleteAnalysis(analysis)}
                            disabled={deletingId === analysis.id}
                            className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deletingId === analysis.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-t border-red-600" />
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
      
      <DeleteAnalysisModal
         isOpen={deleteModalOpen}
         onClose={handleCloseDeleteModal}
         onConfirm={confirmDeleteAnalysis}
         analysisName={analysisToDelete ? `Análise de ${formatDate(analysisToDelete.importDate)} - ${analysisToDelete.hotelDisplayName || analysisToDelete.hotelName}` : undefined}
         isDeleting={!!deletingId}
       />
    </div>
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