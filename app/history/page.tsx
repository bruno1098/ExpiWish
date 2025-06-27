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

function HistoryPageContent() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userData } = useAuth();

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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Histórico de Análises</h1>
        <p className="text-muted-foreground">
          Veja o histórico de todas as análises realizadas para o hotel {userData?.hotelName}.
        </p>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas as Análises</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card className="overflow-hidden">
      {analyses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhuma análise encontrada para este hotel.
          </p>
                <Button onClick={() => router.push('/import')}>
                  Importar Dados
                </Button>
        </div>
      ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead className="text-right">Qtd. Feedbacks</TableHead>
                    <TableHead className="text-right">Avaliação Média</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
          {analyses.map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell>
                        {formatDate(analysis.importDate)}
                      </TableCell>
                      <TableCell>{analysis.hotelName}</TableCell>
                      <TableCell className="text-right">
                        {analysis.data?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {analysis.analysis?.averageRating
                          ? Number(analysis.analysis.averageRating).toFixed(1)
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAnalysis(analysis.id)}
                        >
                          Ver Detalhes
                        </Button>
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