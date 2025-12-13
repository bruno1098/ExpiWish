"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import type {
  IntegrationDashboardData,
  IntegrationPendingItem,
  IntegrationProcessedItem,
  ProcessIntegrationResult
} from "@/lib/integrations/external-feedbacks";
import SharedDashboardLayout from "../../shared-layout";
import {
  Activity,
  ArrowRight,
  Brain,
  Cloud,
  Database,
  Globe,
  Loader2,
  RefreshCcw,
  Shield,
  Zap
} from "lucide-react";

const endpoint = "/api/integrations/teste";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Nunca";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("pt-BR", { hour12: false });
};

const formatRowDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("pt-BR", { hour12: false });
};

export default function IntegracoesPageContent() {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<IntegrationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessIntegrationResult | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Não foi possível carregar as integrações.");
      }
      setDashboard(payload as IntegrationDashboardData);
    } catch (error: any) {
      toast({
        title: "Não foi possível carregar as integrações",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const pendingRows = dashboard?.pending ?? [];
  const processedRows = dashboard?.processed ?? [];
  const totals = dashboard?.totals ?? { pending: 0, processed: 0, failed: 0 };
  const lastSync = formatDateTime(dashboard?.metadata.lastSyncAt);
  const sourceBase = dashboard?.source.baseUrl ?? "http://localhost:3000/api/feedbacks";

  const latestHistory = processedRows.slice(0, 5);
  const pendingPreview = pendingRows.slice(0, 6);
  const lastExecutionLabel = lastResult ? formatDateTime(lastResult.metadata.processedAt) : "Ainda não executado";
  const processedHotels = lastResult?.metadata.hotels ?? [];
  const sandboxInsights = [
    { label: "Fila ativa", value: `${totals.pending} pendentes`, hint: "Prontos para análise com a Wish IA" },
    { label: "Processados", value: totals.processed.toString(), hint: "Já enviados ao dashboard" },
    { label: "Falhas", value: totals.failed.toString(), hint: totals.failed ? "Revise o log recente" : "Nenhuma falha registrada" }
  ];
  const heroHighlights = [
    { label: "Sandbox conectado", value: sourceBase.replace(/^https?:\/\//, ""), icon: Globe },
    { label: "Última coleta", value: lastSync, icon: Cloud },
    { label: "Execução manual", value: lastExecutionLabel, icon: Brain }
  ];
  const pipelineStages = [
    {
      title: "1. Sandbox API",
      description: "Busca automática dos feedbacks de teste",
      meta: `${pendingRows.length} itens aguardando`,
      status: pendingRows.length > 0 ? "active" : "idle"
    },
    {
      title: "2. Wish IA proprietária",
      description: "Normaliza, classifica e salva no Firestore",
      meta: lastResult ? `${lastResult.metadata.processed} processados na última execução` : "Aguardando primeira execução",
      status: lastResult?.metadata.processed ? "active" : "idle"
    },
    {
      title: "3. Dashboards",
      description: "Disponibiliza no painel de análises e tickets",
      meta: formatDateTime(dashboard?.metadata.updatedAt) || "Sem registros",
      status: totals.processed ? "active" : "idle"
    }
  ];

  const processPending = async () => {
    try {
      setProcessing(true);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Falha ao processar os feedbacks.");
      }
      const result = payload as ProcessIntegrationResult;
      setLastResult(result);

      toast({
        title: result.metadata.processed
          ? "Processamento concluído"
          : "Nenhum feedback novo",
        description: result.metadata.processed
          ? `${result.metadata.processed} feedbacks analisados com a Wish IA.`
          : "Assim que novos dados chegarem, eles aparecerão automaticamente."
      });

      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      await loadDashboard();
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

  return (
    <SharedDashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-10 px-6 py-8 2xl:max-w-[1600px]">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
            <div className="flex-1 space-y-5 xl:pr-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold tracking-widest text-white/80">
                SANDBOX API
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Wish IA pipeline
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight">Integrações externas com telemetria em tempo real</h1>
                <p className="text-base text-white/80">
                  Conectamos a API de sandbox, processamos tudo com a Wish IA proprietária e jogamos cada insight direto no dashboard de análises.
                  Acompanhe a coleta, entenda o que foi classificado e gire uma nova execução manual quando quiser.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="flex items-center gap-2 bg-white text-slate-900 hover:bg-white/90"
                  onClick={processPending}
                  disabled={processing || loading || pendingRows.length === 0}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {processing ? "Processando..." : pendingRows.length === 0 ? "Sem pendências" : "Processar com a Wish IA"}
                </Button>
                <Button
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={loadDashboard}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Atualizar dados
                </Button>
                <Button variant="link" className="text-white" asChild>
                  <a href="/analysis" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2">
                    Abrir tela de análises
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="w-full rounded-2xl bg-white/10 p-6 xl:max-w-sm 2xl:max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Status do conector</p>
              <div className="mt-4 space-y-4">
                {heroHighlights.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4">
                    <div className="rounded-xl bg-white/10 p-2">
                      <Icon className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">{label}</p>
                      <p className="text-base font-semibold text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-white/70">Endpoint atual: {sourceBase}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Fluxo completo</p>
              <p className="text-sm text-muted-foreground">Da coleta no sandbox até o dashboard de insights.</p>
            </div>
            <Badge variant="secondary" className="w-fit">
              Última atualização: {formatDateTime(dashboard?.metadata.updatedAt)}
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pipelineStages.map(stage => (
              <div key={stage.title} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage.title}</p>
                  <span className={`text-xs font-medium ${stage.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>
                    {stage.status === "active" ? "Ativo" : "Stand-by"}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-slate-900">{stage.description}</p>
                <p className="mt-3 text-sm text-slate-500">{stage.meta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.8fr,1fr] xl:grid-cols-[2.1fr,1fr]">
          <Card className="rounded-3xl border bg-white/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4 text-emerald-600" />
                Feedbacks aguardando Wish IA
              </CardTitle>
              <CardDescription>
                Visualize exemplos reais vindos do sandbox antes de acionar o processamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="max-h-[420px] pr-4 xl:max-h-[520px]">
                {pendingRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Tudo sincronizado! Assim que novos feedbacks chegarem na API externa, eles aparecem aqui automaticamente.
                  </div>
                ) : (
                  pendingPreview.map((row: IntegrationPendingItem) => (
                    <div key={row.externalId} className="mb-4 rounded-2xl border bg-white p-4 shadow-sm last:mb-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.hotelName}</p>
                          <p className="text-xs text-muted-foreground">{row.hotelId}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Nota {row.rating.toFixed(1)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{row.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Cloud className="h-3.5 w-3.5" />
                          {row.provider}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          {row.guestName || "Visitante"}
                        </span>
                        <span>{formatRowDate(row.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {pendingRows.length} feedbacks aguardando processamento inteligente.
                </p>
                <Button
                  onClick={processPending}
                  disabled={processing || loading || pendingRows.length === 0}
                  className="flex items-center gap-2"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  {processing ? "Processando..." : "Rodar Wish IA agora"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Database className="h-4 w-4 text-emerald-600" />
                Telemetria da sandbox
              </CardTitle>
              <CardDescription>Resumo rápido da coleta e dos envios ao Firestore.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {sandboxInsights.map(insight => (
                <div key={insight.label} className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{insight.label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{insight.value}</p>
                  <p className="text-sm text-slate-500">{insight.hint}</p>
                </div>
              ))}
              <div className="rounded-2xl bg-slate-900/90 p-4 text-sm text-white">
                <p className="font-semibold">Pipeline</p>
                <p className="mt-1 text-white/70">
                  1) coletamos no endpoint sandbox • 2) analisamos com a Wish IA • 3) salvamos em `analyses` e liberamos nos dashboards.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:gap-8">
          <div ref={resultRef}>
            <Card className="rounded-3xl border bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Brain className="h-4 w-4 text-emerald-600" />
                  Última execução manual
                </CardTitle>
                <CardDescription>
                  {lastResult ? `Processado em ${formatDateTime(lastResult.metadata.processedAt)}` : "Nenhuma execução registrada ainda"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Processados</p>
                    <p className="text-2xl font-semibold text-slate-900">{lastResult?.metadata.processed ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Ignorados</p>
                    <p className="text-2xl font-semibold text-slate-900">{lastResult?.metadata.skipped ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Falhas</p>
                    <p className="text-2xl font-semibold text-red-500">{lastResult?.metadata.failed ?? 0}</p>
                  </div>
                </div>
                {processedHotels.length > 0 ? (
                  <div className="space-y-3">
                    {processedHotels.map(hotel => (
                      <div key={hotel.importId} className="flex items-center justify-between rounded-2xl border bg-slate-50 p-3">
                        <div>
                          <p className="font-medium text-slate-900">{hotel.hotelName}</p>
                          <p className="text-xs text-muted-foreground">{hotel.hotelId}</p>
                        </div>
                        <Badge variant="outline">{hotel.count} itens</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Execute o pipeline uma vez para ver o detalhamento por hotel.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {latestHistory.length > 0 && (
            <Card className="rounded-3xl border bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Histórico recente
                </CardTitle>
                <CardDescription>Monitoramento das últimas 5 gravações no Firestore.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestHistory.map((item: IntegrationProcessedItem, index) => (
                  <div key={`${item.externalId}-${index}`} className="flex items-center justify-between rounded-2xl border bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.hotelName}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(item.processedAt)}</p>
                    </div>
                    <Badge variant={item.status === "failed" ? "destructive" : "default"}>
                      {item.status === "failed" ? "Falhou" : "Processado"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </SharedDashboardLayout>
  );
}
