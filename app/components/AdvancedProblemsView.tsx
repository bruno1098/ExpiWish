"use client"

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Users,
  MapPin,
  Target,
  Eye,
  Filter,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Feedback } from '@/types'

interface ProblemDetail {
  genericProblem: string
  specificDetails: Array<{
    detail: string
    count: number
    percentage: number
    severity: 'low' | 'medium' | 'high'
    department: string
    problemDetail?: string  // Adicionado campo para problem_detail
    examples: string[]
  }>
  totalCount: number
  trendDirection: 'up' | 'down' | 'stable'
  affectedDepartments: string[]
}

interface AdvancedProblemsViewProps {
  feedbacks: Feedback[]
  selectedHotel?: string | null
}

// Função para determinar severidade baseada na frequência
const calculateSeverity = (count: number, totalFeedbacks: number): 'low' | 'medium' | 'high' => {
  const percentage = (count / totalFeedbacks) * 100
  if (percentage >= 15) return 'high'
  if (percentage >= 8) return 'medium'
  return 'low'
}

// Cores para severidade
const severityColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  high: 'bg-red-100 text-red-800 border-red-200'
}

// Função para filtrar problemas válidos
const isValidProblem = (problem: string): boolean => {
  if (!problem || typeof problem !== 'string') return false
  const normalized = problem.toLowerCase().trim()
  const invalidProblems = [
    'vazio', 'sem problemas', 'nao identificado', 'não identificado',
    'sem problema', 'nenhum problema', 'ok', 'tudo ok', 'sem', 'n/a', 'na', '-', ''
  ]
  return !invalidProblems.includes(normalized) && 
         !normalized.includes('vazio') &&
         !normalized.includes('sem problemas') &&
         normalized.length > 2
}

export function AdvancedProblemsView({ feedbacks, selectedHotel }: AdvancedProblemsViewProps) {
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set())
  const [selectedView, setSelectedView] = useState<'hierarchy' | 'heatmap' | 'timeline'>('hierarchy')
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetail | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Filtrar feedbacks válidos
  const validFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      const hasValidProblem = feedback.problem && isValidProblem(feedback.problem)
      const matchesHotel = !selectedHotel || 
        feedback.hotel === selectedHotel || 
        feedback.source === selectedHotel
      return hasValidProblem && matchesHotel
    })
  }, [feedbacks, selectedHotel])

  // Processar dados dos problemas
  const problemsData = useMemo(() => {
    const problemMap = new Map<string, ProblemDetail>()
    
    validFeedbacks.forEach(feedback => {
      if (!feedback.problem) return
      
      // Lidar com múltiplos problemas separados por ponto e vírgula
      const problems = feedback.problem.includes(';') 
        ? feedback.problem.split(';').map(p => p.trim())
        : [feedback.problem]
      
      problems.forEach(problem => {
        if (!isValidProblem(problem)) return
        
        const detail = feedback.problem_detail || 'Detalhes não especificados'
        // Normalizar departamento (remover vírgulas e separadores múltiplos)
        const department = feedback.sector 
          ? feedback.sector.split(/[,;]/).map(d => d.trim()).filter(d => d)[0] || 'Não especificado'
          : 'Não especificado'
        
        if (!problemMap.has(problem)) {
          problemMap.set(problem, {
            genericProblem: problem,
            specificDetails: [],
            totalCount: 0,
            trendDirection: 'stable',
            affectedDepartments: []
          })
        }
        
        const problemData = problemMap.get(problem)!
        problemData.totalCount++
        
        // Agrupar por detalhe específico
        const existingDetail = problemData.specificDetails.find(d => d.detail === detail)
        if (existingDetail) {
          existingDetail.count++
          if (!existingDetail.examples.includes(feedback.comment)) {
            existingDetail.examples.push(feedback.comment)
          }
        } else {
          problemData.specificDetails.push({
            detail,
            count: 1,
            percentage: 0,
            severity: 'low',
            department,
            problemDetail: feedback.problem_detail, // Incluir problem_detail
            examples: [feedback.comment]
          })
        }
        
        // Adicionar departamento se não existir
        if (!problemData.affectedDepartments.includes(department)) {
          problemData.affectedDepartments.push(department)
        }
      })
    })
    
    // Calcular percentuais e severidade
    const totalFeedbacks = validFeedbacks.length
    problemMap.forEach(problemData => {
      problemData.specificDetails.forEach(detail => {
        detail.percentage = (detail.count / problemData.totalCount) * 100
        detail.severity = calculateSeverity(detail.count, totalFeedbacks)
      })
      
      // Ordenar detalhes por frequência
      problemData.specificDetails.sort((a, b) => b.count - a.count)
    })
    
    // Converter para array e ordenar por frequência total
    return Array.from(problemMap.values()).sort((a, b) => b.totalCount - a.totalCount)
  }, [validFeedbacks])

  // Dados para mapa de calor (departamento x problema)
  const heatmapData = useMemo(() => {
    // Normalizar departamentos - pegar apenas o primeiro departamento de cada feedback
    const normalizedDepartments = Array.from(new Set(
      validFeedbacks
        .map(f => f.sector ? f.sector.split(/[,;]/).map(d => d.trim()).filter(d => d)[0] : null)
        .filter(Boolean)
    )) as string[]
    
    const problems = problemsData.slice(0, 10).map(p => p.genericProblem) // Top 10 problemas
    
    const matrix: Array<{
      department: string
      problem: string
      count: number
      intensity: number
    }> = []
    
    normalizedDepartments.forEach(dept => {
      problems.forEach(problem => {
        const count = validFeedbacks.filter(f => {
          // Normalizar departamento do feedback para comparação
          const feedbackDept = f.sector ? f.sector.split(/[,;]/).map(d => d.trim()).filter(d => d)[0] : null
          return feedbackDept === dept && f.problem?.includes(problem)
        }).length
        
        matrix.push({
          department: dept,
          problem,
          count,
          intensity: count / Math.max(...problemsData.map(p => p.totalCount)) * 100
        })
      })
    })
    
    return { departments: normalizedDepartments, problems, matrix }
  }, [validFeedbacks, problemsData])

  const toggleProblemExpansion = useCallback((problem: string) => {
    setExpandedProblems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(problem)) {
        newSet.delete(problem)
      } else {
        newSet.add(problem)
      }
      return newSet
    })
  }, [])

  const openDetailModal = useCallback((problem: ProblemDetail) => {
    setSelectedProblem(problem)
    setIsDetailModalOpen(true)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header com estatísticas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Problemas Únicos</p>
                <p className="text-2xl font-bold text-red-900">{problemsData.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Total de Ocorrências</p>
                <p className="text-2xl font-bold text-orange-900">
                  {problemsData.reduce((sum, p) => sum + p.totalCount, 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Departamentos Afetados</p>
                <p className="text-2xl font-bold text-blue-900">
                  {new Set(validFeedbacks.map(f => f.sector).filter(Boolean)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Problema Mais Frequente</p>
                <p className="text-sm font-bold text-purple-900">
                  {problemsData[0]?.genericProblem.substring(0, 20) || 'N/A'}
                  {problemsData[0]?.genericProblem.length > 20 ? '...' : ''}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hierarchy">Visão Hierárquica</TabsTrigger>
          <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="timeline">Análise Temporal</TabsTrigger>
        </TabsList>

        {/* Visão Hierárquica */}
        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Problemas por Categoria e Detalhes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Clique nos problemas para expandir e ver detalhes específicos
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {problemsData.map((problem, index) => (
                    <Card key={problem.genericProblem} className="border-l-4 border-l-red-400">
                      <CardContent className="p-4">
                        {/* Header do problema */}
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2"
                          onClick={() => toggleProblemExpansion(problem.genericProblem)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedProblems.has(problem.genericProblem) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-medium text-gray-900">
                                {problem.genericProblem}
                              </span>
                              <Badge variant="destructive" className="ml-2">
                                {problem.totalCount} ocorrências
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {problem.affectedDepartments.length} dept(s)
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDetailModal(problem)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Detalhes expandidos */}
                        {expandedProblems.has(problem.genericProblem) && (
                          <div className="mt-4 ml-6 space-y-3">
                            <div className="text-sm text-gray-600 mb-3">
                              Departamentos afetados: {problem.affectedDepartments.join(', ')}
                            </div>
                            
                            {problem.specificDetails.map((detail, detailIndex) => (
                              <Card key={detailIndex} className={cn(
                                "border-l-4 p-3",
                                detail.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                                detail.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                                'border-l-green-500 bg-green-50'
                              )}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 mb-1">
                                      {detail.detail}
                                    </p>
                                    
                                    {/* Mostrar problem_detail se existir */}
                                    {detail.problemDetail && (
                                      <div className="mb-2 p-2 bg-blue-50 rounded border-l-2 border-l-blue-400">
                                        <p className="text-xs font-medium text-blue-700 mb-1">Detalhes do Problema:</p>
                                        <p className="text-sm text-blue-800 italic">
                                          {detail.problemDetail}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Badge variant="outline">
                                        {detail.department}
                                      </Badge>
                                      <span>•</span>
                                      <span>{detail.count} casos</span>
                                      <span>•</span>
                                      <span>{detail.percentage.toFixed(1)}% do problema</span>
                                    </div>
                                  </div>
                                  
                                  <Badge className={cn(
                                    "ml-3",
                                    detail.severity === 'high' ? severityColors.high :
                                    detail.severity === 'medium' ? severityColors.medium :
                                    severityColors.low
                                  )}>
                                    {detail.severity === 'high' ? 'Alta' :
                                     detail.severity === 'medium' ? 'Média' : 'Baixa'}
                                  </Badge>
                                </div>
                                
                                {detail.examples.length > 0 && (
                                  <div className="mt-2 p-2 bg-white rounded border">
                                    <p className="text-xs font-medium text-gray-700 mb-1">Exemplo:</p>
                                    <p className="text-xs text-gray-600 italic">
                                      "{detail.examples[0].substring(0, 100)}..."
                                    </p>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapa de Calor */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Mapa de Calor: Departamentos vs Problemas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Intensidade baseada na frequência de problemas por departamento
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header com problemas */}
                  <div className="grid gap-1 mb-2" style={{
                    gridTemplateColumns: `200px repeat(${heatmapData.problems.length}, 1fr)`
                  }}>
                    <div></div>
                    {heatmapData.problems.map(problem => (
                      <div key={problem} className="text-xs font-medium text-center p-2 transform -rotate-45 origin-bottom-left">
                        {problem.length > 15 ? problem.substring(0, 15) + '...' : problem}
                      </div>
                    ))}
                  </div>
                  
                  {/* Matriz de dados */}
                  {heatmapData.departments.map(dept => (
                    <div key={dept} className="grid gap-1 mb-1" style={{
                      gridTemplateColumns: `200px repeat(${heatmapData.problems.length}, 1fr)`
                    }}>
                      <div className="text-sm font-medium p-2 bg-gray-100 rounded">
                        {dept}
                      </div>
                      {heatmapData.problems.map(problem => {
                        const cell = heatmapData.matrix.find(m => 
                          m.department === dept && m.problem === problem
                        )
                        const intensity = cell?.intensity || 0
                        return (
                          <div 
                            key={problem}
                            className="h-10 flex items-center justify-center text-xs rounded border cursor-pointer hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: intensity > 0 ? 
                                `rgba(239, 68, 68, ${Math.max(0.1, intensity / 100)})` : 
                                '#f9fafb'
                            }}
                            title={`${dept} - ${problem}: ${cell?.count || 0} casos`}
                          >
                            {cell?.count || 0}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análise Temporal */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" />
                Evolução dos Problemas ao Longo do Tempo
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tendências dos principais problemas por período
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={problemsData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="genericProblem" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="totalCount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de distribuição por severidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Severidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Alta Severidade', 
                            value: problemsData.filter(p => 
                              p.specificDetails.some(d => d.severity === 'high')
                            ).length,
                            fill: '#ef4444'
                          },
                          { 
                            name: 'Média Severidade', 
                            value: problemsData.filter(p => 
                              p.specificDetails.some(d => d.severity === 'medium')
                            ).length,
                            fill: '#f59e0b'
                          },
                          { 
                            name: 'Baixa Severidade', 
                            value: problemsData.filter(p => 
                              p.specificDetails.every(d => d.severity === 'low')
                            ).length,
                            fill: '#10b981'
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      />
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Problemas por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(new Set(
                    validFeedbacks
                      .map(f => f.sector ? f.sector.split(/[,;]/).map(d => d.trim()).filter(d => d)[0] : null)
                      .filter(Boolean)
                  ))
                    .slice(0, 6)
                    .map(dept => {
                      const count = validFeedbacks.filter(f => {
                        const feedbackDept = f.sector ? f.sector.split(/[,;]/).map(d => d.trim()).filter(d => d)[0] : null
                        return feedbackDept === dept
                      }).length
                      const percentage = (count / validFeedbacks.length) * 100
                      return (
                        <div key={dept} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{dept}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 w-8">{count}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes do problema */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {selectedProblem?.genericProblem}
            </DialogTitle>
            <DialogDescription>
              Análise detalhada do problema com {selectedProblem?.totalCount} ocorrências
            </DialogDescription>
          </DialogHeader>
          
          {selectedProblem && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Estatísticas do problema */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-700">{selectedProblem.totalCount}</p>
                    <p className="text-sm text-red-600">Total de Ocorrências</p>
                  </div>
                </Card>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-700">{selectedProblem.affectedDepartments.length}</p>
                    <p className="text-sm text-blue-600">Departamentos Afetados</p>
                  </div>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-700">{selectedProblem.specificDetails.length}</p>
                    <p className="text-sm text-purple-600">Variações Identificadas</p>
                  </div>
                </Card>
              </div>

              {/* Lista de detalhes específicos */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes Específicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedProblem.specificDetails.map((detail, index) => (
                      <Card key={index} className={cn(
                        "p-4 border-l-4",
                        detail.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                        detail.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                        'border-l-green-500 bg-green-50'
                      )}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{detail.detail}</h4>
                          <Badge className={cn(
                            detail.severity === 'high' ? severityColors.high :
                            detail.severity === 'medium' ? severityColors.medium :
                            severityColors.low
                          )}>
                            {detail.severity === 'high' ? 'Alta' :
                             detail.severity === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                        
                        {/* Mostrar problem_detail se existir */}
                        {detail.problemDetail && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-md border-l-2 border-l-blue-400">
                            <p className="text-xs font-medium text-blue-700 mb-1">Detalhes do Problema:</p>
                            <p className="text-sm text-blue-800">
                              {detail.problemDetail}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span>{detail.count} casos</span>
                          <span>•</span>
                          <span>{detail.percentage.toFixed(1)}% do problema</span>
                          <span>•</span>
                          <span>{detail.department}</span>
                        </div>

                        {detail.examples.length > 0 && (
                          <div className="bg-white p-3 rounded border">
                            <p className="text-xs font-medium text-gray-700 mb-2">Exemplos de comentários:</p>
                            {detail.examples.slice(0, 2).map((example, i) => (
                              <p key={i} className="text-xs text-gray-600 italic mb-1">
                                ""{example.substring(0, 150)}..."
                              </p>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
