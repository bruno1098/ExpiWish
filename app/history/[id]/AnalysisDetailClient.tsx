'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAnalysisById } from '@/lib/firestore-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AnalysisDetailClient() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const data = await getAnalysisById(id);
        setAnalysis(data);
      } catch (error) {
        console.error('Erro ao carregar análise:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAnalysis();
    }
  }, [id]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data desconhecida';
    
    const date = timestamp.toDate();
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
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

  if (!analysis) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={handleBack}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Voltar
        </button>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Análise não encontrada ou ocorreu um erro ao carregá-la.</p>
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
        <h1 className="text-3xl font-bold mb-2">{analysis.hotelName}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Importado em: {formatDate(analysis.importDate)}
        </p>
        
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold mb-4">Análise</h2>
          
          {/* Renderizar a análise do GPT */}
          <div className="prose dark:prose-invert max-w-none">
            {typeof analysis.analysis === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: analysis.analysis.replace(/\n/g, '<br/>') }} />
            ) : (
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
                {JSON.stringify(analysis.analysis, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 