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
  rating: <Star className="h-5 w-5" />,
  keyword: <Tag className="h-5 w-5" />,
  source: <Globe className="h-5 w-5" />,
  sentiment: <TrendingUp className="h-5 w-5" />,
  language: <Globe className="h-5 w-5" />,
  sector: <Building2 className="h-5 w-5" />,
  apartamento: <Building2 className="h-5 w-5" />,
};

const titleMap: Record<string, string> = {
  keyword: "Palavra-chave",
  problem: "Problema",
  sector: "Departamento",
  source: "Fonte",
  language: "Idioma",
  rating: "Avaliação",
  hotel: "Hotel",
  sentiment: "Sentimento",
  apartamento: "Apartamento",
};

/**
 * Modal de detalhes para exibir informações de qualquer gráfico selecionado.
 * Encapsula toda a interface de UX premium e fornece uma experiência de visualização centralizada.
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
    if (selectedItem) {
      setCommentsDialogOpen(true);
    }
  };

  if (!selectedItem) return null;

  const { stats } = selectedItem;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[98vh] w-[98vw] overflow-hidden flex flex-col">
          <DialogHeader className="relative p-4 sm:p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden rounded-t-lg">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      {iconMap[selectedItem.type] ?? <BarChart3 className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-lg sm:text-xl font-bold text-white truncate">
                        {titleMap[selectedItem.type] ?? selectedItem.type}
                      </DialogTitle>
                      <p className="text-sm text-blue-100 opacity-90 truncate">
                        {selectedItem.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Métricas Destacadas */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">{stats.totalOccurrences}</div>
                  <div className="text-xs text-blue-100 opacity-75">Ocorrências</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">{stats.percentage}%</div>
                  <div className="text-xs text-blue-100 opacity-75">do Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">{stats.averageRating.toFixed(1)}</div>
                  <div className="text-xs text-blue-100 opacity-75">Avaliação Média</div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Conteúdo Principal com Scrolling */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 transparent'
          }}>
            {/* Botão para ver todos os comentários */}
            <div className="mb-6 sm:mb-8">
              <Button 
                onClick={handleViewAllComments}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
              >
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base">Ver TODOS os {stats.totalOccurrences} Comentários</span>
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-2 sm:ml-3" />
              </Button>
            </div>

            {/* Cards de Informação com Design Moderno */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
              {/* Avaliação Média */}
              <Card className="p-4 sm:p-6 shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                <h4 className="font-semibold mb-4 flex items-center text-lg">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  Avaliação Média
                </h4>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">{stats.averageRating.toFixed(1)}</div>
                  <div className="text-2xl">
                    {Array.from({length: 5}, (_, i) => (
                      <span key={i} className={i < Math.round(stats.averageRating) ? "text-yellow-500" : "text-gray-300"}>
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Distribuição de Sentimentos */}
              <Card className="p-4 sm:p-6 shadow-lg border-0">
                <h4 className="font-semibold mb-4 flex items-center text-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Distribuição de Sentimentos
                </h4>
                <div className="h-72 w-full">
                  <ModernChart 
                    type="pie"
                    data={[
                      { label: 'Positivo', value: stats.sentimentDistribution.positive },
                      { label: 'Neutro', value: stats.sentimentDistribution.neutral },
                      { label: 'Negativo', value: stats.sentimentDistribution.negative }
                    ].filter(item => item.value > 0)}
                  />
                </div>
              </Card>

              {/* Distribuição de Avaliações */}
              <Card className="p-4 sm:p-6 shadow-lg border-0">
                <h4 className="font-semibold mb-4 flex items-center text-lg">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Distribuição de Avaliações
                </h4>
                <div className="h-64 w-full">
                  <RatingsChart 
                    data={[
                      { label: '1⭐', value: stats.ratingDistribution[1] },
                      { label: '2⭐', value: stats.ratingDistribution[2] },
                      { label: '3⭐', value: stats.ratingDistribution[3] },
                      { label: '4⭐', value: stats.ratingDistribution[4] },
                      { label: '5⭐', value: stats.ratingDistribution[5] }
                    ]}
                  />
                </div>
              </Card>

              {/* Tendência Mensal */}
              {stats.monthlyTrend && stats.monthlyTrend.length > 1 && (
                <Card className="p-4 sm:p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    Tendência Mensal
                  </h4>
                  <div className="h-64 w-full">
                    <ModernChart 
                      type="line"
                      data={stats.monthlyTrend.map((item: any) => ({
                        label: item.month,
                        value: item.count
                      }))}
                    />
                  </div>
                </Card>
              )}

              {/* Hotéis Afetados */}
              {stats.topHotels && stats.topHotels.length > 0 && (
                <Card className="p-4 sm:p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                      <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Principais Hotéis
                  </h4>
                  <div className="space-y-3">
                    {stats.topHotels.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="font-medium">{item.hotel}</span>
                        <Badge variant="secondary" className="px-3 py-1">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Palavras-chave Relacionadas */}
              {stats.topKeywords && stats.topKeywords.length > 0 && (
                <Card className="p-4 sm:p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mr-3">
                      <Tag className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Principais Palavras-chave
                  </h4>
                  <div className="space-y-3">
                    {stats.topKeywords.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="font-medium">{item.keyword}</span>
                        <Badge variant="secondary" className="px-3 py-1">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Problemas Relacionados */}
              {stats.topProblems && stats.topProblems.length > 0 && (
                <Card className="p-4 sm:p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    Problemas Relacionados
                  </h4>
                  <div className="space-y-3">
                    {stats.topProblems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="font-medium">{item.problem}</span>
                        <Badge variant="secondary" className="px-3 py-1">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para exibir todos os comentários */}
      {selectedItem && (
        <CommentsDialog
          isOpen={commentsDialogOpen}
          onOpenChange={setCommentsDialogOpen}
          comments={stats.recentFeedbacks || []}
          title={`Comentários para ${titleMap[selectedItem.type] || selectedItem.type}: ${selectedItem.value}`}
        />
      )}
    </>
  );
};