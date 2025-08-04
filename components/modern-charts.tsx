"use client";

import React, { useState, useEffect } from 'react';
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
    'rgba(251, 113, 133, 0.8)',  // Rose
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(14, 165, 233, 0.8)',   // Sky Blue
    'rgba(34, 211, 238, 0.8)',   // Light Blue
    'rgba(52, 211, 153, 0.8)',   // Teal
    'rgba(132, 204, 22, 0.8)',   // Lime
    'rgba(251, 191, 36, 0.8)',   // Yellow
    'rgba(251, 146, 60, 0.8)',   // Orange
    'rgba(248, 113, 113, 0.8)',  // Light Red
    'rgba(196, 181, 253, 0.8)',  // Light Purple
    'rgba(147, 197, 253, 0.8)',  // Light Blue 2
    'rgba(110, 231, 183, 0.8)',  // Light Green
    'rgba(254, 215, 170, 0.8)',  // Peach
    'rgba(252, 165, 165, 0.8)',  // Light Pink
    'rgba(167, 139, 250, 0.8)',  // Medium Purple
    'rgba(96, 165, 250, 0.8)',   // Medium Blue
    'rgba(74, 222, 128, 0.8)',   // Medium Green
    'rgba(251, 207, 232, 0.8)',  // Very Light Pink
    'rgba(196, 164, 132, 0.8)',  // Brown
    'rgba(156, 163, 175, 0.8)',  // Gray
    'rgba(75, 85, 99, 0.8)',     // Dark Gray
    'rgba(220, 38, 127, 0.8)',   // Deep Pink
    'rgba(147, 51, 234, 0.8)',   // Deep Purple
    'rgba(29, 78, 216, 0.8)',    // Deep Blue
    'rgba(5, 150, 105, 0.8)',    // Deep Green
    'rgba(217, 119, 6, 0.8)',    // Deep Orange
    'rgba(185, 28, 28, 0.8)',    // Deep Red
    'rgba(120, 113, 108, 0.8)',  // Stone
    'rgba(87, 83, 78, 0.8)',     // Dark Stone
    'rgba(254, 240, 138, 0.8)',  // Light Yellow
    'rgba(187, 247, 208, 0.8)',  // Very Light Green
    'rgba(165, 243, 252, 0.8)',  // Very Light Cyan
    'rgba(233, 213, 255, 0.8)',  // Very Light Purple
    'rgba(254, 202, 202, 0.8)',  // Very Light Red
    'rgba(255, 237, 213, 0.8)',  // Very Light Orange
    'rgba(219, 234, 254, 0.8)',  // Very Light Blue
    'rgba(240, 253, 244, 0.8)',  // Very Light Green 2
    'rgba(67, 56, 202, 0.8)',    // Indigo Dark
    'rgba(91, 33, 182, 0.8)',    // Purple Dark
    'rgba(190, 18, 60, 0.8)',    // Rose Dark
    'rgba(15, 118, 110, 0.8)',   // Teal Dark
    'rgba(101, 163, 13, 0.8)',   // Lime Dark
    'rgba(202, 138, 4, 0.8)',    // Yellow Dark
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
    'rgba(251, 113, 133, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(14, 165, 233, 1)',
    'rgba(34, 211, 238, 1)',
    'rgba(52, 211, 153, 1)',
    'rgba(132, 204, 22, 1)',
    'rgba(251, 191, 36, 1)',
    'rgba(251, 146, 60, 1)',
    'rgba(248, 113, 113, 1)',
    'rgba(196, 181, 253, 1)',
    'rgba(147, 197, 253, 1)',
    'rgba(110, 231, 183, 1)',
    'rgba(254, 215, 170, 1)',
    'rgba(252, 165, 165, 1)',
    'rgba(167, 139, 250, 1)',
    'rgba(96, 165, 250, 1)',
    'rgba(74, 222, 128, 1)',
    'rgba(251, 207, 232, 1)',
    'rgba(196, 164, 132, 1)',
    'rgba(156, 163, 175, 1)',
    'rgba(75, 85, 99, 1)',
    'rgba(220, 38, 127, 1)',
    'rgba(147, 51, 234, 1)',
    'rgba(29, 78, 216, 1)',
    'rgba(5, 150, 105, 1)',
    'rgba(217, 119, 6, 1)',
    'rgba(185, 28, 28, 1)',
    'rgba(120, 113, 108, 1)',
    'rgba(87, 83, 78, 1)',
    'rgba(254, 240, 138, 1)',
    'rgba(187, 247, 208, 1)',
    'rgba(165, 243, 252, 1)',
    'rgba(233, 213, 255, 1)',
    'rgba(254, 202, 202, 1)',
    'rgba(255, 237, 213, 1)',
    'rgba(219, 234, 254, 1)',
    'rgba(240, 253, 244, 1)',
    'rgba(67, 56, 202, 1)',
    'rgba(91, 33, 182, 1)',
    'rgba(190, 18, 60, 1)',
    'rgba(15, 118, 110, 1)',
    'rgba(101, 163, 13, 1)',
    'rgba(202, 138, 4, 1)',
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
// Função para detectar se está no modo escuro
const isDarkMode = () => {
  if (typeof window !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  return false;
};

// Função para obter opções baseadas no tema
const getThemeAwareOptions = () => {
  const isDark = isDarkMode();
  
  return {
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
          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? 'white' : 'black',
        bodyColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
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
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif',
          },
          color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        },
      },
      y: {
        grid: {
          display: true,
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif',
          },
          color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        },
      },
    },
  };
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
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setThemeKey(prev => prev + 1);
        }
      });
    });

    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => observer.disconnect();
  }, []);
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
    const baseOptions = { ...getThemeAwareOptions() };
    
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
      const isDark = isDarkMode();
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
              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
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
      const isDark = isDarkMode();
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
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'white',
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
        return <Bar key={themeKey} data={chartData} options={options} />;
      case 'pie':
        return <Pie key={themeKey} data={chartData} options={options} />;
      case 'doughnut':
        return <Doughnut key={themeKey} data={chartData} options={options} />;
      case 'line':
        return <Line key={themeKey} data={chartData} options={options} />;
      default:
        return <Bar key={themeKey} data={chartData} options={options} />;
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-4" style={{ minHeight: `${height + 80}px` }}>
      <div className="w-full max-w-full" style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
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
      height={350}
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
      height={400}
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
      height={350}
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
      height={400}
    />
  );
}