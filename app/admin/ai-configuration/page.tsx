"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Clock,
  TrendingUp,
  Settings,
  Zap,
  Users
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import SharedDashboardLayout from '../../shared-layout';
import { useRouter } from 'next/navigation';
import type { EmbeddingsStatus } from '../../api/embeddings-status/route';

function AIConfigurationPage() {
  const { toast } = useToast();
  const { userData } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<EmbeddingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  // Carregar status inicial
  useEffect(() => {
    loadEmbeddingsStatus();
  }, []);

  const loadEmbeddingsStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/embeddings-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        throw new Error('Erro ao carregar status');
      }
    } catch (error: any) {
      console.error('Erro ao carregar status:', error);
      toast({
        title: "Erro ao Carregar Status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyDialog(true);
      return;
    }

    try {
      setGenerating(true);
      setProgress(0);
      
      toast({
        title: "Iniciando Geração de Embeddings",
        description: "Este processo pode levar alguns minutos...",
      });

      // Simular progresso enquanto a API processa
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 1000);

      const response = await fetch('/api/generate-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na geração');
      }

      const result = await response.json();
      
      if (result.success) {
        setProgress(100);
        
        toast({
          title: "Embeddings Gerados com Sucesso!",
          description: `${result.stats?.keywords_processed || 0} keywords e ${result.stats?.problems_processed || 0} problems processados em ${result.stats?.processing_time_human || 'alguns segundos'}.`,
        });
        
        // Aguardar um pouco para mostrar 100% antes de recarregar
        setTimeout(async () => {
          await loadEmbeddingsStatus();
        }, 1500);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
      
    } catch (error: any) {
      console.error('Erro na geração:', error);
      toast({
        title: "Erro na Geração de Embeddings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setProgress(0);
        setShowConfirmDialog(false);
      }, 2000);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    if (status.exists) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Não Configurado
        </Badge>
      );
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <SharedDashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Carregando configuração da IA...</span>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Configuração da IA
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gerencie os embeddings da inteligência artificial para análise precisa de feedbacks.
            Os embeddings são globais e funcionam para todos os hotéis da plataforma.
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold">Status dos Embeddings</h2>
            </div>
            {getStatusBadge()}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status Geral */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Database className="h-5 w-5" />
                Informações Gerais
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={status?.exists ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {status?.exists ? 'Embeddings Ativos' : 'Embeddings Não Gerados'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última Geração:</span>
                  <span>{formatDate(status?.generated_at)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versão:</span>
                  <span>{status?.version || 1}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estrutura:</span>
                  <span className="capitalize">{status?.structure || 'legacy'}</span>
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estatísticas
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Keywords:</span>
                  <span className="font-medium">{status?.keywords_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Problemas:</span>
                  <span className="font-medium">{status?.problems_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departamentos:</span>
                  <span className="font-medium">{status?.departments_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Itens:</span>
                  <span className="font-medium text-blue-600">
                    {(status?.keywords_count || 0) + (status?.problems_count || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Ações */}
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-yellow-600" />
              <h2 className="text-2xl font-semibold">Ações</h2>
            </div>

            {!status?.exists ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Embeddings Não Configurados</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Para usar a análise inteligente de feedbacks, é necessário gerar os embeddings primeiro.
                      Este processo precisa ser feito apenas uma vez e beneficia todos os hotéis.
                    </p>
                  </div>
                </div>
              </div>
            ) : status?.needs_regeneration ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800">Taxonomia Atualizada - Regeneração Recomendada</h4>
                    <p className="text-orange-700 text-sm mt-1 mb-2">
                      Detectamos mudanças na taxonomia. Recomendamos regenerar os embeddings para melhor precisão.
                    </p>
                    {status.changes_detected && (
                      <div className="text-xs text-orange-600 space-y-1">
                        {status.changes_detected.keywords.added > 0 && (
                          <div>• {status.changes_detected.keywords.added} keywords adicionadas</div>
                        )}
                        {status.changes_detected.keywords.removed > 0 && (
                          <div>• {status.changes_detected.keywords.removed} keywords removidas</div>
                        )}
                        {status.changes_detected.problems.added > 0 && (
                          <div>• {status.changes_detected.problems.added} problems adicionados</div>
                        )}
                        {status.changes_detected.problems.removed > 0 && (
                          <div>• {status.changes_detected.problems.removed} problems removidos</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Embeddings Atualizados</h4>
                    <p className="text-green-700 text-sm mt-1">
                      A IA está funcionando corretamente e os embeddings estão sincronizados com a taxonomia atual.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {generating && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium">
                    {progress < 20 ? 'Iniciando processamento...' :
                     progress < 50 ? 'Gerando embeddings para keywords...' :
                     progress < 80 ? 'Processando problems...' :
                     progress < 95 ? 'Salvando no Firebase...' :
                     'Finalizando...'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Processo em andamento</p>
                      <p>Este processo pode levar 2-3 minutos. Você pode deixar esta aba aberta e fazer outras atividades.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={generating}
                className="flex items-center gap-2"
              >
                {generating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {status?.exists ? 'Regenerar Embeddings' : 'Gerar Embeddings'}
              </Button>
              
              <Button
                variant="outline"
                onClick={loadEmbeddingsStatus}
                disabled={generating}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar Status
              </Button>
            </div>
          </div>
        </Card>

        {/* Informações Técnicas */}
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Informações Técnicas
            </h3>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                • <strong>Embeddings</strong> são representações numéricas que permitem à IA entender o significado dos textos
              </p>
              <p>
                • <strong>Processo único</strong>: Uma vez gerados, funcionam para todos os hotéis da plataforma
              </p>
              <p>
                • <strong>Tempo estimado</strong>: 2-3 minutos para processar toda a taxonomia
              </p>
              <p>
                • <strong>Custo</strong>: Aproximadamente $0.01-0.02 USD por geração completa
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Geração de Embeddings</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Este processo irá gerar embeddings para toda a taxonomia ({(status?.keywords_count || 0) + (status?.problems_count || 0)} itens).
              </p>
              <p>
                <strong>Importante:</strong> Você precisará fornecer uma chave de API do OpenAI válida.
                O processo pode levar alguns minutos e tem um custo aproximado de $0.01-0.02 USD.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowConfirmDialog(false);
              setShowApiKeyDialog(true);
            }}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de API Key */}
      <AlertDialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chave de API OpenAI</AlertDialogTitle>
            <AlertDialogDescription>
              Insira sua chave de API do OpenAI para gerar os embeddings:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="password"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApiKey('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleGenerateEmbeddings}
              disabled={!apiKey.trim()}
            >
              Gerar Embeddings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SharedDashboardLayout>
  );
}

export default AIConfigurationPage;