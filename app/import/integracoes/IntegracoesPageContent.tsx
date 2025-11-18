"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  type MockExternalFeedback,
  type MockIngestionRecord,
  type MockIngestionSnapshot,
  type MockIntegrationResult,
  type ReclameAquiCasesResponse,
  type TrustYouReviewResponse
} from "@/lib/integrations/teste";
import SharedDashboardLayout from "../../shared-layout";
import { Loader2, Plus, RefreshCcw, Zap } from "lucide-react";

interface IntegrationDatasetResponse {
  providers: {
    trustyou: TrustYouReviewResponse;
    reclameAqui: ReclameAquiCasesResponse;
  };
  normalizedSample: MockExternalFeedback[];
  ingestionSnapshot: MockIngestionSnapshot;
}

interface QueueRow {
  id: string;
  provider: "trustyou" | "reclameaqui";
  externalId: string;
  receivedAt: string;
  title: string;
  reviewer: string;
  checksum: string;
  tags: string[];
}

const endpoint = "/api/integrations/teste";

function formatDate(value: string | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR", { hour12: false });
}

function providerLabel(provider: QueueRow["provider"]) {
  return provider === "trustyou" ? "TrustYou" : "Reclame Aqui";
}

export default function IntegracoesPageContent() {
  const { toast } = useToast();
  const [dataset, setDataset] = useState<IntegrationDatasetResponse | null>(null);
  const [ingestionSnapshot, setIngestionSnapshot] = useState<MockIngestionSnapshot | null>(null);
  const [loadingDataset, setLoadingDataset] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [addingMock, setAddingMock] = useState(false);
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MockIntegrationResult | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; executedAt: string; result: MockIntegrationResult }>>([]);

  const resultRef = useRef<HTMLDivElement | null>(null);

  const loadDataset = useCallback(async () => {
    try {
      setLoadingDataset(true);
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Falha ao carregar os dados de integração");
      }
      const payload = (await response.json()) as IntegrationDatasetResponse;
      setDataset(payload);
      setIngestionSnapshot(payload.ingestionSnapshot);
    } catch (error: any) {
      toast({
        title: "Não foi possível carregar os dados",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive"
      });
    } finally {
      setLoadingDataset(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDataset();
  }, [loadDataset]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = localStorage.getItem("openai-api-key");
      setStoredApiKey(key && key.trim() !== "" ? key : null);
    }
  }, []);

  const pendingRows = useMemo<QueueRow[]>(() => {
    if (!ingestionSnapshot || !dataset) return [];

    const normalizedIndex = new Map<string, MockExternalFeedback>();
    dataset.normalizedSample.forEach(item => {
      normalizedIndex.set(`${item.provider}-${item.externalId}`, item);
    });

    const rows: QueueRow[] = [];
    ingestionSnapshot.providers.forEach(providerState => {
      providerState.queuePreview.forEach((record: MockIngestionRecord) => {
        if (record.status !== "pending") return;
        const key = `${providerState.provider}-${record.externalId}`;
        const normalized = normalizedIndex.get(key);

        rows.push({
          id: record.id,
          provider: providerState.provider,
          externalId: record.externalId,
          receivedAt: record.firstSeenAt,
          title:
            normalized?.title ?? normalized?.reviewText?.slice(0, 80) ?? `Item ${record.externalId}`,
          reviewer: normalized?.reviewerName ?? "-",
          checksum: record.checksum,
          tags: normalized?.tags ?? []
        });
      });
    });

    return rows.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
  }, [dataset, ingestionSnapshot]);

  const totals = useMemo(() => {
    if (!ingestionSnapshot) {
      return { pending: 0, processed: 0, errored: 0, lastSync: null as string | null };
    }

    let pending = 0;
    let processed = 0;
    let errored = 0;
    let lastSync: string | null = null;

    ingestionSnapshot.providers.forEach(provider => {
      provider.queuePreview.forEach(record => {
        if (record.status === "pending") pending += 1;
        if (record.status === "errored") errored += 1;
      });
      processed += provider.totals.processed;

      if (!lastSync || new Date(provider.lastSuccessfulSync).getTime() > new Date(lastSync).getTime()) {
        lastSync = provider.lastSuccessfulSync;
      }
    });

    return { pending, processed, errored, lastSync };
  }, [ingestionSnapshot]);

  const appendMock = async () => {
    try {
      setAddingMock(true);
      const provider: QueueRow["provider"] = Math.random() > 0.5 ? "trustyou" : "reclameaqui";
      const sample = provider === "trustyou"
        ? {
            title: "Novo feedback TrustYou",
            reviewText: "Simulação de review externo para validar o fluxo de ingestão.",
            reviewerName: "Visitante Mock",
            rating: 4.2,
            tags: ["mock", "trustyou"],
            submittedAt: new Date().toISOString()
          }
        : {
            title: "Novo caso Reclame Aqui",
            reviewText: "Simulação de reclamação recebida via API oficial para fins de teste.",
            reviewerName: "Consumidor Mock",
            rating: 2,
            tags: ["mock", "reclameaqui"],
            submittedAt: new Date().toISOString()
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "append",
          newMock: {
            provider,
            ...sample
          }
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error ?? "Não foi possível adicionar o feedback mockado.");
      }

      const data = (await response.json()) as IntegrationDatasetResponse & {
        message?: string;
      };
      setDataset({
        providers: data.providers,
        normalizedSample: data.normalizedSample,
        ingestionSnapshot: data.ingestionSnapshot
      });
      setIngestionSnapshot(data.ingestionSnapshot);

      toast({
        title: provider === "trustyou" ? "Mock TrustYou adicionado" : "Mock Reclame Aqui adicionado",
        description: "O item entrou na fila e ficará disponível para processamento.",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar mock",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive"
      });
    } finally {
      setAddingMock(false);
    }
  };

  const processPending = async () => {
    try {
      if (!storedApiKey) {
        throw new Error("Informe sua OpenAI API Key nas configurações antes de processar os dados.");
      }

      setProcessing(true);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: storedApiKey,
          skipAnalysis: false
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message ?? "Falha ao processar os feedbacks");
      }

      const result = (await response.json()) as MockIntegrationResult;
      setLastResult(result);
      setHistory(prev => [
        {
          id: `job-${Date.now()}`,
          executedAt: new Date().toISOString(),
          result
        },
        ...prev
      ]);

      if (result.ingestionSnapshot) {
        setIngestionSnapshot(result.ingestionSnapshot);
      }

      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      toast({
        title: result.metadata.total ? "Processamento concluído" : "Nenhum item pendente",
        description: result.metadata.total
          ? `${result.metadata.total} feedbacks analisados com a IA.`
          : "Não havia novos dados para processar neste momento."
      });

      await loadDataset();
    } catch (error: any) {
      toast({
        title: "Erro ao processar fila",
        description: error?.message ?? "Verifique sua configuração e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const latestHistory = useMemo(() => history.slice(0, 3), [history]);

  return (
    <SharedDashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-8">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-semibold">Integrações externas</h1>
            <p className="text-muted-foreground">
              Acompanhe o que chegou das plataformas parceiras e processe os feedbacks com um clique.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                <CardDescription>Na fila aguardando análise</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{totals.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processados</CardTitle>
                <CardDescription>Desde a sincronização inicial</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{totals.processed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Última coleta</CardTitle>
                <CardDescription>Horário mais recente de sucesso</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatDate(totals.lastSync ?? undefined)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex items-center gap-2"
              onClick={processPending}
              disabled={processing || loadingDataset || pendingRows.length === 0 || !storedApiKey}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Processar pendentes
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={appendMock}
              disabled={addingMock || loadingDataset}
            >
              {addingMock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar feedback mock
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            onClick={loadDataset}
            disabled={loadingDataset}
          >
            {loadingDataset ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Atualizar dados
          </Button>
        </div>

        {!storedApiKey && (
          <p className="text-sm text-amber-600">
            Configure sua OpenAI API Key em Configurações -&gt; Integrações de IA para habilitar o processamento automático.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fila de ingestão</CardTitle>
            <CardDescription>
              Itens aguardando processamento. Assim que você rodar a IA, eles serão classificados e arquivados automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[360px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Recebido em</TableHead>
                    <TableHead>Título / Resumo</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Checksum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Sem pendências no momento. Assim que novos feedbacks chegarem, eles aparecerão aqui.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline">{providerLabel(row.provider)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(row.receivedAt)}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="font-medium">{row.title}</p>
                          {row.tags.length > 0 && (
                            <p className="text-xs text-muted-foreground">Tags: {row.tags.join(", ")}</p>
                          )}
                        </TableCell>
                        <TableCell>{row.reviewer}</TableCell>
                        <TableCell className="max-w-[160px] truncate font-mono text-xs text-muted-foreground">
                          {row.checksum}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {lastResult && (
          <div ref={resultRef}>
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Última execução da IA</CardTitle>
                <CardDescription>
                  Processado em {formatDate(lastResult.metadata.processedAt)} - {lastResult.metadata.total} itens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground">Processados com IA</p>
                    <p className="text-2xl font-semibold">{lastResult.items.filter(item => item.analysis).length}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground">Sem análise necessária</p>
                    <p className="text-2xl font-semibold">{lastResult.items.filter(item => !item.analysis).length}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground">Falhas</p>
                    <p className="text-2xl font-semibold text-destructive">{lastResult.errors.length}</p>
                  </div>
                </div>
                {lastResult.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Não havia itens pendentes. Continue monitorando - assim que novos feedbacks chegarem, você poderá processá-los aqui.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {latestHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Histórico recente</CardTitle>
              <CardDescription>As três últimas execuções do mock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestHistory.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-md border bg-muted/30 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{formatDate(item.executedAt)}</p>
                    <p className="text-sm text-muted-foreground">{item.result.metadata.total} itens processados</p>
                  </div>
                  <Badge variant={item.result.metadata.total ? "default" : "secondary"}>
                    {item.result.metadata.total ? "Processado" : "Sem novidades"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </SharedDashboardLayout>
  );
}
