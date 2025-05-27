'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAnalysisById } from '@/lib/firestore-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const router = useRouter();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Voltar
      </button>
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
        <p className="mb-4">Ocorreu um erro ao carregar esta página.</p>
        <p className="text-sm mb-4">Detalhes técnicos: {error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function AnalysisDetail() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) {
        setError(new Error('ID não fornecido'));
        setLoading(false);
        return;
      }

      try {
        console.log('Buscando análise com ID:', id);
        const data = await getAnalysisById(id);
        console.log('Dados recebidos:', data);
        setAnalysis(data);
      } catch (err) {
        console.error('Erro ao carregar análise:', err);
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data desconhecida';
    
    try {
      const date = timestamp.toDate();
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return 'Data inválida';
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={handleBack}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Voltar
        </button>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Erro: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={handleBack}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Voltar
        </button>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Nenhum dado encontrado para esta análise.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={handleBack}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Voltar
      </button>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-2">{analysis.hotelName || 'Hotel não especificado'}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Importado em: {formatDate(analysis.importDate)}
        </p>
        
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold mb-4">Análise</h2>
          
          {/* Renderizar a análise do GPT com tratamento de erro */}
          <div className="prose dark:prose-invert max-w-none">
            {analysis.analysis ? (
              typeof analysis.analysis === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: analysis.analysis.replace(/\n/g, '<br/>') }} />
              ) : (
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
                  {JSON.stringify(analysis.analysis, null, 2)}
                </pre>
              )
            ) : (
              <p className="text-gray-500">Nenhuma análise disponível</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisDetailPage() {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <AnalysisDetail />
    </ErrorBoundary>
  );
}