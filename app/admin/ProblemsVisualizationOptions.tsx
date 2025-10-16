"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Star, AlertTriangle, BarChart3, ArrowLeft, ChevronRight } from "lucide-react";
import type { Feedback } from "@/types";
import { ProblemsVisualizationOptions as StaffProblemsVisualization } from "@/app/dashboard/ProblemsVisualizationOptions";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import DetailProblem from "./components/detail_problem";

interface AdminProblemsVisualizationOptionsProps {
  filteredData: Feedback[];
  setSelectedItem: (item: any) => void;
  setChartDetailOpen: (open: boolean) => void;
}

// Validação alinhada com o componente do staff
const isValidProblem = (problem?: string) => {
  if (!problem || typeof problem !== "string") return false;
  const p = problem.toLowerCase().trim();
  const invalid = [
    "vazio",
    "sem problemas",
    "nao identificado",
    "não identificado",
    "sem problema",
    "nenhum problema",
    "ok",
    "tudo ok",
    "sem",
    "n/a",
    "na",
    "-",
    "",
    "elogio",
    "positivo",
    "bom",
    "boa",
    "excelente",
    "ótimo",
    "otimo",
    "perfeito",
    "maravilhoso",
    "satisfeito",
    "satisfeita"
  ];
  return !invalid.includes(p) && !p.includes("vazio") && !p.includes("sem problemas") && p.length > 2;
};

const feedbackHasValidProblems = (f: any) => {
  if (Array.isArray(f.allProblems) && f.allProblems.length > 0) {
    return f.allProblems.some((obj: any) => obj?.problem && isValidProblem(obj.problem));
  }
  if (typeof f.problem === "string" && f.problem.trim() !== "") {
    const problems = f.problem.includes(";") ? f.problem.split(";").map((p: string) => p.trim()) : [f.problem];
    return problems.some((p: string) => isValidProblem(p));
  }
  return false;
};

const computeHotelMetrics = (list: Feedback[]) => {
  const totalFeedbacks = list.length;
  const averageRating = totalFeedbacks > 0 ? list.reduce((acc, f: any) => acc + (f.rating || 0), 0) / totalFeedbacks : 0;
  const criticalCount = list.filter((f: any) => (f.rating || 0) <= 2).length;
  const criticalPct = totalFeedbacks ? (criticalCount / totalFeedbacks) * 100 : 0;
  // Contar problemas válidos
  let problemCount = 0;
  list.forEach((f: any) => {
    if (Array.isArray(f.allProblems) && f.allProblems.length > 0) {
      problemCount += f.allProblems.filter((obj: any) => obj?.problem && isValidProblem(obj.problem)).length;
    } else if (typeof f.problem === "string" && f.problem.trim() !== "") {
      const problems = f.problem.includes(";") ? f.problem.split(";").map((p: string) => p.trim()) : [f.problem];
      problemCount += problems.filter((p: string) => isValidProblem(p)).length;
    }
  });
  return { totalFeedbacks, averageRating, criticalCount, criticalPct, problemCount };
};

export function AdminProblemsVisualizationOptions({ filteredData, setSelectedItem, setChartDetailOpen }: AdminProblemsVisualizationOptionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedHotel, setSelectedHotel] = useState<null | { hotel: string; list: Feedback[]; metrics: ReturnType<typeof computeHotelMetrics> }>(null);
  const [showDetailProblem, setShowDetailProblem] = useState(false);

  const hotels = useMemo(() => {
    const map = new Map<string, Feedback[]>();
    (filteredData || []).forEach((f: any) => {
      const hotelKey = f.hotel || f.hotelName || "Não identificado";
      if (!map.has(hotelKey)) map.set(hotelKey, []);
      map.get(hotelKey)!.push(f);
    });
    // Ordenar por quantidade de feedbacks desc
    return Array.from(map.entries())
      .map(([hotel, list]) => ({ hotel, list, metrics: computeHotelMetrics(list) }))
      .sort((a, b) => b.metrics.totalFeedbacks - a.metrics.totalFeedbacks);
  }, [filteredData]);

  const aggregatedMetrics = useMemo(() => computeHotelMetrics(filteredData || []), [filteredData]);

  // Inicializa estado a partir da URL (?hotel=Nome)
  useEffect(() => {
    const hotelParam = searchParams?.get("hotel");
    if (!hotelParam) return;
    // searchParams já retorna valor decodificado
    const target = hotels.find(h => h.hotel === hotelParam);
    if (target) {
      setSelectedHotel(target);
    }
  }, [hotels, searchParams]);

  const handleSelectHotel = (hotelObj: { hotel: string; list: Feedback[]; metrics: ReturnType<typeof computeHotelMetrics> }) => {
    setSelectedHotel(hotelObj);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("hotel", hotelObj.hotel);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleBackToOverview = () => {
    setSelectedHotel(null);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("hotel");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  // Garantir que topHotels esteja presente ao selecionar itens via visualização do staff
  const getTopHotelsForItem = (feedbacks: any[]) => {
    const hotelCounts: Record<string, number> = {};
    (feedbacks || []).forEach((f: any) => {
      const hotel = f.hotel || f.hotelName || "Não especificado";
      hotelCounts[hotel] = (hotelCounts[hotel] || 0) + 1;
    });
    return Object.entries(hotelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hotel, count]) => ({ hotel, count }));
  };

  const setSelectedItemWithTopHotels = (item: any) => {
    const feedbacks = item?.feedbacks ?? (Array.isArray(item?.data) ? item.data : filteredData);
    const topHotels = item?.stats?.topHotels ?? getTopHotelsForItem(feedbacks || []);
    setSelectedItem({ ...item, stats: { ...item.stats, topHotels } });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      {!selectedHotel && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Problemas — Visão Geral e por Hotel</h3>
            </div>
          </div>

          {/* Resumo agregado profissional */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Feedbacks</div>
              <div className="text-xl font-bold">{aggregatedMetrics.totalFeedbacks}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Problemas Válidos</div>
              <div className="text-xl font-bold">{aggregatedMetrics.problemCount}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Média de Rating</div>
              <div className="text-xl font-bold">{aggregatedMetrics.averageRating.toFixed(1)}⭐</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Críticos</div>
              <div className="text-xl font-bold">{aggregatedMetrics.criticalCount} ({aggregatedMetrics.criticalPct.toFixed(1)}%)</div>
            </div>
          </div>
        </Card>
      )}

      {/* Visão agregada — sempre primeiro */}
      {!selectedHotel && (
        <Card className="p-4">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-purple-600" /> Visão Agregada de Problemas</span>
              <Button variant="outline" size="sm" onClick={() => setShowDetailProblem(v => !v)}>
                {showDetailProblem ? 'Ocultar Detalhes' : 'Ver Detalhes'}
              </Button>
            </CardTitle>
            <CardDescription>Mesma visualização do staff para visão geral. O botão alterna para ver apenas detalhes dos problemas.</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffProblemsVisualization 
              filteredData={filteredData}
              setSelectedItem={setSelectedItemWithTopHotels}
              setChartDetailOpen={setChartDetailOpen}
            />
            {showDetailProblem && (
              <div className="mt-6">
                <DetailProblem rows={filteredData} maxProblems={15} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de hotéis — cartões clicáveis */}
      {!selectedHotel && (
        <div className="space-y-4">
          <h4 className="text-base font-semibold">Explorar por Hotel</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotels.map(({ hotel, list, metrics }) => (
              <Card 
                key={hotel}
                className="p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => handleSelectHotel({ hotel, list, metrics })}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" /> {hotel}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>Clique para ver problemas específicos deste hotel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-700 dark:text-blue-300">Feedbacks</div>
                      <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{metrics.totalFeedbacks}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-700 dark:text-red-300">Problemas</div>
                      <div className="text-lg font-bold text-red-800 dark:text-red-200">{metrics.problemCount}</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-yellow-700 dark:text-yellow-300">Rating Médio</div>
                      <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{metrics.averageRating.toFixed(1)}⭐</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-700 dark:text-red-300">Críticos</div>
                      <div className="text-lg font-bold text-red-800 dark:text-red-200">{metrics.criticalCount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detalhe de um hotel */}
      {selectedHotel && (
        <Card className="p-4">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" /> {selectedHotel.hotel}</span>
              <Button variant="outline" size="sm" onClick={handleBackToOverview} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar para visão geral
              </Button>
            </CardTitle>
            <CardDescription>Visualização detalhada dos problemas do hotel selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Métricas rápidas do hotel */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-700 dark:text-blue-300">Feedbacks</div>
                <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{selectedHotel.metrics.totalFeedbacks}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-red-700 dark:text-red-300">Problemas</div>
                <div className="text-lg font-bold text-red-800 dark:text-red-200">{selectedHotel.metrics.problemCount}</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-yellow-700 dark:text-yellow-300">Rating Médio</div>
                <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{selectedHotel.metrics.averageRating.toFixed(1)}⭐</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-red-700 dark:text-red-300">Críticos</div>
                <div className="text-lg font-bold text-red-800 dark:text-red-200">{selectedHotel.metrics.criticalCount}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-red-700 dark:text-red-300">Taxa Crítica</div>
                <div className="text-lg font-bold text-red-800 dark:text-red-200">{selectedHotel.metrics.criticalPct.toFixed(1)}%</div>
              </div>
            </div>

            {/* Visualização de problemas do staff para este hotel */}
            <StaffProblemsVisualization 
              filteredData={selectedHotel.list}
              setSelectedItem={setSelectedItem}
              setChartDetailOpen={setChartDetailOpen}
            />
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowDetailProblem(v => !v)} className="gap-2">
                {showDetailProblem ? 'Ocultar Detalhes' : 'Ver Detalhes'}
              </Button>
            </div>
            {showDetailProblem && (
              <div className="mt-4">
                <DetailProblem rows={selectedHotel.list} maxProblems={12} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminProblemsVisualizationOptions;
