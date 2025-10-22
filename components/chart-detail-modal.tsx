"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModernChart, RatingsChart } from "@/components/modern-charts";
import { CommentsDialog } from "./detail-panel";
import {
  Star,
  TrendingUp,
  Building2,
  AlertCircle,
  Tag,
  Globe,
  BarChart3,
  MessageSquare,
  ExternalLink,
  X,
  Users,
  Calendar,
  Activity,
  PieChart,
  TrendingDown,
  Clock,
} from "lucide-react";

// Tipagem do item selecionado repassado pelos dashboards
export interface SelectedItem {
  type: string;
  value: string;
  stats: any;
}

interface ChartDetailModalProps {
  isOpen: boolean;
  selectedItem: SelectedItem | null;
  onOpenChange: (open: boolean) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  hotel: <Building2 className="h-5 w-5" />,
  problem: <AlertCircle className="h-5 w-5" />,
  problem_analysis: <AlertCircle className="h-5 w-5" />,
  rating: <Star className="h-5 w-5" />,
  keyword: <Tag className="h-5 w-5" />,
  source: <Globe className="h-5 w-5" />,
  sentiment: <TrendingUp className="h-5 w-5" />,
  language: <Globe className="h-5 w-5" />,
  sector: <Building2 className="h-5 w-5" />,
  apartamento: <Building2 className="h-5 w-5" />,
  general: <BarChart3 className="h-5 w-5" />,
};

const titleMap: Record<string, string> = {
  keyword: "Palavra-chave",
  problem: "Problema",
  problem_analysis: "Problema",
  sector: "Departamento",
  source: "Fonte",
  language: "Idioma",
  rating: "Avaliação",
  hotel: "Hotel",
  sentiment: "Sentimento",
  apartamento: "Apartamento",
  general: "Visão Geral",
};

const getStatusColor = (rating: number) => {
  if (rating <= 2) return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-800";
  if (rating <= 3) return "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-800";
  if (rating <= 4) return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/20 dark:border-yellow-800";
  return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-800";
};

const getStatusLabel = (rating: number) => {
  if (rating <= 2) return "Crítico";
  if (rating <= 3) return "Atenção";
  if (rating <= 4) return "Bom";
  return "Excelente";
};

/**
 * Modal de detalhes redesenhado para exibir informações de qualquer gráfico selecionado.
 * Design profissional com melhor organização e UX aprimorada.
 */
export const ChartDetailModal: React.FC<ChartDetailModalProps> = ({
  isOpen,
  selectedItem,
  onOpenChange,
}) => {
  // Estado para o modal de comentários
  const [commentsDialogOpen, setCommentsDialogOpen] = React.useState(false);

  // Função para lidar com a abertura do modal de comentários
  const handleViewAllComments = () => {
    if (selectedItem && selectedItem.stats.recentFeedbacks) {
      setCommentsDialogOpen(true);
    }
  };

  // Novo filtro: somente críticos (1-2⭐)
  const [onlyCritical, setOnlyCritical] = React.useState(false);

  if (!selectedItem) return null;

  const { stats } = selectedItem;
  const recent = Array.isArray(stats?.recentFeedbacks) ? stats.recentFeedbacks : [];

  // Derivar linhas base conforme o contexto do item selecionado
  const selectedRatingValue = selectedItem.type === 'rating'
    ? (() => { const m = String(selectedItem.value).match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; })()
    : 0;
  const baseRowsForStats = (() => {
    if (selectedItem.type === 'rating' && selectedRatingValue) {
      return recent.filter((f: any) => Number(f?.rating) === selectedRatingValue);
    }
    if (selectedItem.type === 'sector') {
      const sel = String(selectedItem.value).trim().toLowerCase();
      return recent.filter((f: any) => {
        const raw = String(f?.sector || f?.department || f?.departamento || '').trim();
        if (!raw) return false;
        const parts = raw.split(/[;,|]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        return parts.includes(sel);
      });
    }
    if (selectedItem.type === 'problem' || selectedItem.type === 'problem_analysis') {
      const base = String(selectedItem.value).split('-')[0].trim();
      return recent.filter((f: any) => String(f?.problem || f?.problem_main || f?.problemMain || '').includes(base));
    }
    return recent;
  })();
  const filteredRowsForStats = onlyCritical 
    ? baseRowsForStats.filter((f: any) => Number(f?.rating) <= 2)
    : baseRowsForStats;

  // Alias utilizado em gráficos/contexto para refletir o filtro aplicado
  const viewRows = filteredRowsForStats;

  // Métricas recalculadas com base no conjunto filtrado
  const totalFeedbacks = filteredRowsForStats.length;
  const avgRating = totalFeedbacks
    ? filteredRowsForStats.reduce((acc: number, f: any) => acc + Number(f?.rating ?? 0), 0) / totalFeedbacks
    : 0;
  const criticalCount = filteredRowsForStats.filter((f: any) => Number(f?.rating) <= 2).length;
  const criticalPct = totalFeedbacks > 0 ? (criticalCount / totalFeedbacks) * 100 : 0;
  const uniqueHotelsCount = new Set(filteredRowsForStats.map((f: any) => f?.hotel || f?.hotel_name || f?.hotelName).filter(Boolean)).size;
  const uniqueAuthorsCount = new Set(filteredRowsForStats.map((f: any) => f?.author || f?.user || f?.nome).filter(Boolean)).size;
  const usersOrHotelsLabel = selectedItem.type === "hotel" ? "Usuários" : "Hotéis";
  const usersOrHotelsValue = selectedItem.type === "hotel" ? uniqueAuthorsCount : uniqueHotelsCount;

  const ratingDistribution = [1, 2, 3, 4, 5].reduce((acc: any, r) => {
    acc[r] = filteredRowsForStats.filter((f: any) => Number(f?.rating) === r).length;
    return acc;
  }, {} as Record<number, number>);

  const sentimentDistribution = {
    positive: filteredRowsForStats.filter((f: any) => Number(f?.rating) >= 4).length,
    neutral: filteredRowsForStats.filter((f: any) => Number(f?.rating) === 3).length,
    negative: filteredRowsForStats.filter((f: any) => Number(f?.rating) <= 2).length,
  };

  // Percentual do total com fallback para totalBase
  const percentageValue = (() => {
    if (typeof stats?.percentage === 'number') return stats.percentage;
    if (typeof stats?.percentage === 'string') {
      const n = Number(String(stats.percentage).replace('%', '').trim());
      if (!Number.isNaN(n)) return n;
    }
    if (typeof stats?.pct === 'number') return stats.pct;
    const base = typeof stats?.totalBase === 'number' && stats.totalBase > 0 ? stats.totalBase : totalFeedbacks || 1;
    return Number(((totalFeedbacks / base) * 100).toFixed(1));
  })();

  function monthLabel(d: any) {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "N/A";
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    return `${mm}/${dt.getFullYear()}`;
  }

  const monthlyTrend = (() => {
    const map = new Map<string, number>();
    filteredRowsForStats.forEach((f: any) => {
      const label = monthLabel(f?.date || f?.created_at || f?.createdAt);
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  })();

  function tallyFrom(list: any[], getter: (x: any) => string | string[] | undefined) {
    const m = new Map<string, number>();
    const normalize = (s: any) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    list.forEach((it) => {
      const raw = getter(it);
      const items = Array.isArray(raw)
        ? raw
        : typeof raw === "string"
          ? raw.split(/[;,|]/)
          : [];
      items
        .map((s: string) => s?.trim())
        .filter(Boolean)
        .forEach((k: string) => {
          if (normalize(k) === 'vazio') return; // ignora placeholders
          m.set(k, (m.get(k) || 0) + 1);
        });
    });
    return Array.from(m.entries()).map(([keyword, count]) => ({ keyword, count })).sort((a, b) => b.count - a.count);
  }

  const fallbackTopKeywords = tallyFrom(filteredRowsForStats, (f: any) => f?.keywords || f?.keyword);
  const topKeywords = (() => {
    const base = stats?.topKeywords?.length ? stats.topKeywords : fallbackTopKeywords;
    const normalize = (s: any) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const notVazio = (s: any) => normalize(s) !== 'vazio';
    if (selectedItem.type === 'sector') {
      const dep = normalize(String(selectedItem.value || ''));
      return base
        .filter((k: any) => {
          const raw = String(k?.keyword || '').replace(' – ', ' - ');
          const [prefix, ...rest] = raw.split('-');
          const label = rest.join('-').trim();
          return normalize(prefix) === dep && notVazio(label);
        })
        .slice(0, 10);
    }
    if (selectedItem.type === 'problem' || selectedItem.type === 'problem_analysis') {
      const probTarget = normalize(String(selectedItem.value || '').replace(' – ', ' - ').split('-').slice(1).join('-'));
      return base
        .filter((k: any) => {
          const kw = String(k?.keyword || '');
          return notVazio(kw) && normalize(kw).includes(probTarget);
        })
        .slice(0, 10);
    }
    return base.filter((k: any) => notVazio(k?.keyword)).slice(0, 10);
  })();
  const fallbackTopProblems = tallyFrom(filteredRowsForStats, (f: any) => [f?.problem || f?.problem_main || f?.problemMain].filter(Boolean) as any);
  const topProblems = (() => {
    const normalize = (s: any) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    // Quando for por departamento, contar apenas problemas associados ao departamento selecionado
    if (selectedItem.type === 'sector') {
      const dep = normalize(String(selectedItem.value || ''));
      const m = new Map<string, number>();
      viewRows.forEach((f: any) => {
        let matched = false;
        if (Array.isArray(f?.allProblems)) {
          for (const p of f.allProblems) {
            const d = normalize(String((p?.sector ?? p?.department) || ''));
            if (d !== dep) continue;
            const label = String(p?.problem || p?.problem_main || '').trim();
            if (!label || normalize(label) === 'vazio') continue;
            m.set(label, (m.get(label) || 0) + 1);
            matched = true;
          }
        }
        if (!matched && typeof f?.problem === 'string') {
          const list = f.problem.replace(' – ', ' - ').split(';').map((s: string) => s.trim());
          for (const s of list) {
            const parts = s.split('-');
            const d = normalize(parts[0] || '');
            const label = parts.slice(1).join('-').trim();
            if (d !== dep || !label || normalize(label) === 'vazio') continue;
            m.set(label, (m.get(label) || 0) + 1);
          }
        }
      });
      return Array.from(m.entries())
        .map(([problem, count]) => ({ problem, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }
    // Demais contextos: usar estatística existente ou fallback simples
    return (stats?.topProblems?.length
      ? stats.topProblems
      : fallbackTopProblems.map((x: any) => ({ problem: x.keyword, count: x.count }))
    ).filter((p: any) => normalize(p?.problem || p?.keyword) !== 'vazio').slice(0, 10);
  })();
  const fallbackTopHotels = tallyFrom(filteredRowsForStats, (f: any) => [f?.hotel || f?.hotel_name || f?.hotelName].filter(Boolean) as any);
  const topHotels = stats?.topHotels?.length
    ? stats.topHotels
    : fallbackTopHotels.map((x: any) => ({ hotel: x.keyword, count: x.count })).slice(0, 10);

  const statusColor = getStatusColor(avgRating);
  const statusLabel = getStatusLabel(avgRating);

  // Valor da estrela selecionada (quando o tipo é rating)
  const ratingSelected = selectedItem.type === 'rating'
    ? (() => {
        const match = String(selectedItem.value).match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })()
    : 0;

  // Filtra o contexto para cálculos específicos (por problema, estrela ou departamento)
  const contextRows = (() => {
    if (selectedItem.type === 'rating' && ratingSelected) {
      return recent.filter((f: any) => Number(f?.rating) === ratingSelected);
    }
    if (selectedItem.type === 'sector') {
      const sel = String(selectedItem.value).trim().toLowerCase();
      return recent.filter((f: any) => {
        const raw = String(f?.sector || f?.department || f?.departamento || '').trim();
        if (!raw) return false;
        const parts = raw.split(/[;,|]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        return parts.includes(sel);
      });
    }
    if (selectedItem.type === 'problem' || selectedItem.type === 'problem_analysis') {
      // Match por prefixo do problema antes de '-' para cobrir "A&B - Serviço" etc.
      const base = String(selectedItem.value).split('-')[0].trim();
      return recent.filter((f: any) => String(f?.problem || f?.problem_main || f?.problemMain || '').includes(base));
    }
    return recent;
  })();

  // Agregação de detalhes específicos (Firebase: problem_detail) com segmentação por Departamento + Problema
  const detailsAgg = (() => {
    const normalize = (s: any) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const extractLabelParts = (raw: string): { department: string; problem: string } => {
      const s = String(raw || '').replace(' – ', ' - ');
      const parts = s.split('-');
      const department = (parts[0] || '').trim();
      const problem = parts.length > 1 ? parts.slice(1).join('-').trim() : '';
      return { department, problem };
    };
    const { department, problem } = extractLabelParts(String(selectedItem.value || ''));
    const depTarget = normalize(department);
    const probTarget = normalize(problem);
    const map = new Map<string, { count: number; sum: number }>();
    viewRows.forEach((f: any) => {
      let matched = false;
      if (Array.isArray(f?.allProblems) && depTarget && probTarget) {
        for (const p of f.allProblems) {
          const pMain = normalize(String(p?.problem || ''));
          const pDept = normalize(String((p?.sector ?? p?.department) ?? ''));
          if (!pMain || !pDept || pDept !== depTarget || !pMain.includes(probTarget)) continue;
          const raw = String(p?.problem_detail || '').trim();
          if (!raw) continue;
          const curr = map.get(raw) || { count: 0, sum: 0 };
          map.set(raw, { count: curr.count + 1, sum: curr.sum + Number(f?.rating || 0) });
          matched = true;
        }
      }
      if (!matched && depTarget && probTarget) {
        const sectorRaw = String(f?.sector || f?.department || '').trim();
        const sectors = sectorRaw ? sectorRaw.split(/[;,|]/).map((s: string) => normalize(s)) : [];
        const sectorMatches = sectors.includes(depTarget);
        if (!sectorMatches) return;
        const main = normalize(String(f?.problem_main || ''));
        const list = typeof f?.problem === 'string'
          ? f.problem.split(';').map((s: string) => normalize(String(s).split('-').slice(1).join('-').trim()))
          : [];
        const ok = (main && main.includes(probTarget)) || list.some((s: string) => s.includes(probTarget));
        if (!ok) return;
        const raw = String(f?.problem_detail || '').trim();
        if (!raw) return;
        const curr = map.get(raw) || { count: 0, sum: 0 };
        map.set(raw, { count: curr.count + 1, sum: curr.sum + Number(f?.rating || 0) });
      }
    });
    return Array.from(map.entries())
      .map(([detail, v]) => ({
        detail,
        count: v.count,
        avg: v.count ? Number((v.sum / v.count).toFixed(1)) : 0,
        pct: viewRows.length ? Number(((v.count / viewRows.length) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  })();

  // Top problemas e departamentos no contexto
  const problemsInContext = (() => {
    if (selectedItem.type === 'sector') {
      const normalize = (s: any) => String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      const dep = normalize(String(selectedItem.value || ''));
      const m = new Map<string, number>();
      viewRows.forEach((f: any) => {
        let matched = false;
        if (Array.isArray(f?.allProblems)) {
          for (const p of f.allProblems) {
            const d = normalize(String((p?.sector ?? p?.department) || ''));
            if (d !== dep) continue;
            const label = String(p?.problem || p?.problem_main || '').trim();
            if (!label || normalize(label) === 'vazio') continue;
            m.set(label, (m.get(label) || 0) + 1);
            matched = true;
          }
        }
        if (!matched && typeof f?.problem === 'string') {
          const list = f.problem.replace(' – ', ' - ').split(';').map((s: string) => s.trim());
          for (const s of list) {
            const parts = s.split('-');
            const d = normalize(parts[0] || '');
            const label = parts.slice(1).join('-').trim();
            if (d !== dep || !label || normalize(label) === 'vazio') continue;
            m.set(label, (m.get(label) || 0) + 1);
          }
        }
      });
      return Array.from(m.entries()).map(([keyword, count]) => ({ keyword, count })).sort((a, b) => b.count - a.count);
    }
    return tallyFrom(viewRows, (f: any) => [f?.problem || f?.problem_main || f?.problemMain].filter(Boolean) as any);
  })();
const departmentsInContext = tallyFrom(viewRows, (f: any) => [f?.sector || f?.department || f?.departamento].filter(Boolean) as any);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl w-[98vw] max-h-[95vh] flex flex-col bg-white dark:bg-slate-900 p-0">
          {/* Header Redesenhado */}
          <DialogHeader className="relative p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
                  {iconMap[selectedItem.type] ?? <BarChart3 className="h-6 w-6 text-slate-600 dark:text-slate-400" />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {titleMap[selectedItem.type] ?? selectedItem.type}
                  </DialogTitle>
                  <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                    {selectedItem.value}
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full border font-semibold text-sm ${statusColor}`}>
                {statusLabel}
              </div>
            </div>
          </DialogHeader>

          {/* Métricas Principais */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ocorrências</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalFeedbacks}</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <PieChart className="h-5 w-5 text-purple-500 mr-2" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">% do Total</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{`${percentageValue}%`}</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Avaliação Média</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{avgRating.toFixed(1)}</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{usersOrHotelsLabel}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {usersOrHotelsValue || 0}
                </div>
              </div>

              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Críticos</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{criticalCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{criticalPct.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <ScrollArea className="p-6 overflow-auto max-h-[calc(95vh-240px)]">
            <div className="space-y-6">
              {/* Barra de filtros rápidos */}
              <div className="flex items-center gap-3">
                <Button 
                  variant={onlyCritical ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOnlyCritical(v => !v)}
                  className="gap-2"
                >
                  <TrendingDown className="h-4 w-4" /> Somente críticos
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400">Filtra avaliações 1-2⭐ no contexto</span>
              </div>
              {/* Resumo do Item */}
              <Card className="p-6 border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  Resumo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Críticos vs Total</div>
                    <div className="text-slate-900 dark:text-slate-100 text-lg font-semibold">{criticalCount} de {totalFeedbacks}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{criticalPct.toFixed(1)}% críticos</div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Top Palavras-chave</div>
                    <div className="flex flex-wrap gap-2">
                      {(topKeywords || []).slice(0, 3).map((k: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">{k.keyword}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Top Problemas</div>
                    <div className="flex flex-wrap gap-2">
                      {(topProblems || []).slice(0, 3).map((p: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">{p.problem}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              {/* Botão para Ver Todos os Comentários */}
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Comentários Detalhados
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Visualize todos os {totalFeedbacks} comentários relacionados a este item
                    </p>
                  </div>
                  <Button 
                    onClick={handleViewAllComments}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Ver Todos os Comentários
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>

              {/* Grid de Análises */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Avaliação Detalhada */}
                <Card className="p-6 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                      <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    Análise de Avaliação
                  </h4>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {stats.averageRating.toFixed(1)}
                      </div>
                      <div className="text-2xl mb-2">
                        {Array.from({length: 5}, (_, i) => (
                          <span key={i} className={i < Math.round(stats.averageRating) ? "text-yellow-500" : "text-slate-300"}>
                            ⭐
                          </span>
                        ))}
                      </div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Distribuição de Sentimentos */}
                {(sentimentDistribution.positive + sentimentDistribution.neutral + sentimentDistribution.negative) > 0 && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Distribuição de Sentimentos
                    </h4>
                    <div className="h-80 lg:h-96 w-full overflow-visible">
                      <ModernChart 
                        type="doughnut"
                        data={[
                          { label: 'Positivo', value: sentimentDistribution.positive || 0 },
                          { label: 'Neutro', value: sentimentDistribution.neutral || 0 },
                          { label: 'Negativo', value: sentimentDistribution.negative || 0 }
                        ].filter(item => item.value > 0)}
                      />
                    </div>
                  </Card>
                )}

                {/* Distribuição de Avaliações */}
                {Object.values(ratingDistribution || {}).some((v) => Number(v) > 0) && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                        <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      Distribuição de Avaliações
                    </h4>
                    <div className="h-80 lg:h-96 w-full overflow-visible">
                      <RatingsChart 
                        data={[
                          { label: '1⭐', value: ratingDistribution[1] || 0 },
                          { label: '2⭐', value: ratingDistribution[2] || 0 },
                          { label: '3⭐', value: ratingDistribution[3] || 0 },
                          { label: '4⭐', value: ratingDistribution[4] || 0 },
                          { label: '5⭐', value: ratingDistribution[5] || 0 }
                        ].filter(item => item.value > 0)}
                      />
                    </div>
                  </Card>
                )}

                {/* Detalhes Específicos do Problema (Firebase: problem_detail) */}
                {(selectedItem.type === 'problem' || selectedItem.type === 'problem_analysis') && detailsAgg.length > 0 && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      Detalhes Específicos (problem_detail)
                    </h4>
                    <div className="space-y-3">
                      {detailsAgg.slice(0, 8).map((d) => (
                        <div key={d.detail} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-2 py-1">{d.detail}</Badge>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {d.count} ocorrências · {d.avg.toFixed(1)}⭐ · {d.pct}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Seções direcionadas por Estrelas */}
                {selectedItem.type === 'rating' && (
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    <Card className="p-6 border border-slate-200 dark:border-slate-700">
                      <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        Principais Problemas em {ratingSelected}⭐
                      </h4>
                      <div className="h-80 lg:h-96 w-full overflow-visible">
                        <ModernChart
                          type="horizontalBar"
                          categoryType="problem"
                          data={problemsInContext.slice(0, 8).map((p: any) => ({ label: p.keyword, value: p.count }))}
                          contextRows={viewRows}
                        />
                      </div>
                    </Card>
                    <Card className="p-6 border border-slate-200 dark:border-slate-700">
                      <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                          <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Departamentos em {ratingSelected}⭐
                      </h4>
                      <div className="h-80 lg:h-96 w-full overflow-visible">
                        <ModernChart
                          type="bar"
                          categoryType="department"
                          data={departmentsInContext.slice(0, 8).map((d: any) => ({ label: d.keyword, value: d.count }))}
                        />
                      </div>
                    </Card>
                  </div>
                )}

                {/* Seções direcionadas por Departamento */}
                {selectedItem.type === 'sector' && (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="p-6 border border-slate-200 dark:border-slate-700 lg:col-span-2">
          <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            Problemas do Departamento
          </h4>
          <div className="h-80 lg:h-96 w-full overflow-visible">
            <ModernChart
              type="horizontalBar"
              categoryType="problem"
              data={problemsInContext.slice(0, 8).map((p: any) => ({ label: p.keyword, value: p.count }))}
              contextRows={viewRows}
            />
          </div>
        </Card>
        {detailsAgg.length > 0 && (
          <Card className="p-6 border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              Detalhes Específicos (problem_detail)
            </h4>
            <div className="space-y-3">
              {detailsAgg.slice(0, 8).map((d) => (
                <div key={d.detail} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-2 py-1">{d.detail}</Badge>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {d.count} ocorrências · {d.avg.toFixed(1)}⭐ · {d.pct}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )}

                {/* Tendência Mensal */}
                {monthlyTrend && monthlyTrend.length > 1 && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                        <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Tendência Mensal
                    </h4>
                    <div className="h-80 lg:h-96 w-full overflow-visible">
                      <ModernChart 
                        type="line"
                        data={monthlyTrend.map((item: any) => ({
                          label: item.month,
                          value: item.count
                        }))}
                      />
                    </div>
                  </Card>
                )}
              </div>

              {/* Seções de Listas */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Hotéis Afetados */}
                {topHotels && topHotels.length > 0 && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      Principais Hotéis ({topHotels.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {topHotels.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.hotel}</span>
                          <Badge variant="secondary" className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            {item.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Palavras-chave Relacionadas */}
                {topKeywords && topKeywords.length > 0 && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mr-3">
                        <Tag className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      Principais Palavras-chave ({topKeywords.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {topKeywords.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.keyword}</span>
                          <Badge variant="secondary" className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                            {item.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Problemas Relacionados */}
                {topProblems && topProblems.length > 0 && (
                  <Card className="p-6 border border-slate-200 dark:border-slate-700 lg:col-span-2">
                    <h4 className="font-semibold mb-4 flex items-center text-lg text-slate-900 dark:text-slate-100">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      Problemas Relacionados ({topProblems.length})
                    </h4>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 max-h-64 overflow-y-auto">
                      {topProblems.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="font-medium text-slate-900 dark:text-slate-100 flex-1 mr-3">{item.problem}</span>
                          <Badge variant="secondary" className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                            {item.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog para exibir todos os comentários */}
      {selectedItem && (
        <CommentsDialog
          isOpen={commentsDialogOpen}
          onOpenChange={setCommentsDialogOpen}
          comments={stats.recentFeedbacks || []}
          title={`Comentários para ${titleMap[selectedItem.type] || selectedItem.type}: ${selectedItem.value}`}
          description={`Visualizando todos os ${stats.totalOccurrences} comentários relacionados`}
        />
      )}
    </>
  );
};