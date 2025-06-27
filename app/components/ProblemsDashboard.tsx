import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface ProblemsDashboardProps {
  feedbacks: Array<{
    problem: string;
    sector: string;
    sentiment: string;
    rating: number;
    keyword: string;
  }>;
  onProblemClick?: (problem: string) => void;
}

// Cores para diferentes departamentos
const DEPARTMENT_COLORS: Record<string, string> = {
  'A&B': '#3B82F6',
  'Governança': '#EF4444',
  'Manutenção': '#F97316',
  'Lazer': '#10B981',
  'TI': '#8B5CF6',
  'Operações': '#FBBF24',
  'Produto': '#6366F1',
  'Marketing': '#EC4899',
  'Comercial': '#06B6D4'
};

// Função para obter cor com base no departamento
const getDepartmentColor = (department: string) => {
  return DEPARTMENT_COLORS[department as keyof typeof DEPARTMENT_COLORS] || '#6B7280';
};

// Adicionar lista de problemas padronizados
const PROBLEMAS_PADRONIZADOS = [
  "Quarto pequeno",
  "Quarto desconfortável",
  "Café limitado",
  "Poucas opções",
  "Atendimento ruim",
  "Atendimento lento",
  "Wi-Fi instável",
  "Equipamentos antigos",
  "Limpeza inadequada",
  "Barulho excessivo",
  "Preço alto",
  "Manutenção precária",
  "Poucas atividades",
  "Falta estrutura",
  "Localização ruim",
  "Ar-condicionado ruim",
  "TV com problemas",
  "Banheiro pequeno",
  "Check-in demorado",
  "Estacionamento lotado",
  "Estacionamento pago",
  "Abordagem comercial indesejada",
  "Distância da estrutura",
  "Poucas opções de jantar"
];

export function ProblemsDashboard({ feedbacks, onProblemClick }: ProblemsDashboardProps) {
  // Função para filtrar feedbacks válidos (remove não identificados)
  const filterValidFeedbacks = (feedbacks: any[]) => {
    return feedbacks.filter(feedback => {
      const keyword = feedback.keyword?.toLowerCase() || '';
      const sector = feedback.sector?.toLowerCase() || '';
      
      const isNotIdentified = 
        keyword.includes('não identificado') ||
        keyword.includes('vazio') ||
        keyword === '' ||
        sector.includes('não identificado') ||
        sector.includes('vazio') ||
        sector === '';
      
      return !isNotIdentified;
    });
  };

  // Usar apenas feedbacks válidos
  const validFeedbacks = filterValidFeedbacks(feedbacks);
  
  // Filtra feedbacks com problemas reais (exclui "Sem problemas")
  const problemFeedbacks = validFeedbacks.filter(f => {
    if (!f.problem) return false;
    
    const problem = f.problem.trim().toLowerCase();
    
    // Lista de termos que indicam ausência de problemas
    const emptyProblemTerms = [
      'vazio',
      'sem problemas', 
      'não identificado',
      'não analisado',
      'sem problema',
      'nenhum problema',
      ''
    ];
    
    // Verificar se o problema é algum dos termos de "sem problema"
    const isEmpty = emptyProblemTerms.some(term => 
      problem === term || problem.includes(term)
    );
    
    return !isEmpty;
  });

  // Processa todos os problemas, incluindo múltiplos por feedback
  const processedProblems = problemFeedbacks.flatMap(feedback => {
    const problems = feedback.problem.split(';').map((p: string) => p.trim());
    const keywords = feedback.keyword.split(';').map((k: string) => k.trim());
    const sectors = feedback.sector.split(';').map((s: string) => s.trim());
    
    return problems.map((problem: string, index: number) => {
      const cleanProblem = problem.trim().toLowerCase();
      
      // Lista mais completa de termos que indicam ausência de problemas
      const emptyProblemTerms = [
        'vazio',
        'sem problemas', 
        'não identificado',
        'não analisado',
        'sem problema',
        'nenhum problema',
        ''
      ];
      
      // Verificar se é um problema "vazio"
      const isEmpty = emptyProblemTerms.some(term => 
        cleanProblem === term || cleanProblem.includes(term)
      );
      
      if (isEmpty) {
        return null;
      }
      
      // Verificar se o problema está na lista de problemas padronizados
      // Se não estiver, tentar encontrar o mais próximo
      let normalizedProblem = problem;
      if (!PROBLEMAS_PADRONIZADOS.includes(problem)) {
        // Tentar encontrar um problema padronizado similar
        const similarProblem = PROBLEMAS_PADRONIZADOS.find(p => 
          problem.toLowerCase().includes(p.toLowerCase())
        );
        if (similarProblem) {
          normalizedProblem = similarProblem;
        }
      }
      
      return {
        problem: normalizedProblem,
        keyword: keywords[index] || keywords[0] || "Não identificado",
        sector: sectors[index] || sectors[0] || "Não identificado"
      };
    }).filter(Boolean) as Array<{
      problem: string;
      keyword: string;
      sector: string;
    }>;
  });

  // Conta ocorrências de cada problema
  const problemCounts = processedProblems.reduce((acc, item) => {
    if (item && item.problem) {
      const cleanProblem = item.problem.trim().toLowerCase();
      
      // Verificação final: não contar problemas "vazios"
      const emptyTerms = ['vazio', 'sem problemas', 'não identificado', 'sem problema'];
      const isEmpty = emptyTerms.some(term => cleanProblem.includes(term));
      
      if (!isEmpty) {
        const key = `${item.keyword}: ${item.problem}`;
        acc[key] = {
          count: (acc[key]?.count || 0) + 1,
          sector: item.sector,
          keyword: item.keyword,
          problem: item.problem
        };
      }
    }
    return acc;
  }, {} as Record<string, { count: number, sector: string, keyword: string, problem: string }>);

  // Prepara dados para o gráfico e tabela
  const problemTableData = Object.entries(problemCounts)
    .map(([key, data]) => ({ 
      key,
      problem: data.problem,
      keyword: data.keyword,
      sector: data.sector,
      count: data.count 
    }))
    .sort((a, b) => b.count - a.count);

  // Agrupa problemas por departamento
  const problemsByDepartment = processedProblems.reduce((acc, item) => {
    if (item) {
      const department = item.sector;
      if (!acc[department]) {
        acc[department] = { total: 0, problems: {} };
      }
      acc[department].total += 1;
      acc[department].problems[item.problem] = (acc[department].problems[item.problem] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, { total: number; problems: Record<string, number> }>);

  // Prepara dados para o gráfico de departamentos
  const departmentData = Object.entries(problemsByDepartment).map(([department, data]) => ({
    department,
    count: data.total,
  })).sort((a, b) => b.count - a.count);

  // Agrupa problemas por palavra-chave
  const problemsByKeyword = processedProblems.reduce((acc, item) => {
    if (item) {
      const keyword = item.keyword;
      if (!acc[keyword]) {
        acc[keyword] = { total: 0, problems: {} };
      }
      acc[keyword].total += 1;
      acc[keyword].problems[item.problem] = (acc[keyword].problems[item.problem] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, { total: number; problems: Record<string, number> }>);

  // Prepara dados para o gráfico de palavras-chave
  const keywordData = Object.entries(problemsByKeyword).map(([keyword, data]) => ({
    keyword,
    count: data.total,
  })).sort((a, b) => b.count - a.count);

  // Função para renderizar o tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium">{data.keyword}</p>
          <p className="text-sm">{data.problem}</p>
          <p className="text-sm text-gray-500">Departamento: {data.sector}</p>
          <p className="font-medium">Ocorrências: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  // Adicionar estado para o filtro de busca
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Análise Detalhada de Problemas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Total de Feedbacks</div>
            <div className="text-2xl font-bold mt-1">{feedbacks.length}</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Feedbacks com Problemas</div>
            <div className="text-2xl font-bold mt-1">{problemFeedbacks.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              ({((problemFeedbacks.length / feedbacks.length) * 100).toFixed(1)}% do total)
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Problemas Únicos</div>
            <div className="text-2xl font-bold mt-1">{problemTableData.length}</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm font-medium text-gray-500">Departamentos Afetados</div>
            <div className="text-2xl font-bold mt-1">{departmentData.length}</div>
          </Card>
        </div>
        <Tabs defaultValue="problems" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="problems">Problemas</TabsTrigger>
            <TabsTrigger value="sectors">Departamentos</TabsTrigger>
            <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          </TabsList>
          
          {/* Tab de Problemas */}
          <TabsContent value="problems" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Todos os Problemas Reportados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Buscar problemas..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={problemTableData
                        .filter(item => 
                          searchFilter === "" || 
                          item.problem.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.keyword.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.sector.toLowerCase().includes(searchFilter.toLowerCase())
                        )
                        .sort((a, b) => b.count - a.count)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category"
                        dataKey="problem"
                        width={200}
                        tick={({ x, y, payload }) => {
                          const item = problemTableData
                            .filter(p => 
                              searchFilter === "" || 
                              p.problem.toLowerCase().includes(searchFilter.toLowerCase())
                            )
                            .find(p => p.problem === payload.value);
                          const color = item ? getDepartmentColor(item.sector) : '#6B7280';
                          
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              dy={4} 
                              fill={color} 
                              fontSize={12} 
                              textAnchor="end"
                            >
                              {payload.value}
                            </text>
                          );
                        }}
                      />
                      <Tooltip content={CustomTooltip} />
                      <Bar 
                        dataKey="count" 
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      >
                        {problemTableData
                          .filter(item => 
                            searchFilter === "" || 
                            item.problem.toLowerCase().includes(searchFilter.toLowerCase())
                          )
                          .map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getDepartmentColor(entry.sector)} 
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tabela Detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lista Detalhada de Problemas</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Problema</TableHead>
                        <TableHead>Palavra-chave</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead className="text-right">Ocorrências</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problemTableData
                        .filter(item => 
                          searchFilter === "" || 
                          item.problem.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.keyword.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.sector.toLowerCase().includes(searchFilter.toLowerCase())
                        )
                        .map((item) => (
                          <TableRow key={item.key}>
                            <TableCell>
                              <Badge 
                                style={{ 
                                  backgroundColor: `${getDepartmentColor(item.sector)}20`,
                                  color: getDepartmentColor(item.sector),
                                  borderColor: getDepartmentColor(item.sector)
                                }}
                              >
                                {item.problem}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.keyword}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.sector}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.count}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {/* Gráfico de Pizza - Top 5 Problemas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 5 Problemas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={problemTableData.slice(0, 5)}
                          dataKey="count"
                          nameKey="problem"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {problemTableData.slice(0, 5).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getDepartmentColor(entry.sector)} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tab de Departamentos */}
          <TabsContent value="sectors">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico de Pizza - Distribuição por Departamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Problemas por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentData}
                          dataKey="count"
                          nameKey="department"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {departmentData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getDepartmentColor(entry.department)} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabela de Departamentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalhamento por Departamento</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Departamento</TableHead>
                        <TableHead className="text-right">Problemas</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentData.map((item) => (
                        <TableRow key={item.department}>
                          <TableCell>
                            <Badge 
                              style={{ 
                                backgroundColor: `${getDepartmentColor(item.department)}20`,
                                color: getDepartmentColor(item.department),
                                borderColor: getDepartmentColor(item.department)
                              }}
                            >
                              {item.department}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">
                            {((item.count / processedProblems.length) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tab de Palavras-chave */}
          <TabsContent value="keywords">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico de Barras - Palavras-chave */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Problemas por Palavra-chave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={keywordData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category"
                          dataKey="keyword"
                          width={150}
                        />
                        <Tooltip />
                        <Bar 
                          dataKey="count" 
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                          fill="#8884d8"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabela de Palavras-chave */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalhamento por Palavra-chave</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Palavra-chave</TableHead>
                        <TableHead className="text-right">Problemas</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keywordData.map((item) => (
                        <TableRow key={item.keyword}>
                          <TableCell>{item.keyword}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">
                            {((item.count / processedProblems.length) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 