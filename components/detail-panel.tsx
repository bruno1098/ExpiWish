"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModernChart, RatingsChart } from "@/components/modern-charts";
import { formatDateBR } from "@/lib/utils";
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

interface DetailPanelProps {
  isOpen: boolean;
  selectedItem: SelectedItem | null;
  onClose: () => void;
  onViewAllComments: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  hotel: <Building2 className="h-5 w-5" />,
  problem: <AlertCircle className="h-5 w-5" />,
  rating: <Star className="h-5 w-5" />,
  keyword: <Tag className="h-5 w-5" />,
  source: <Globe className="h-5 w-5" />,
};


// Comentários Dialog dentro do mesmo arquivo

interface CommentsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  comments: any[];
  title?: string;
  description?: string;
}

const cleanDataWithSeparator = (value: string): string => {
  if (!value || typeof value !== 'string') return "";
  // Normaliza separadores repetidos (";;;", "|||", ",,,") para ponto-e-vírgula
  const normalized = value
    .replace(/[|]+/g, ';')
    .replace(/,+/g, ';')
    .replace(/;+/g, ';');
  // Divide, remove vazios/placeholder e duplicatas
  const items = normalized.split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.toLowerCase() !== 'vazio' && s.toLowerCase() !== 'sem problemas' && !s.startsWith('+'));
  if (items.length === 0) return "";
  const unique = Array.from(new Set(items));
  return unique.join(', ');
};

export const CommentsDialog: React.FC<CommentsDialogProps> = ({
  isOpen,
  onOpenChange,
  comments,
  title = "Todos os Comentários",
  description,
}) => {
  // Paginação para melhor performance
  const [currentPage, setCurrentPage] = React.useState(1);
  const commentsPerPage = 20;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  const paginatedComments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * commentsPerPage;
    return comments.slice(startIndex, startIndex + commentsPerPage);
  }, [comments, currentPage]);
  
  // Reset página quando modal abre
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);
  
  // Scroll automático para o topo ao mudar de página
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  const formatDate = (date: string | Date) => {
    if (!date) return "";
    try {
      return formatDateBR(date instanceof Date ? date.toISOString() : date);
    } catch {
      return typeof date === "string" ? date : "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 sm:pb-6 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="truncate">{title} {comments && `(${comments.length})`}</span>
          </DialogTitle>
          {description && <DialogDescription className="text-base sm:text-lg">{description}</DialogDescription>}
        </DialogHeader>

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-2 sm:p-4 scroll-smooth">
          {/* Controles de Paginação - Topo */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {currentPage} de {totalPages} • Mostrando {paginatedComments.length} de {comments.length} comentários
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-4 sm:space-y-6">
            {paginatedComments.map((feedback, idx) => (
              <Card key={`${currentPage}-${idx}`} className="p-4 sm:p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-5 w-5 ${i < feedback.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <Badge variant="outline" className="px-3 py-1 font-semibold">
                      {feedback.rating}/5
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold text-foreground">
                      {feedback.hotel || ""}
                    </div>
                    <div className="text-sm text-muted-foreground">{formatDate(feedback.date)}</div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-muted/30 rounded-lg text-foreground">
                  {feedback.comment || "Sem comentário"}
                </div>

                {/* Metadados */}
                <div className="space-y-2 text-sm">
                  {feedback.source && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Fonte:</span>
                      <Badge variant="secondary">{feedback.source}</Badge>
                    </div>
                  )}
                  {feedback.language && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Idioma:</span>
                      <Badge variant="outline">{feedback.language}</Badge>
                    </div>
                  )}
                  {feedback.keyword && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Palavras-chave:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {feedback.keyword.split(";").map((keyword: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800">
                            {keyword.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {feedback.problem && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Problemas identificados:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {feedback.problem.split(";").map((problem: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={idx === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800" : idx === 1 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800" : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800"}
                            title={idx === 0 && feedback.problem_detail ? feedback.problem_detail : problem.trim()}
                          >
                            {problem.trim()}
                          </Badge>
                        ))}
                      </div>
                      {feedback.problem_detail && (
                        <p className="text-xs text-muted-foreground mt-1">{feedback.problem_detail}</p>
                      )}
                    </div>
                  )}
                  {/* NOVO: Seção para elogios/detalhes positivos */}
                  {(feedback.compliments || feedback.positive_details) && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Elogios detectados:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(feedback.compliments || feedback.positive_details).split(";").map((compliment: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800"
                            title={compliment.trim()}
                          >
                            {compliment.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {feedback.apartamento && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-medium">Apartamento/Quarto:</span>
                      <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                        {feedback.apartamento}
                      </Badge>
                    </div>
                  )}
                  {feedback.sector && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-medium">Setor:</span>
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        {cleanDataWithSeparator(feedback.sector)}
                      </Badge>
                    </div>
                  )}
                  {feedback.department && !feedback.sector && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-medium">Departamento:</span>
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        {cleanDataWithSeparator(feedback.department)}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {comments.length === 0 && <div className="text-center p-8 text-muted-foreground">Nenhum comentário encontrado.</div>}
          </div>
          
          {/* Controles de Paginação - Rodapé */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const titleMap: Record<string, string> = {
  keyword: "Palavra-chave",
  problem: "Problema",
  sector: "Departamento",
  source: "Fonte",
  language: "Idioma",
  rating: "Avaliação",
};

/**
 * Painel lateral reutilizável para exibir detalhes de qualquer gráfico.
 * Encapsula toda a interface de UX premium já existente.
 */
// Componente de painel de detalhes
export const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  selectedItem,
  onClose,
  onViewAllComments,
}) => {
  if (!selectedItem) return null;

  const { stats } = selectedItem;

  return (
    <>
      {/* Painel Lateral */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[42rem] bg-background border-l border-border shadow-2xl transform transition-all duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Cabeçalho */}
          <div className="relative p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      {iconMap[selectedItem.type] ?? <BarChart3 className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {titleMap[selectedItem.type] ?? selectedItem.type}
                      </h3>
                      <p className="text-sm text-blue-100 opacity-90">
                        {selectedItem.value}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Métricas de Destaque */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.totalOccurrences}
                  </div>
                  <div className="text-xs text-blue-100 opacity-75">Ocorrências</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.percentage}%</div>
                  <div className="text-xs text-blue-100 opacity-75">do Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.averageRating.toFixed(1)}
                  </div>
                  <div className="text-xs text-blue-100 opacity-75">Avaliação Média</div>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* CTA para comentários */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4 -m-6 mb-6 border-b">
                <Button
                  onClick={onViewAllComments}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                  size="lg"
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Ver TODOS os {stats.totalOccurrences} Comentários
                  <ExternalLink className="h-4 w-4 ml-3" />
                </Button>
              </div>

              {/* Cartões */}
              <div className="grid gap-6">
                {/* Avaliação Média */}
                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                      <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    Avaliação Média
                  </h4>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                      {stats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-2xl">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < Math.round(stats.averageRating) ? "text-yellow-500" : "text-gray-300"}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Distribuição de Sentimentos */}
                <Card className="p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Distribuição de Sentimentos
                  </h4>
                  <div className="h-48">
                    <ModernChart
                      type="pie"
                      data={[
                        { label: "Positivo", value: stats.sentimentDistribution.positive },
                        { label: "Neutro", value: stats.sentimentDistribution.neutral },
                        { label: "Negativo", value: stats.sentimentDistribution.negative },
                      ].filter((d) => d.value > 0)}
                    />
                  </div>
                </Card>

                {/* Distribuição de Avaliações */}
                <Card className="p-6 shadow-lg border-0">
                  <h4 className="font-semibold mb-4 flex items-center text-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                      <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Distribuição de Avaliações
                  </h4>
                  <div className="h-40">
                    <RatingsChart
                      data={[1, 2, 3, 4, 5].map((v) => ({ label: `${v}⭐`, value: stats.ratingDistribution[v] }))}
                    />
                  </div>
                </Card>

                {/* Tendência Mensal */}
                {stats.monthlyTrend?.length > 1 && (
                  <Card className="p-6 shadow-lg border-0">
                    <h4 className="font-semibold mb-4 flex items-center text-lg">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Tendência Mensal
                    </h4>
                    <div className="h-40">
                      <ModernChart
                        type="line"
                        data={stats.monthlyTrend.map((m: any) => ({ label: m.month, value: m.count }))}
                      />
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />}
    </>
  );
};