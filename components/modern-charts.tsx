"use client";

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// Paleta de cores moderna e acessível
const MODERN_COLORS = {
  primary: [
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(16, 185, 129, 0.8)',   // Emerald
    'rgba(245, 158, 11, 0.8)',   // Amber
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(139, 92, 246, 0.8)',   // Violet
    'rgba(6, 182, 212, 0.8)',    // Cyan
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(34, 197, 94, 0.8)',    // Green
  ],
  borders: [
    'rgba(99, 102, 241, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(6, 182, 212, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(34, 197, 94, 1)',
  ],
  gradients: [
    'linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
    'linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(6, 182, 212, 0.8) 100%)',
    'linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(239, 68, 68, 0.8) 100%)',
  ],
  sentiment: {
    positive: 'rgba(34, 197, 94, 0.8)',   // Verde
    neutral: 'rgba(245, 158, 11, 0.8)',    // Amarelo
    negative: 'rgba(239, 68, 68, 0.8)',    // Vermelho
    positivo: 'rgba(34, 197, 94, 0.8)',    // Verde (português)
    neutro: 'rgba(245, 158, 11, 0.8)',     // Amarelo (português)
    negativo: 'rgba(239, 68, 68, 0.8)',    // Vermelho (português)
  },
  sentimentBorders: {
    positive: 'rgba(34, 197, 94, 1)',
    neutral: 'rgba(245, 158, 11, 1)',
    negative: 'rgba(239, 68, 68, 1)',
    positivo: 'rgba(34, 197, 94, 1)',
    neutro: 'rgba(245, 158, 11, 1)',
    negativo: 'rgba(239, 68, 68, 1)',
  }
};

// Configurações padrão para todos os gráficos
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
          weight: '500',
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      titleFont: {
        size: 14,
        weight: '600',
      },
      bodyFont: {
        size: 13,
      },
      displayColors: true,
      usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif',
        },
        color: 'rgba(0, 0, 0, 0.7)',
      },
    },
    y: {
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif',
        },
        color: 'rgba(0, 0, 0, 0.7)',
      },
    },
  },
};

interface ChartData {
  label: string;
  value: number;
  name?: string;
}

interface ModernChartProps {
  data: ChartData[];
  title?: string;
  type: 'bar' | 'horizontalBar' | 'pie' | 'doughnut' | 'line';
  onClick?: (item: ChartData, index: number) => void;
  height?: number;
  showValues?: boolean;
  maxItems?: number;
  isSentiment?: boolean;
}

export function ModernChart({ 
  data, 
  title, 
  type, 
  onClick, 
  height = 300, 
  showValues = false,
  maxItems,
  isSentiment 
}: ModernChartProps) {
  // Limitar dados se necessário
  const limitedData = maxItems ? data.slice(0, maxItems) : data;
  
  // Detectar automaticamente se é um gráfico de sentimento
  const isAutoSentiment = !isSentiment && limitedData.some(item => {
    const label = (item.name || item.label || '').toLowerCase();
    return label.includes('positiv') || label.includes('negativ') || label.includes('neutr') ||
           label.includes('positive') || label.includes('negative') || label.includes('neutral');
  });
  
  const shouldUseSentimentColors = isSentiment || isAutoSentiment;
  
  // Função para obter cor de sentimento
  const getSentimentColor = (label: string, isBackground = true) => {
    const normalizedLabel = label.toLowerCase();
    const colorMap = isBackground ? MODERN_COLORS.sentiment : MODERN_COLORS.sentimentBorders;
    
    if (normalizedLabel.includes('positiv')) return colorMap.positive;
    if (normalizedLabel.includes('negativ')) return colorMap.negative;
    if (normalizedLabel.includes('neutr')) return colorMap.neutral;
    
    // Fallback para cores padrão
    return isBackground ? MODERN_COLORS.primary[0] : MODERN_COLORS.borders[0];
  };
  
  // Preparar dados para Chart.js
  const chartData = {
    labels: limitedData.map(item => {
      const label = item.name || item.label || '';
      // Truncar labels muito longos
      return label && typeof label === 'string' && label.length > 20 ? label.substring(0, 17) + '...' : label;
    }),
    datasets: [
      {
        label: title || 'Dados',
        data: limitedData.map(item => item.value),
        backgroundColor: shouldUseSentimentColors
          ? limitedData.map(item => getSentimentColor(item.name || item.label || '', true))
          : (type === 'pie' || type === 'doughnut' 
            ? MODERN_COLORS.primary.slice(0, limitedData.length)
            : MODERN_COLORS.primary[0]),
        borderColor: shouldUseSentimentColors
          ? limitedData.map(item => getSentimentColor(item.name || item.label || '', false))
          : (type === 'pie' || type === 'doughnut'
            ? MODERN_COLORS.borders.slice(0, limitedData.length)
            : MODERN_COLORS.borders[0]),
        borderWidth: 2,
        borderRadius: type === 'bar' || type === 'horizontalBar' ? 6 : 0,
        borderSkipped: false,
        hoverBackgroundColor: shouldUseSentimentColors
          ? limitedData.map(item => getSentimentColor(item.name || item.label || '', true).replace('0.8', '0.9'))
          : (type === 'pie' || type === 'doughnut'
            ? MODERN_COLORS.primary.slice(0, limitedData.length).map(color => color.replace('0.8', '0.9'))
            : MODERN_COLORS.primary[0].replace('0.8', '0.9')),
        hoverBorderWidth: 3,
      },
    ],
  };

  // Configurações específicas por tipo de gráfico
  const getOptions = (): any => {
    const baseOptions = { ...defaultOptions };
    
    if (type === 'horizontalBar') {
      return {
        ...baseOptions,
        indexAxis: 'y' as const,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...baseOptions.plugins.legend,
            display: false,
          },
        },
        scales: {
          x: {
            ...baseOptions.scales.x,
            beginAtZero: true,
          },
          y: {
            ...baseOptions.scales.y,
            grid: {
              display: false,
            },
          },
        },
        onClick: onClick ? (event: any, elements: any[]) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            onClick(limitedData[index], index);
          }
        } : undefined,
      };
    }
    
    if (type === 'pie' || type === 'doughnut') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right' as const,
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 11,
                family: 'Inter, system-ui, sans-serif',
                weight: '500',
              },
              generateLabels: (chart: any) => {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label: string, i: number) => {
                    const value = data.datasets[0].data[i];
                    const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${label} (${percentage}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor[i],
                      lineWidth: 2,
                      pointStyle: 'circle',
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              },
            },
          },
        },
        onClick: onClick ? (event: any, elements: any[]) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            onClick(limitedData[index], index);
          }
        } : undefined,
      };
    }
    
    if (type === 'line') {
      return {
        ...baseOptions,
        elements: {
          line: {
            tension: 0.4,
            borderWidth: 3,
          },
          point: {
            radius: 6,
            hoverRadius: 8,
            borderWidth: 2,
            backgroundColor: 'white',
          },
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...baseOptions.plugins.legend,
            display: false,
          },
        },
        onClick: onClick ? (event: any, elements: any[]) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            onClick(limitedData[index], index);
          }
        } : undefined,
      };
    }
    
    // Bar chart padrão
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins.legend,
          display: false,
        },
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          beginAtZero: true,
        },
      },
      onClick: onClick ? (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          onClick(limitedData[index], index);
        }
      } : undefined,
    };
  };

  const renderChart = () => {
    const options = getOptions();
    
    switch (type) {
      case 'horizontalBar':
        return <Bar data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={options} />;
      case 'line':
        return <Line data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {renderChart()}
    </div>
  );
}

// Componente específico para gráfico de problemas (horizontal)
export function ProblemsChart({ data, onClick, maxItems = 8 }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
  maxItems?: number;
}) {
  return (
    <ModernChart
      data={data}
      type="horizontalBar"
      onClick={onClick}
      height={Math.max(300, maxItems * 40)}
      maxItems={maxItems}
    />
  );
}

// Componente específico para gráfico de avaliações
export function RatingsChart({ data, onClick }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
}) {
  return (
    <ModernChart
      data={data}
      type="bar"
      onClick={onClick}
      height={300}
    />
  );
}

// Componente específico para gráfico de departamentos (pizza)
export function DepartmentsChart({ data, onClick }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
}) {
  return (
    <ModernChart
      data={data}
      type="doughnut"
      onClick={onClick}
      height={350}
    />
  );
}

// Componente específico para gráfico de hotéis
export function HotelsChart({ data, onClick }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
}) {
  return (
    <ModernChart
      data={data}
      type="bar"
      onClick={onClick}
      height={400}
    />
  );
}

// Componente específico para gráfico de palavras-chave
export function KeywordsChart({ data, onClick, maxItems = 10 }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
  maxItems?: number;
}) {
  return (
    <ModernChart
      data={data}
      type="horizontalBar"
      onClick={onClick}
      height={Math.max(300, maxItems * 35)}
      maxItems={maxItems}
    />
  );
}

// Componente específico para gráfico de apartamentos
export function ApartmentsChart({ data, onClick, maxItems = 8 }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
  maxItems?: number;
}) {
  return (
    <ModernChart
      data={data}
      type="bar"
      onClick={onClick}
      height={300}
      maxItems={maxItems}
    />
  );
}

// Componente específico para gráfico de fontes (pizza)
export function SourcesChart({ data, onClick }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
}) {
  return (
    <ModernChart
      data={data}
      type="pie"
      onClick={onClick}
      height={300}
    />
  );
}