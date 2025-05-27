"use client"

import { Card } from "@/components/ui/card"
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
  LineChart,
  Line,
  Legend,
  Sector,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  LabelList,
  Treemap
} from "recharts"
import { 
  getFeedbackStats, 
  getLatestAnalysisFromFirestore, 
  FirestoreAnalysisResult,
  getAllAnalysisDataForDashboard,
  getFeedbacks
} from "@/lib/feedback"
import { getAllAnalyses } from "@/lib/firestore-service"
import { useEffect, useState, useCallback, useMemo } from "react"
import { DatePicker } from "@/components/ui/date-picker"
import { Feedback } from "@/types"
import { ProblemsDashboard } from "./components/ProblemsDashboard"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { collection, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { RequireAuth } from "@/lib/auth-context"
import { Loader2, RefreshCw } from "lucide-react"

interface StatsData {
  totalFeedbacks: number
  averageRating: number
  positiveSentiment: number
  responseRate: number
  hotelDistribution: Array<{ hotel: string; count: number }>
  sourceDistribution: Array<{ source: string; count: number }>
  languageDistribution: Array<{ language: string; count: number }>
  ratingDistribution: Array<{
    rating: number
    count: number
  }>
  recentFeedbacks: Feedback[]
  sectorDistribution: Array<{
    sector: string
    count: number
  }>
  keywordDistribution: Array<{
    keyword: string
    count: number
  }>
  sentimentTrend: Array<{
    date: string
    positive: number
    negative: number
    neutral: number
  }>
}

// Paleta de cores mais harmoniosa e acessível
const COLORS = [
  '#3498db', // Azul
  '#2ecc71', // Verde
  '#f39c12', // Laranja
  '#e74c3c', // Vermelho
  '#9b59b6', // Roxo
  '#1abc9c', // Turquesa
  '#34495e', // Azul escuro
  '#d35400', // Laranja escuro
  '#27ae60', // Verde escuro
  '#8e44ad'  // Roxo escuro
];

// Interface para o item selecionado
interface SelectedItem {
  type: 'hotel' | 'sector' | 'problem' | 'source' | 'keyword' | 'rating' | 'language' | 'sentiment' | 'all';
  value: string | number;
  data?: any;
}

// Interface para as props do CustomTooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: any;
    color: string;
    [key: string]: any;
  }>;
  label?: string;
  [key: string]: any;
}

// Componente para renderizar o setor ativo no gráfico de pizza
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} (${(percent * 100).toFixed(1)}%)`}</text>
    </g>
  );
};

// Componente personalizado para o tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Interface para os dados do Treemap
interface TreemapItem {
  name: string;
  size: number;
  value: number;
  [key: string]: any;
}

// Componente para o modal de detalhes
interface DetailModalProps {
  title: string;
  children: React.ReactNode;
  description?: string;
}

const DetailModal = ({ title, description, children }: DetailModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/5 rounded-lg">
          <Button variant="outline" className="bg-white/90 dark:bg-gray-800/90">
            Ver Detalhes
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="h-[500px] mt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog> 
    
  );
};

// Componente para o card de gráfico
interface ChartCardProps {
  title: string;
  modalTitle: string;
  modalDescription?: string;
  children: React.ReactNode;
  modalContent: React.ReactNode;
}

const ChartCard = ({ title, modalTitle, modalDescription, children, modalContent }: ChartCardProps) => {
  return (
    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="h-[300px] relative overflow-hidden">
        {children}
        <DetailModal title={modalTitle} description={modalDescription}>
          {modalContent}
        </DetailModal>
      </div>
    </Card>
  );
};

// Componente para o card de gráfico interativo
interface InteractiveChartCardProps {
  title: string;
  children: React.ReactNode;
  onItemClick?: (item: SelectedItem) => void;
}

const InteractiveChartCard = ({ title, children, onItemClick }: InteractiveChartCardProps) => {
  return (
    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="h-[300px] relative overflow-hidden">
        {children}
        <div className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/5 rounded-lg">
          <Button 
            variant="outline" 
            className="bg-white/90 dark:bg-gray-800/90 z-10"
            onClick={() => {
              if (onItemClick) {
                onItemClick({
                  type: 'all',
                  value: title
                });
              }
            }}
          >
            Ver Detalhes
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Componente para o modal de detalhes interativo
interface InteractiveModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  selectedItem: SelectedItem | null;
  allFeedbacks: Feedback[];
}

const InteractiveModal = ({ title, isOpen, onClose, selectedItem, allFeedbacks }: InteractiveModalProps) => {
  if (!selectedItem) return null;
  
  console.log("Modal aberto com item:", selectedItem);
  console.log("Feedbacks disponíveis:", allFeedbacks.length);
  
  // Filtrar feedbacks com base no item selecionado
  const filteredFeedbacks = allFeedbacks.filter(feedback => {
    if (!selectedItem) return false;
    
    console.log(`Filtrando por ${selectedItem.type}: ${selectedItem.value}`);
    
    switch (selectedItem.type) {
      case 'hotel':
        // Verificar tanto no campo hotel quanto no source (que parece conter nomes de hotéis)
        const hotelValue = String(selectedItem.value).toLowerCase();
        const matchesHotel = 
          (feedback.hotel && feedback.hotel.toLowerCase() === hotelValue) || 
          (feedback.source && feedback.source.toLowerCase() === hotelValue);
        
        if (matchesHotel) console.log(`Match hotel: ${feedback.hotel || feedback.source}`);
        return matchesHotel;
        
      case 'sector':
        // Lidar com setores múltiplos separados por ponto e vírgula
        const sectorValue = String(selectedItem.value).toLowerCase();
        const feedbackSectors = feedback.sector ? feedback.sector.toLowerCase().split(';').map(s => s.trim()) : [];
        const matchesSector = feedbackSectors.some(s => s === sectorValue);
        
        if (matchesSector) console.log(`Match sector: ${feedback.sector}`);
        return matchesSector;
        
      case 'problem':
        // Lidar com problemas múltiplos separados por ponto e vírgula
        const problemValue = String(selectedItem.value).toLowerCase();
        const feedbackProblems = feedback.problem ? feedback.problem.toLowerCase().split(';').map(p => p.trim()) : [];
        const matchesProblem = feedbackProblems.some(p => p.includes(problemValue));
        
        if (matchesProblem) console.log(`Match problem: ${feedback.problem}`);
        return matchesProblem;
        
      case 'source':
        const sourceValue = String(selectedItem.value).toLowerCase();
        const matchesSource = feedback.source && feedback.source.toLowerCase() === sourceValue;
        
        if (matchesSource) console.log(`Match source: ${feedback.source}`);
        return matchesSource;
        
      case 'keyword':
        // Lidar com keywords múltiplas separadas por ponto e vírgula
        const keywordValue = String(selectedItem.value).toLowerCase();
        const feedbackKeywords = feedback.keyword ? feedback.keyword.toLowerCase().split(';').map(k => k.trim()) : [];
        const matchesKeyword = feedbackKeywords.some(k => k === keywordValue || k.includes(keywordValue));
        
        if (matchesKeyword) console.log(`Match keyword: ${feedback.keyword}`);
        return matchesKeyword;
        
      case 'rating':
        const ratingValue = typeof selectedItem.value === 'string' 
          ? parseInt(selectedItem.value.split(' ')[0]) 
          : selectedItem.value;
        const matchesRating = feedback.rating === ratingValue;
        
        if (matchesRating) console.log(`Match rating: ${feedback.rating}`);
        return matchesRating;
        
      case 'language':
        const languageValue = String(selectedItem.value).toLowerCase();
        const matchesLanguage = feedback.language && feedback.language.toLowerCase() === languageValue;
        
        if (matchesLanguage) console.log(`Match language: ${feedback.language}`);
        return matchesLanguage;
        
      case 'sentiment':
        const sentimentValue = String(selectedItem.value).toLowerCase();
        const matchesSentiment = feedback.sentiment && feedback.sentiment.toLowerCase() === sentimentValue;
        
        if (matchesSentiment) console.log(`Match sentiment: ${feedback.sentiment}`);
        return matchesSentiment;
        
      case 'all':
        // Para o tipo 'all', retornamos todos os feedbacks
        return true;
        
      default:
        return false;
    }
  });
  
  console.log(`Total de feedbacks filtrados: ${filteredFeedbacks.length} de ${allFeedbacks.length}`);
  
  // Calcular estatísticas para o item selecionado
  const totalFeedbacks = filteredFeedbacks.length;
  const averageRating = totalFeedbacks > 0 
    ? filteredFeedbacks.reduce((acc, item) => acc + item.rating, 0) / totalFeedbacks 
    : 0;
  const positiveFeedbacks = filteredFeedbacks.filter(f => f.sentiment === 'positive').length;
  const positiveSentiment = totalFeedbacks > 0 
    ? Math.round((positiveFeedbacks / totalFeedbacks) * 100) 
    : 0;
  
  // Agrupar problemas comuns
  const problemCounts: Record<string, number> = {};
  filteredFeedbacks.forEach(feedback => {
    if (feedback.problem) {
      problemCounts[feedback.problem] = (problemCounts[feedback.problem] || 0) + 1;
    }
  });
  
  const topProblems = Object.entries(problemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([problem, count]) => ({ problem, count }));
  
  // Agrupar por setores
  const sectorCounts: Record<string, number> = {};
  filteredFeedbacks.forEach(feedback => {
    if (feedback.sector) {
      sectorCounts[feedback.sector] = (sectorCounts[feedback.sector] || 0) + 1;
    }
  });
  
  const sectorDistribution = Object.entries(sectorCounts)
    .map(([sector, count]) => ({ sector, count }));
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            {selectedItem.type === 'hotel' && "Hotel: "}
            {selectedItem.type === 'sector' && "Setor: "}
            {selectedItem.type === 'problem' && "Problema: "}
            {selectedItem.type === 'source' && "Fonte: "}
            {selectedItem.type === 'keyword' && "Palavra-chave: "}
            {selectedItem.type === 'rating' && "Avaliação: "}
            <span className="font-bold">{selectedItem.value}</span>
            <Badge variant="outline" className="ml-2">
              {totalFeedbacks} feedbacks
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Análise detalhada dos feedbacks relacionados a {selectedItem.value}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4 flex-shrink-0">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 overflow-auto flex-grow p-1">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total de Feedbacks</h3>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalFeedbacks}</p>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Avaliação Média</h3>
                <div className="mt-2 flex items-center gap-1">
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{averageRating.toFixed(1)}</p>
                  <span className="text-xl text-yellow-500">★</span>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Sentimento Positivo</h3>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">{positiveSentiment}%</p>
                </div>
              </Card>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Principais Problemas</h3>
                {topProblems.length > 0 ? (
                  <div className="space-y-2">
                    {topProblems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm truncate max-w-[70%]">{item.problem}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum problema identificado</p>
                )}
              </Card>
              
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Distribuição por Setor</h3>
                <div className="h-[180px]">
                  {sectorDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectorDistribution}
                          dataKey="count"
                          nameKey="sector"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                        >
                          {sectorDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Sem dados suficientes
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="overflow-auto flex-grow p-1">
            <div className="grid grid-cols-2 gap-4 h-full">
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Distribuição de Avaliações</h3>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[1, 2, 3, 4, 5].map(rating => ({
                        rating: `${rating} ★`,
                        count: filteredFeedbacks.filter(f => f.rating === rating).length
                      }))}
                    >
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Quantidade">
                        {[1, 2, 3, 4, 5].map((rating, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={rating === 5 ? '#2ecc71' : 
                                  rating === 4 ? '#27ae60' : 
                                  rating === 3 ? '#f39c12' : 
                                  rating === 2 ? '#e67e22' : 
                                  '#e74c3c'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Palavras-chave</h3>
                <div className="h-[320px]">
                  {filteredFeedbacks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(filteredFeedbacks.map(f => f.keyword)))
                        .filter(Boolean)
                        .map((keyword, index) => {
                          const count = filteredFeedbacks.filter(f => f.keyword === keyword).length;
                          const size = Math.max(0.8, Math.min(2, count / (totalFeedbacks * 0.2)));
                          return (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              style={{ 
                                fontSize: `${size}rem`,
                                padding: `${0.3 * size}rem ${0.6 * size}rem`,
                                backgroundColor: `${COLORS[index % COLORS.length]}20`
                              }}
                            >
                              {keyword} ({count})
                            </Badge>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Sem dados suficientes
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="feedbacks" className="overflow-auto flex-grow p-1">
            <div className="space-y-4">
              {filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map((feedback, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{feedback.hotel || 'Hotel não especificado'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {feedback.source} • {new Date(feedback.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">{feedback.rating}</span>
                        <span className="text-yellow-500">★</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30">
                        {feedback.sector}
                      </Badge>
                      {feedback.problem && (
                        <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30">
                          {feedback.problem}
                        </Badge>
                      )}
                      {feedback.keyword && (
                        <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30">
                          {feedback.keyword}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm mt-2">{feedback.comment}</p>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum feedback encontrado
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Primeiro, vamos criar um novo componente para o modal de primeiro nível
interface DetailedChartModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  chartType: 'sector' | 'hotel' | 'problem' | 'rating' | 'source' | 'keyword' | 'language' | 'sentiment';
  data: any[];
  onItemClick: (item: SelectedItem) => void;
}

const DetailedChartModal = ({ title, isOpen, onClose, chartType, data, onItemClick }: DetailedChartModalProps) => {
  if (!data || data.length === 0) return null;
  
  // Renderizar o gráfico apropriado com base no tipo
  const renderChart = () => {
    switch (chartType) {
      case 'sector':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="sector"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                onClick={(data) => onItemClick({
                  type: 'sector',
                  value: data.sector,
                  data: data
                })}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'hotel':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="hotel"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                onClick={(data) => onItemClick({
                  type: 'hotel',
                  value: data.hotel,
                  data: data
                })}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'rating':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="rating" />
              <YAxis />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Quantidade" 
                radius={[4, 4, 0, 0]}
                onClick={(data) => onItemClick({
                  type: 'rating',
                  value: data.rating.split(' ')[0],
                  data: data
                })}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.rating.startsWith('5') ? '#2ecc71' : 
                          entry.rating.startsWith('4') ? '#27ae60' : 
                          entry.rating.startsWith('3') ? '#f39c12' : 
                          entry.rating.startsWith('2') ? '#e67e22' : 
                          '#e74c3c'} 
                  />
                ))}
                <LabelList dataKey="count" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'source':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data}
              layout="vertical"
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="source" width={150} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Quantidade" 
                radius={[0, 4, 4, 0]}
                onClick={(data) => onItemClick({
                  type: 'source',
                  value: data.source,
                  data: data
                })}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="count" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'keyword':
        return (
          <div className="h-full flex flex-wrap gap-3 items-center justify-center p-4 overflow-auto">
            {data.map((item, index) => {
              const size = Math.max(1, Math.min(2.5, item.count / 5));
              return (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    fontSize: `${size}rem`,
                    padding: `${0.4 * size}rem ${0.8 * size}rem`,
                    backgroundColor: `${COLORS[index % COLORS.length]}20`
                  }}
                  onClick={() => onItemClick({
                    type: 'keyword',
                    value: item.keyword
                  })}
                >
                  {item.keyword} ({item.count})
                </Badge>
              );
            })}
          </div>
        );
      
      case 'language':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="language"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                onClick={(data) => onItemClick({
                  type: 'language',
                  value: data.language,
                  data: data
                })}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'sentiment':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="positive" 
                stackId="1"
                stroke="#2ecc71" 
                fill="#2ecc71" 
                name="Positivo" 
                onClick={(data) => onItemClick({
                  type: 'sentiment',
                  value: 'positive',
                  data: data
                })}
                className="cursor-pointer"
              />
              <Area 
                type="monotone" 
                dataKey="negative" 
                stackId="1"
                stroke="#e74c3c" 
                fill="#e74c3c" 
                name="Negativo" 
                onClick={(data) => onItemClick({
                  type: 'sentiment',
                  value: 'negative',
                  data: data
                })}
                className="cursor-pointer"
              />
              <Area 
                type="monotone" 
                dataKey="neutral" 
                stackId="1"
                stroke="#3498db" 
                fill="#3498db" 
                name="Neutro" 
                onClick={(data) => onItemClick({
                  type: 'sentiment',
                  value: 'neutral',
                  data: data
                })}
                className="cursor-pointer"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'problem':
        return (
          <div className="h-full overflow-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.map((problem, index) => (
                <Card 
                  key={index} 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onItemClick({
                    type: 'problem',
                    value: problem.problem
                  })}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{problem.problem}</span>
                    <Badge>{problem.count}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      
      default:
        return <div>Sem dados para exibir</div>;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>
            Clique em um item para ver os feedbacks relacionados
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[600px] mt-4 overflow-auto flex-grow">
          {renderChart()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function DashboardContent() {
  const { userData } = useAuth()

  const [analysisData, setAnalysisData] = useState<any>(null);
  
  const [stats, setStats] = useState<StatsData>({
    totalFeedbacks: 0,
    averageRating: 0,
    positiveSentiment: 0,
    responseRate: 0,
    hotelDistribution: [],
    sourceDistribution: [],
    languageDistribution: [],
    ratingDistribution: [],
    recentFeedbacks: [],
    sectorDistribution: [],
    keywordDistribution: [],
    sentimentTrend: [],
  });

  const [dateRange, setDateRange] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null,
  });
  
  const [latestAnalysisId, setLatestAnalysisId] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  
  const [isDetailedChartModalOpen, setIsDetailedChartModalOpen] = useState(false);
  const [detailedChartType, setDetailedChartType] = useState<'sector' | 'hotel' | 'problem' | 'rating' | 'source' | 'keyword' | 'language' | 'sentiment'>('sector');
  const [detailedChartData, setDetailedChartData] = useState<any[]>([]);
  const [detailedChartTitle, setDetailedChartTitle] = useState('');
  
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActivePieIndex(index);
  }, []);
  
  const handleItemClick = useCallback((item: SelectedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);
  
  const handleViewHistory = useCallback(() => {
    if (latestAnalysisId) {
      router.push(`/history/${latestAnalysisId}`);
    } else {
      router.push('/history');
    }
  }, [latestAnalysisId, router]);

  const handleOpenDetailedChart = useCallback((
    type: 'sector' | 'hotel' | 'problem' | 'rating' | 'source' | 'keyword' | 'language' | 'sentiment',
    title: string,
    data: any[]
  ) => {
    setDetailedChartType(type);
    setDetailedChartTitle(title);
    setDetailedChartData(data);
    setIsDetailedChartModalOpen(true);
  }, []);
  
  const handleCloseDetailedChart = useCallback(() => {
    setIsDetailedChartModalOpen(false);
  }, []);

  const hasData = stats?.sectorDistribution?.length > 0 || false;
  
  const prepareTreemapData = useMemo(() => {
    return {
      name: 'keywords',
      children: stats.keywordDistribution.map(item => ({
        name: item.keyword,
        size: item.count,
        value: item.count
      }))
    };
  }, [stats.keywordDistribution]);
  
  const formattedRatingData = useMemo(() => stats.ratingDistribution.map(item => ({
    ...item,
    rating: `${item.rating} ★`,
  })), [stats.ratingDistribution]);

  const filteredData = useMemo(() => {
    if (!selectedHotel) return stats;
    
    const filteredFeedbacks = allFeedbacks.filter(
      feedback => feedback.hotel === selectedHotel || feedback.source === selectedHotel
    );
    
    const totalFeedbacks = filteredFeedbacks.length;
    if (totalFeedbacks === 0) return stats;
    
    const averageRating = filteredFeedbacks.reduce((acc, item) => acc + item.rating, 0) / totalFeedbacks;
    const positiveFeedbacks = filteredFeedbacks.filter(f => f.sentiment === 'positive').length;
    const positiveSentiment = Math.round((positiveFeedbacks / totalFeedbacks) * 100);
    
    const sectorCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const problemCounts: Record<string, number> = {};
    const ratingCounts: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0};
    
    filteredFeedbacks.forEach(feedback => {
      if (feedback.sector) {
        sectorCounts[feedback.sector] = (sectorCounts[feedback.sector] || 0) + 1;
      }
      
      if (feedback.keyword) {
        keywordCounts[feedback.keyword] = (keywordCounts[feedback.keyword] || 0) + 1;
      }
      
      if (feedback.problem && feedback.problem !== 'Não identificado' && feedback.problem !== 'Sem problemas') {
        const problems = feedback.problem.includes(';') 
          ? feedback.problem.split(';').map(p => p.trim())
          : [feedback.problem];
        
        problems.forEach(problem => {
          problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        });
      }
      
      if (feedback.rating >= 1 && feedback.rating <= 5) {
        ratingCounts[feedback.rating] += 1;
      }
    });
    
    return {
      ...stats,
      totalFeedbacks,
      averageRating,
      positiveSentiment,
      sectorDistribution: Object.entries(sectorCounts)
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count),
      keywordDistribution: Object.entries(keywordCounts)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count),
      ratingDistribution: Object.entries(ratingCounts)
        .map(([rating, count]) => ({ rating: Number(rating), count }))
        .sort((a, b) => a.rating - b.rating)
    };
  }, [stats, allFeedbacks, selectedHotel]);
  
  const filteredRatingData = useMemo(() => filteredData.ratingDistribution.map(item => ({
    ...item,
    rating: `${item.rating} ★`,
  })), [filteredData.ratingDistribution]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (userData?.hotelId) {
        const analyses = await getAllAnalyses(userData.hotelId)
        if (analyses && analyses.length > 0) {
          const latestAnalysis = analyses[0]
          setAnalysisData(latestAnalysis)
          setSelectedHotel(userData.hotelName)
        } else {
          setAnalysisData(null)
        }
      } else {
        const loadStats = async () => {
          try {
            setIsLoading(true);
            
            const aggregatedData = await getAllAnalysisDataForDashboard();
            
            if (aggregatedData) {
              console.log('Usando dados agregados do Firestore');
              setStats(aggregatedData);
              
              try {
                const q = collection(db, 'analyses');
                const querySnapshot = await getDocs(q);
                
                let allFeedbacksData: Feedback[] = [];
                
                querySnapshot.forEach(doc => {
                  const data = doc.data();
                  if (data.data && Array.isArray(data.data)) {
                    console.log(`Adicionando ${data.data.length} feedbacks do documento ${doc.id}`);
                    allFeedbacksData = [...allFeedbacksData, ...data.data];
                  }
                });
                
                console.log(`Total de feedbacks carregados: ${allFeedbacksData.length}`);
                setAllFeedbacks(allFeedbacksData);
              } catch (error) {
                console.error('Erro ao carregar todos os feedbacks:', error);
                setAllFeedbacks(aggregatedData.recentFeedbacks || []);
              }
            } else {
              console.log('Fallback para último documento');
              const firestoreData = await getLatestAnalysisFromFirestore();
              
              if (firestoreData && firestoreData.analysis) {
                setStats(firestoreData.analysis as StatsData);
                setLatestAnalysisId(firestoreData.id);
                
                if (firestoreData.data && Array.isArray(firestoreData.data)) {
                  setAllFeedbacks(firestoreData.data);
                } else {
                  setAllFeedbacks(firestoreData.analysis.recentFeedbacks || []);
                }
              } else {
                console.log('Fallback para dados locais');
                const data = await getFeedbackStats();
                setStats(data as StatsData);
                
                const localFeedbacks = getFeedbacks();
                setAllFeedbacks(localFeedbacks);
              }
            }
          } catch (error) {
            console.error('Erro ao carregar estatísticas:', error)
            
            try {
              const data = await getFeedbackStats();
              setStats(data as StatsData);
              
              const localFeedbacks = getFeedbacks();
              setAllFeedbacks(localFeedbacks);
            } catch (fallbackError) {
              console.error('Erro ao carregar dados de fallback:', fallbackError);
            }
          } finally {
            setIsLoading(false)
          }
        }
        loadStats()
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    }
  }

  useEffect(() => {
    fetchData();
  }, [userData?.hotelId]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Carregando dados...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral dos feedbacks do seu hotel
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 md:gap-4 items-center">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar Dados
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleViewHistory}
            variant="outline"
          >
            Ver Histórico Completo
          </Button>
          <div className="flex flex-wrap gap-2">
            <DatePicker date={dateRange.start} onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))} />
            <DatePicker date={dateRange.end} onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))} />
          </div>
        </div>
      </div>
      
      {userData?.hotelId && !analysisData ? (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Nenhum dado encontrado</h3>
          <p className="text-muted-foreground mb-6">
            Não foram encontrados dados de feedback para o hotel {userData.hotelName}.
          </p>
          <Button onClick={() => router.push('/import')}>
            Importar Dados
          </Button>
        </div>
      ) : (
        <>
          <Card className="p-4 md:p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-medium text-indigo-700 dark:text-indigo-300">Filtrar por Hotel</h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Selecione um hotel para visualizar seus dados específicos
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto">
                <Button 
                  variant={selectedHotel === null ? "default" : "outline"}
                  className="whitespace-nowrap"
                  onClick={() => setSelectedHotel(null)}
                >
                  Todos os Hotéis
                </Button>
                
                {stats.hotelDistribution.slice(0, 5).map((hotel, index) => (
                  <Button 
                    key={index}
                    variant={selectedHotel === hotel.hotel ? "default" : "outline"}
                    className="whitespace-nowrap"
                    onClick={() => setSelectedHotel(hotel.hotel)}
                  >
                    {hotel.hotel}
                  </Button>
                ))}
                
                <Button 
                  variant="ghost" 
                  className="whitespace-nowrap"
                  onClick={() => handleOpenDetailedChart('hotel', 'Distribuição por Hotel', stats.hotelDistribution)}
                >
                  Ver Todos
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total de Feedbacks</h3>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-200">{filteredData.totalFeedbacks}</h2>
              </div>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                {selectedHotel ? `Feedbacks de ${selectedHotel}` : 'Feedbacks analisados'}
              </div>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
              <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Avaliação Média</h3>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">{filteredData.averageRating.toFixed(1)}</h2>
                <span className="text-2xl text-yellow-500">★</span>
              </div>
              <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                Escala de 1-5 estrelas
              </div>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Sentimento Positivo</h3>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-3xl font-bold text-green-800 dark:text-green-200">{filteredData.positiveSentiment}%</h2>
              </div>
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                Percentual de satisfação
              </div>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">Top Problema</h3>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200 truncate">
                  {filteredData.keywordDistribution[0]?.keyword || "N/A"}
                </h2>
              </div>
              <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                Problema mais mencionado
              </div>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative lg:col-span-2">
              <h3 className="text-lg font-medium mb-4">Tendência de Sentimento</h3>
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.sentimentTrend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="positive" stackId="1" stroke="#4CAF50" fill="#4CAF50" name="Positivo" />
                    <Area type="monotone" dataKey="neutral" stackId="1" stroke="#FFC107" fill="#FFC107" name="Neutro" />
                    <Area type="monotone" dataKey="negative" stackId="1" stroke="#F44336" fill="#F44336" name="Negativo" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative">
              <h3 className="text-lg font-medium mb-4">Distribuição de Avaliações</h3>
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRatingData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      name="Quantidade" 
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => handleItemClick({
                        type: 'rating',
                        value: data.rating.split(' ')[0],
                        data: data
                      })}
                      className="cursor-pointer"
                    >
                      <LabelList dataKey="count" position="top" />
                      {filteredRatingData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.rating.startsWith('5') ? '#2ecc71' : 
                                entry.rating.startsWith('4') ? '#27ae60' : 
                                entry.rating.startsWith('3') ? '#f39c12' : 
                                entry.rating.startsWith('2') ? '#e67e22' : 
                                '#e74c3c'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative">
              <h3 className="text-lg font-medium mb-4">Distribuição por Setor</h3>
              <div className="h-[300px] relative">
                {hasData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredData.sectorDistribution.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="sector" />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="count"
                        onClick={() => handleOpenDetailedChart('sector', 'Distribuição por Setor', filteredData.sectorDistribution)}
                        className="cursor-pointer"
                      >
                        {filteredData.sectorDistribution.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="right" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados suficientes
                  </div>
                )}
              </div>
            </Card>
            
            <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative">
              <h3 className="text-lg font-medium mb-4">Palavras-chave Principais</h3>
              <div className="h-[300px] flex flex-wrap gap-2 items-start justify-center p-4 overflow-auto bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/20 rounded-md">
                {filteredData.keywordDistribution.map((item, index) => {
                  const size = Math.max(0.8, Math.min(1.5, item.count / (filteredData.totalFeedbacks * 0.1)));
                  return (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer transition-all hover:shadow-md hover:scale-105 m-1"
                      style={{ 
                        fontSize: `${size}rem`,
                        padding: `${0.3 * size}rem ${0.6 * size}rem`,
                        backgroundColor: `${COLORS[index % COLORS.length]}20`,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleItemClick({
                        type: 'keyword',
                        value: item.keyword
                      })}
                    >
                      {item.keyword}
                    </Badge>
                  );
                })}
              </div>
            </Card>
            
            <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative lg:col-span-2">
              <h3 className="text-lg font-medium mb-4">Principais Problemas</h3>
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allFeedbacks
                      .filter(feedback => !selectedHotel || feedback.hotel === selectedHotel || feedback.source === selectedHotel)
                      .reduce((acc: {problem: string, count: number}[], feedback) => {
                        if (feedback.problem && feedback.problem !== 'Não identificado') {
                          const problems = feedback.problem.includes(';') 
                            ? feedback.problem.split(';').map(p => p.trim())
                            : [feedback.problem];
                            
                          problems.forEach(problem => {
                            if (problem !== 'Sem problemas') {
                              const existingProblem = acc.find(p => p.problem === problem);
                              if (existingProblem) {
                                existingProblem.count += 1;
                              } else {
                                acc.push({ problem, count: 1 });
                              }
                            }
                          });
                        }
                        return acc;
                      }, [])
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="problem" 
                      width={140}
                      tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="#F44336"
                      className="cursor-pointer"
                      onClick={(data) => handleItemClick({
                        type: 'problem',
                        value: data.problem
                      })}
                    >
                      <LabelList dataKey="count" position="right" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow relative">
              <h3 className="text-lg font-medium mb-4">Fonte dos Feedbacks</h3>
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.sourceDistribution}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={2}
                      fill="#8884d8"
                      onClick={(data) => handleItemClick({
                        type: 'source',
                        value: data.source,
                        data: data
                      })}
                      className="cursor-pointer"
                    >
                      {stats.sourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-medium mb-4">Feedbacks Recentes</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {allFeedbacks
                  .filter(feedback => !selectedHotel || feedback.hotel === selectedHotel || feedback.source === selectedHotel)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((feedback, index) => (
                    <Card key={index} className="p-4 border-l-4" style={{
                      borderLeftColor: feedback.sentiment === 'positive' ? '#4CAF50' :
                                        feedback.sentiment === 'negative' ? '#F44336' : '#FFC107'
                    }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{feedback.hotel || 'Hotel não especificado'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {feedback.source} • {new Date(feedback.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-1">{feedback.rating}</span>
                          <span className="text-yellow-500">★</span>
                        </div>

                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30">
                          {feedback.sector}
                        </Badge>
                        {feedback.problem && (
                          <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30">
                            {feedback.problem}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mt-2 line-clamp-2">{feedback.comment}</p>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </Card>

          <DetailedChartModal 
            title={detailedChartTitle}
            isOpen={isDetailedChartModalOpen}
            onClose={handleCloseDetailedChart}
            chartType={detailedChartType}
            data={detailedChartData}
            onItemClick={handleItemClick}
          />

          <InteractiveModal 
            title={selectedItem?.value?.toString() || ''}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            selectedItem={selectedItem}
            allFeedbacks={allFeedbacks}
          />
        </>
      )}
    </div>
  )
}

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    }
  }, [isAuthenticated, loading, router]);

  // Tela de carregamento enquanto decide para onde redirecionar
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

