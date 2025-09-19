"use client";

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Lightbulb
} from "lucide-react";
import { Feedback } from "@/types";
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Distribuição de Ratings */}
        <Card className="p-3 md:p-6">
          <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            📊 Distribuição de Avaliações
          </h4>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              let count = 0;
              if (type === 'problem') {
                count = item.ratings.filter((r: number) => r === rating).length;
              } else if (type === 'department') {
                count = (item.allExamples || []).filter((ex: any) => ex.rating === rating).length;
              }
              
              const total = type === 'problem' ? item.ratings.length : (item.allExamples || []).length;
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

        {/* Distribuição por Rating */}
        <Card className="p-3 md:p-6">
          <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
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
                        return [
                          `${rating.count} avaliações (${rating.percentage}%)`,
                          `Média geral: ${avgRating}⭐`,
                          `Total de avaliações: ${totalRatings}`
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
                let departmentData: { [key: string]: { problems: number, comments: number, avgRating: number } } = {};
                
                if (type === 'problem') {
                  // Para problemas específicos, contar ocorrências por departamento
                  Array.from(item.departments).forEach((dept: any) => {
                    if (!departmentData[dept]) {
                      departmentData[dept] = { problems: 0, comments: 0, avgRating: 0 };
                    }
                    departmentData[dept].problems += 1;
                  });
                  
                  // Contar comentários por departamento
                  (item.examples || []).forEach((example: any) => {
                    const dept = example.department || 'Não identificado';
                    if (!departmentData[dept]) {
                      departmentData[dept] = { problems: 0, comments: 0, avgRating: 0 };
                    }
                    departmentData[dept].comments += 1;
                    departmentData[dept].avgRating = (departmentData[dept].avgRating + (example.rating || 0)) / 2;
                  });
                } else if (type === 'department') {
                  departmentData[item.name] = { 
                    problems: item.totalProblems || 0, 
                    comments: (item.allExamples || []).length,
                    avgRating: item.totalRating ? (item.totalRating / item.totalProblems) : 0
                  };
                }

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
                Array.from(item.keywords).forEach((keyword: any) => {
                  if (!keywordData[keyword]) {
                    keywordData[keyword] = { count: 0, ratings: [] };
                  }
                  keywordData[keyword].count += 1;
                });
                // Adicionar ratings se disponível
                if (item.ratings) {
                  Array.from(item.keywords).forEach((keyword: any, index: number) => {
                    if (keywordData[keyword] && item.ratings[index]) {
                      keywordData[keyword].ratings.push(item.ratings[index]);
                    }
                  });
                }
              } else if (type === 'department') {
                (item.keywordsArray || []).forEach((keyword: any) => {
                  if (!keywordData[keyword]) {
                    keywordData[keyword] = { count: 0, ratings: [] };
                  }
                  keywordData[keyword].count += 1;
                });
              }

              const topKeywords = Object.entries(keywordData)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 8);

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
  
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<'grid' | 'list' | 'compact' | 'detailed'>('detailed');
  const [sortBy, setSortBy] = useState<'frequency' | 'alphabetical' | 'severity' | 'recent'>('frequency');
  const [filterBy, setFilterBy] = useState<'all' | 'critical' | 'with-suggestions' | 'with-details'>('all');
  const [showAllItems, setShowAllItems] = useState(false);
  
  // Estados para o modal de detalhes avançados
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [detailModalType, setDetailModalType] = useState<'problem' | 'department' | 'executive' | 'conversational'>('problem');

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

  // Função melhorada para processar problemas (incluindo compatibilidade com dados antigos)
  const processProblemsData = () => {
    const allProblemsData: any[] = [];

    filteredData.forEach(feedback => {
      // NOVA ESTRUTURA: allProblems (preferência)
      if (feedback.allProblems && Array.isArray(feedback.allProblems) && feedback.allProblems.length > 0) {
        feedback.allProblems.forEach(problemObj => {
          if (problemObj.problem && problemObj.problem.trim() !== '' && 
              problemObj.problem !== 'VAZIO' && problemObj.problem !== 'Sem problemas' &&
              problemObj.problem !== 'Não identificado') {
            allProblemsData.push({
              ...problemObj,
              feedback: feedback,
              originalComment: feedback.comment,
              author: feedback.author || 'Anônimo',
              date: feedback.date,
              rating: feedback.rating,
              hotel: feedback.hotel || feedback.hotelName,
              suggestion: feedback.suggestion_summary,
              department: problemObj.sector || 'Não identificado',
              keyword: problemObj.keyword || 'Não identificado',
              hasDetail: !!(problemObj.problem_detail && problemObj.problem_detail.trim() !== ''),
              source: 'allProblems' // marcador de origem
            });
          }
        });
      }
      
      // ESTRUTURA ANTIGA: problem único (fallback)
      else if (feedback.problem && feedback.problem.trim() !== '' && 
               feedback.problem !== 'VAZIO' && feedback.problem !== 'Sem problemas') {
        // Lidar com múltiplos problemas separados por ';'
        const problems = feedback.problem.includes(';') 
          ? feedback.problem.split(';').map(p => p.trim()) 
          : [feedback.problem];

        problems.forEach(problem => {
          if (problem && problem.trim() !== '' && problem.trim() !== 'Não identificado') {
            allProblemsData.push({
              problem: problem.trim(),
              problem_detail: feedback.problem_detail || '',
              feedback: feedback,
              originalComment: feedback.comment,
              author: feedback.author || 'Anônimo',
              date: feedback.date,
              rating: feedback.rating,
              hotel: feedback.hotel || feedback.hotelName,
              suggestion: feedback.suggestion_summary,
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
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200">
      <h2 className="text-xl font-bold mb-4 text-center">🎯 Escolha a Visualização de Problemas</h2>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Selecione a opção que melhor atende às suas necessidades de análise
      </p>
      
      <Tabs defaultValue="option1" className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full mb-6">
          <TabsTrigger value="option1">📋 Cartões Detalhados</TabsTrigger>
          <TabsTrigger value="option2">🏢 Por Departamento</TabsTrigger>
          <TabsTrigger value="option3">📊 Resumo Executivo</TabsTrigger>
          <TabsTrigger value="option4">💬 Análise Conversacional</TabsTrigger>
          <TabsTrigger value="option5">📈 Central de Gráficos</TabsTrigger>
        </TabsList>

        {/* OPÇÃO 1: DASHBOARD DE CARTÕES DETALHADOS COM MÚLTIPLAS VISUALIZAÇÕES */}
        <TabsContent value="option1" className="space-y-6">
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
        </TabsContent>

        {/* OPÇÃO 2: ANÁLISE DETALHADA POR DEPARTAMENTO */}
        <TabsContent value="option2" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
              🏢 Análise Detalhada por Departamento
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Análise completa de cada departamento com problemas, palavras-chave, detalhes específicos e insights estratégicos
            </p>

            {/* Resumo geral dos departamentos */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">📊 Visão Geral Departamental</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{Object.keys(departmentAnalysis).length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Departamentos</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {Object.values(departmentAnalysis).reduce((sum: number, dept: any) => sum + dept.totalProblems, 0)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Problemas</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {(() => {
                      const total = Object.values(departmentAnalysis).reduce((sum: number, dept: any) => sum + dept.totalProblems, 0);
                      const totalRating = Object.values(departmentAnalysis).reduce((sum: number, dept: any) => sum + dept.totalRating, 0);
                      return total > 0 ? (totalRating / total).toFixed(1) : '0.0';
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Média Geral</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {(() => {
                      const criticalDepts = Object.values(departmentAnalysis).filter((dept: any) => 
                        (dept.totalRating / dept.totalProblems) <= 2
                      ).length;
                      return criticalDepts;
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Depts. Críticos</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {Object.values(departmentAnalysis)
                .map((dept: any) => ({
                  ...dept,
                  averageRating: dept.totalProblems > 0 ? dept.totalRating / dept.totalProblems : 0,
                  problemDetailsArray: Object.values(dept.problemDetails).sort((a: any, b: any) => b.count - a.count),
                  keywordsArray: Array.from(dept.keywords),
                  suggestionsArray: Array.from(dept.suggestions),
                  authorsCount: dept.authors.size
                }))
                .filter((dept: any) => dept.name !== 'Não identificado') // Filtrar departamento "Não identificado"
                .sort((a: any, b: any) => b.totalProblems - a.totalProblems)
                .map((dept: any, deptIndex: number) => {
                  const severityColor = dept.averageRating <= 2 ? 'red' : dept.averageRating <= 3 ? 'yellow' : 'green';
                  const [isExpanded, setIsExpanded] = useState(deptIndex < 3); // Primeiros 3 expandidos por padrão
                  
                  return (
                    <Card key={deptIndex} className={`border-l-4 transition-all duration-200 ${
                      severityColor === 'red' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' :
                      severityColor === 'yellow' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                      'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                    }`}>
                      
                      {/* Cabeçalho do Departamento */}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                              <Building2 className="w-6 h-6" />
                              {dept.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                {dept.totalProblems} problema{dept.totalProblems !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {dept.authorsCount} cliente{dept.authorsCount !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                {dept.averageRating.toFixed(1)}/5
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="w-4 h-4" />
                                {dept.keywordsArray.length} palavra{dept.keywordsArray.length !== 1 ? 's' : ''}-chave
                              </span>
                              {dept.suggestionsArray.length > 0 && (
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <Lightbulb className="w-4 h-4" />
                                  {dept.suggestionsArray.length} sugestõe{dept.suggestionsArray.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={severityColor === 'red' ? 'destructive' : severityColor === 'yellow' ? 'secondary' : 'default'}>
                              {severityColor === 'red' ? 'Crítico' : severityColor === 'yellow' ? 'Atenção' : 'Estável'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              title="Ver análise detalhada completa"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openDetailModal(dept, 'department');
                              }}
                            >
                              <Eye className="w-4 h-4 text-violet-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => setIsExpanded(!isExpanded)}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Métricas Rápidas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border">
                            <div className="text-lg font-bold text-red-600">
                              {dept.problemDetailsArray.filter((p: any) => (p.totalRating / p.count) <= 2).length}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Problemas Críticos</div>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border">
                            <div className="text-lg font-bold text-blue-600">{dept.worstRating}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Pior Rating</div>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border">
                            <div className="text-lg font-bold text-green-600">{dept.bestRating}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Melhor Rating</div>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg border">
                            <div className="text-lg font-bold text-purple-600">
                              {((dept.totalProblems / executiveSummary.totalProblems) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">% do Total</div>
                          </div>
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                        <div className="px-6 pb-6 space-y-6">
                          
                          {/* Palavras-chave do Departamento */}
                          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 text-sm flex items-center gap-1">
                              🎯 Palavras-Chave Principais ({dept.keywordsArray.length})
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {dept.keywordsArray.slice(0, 10).map((keyword: any, keyIndex: number) => (
                                <span key={keyIndex} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                                  {keyword}
                                </span>
                              ))}
                              {dept.keywordsArray.length > 10 && (
                                <span className="text-xs text-purple-600 dark:text-purple-400 py-1">
                                  +{dept.keywordsArray.length - 10} mais
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Problemas e Detalhes Específicos */}
                          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-700">
                            <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-4 text-sm flex items-center gap-1">
                              🔍 Problemas e Detalhes Específicos ({dept.problemDetailsArray.length})
                            </h5>
                            
                            <div className="space-y-4">
                              {dept.problemDetailsArray.slice(0, 6).map((detail: any, detailIndex: number) => {
                                const avgRating = detail.totalRating / detail.count;
                                const problemSeverity = avgRating <= 2 ? 'critical' : avgRating <= 3 ? 'warning' : 'normal';
                                const specificDetailsArray: string[] = Array.from(detail.specificDetails || new Set());
                                const hasMultipleDetails = specificDetailsArray.length > 1;
                                
                                return (
                                  <div key={detailIndex} className={`p-4 rounded-lg border-l-4 ${
                                    problemSeverity === 'critical' ? 'bg-red-50 dark:bg-red-950/20 border-l-red-400' :
                                    problemSeverity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-l-yellow-400' :
                                    'bg-green-50 dark:bg-green-950/20 border-l-green-400'
                                  } border border-gray-200 dark:border-gray-700`}>
                                    
                                    {/* Problema Principal */}
                                    <div className="mb-3">
                                      <div className="flex justify-between items-start mb-2">
                                        <h6 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight flex items-center gap-2">
                                          <span className="text-lg">⚠️</span>
                                          {detail.problem}
                                        </h6>
                                        <div className="flex items-center gap-2">
                                          <Badge variant={problemSeverity === 'critical' ? 'destructive' : problemSeverity === 'warning' ? 'secondary' : 'default'} className="text-xs">
                                            {detail.count} ocorrências
                                          </Badge>
                                          <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                                            problemSeverity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                            problemSeverity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                          }`}>
                                            <Star className="w-3 h-3" />
                                            <span className="font-medium text-xs">{avgRating.toFixed(1)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Target className="w-3 h-3" />
                                        <span>{detail.keyword}</span>
                                        {hasMultipleDetails && (
                                          <>
                                            <span>•</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                              {specificDetailsArray.length} variações específicas
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Detalhes Específicos */}
                                    {specificDetailsArray.length > 0 && (
                                      <div className="border-t pt-3 border-gray-200 dark:border-gray-600">
                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                          📝 Detalhes Específicos Relatados:
                                        </div>
                                        <div className="space-y-2">
                                          {specificDetailsArray.slice(0, 3).map((specificDetail: string, sdIndex: number) => (
                                            <div key={sdIndex} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded border-l-2 border-amber-300 dark:border-amber-600">
                                              <span className="text-amber-600 dark:text-amber-400 mt-1 text-xs">▸</span>
                                              <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {specificDetail}
                                              </span>
                                            </div>
                                          ))}
                                          
                                          {specificDetailsArray.length > 3 && (
                                            <div className="text-center">
                                              <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                                                +{specificDetailsArray.length - 3} detalhes específicos adicionais
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Exemplos de Feedback */}
                                    {detail.examples && detail.examples.length > 0 && (
                                      <div className="border-t pt-3 mt-3 border-gray-200 dark:border-gray-600">
                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                          💬 Exemplos de Feedback:
                                        </div>
                                        <div className="space-y-1">
                                          {detail.examples.slice(0, 2).map((example: any, exIndex: number) => (
                                            <div key={exIndex} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded italic">
                                              "{example.comment.substring(0, 80)}..."
                                              <span className="ml-2 text-gray-500">
                                                ({example.rating}⭐)
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {dept.problemDetailsArray.length > 6 && (
                              <div className="mt-4 text-center">
                                <span className="text-sm text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                                  E mais {dept.problemDetailsArray.length - 6} problemas específicos com detalhes...
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Sugestões de Clientes */}
                          {dept.suggestionsArray.length > 0 && (
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-700">
                              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-3 text-sm flex items-center gap-1">
                                💡 Sugestões dos Clientes ({dept.suggestionsArray.length})
                              </h5>
                              <div className="space-y-2">
                                {dept.suggestionsArray.slice(0, 4).map((suggestion: any, suggIndex: number) => (
                                  <div key={suggIndex} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded border">
                                    <span className="text-green-600 dark:text-green-400 mt-1 text-sm">•</span>
                                    <span className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                      {suggestion}
                                    </span>
                                  </div>
                                ))}
                                {dept.suggestionsArray.length > 4 && (
                                  <div className="text-center">
                                    <span className="text-xs text-green-600 dark:text-green-400 italic">
                                      +{dept.suggestionsArray.length - 4} sugestões adicionais
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Insights Estratégicos */}
                          <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 text-sm flex items-center gap-1">
                              🎯 Insights Estratégicos
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">📊</span>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    <strong>Volume:</strong> {dept.totalProblems} problemas ({((dept.totalProblems / executiveSummary.totalProblems) * 100).toFixed(1)}% do total)
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-orange-600 dark:text-orange-400 mt-0.5">⚠️</span>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    <strong>Criticidade:</strong> {dept.problemDetailsArray.filter((p: any) => (p.totalRating / p.count) <= 2).length} problemas críticos
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">🎯</span>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    <strong>Diversidade:</strong> {dept.keywordsArray.length} áreas específicas identificadas
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 dark:text-green-400 mt-0.5">💡</span>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    <strong>Oportunidades:</strong> {dept.suggestionsArray.length} sugestões dos clientes
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>
            
            {Object.values(departmentAnalysis).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum dado departamental encontrado nos dados filtrados.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* OPÇÃO 3: RESUMO EXECUTIVO DETALHADO COM INSIGHTS MASTIGADOS */}
        <TabsContent value="option3" className="space-y-4">
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-6 rounded-lg border-2 border-violet-200 dark:border-violet-800">
            <h3 className="text-2xl font-bold text-violet-800 dark:text-violet-200 mb-2 flex items-center gap-2">
              📊 Resumo Executivo Estratégico
            </h3>
            <p className="text-sm text-violet-600 dark:text-violet-300 mb-6">
              Análise completa com insights acionáveis e recomendações estratégicas mastigadas
            </p>
            
            {/* Alertas de Saúde Geral do Sistema */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Status Crítico */}
              <Card className={`p-4 ${
                executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.3)
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'
                  : executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.15)
                  ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700'
                  : 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.3)
                      ? 'bg-red-100 dark:bg-red-900/50'
                      : executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.15)
                      ? 'bg-yellow-100 dark:bg-yellow-900/50'
                      : 'bg-green-100 dark:bg-green-900/50'
                  }`}>
                    {executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.3) ? '🚨' :
                     executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.15) ? '⚠️' : '✅'}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {((executiveSummary.criticalProblems / executiveSummary.totalProblems) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Problemas Críticos</div>
                    <div className={`text-xs font-medium ${
                      executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.3)
                        ? 'text-red-600 dark:text-red-400'
                        : executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.15)
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.3)
                        ? 'AÇÃO URGENTE'
                        : executiveSummary.criticalProblems > (executiveSummary.totalProblems * 0.15)
                        ? 'ATENÇÃO NECESSÁRIA'
                        : 'SOB CONTROLE'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Status de Satisfação */}
              <Card className={`p-4 ${
                executiveSummary.averageRating >= 4
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700'
                  : executiveSummary.averageRating >= 3
                  ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    executiveSummary.averageRating >= 4
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : executiveSummary.averageRating >= 3
                      ? 'bg-yellow-100 dark:bg-yellow-900/50'
                      : 'bg-red-100 dark:bg-red-900/50'
                  }`}>
                    {executiveSummary.averageRating >= 4 ? '😊' :
                     executiveSummary.averageRating >= 3 ? '😐' : '😞'}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {executiveSummary.averageRating.toFixed(1)}★
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Satisfação Média</div>
                    <div className={`text-xs font-medium ${
                      executiveSummary.averageRating >= 4
                        ? 'text-green-600 dark:text-green-400'
                        : executiveSummary.averageRating >= 3
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {executiveSummary.averageRating >= 4
                        ? 'EXCELENTE'
                        : executiveSummary.averageRating >= 3
                        ? 'SATISFATÓRIO'
                        : 'INSATISFATÓRIO'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Status de Engajamento */}
              <Card className={`p-4 ${
                executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.4)
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                  : executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.2)
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                  : 'bg-gray-50 dark:bg-gray-950/30 border-gray-300 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.4)
                      ? 'bg-blue-100 dark:bg-blue-900/50'
                      : executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.2)
                      ? 'bg-indigo-100 dark:bg-indigo-900/50'
                      : 'bg-gray-100 dark:bg-gray-900/50'
                  }`}>
                    {executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.4) ? '💡' :
                     executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.2) ? '🔍' : '📝'}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {((executiveSummary.withSuggestions / executiveSummary.totalProblems) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Engajamento</div>
                    <div className={`text-xs font-medium ${
                      executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.4)
                        ? 'text-blue-600 dark:text-blue-400'
                        : executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.2)
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.4)
                        ? 'ALTO NÍVEL'
                        : executiveSummary.withSuggestions > (executiveSummary.totalProblems * 0.2)
                        ? 'NÍVEL MÉDIO'
                        : 'BAIXO NÍVEL'}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Painel de KPIs Detalhados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <Card className="p-4 text-center bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-700">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{executiveSummary.criticalProblems}</div>
                <div className="text-sm font-medium text-red-600 dark:text-red-400">Críticos</div>
                <div className="text-xs text-red-500 dark:text-red-500">≤ 2★ Rating</div>
              </Card>
              
              <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-700">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{executiveSummary.totalProblems}</div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="text-xs text-blue-500 dark:text-blue-500">Problemas</div>
              </Card>
              
              <Card className="p-4 text-center bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-700">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{executiveSummary.averageRating.toFixed(1)}</div>
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400">Rating Médio</div>
                <div className="text-xs text-amber-500 dark:text-amber-500">Satisfação</div>
              </Card>
              
              <Card className="p-4 text-center bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-700">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{executiveSummary.uniqueAuthors}</div>
                <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Usuários</div>
                <div className="text-xs text-emerald-500 dark:text-emerald-500">Únicos</div>
              </Card>
              
              <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-700">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{executiveSummary.withSuggestions}</div>
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Sugestões</div>
                <div className="text-xs text-purple-500 dark:text-purple-500">Propostas</div>
              </Card>

              <Card className="p-4 text-center bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-teal-200 dark:border-teal-700">
                <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{executiveSummary.withDetails}</div>
                <div className="text-sm font-medium text-teal-600 dark:text-teal-400">Detalhados</div>
                <div className="text-xs text-teal-500 dark:text-teal-500">Com contexto</div>
              </Card>
            </div>

            {/* Análise de Departamentos com Insights Estratégicos */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-200 dark:border-slate-700">
              <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                🏢 Análise Departamental Estratégica
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.values(departmentAnalysis)
                  .map((dept: any) => ({
                    ...dept,
                    averageRating: dept.totalProblems > 0 ? dept.totalRating / dept.totalProblems : 0,
                    problemDetailsArray: Object.values(dept.problemDetails || {}).sort((a: any, b: any) => b.count - a.count),
                    keywordsArray: Array.from(dept.keywords || []),
                    suggestionsArray: Array.from(dept.suggestions || []),
                    authorsCount: dept.authors ? dept.authors.size : 0
                  }))
                  .filter((dept: any) => dept.name !== 'Não identificado')
                  .sort((a: any, b: any) => b.totalProblems - a.totalProblems)
                  .slice(0, 6)
                  .map((dept: any, index: number) => {
                    const criticidade = (dept.problemDetailsArray || []).filter((p: any) => (p.totalRating / p.count) <= 2).length;
                    const avgRating = dept.totalRating / dept.totalProblems;
                    const impacto = (dept.totalProblems / executiveSummary.totalProblems) * 100;
                    const urgencia = criticidade > 0 ? 'Alta' : avgRating < 3 ? 'Média' : 'Baixa';
                    
                    return (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        criticidade > 0
                          ? 'bg-red-50 dark:bg-red-950/20 border-l-red-500'
                          : avgRating < 3
                          ? 'bg-yellow-50 dark:bg-yellow-950/20 border-l-yellow-500'
                          : 'bg-green-50 dark:bg-green-950/20 border-l-green-500'
                      } border border-gray-200 dark:border-gray-700`}>
                        
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-bold text-gray-900 dark:text-white text-lg">
                            🏛️ {dept.name}
                          </h5>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              criticidade > 0 ? 'destructive' : avgRating < 3 ? 'secondary' : 'default'
                            }>
                              {urgencia} Prioridade
                            </Badge>
                            
                            {/* Botão de visualização detalhada */}
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              title="Ver análise departamental detalhada"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openDetailModal(dept, 'department');
                              }}
                            >
                              <Eye className="w-4 h-4 text-violet-600" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {dept.totalProblems}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Problemas ({impacto.toFixed(1)}% do total)
                            </div>
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${
                              criticidade > 0
                                ? 'text-red-600 dark:text-red-400'
                                : avgRating < 3
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {avgRating.toFixed(1)}★
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Rating Médio
                            </div>
                          </div>
                        </div>

                        {/* Insights Mastigados */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-600 dark:text-amber-400 mt-0.5">📊</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              <strong>Impacto:</strong> Responsável por {impacto.toFixed(1)}% dos problemas totais
                              {impacto > 20 ? ' (Alto impacto - priorizar recursos)' : 
                               impacto > 10 ? ' (Impacto moderado)' : ' (Baixo impacto)'}
                            </span>
                          </div>
                          
                          {criticidade > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 dark:text-red-400 mt-0.5">🚨</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                <strong>Criticidade:</strong> {criticidade} problema{criticidade > 1 ? 's' : ''} crítico{criticidade > 1 ? 's' : ''} 
                                {criticidade > 3 ? ' - AÇÃO IMEDIATA necessária' : ' - Requer atenção urgente'}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-0.5">🎯</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              <strong>Diversidade:</strong> {(dept.keywordsArray || []).length} área{(dept.keywordsArray || []).length > 1 ? 's' : ''} específica{(dept.keywordsArray || []).length > 1 ? 's' : ''} identificada{(dept.keywordsArray || []).length > 1 ? 's' : ''}
                              {(dept.keywordsArray || []).length > 5 ? ' (Alta fragmentação - revisar processos)' : 
                               (dept.keywordsArray || []).length > 2 ? ' (Moderada diversidade)' : ' (Foco específico)'}
                            </span>
                          </div>
                          
                          {(dept.suggestionsArray || []).length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 dark:text-green-400 mt-0.5">💡</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                <strong>Oportunidades:</strong> {(dept.suggestionsArray || []).length} sugestões dos clientes
                                {(dept.suggestionsArray || []).length > 5 ? ' (Alto engajamento - capitalizar feedback)' : 
                                 (dept.suggestionsArray || []).length > 2 ? ' (Bom nível de sugestões)' : ' (Poucas sugestões)'}
                              </span>
                            </div>
                          )}

                          {/* Recomendação Estratégica */}
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-700">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-700 dark:text-blue-300 mt-0.5">🎯</span>
                              <div className="text-blue-800 dark:text-blue-200">
                                <strong>Recomendação:</strong> {
                                  criticidade > 0
                                    ? `Prioridade MÁXIMA - Implementar plano de ação imediato para resolver ${criticidade} problema${criticidade > 1 ? 's' : ''} crítico${criticidade > 1 ? 's' : ''}.`
                                    : avgRating < 3
                                    ? `Atenção necessária - Revisar processos e implementar melhorias nos próximos 30 dias.`
                                    : impacto > 15
                                    ? `Monitorar de perto - Alto volume requer acompanhamento constante para manter qualidade.`
                                    : `Manter padrão atual - Departamento em situação estável, foco em melhoria contínua.`
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>

            {/* Top 5 Problemas Críticos com Análise Detalhada */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-700">
              <h4 className="text-xl font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
                🚨 TOP 5 Problemas Críticos - Ação Imediata
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Problemas com rating ≤ 2★ que requerem intervenção urgente
              </p>
              
              <div className="space-y-4">
                {Object.values(detailedProblems)
                  .filter((problem: any) => {
                    const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
                    return avgRating <= 2;
                  })
                  .sort((a: any, b: any) => {
                    const avgA = a.ratings.reduce((sum: number, r: number) => sum + r, 0) / a.ratings.length;
                    const avgB = b.ratings.reduce((sum: number, r: number) => sum + r, 0) / b.ratings.length;
                    if (avgA !== avgB) return avgA - avgB; // Pior rating primeiro
                    return b.count - a.count; // Depois por frequência
                  })
                  .slice(0, 5)
                  .map((problem: any, index: number) => {
                    const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
                    const impacto = (problem.count / executiveSummary.totalProblems) * 100;
                    const urgencia = avgRating <= 1.5 ? 'EXTREMA' : 'ALTA';
                    
                    return (
                      <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-l-red-500 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                index === 0 ? 'bg-red-600' : index === 1 ? 'bg-red-500' : 'bg-red-400'
                              }`}>
                                #{index + 1}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-2">
                                  🎯 {problem.problem}
                                </h5>
                                {problem.problem_detail && problem.problem_detail.trim() !== '' && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                                    📝 {problem.problem_detail}
                                  </p>
                                )}
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <Badge variant="destructive" className="text-xs">
                                    Urgência {urgencia}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {problem.count} ocorrências
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {impacto.toFixed(1)}% do total
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-red-500" />
                                <span className="font-bold text-red-700 dark:text-red-300">
                                  {avgRating.toFixed(1)}
                                </span>
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-400">
                                Rating Crítico
                              </div>
                            </div>
                            
                            {/* Botão de visualização detalhada */}
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
                              <Eye className="w-4 h-4 text-violet-600" />
                            </Button>
                          </div>
                        </div>

                        {/* Informações Contextuais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">� Departamentos:</span>
                            <div className="font-medium text-gray-700 dark:text-gray-300">
                              {Array.from(problem.departments).slice(0, 2).join(', ')}
                              {Array.from(problem.departments).length > 2 && ` +${Array.from(problem.departments).length - 2}`}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">🎯 Palavras-chave:</span>
                            <div className="font-medium text-gray-700 dark:text-gray-300">
                              {Array.from(problem.keywords).slice(0, 2).join(', ')}
                              {Array.from(problem.keywords).length > 2 && ` +${Array.from(problem.keywords).length - 2}`}
                            </div>
                          </div>
                        </div>

                        {/* Recomendação Específica */}
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                          <div className="flex items-start gap-2">
                            <span className="text-red-700 dark:text-red-300 mt-0.5">🎯</span>
                            <div className="text-red-800 dark:text-red-200 text-sm">
                              <strong>Ação Recomendada:</strong> {
                                avgRating <= 1.5
                                  ? `CRÍTICO - Formar task force imediata. Resolver em 24-48h. Comunicar ações à gerência superior.`
                                  : impacto > 10
                                  ? `ALTO IMPACTO - Priorizar recursos nos próximos 7 dias. Monitorar progresso diariamente.`
                                  : problem.count > 5
                                  ? `RECORRENTE - Identificar causa raiz. Implementar processo para prevenir recorrência.`
                                  : `PONTUAL - Resolver individualmente, mas monitorar para evitar escalação.`
                              }
                            </div>
                          </div>
                        </div>

                        {/* Exemplo de Feedback */}
                        {problem.examples && problem.examples.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              💬 Exemplo de Feedback Recente:
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                              "{problem.examples[0].comment.substring(0, 120)}..."
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              — {problem.examples[0].author} ({problem.examples[0].rating}⭐)
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {Object.values(detailedProblems).filter((problem: any) => {
                const avgRating = problem.ratings.reduce((a: number, b: number) => a + b, 0) / problem.ratings.length;
                return avgRating <= 2;
              }).length === 0 && (
                <div className="text-center py-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-green-600 dark:text-green-400 mb-2">🎉</div>
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    Excelente! Nenhum problema crítico detectado.
                  </p>
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    Continue o bom trabalho mantendo a qualidade alta.
                  </p>
                </div>
              )}
            </Card>

            {/* Diagnóstico Técnico dos Dados */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-700">
              <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                🔍 Diagnóstico Técnico dos Dados
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">Qualidade dos Dados</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">Total de Problemas:</span>
                      <Badge variant="outline">{executiveSummary.totalProblems}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">Com Análise IA:</span>
                      <Badge variant={executiveSummary.dataSourcesCount.allProblems > 0 ? 'default' : 'secondary'}>
                        {executiveSummary.dataSourcesCount.allProblems} ({((executiveSummary.dataSourcesCount.allProblems / executiveSummary.totalProblems) * 100).toFixed(1)}%)
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">Formato Legado:</span>
                      <Badge variant={executiveSummary.dataSourcesCount.legacy > 0 ? 'secondary' : 'outline'}>
                        {executiveSummary.dataSourcesCount.legacy} ({((executiveSummary.dataSourcesCount.legacy / executiveSummary.totalProblems) * 100).toFixed(1)}%)
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">Com Detalhes Específicos:</span>
                      <Badge variant={executiveSummary.withDetails > 0 ? 'default' : 'destructive'}>
                        {executiveSummary.withDetails} ({((executiveSummary.withDetails / executiveSummary.totalProblems) * 100).toFixed(1)}%)
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">Alertas e Recomendações</h5>
                  <div className="space-y-3">
                    {/* Alertas sobre dados */}
                    {executiveSummary.dataSourcesCount.allProblems === 0 && (
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              ⚠️ Dados no formato legado
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Para análises mais precisas, reprocesse com IA
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {executiveSummary.withDetails === 0 && (
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              🚨 Falta de detalhes específicos
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300">
                              Dados incompletos podem limitar ações corretivas
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(executiveSummary.dataSourcesCount.allProblems / executiveSummary.totalProblems) >= 0.8 && (
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              ✅ Boa qualidade dos dados
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Maioria dos dados com análise IA detalhada
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Plano de Ação Estratégico */}
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-700">
              <h4 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-4 flex items-center gap-2">
                🎯 Plano de Ação Estratégico - Próximos 30 Dias
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Prioridade 1: Críticos */}
                <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-700">
                  <h5 className="font-bold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                    🚨 Prioridade 1 (0-7 dias)
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                      <span className="text-red-700 dark:text-red-300">
                        Resolver {executiveSummary.criticalProblems} problema{executiveSummary.criticalProblems !== 1 ? 's' : ''} crítico{executiveSummary.criticalProblems !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                      <span className="text-red-700 dark:text-red-300">
                        Formar task forces para departamentos com rating &lt; 2★
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                      <span className="text-red-700 dark:text-red-300">
                        Comunicação diária de progresso à gerência
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prioridade 2: Melhorias */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <h5 className="font-bold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                    ⚠️ Prioridade 2 (7-21 dias)
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                      <span className="text-yellow-700 dark:text-yellow-300">
                        Revisar processos em departamentos com rating 2-3★
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                      <span className="text-yellow-700 dark:text-yellow-300">
                        Implementar {executiveSummary.withSuggestions} sugestões prioritárias dos clientes
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                      <span className="text-yellow-700 dark:text-yellow-300">
                        Treinamento de equipes em áreas problemáticas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prioridade 3: Prevenção */}
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-700">
                  <h5 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                    ✅ Prioridade 3 (21-30 dias)
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      <span className="text-green-700 dark:text-green-300">
                        Implementar sistema de monitoramento preventivo
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      <span className="text-green-700 dark:text-green-300">
                        Otimizar processos em departamentos estáveis
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      <span className="text-green-700 dark:text-green-300">
                        Revisar e documentar melhores práticas
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicadores de Sucesso */}
              <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <h5 className="font-bold text-gray-900 dark:text-white mb-3">📈 Indicadores de Sucesso (KPIs)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">0</div>
                    <div className="text-gray-600 dark:text-gray-400">Problemas críticos (meta)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">&gt;3.5★</div>
                    <div className="text-gray-600 dark:text-gray-400">Rating médio (meta)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">&lt;15%</div>
                    <div className="text-gray-600 dark:text-gray-400">Taxa de problemas recorrentes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">&gt;50%</div>
                    <div className="text-gray-600 dark:text-gray-400">Sugestões implementadas</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* OPÇÃO 4: ANÁLISE CONVERSACIONAL */}
        <TabsContent value="option4" className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-teal-200 dark:border-teal-800">
            <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200 mb-2">
              💬 Análise Conversacional - Contexto Completo
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Problemas apresentados como conversas reais com contexto completo
            </p>
            
            <div className="space-y-6">
              {filteredData
                .filter(f => f.allProblems && f.comment && f.comment.trim() !== '')
                .slice(0, 8)
                .map((feedback, index) => {
                  const problems = (feedback.allProblems || []).filter((p: any) => 
                    p.problem_detail && p.problem_detail.trim() !== ''
                  );
                  
                  if (problems.length === 0) return null;
                  
                  return (
                    <Card key={index} className="p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {feedback.author ? feedback.author.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {feedback.author || 'Usuário Anônimo'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(feedback.date).toLocaleDateString('pt-BR')} • {feedback.hotel}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < (feedback.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          
                          {/* Botão de visualização detalhada */}
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            title="Ver análise conversacional detalhada"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDetailModal(feedback, 'conversational');
                            }}
                          >
                            <Eye className="w-4 h-4 text-violet-600" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          "{feedback.comment}"
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h6 className="font-medium text-gray-900 dark:text-white text-sm">🔍 Problemas Identificados:</h6>
                        {problems.slice(0, 3).map((problem: any, pIndex: number) => (
                          <div key={pIndex} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-gray-900 dark:text-white font-medium">
                                {problem.problem_detail}
                              </div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs">
                                {problem.sector} • {problem.keyword} • {problem.problem}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {feedback.suggestion_summary && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                          <span className="text-blue-700 dark:text-blue-300">
                            💡 <strong>Sugestão:</strong> {feedback.suggestion_summary}
                          </span>
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>
            
            {filteredData.filter(f => f.allProblems && f.comment && f.comment.trim() !== '').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum feedback com contexto conversacional encontrado.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* OPÇÃO 5: CENTRAL DE GRÁFICOS E ANALYTICS AVANÇADOS */}
        <TabsContent value="option5" className="space-y-6">
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
                              return [
                                `Ocorrências: ${problem.count}`,
                                `Rating médio: ${problem.avgRating}⭐`,
                                `Severidade: ${problem.severity}`,
                                `% do total: ${((problem.count / problemsData.length) * 100).toFixed(1)}%`
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
        </TabsContent>
      </Tabs>
      
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
                filteredData={filteredData}
                executiveSummary={getExecutiveSummary()}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}