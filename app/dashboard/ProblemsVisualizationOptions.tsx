"use client";

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Star, 
  AlertTriangle,
  Building2, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  X,
  Grid3X3,
  List,
  LayoutGrid,
  SortAsc,
  Filter,
  Calendar,
  Zap,
  Lightbulb,
  BarChart3,
  PieChart,
  MessageSquare
} from "lucide-react";
import { Feedback } from "@/types";
import { Line, Bar, Pie, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Recharts para Sankey e barras empilhadas
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend as RechartsLegend,
  LabelList
} from 'recharts';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Componente de visualização avançada de detalhes
const AdvancedDetailView = ({ item, type, filteredData, executiveSummary }: {
  item: any;
  type: 'problem' | 'department' | 'executive' | 'conversational';
  filteredData: Feedback[];
  executiveSummary: any;
}) => {
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const commentsPerPage = 10;

  // Estados para filtros de comentários
  const [commentFilter, setCommentFilter] = useState<'all' | 'critical' | 'positive' | 'with-suggestions'>('all');
  const [sortComments, setSortComments] = useState<'recent' | 'oldest' | 'rating-asc' | 'rating-desc'>('recent');
  
  // Estados para os cartões detalhados de departamento
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // RENDERIZAÇÃO ESPECIAL: Cartões Detalhados de Departamento
  if (item.isDepartmentCards && item.problems) {
    const toggleCardExpansion = (problemId: string) => {
      setExpandedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(problemId)) {
          newSet.delete(problemId);
        } else {
          newSet.add(problemId);
        }
        return newSet;
      });
    };

    return (
      <div className="space-y-6">
        {/* Header do departamento com estatísticas completas */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
          <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
            🏢 {item.departmentName} - Análise Completa Detalhada
          </h3>
          
          {/* Estatísticas principais em grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{item.totalProblems}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Tipos de Problemas</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{item.totalFeedbacks}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Feedbacks Totais</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-bold text-red-600">{item.criticalCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Críticos (≤2⭐)</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{item.positiveCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Positivos (≥4⭐)</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{item.averageRating.toFixed(1)}⭐</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Rating Médio</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
              <div className="text-2xl font-bold text-indigo-600">
                {((item.criticalCount / item.totalFeedbacks) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Taxa Crítica</div>
            </div>
          </div>

          {/* Barra de progresso dos ratings */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">📊 Distribuição de Ratings:</h4>
            {(() => {
              const allRatings = item.problems.reduce((acc: number[], problem: any) => [...acc, ...problem.ratings], []);
              const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
                rating,
                count: allRatings.filter((r: number) => r === rating).length,
                percentage: allRatings.length > 0 ? (allRatings.filter((r: number) => r === rating).length / allRatings.length) * 100 : 0
              }));

              return (
                <div className="space-y-2">
                  {ratingCounts.map(({ rating, count, percentage }) => (
                    <div 
                      key={rating} 
                      className="flex items-center gap-3 group cursor-help transition-all duration-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 p-2 rounded-lg"
                      title={`${rating}⭐: ${count} avaliações (${percentage.toFixed(1)}%) - ${rating >= 4 ? 'Excelente' : rating === 3 ? 'Regular' : 'Crítico'} | Clique para filtrar por esta avaliação`}
                      onClick={() => {
                        // Poderia implementar filtro por rating aqui
                        console.log(`Filtrar por rating ${rating}⭐`);
                      }}
                    >
                      <span className="w-8 text-sm font-medium group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-200">{rating}⭐</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative group-hover:shadow-md transition-all duration-300">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 group-hover:brightness-110 group-hover:saturate-110 ${
                            rating >= 4 ? 'bg-green-500 group-hover:bg-green-600' : 
                            rating === 3 ? 'bg-yellow-500 group-hover:bg-yellow-600' : 'bg-red-500 group-hover:bg-red-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference group-hover:font-semibold transition-all duration-200">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Lista de problemas como cartões super detalhados */}
        <div className="space-y-6">
          {item.problems.sort((a: any, b: any) => b.count - a.count).map((problem: any, index: number) => {
            const isExpanded = expandedCards.has(problem.id || problem.problem);
            const avgRating = problem.ratings.length > 0 
              ? (problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length) 
              : 0;
            const criticalCount = problem.ratings.filter((r: number) => r <= 2).length;
            const positiveCount = problem.ratings.filter((r: number) => r >= 4).length;
            const moderateCount = problem.ratings.filter((r: number) => r === 3).length;
            const criticalPercentage = ((criticalCount / problem.count) * 100);
            const positivePercentage = ((positiveCount / problem.count) * 100);

            return (
              <Card key={problem.id || problem.problem} className={`overflow-hidden transition-all duration-300 transform ${
                isExpanded ? 'shadow-xl border-purple-200 dark:border-purple-700 scale-102' : 'shadow-md hover:shadow-lg hover:scale-101 border-gray-200 dark:border-gray-700'
              } hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer group`}>
                
                {/* Header do cartão com ranking */}
                <div className={`bg-gradient-to-r from-purple-50 via-white to-pink-50 dark:from-purple-950/30 dark:via-gray-800 dark:to-pink-950/30 p-6 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${
                  !isExpanded ? 'group-hover:from-purple-100 group-hover:to-pink-100 dark:group-hover:from-purple-950/40 dark:group-hover:to-pink-950/40' : ''
                }`}>
                  <div className="flex items-start gap-4">
                    {/* Número do ranking */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${
                      index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                      index < 5 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                      'bg-gradient-to-r from-gray-400 to-gray-600'
                    }`}>
                      #{index + 1}
                    </div>

                    {/* Informações principais */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3 break-words">
                        🎯 {problem.problem}
                      </h4>
                      
                      {/* Badges informativos */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                          📊 {problem.count} ocorrências
                        </Badge>
                        <Badge className={`${
                          avgRating <= 2 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                          avgRating <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        }`}>
                          ⭐ {avgRating.toFixed(2)} rating médio
                        </Badge>
                        {criticalCount > 0 && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                            🚨 {criticalCount} críticos ({criticalPercentage.toFixed(1)}%)
                          </Badge>
                        )}
                        {positiveCount > 0 && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                            ✅ {positiveCount} positivos ({positivePercentage.toFixed(1)}%)
                          </Badge>
                        )}
                        {problem.problem_detail && problem.problem_detail.trim() !== '' && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200 cursor-help animate-pulse"
                            title={`Detalhes disponíveis: ${problem.problem_detail.substring(0, 100)}${problem.problem_detail.length > 100 ? '...' : ''}`}
                          >
                            📝 Detalhes disponíveis
                          </Badge>
                        )}
                        {problem.suggestions.size > 0 && (
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
                            💡 {problem.suggestions.size} sugestões
                          </Badge>
                        )}
                      </div>

                      {/* Mini estatísticas visuais */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                          <div className="text-lg font-bold text-red-600">{criticalCount}</div>
                          <div className="text-xs text-red-500">Críticos</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
                          <div className="text-lg font-bold text-yellow-600">{moderateCount}</div>
                          <div className="text-xs text-yellow-500">Moderados</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{positiveCount}</div>
                          <div className="text-xs text-green-500">Positivos</div>
                        </div>
                      </div>
                    </div>

                    {/* Botão de expandir */}
                    <Button
                      variant={isExpanded ? "default" : "outline"}
                      onClick={() => toggleCardExpansion(problem.id || problem.problem)}
                      className={`flex items-center gap-2 transition-all duration-300 ${
                        isExpanded ? 'bg-purple-600 hover:bg-purple-700 text-white' : 
                        'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300'
                      }`}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      <span className="hidden sm:inline">
                        {isExpanded ? 'Recolher Detalhes' : 'Ver Detalhes Completos'}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Conteúdo expandido super detalhado */}
                {isExpanded && (
                  <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900/50">
                    
                    {/* Detalhes do problema (se houver) */}
                    {problem.problem_detail && problem.problem_detail.trim() !== '' && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h5 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                          📝 Detalhes Específicos do Problema:
                        </h5>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                            {problem.problem_detail}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Análise de ratings detalhada */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        📈 Análise Detalhada de Ratings:
                      </h5>
                      <div className="grid grid-cols-5 gap-3 mb-4">
                        {[5, 4, 3, 2, 1].map(rating => {
                          const count = problem.ratings.filter((r: number) => r === rating).length;
                          const percentage = problem.ratings.length > 0 ? (count / problem.ratings.length) * 100 : 0;
                          
                          return (
                            <div key={rating} className={`text-center p-3 rounded-lg ${
                              rating >= 4 ? 'bg-green-50 dark:bg-green-900/20' :
                              rating === 3 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                              'bg-red-50 dark:bg-red-900/20'
                            }`}>
                              <div className="text-2xl font-bold">{count}</div>
                              <div className="text-sm font-medium">{rating}⭐</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Barra de progresso visual */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        {[5, 4, 3, 2, 1].map(rating => {
                          const count = problem.ratings.filter((r: number) => r === rating).length;
                          const percentage = problem.ratings.length > 0 ? (count / problem.ratings.length) * 100 : 0;
                          
                          return percentage > 0 ? (
                            <div
                              key={rating}
                              className={`h-full float-left ${
                                rating >= 4 ? 'bg-green-500' :
                                rating === 3 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Sugestões (se houver) */}
                    {problem.suggestions.size > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-5 rounded-lg border border-green-200 dark:border-green-800">
                        <h5 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                          💡 Sugestões Identificadas ({problem.suggestions.size}):
                        </h5>
                        <div className="space-y-2">
                          {Array.from(problem.suggestions).slice(0, 5).map((suggestion: any, sugIndex: number) => (
                            <div key={sugIndex} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-100 dark:border-green-900">
                              <p className="text-green-800 dark:text-green-200 font-medium">
                                "{''+suggestion}"
                              </p>
                            </div>
                          ))}
                          {problem.suggestions.size > 5 && (
                            <div className="text-center text-green-600 dark:text-green-400 text-sm font-medium">
                              ... e mais {problem.suggestions.size - 5} sugestões
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Exemplos de comentários mais detalhados */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          💬 Comentários de Exemplo ({problem.examples.length} total):
                        </span>
                        {problem.examples.length > 5 && (
                          <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            Mostrando 5 de {problem.examples.length}
                          </span>
                        )}
                      </h5>
                      
                      <div className="space-y-4">
                        {problem.examples
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 5)
                          .map((example: any, exIndex: number) => (
                          <div key={exIndex} className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                            example.rating <= 2 ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                            example.rating === 3 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' :
                            'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                          }`}>
                            {/* Header do comentário */}
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {example.author || 'Anônimo'}
                                  </span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {new Date(example.date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={`${
                                      star <= (example.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                                    } text-lg`}>
                                      ⭐
                                    </span>
                                  ))}
                                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    ({example.rating}/5)
                                  </span>
                                </div>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    highlight: `${example.date}_${example.author || 'unknown'}_${(example.text || example.comment || '').substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`,
                                    comment: (example.text || example.comment || '').substring(0, 200)
                                  });
                                  window.open(`/analysis?${params.toString()}`, '_blank');
                                }}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="ml-1 hidden sm:inline">Editar</span>
                              </Button>
                            </div>
                            
                            {/* Conteúdo do comentário */}
                            <div className="space-y-3">
                              <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
                                {example.text || example.comment}
                              </p>
                              
                              {/* Detalhes específicos se houver */}
                              {example.problem_detail && example.problem_detail.trim() !== '' && (
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded border-l-4 border-blue-400">
                                  <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                    📝 Detalhes específicos:
                                  </div>
                                  <div className="text-sm text-blue-700 dark:text-blue-300">
                                    {example.problem_detail}
                                  </div>
                                </div>
                              )}
                              
                              {/* Sugestões no comentário */}
                              {(example.suggestion || example.suggestion_summary) && (
                                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded border-l-4 border-green-400">
                                  <div className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">
                                    💡 Sugestão identificada:
                                  </div>
                                  <div className="text-sm text-green-700 dark:text-green-300">
                                    {example.suggestion || example.suggestion_summary}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botão para ver mais comentários */}
                      {problem.examples.length > 5 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Poderia abrir modal com todos os comentários ou expandir
                              alert(`Este problema tem ${problem.examples.length} comentários ao total. Funcionalidade para ver todos pode ser implementada.`);
                            }}
                            className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Ver todos os {problem.examples.length} comentários
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Palavras-chave relacionadas */}
                    {problem.keywords && problem.keywords.size > 0 && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <h5 className="font-bold text-indigo-800 dark:text-indigo-200 mb-3 flex items-center gap-2">
                          🎯 Palavras-chave Relacionadas ({problem.keywords.size}):
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(problem.keywords).map((keyword: any, kwIndex: number) => (
                            <Badge 
                              key={kwIndex} 
                              variant="outline" 
                              className="bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Resumo final */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">
            📋 Resumo da Análise - {item.departmentName}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div>• <strong>{item.totalProblems}</strong> tipos diferentes de problemas identificados</div>
            <div>• <strong>{item.totalFeedbacks}</strong> feedbacks analisados no total</div>
            <div>• <strong>{((item.criticalCount / item.totalFeedbacks) * 100).toFixed(1)}%</strong> dos casos são críticos (≤2⭐)</div>
            <div>• <strong>{((item.positiveCount / item.totalFeedbacks) * 100).toFixed(1)}%</strong> dos casos são positivos (≥4⭐)</div>
          </div>
        </div>
      </div>
    );
  }

  // Função para redirecionar para a tela de análise com comentário específico
  const redirectToAnalysisWithComment = (comment: any, commentIndex: number) => {
    // Criar um ID único para o comentário baseado em seus dados
    const commentId = `${comment.date}_${comment.author || 'unknown'}_${(comment.comment || comment.originalComment || '').substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Parâmetros para a URL
    const params = new URLSearchParams({
      commentId: commentId,
      hotelName: comment.hotelName || 'Unknown',
      date: comment.date || '',
      author: comment.author || '',
      rating: (comment.rating || 0).toString(),
      department: comment.department || item.department || '',
      keyword: comment.keyword || '',
      problem: comment.problem || item.problem || '',
      comment: (comment.comment || comment.originalComment || '').substring(0, 200) // Limitar tamanho
    });

    // Abrir nova aba com a tela de análise
    const analysisUrl = `/analysis?${params.toString()}`;
    window.open(analysisUrl, '_blank');
  };

  // Função para processar comentários baseado no tipo de item
  const getProcessedComments = () => {
    let comments: any[] = [];
    
    if (type === 'problem') {
      comments = item.examples || [];
    } else if (type === 'department') {
      comments = item.allExamples || [];
    } else if (type === 'conversational') {
      comments = [item]; // O próprio feedback é o comentário
    }

    // Aplicar filtros
    let filtered = comments;
    switch (commentFilter) {
      case 'critical':
        filtered = comments.filter(c => (c.rating || 0) <= 2);
        break;
      case 'positive':
        filtered = comments.filter(c => (c.rating || 0) >= 4);
        break;
      case 'with-suggestions':
        filtered = comments.filter(c => c.suggestion || c.suggestion_summary);
        break;
    }

    // Aplicar ordenação
    switch (sortComments) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'rating-desc':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating-asc':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
    }

    return filtered;
  };

  const processedComments = getProcessedComments();
  const totalComments = processedComments.length;
  const displayComments = showAllComments 
    ? processedComments.slice((commentsPage - 1) * commentsPerPage, commentsPage * commentsPerPage)
    : processedComments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações principais */}
      <Card className="p-4 md:p-6 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-violet-200 dark:border-violet-700">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-4">
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-bold text-violet-900 dark:text-violet-100 mb-2">
              {type === 'problem' && item.problem}
              {type === 'department' && item.name}
              {type === 'conversational' && `Feedback de ${item.author || 'Usuário Anônimo'}`}
            </h3>
            
            {type === 'problem' && item.problem_detail && (
              <p className="text-violet-700 dark:text-violet-300 text-base md:text-lg leading-relaxed">
                {item.problem_detail}
              </p>
            )}
          </div>
          
          <div className="text-center md:text-right">
            <div className="text-2xl md:text-3xl font-bold text-violet-800 dark:text-violet-200">
              {type === 'problem' && `${item.count || (item.examples ? item.examples.length : 0)}x`}
              {type === 'department' && `${item.totalProblems || (item.allExamples ? item.allExamples.length : 0)} problemas`}
              {type === 'conversational' && `${item.rating || 0}⭐`}
            </div>
            <div className="text-sm text-violet-600 dark:text-violet-400">
              {type === 'problem' && `Ocorrências • ${totalComments} comentários`}
              {type === 'department' && `Total de problemas • ${totalComments} comentários`}
              {type === 'conversational' && 'Avaliação'}
            </div>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {type === 'problem' && (
            <>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-red-600">
                  {item.ratings && item.ratings.length > 0 
                    ? ((item.ratings.reduce((a: number, b: number) => a + b, 0) / item.ratings.length)).toFixed(1)
                    : '0.0'
                  }★
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Rating Médio</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-blue-600">{item.authors ? item.authors.size : 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Autores Únicos</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-green-600">{item.suggestions ? item.suggestions.size : 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Sugestões</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-purple-600">{item.departments ? item.departments.size : 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Departamentos</div>
              </div>
            </>
          )}
          
          {type === 'department' && (
            <>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-red-600">
                  {(item.totalRating / item.totalProblems).toFixed(1)}★
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Rating Médio</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-blue-600">{(item.keywordsArray || []).length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Palavras-chave</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-green-600">{(item.suggestionsArray || []).length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Sugestões</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-purple-600">
                  {((item.totalProblems / executiveSummary.totalProblems) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">% do Total</div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Gráficos e Visualizações */}
      <div className="space-y-6">

        {/* Visualizações adicionais específicas para Top 10 (no modal) */}
        {type === 'problem' && item?.problem === 'Top 10 Problemas' && (
          <div className="space-y-6">
            {/* Cabeçalho descritivo */}
            <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Painel: Quantidade e Departamentos
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Visualiza todos os problemas por ocorrência e sua distribuição por departamento, com foco no principal e detalhes abaixo.
              </p>
            </div>

            {/* Principal: Todos os Problemas por Quantidade (maior, largura total) */}
            <Card className="p-6">
              <h4 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                📊 Todos os Problemas por Quantidade
              </h4>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4">Ranking completo dos problemas mencionados nos exemplos do Top 10.</p>
              <div className="h-[520px] sm:h-[560px] md:h-[620px]">
                {(() => {
                  const dataSrc = Array.isArray(item?.allExamples)
                    ? item.allExamples
                    : Array.isArray(filteredData)
                      ? filteredData
                      : [];
                  if (!dataSrc.length) {
                    return (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Sem dados</div>
                    );
                  }

                  const counts: Record<string, number> = {};
                  dataSrc.forEach((ex: any) => {
                    const prob = String(ex.problem || '').trim();
                    if (!prob) return;
                    counts[prob] = (counts[prob] || 0) + 1;
                  });
                  // Ordena por ocorrência e limita a 20 itens para melhor legibilidade
                  const items = Object.entries(counts)
                    .sort(([,a],[,b]) => b - a)
                    .slice(0, 20)
                    .map(([name, count]) => ({
                      name: name.length > 60 ? name.substring(0, 60) + '…' : name,
                      fullName: name,
                      count
                    }));

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={items} layout="vertical" margin={{ left: 12, right: 32, top: 10, bottom: 10 }} barCategoryGap={"30%"}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} domain={[0, 'dataMax']} />
                        <YAxis type="category" dataKey="name" width={360} tick={{ fontSize: 13 }} tickLine={false} interval={0} />
                        <RechartsTooltip formatter={(value: any, _name: any, props: any) => [value, props.payload.fullName]} />
                        <RechartsBar dataKey="count" fill="#3B82F6" name="Ocorrências" barSize={18}>
                          <LabelList dataKey="count" position="right" />
                        </RechartsBar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-3">Dica: Passe o mouse para ver o nome completo.</p>
            </Card>

            {/* Secundário abaixo: Problemas agrupados por Departamento (mesmo gráfico, por blocos) */}
            <Card className="p-6">
              <h4 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                🏢 Problemas por Departamento (Agrupado)
              </h4>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4">
                Departamentos ordenados por total de feedbacks; abaixo de cada título, os problemas desse departamento.
              </p>
              {(() => {
                  const dataSrc = Array.isArray(item?.allExamples)
                    ? item.allExamples
                    : Array.isArray(filteredData)
                      ? filteredData
                      : [];
                  if (!dataSrc.length) {
                    return (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Sem dados</div>
                    );
                  }

                  // Totais por departamento
                  const deptTotals: Record<string, number> = {};
                  dataSrc.forEach((ex: any) => {
                    const dept = String(ex.department || '').trim() || 'Outros';
                    deptTotals[dept] = (deptTotals[dept] || 0) + 1;
                  });
                  const sortedDepts = Object.entries(deptTotals)
                    .sort(([,a],[,b]) => b - a)
                    .map(([d]) => d);

                  // Construir lista com cabeçalhos e problemas por departamento
                  const groupedData: any[] = [];
                  sortedDepts.forEach((dept) => {
                    // Cabeçalho do departamento
                    groupedData.push({
                      name: `— ${dept} —`,
                      fullName: dept,
                      dept,
                      isHeader: true,
                      count: 0
                    });

                    // Contagens dos problemas do departamento
                    const probs: Record<string, number> = {};
                    dataSrc.forEach((ex: any) => {
                      const d = String(ex.department || '').trim() || 'Outros';
                      if (d !== dept) return;
                      const p = String(ex.problem || '').trim();
                      if (!p) return;
                      probs[p] = (probs[p] || 0) + 1;
                    });

                    // Inserir problemas ordenados por quantidade
                    Object.entries(probs)
                      .sort(([,a],[,b]) => b - a)
                      .forEach(([name, count]) => {
                        groupedData.push({
                          name: name.length > 50 ? name.substring(0, 50) + '…' : name,
                          fullName: name,
                          dept,
                          isHeader: false,
                          count
                        });
                      });
                  });

                  // Tick customizado para destacar cabeçalhos
                  const CustomTick = (tickProps: any) => {
                    const { x, y, payload } = tickProps;
                    const row = payload?.payload || {};
                    const isHeader = !!row.isHeader;
                    return (
                      <text x={x} y={y} dy={4} textAnchor="end" fill={isHeader ? '#0F172A' : '#334155'} fontWeight={isHeader ? 700 : 500} fontSize={isHeader ? 15 : 12}>
                        {payload.value}
                      </text>
                    );
                  };

                  // Altura dinâmica baseada no número de linhas (cabeçalhos + problemas)
                  const rowHeight = 28; // altura por categoria
                  const baseHeight = 360; // altura mínima
                  const chartHeight = Math.min(1000, baseHeight + groupedData.length * rowHeight);

                  return (
                    <div style={{ height: chartHeight }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={groupedData} layout="vertical" margin={{ left: 12, right: 32, top: 20, bottom: 10 }} barCategoryGap={"35%"}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} domain={[0, 'dataMax']} />
                          <YAxis type="category" dataKey="name" width={420} tick={<CustomTick />} tickLine={false} interval={0} />
                          <RechartsTooltip 
                            formatter={(value: any, _name: any, props: any) => {
                              const row = props?.payload || {};
                              if (row.isHeader) {
                                return [deptTotals[row.fullName] || 0, row.fullName];
                              }
                              return [value, `${row.dept} • ${row.fullName}`];
                            }}
                          />
                          <RechartsBar dataKey="count" fill="#6366F1" name="Ocorrências" barSize={22}>
                            <LabelList position="right" content={(labelProps: any) => {
                              const { value, payload } = labelProps || {};
                              // Ocultar rótulos em cabeçalhos ou valores 0
                              if (value === 0 || (payload && payload.isHeader)) return null;
                              return null; // Evita rótulos sobrepostos que pareçam títulos
                            }} />
                          </RechartsBar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                  );
                })()}
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-3">Ordem dos departamentos baseada no total de feedbacks.</p>
            </Card>
          </div>
        )}

        {/* Distribuição por Rating */}
        <Card className="p-3 md:p-6">
          <h4 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            ⭐ Distribuição de Avaliações
          </h4>
          <div className="h-40 md:h-48">
            {(() => {
              let ratings: number[] = [];
              
              if (type === 'problem') {
                ratings = item.ratings || [];
              } else if (type === 'department') {
                ratings = (item.allExamples || []).map((ex: any) => ex.rating || 0);
              } else if (type === 'conversational') {
                ratings = [item.rating || 0];
              }

              // Contar ratings de 1 a 5 com mais detalhes
              const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
                rating,
                count: ratings.filter(r => r === rating).length,
                percentage: ratings.length > 0 ? ((ratings.filter(r => r === rating).length / ratings.length) * 100).toFixed(1) : '0'
              }));

              const totalRatings = ratings.length;
              const avgRating = totalRatings > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / totalRatings).toFixed(2) : '0.00';

              const chartData = {
                labels: ratingCounts.map(r => `${r.rating}⭐\n${r.count} avaliações\n${r.percentage}%`),
                datasets: [{
                  label: 'Quantidade de Avaliações',
                  data: ratingCounts.map(r => r.count),
                  backgroundColor: [
                    '#EF4444', // 1 estrela - vermelho
                    '#F97316', // 2 estrelas - laranja
                    '#EAB308', // 3 estrelas - amarelo
                    '#84CC16', // 4 estrelas - verde claro
                    '#22C55E'  // 5 estrelas - verde
                  ],
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.8)'
                }]
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context: any) => {
                        const rating = ratingCounts[context[0].dataIndex];
                        return `${rating.rating}⭐ - Avaliação ${rating.rating === 5 ? 'Excelente' : rating.rating === 4 ? 'Boa' : rating.rating === 3 ? 'Regular' : rating.rating === 2 ? 'Ruim' : 'Péssima'}`;
                      },
                      label: (context: any) => {
                        const rating = ratingCounts[context.dataIndex];
                        
                        // Calcular estatísticas extras
                        const criticalCount = ratings.filter(r => r <= 2).length;
                        const positiveCount = ratings.filter(r => r >= 4).length;
                        const criticalPercentage = ((criticalCount / totalRatings) * 100).toFixed(1);
                        const positivePercentage = ((positiveCount / totalRatings) * 100).toFixed(1);

                        return [
                          `📊 ${rating.count} avaliações (${rating.percentage}%)`,
                          `📈 Média geral: ${avgRating}⭐ de ${totalRatings} avaliações`,
                          '',
                          `🚨 Total críticos (≤2⭐): ${criticalCount} (${criticalPercentage}%)`,
                          `✅ Total positivos (≥4⭐): ${positiveCount} (${positivePercentage}%)`,
                          '',
                          type === 'problem' ? `🎯 Problema: ${item.problem}` : 
                          type === 'department' ? `🏢 Departamento: ${item.name}` :
                          type === 'conversational' ? `💬 Feedback individual` : 'Análise geral'
                        ];
                      }
                    },
                    maxWidth: 350,
                    bodyFont: { size: 11 },
                    titleFont: { size: 12, weight: 'bold' as const },
                    padding: 12
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { 
                      stepSize: 1,
                      callback: function(value: any) {
                        return value + ' avaliações';
                      }
                    }
                  },
                  x: {
                    ticks: {
                      maxRotation: 0,
                      minRotation: 0,
                      font: { size: 9 }
                    }
                  }
                }
              };

              return <Bar data={chartData} options={chartOptions} />;
            })()}
          </div>
        </Card>

        {/* Distribuição de Avaliações (reposicionado para o rodapé) */}
        <Card className="p-3 md:p-6">
          <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            📊 Distribuição de Avaliações
          </h4>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              let count = 0;
              if (type === 'problem') {
                const ratings = Array.isArray(item.ratings) ? item.ratings : [];
                count = ratings.filter((r: number) => r === rating).length;
              } else if (type === 'department') {
                const examples = Array.isArray(item.allExamples) ? item.allExamples : [];
                count = examples.filter((ex: any) => ex.rating === rating).length;
              }

              const total = type === 'problem' ?
                (Array.isArray(item.ratings) ? item.ratings.length : 0) :
                (Array.isArray(item.allExamples) ? item.allExamples.length : 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium">{rating}⭐</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                    <div
                      className={`h-4 rounded-full ${
                        rating >= 4 ? 'bg-green-500' :
                        rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-400">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Departamento */}
        {(type === 'problem' || type === 'department') && (
          <Card className="p-6">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              🏢 Por Departamentos
            </h4>
            <div className="h-48">
              {(() => {
                let departmentData: { [key: string]: { problems: number, comments: number, avgRating: number, ratings: number[] } } = {};
                
                if (type === 'problem') {
                  // Para problemas específicos, contar ocorrências por departamento
                  Array.from(item.departments || []).forEach((dept: any) => {
                    if (!departmentData[dept]) {
                      departmentData[dept] = { problems: 0, comments: 0, avgRating: 0, ratings: [] };
                    }
                    departmentData[dept].problems += 1;
                  });
                  
                  // Contar comentários por departamento usando dados processados
                  (item.examples || []).forEach((example: any) => {
                    const dept = example.department || 'Não identificado';
                    if (!departmentData[dept]) {
                      departmentData[dept] = { problems: 0, comments: 0, avgRating: 0, ratings: [] };
                    }
                    departmentData[dept].comments += 1;
                    departmentData[dept].ratings.push(example.rating || 0);
                  });
                } else if (type === 'department') {
                  departmentData[item.name] = { 
                    problems: item.totalProblems || 0, 
                    comments: (item.allExamples || []).length,
                    avgRating: item.totalRating ? (item.totalRating / item.totalProblems) : 0,
                    ratings: (item.allExamples || []).map((ex: any) => ex.rating || 0)
                  };
                } else {
                  // Fallback: usar dados filtrados diretamente
                  filteredData.forEach((feedback: any) => {
                    if (feedback.sector) {
                      const dept = feedback.sector || 'Não identificado';
                      if (!departmentData[dept]) {
                        departmentData[dept] = { problems: 0, comments: 0, avgRating: 0, ratings: [] };
                      }
                      departmentData[dept].problems += 1;
                      departmentData[dept].comments += 1;
                      departmentData[dept].ratings.push(feedback.rating || 0);
                    }
                  });
                }

                // Calcular médias corretas
                Object.keys(departmentData).forEach(dept => {
                  const ratings = departmentData[dept].ratings;
                  if (ratings.length > 0) {
                    departmentData[dept].avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                  }
                });

                // Criar labels mais informativos
                const chartLabels = Object.entries(departmentData).map(([dept, data]) => {
                  return `${dept}\n${data.comments} comentários\n${data.avgRating.toFixed(1)}⭐`;
                });

                const chartData = {
                  labels: chartLabels,
                  datasets: [{
                    data: Object.values(departmentData).map(data => data.comments),
                    backgroundColor: [
                      '#EF4444', '#F97316', '#EAB308', '#22C55E', 
                      '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                  }]
                };

                const chartOptions = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: { 
                        boxWidth: 12, 
                        padding: 8,
                        font: { size: 10 }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const deptName = Object.keys(departmentData)[context.dataIndex];
                          const data = departmentData[deptName];
                          const total = Object.values(departmentData).reduce((sum, d) => sum + d.comments, 0);
                          const percentage = total > 0 ? ((data.comments / total) * 100).toFixed(1) : '0';
                          
                          return [
                            `${deptName}`,
                            `${data.comments} comentários (${percentage}%)`,
                            `${data.problems} problemas`,
                            `Rating médio: ${data.avgRating.toFixed(1)}⭐`
                          ];
                        }
                      }
                    }
                  }
                };

                return <Doughnut data={chartData} options={chartOptions} />;
              })()}
            </div>
          </Card>
        )}

        {/* Top Palavras-chave */}
        <Card className="p-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            🎯 Top Palavras-chave
          </h4>
          <div className="h-48">
            {(() => {
              let keywordData: { [key: string]: { count: number, ratings: number[] } } = {};

              if (type === 'problem') {
                // Preferir exemplos para contagem e correlação de rating
                if (Array.isArray(item.examples) && item.examples.length > 0) {
                  item.examples.forEach((ex: any) => {
                    // aceitar string única ou lista
                    const rawKeywords = ex.keyword
                      ? String(ex.keyword)
                      : Array.isArray(ex.keywords) ? ex.keywords.join(',') : '';
                    const tokens = String(rawKeywords)
                      .split(/[;,|]/)
                      .map(k => k.trim())
                      .filter(k => k && k.toUpperCase() !== 'VAZIO');

                    tokens.forEach((kw) => {
                      if (!keywordData[kw]) {
                        keywordData[kw] = { count: 0, ratings: [] };
                      }
                      keywordData[kw].count += 1;
                      if (typeof ex.rating === 'number' && ex.rating > 0) {
                        keywordData[kw].ratings.push(ex.rating);
                      }
                    });
                  });
                } else {
                  // Fallback: usar o Set de keywords do item
                  Array.from(item.keywords || []).forEach((keyword: any) => {
                    const kw = String(keyword).trim();
                    if (!kw || kw.toUpperCase() === 'VAZIO') return;
                    if (!keywordData[kw]) {
                      keywordData[kw] = { count: 0, ratings: [] };
                    }
                    keywordData[kw].count += 1;
                  });
                }
              } else if (type === 'department') {
                (item.keywordsArray || []).forEach((keyword: any) => {
                  const kw = String(keyword).trim();
                  if (!kw || kw.toUpperCase() === 'VAZIO') return;
                  if (!keywordData[kw]) {
                    keywordData[kw] = { count: 0, ratings: [] };
                  }
                  keywordData[kw].count += 1;
                });
              }

              const topKeywords = Object.entries(keywordData)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 8);

              // Validar se há dados para renderizar
              if (topKeywords.length === 0) {
                return (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <div>Nenhuma palavra-chave encontrada</div>
                    </div>
                  </div>
                );
              }

              const chartData = {
                labels: topKeywords.map(([keyword, data]) => {
                  const shortKeyword = keyword.length > 15 ? keyword.substring(0, 15) + '...' : keyword;
                  const avgRating = data.ratings.length > 0 
                    ? (data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length).toFixed(1)
                    : '0.0';
                  return `${shortKeyword}\n${data.count} menções\n${avgRating}⭐`;
                }),
                datasets: [{
                  label: 'Ocorrências',
                  data: topKeywords.map(([, data]) => data.count),
                  backgroundColor: topKeywords.map((_, index) => {
                    const colors = [
                      'rgba(139, 92, 246, 0.8)', 'rgba(59, 130, 246, 0.8)', 
                      'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)',
                      'rgba(239, 68, 68, 0.8)', 'rgba(236, 72, 153, 0.8)',
                      'rgba(20, 184, 166, 0.8)', 'rgba(124, 58, 237, 0.8)'
                    ];
                    return colors[index % colors.length];
                  }),
                  borderColor: topKeywords.map((_, index) => {
                    const colors = [
                      'rgb(139, 92, 246)', 'rgb(59, 130, 246)', 
                      'rgb(16, 185, 129)', 'rgb(245, 158, 11)',
                      'rgb(239, 68, 68)', 'rgb(236, 72, 153)',
                      'rgb(20, 184, 166)', 'rgb(124, 58, 237)'
                    ];
                    return colors[index % colors.length];
                  }),
                  borderWidth: 2
                }]
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context: any) => {
                        const [keyword] = topKeywords[context[0].dataIndex];
                        return keyword;
                      },
                      label: (context: any) => {
                        const [keyword, data] = topKeywords[context.dataIndex];
                        const total = topKeywords.reduce((sum, [, d]) => sum + d.count, 0);
                        const percentage = ((data.count / total) * 100).toFixed(1);
                        const avgRating = data.ratings.length > 0 
                          ? (data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length).toFixed(1)
                          : 'N/A';
                        
                        return [
                          `${data.count} menções (${percentage}%)`,
                          `Rating médio: ${avgRating}⭐`,
                          `Em ${data.ratings.length} avaliações`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { 
                      stepSize: 1,
                      callback: function(value: any) {
                        return value + ' menções';
                      }
                    }
                  },
                  x: {
                    ticks: {
                      font: { size: 9 },
                      maxRotation: 0
                    }
                  }
                }
              };

              return <Bar data={chartData} options={chartOptions} />;
            })()}
          </div>
        </Card>

        {/* Análise de Sentimentos */}
        <Card className="p-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            😊 Análise de Sentimentos
          </h4>
          <div className="h-48">
            {(() => {
              let ratings: number[] = [];
              
              if (type === 'problem') {
                ratings = item.ratings || [];
              } else if (type === 'department') {
                ratings = (item.allExamples || []).map((ex: any) => ex.rating || 0);
              } else if (type === 'conversational') {
                ratings = [item.rating || 0];
              }

              const excellent = ratings.filter(r => r === 5).length; // 5★
              const good = ratings.filter(r => r === 4).length;      // 4★
              const neutral = ratings.filter(r => r === 3).length;    // 3★
              const poor = ratings.filter(r => r === 2).length;       // 2★
              const terrible = ratings.filter(r => r === 1).length;   // 1★
              
              const totalRatings = ratings.length;
              const avgRating = totalRatings > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / totalRatings).toFixed(1) : '0.0';

              // Validar se há dados para renderizar
              if (totalRatings === 0) {
                return (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="text-2xl mb-2">😊</div>
                      <div>Nenhuma avaliação encontrada</div>
                    </div>
                  </div>
                );
              }

              const chartData = {
                labels: [
                  `Excelente (5★)\n${excellent} avaliações`,
                  `Bom (4★)\n${good} avaliações`, 
                  `Regular (3★)\n${neutral} avaliações`,
                  `Ruim (2★)\n${poor} avaliações`,
                  `Péssimo (1★)\n${terrible} avaliações`
                ],
                datasets: [{
                  data: [excellent, good, neutral, poor, terrible],
                  backgroundColor: [
                    '#10B981', // Verde escuro - Excelente
                    '#22C55E', // Verde - Bom
                    '#EAB308', // Amarelo - Regular
                    '#F97316', // Laranja - Ruim
                    '#EF4444'  // Vermelho - Péssimo
                  ],
                  borderWidth: 2,
                  borderColor: '#fff'
                }]
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: { 
                      boxWidth: 12, 
                      padding: 6,
                      font: { size: 9 }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      title: (context: any) => {
                        const labels = ['Excelente (5★)', 'Bom (4★)', 'Regular (3★)', 'Ruim (2★)', 'Péssimo (1★)'];
                        return labels[context[0].dataIndex];
                      },
                      label: (context: any) => {
                        const percentage = totalRatings > 0 ? ((context.parsed / totalRatings) * 100).toFixed(1) : '0';
                        return [
                          `${context.parsed} avaliações (${percentage}%)`,
                          `Média geral: ${avgRating}⭐`,
                          `Total: ${totalRatings} avaliações`
                        ];
                      }
                    }
                  }
                }
              };

              return <Pie data={chartData} options={chartOptions} />;
            })()}
          </div>
        </Card>
      </div>

      {/* Seção de Comentários */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                💬 Comentários e Feedbacks
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {totalComments} comentário{totalComments !== 1 ? 's' : ''} encontrado{totalComments !== 1 ? 's' : ''} • 
                Mostrando {displayComments.length} de {totalComments}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar:</span>
            
            <select 
              value={commentFilter}
              onChange={(e) => setCommentFilter(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 w-full sm:w-auto"
            >
              <option value="all">Todos os comentários</option>
              <option value="critical">Críticos (≤2★)</option>
              <option value="positive">Positivos (≥4★)</option>
              <option value="with-suggestions">Com sugestões</option>
            </select>
            
            <select 
              value={sortComments}
              onChange={(e) => setSortComments(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 w-full sm:w-auto"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="rating-desc">Maior rating</option>
              <option value="rating-asc">Menor rating</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllComments(!showAllComments)}
              className="w-full sm:w-auto whitespace-nowrap ml-auto"
            >
              {showAllComments ? 'Ver menos' : 'Ver todos comentários'}
            </Button>
          </div>
        </div>

        {/* Lista de comentários ou mensagem quando vazia */}
        {displayComments.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {displayComments.map((comment: any, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
                {/* Header do comentário com rating e data */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Rating com estrelas */}
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < (comment.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                        <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                          {comment.rating || 0}/5
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {comment.hotelName || 'Wish Natal'}
                      </span>
                      <span>
                        {new Date(comment.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </span>
                      {/* Ícone de editar */}
                      <button
                        onClick={() => redirectToAnalysisWithComment(comment, index)}
                        className="ml-2 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 group"
                        title="Editar este comentário na tela de análise"
                      >
                        <Edit 
                          className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" 
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conteúdo principal do comentário */}
                <div className="p-4 space-y-4">
                  {/* Comentário principal */}
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p className="text-base">
                      "{comment.comment || comment.originalComment || 'Sem comentário'}"
                    </p>
                  </div>

                  {/* Informações estruturadas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Fonte:
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.source || 'TrustYou Survey'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Idioma:
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.language || 'Português'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Setor:
                      </div>
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {comment.department || item.department || 'Operações'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Palavras-chave identificadas */}
                  {(comment.keyword || comment.keywords) && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Palavras-chave:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(comment.keyword ? [comment.keyword] : comment.keywords || []).map((keyword: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Problemas identificados */}
                  {(comment.problem || comment.problems || comment.problem_detail) && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Problemas identificados:
                      </div>
                      <div className="space-y-1">
                        {(comment.problem ? [comment.problem] : comment.problems || []).map((problem: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 mr-1">
                            {problem}
                          </span>
                        ))}
                        {comment.problem_detail && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {comment.problem_detail}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sugestões, se houver */}
                  {(comment.suggestion || comment.suggestion_summary) && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                            Sugestão de melhoria:
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {comment.suggestion || comment.suggestion_summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 opacity-50">
              💬
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum comentário encontrado</h3>
            <p className="text-sm">
              {commentFilter !== 'all' ? 'Tente ajustar os filtros para ver mais resultados' : 'Não há comentários disponíveis para este item'}
            </p>
          </div>
        )}

        {/* Paginação para comentários */}
        {showAllComments && totalComments > commentsPerPage && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={commentsPage === 1}
              onClick={() => setCommentsPage(commentsPage - 1)}
            >
              Anterior
            </Button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {commentsPage} de {Math.ceil(totalComments / commentsPerPage)}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              disabled={commentsPage === Math.ceil(totalComments / commentsPerPage)}
              onClick={() => setCommentsPage(commentsPage + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
        
        {totalComments === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum comentário encontrado com os filtros aplicados.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

interface ProblemsVisualizationOptionsProps {
  filteredData: Feedback[];
  setSelectedItem: (item: any) => void;
  setChartDetailOpen: (open: boolean) => void;
}

export function ProblemsVisualizationOptions({ 
  filteredData, 
  setSelectedItem, 
  setChartDetailOpen 
}: ProblemsVisualizationOptionsProps) {
  
  // Estado para controlar qual visualização está selecionada (substitui tabs)
  // Padrão: top10 (Top 10 Problemas) - visualização analítica preferida
  const [selectedVisualization, setSelectedVisualization] = useState<'top10' | 'option6' | 'option3' | 'option1' | 'option5'>('top10');
  
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<'grid' | 'list' | 'compact' | 'detailed'>('detailed');
  const [sortBy, setSortBy] = useState<'frequency' | 'alphabetical' | 'severity' | 'recent'>('frequency');
  const [filterBy, setFilterBy] = useState<'all' | 'critical' | 'with-suggestions' | 'with-details'>('all');
  const [showAllItems, setShowAllItems] = useState(false);
  
  // Estados para o modal de detalhes avançados
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [detailModalType, setDetailModalType] = useState<'problem' | 'department' | 'executive' | 'conversational'>('problem');
  const [modalFilteredData, setModalFilteredData] = useState<Feedback[]>([]);  // Dados filtrados para o modal

  // Helper: normalização simples para comparação robusta
  const normalize = (v: any): string => {
    return String(v || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Helper: agrega problem_detail para um problema (opcionalmente filtrando por departamento)
  const aggregateProblemDetailsFromFeedbacks = (
    rows: any[],
    problemLabel: string,
    departmentFilter?: string
  ) => {
    const map = new Map<string, { detail: string; count: number }>();
    const probTarget = normalize(problemLabel);
    const depTarget = departmentFilter ? normalize(departmentFilter) : '';

    for (const r of rows || []) {
      // Preferir estrutura nova: allProblems
      if (Array.isArray(r?.allProblems)) {
        for (const p of r.allProblems) {
          const pMain = normalize(p?.problem);
          const pDept = normalize(p?.sector ?? p?.department ?? r?.sector ?? '');
          if (!pMain) continue;
          if (depTarget && pDept !== depTarget) continue;
          if (!pMain.includes(probTarget)) continue;
          const det = String(p?.problem_detail ?? '').trim();
          if (!det) continue;
          const key = normalize(det);
          const prev = map.get(key);
          if (prev) prev.count += 1; else map.set(key, { detail: det, count: 1 });
        }
        continue;
      }
      // Fallback: estrutura antiga
      const pConcat = String(r?.problem || '').trim();
      if (!pConcat) continue;
      const pList = pConcat.includes(';') ? pConcat.split(';').map((s: string) => s.trim()) : [pConcat];
      const matches = pList.some((s: string) => normalize(s).includes(probTarget));
      if (!matches) continue;
      if (depTarget) {
        const sectorRaw = String(r?.sector || r?.department || '').trim();
        const sectors = sectorRaw ? sectorRaw.split(/[;,|]/).map((s: string) => normalize(s)) : [];
        if (!sectors.includes(depTarget)) continue;
      }
      const det = String(r?.problem_detail ?? '').trim();
      if (!det) continue;
      const key = normalize(det);
      const prev = map.get(key);
      if (prev) prev.count += 1; else map.set(key, { detail: det, count: 1 });
    }

    const total = Array.from(map.values()).reduce((acc, v) => acc + v.count, 0) || 1;
    const agg = Array.from(map.values()).map(v => ({
      detail: v.detail,
      count: v.count,
      pct: (v.count / total) * 100,
    }));
    agg.sort((a, b) => b.count - a.count || b.pct - a.pct);
    return agg.slice(0, 4);
  };

  // Função para abrir modal de detalhes avançados
  const openDetailModal = (item: any, type: 'problem' | 'department' | 'executive' | 'conversational') => {
    setSelectedDetailItem(item);
    setDetailModalType(type);
    setDetailModalOpen(true);
  };

  // Effect para bloquear scroll quando modal está aberto
  useEffect(() => {
    if (detailModalOpen) {
      // Bloquear scroll
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [detailModalOpen]);

  // Reset showAllItems quando filtros/ordenação mudam
  const handleSortChange = (newSort: any) => {
    setSortBy(newSort);
    setShowAllItems(false);
  };

  const handleFilterChange = (newFilter: any) => {
    setFilterBy(newFilter);
    setShowAllItems(false);
  };

  // Função para expandir/colapsar cartões
  const toggleCardExpansion = (cardId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Preservar posição do scroll
    const scrollPosition = window.scrollY;
    
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });

    // Restaurar posição do scroll após o re-render
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  };

  // Função helper para validar se um problema é realmente um problema (não elogio)
  const isValidProblem = (problem: string): boolean => {
    if (!problem || typeof problem !== 'string') return false;
    
    const normalizedProblem = problem.toLowerCase().trim();
    
    // Lista de problemas inválidos que devem ser filtrados
    const invalidProblems = [
      'vazio', 
      'sem problemas', 
      'nao identificado', 
      'não identificado',
      'sem problema',
      'nenhum problema',
      'ok',
      'tudo ok',
      'sem',
      'n/a',
      'na',
      '-',
      '',
      'empty',
      'elogio',
      'positivo',
      'bom',
      'boa',
      'excelente',
      'ótimo',
      'otimo',
      'perfeito',
      'maravilhoso',
      'satisfeito',
      'satisfeita'
    ];
    
    return !invalidProblems.includes(normalizedProblem) && 
           !normalizedProblem.includes('vazio') &&
           !normalizedProblem.includes('sem problemas') &&
           !normalizedProblem.includes('sem problema') &&
           !normalizedProblem.includes('não identificado') &&
           !normalizedProblem.includes('nao identificado') &&
           normalizedProblem.length > 2; // Evitar problemas muito curtos
  };

  // Função para verificar se um feedback tem pelo menos um problema válido
  const feedbackHasValidProblems = (feedback: any): boolean => {
    // Verificar na nova estrutura allProblems
    if (feedback.allProblems && Array.isArray(feedback.allProblems) && feedback.allProblems.length > 0) {
      return feedback.allProblems.some((problemObj: any) => 
        problemObj.problem && isValidProblem(problemObj.problem)
      );
    }
    
    // Verificar na estrutura antiga
    if (feedback.problem && feedback.problem.trim() !== '') {
      const problems = feedback.problem.includes(';') 
        ? feedback.problem.split(';').map((p: string) => p.trim()) 
        : [feedback.problem];
      
      return problems.some((problem: string) => isValidProblem(problem));
    }
    
    return false;
  };

  // Função melhorada para processar problemas (incluindo compatibilidade com dados antigos)
  const processProblemsData = () => {
    const allProblemsData: any[] = [];

    filteredData.forEach(feedback => {
      // Primeiro verificar se o feedback tem problemas válidos
      if (!feedbackHasValidProblems(feedback)) {
        return; // Pular feedbacks sem problemas válidos
      }

      // NOVA ESTRUTURA: allProblems (preferência)
      if (feedback.allProblems && Array.isArray(feedback.allProblems) && feedback.allProblems.length > 0) {
        feedback.allProblems.forEach(problemObj => {
          if (problemObj.problem && isValidProblem(problemObj.problem)) {
            allProblemsData.push({
              ...problemObj,
              feedback: feedback,
              originalComment: feedback.comment,
              author: feedback.author || 'Anônimo',
              date: feedback.date,
              rating: feedback.rating || 0,
              hotel: feedback.hotel || feedback.hotelName || 'Não identificado',
              suggestion: feedback.suggestion_summary || '',
              department: problemObj.sector || feedback.sector || 'Não identificado',
              keyword: problemObj.keyword || feedback.keyword || 'Não identificado',
              hasDetail: !!(problemObj.problem_detail && problemObj.problem_detail.trim() !== ''),
              source: 'allProblems' // marcador de origem
            });
          }
        });
      }
      
      // ESTRUTURA ANTIGA: problem único (fallback)
      else if (feedback.problem && feedback.problem.trim() !== '') {
        // Lidar com múltiplos problemas separados por ';'
        const problems = feedback.problem.includes(';') 
          ? feedback.problem.split(';').map(p => p.trim()) 
          : [feedback.problem];

        problems.forEach(problem => {
          if (isValidProblem(problem)) {
            allProblemsData.push({
              problem: problem.trim(),
              problem_detail: feedback.problem_detail || '',
              feedback: feedback,
              originalComment: feedback.comment,
              author: feedback.author || 'Anônimo',
              date: feedback.date,
              rating: feedback.rating || 0,
              hotel: feedback.hotel || feedback.hotelName || 'Não identificado',
              suggestion: feedback.suggestion_summary || '',
              department: feedback.sector || 'Não identificado',
              keyword: feedback.keyword || 'Não identificado',
              hasDetail: !!(feedback.problem_detail && feedback.problem_detail.trim() !== ''),
              source: 'legacy' // marcador de origem
            });
          }
        });
      }
    });

    return allProblemsData;
  };

  // Processar dados para cartões detalhados
  const getDetailedProblems = () => {
    const problemsData = processProblemsData();
    return problemsData
      .reduce((acc: any, problem: any) => {
        // Usar apenas o problema como chave para agrupar corretamente
        const key = problem.problem.trim();
        if (!acc[key]) {
          acc[key] = {
            id: key,
            problem: problem.problem,
            problem_detail: problem.problem_detail || '',
            department: new Set([problem.department]), // Usar Set para múltiplos departamentos
            keyword: new Set([problem.keyword]), // Usar Set para múltiplas palavras-chave
            count: 0,
            totalRating: 0,
            examples: [],
            authors: new Set(),
            dates: [],
            ratings: [],
            suggestions: new Set(),
            hasDetails: problem.hasDetail,
            sources: new Set(),
            departments: new Set([problem.department]), // Para compatibilidade
            keywords: new Set([problem.keyword]) // Para compatibilidade
          };
        }
        
        // Adicionar departamentos e palavras-chave adicionais
        acc[key].department.add(problem.department);
        acc[key].keyword.add(problem.keyword);
        acc[key].departments.add(problem.department);
        acc[key].keywords.add(problem.keyword);
        
        acc[key].count++;
        acc[key].totalRating += problem.rating;
        acc[key].examples.push({
          comment: problem.originalComment,
          detail: problem.problem_detail,
          author: problem.author,
          date: problem.date,
          rating: problem.rating,
          department: problem.department,
          keyword: problem.keyword
        });
        acc[key].authors.add(problem.author);
        acc[key].dates.push(problem.date);
        acc[key].ratings.push(problem.rating);
        acc[key].sources.add(problem.source);
        
        // Consolidar detalhes específicos
        if (problem.problem_detail && problem.problem_detail.trim() !== '') {
          if (!acc[key].problem_detail || acc[key].problem_detail.length < problem.problem_detail.length) {
            acc[key].problem_detail = problem.problem_detail;
          }
        }
        
        if (problem.suggestion) acc[key].suggestions.add(problem.suggestion);
        return acc;
      }, {});
  };

  // Processar dados por departamento
  const getDepartmentAnalysis = () => {
    const problemsData = processProblemsData();
    return problemsData
      .reduce((acc: any, item: any) => {
        const dept = item.department;
        if (!acc[dept]) {
          acc[dept] = {
            name: dept,
            totalProblems: 0,
            totalRating: 0,
            problemDetails: {},
            specificDetails: {}, // Para agrupar problem details específicos
            keywords: new Set(),
            suggestions: new Set(),
            authors: new Set(),
            worstRating: 5,
            bestRating: 1,
            allExamples: [] // Para manter todos os exemplos
          };
        }
        
        acc[dept].totalProblems++;
        acc[dept].totalRating += item.rating;
        acc[dept].keywords.add(item.keyword);
        acc[dept].authors.add(item.author);
        acc[dept].worstRating = Math.min(acc[dept].worstRating, item.rating);
        acc[dept].bestRating = Math.max(acc[dept].bestRating, item.rating);
        
        if (item.suggestion) acc[dept].suggestions.add(item.suggestion);
        
        // Adicionar ao array de exemplos
        acc[dept].allExamples.push({
          problem: item.problem,
          problem_detail: item.problem_detail,
          comment: item.originalComment,
          author: item.author,
          date: item.date,
          rating: item.rating,
          keyword: item.keyword,
          hasDetail: item.hasDetail
        });
        
        // Agrupar por problema principal
        const detailKey = item.problem;
        if (!acc[dept].problemDetails[detailKey]) {
          acc[dept].problemDetails[detailKey] = {
            problem: item.problem,
            detail: item.problem_detail,
            keyword: item.keyword,
            count: 0,
            totalRating: 0,
            examples: [],
            specificDetails: new Set() // Para capturar múltiplos detalhes específicos
          };
        }
        
        acc[dept].problemDetails[detailKey].count++;
        acc[dept].problemDetails[detailKey].totalRating += item.rating;
        acc[dept].problemDetails[detailKey].examples.push({
          comment: item.originalComment,
          author: item.author,
          date: item.date,
          rating: item.rating,
          detail: item.problem_detail
        });

        // Capturar detalhes específicos únicos para este problema
        if (item.problem_detail && item.problem_detail.trim() !== '') {
          acc[dept].problemDetails[detailKey].specificDetails.add(item.problem_detail.trim());
        }
        
        return acc;
      }, {});
  };

  // Processar dados para análise executiva
  const getExecutiveSummary = () => {
    const problemsData = processProblemsData();
    const totalProblems = problemsData.length;
    const criticalProblems = problemsData.filter(p => p.rating <= 2).length;
    const averageRating = totalProblems > 0 ? 
      problemsData.reduce((sum, p) => sum + p.rating, 0) / totalProblems : 0;
    const uniqueAuthors = new Set(problemsData.map(p => p.author)).size;
    const withSuggestions = problemsData.filter(p => p.suggestion && p.suggestion.trim() !== '').length;
    const withDetails = problemsData.filter(p => p.hasDetail).length;
    const dataSourcesCount = {
      allProblems: problemsData.filter(p => p.source === 'allProblems').length,
      legacy: problemsData.filter(p => p.source === 'legacy').length
    };

    return {
      totalProblems,
      criticalProblems,
      averageRating,
      uniqueAuthors,
      withSuggestions,
      withDetails,
      dataSourcesCount
    };
  };

  const detailedProblems = getDetailedProblems();
  const departmentAnalysis = getDepartmentAnalysis();
  const executiveSummary = getExecutiveSummary();

  // Função para filtrar e ordenar problemas
  const getFilteredAndSortedProblems = () => {
    let filtered = Object.values(detailedProblems);

    // Aplicar filtros
    switch (filterBy) {
      case 'critical':
        filtered = filtered.filter((p: any) => {
          const avgRating = p.ratings.reduce((a: number, b: number) => a + b, 0) / p.ratings.length;
          return avgRating <= 2;
        });
        break;
      case 'with-suggestions':
        filtered = filtered.filter((p: any) => p.suggestions.size > 0);
        break;
      case 'with-details':
        filtered = filtered.filter((p: any) => p.problem_detail && p.problem_detail.trim() !== '');
        break;
      default:
        // 'all' - não filtra
        break;
    }

    // Aplicar ordenação
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a: any, b: any) => a.problem.localeCompare(b.problem));
        break;
      case 'severity':
        filtered.sort((a: any, b: any) => {
          const avgA = a.ratings.reduce((sum: number, r: number) => sum + r, 0) / a.ratings.length;
          const avgB = b.ratings.reduce((sum: number, r: number) => sum + r, 0) / b.ratings.length;
          return avgA - avgB; // Menor rating primeiro (mais crítico)
        });
        break;
      case 'recent':
        filtered.sort((a: any, b: any) => {
          const recentA = Math.max(...a.examples.map((ex: any) => new Date(ex.date).getTime()));
          const recentB = Math.max(...b.examples.map((ex: any) => new Date(ex.date).getTime()));
          return recentB - recentA; // Mais recente primeiro
        });
        break;
      default: // 'frequency'
        filtered.sort((a: any, b: any) => b.count - a.count);
        break;
    }

    return filtered;
  };

  // Componente para visualização em grade (quadrados)
  const GridCard = ({ problem, index, expandedCards, toggleCardExpansion, setSelectedItem, setChartDetailOpen, executiveSummary }: any) => {
    const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
    const severityColor = avgRating <= 2 ? 'red' : avgRating <= 3 ? 'yellow' : 'green';
    const isExpanded = expandedCards.has(problem.id);
    
    return (
      <Card className={`transition-all duration-200 border-l-4 cursor-pointer ${
        severityColor === 'red' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30' :
        severityColor === 'yellow' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30' :
        'border-l-green-500 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2">
                🎯 {problem.problem}
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={severityColor === 'red' ? 'destructive' : severityColor === 'yellow' ? 'secondary' : 'default'}>
                  {problem.count}x
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Botão para detalhes simples (modal atual) */}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                title="Ver análise rápida"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Preservar scroll
                  const scrollPosition = window.scrollY;
                  
                  setSelectedItem({
                    type: 'problem_analysis',
                    data: {
                      ...problem,
                      label: problem.problem,
                      name: problem.problem,
                      value: problem.count,
                      details: problem.problem_detail,
                      departmentsList: Array.from(problem.departments),
                      keywordsList: Array.from(problem.keywords)
                    },
                    title: problem.problem,
                    examples: problem.examples,
                    stats: {
                      totalOccurrences: problem.count,
                      averageRating: (problem.totalRating / problem.count),
                      percentage: ((problem.count / executiveSummary.totalProblems) * 100).toFixed(1),
                      uniqueAuthors: problem.authors.size,
                      departments: Array.from(problem.departments).join(', '),
                      keywords: Array.from(problem.keywords).join(', '),
                      suggestions: problem.suggestions.size,
                      sources: Array.from(problem.sources).join(', '),
                      sentimentDistribution: {
                        positive: problem.examples.filter((ex: any) => ex.rating >= 4).length,
                        neutral: problem.examples.filter((ex: any) => ex.rating === 3).length,
                        negative: problem.examples.filter((ex: any) => ex.rating <= 2).length
                      },
                      ratingDistribution: {
                        1: problem.ratings.filter((r: number) => r === 1).length || 0,
                        2: problem.ratings.filter((r: number) => r === 2).length || 0,
                        3: problem.ratings.filter((r: number) => r === 3).length || 0,
                        4: problem.ratings.filter((r: number) => r === 4).length || 0,
                        5: problem.ratings.filter((r: number) => r === 5).length || 0
                      },
                      // Timeline básica (últimos exemplos)
                      timeline: problem.examples
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((ex: any) => ({
                          date: ex.date,
                          rating: ex.rating,
                          comment: ex.comment.substring(0, 100) + '...'
                        })),
                      // Tendência mensal
                      monthlyTrend: (() => {
                        const monthlyData: any = {};
                        problem.examples.forEach((ex: any) => {
                          const date = new Date(ex.date);
                          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
                        });
                        
                        return Object.entries(monthlyData)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .slice(-6) // Últimos 6 meses
                          .map(([month, count]) => ({
                            month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                            count
                          }));
                      })(),
                      // Top palavras-chave relacionadas
                      topKeywords: Array.from(problem.keywords).map((keyword: any) => ({
                        keyword,
                        count: problem.examples.filter((ex: any) => ex.keyword === keyword).length
                      })).sort((a, b) => b.count - a.count).slice(0, 5),
                      // Top problemas relacionados
                      topProblems: (() => {
                        const problemCounts: any = {};
                        problem.examples.forEach((ex: any) => {
                          if (ex.detail && ex.detail.trim() !== '') {
                            problemCounts[ex.detail] = (problemCounts[ex.detail] || 0) + 1;
                          }
                        });
                        
                        return Object.entries(problemCounts)
                          .map(([problem, count]) => ({ problem, count }))
                          .sort((a: any, b: any) => b.count - a.count)
                          .slice(0, 5);
                      })()
                    }
                  });
                  
                  // Usar o novo modal avançado
                  openDetailModal(problem, 'problem');
                  
                  // Restaurar scroll
                  requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                  });
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>

              {/* Botão para detalhes avançados (novo modal) */}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                title="Ver análise detalhada completa"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDetailModal(problem, 'problem');
                }}
              >
                <Zap className="w-4 h-4 text-violet-600" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300 mb-3">
            <div className="flex items-center gap-1" title={Array.from(problem.departments).join(', ')}>
              <Building2 className="w-3 h-3" />
              <span className="truncate">
                {Array.from(problem.departments).slice(0, 2).join(', ')}
                {problem.departments.size > 2 && ` +${problem.departments.size - 2}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{problem.authors.size} autor{problem.authors.size !== 1 ? 'es' : ''}</span>
              {problem.suggestions.size > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-blue-600 dark:text-blue-400">{problem.suggestions.size} sugestões</span>
                </>
              )}
            </div>
          </div>

          {problem.problem_detail && (
            <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
              {problem.problem_detail}
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Componente para visualização em lista (horizontal)
  const ListCard = ({ problem, index, expandedCards, toggleCardExpansion, setSelectedItem, setChartDetailOpen, executiveSummary }: any) => {
    const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
    const severityColor = avgRating <= 2 ? 'red' : avgRating <= 3 ? 'yellow' : 'green';
    
    return (
      <Card className={`transition-all duration-200 border-l-4 ${
        severityColor === 'red' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30' :
        severityColor === 'yellow' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30' :
        'border-l-green-500 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Informações principais */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                  🎯 {problem.problem}
                </h4>
                <Badge variant={severityColor === 'red' ? 'destructive' : severityColor === 'yellow' ? 'secondary' : 'default'}>
                  {problem.count} ocorrência{problem.count !== 1 ? 's' : ''}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                </div>
              </div>
              
              {problem.problem_detail && (
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1 mb-2">
                  {problem.problem_detail}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span title={Array.from(problem.departments).join(', ')}>
                    {Array.from(problem.departments).slice(0, 2).join(', ')}
                    {problem.departments.size > 2 && ` +${problem.departments.size - 2}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{problem.authors.size} autor{problem.authors.size !== 1 ? 'es' : ''}</span>
                </div>
                {problem.suggestions.size > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Lightbulb className="w-3 h-3" />
                    <span>{problem.suggestions.size} sugestões</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Ações */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Preservar scroll
                  const scrollPosition = window.scrollY;
                  
                  setSelectedItem({
                    type: 'problem_analysis',
                    data: {
                      ...problem,
                      label: problem.problem,
                      name: problem.problem,
                      value: problem.count,
                      details: problem.problem_detail,
                      departmentsList: Array.from(problem.departments),
                      keywordsList: Array.from(problem.keywords)
                    },
                    title: problem.problem,
                    examples: problem.examples,
                    stats: {
                      totalOccurrences: problem.count,
                      averageRating: (problem.totalRating / problem.count),
                      percentage: ((problem.count / executiveSummary.totalProblems) * 100).toFixed(1),
                      uniqueAuthors: problem.authors.size,
                      departments: Array.from(problem.departments).join(', '),
                      keywords: Array.from(problem.keywords).join(', '),
                      suggestions: problem.suggestions.size,
                      sources: Array.from(problem.sources).join(', '),
                      sentimentDistribution: {
                        positive: problem.examples.filter((ex: any) => ex.rating >= 4).length,
                        neutral: problem.examples.filter((ex: any) => ex.rating === 3).length,
                        negative: problem.examples.filter((ex: any) => ex.rating <= 2).length
                      },
                      ratingDistribution: {
                        1: problem.ratings.filter((r: number) => r === 1).length || 0,
                        2: problem.ratings.filter((r: number) => r === 2).length || 0,
                        3: problem.ratings.filter((r: number) => r === 3).length || 0,
                        4: problem.ratings.filter((r: number) => r === 4).length || 0,
                        5: problem.ratings.filter((r: number) => r === 5).length || 0
                      },
                      // Timeline básica (últimos exemplos)
                      timeline: problem.examples
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((ex: any) => ({
                          date: ex.date,
                          rating: ex.rating,
                          comment: ex.comment.substring(0, 100) + '...'
                        })),
                      // Tendência mensal
                      monthlyTrend: (() => {
                        const monthlyData: any = {};
                        problem.examples.forEach((ex: any) => {
                          const date = new Date(ex.date);
                          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
                        });
                        
                        return Object.entries(monthlyData)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .slice(-6) // Últimos 6 meses
                          .map(([month, count]) => ({
                            month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                            count
                          }));
                      })(),
                      // Top palavras-chave relacionadas
                      topKeywords: Array.from(problem.keywords).map((keyword: any) => ({
                        keyword,
                        count: problem.examples.filter((ex: any) => ex.keyword === keyword).length
                      })).sort((a, b) => b.count - a.count).slice(0, 5),
                      // Top problemas relacionados
                      topProblems: (() => {
                        const problemCounts: any = {};
                        problem.examples.forEach((ex: any) => {
                          if (ex.detail && ex.detail.trim() !== '') {
                            problemCounts[ex.detail] = (problemCounts[ex.detail] || 0) + 1;
                          }
                        });
                        
                        return Object.entries(problemCounts)
                          .map(([problem, count]) => ({ problem, count }))
                          .sort((a: any, b: any) => b.count - a.count)
                          .slice(0, 5);
                      })()
                    }
                  });
                  
                  // Usar o novo modal avançado
                  openDetailModal(problem, 'problem');
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Componente para visualização compacta (mini cartões)
  const CompactCard = ({ problem, index, setSelectedItem, setChartDetailOpen, executiveSummary }: any) => {
    const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
    const severityColor = avgRating <= 2 ? 'red' : avgRating <= 3 ? 'yellow' : 'green';
    
    return (
      <Card 
        className={`transition-all duration-200 border-l-4 cursor-pointer hover:shadow-md ${
          severityColor === 'red' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30' :
          severityColor === 'yellow' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30' :
          'border-l-green-500 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Preservar scroll
          const scrollPosition = window.scrollY;
          
          setSelectedItem({
            type: 'problem_analysis',
            data: {
              ...problem,
              label: problem.problem,
              name: problem.problem,
              value: problem.count,
              details: problem.problem_detail,
              departmentsList: Array.from(problem.departments),
              keywordsList: Array.from(problem.keywords)
            },
            title: problem.problem,
            examples: problem.examples,
            stats: {
              totalOccurrences: problem.count,
              averageRating: (problem.totalRating / problem.count),
              percentage: ((problem.count / executiveSummary.totalProblems) * 100).toFixed(1),
              uniqueAuthors: problem.authors.size,
              departments: Array.from(problem.departments).join(', '),
              keywords: Array.from(problem.keywords).join(', '),
              suggestions: problem.suggestions.size,
              sources: Array.from(problem.sources).join(', '),
              sentimentDistribution: {
                positive: problem.examples.filter((ex: any) => ex.rating >= 4).length,
                neutral: problem.examples.filter((ex: any) => ex.rating === 3).length,
                negative: problem.examples.filter((ex: any) => ex.rating <= 2).length
              },
              ratingDistribution: {
                1: problem.ratings.filter((r: number) => r === 1).length || 0,
                2: problem.ratings.filter((r: number) => r === 2).length || 0,
                3: problem.ratings.filter((r: number) => r === 3).length || 0,
                4: problem.ratings.filter((r: number) => r === 4).length || 0,
                5: problem.ratings.filter((r: number) => r === 5).length || 0
              },
              // Timeline básica (últimos exemplos)
              timeline: problem.examples
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((ex: any) => ({
                  date: ex.date,
                  rating: ex.rating,
                  comment: ex.comment.substring(0, 100) + '...'
                })),
              // Tendência mensal
              monthlyTrend: (() => {
                const monthlyData: any = {};
                problem.examples.forEach((ex: any) => {
                  const date = new Date(ex.date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
                });
                
                return Object.entries(monthlyData)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(-6) // Últimos 6 meses
                  .map(([month, count]) => ({
                    month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    count
                  }));
              })(),
              // Top palavras-chave relacionadas
              topKeywords: Array.from(problem.keywords).map((keyword: any) => ({
                keyword,
                count: problem.examples.filter((ex: any) => ex.keyword === keyword).length
              })).sort((a, b) => b.count - a.count).slice(0, 5),
              // Top problemas relacionados
              topProblems: (() => {
                const problemCounts: any = {};
                problem.examples.forEach((ex: any) => {
                  if (ex.detail && ex.detail.trim() !== '') {
                    problemCounts[ex.detail] = (problemCounts[ex.detail] || 0) + 1;
                  }
                });
                
                return Object.entries(problemCounts)
                  .map(([problem, count]) => ({ problem, count }))
                  .sort((a: any, b: any) => b.count - a.count)
                  .slice(0, 5);
              })()
            }
          });
          
          // Usar o novo modal avançado
          openDetailModal(problem, 'problem');
          
          // Restaurar scroll
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
          });
        }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant={severityColor === 'red' ? 'destructive' : severityColor === 'yellow' ? 'secondary' : 'default'} className="text-xs">
              {problem.count}x
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
            </div>
          </div>
          
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2">
            {problem.problem}
          </h4>
          
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{problem.authors.size}</span>
            </div>
            {problem.suggestions.size > 0 && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Lightbulb className="w-3 h-3" />
                <span>{problem.suggestions.size}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{problem.departments.size}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Componente para visualização detalhada (igual ao layout anterior)
  const DetailedCard = ({ problem, index, expandedCards, toggleCardExpansion, setSelectedItem, setChartDetailOpen, executiveSummary }: any) => {
    const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
    const severityColor = avgRating <= 2 ? 'red' : avgRating <= 3 ? 'yellow' : 'green';
    const isExpanded = expandedCards.has(problem.id);
    
    return (
      <Card className={`transition-all duration-200 border-l-4 ${
        severityColor === 'red' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30' :
        severityColor === 'yellow' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30' :
        'border-l-green-500 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
      }`}>
        <div className="p-4">
          {/* Cabeçalho do problema - DESTAQUE PRINCIPAL */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                🎯 {problem.problem}
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={severityColor === 'red' ? 'destructive' : severityColor === 'yellow' ? 'secondary' : 'default'}>
                  {problem.count} ocorrência{problem.count !== 1 ? 's' : ''}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedItem({
                    type: 'problem_analysis',
                    data: {
                      ...problem,
                      label: problem.problem,
                      name: problem.problem,
                      value: problem.count,
                      details: problem.problem_detail,
                      departmentsList: Array.from(problem.departments),
                      keywordsList: Array.from(problem.keywords)
                    },
                    title: problem.problem,
                    examples: problem.examples,
                    stats: {
                      totalOccurrences: problem.count,
                      averageRating: (problem.totalRating / problem.count),
                      percentage: ((problem.count / executiveSummary.totalProblems) * 100).toFixed(1),
                      uniqueAuthors: problem.authors.size,
                      departments: Array.from(problem.departments).join(', '),
                      keywords: Array.from(problem.keywords).join(', '),
                      suggestions: problem.suggestions.size,
                      sources: Array.from(problem.sources).join(', '),
                      sentimentDistribution: {
                        positive: problem.examples.filter((ex: any) => ex.rating >= 4).length,
                        neutral: problem.examples.filter((ex: any) => ex.rating === 3).length,
                        negative: problem.examples.filter((ex: any) => ex.rating <= 2).length
                      },
                      ratingDistribution: {
                        1: problem.ratings.filter((r: number) => r === 1).length || 0,
                        2: problem.ratings.filter((r: number) => r === 2).length || 0,
                        3: problem.ratings.filter((r: number) => r === 3).length || 0,
                        4: problem.ratings.filter((r: number) => r === 4).length || 0,
                        5: problem.ratings.filter((r: number) => r === 5).length || 0
                      },
                      timeline: problem.examples
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((ex: any) => ({
                          date: ex.date,
                          rating: ex.rating,
                          comment: ex.comment.substring(0, 100) + '...'
                        })),
                      monthlyTrend: (() => {
                        const monthlyData: any = {};
                        problem.examples.forEach((ex: any) => {
                          const date = new Date(ex.date);
                          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
                        });
                        
                        return Object.entries(monthlyData)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .slice(-6)
                          .map(([month, count]) => ({
                            month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                            count
                          }));
                      })(),
                      topKeywords: Array.from(problem.keywords).map((keyword: any) => ({
                        keyword,
                        count: problem.examples.filter((ex: any) => ex.keyword === keyword).length
                      })).sort((a, b) => b.count - a.count).slice(0, 5),
                      topProblems: (() => {
                        const problemCounts: any = {};
                        problem.examples.forEach((ex: any) => {
                          if (ex.detail && ex.detail.trim() !== '') {
                            problemCounts[ex.detail] = (problemCounts[ex.detail] || 0) + 1;
                          }
                        });
                        
                        return Object.entries(problemCounts)
                          .map(([problem, count]) => ({ problem, count }))
                          .sort((a: any, b: any) => b.count - a.count)
                          .slice(0, 5);
                      })()
                    }
                  });
                  
                  // Usar o novo modal avançado  
                  openDetailModal(problem, 'problem');
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleCardExpansion(problem.id, e);
                }}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* Informações básicas sempre visíveis */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300 mb-3">
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span title={Array.from(problem.departments).join(', ')}>
                {Array.from(problem.departments).slice(0, 2).join(', ')}
                {problem.departments.size > 2 && ` +${problem.departments.size - 2}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span title={Array.from(problem.keywords).join(', ')}>
                {Array.from(problem.keywords).slice(0, 2).join(', ')}
                {problem.keywords.size > 2 && ` +${problem.keywords.size - 2}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{problem.authors.size} autor{problem.authors.size !== 1 ? 'es' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{severityColor === 'red' ? 'Crítico' : severityColor === 'yellow' ? 'Atenção' : 'Normal'}</span>
            </div>
          </div>

          {/* Detalhes específicos quando expandido */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              
              {/* INFORMAÇÕES ESSENCIAIS - DEPARTAMENTOS E PALAVRAS-CHAVE */}
              <div className="p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center">
                  📍 Informações Essenciais
                </h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Departamentos envolvidos */}
                  <div className="space-y-2">
                    <h6 className="font-medium text-blue-900 dark:text-blue-100 text-sm flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Departamentos ({problem.departments.size})
                    </h6>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(problem.departments).map((dept: any, deptIndex: number) => (
                        <span key={deptIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Palavras-chave identificadas */}
                  <div className="space-y-2">
                    <h6 className="font-medium text-purple-900 dark:text-purple-100 text-sm flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Palavras-Chave ({problem.keywords.size})
                    </h6>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(problem.keywords).map((keyword: any, keyIndex: number) => (
                        <span key={keyIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Problem Details dos Feedbacks */}
                {(() => {
                  const specificDetails = problem.examples
                    .filter((ex: any) => ex.detail && ex.detail.trim() !== '')
                    .reduce((acc: any, ex: any) => {
                      const detail = ex.detail.trim();
                      if (!acc[detail]) {
                        acc[detail] = { count: 0, ratings: [] };
                      }
                      acc[detail].count++;
                      acc[detail].ratings.push(ex.rating);
                      return acc;
                    }, {});

                  const detailsArray = Object.entries(specificDetails)
                    .map(([detail, data]: any) => ({
                      detail,
                      count: data.count,
                      avgRating: data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length,
                      percentage: ((data.count / problem.examples.length) * 100).toFixed(0)
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                  if (detailsArray.length > 0) {
                    return (
                      <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 rounded border border-slate-200 dark:border-slate-700">
                        <h6 className="font-medium text-slate-900 dark:text-slate-100 mb-2 text-sm flex items-center gap-1">
                          🔍 Detalhes Específicos ({detailsArray.length} principais)
                        </h6>
                        <div className="space-y-2">
                          {detailsArray.map((item: any, index: number) => {
                            const severityColor = item.avgRating <= 2 ? 'text-red-600 dark:text-red-400' : 
                                                 item.avgRating <= 3 ? 'text-yellow-600 dark:text-yellow-400' : 
                                                 'text-green-600 dark:text-green-400';
                            return (
                              <div key={index} className="flex items-start justify-between gap-2 p-2 bg-white dark:bg-gray-700 rounded border">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-1" title={item.detail}>
                                    {item.detail}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{item.count}x ({item.percentage}%)</span>
                                    <span className={severityColor}>
                                      ★ {item.avgRating.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Sugestões dos Clientes */}
                {problem.suggestions.size > 0 && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded border border-green-200 dark:border-green-700">
                    <h6 className="font-medium text-green-900 dark:text-green-100 mb-2 text-sm flex items-center gap-1">
                      💡 Sugestões dos Clientes ({problem.suggestions.size})
                    </h6>
                    <div className="space-y-1">
                      {Array.from(problem.suggestions).slice(0, 3).map((suggestion: any, suggIndex: number) => (
                        <div key={suggIndex} className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                          <span className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                            {suggestion}
                          </span>
                        </div>
                      ))}
                      {problem.suggestions.size > 3 && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 italic">
                          E mais {problem.suggestions.size - 3} sugestão{problem.suggestions.size - 3 !== 1 ? 'ões' : ''}...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumo rápido */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{problem.authors.size} cliente{problem.authors.size !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>{(problem.totalRating / problem.count).toFixed(1)}/5 média</span>
                  </div>
                  {problem.suggestions.size > 0 && (
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Lightbulb className="w-3 h-3" />
                      <span>{problem.suggestions.size} sugestõe{problem.suggestions.size !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Indicador de que há mais detalhes */}
          {!isExpanded && (problem.problem_detail || problem.suggestions.size > 0) && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                type="button"
                className="text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleCardExpansion(problem.id, e);
                }}
              >
                Clique para ver detalhes específicos e exemplos
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200">
      {/* Header com título e seletor de visualização */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🎯 Análise de Problemas
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Selecione o modo de visualização que melhor atende às suas necessidades
        </p>
        
        {/* Seletor de Visualização Elegante */}
        <div className="max-w-2xl mx-auto">
          <Select value={selectedVisualization} onValueChange={(value: any) => setSelectedVisualization(value)}>
            <SelectTrigger className="w-full h-14 text-lg font-medium border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-gray-800 shadow-lg">
              <SelectValue placeholder="Escolha uma visualização" />
            </SelectTrigger>
            <SelectContent className="w-full">
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1">
                  📊 Visualizações Analíticas
                </SelectLabel>
                
                {/* TOP 10 PROBLEMAS - Visualização Principal */}
                <SelectItem value="top10" className="py-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-lg">
                      �
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Top 10 Problemas</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Ranking profissional com métricas-chave</div>
                    </div>
                  </div>
                </SelectItem>

                {/* GRÁFICO INTERATIVO POR DEPARTAMENTO */}
                <SelectItem value="option6" className="py-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg">
                      🏢
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Análise por Departamento</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Problemas agrupados por setor</div>
                    </div>
                  </div>
                </SelectItem>

                {/* RESUMO EXECUTIVO */}
                <SelectItem value="option3" className="py-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-lg">
                      📈
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Dashboard Executivo</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">KPIs e indicadores estratégicos</div>
                    </div>
                  </div>
                </SelectItem>

                {/* CENTRAL DE GRÁFICOS */}
                <SelectItem value="option5" className="py-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-lg">
                      📉
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">Múltiplos Gráficos</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Diversos tipos de visualização</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TOP 10 PROBLEMAS - VISUALIZAÇÃO ANALÍTICA PROFISSIONAL */}
      {selectedVisualization === 'top10' && (
        <div className="space-y-6">
          {/* Header com botão para cartões detalhados */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Top 10 Problemas Identificados
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Ranking dos problemas mais recorrentes com análise de impacto
              </p>
            </div>
            <Button
              onClick={() => setSelectedVisualization('option1')}
              variant="ghost"
              size="sm"
              className="ml-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalhes Completos
            </Button>
          </div>

          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total de Problemas</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {(() => {
                      const detailedProblems = getDetailedProblems();
                      return detailedProblems ? Object.keys(detailedProblems).length : 0;
                    })()}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ocorrências Totais</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {executiveSummary.totalProblems}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Casos Críticos</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {executiveSummary.criticalProblems}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Rating Médio</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {executiveSummary.averageRating.toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Visualizações Gráficas Top 10 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Bar Chart Horizontal - Volume de Ocorrências */}
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Top 10 - Volume de Ocorrências
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-5 py-2 text-sm"
                  onClick={() => {
                    const detailedProblems = getDetailedProblems();
                    const problemsArray = Object.values(detailedProblems);
                    if (!problemsArray || problemsArray.length === 0) return;
                    const top10Problems = problemsArray
                      .filter((p: any) => p && p.count > 0)
                      .sort((a: any, b: any) => b.count - a.count)
                      .slice(0, 10);
                    if (top10Problems.length === 0) return;

                    // Flatten examples for filteredData used inside modal visualizations
                    const flattenedExamples = top10Problems.flatMap((p: any) =>
                      Array.isArray(p.examples)
                        ? p.examples.map((ex: any) => ({
                            ...ex,
                            problem: p.problem,
                            problem_detail: p.problem_detail,
                            department: ex.department || Array.from(p.departments || [])[0] || '',
                            keyword: ex.keyword || Array.from(p.keywords || [])[0] || ''
                          }))
                        : []
                    );
                    // Também coletar todos os exemplos do conjunto completo
                    const allExamples = problemsArray.flatMap((p: any) =>
                      Array.isArray(p.examples)
                        ? p.examples.map((ex: any) => ({
                            ...ex,
                            problem: p.problem,
                            problem_detail: p.problem_detail,
                            department: ex.department || Array.from(p.departments || [])[0] || '',
                            keyword: ex.keyword || Array.from(p.keywords || [])[0] || ''
                          }))
                        : []
                    );
                    setModalFilteredData(flattenedExamples);

                    // Derivar keywords agregadas a partir dos exemplos (prioridade para exemplos)
                    const aggregatedKeywordsArray = flattenedExamples.flatMap((ex: any) => {
                      const raw = ex.keyword
                        ? String(ex.keyword)
                        : Array.isArray(ex.keywords) ? ex.keywords.join(',') : '';
                      return String(raw)
                        .split(/[;,|]/)
                        .map((t) => t.trim())
                        .filter((t) => t && t.toUpperCase() !== 'VAZIO');
                    });
                    const aggregatedKeywords = new Set(aggregatedKeywordsArray);

                    // Build an aggregated item compatible with type 'problem'
                    const aggregatedItem = {
                      problem: 'Top 10 Problemas',
                      problem_detail: 'Análise consolidada dos 10 problemas mais recorrentes',
                      count: top10Problems.reduce((sum: number, p: any) => sum + (p.count || 0), 0),
                      totalRating: top10Problems.reduce((sum: number, p: any) => sum + (p.totalRating || 0), 0),
                      ratings: top10Problems.flatMap((p: any) => Array.isArray(p.ratings) ? p.ratings : []),
                      examples: flattenedExamples,
                      authors: new Set(top10Problems.flatMap((p: any) => Array.from(p.authors || []))),
                      dates: top10Problems.flatMap((p: any) => Array.isArray(p.dates) ? p.dates : []),
                      suggestions: new Set(top10Problems.flatMap((p: any) => Array.from(p.suggestions || []))),
                      sources: new Set(top10Problems.flatMap((p: any) => Array.from(p.sources || []))),
                      departments: new Set(top10Problems.flatMap((p: any) => Array.from(p.departments || []))),
                      keywords: aggregatedKeywords,
                      allExamples
                    };

                    openDetailModal(aggregatedItem, 'problem');
                  }}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Detalhes dos Top 10
                </Button>
              </div>
              <div className="h-96">
                {(() => {
                  const detailedProblems = getDetailedProblems();
                  const problemsArray = Object.values(detailedProblems);
                  

                  
                  // Verificar se há dados válidos
                  if (!problemsArray || problemsArray.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        <p>Nenhum problema encontrado nos dados filtrados</p>
                      </div>
                    );
                  }
                  
                  const top10 = problemsArray
                    .filter((p: any) => p && p.count > 0) // Filtrar problemas válidos
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 10);

                  if (top10.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        <p>Nenhum problema válido encontrado</p>
                      </div>
                    );
                  }

                  return (
                    <Bar 
                      data={{
                        labels: top10.map((p: any) => 
                          p.problem.length > 35 ? p.problem.substring(0, 35) + '...' : p.problem
                        ),
                        datasets: [{
                          label: 'Ocorrências',
                          data: top10.map((p: any) => p.count),
                          backgroundColor: top10.map((p: any) => {
                            const ratings = Array.isArray(p.ratings) ? p.ratings : [];
                            const avgRating = ratings.length > 0 
                              ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
                              : 3; // valor padrão
                            if (avgRating <= 2) return '#DC2626'; // red-600
                            if (avgRating <= 3) return '#F97316'; // orange-500
                            if (avgRating <= 3.5) return '#FBBF24'; // amber-400
                            return '#6B7280'; // gray-500
                          }),
                          borderRadius: 8,
                          barThickness: 30
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        onClick: (_event: any, elements: any) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const problem: any = top10[index];
                            const ratings = Array.isArray(problem.ratings) ? problem.ratings : [];
                            const avgRating = ratings.length > 0 
                              ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
                              : 3;
                            
                            // Calcular distribuições
                            const sentimentDistribution = {
                              positive: ratings.filter((r: number) => r >= 4).length,
                              neutral: ratings.filter((r: number) => r === 3).length,
                              negative: ratings.filter((r: number) => r <= 2).length
                            };
                            
                            const ratingDistribution: Record<number, number> = {
                              1: ratings.filter((r: number) => r === 1).length,
                              2: ratings.filter((r: number) => r === 2).length,
                              3: ratings.filter((r: number) => r === 3).length,
                              4: ratings.filter((r: number) => r === 4).length,
                              5: ratings.filter((r: number) => r === 5).length
                            };
                            
                            setSelectedItem({
                              type: 'problem_analysis',
                              data: {
                                ...problem,
                                label: problem.problem,
                                name: problem.problem,
                                value: problem.count
                              },
                              title: problem.problem,
                              examples: problem.examples,
                              stats: {
                                totalOccurrences: problem.count,
                                averageRating: avgRating,
                                sentimentDistribution: sentimentDistribution,
                                ratingDistribution: ratingDistribution,
                                // Tendência mensal (garantir array para evitar TypeError)
                                monthlyTrend: (() => {
                                  const monthlyData: Record<string, number> = {};
                                  (problem.examples || []).forEach((ex: any) => {
                                    const d = new Date(ex.date);
                                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    monthlyData[key] = (monthlyData[key] || 0) + 1;
                                  });
                                  return Object.entries(monthlyData)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .slice(-6)
                                    .map(([month, count]) => ({
                                      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                                      count
                                    }));
                                })(),
                                percentage: ((problem.count / executiveSummary.totalProblems) * 100).toFixed(1),
                                uniqueAuthors: problem.authors.size
                              }
                            });
                            setChartDetailOpen(true);
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            titleColor: '#f1f5f9',
                            bodyColor: '#cbd5e1',
                            callbacks: {
                              label: (context: any) => {
                                const problem: any = top10[context.dataIndex];
                                const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
                                const criticalCount = problem.ratings.filter((r: number) => r <= 2).length;
                                const percentage = ((problem.count / executiveSummary.totalProblems) * 100).toFixed(1);
                                // Agregar detalhes específicos do problema para exibir no hover
                                const detailsAgg = aggregateProblemDetailsFromFeedbacks(filteredData, problem.problem);

                                const base = [
                                  `Ocorrências: ${context.parsed.x}`,
                                  `Rating Médio: ${avgRating.toFixed(1)}★`,
                                  `Críticos: ${criticalCount} (${((criticalCount/problem.count)*100).toFixed(0)}%)`,
                                  `% do Total: ${percentage}%`,
                                  `Autores: ${problem.authors.size}`,
                                  '',
                                  'Detalhes mais citados:'
                                ];

                                const detailLines = detailsAgg.length > 0
                                  ? detailsAgg.map((d: any) => `• ${d.detail} (${d.count}, ${d.pct.toFixed(0)}%)`)
                                  : ['• Sem detalhes específicos'];

                                return [...base, ...detailLines, '', '💡 Clique para ver detalhes'];
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                              color: '#64748b',
                              font: { size: 11 }
                            },
                            grid: {
                              color: '#e2e8f0'
                            }
                          },
                          y: {
                            ticks: {
                              color: '#475569',
                              font: { 
                                size: 11,
                                weight: 500
                              }
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  );
                })()}
              </div>
              {/* Legenda removida para manter foco no gráfico */}
            </Card>

            {/* Botão movido para o cabeçalho acima para melhor harmonia visual */}

            {/* Gráfico 2: Distribuição por Departamento (Top 10) */}
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-500" />
                Distribuição por Departamento (Top 10)
              </h4>
              <div className="h-96">
                {(() => {
                  // Contar departamentos apenas para feedbacks que tenham problemas válidos
                  const departmentCounts: Record<string, number> = {};
                  
                  filteredData.forEach(feedback => {
                    // Só contar se o feedback tem problemas válidos
                    if (feedbackHasValidProblems(feedback) && feedback.sector) {
                      const allSectors = feedback.sector.split(';').map((s: string) => s.trim());
                      
                      // Contar cada feedback em cada departamento válido
                      allSectors.forEach((sector: string) => {
                        const trimmedSector = sector.trim();
                        if (trimmedSector && trimmedSector !== 'VAZIO') {
                          departmentCounts[trimmedSector] = (departmentCounts[trimmedSector] || 0) + 1;
                        }
                      });
                    }
                  });
                  
                  const sortedDepts = Object.entries(departmentCounts)
                    .map(([department, count]) => ({ 
                      label: department, 
                      value: count,
                      name: department
                    }))
                    .sort((a, b) => b.value - a.value);

                  const colors = [
                    '#3B82F6', // blue-500
                    '#8B5CF6', // violet-500
                    '#EC4899', // pink-500
                    '#F59E0B', // amber-500
                    '#10B981', // emerald-500
                    '#6366F1', // indigo-500
                    '#F97316', // orange-500
                    '#14B8A6', // teal-500
                    '#A855F7', // purple-500
                    '#64748B'  // slate-500
                  ];

                  if (sortedDepts.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        <p>Nenhum departamento encontrado nos dados filtrados</p>
                      </div>
                    );
                  }

                  return (
                    <Doughnut
                      data={{
                        labels: sortedDepts.map(dept => dept.label),
                        datasets: [{
                          data: sortedDepts.map(dept => dept.value),
                          backgroundColor: colors,
                          borderColor: '#ffffff',
                          borderWidth: 3,
                          hoverOffset: 15
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (_event: any, elements: any) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const deptData = sortedDepts[index];
                            
                            // Filtrar feedbacks deste departamento que tenham problemas válidos
                            const deptFeedbacks = filteredData.filter(feedback => 
                              feedbackHasValidProblems(feedback) && 
                              feedback.sector && feedback.sector.includes(deptData.label)
                            );
                            
                            // Calcular rating médio do departamento
                            const allRatings = deptFeedbacks
                              .map(f => f.rating)
                              .filter(r => r && r > 0);
                            const avgRating = allRatings.length > 0 
                              ? allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length 
                              : 0;
                            
                            // Calcular autores únicos
                            const uniqueAuthors = new Set(deptFeedbacks.map(f => f.author).filter(a => a));
                            
                            // Calcular distribuição de sentimentos
                            const sentimentDistribution = {
                              positive: allRatings.filter((r: number) => r >= 4).length,
                              neutral: allRatings.filter((r: number) => r === 3).length,
                              negative: allRatings.filter((r: number) => r <= 2).length
                            };
                            
                            // Calcular distribuição de ratings
                            const ratingDistribution: Record<number, number> = {
                              1: allRatings.filter((r: number) => r === 1).length,
                              2: allRatings.filter((r: number) => r === 2).length,
                              3: allRatings.filter((r: number) => r === 3).length,
                              4: allRatings.filter((r: number) => r === 4).length,
                              5: allRatings.filter((r: number) => r === 5).length
                            };
                            
                            const totalFeedbacks = sortedDepts.reduce((sum, dept) => sum + dept.value, 0);
                            
                            setSelectedItem({
                              type: 'department',
                              data: {
                                label: deptData.label,
                                name: deptData.label,
                                value: deptData.value
                              },
                              title: deptData.label,
                              stats: {
                                totalProblems: deptFeedbacks.length,
                                totalOccurrences: deptData.value,
                                averageRating: avgRating,
                                uniqueAuthors: uniqueAuthors.size,
                                sentimentDistribution: sentimentDistribution,
                                ratingDistribution: ratingDistribution,
                                // Tendência mensal para departamento
                                monthlyTrend: (() => {
                                  const monthlyData: Record<string, number> = {};
                                  (deptFeedbacks || []).forEach((f: any) => {
                                    const d = new Date(f.date);
                                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    monthlyData[key] = (monthlyData[key] || 0) + 1;
                                  });
                                  return Object.entries(monthlyData)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .slice(-6)
                                    .map(([month, count]) => ({
                                      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                                      count
                                    }));
                                })(),
                                percentage: ((deptData.value / totalFeedbacks) * 100).toFixed(1)
                              }
                            });
                            setChartDetailOpen(true);
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: {
                              padding: 15,
                              font: { size: 12 },
                              color: '#64748b',
                              generateLabels: (chart: any) => {
                                const data = chart.data;
                                return data.labels.map((label: string, i: number) => {
                                  const value = data.datasets[0].data[i];
                                  const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return {
                                    text: `${label}: ${value} (${percentage}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                  };
                                })
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            titleColor: '#f1f5f9',
                            bodyColor: '#cbd5e1',
                            callbacks: {
                              label: (context: any) => {
                                const total = sortedDepts.reduce((sum, dept) => sum + dept.value, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                
                                return [
                                  `Feedbacks: ${context.parsed}`,
                                  `Percentual: ${percentage}%`,
                                  '',
                                  '💡 Clique para ver detalhes'
                                ];
                              }
                            }
                          }
                        }
                      }}
                    />
                  );
                })()}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                  💡 Clique em qualquer setor do gráfico para ver os problemas específicos daquele departamento
                </p>
              </div>
            </Card>

          </div>
        </div>
      )}


      {/* OPÇÃO 1: DASHBOARD DE CARTÕES DETALHADOS COM MÚLTIPLAS VISUALIZAÇÕES */}
      {selectedVisualization === 'option1' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 border-green-200 dark:border-green-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                  📋 Cartões de Problemas - Visualização Avançada
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Problemas com múltiplas opções de visualização e organização
                </p>
              </div>

              {/* Controles de Visualização */}
              <div className="flex flex-wrap gap-3">
                {/* Tipo de Visualização */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Button
                    variant={viewType === 'detailed' ? 'default' : 'ghost'}
                    size="sm"
                    type="button"
                    onClick={() => setViewType('detailed')}
                    className="h-8 px-3"
                  >
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Detalhado
                  </Button>
                  <Button
                    variant={viewType === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    type="button"
                    onClick={() => setViewType('grid')}
                    className="h-8 px-3"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Quadrados
                  </Button>
                  <Button
                    variant={viewType === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    type="button"
                    onClick={() => setViewType('list')}
                    className="h-8 px-3"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Lista
                  </Button>
                  <Button
                    variant={viewType === 'compact' ? 'default' : 'ghost'}
                    size="sm"
                    type="button"
                    onClick={() => setViewType('compact')}
                    className="h-8 px-3"
                  >
                    <LayoutGrid className="w-4 h-4 mr-1" />
                    Compacto
                  </Button>
                </div>

                {/* Ordenação */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <SortAsc className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as any)}
                    className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                  >
                    <option value="frequency">Frequência</option>
                    <option value="alphabetical">Alfabética</option>
                    <option value="severity">Criticidade</option>
                    <option value="recent">Recentes</option>
                  </select>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Filter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <select
                    value={filterBy}
                    onChange={(e) => handleFilterChange(e.target.value as any)}
                    className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos</option>
                    <option value="critical">Críticos</option>
                    <option value="with-suggestions">Com Sugestões</option>
                    <option value="with-details">Com Detalhes</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Info sobre dados processados */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {getFilteredAndSortedProblems().length} de {Object.values(detailedProblems).length} problemas
                  </span>
                </div>
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <Zap className="w-4 h-4" />
                  <span>
                    {executiveSummary.dataSourcesCount.allProblems} com IA • 
                    {executiveSummary.dataSourcesCount.legacy} legado
                  </span>
                </div>
                <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                  <Target className="w-4 h-4" />
                  <span>{executiveSummary.totalProblems} ocorrências totais</span>
                </div>
              </div>
            </div>
            
            {/* Renderização baseada no tipo de visualização */}
            {/* Nova visualização detalhada (como estava antes) */}
            {viewType === 'detailed' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {getFilteredAndSortedProblems().slice(0, showAllItems ? undefined : 20).map((problem: any, index: number) => (
                    <DetailedCard 
                      key={problem.id} 
                      problem={problem} 
                      index={index} 
                      expandedCards={expandedCards}
                      toggleCardExpansion={toggleCardExpansion}
                      setSelectedItem={setSelectedItem}
                      setChartDetailOpen={setChartDetailOpen}
                      executiveSummary={executiveSummary}
                    />
                  ))}
                </div>
                
                {/* Botão expandir para detalhado */}
                {!showAllItems && getFilteredAndSortedProblems().length > 20 && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowAllItems(true)}
                      className="px-6 py-2"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Mostrar todos ({getFilteredAndSortedProblems().length - 20} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}

            {viewType === 'grid' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {getFilteredAndSortedProblems().slice(0, showAllItems ? undefined : 24).map((problem: any, index: number) => (
                    <GridCard 
                      key={problem.id} 
                      problem={problem} 
                      index={index} 
                      expandedCards={expandedCards}
                      toggleCardExpansion={toggleCardExpansion}
                      setSelectedItem={setSelectedItem}
                      setChartDetailOpen={setChartDetailOpen}
                      executiveSummary={executiveSummary}
                    />
                  ))}
                </div>
                
                {/* Botão expandir para grid */}
                {!showAllItems && getFilteredAndSortedProblems().length > 24 && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowAllItems(true)}
                      className="px-6 py-2"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Mostrar todos ({getFilteredAndSortedProblems().length - 24} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}

            {viewType === 'list' && (
              <>
                <div className="space-y-3">
                  {getFilteredAndSortedProblems().slice(0, showAllItems ? undefined : 30).map((problem: any, index: number) => (
                    <ListCard 
                      key={problem.id} 
                      problem={problem} 
                      index={index} 
                      expandedCards={expandedCards}
                      toggleCardExpansion={toggleCardExpansion}
                      setSelectedItem={setSelectedItem}
                      setChartDetailOpen={setChartDetailOpen}
                      executiveSummary={executiveSummary}
                    />
                  ))}
                </div>
                
                {/* Botão expandir para lista */}
                {!showAllItems && getFilteredAndSortedProblems().length > 30 && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowAllItems(true)}
                      className="px-6 py-2"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Mostrar todos ({getFilteredAndSortedProblems().length - 30} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}

            {viewType === 'compact' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-3">
                  {getFilteredAndSortedProblems().slice(0, showAllItems ? undefined : 40).map((problem: any, index: number) => (
                    <CompactCard 
                      key={problem.id} 
                      problem={problem} 
                      index={index} 
                      setSelectedItem={setSelectedItem}
                      setChartDetailOpen={setChartDetailOpen}
                      executiveSummary={executiveSummary}
                    />
                  ))}
                </div>
                
                {/* Botão expandir para compacto */}
                {!showAllItems && getFilteredAndSortedProblems().length > 40 && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowAllItems(true)}
                      className="px-6 py-2"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Mostrar todos ({getFilteredAndSortedProblems().length - 40} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {getFilteredAndSortedProblems().length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Nenhum problema encontrado</p>
                <p className="text-sm">
                  Ajuste os filtros ou verifique os dados • 
                  {executiveSummary.totalProblems} feedbacks processados • 
                  {executiveSummary.dataSourcesCount.allProblems} com análise IA
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPÇÃO 3: DASHBOARD EXECUTIVO PROFISSIONAL */}
      {selectedVisualization === 'option3' && (
        <div className="space-y-6">
          {/* Header Limpo e Profissional */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Dashboard Executivo
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Indicadores estratégicos e análise de performance
              </p>
            </div>
          </div>

          {/* KPIs Principais em Cards Limpos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Problemas */}
            <Card className="p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total de Problemas</h4>
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {(() => {
                  const detailedProblems = getDetailedProblems();
                  return detailedProblems && typeof detailedProblems === 'object' 
                    ? Object.keys(detailedProblems).length 
                    : 0;
                })()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                {executiveSummary.totalProblems} ocorrências totais
              </p>
            </Card>

            {/* Taxa de Criticidade */}
            <Card className="p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Taxa de Criticidade</h4>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {((executiveSummary.criticalProblems / executiveSummary.totalProblems) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                {executiveSummary.criticalProblems} casos com rating ≤2★
              </p>
            </Card>

            {/* Satisfação Média */}
            <Card className="p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Satisfação Média</h4>
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {executiveSummary.averageRating.toFixed(2)}★
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                Rating médio geral dos feedbacks
              </p>
            </Card>

            {/* Usuários Impactados */}
            <Card className="p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Usuários Impactados</h4>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {executiveSummary.uniqueAuthors}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                Autores únicos de feedbacks
              </p>
            </Card>
          </div>

          {/* Gráficos Principais - 2 Colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Criticidade */}
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Distribuição por Nível de Criticidade
              </h4>
              <div className="h-64">
                <Doughnut 
                  data={{
                    labels: ['Crítico (1-2★)', 'Regular (3★)', 'Satisfatório (4-5★)'],
                    datasets: [{
                      data: [
                        executiveSummary.criticalProblems,
                        Object.values(getDetailedProblems())
                          .reduce((sum: number, p: any) => sum + (Array.isArray(p.ratings) ? p.ratings.filter((r: number) => r === 3).length : 0), 0),
                        Object.values(getDetailedProblems())
                          .reduce((sum: number, p: any) => sum + (Array.isArray(p.ratings) ? p.ratings.filter((r: number) => r >= 4).length : 0), 0)
                      ],
                      backgroundColor: [
                        '#DC2626', // red-600
                        '#F59E0B', // amber-500
                        '#10B981'  // emerald-500
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          font: { size: 12 },
                          color: '#64748b'
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>

            {/* Top 5 Problemas */}
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Top 5 Problemas Mais Recorrentes
              </h4>
              <div className="h-64">
                {(() => {
                  const detailedProblems = getDetailedProblems();
                  const problemsArray = Object.values(detailedProblems);
                  
                  if (!problemsArray || problemsArray.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Nenhum problema encontrado</p>
                      </div>
                    );
                  }
                  
                  const top5 = problemsArray
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 5);

                  return (
                    <Bar 
                      data={{
                        labels: top5.map((p: any) => 
                          p.problem.length > 30 ? p.problem.substring(0, 30) + '...' : p.problem
                        ),
                        datasets: [{
                          label: 'Ocorrências',
                          data: top5.map((p: any) => p.count),
                          backgroundColor: '#3B82F6', // blue-500
                          borderRadius: 6,
                          barThickness: 40
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context: any) => {
                                const problem: any = top5[context.dataIndex];
                                const ratings = Array.isArray(problem.ratings) ? problem.ratings : [];
                                const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 3;
                                return [
                                  `Ocorrências: ${context.parsed.x}`,
                                  `Rating Médio: ${avgRating.toFixed(1)}★`,
                                  `Autores: ${problem.authors?.size || 0}`
                                ];
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                              color: '#64748b'
                            },
                            grid: {
                              color: '#e2e8f0'
                            }
                          },
                          y: {
                            ticks: {
                              color: '#64748b',
                              font: { size: 11 }
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  );
                })()}
              </div>
            </Card>
          </div>

          {/* Análise por Departamento - Tabela Profissional */}
          <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Análise por Departamento
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Departamento</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Feedbacks</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Críticos</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Rating Médio</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const depts = getDepartmentAnalysis();
                    return Object.entries(depts)
                      .sort(([,a]: any, [,b]: any) => b.allExamples.length - a.allExamples.length)
                      .map(([deptName, dept]: any, index: number) => {
                        const totalFeedbacks = dept.allExamples.length; // Total de feedbacks/comentários
                        const avgRating = dept.totalRating / totalFeedbacks;
                        const criticalCount = dept.allExamples.filter((ex: any) => ex.rating <= 2).length;
                        const criticalPercentage = (criticalCount / totalFeedbacks) * 100;

                        return (
                          <tr key={deptName} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                              {deptName}
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-slate-700 dark:text-slate-300">
                              {totalFeedbacks}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                criticalPercentage > 30 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                criticalPercentage > 15 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              }`}>
                                {criticalCount} ({criticalPercentage.toFixed(0)}%)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  {avgRating.toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {avgRating <= 2.5 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                  Crítico
                                </span>
                              ) : avgRating <= 3.5 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                                  Atenção
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  Estável
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Insights e Recomendações */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Insights e Recomendações
            </h4>
            <div className="space-y-3">
              {(() => {
                const insights = [];
                const criticalRate = (executiveSummary.criticalProblems / executiveSummary.totalProblems) * 100;
                
                if (criticalRate > 30) {
                  insights.push({
                    type: 'warning',
                    text: `Taxa de criticidade elevada (${criticalRate.toFixed(1)}%). Ação imediata necessária nos principais problemas.`
                  });
                } else if (criticalRate > 15) {
                  insights.push({
                    type: 'attention',
                    text: `Taxa de criticidade moderada (${criticalRate.toFixed(1)}%). Monitoramento próximo recomendado.`
                  });
                }

                if (executiveSummary.averageRating < 3) {
                  insights.push({
                    type: 'warning',
                    text: 'Rating médio abaixo de 3★. Revisar processos e implementar melhorias urgentes.'
                  });
                }

                if (executiveSummary.withSuggestions > 0) {
                  insights.push({
                    type: 'info',
                    text: `${executiveSummary.withSuggestions} feedbacks contêm sugestões de melhoria dos clientes.`
                  });
                }

                const detailedProblems = getDetailedProblems();
                const topProblems = detailedProblems && typeof detailedProblems === 'object' 
                  ? Object.values(detailedProblems)
                      .sort((a: any, b: any) => b.count - a.count)
                      .slice(0, 3)
                  : [];
                
                if (topProblems.length > 0) {
                  insights.push({
                    type: 'focus',
                    text: `Priorizar ação nos 3 principais problemas: ${topProblems.map((p: any) => p.problem).join(', ')}.`
                  });
                }

                return insights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === 'warning' ? 'bg-red-50 dark:bg-red-950/20 border-red-500' :
                      insight.type === 'attention' ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-500' :
                      insight.type === 'focus' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-500' :
                      'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                    }`}
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-300">{insight.text}</p>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* OPÇÃO 5: CENTRAL DE GRÁFICOS E ANALYTICS AVANÇADOS */}
      {selectedVisualization === 'option5' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-6 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
            <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
              📈 Central de Gráficos e Analytics Avançados
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-300 mb-6">
              Dashboards interativos com gráficos Chart.js elaborados, tooltips detalhados e análises visuais completas
            </p>
            
            {/* Primeira linha - Gráficos principais */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              
              {/* Gráfico 1: Top 10 Problemas - Barras Horizontais */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🎯 Top 10 Problemas Mais Críticos
                </h4>
                <div className="h-80">
                  {(() => {
                    const problemsData = processProblemsData();
                    const problemCounts = problemsData.reduce((acc: any, problem: any) => {
                      const key = problem.problem;
                      if (!acc[key]) {
                        acc[key] = { count: 0, totalRating: 0, ratings: [] };
                      }
                      acc[key].count++;
                      acc[key].totalRating += problem.rating;
                      acc[key].ratings.push(problem.rating);
                      return acc;
                    }, {});

                    const topProblems = Object.entries(problemCounts)
                      .map(([problem, data]: [string, any]) => ({
                        problem: problem.length > 30 ? problem.substring(0, 30) + '...' : problem,
                        fullProblem: problem,
                        count: data.count,
                        avgRating: (data.totalRating / data.count).toFixed(1),
                        severity: data.totalRating / data.count <= 2 ? 'Crítico' : 
                                 data.totalRating / data.count <= 3 ? 'Moderado' : 'Leve'
                      }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10);

                    const chartData = {
                      labels: topProblems.map(p => p.problem),
                      datasets: [{
                        label: 'Ocorrências',
                        data: topProblems.map(p => p.count),
                        backgroundColor: topProblems.map(p => {
                          return p.severity === 'Crítico' ? 'rgba(239, 68, 68, 0.8)' :
                                 p.severity === 'Moderado' ? 'rgba(245, 158, 11, 0.8)' :
                                 'rgba(34, 197, 94, 0.8)';
                        }),
                        borderColor: topProblems.map(p => {
                          return p.severity === 'Crítico' ? 'rgb(239, 68, 68)' :
                                 p.severity === 'Moderado' ? 'rgb(245, 158, 11)' :
                                 'rgb(34, 197, 94)';
                        }),
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                      }]
                    };

                  const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y' as const,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          title: (context: any) => {
                            const problem = topProblems[context[0].dataIndex];
                            return problem.fullProblem;
                          },
                          label: (context: any) => {
                            const problem = topProblems[context.dataIndex];
                            const base = [
                              `📊 Ocorrências: ${problem.count}`,
                              `⭐ Rating médio: ${problem.avgRating}⭐`,
                              `⚠️ Severidade: ${problem.severity}`,
                              `📈 % do total: ${((problem.count / problemsData.length) * 100).toFixed(1)}%`
                            ];
                            const detailsAgg = aggregateProblemDetailsFromFeedbacks(filteredData, problem.fullProblem);
                            if (detailsAgg.length > 0) {
                              base.push('');
                              base.push('Detalhes mais citados:');
                              detailsAgg.forEach(d => {
                                base.push(`• ${d.detail} • ${d.count} (${d.pct.toFixed(0)}%)`);
                              });
                            }
                            return base;
                          }
                        }
                      }
                    },
                    scales: {
                        x: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return value + ' casos';
                            }
                          }
                        },
                        y: {
                          ticks: {
                            font: { size: 11 }
                          }
                        }
                      }
                    };

                    return <Bar data={chartData} options={chartOptions} />;
                  })()}
                </div>
              </Card>

              {/* Gráfico 2: Distribuição por Departamento - Pizza */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🏢 Distribuição de Problemas por Departamento
                </h4>
                <div className="h-80">
                  {(() => {
                    const problemsData = processProblemsData();
                    const deptCounts = problemsData.reduce((acc: any, problem: any) => {
                      const dept = problem.department;
                      if (!acc[dept]) {
                        acc[dept] = { count: 0, ratings: [], criticalCount: 0 };
                      }
                      acc[dept].count++;
                      acc[dept].ratings.push(problem.rating);
                      if (problem.rating <= 2) acc[dept].criticalCount++;
                      return acc;
                    }, {});

                    const deptData = Object.entries(deptCounts)
                      .map(([dept, data]: [string, any]) => ({
                        dept,
                        count: data.count,
                        avgRating: (data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length).toFixed(1),
                        criticalPercentage: ((data.criticalCount / data.count) * 100).toFixed(1)
                      }))
                      .sort((a, b) => b.count - a.count);

                    const colors = [
                      '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
                      '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981'
                    ];

                    const chartData = {
                      labels: deptData.map(d => `${d.dept}\n${d.count} problemas\n${d.avgRating}⭐`),
                      datasets: [{
                        data: deptData.map(d => d.count),
                        backgroundColor: colors.slice(0, deptData.length),
                        borderColor: '#fff',
                        borderWidth: 3
                      }]
                    };

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                          labels: {
                            boxWidth: 12,
                            padding: 8,
                            font: { size: 10 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const dept = deptData[context[0].dataIndex];
                              return dept.dept;
                            },
                            label: (context: any) => {
                              const dept = deptData[context.dataIndex];
                              const total = deptData.reduce((sum, d) => sum + d.count, 0);
                              const percentage = ((dept.count / total) * 100).toFixed(1);
                              
                              return [
                                `${dept.count} problemas (${percentage}%)`,
                                `Rating médio: ${dept.avgRating}⭐`,
                                `${dept.criticalPercentage}% são críticos (≤2⭐)`
                              ];
                            }
                          }
                        }
                      }
                    };

                    return <Doughnut data={chartData} options={chartOptions} />;
                  })()}
                </div>
              </Card>
            </div>

            {/* Segunda linha - Análise temporal e ratings */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              
              {/* Gráfico 3: Tendência Temporal - Linha */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  📅 Tendência Temporal de Problemas
                </h4>
                <div className="h-80">
                  {(() => {
                    const problemsData = processProblemsData();
                    
                    // Agrupar por mês
                    const monthlyData = problemsData.reduce((acc: any, problem: any) => {
                      const date = new Date(problem.date);
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      
                      if (!acc[monthKey]) {
                        acc[monthKey] = { total: 0, critical: 0, ratings: [] };
                      }
                      
                      acc[monthKey].total++;
                      acc[monthKey].ratings.push(problem.rating);
                      if (problem.rating <= 2) acc[monthKey].critical++;
                      
                      return acc;
                    }, {});

                    const sortedMonths = Object.keys(monthlyData)
                      .sort()
                      .slice(-6); // Últimos 6 meses

                    const chartData = {
                      labels: sortedMonths.map(month => {
                        const [year, monthNum] = month.split('-');
                        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                        return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                      }),
                      datasets: [
                        {
                          label: 'Total de Problemas',
                          data: sortedMonths.map(month => monthlyData[month].total),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          borderWidth: 3,
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgb(59, 130, 246)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointRadius: 6
                        },
                        {
                          label: 'Problemas Críticos (≤2⭐)',
                          data: sortedMonths.map(month => monthlyData[month].critical),
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          borderWidth: 3,
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgb(239, 68, 68)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointRadius: 6
                        }
                      ]
                    };

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: {
                            boxWidth: 12,
                            padding: 20
                          }
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const month = sortedMonths[context[0].dataIndex];
                              const [year, monthNum] = month.split('-');
                              const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                              return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            },
                            label: (context: any) => {
                              const month = sortedMonths[context.dataIndex];
                              const data = monthlyData[month];
                              const avgRating = data.ratings.length > 0 
                                ? (data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length).toFixed(1)
                                : '0';
                              
                              if (context.datasetIndex === 0) {
                                return [
                                  `${context.parsed.y} problemas total`,
                                  `Rating médio do mês: ${avgRating}⭐`,
                                  `${((data.critical / data.total) * 100).toFixed(1)}% foram críticos`
                                ];
                              } else {
                                return [
                                  `${context.parsed.y} problemas críticos`,
                                  `${((context.parsed.y / data.total) * 100).toFixed(1)}% do total do mês`
                                ];
                              }
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return value + ' problemas';
                            }
                          }
                        }
                      }
                    };

                    return <Line data={chartData} options={chartOptions} />;
                  })()}
                </div>
              </Card>

              {/* Gráfico 4: Distribuição Detalhada de Ratings - Barras */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  ⭐ Distribuição Detalhada de Avaliações
                </h4>
                <div className="h-80">
                  {(() => {
                    const problemsData = processProblemsData();
                    
                    const ratingAnalysis = [1, 2, 3, 4, 5].map(rating => {
                      const ratingsOfType = problemsData.filter(p => p.rating === rating);
                      const totalProblems = problemsData.length;
                      
                      // Top departamentos para este rating
                      const deptCounts = ratingsOfType.reduce((acc: any, p) => {
                        acc[p.department] = (acc[p.department] || 0) + 1;
                        return acc;
                      }, {});
                      
                      const topDept = Object.entries(deptCounts)
                        .sort(([,a], [,b]) => (b as number) - (a as number))[0];

                      return {
                        rating,
                        count: ratingsOfType.length,
                        percentage: ((ratingsOfType.length / totalProblems) * 100).toFixed(1),
                        topDepartment: topDept ? topDept[0] : 'N/A',
                        topDeptCount: topDept ? topDept[1] : 0,
                        label: rating === 5 ? 'Excelente' :
                               rating === 4 ? 'Bom' :
                               rating === 3 ? 'Regular' :
                               rating === 2 ? 'Ruim' : 'Péssimo'
                      };
                    });

                    const chartData = {
                      labels: ratingAnalysis.map(r => `${r.rating}⭐\n${r.label}\n${r.count} casos`),
                      datasets: [{
                        label: 'Quantidade de Problemas',
                        data: ratingAnalysis.map(r => r.count),
                        backgroundColor: [
                          'rgba(239, 68, 68, 0.8)',   // 1⭐ - Vermelho
                          'rgba(245, 158, 11, 0.8)',  // 2⭐ - Laranja  
                          'rgba(234, 179, 8, 0.8)',   // 3⭐ - Amarelo
                          'rgba(34, 197, 94, 0.8)',   // 4⭐ - Verde
                          'rgba(16, 185, 129, 0.8)'   // 5⭐ - Verde escuro
                        ],
                        borderColor: [
                          'rgb(239, 68, 68)',
                          'rgb(245, 158, 11)', 
                          'rgb(234, 179, 8)',
                          'rgb(34, 197, 94)',
                          'rgb(16, 185, 129)'
                        ],
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                      }]
                    };

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const rating = ratingAnalysis[context[0].dataIndex];
                              return `${rating.rating}⭐ - ${rating.label}`;
                            },
                            label: (context: any) => {
                              const rating = ratingAnalysis[context.dataIndex];
                              return [
                                `${rating.count} problemas (${rating.percentage}%)`,
                                `Depto. mais afetado: ${rating.topDepartment}`,
                                `${rating.topDeptCount} casos neste departamento`
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return value + ' problemas';
                            }
                          }
                        },
                        x: {
                          ticks: {
                            font: { size: 10 }
                          }
                        }
                      }
                    };

                    return <Bar data={chartData} options={chartOptions} />;
                  })()}
                </div>
              </Card>
            </div>

            {/* Terceira linha - Palavras-chave e correlações */}
            <div className="grid grid-cols-1 gap-6 mb-6">
              
              {/* Gráfico 5: Top Palavras-chave com Detalhamento - Barras grandes */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🎯 Top 15 Palavras-chave com Análise Detalhada
                </h4>
                <div className="h-96">
                  {(() => {
                    const problemsData = processProblemsData();
                    
                    const keywordAnalysis = problemsData.reduce((acc: any, problem: any) => {
                      const keyword = problem.keyword;
                      if (!acc[keyword]) {
                        acc[keyword] = { 
                          count: 0, 
                          ratings: [], 
                          departments: new Set(),
                          problems: new Set()
                        };
                      }
                      
                      acc[keyword].count++;
                      acc[keyword].ratings.push(problem.rating);
                      acc[keyword].departments.add(problem.department);
                      acc[keyword].problems.add(problem.problem);
                      
                      return acc;
                    }, {});

                    const topKeywords = Object.entries(keywordAnalysis)
                      .map(([keyword, data]: [string, any]) => ({
                        keyword: keyword.length > 25 ? keyword.substring(0, 25) + '...' : keyword,
                        fullKeyword: keyword,
                        count: data.count,
                        avgRating: (data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length).toFixed(1),
                        departments: data.departments.size,
                        problems: data.problems.size,
                        criticalPercentage: ((data.ratings.filter((r: number) => r <= 2).length / data.ratings.length) * 100).toFixed(1)
                      }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 15);

                    const chartData = {
                      labels: topKeywords.map(k => k.keyword),
                      datasets: [{
                        label: 'Ocorrências',
                        data: topKeywords.map(k => k.count),
                        backgroundColor: topKeywords.map(k => {
                          const rating = parseFloat(k.avgRating);
                          return rating <= 2 ? 'rgba(239, 68, 68, 0.8)' :
                                 rating <= 3 ? 'rgba(245, 158, 11, 0.8)' :
                                 'rgba(34, 197, 94, 0.8)';
                        }),
                        borderColor: topKeywords.map(k => {
                          const rating = parseFloat(k.avgRating);
                          return rating <= 2 ? 'rgb(239, 68, 68)' :
                                 rating <= 3 ? 'rgb(245, 158, 11)' :
                                 'rgb(34, 197, 94)';
                        }),
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                      }]
                    };

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const keyword = topKeywords[context[0].dataIndex];
                              return keyword.fullKeyword;
                            },
                            label: (context: any) => {
                              const keyword = topKeywords[context.dataIndex];
                              const totalKeywords = topKeywords.reduce((sum, k) => sum + k.count, 0);
                              const percentage = ((keyword.count / totalKeywords) * 100).toFixed(1);
                              
                              return [
                                `${keyword.count} ocorrências (${percentage}%)`,
                                `Rating médio: ${keyword.avgRating}⭐`,
                                `${keyword.criticalPercentage}% são críticos`,
                                `${keyword.departments} departamentos afetados`,
                                `${keyword.problems} tipos de problemas diferentes`
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return value + ' casos';
                            }
                          }
                        },
                        x: {
                          ticks: {
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 45
                          }
                        }
                      }
                    };

                    return <Bar data={chartData} options={chartOptions} />;
                  })()}
                </div>
              </Card>
              
              {/* Gráfico NOVO: Todos os Problemas com Problem Details */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🔍 Análise Completa: Problemas + Detalhes Específicos
                </h4>
                <div className="h-[500px]">
                  {(() => {
                    const problemsData = processProblemsData();
                    
                    // Agrupar problemas com seus detalhes específicos
                    const problemDetailsAnalysis = problemsData.reduce((acc: any, problem: any) => {
                      const problemKey = problem.problem;
                      const detailKey = problem.problem_detail || 'Sem detalhes específicos';
                      const combinedKey = `${problemKey} | ${detailKey}`;
                      
                      if (!acc[combinedKey]) {
                        acc[combinedKey] = {
                          problem: problemKey,
                          detail: detailKey,
                          count: 0,
                          ratings: [],
                          departments: new Set(),
                          keywords: new Set(),
                          authors: new Set()
                        };
                      }
                      
                      acc[combinedKey].count++;
                      acc[combinedKey].ratings.push(problem.rating);
                      acc[combinedKey].departments.add(problem.department);
                      acc[combinedKey].keywords.add(problem.keyword);
                      acc[combinedKey].authors.add(problem.author);
                      
                      return acc;
                    }, {});

                    // Pegar os top 20 problemas+detalhes mais frequentes
                    const topProblemDetails = Object.entries(problemDetailsAnalysis)
                      .map(([combinedKey, data]: [string, any]) => {
                        const avgRating = data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length;
                        const criticalCount = data.ratings.filter((r: number) => r <= 2).length;
                        
                        return {
                          combinedKey,
                          problem: data.problem,
                          detail: data.detail.length > 40 ? data.detail.substring(0, 40) + '...' : data.detail,
                          fullDetail: data.detail,
                          count: data.count,
                          avgRating: avgRating.toFixed(1),
                          criticalCount,
                          criticalPercentage: ((criticalCount / data.count) * 100).toFixed(1),
                          departments: Array.from(data.departments),
                          keywords: Array.from(data.keywords),
                          authors: data.authors.size,
                          severity: avgRating <= 2 ? 'Crítico' : avgRating <= 3 ? 'Moderado' : 'Leve'
                        };
                      })
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 20);

                    const chartData = {
                      labels: topProblemDetails.map(p => {
                        const problemShort = p.problem.length > 25 ? p.problem.substring(0, 25) + '...' : p.problem;
                        return `${problemShort}\n${p.detail}`;
                      }),
                      datasets: [{
                        label: 'Ocorrências',
                        data: topProblemDetails.map(p => p.count),
                        backgroundColor: topProblemDetails.map(p => {
                          return p.severity === 'Crítico' ? 'rgba(239, 68, 68, 0.8)' :
                                 p.severity === 'Moderado' ? 'rgba(245, 158, 11, 0.8)' :
                                 'rgba(34, 197, 94, 0.8)';
                        }),
                        borderColor: topProblemDetails.map(p => {
                          return p.severity === 'Crítico' ? 'rgb(239, 68, 68)' :
                                 p.severity === 'Moderado' ? 'rgb(245, 158, 11)' :
                                 'rgb(34, 197, 94)';
                        }),
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                      }]
                    };

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y' as const,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const item = topProblemDetails[context[0].dataIndex];
                              return `${item.problem}`;
                            },
                            label: (context: any) => {
                              const item = topProblemDetails[context.dataIndex];
                              const totalProblems = topProblemDetails.reduce((sum, p) => sum + p.count, 0);
                              const percentage = ((item.count / totalProblems) * 100).toFixed(1);
                              
                              return [
                                `📊 ${item.count} ocorrências (${percentage}%)`,
                                `⭐ Rating médio: ${item.avgRating}/5`,
                                `🚨 ${item.criticalCount} casos críticos (${item.criticalPercentage}%)`,
                                `🏢 Departamentos: ${item.departments.join(', ')}`,
                                `👥 ${item.authors} usuários únicos reportaram`,
                                `🎯 Palavras-chave: ${item.keywords.slice(0, 2).join(', ')}${item.keywords.length > 2 ? '...' : ''}`,
                                `📝 Detalhe específico: ${item.fullDetail}`
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return value + ' casos';
                            }
                          }
                        },
                        y: {
                          ticks: {
                            font: { size: 9 },
                            maxRotation: 0
                          }
                        }
                      }
                    };

                    return <Bar data={chartData} options={chartOptions} />;
                  })()}
                </div>
                
                {/* Legenda explicativa */}
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📋 Como interpretar este gráfico:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">🔴</span>
                      <div>
                        <strong>Críticos:</strong> Problemas com rating ≤ 2⭐. Necessitam ação imediata.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-500 font-bold">🟡</span>
                      <div>
                        <strong>Moderados:</strong> Rating = 3⭐. Importante melhorar para evitar escalada.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">🟢</span>
                      <div>
                        <strong>Leves:</strong> Rating ≥ 4⭐. Monitorar para manter qualidade.
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border-l-4 border-blue-400">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Dica:</strong> Passe o mouse sobre as barras para ver detalhes completos incluindo departamentos afetados, 
                      número de usuários que reportaram, palavras-chave relacionadas e o texto completo do problema específico.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quarta linha - Matriz de correlação */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Gráfico 6: Matriz Departamento vs Rating */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🔥 Matriz: Departamento vs Severidade
                </h4>
                <div className="h-80">
                  {(() => {
                    const problemsData = processProblemsData();
                    
                    // Pegar top 6 departamentos
                    const deptCounts = problemsData.reduce((acc: any, p) => {
                      acc[p.department] = (acc[p.department] || 0) + 1;
                      return acc;
                    }, {});
                    
                    const topDepts = Object.entries(deptCounts)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 6)
                      .map(([dept]) => dept);

                    const severityData = topDepts.map(dept => {
                      const deptProblems = problemsData.filter(p => p.department === dept);
                      return {
                        department: dept.length > 15 ? dept.substring(0, 15) + '...' : dept,
                        fullDept: dept,
                        critical: deptProblems.filter(p => p.rating <= 2).length,
                        moderate: deptProblems.filter(p => p.rating === 3).length,
                        mild: deptProblems.filter(p => p.rating >= 4).length,
                        total: deptProblems.length
                      };
                    });

                    const chartData = {
                      labels: severityData.map(d => d.department),
                      datasets: [
                        {
                          label: 'Críticos (1-2⭐)',
                          data: severityData.map(d => d.critical),
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          borderColor: 'rgb(239, 68, 68)',
                          borderWidth: 2
                        },
                        {
                          label: 'Moderados (3⭐)',
                          data: severityData.map(d => d.moderate),
                          backgroundColor: 'rgba(245, 158, 11, 0.8)',
                          borderColor: 'rgb(245, 158, 11)',
                          borderWidth: 2
                        },
                        {
                          label: 'Leves (4-5⭐)',
                          data: severityData.map(d => d.mild),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgb(34, 197, 94)',
                          borderWidth: 2
                        }
                      ]
                    };

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          stacked: true,
                          ticks: {
                            font: { size: 10 },
                            maxRotation: 45
                          }
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: {
                            boxWidth: 12,
                            padding: 15
                          }
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const dept = severityData[context[0].dataIndex];
                              return dept.fullDept;
                            },
                            label: (context: any) => {
                              const dept = severityData[context.dataIndex];
                              const value = context.parsed.y;
                              const percentage = ((value / dept.total) * 100).toFixed(1);
                              
                              return `${context.dataset.label}: ${value} (${percentage}%)`;
                            },
                            footer: (context: any) => {
                              const dept = severityData[context[0].dataIndex];
                              return `Total: ${dept.total} problemas`;
                            }
                          }
                        }
                      }
                    };

                    return <Bar data={chartData} options={chartOptions} />;
                  })()}
                </div>
              </Card>

              {/* Gráfico 7: Eficiência por Departamento - Radar */}
              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  📊 Performance Radar - Top 6 Departamentos
                </h4>
                <div className="h-80">
                  {(() => {
                    const problemsData = processProblemsData();
                    
                    // Análise por departamento
                    const deptAnalysis = problemsData.reduce((acc: any, problem: any) => {
                      const dept = problem.department;
                      if (!acc[dept]) {
                        acc[dept] = { 
                          total: 0, 
                          ratings: [], 
                          keywords: new Set(),
                          problems: new Set()
                        };
                      }
                      
                      acc[dept].total++;
                      acc[dept].ratings.push(problem.rating);
                      acc[dept].keywords.add(problem.keyword);
                      acc[dept].problems.add(problem.problem);
                      
                      return acc;
                    }, {});

                    // Top 6 departamentos por volume
                    const topDepts = Object.entries(deptAnalysis)
                      .sort(([,a], [,b]) => (b as any).total - (a as any).total)
                      .slice(0, 6);

                    const radarData = {
                      labels: topDepts.map(([dept]) => 
                        dept.length > 12 ? dept.substring(0, 12) + '...' : dept
                      ),
                      datasets: [
                        {
                          label: 'Rating Médio (0-5)',
                          data: topDepts.map(([, data]) => {
                            const ratings = (data as any).ratings;
                            return (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1);
                          }),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          borderWidth: 3,
                          pointBackgroundColor: 'rgb(59, 130, 246)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2
                        },
                        {
                          label: 'Volume Relativo (normalizado)',
                          data: topDepts.map(([, data]) => {
                            const maxTotal = Math.max(...topDepts.map(([, d]) => (d as any).total));
                            return ((data as any).total / maxTotal * 5).toFixed(1); // Normalizar para escala 0-5
                          }),
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          borderWidth: 3,
                          pointBackgroundColor: 'rgb(239, 68, 68)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2
                        }
                      ]
                    };

                    const radarOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                          labels: {
                            boxWidth: 12,
                            padding: 15
                          }
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const [deptName] = topDepts[context[0].dataIndex];
                              return deptName;
                            },
                            label: (context: any) => {
                              const [deptName, deptData] = topDepts[context.dataIndex];
                              const data = deptData as any;
                              
                              if (context.datasetIndex === 0) {
                                return [
                                  `Rating médio: ${context.parsed.r}⭐`,
                                  `${data.ratings.filter((r: number) => r <= 2).length} críticos de ${data.total}`,
                                  `${data.keywords.size} palavras-chave diferentes`
                                ];
                              } else {
                                return [
                                  `${data.total} problemas totais`,
                                  `${data.problems.size} tipos diferentes`,
                                  `Volume relativo: ${context.parsed.r}/5`
                                ];
                              }
                            }
                          }
                        }
                      },
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 5,
                          ticks: {
                            font: { size: 10 }
                          }
                        }
                      }
                    };

                    // Usar o gráfico Polar Area como alternativa ao Radar
                    const polarData = {
                      labels: topDepts.map(([dept]) => 
                        dept.length > 15 ? dept.substring(0, 15) + '...' : dept
                      ),
                      datasets: [{
                        data: topDepts.map(([, data]) => (data as any).total),
                        backgroundColor: [
                          'rgba(239, 68, 68, 0.8)',
                          'rgba(245, 158, 11, 0.8)', 
                          'rgba(34, 197, 94, 0.8)',
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(139, 92, 246, 0.8)',
                          'rgba(236, 72, 153, 0.8)'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                      }]
                    };

                    return <Doughnut data={polarData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                          labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
                        },
                        tooltip: {
                          callbacks: {
                            title: (context: any) => {
                              const [deptName] = topDepts[context[0].dataIndex];
                              return deptName;
                            },
                            label: (context: any) => {
                              const [, deptData] = topDepts[context.dataIndex];
                              const data = deptData as any;
                              const avgRating = (data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length).toFixed(1);
                              const criticalPercentage = ((data.ratings.filter((r: number) => r <= 2).length / data.ratings.length) * 100).toFixed(1);
                              
                              return [
                                `${data.total} problemas`,
                                `Rating médio: ${avgRating}⭐`,
                                `${criticalPercentage}% são críticos`,
                                `${data.keywords.size} palavras-chave`,
                                `${data.problems.size} tipos de problemas`
                              ];
                            }
                          }
                        }
                      }
                    }} />;
                  })()}
                </div>
              </Card>
            </div>

            {/* Resumo estatístico final */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
              <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                📈 Resumo Estatístico dos Gráficos
              </h4>
              {(() => {
                const problemsData = processProblemsData();
                const totalProblems = problemsData.length;
                const avgRating = (problemsData.reduce((sum, p) => sum + p.rating, 0) / totalProblems).toFixed(1);
                const criticalProblems = problemsData.filter(p => p.rating <= 2).length;
                const uniqueDepts = new Set(problemsData.map(p => p.department)).size;
                const uniqueKeywords = new Set(problemsData.map(p => p.keyword)).size;
                const uniqueProblems = new Set(problemsData.map(p => p.problem)).size;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{totalProblems}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Problemas Analisados</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{avgRating}⭐</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Rating Médio Geral</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{criticalProblems}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Problemas Críticos</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{uniqueDepts}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Departamentos</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{uniqueKeywords}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Palavras-chave</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">{uniqueProblems}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Tipos de Problemas</div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>
        </div>
      )}

      {/* OPÇÃO 6: GRÁFICO INTERATIVO - UM GRÁFICO POR DEPARTAMENTO */}
      {selectedVisualization === 'option6' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
            <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
              ⚡ Gráfico Interativo - Por Departamento
            </h3>
            <p className="text-sm text-purple-600 dark:text-purple-300 mb-6">
              Visualização individual de cada departamento com problemas e palavras-chave. Passe o mouse sobre os gráficos para detalhes e clique para análise completa.
            </p>
            
            {(() => {
              // Processar dados por departamento
              const problemsData = processProblemsData();
              
              // Agrupar dados por departamento
              const departmentData = problemsData.reduce((acc: any, problem: any) => {
                const dept = problem.department;
                if (!acc[dept]) {
                  acc[dept] = {
                    problems: {},
                    keywords: {},
                    ratings: [],
                    totalFeedbacks: 0,
                    examples: []
                  };
                }
                
                // Problemas
                if (!acc[dept].problems[problem.problem]) {
                  acc[dept].problems[problem.problem] = 0;
                }
                acc[dept].problems[problem.problem]++;
                
                // Palavras-chave
                if (!acc[dept].keywords[problem.keyword]) {
                  acc[dept].keywords[problem.keyword] = 0;
                }
                acc[dept].keywords[problem.keyword]++;
                
                acc[dept].ratings.push(problem.rating);
                acc[dept].totalFeedbacks++;
                acc[dept].examples.push(problem);
                
                return acc;
              }, {});

              // Criar cards para cada departamento
              return Object.entries(departmentData).map(([department, data]: [string, any]) => {
                const avgRating = (data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length).toFixed(1);
                const criticalCount = data.ratings.filter((r: number) => r <= 2).length;
                const criticalPercentage = ((criticalCount / data.totalFeedbacks) * 100).toFixed(1);
                
                // Top 8 problemas do departamento
                const topProblems = Object.entries(data.problems)
                  .map(([problem, count]: [string, any]) => ({
                    problem: problem.length > 30 ? problem.substring(0, 30) + '...' : problem,
                    fullProblem: problem,
                    count
                  }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 8);

                // Top 6 palavras-chave do departamento
                const topKeywords = Object.entries(data.keywords)
                  .map(([keyword, count]: [string, any]) => ({
                    keyword: keyword.length > 25 ? keyword.substring(0, 25) + '...' : keyword,
                    fullKeyword: keyword,
                    count
                  }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 6);

                return (
                  <div key={department} className="mb-8">
                    <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg border-l-4 border-purple-500">
                      {/* Header do Departamento */}
                      <div className="mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              🏢 {department}
                            </h4>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                              <span>📊 {data.totalFeedbacks} feedbacks</span>
                              <span>⭐ Rating médio: {avgRating}</span>
                              <span className="text-red-500">🚨 {criticalCount} críticos ({criticalPercentage}%)</span>
                            </div>
                          </div>
                          
                          {/* Botões para ver detalhes */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            {/* Botão para ver detalhes gerais do departamento */}
                            <Button
                              onClick={() => {
                                const departmentDetails = {
                                  name: department,
                                  totalFeedbacks: data.totalFeedbacks,
                                  averageRating: parseFloat(avgRating),
                                  criticalCount,
                                  allExamples: data.examples,
                                  problemDistribution: Object.entries(data.problems).map(([problem, count]) => ({ problem, count })),
                                  keywordDistribution: Object.entries(data.keywords).map(([keyword, count]) => ({ keyword, count }))
                                };
                                setSelectedDetailItem(departmentDetails);
                                setModalFilteredData([]); // Resetar dados filtrados
                                setDetailModalType('department');
                                setDetailModalOpen(true);
                              }}
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Detalhes
                            </Button>

                            {/* Botão para ver cartões detalhados (tabela filtrada) */}
                            <Button
                              onClick={() => {
                                // Filtrar os problemas detalhados apenas para este departamento
                                const departmentDetailedProblems = Object.values(detailedProblems).filter((problem: any) => {
                                  // Verificar se o problema pertence a este departamento
                                  return problem.departments.has(department) || problem.department === department;
                                });

                                if (departmentDetailedProblems.length > 0) {
                                  // Criar um item especial para mostrar os cartões detalhados
                                  setSelectedDetailItem({
                                    isDepartmentCards: true, // Flag especial para identificar este tipo
                                    department: department,
                                    departmentName: department,
                                    problems: departmentDetailedProblems,
                                    totalProblems: departmentDetailedProblems.length,
                                    totalFeedbacks: departmentDetailedProblems.reduce((sum: number, p: any) => sum + p.count, 0),
                                    averageRating: parseFloat(avgRating),
                                    criticalCount,
                                    positiveCount: departmentDetailedProblems.reduce((sum: number, p: any) => 
                                      sum + p.examples.filter((ex: any) => ex.rating >= 4).length, 0
                                    )
                                  });
                                  
                                  setModalFilteredData([]); // Não precisa de dados filtrados especiais
                                  setDetailModalType('problem');
                                  setDetailModalOpen(true);
                                } else {
                                  alert(`Nenhum problema detalhado encontrado para o departamento ${department}`);
                                }
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                            >
                              <Grid3X3 className="w-4 h-4" />
                              Ver Cartões Detalhados
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Gráficos lado a lado */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        
                        {/* Gráfico de Problemas */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            🎯 Top Problemas - {department}
                          </h5>
                          <div className="h-64">
                            {(() => {
                              const problemChartData = {
                                labels: topProblems.map(p => p.problem),
                                datasets: [{
                                  label: 'Ocorrências',
                                  data: topProblems.map(p => p.count),
                                  backgroundColor: topProblems.map((_, index) => {
                                    const colors = [
                                      'rgba(239, 68, 68, 0.8)',   // Vermelho
                                      'rgba(245, 158, 11, 0.8)',  // Laranja
                                      'rgba(234, 179, 8, 0.8)',   // Amarelo
                                      'rgba(34, 197, 94, 0.8)',   // Verde
                                      'rgba(59, 130, 246, 0.8)',  // Azul
                                      'rgba(147, 51, 234, 0.8)',  // Roxo
                                      'rgba(236, 72, 153, 0.8)',  // Rosa
                                      'rgba(99, 102, 241, 0.8)'   // Indigo
                                    ];
                                    return colors[index % colors.length];
                                  }),
                                  borderColor: topProblems.map((_, index) => {
                                    const colors = [
                                      'rgb(239, 68, 68)',   // Vermelho
                                      'rgb(245, 158, 11)',  // Laranja
                                      'rgb(234, 179, 8)',   // Amarelo
                                      'rgb(34, 197, 94)',   // Verde
                                      'rgb(59, 130, 246)',  // Azul
                                      'rgb(147, 51, 234)',  // Roxo
                                      'rgb(236, 72, 153)',  // Rosa
                                      'rgb(99, 102, 241)'   // Indigo
                                    ];
                                    return colors[index % colors.length];
                                  }),
                                  borderWidth: 2,
                                  borderRadius: 6
                                }]
                              };

                              const problemChartOptions = {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      title: (context: any) => {
                                        const problemItem = topProblems[context[0].dataIndex];
                                        return problemItem.fullProblem;
                                      },
                                      label: (context: any) => {
                                        const problemItem = topProblems[context.dataIndex];
                                        const percentage = ((problemItem.count / data.totalFeedbacks) * 100).toFixed(1);
                                        
                                        // Buscar problem details nos dados detalhados
                                        const detailData = Object.values(detailedProblems).find((detailedProblem: any) => 
                                          detailedProblem.problem === problemItem.fullProblem && detailedProblem.problem_detail
                                        ) as any;
                                        const problemDetail = detailData?.problem_detail ? String(detailData.problem_detail) : null;
                                        const tooltipLines = [
                                          `📊 ${problemItem.count} ocorrências (${percentage}%)`,
                                          `🏢 Departamento: ${department}`,
                                          `📈 Total de feedbacks: ${data.totalFeedbacks}`,
                                          `⭐ Rating médio do dept: ${avgRating}/5`
                                        ];

                                        // Agregar múltiplos detalhes específicos para o problema dentro do departamento
                                        const detailsAgg = aggregateProblemDetailsFromFeedbacks(filteredData, problemItem.fullProblem, department);
                                        if (detailsAgg.length > 0) {
                                          tooltipLines.push('');
                                          tooltipLines.push('Detalhes mais citados:');
                                          detailsAgg.forEach(d => {
                                            tooltipLines.push(`• ${d.detail} • ${d.count} (${d.pct.toFixed(0)}%)`);
                                          });
                                        } else if (problemDetail && problemDetail.length > 0) {
                                          const shortDetail = problemDetail.length > 100 ? problemDetail.substring(0, 100) + '...' : problemDetail;
                                          tooltipLines.push(`📝 Detalhe: ${shortDetail}`);
                                        }

                                        return tooltipLines;
                                      }
                                    },
                                    maxWidth: 300,
                                    bodyFont: { size: 11 },
                                    titleFont: { size: 12, weight: 'bold' as const },
                                    padding: 12
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    ticks: { stepSize: 1 }
                                  },
                                  x: {
                                    ticks: {
                                      font: { size: 9 },
                                      maxRotation: 45,
                                      minRotation: 45
                                    }
                                  }
                                }
                              };

                              // Validar se há dados para renderizar
                              if (topProblems.length === 0) {
                                return (
                                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                    <div className="text-center">
                                      <div className="text-2xl mb-2">📊</div>
                                      <div>Nenhum problema encontrado</div>
                                    </div>
                                  </div>
                                );
                              }

                              return <Bar data={problemChartData} options={problemChartOptions} />;
                            })()}
                          </div>
                        </div>

                        {/* Gráfico de Palavras-chave */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            🎯 Top Palavras-chave - {department}
                          </h5>
                          <div className="h-64">
                            {(() => {
                              const keywordChartData = {
                                labels: topKeywords.map(k => k.keyword),
                                datasets: [{
                                  label: 'Menções',
                                  data: topKeywords.map(k => k.count),
                                  backgroundColor: [
                                    'rgba(99, 102, 241, 0.8)',   // Indigo
                                    'rgba(236, 72, 153, 0.8)',   // Rosa
                                    'rgba(34, 197, 94, 0.8)',    // Verde
                                    'rgba(245, 158, 11, 0.8)',   // Laranja
                                    'rgba(147, 51, 234, 0.8)',   // Roxo
                                    'rgba(59, 130, 246, 0.8)'    // Azul
                                  ],
                                  borderColor: [
                                    'rgb(99, 102, 241)',
                                    'rgb(236, 72, 153)',
                                    'rgb(34, 197, 94)',
                                    'rgb(245, 158, 11)',
                                    'rgb(147, 51, 234)',
                                    'rgb(59, 130, 246)'
                                  ],
                                  borderWidth: 2
                                }]
                              };

                              const keywordChartOptions = {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { 
                                    display: true,
                                    position: 'bottom' as const,
                                    labels: { font: { size: 10 } }
                                  },
                                  tooltip: {
                                    callbacks: {
                                      title: (context: any) => {
                                        const keywordItem = topKeywords[context[0].dataIndex];
                                        return keywordItem.fullKeyword;
                                      },
                                      label: (context: any) => {
                                        const keywordItem = topKeywords[context.dataIndex];
                                        const percentage = ((keywordItem.count / data.totalFeedbacks) * 100).toFixed(1);
                                        
                                        // Buscar exemplos de problemas relacionados a essa palavra-chave
                                        const relatedProblems = Object.entries(data.problems)
                                          .filter(([problem]) => problem.toLowerCase().includes(keywordItem.fullKeyword.toLowerCase()))
                                          .slice(0, 3);

                                        const tooltipLines = [
                                          `📊 ${keywordItem.count} menções (${percentage}%)`,
                                          `🏢 Departamento: ${department}`,
                                          `📈 Total de feedbacks: ${data.totalFeedbacks}`,
                                          `⭐ Rating médio do dept: ${avgRating}/5`
                                        ];

                                        if (relatedProblems.length > 0) {
                                          tooltipLines.push('');
                                          tooltipLines.push('🎯 Problemas relacionados:');
                                          relatedProblems.forEach(([problem, count]) => {
                                            const shortProblem = problem.length > 40 ? problem.substring(0, 40) + '...' : problem;
                                            tooltipLines.push(`• ${shortProblem} (${count}x)`);
                                          });
                                        }

                                        return tooltipLines;
                                      }
                                    },
                                    maxWidth: 320,
                                    bodyFont: { size: 11 },
                                    titleFont: { size: 12, weight: 'bold' as const },
                                    padding: 12
                                  }
                                }
                              };

                              // Validar se há dados para renderizar
                              if (topKeywords.length === 0) {
                                return (
                                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                    <div className="text-center">
                                      <div className="text-2xl mb-2">🎯</div>
                                      <div>Nenhuma palavra-chave encontrada</div>
                                    </div>
                                  </div>
                                );
                              }

                              return <Doughnut data={keywordChartData} options={keywordChartOptions} />;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Footer com estatísticas extras */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            <div className="text-lg font-bold text-red-600">{criticalCount}</div>
                            <div className="text-xs text-red-500">Casos Críticos</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">{Object.keys(data.problems).length}</div>
                            <div className="text-xs text-blue-500">Tipos de Problemas</div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <div className="text-lg font-bold text-green-600">{Object.keys(data.keywords).length}</div>
                            <div className="text-xs text-green-500">Palavras-chave</div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">{avgRating}⭐</div>
                            <div className="text-xs text-purple-500">Rating Médio</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
      
      {/* MODAL DE DETALHES AVANÇADOS */}
      {detailModalOpen && selectedDetailItem && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-2 md:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl my-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal - fixo */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 flex items-center justify-between rounded-t-lg z-10">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {detailModalType === 'problem' && <span>🎯 Análise Detalhada do Problema</span>}
                {detailModalType === 'department' && <span>🏢 Análise Detalhada Departamental</span>}
                {detailModalType === 'executive' && <span>📊 Análise Executiva Detalhada</span>}
                {detailModalType === 'conversational' && <span>💬 Análise Conversacional Detalhada</span>}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Conteúdo do Modal - scrollável */}
            <div className="p-4 md:p-6 max-h-[80vh] md:max-h-[75vh] overflow-y-auto">
              <AdvancedDetailView 
                item={selectedDetailItem}
                type={detailModalType}
                filteredData={modalFilteredData.length > 0 ? modalFilteredData : filteredData}
                executiveSummary={getExecutiveSummary()}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}