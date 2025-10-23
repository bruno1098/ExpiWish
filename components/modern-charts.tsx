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
  // Cores específicas por categoria
  categories: {
    department: {
      background: 'rgba(99, 102, 241, 0.8)',   // Indigo (fallback para departamentos)
      border: 'rgba(99, 102, 241, 1)',
      hover: 'rgba(99, 102, 241, 0.9)'
    },
    keyword: {
      background: 'rgba(16, 185, 129, 0.8)',   // Emerald para palavras-chave
      border: 'rgba(16, 185, 129, 1)',
      hover: 'rgba(16, 185, 129, 0.9)'
    },
    // Problemas terão cores por item, então este bloco é só fallback
    problem: {
      background: 'rgba(96, 165, 250, 0.8)',   // Azul médio como fallback
      border: 'rgba(96, 165, 250, 1)',
      hover: 'rgba(96, 165, 250, 0.9)'
    },
    language: {
      background: 'rgba(245, 158, 11, 0.8)',   // Amber para idiomas
      border: 'rgba(245, 158, 11, 1)',
      hover: 'rgba(245, 158, 11, 0.9)'
    },
    source: {
      background: 'rgba(139, 92, 246, 0.8)',   // Violet para fontes
      border: 'rgba(139, 92, 246, 1)',
      hover: 'rgba(139, 92, 246, 0.9)'
    },
    rating: {
      background: 'rgba(59, 130, 246, 0.8)',   // Azul para avaliações
      border: 'rgba(59, 130, 246, 1)',
      hover: 'rgba(59, 130, 246, 0.9)'
    },
    apartment: {
      background: 'rgba(99, 102, 241, 0.8)',   // Indigo para apartamentos
      border: 'rgba(99, 102, 241, 1)',
      hover: 'rgba(99, 102, 241, 0.9)'
    }
  },
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

// Mapa de cores por rating específico
const RATING_COLORS: Record<number, string> = {
  1: 'rgba(239, 68, 68, 0.8)',   // Vermelho
  2: 'rgba(251, 146, 60, 0.8)',  // Laranja
  3: 'rgba(245, 158, 11, 0.8)',  // Amarelo
  4: 'rgba(34, 197, 94, 0.8)',   // Verde
  5: 'rgba(59, 130, 246, 0.8)',  // Azul
};

const RATING_BORDER_COLORS: Record<number, string> = {
  1: 'rgba(239, 68, 68, 1)',
  2: 'rgba(251, 146, 60, 1)',
  3: 'rgba(245, 158, 11, 1)',
  4: 'rgba(34, 197, 94, 1)',
  5: 'rgba(59, 130, 246, 1)',
};

// Cores por setor de problema (alinhadas com o restante do admin)
const PROBLEM_SECTOR_COLORS: Record<string, string> = {
  'A&B': 'rgba(14, 165, 233, 0.85)',          // Sky Blue (mais distinto de Lazer)
  'Governança': 'rgba(239, 68, 68, 0.85)',    // Red
  'Manutenção': 'rgba(245, 158, 11, 0.85)',   // Amber
  'Recepção': 'rgba(6, 182, 212, 0.85)',      // Cyan
  'TI': 'rgba(139, 92, 246, 0.85)',           // Violet
  'Lazer': 'rgba(34, 197, 94, 0.85)',         // Green
  'Operações': 'rgba(251, 146, 60, 0.85)',    // Orange
  'Produto': 'rgba(67, 56, 202, 0.85)',       // Indigo Dark (mais contraste)
  'Corporativo': 'rgba(236, 72, 153, 0.85)',  // Pink
  'EG': 'rgba(190, 18, 60, 0.85)',            // Rose Dark
  'Outros': 'rgba(156, 163, 175, 0.85)',      // Gray
};

const PROBLEM_SECTOR_BORDERS: Record<string, string> = {
  'A&B': 'rgba(14, 165, 233, 1)',
  'Governança': 'rgba(239, 68, 68, 1)',
  'Manutenção': 'rgba(245, 158, 11, 1)',
  'Recepção': 'rgba(6, 182, 212, 1)',
  'TI': 'rgba(139, 92, 246, 1)',
  'Lazer': 'rgba(34, 197, 94, 1)',
  'Operações': 'rgba(251, 146, 60, 1)',
  'Produto': 'rgba(67, 56, 202, 1)',
  'Corporativo': 'rgba(236, 72, 153, 1)',
  'EG': 'rgba(190, 18, 60, 1)',
  'Outros': 'rgba(156, 163, 175, 1)',
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
  categoryType?: 'department' | 'keyword' | 'language' | 'source' | 'rating' | 'problem' | 'apartment';
  // Linhas de feedback atuais para contextualizar tooltips
  contextRows?: any[];
}

export function ModernChart({ 
  data, 
  title, 
  type, 
  onClick, 
  height = 300, 
  showValues = false,
  maxItems,
  isSentiment,
  categoryType,
  contextRows
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
    const labelValue = item.name || item.label || '';
    const label = typeof labelValue === 'string' ? labelValue.toLowerCase() : String(labelValue).toLowerCase();
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
  
  // Detecta setor pelo início do label (antes do " - ")
  const extractProblemSector = (rawLabel: string): string => {
    if (!rawLabel) return 'Outros';
    const base = rawLabel.split(';')[0]; // se houver concatenação
    const first = base.split('-')[0].trim();
    const normalized = first.toLowerCase();
    if (normalized.startsWith('a&b')) return 'A&B';
    if (normalized.startsWith('gover') || normalized.startsWith('limpeza')) return 'Governança';
    if (normalized.startsWith('manuten')) return 'Manutenção';
    if (normalized.startsWith('recep')) return 'Recepção';
    if (normalized === 'ti' || normalized.startsWith('ti')) return 'TI';
    if (normalized.startsWith('lazer')) return 'Lazer';
    if (normalized.startsWith('opera')) return 'Operações';
    if (normalized.startsWith('produto')) return 'Produto';
    if (normalized.startsWith('corpor')) return 'Corporativo';
    if (normalized.startsWith('eg')) return 'EG';
    return first || 'Outros';
  };

  // Função para obter cores por categoria
  const getCategoryColors = () => {
    if (shouldUseSentimentColors) {
      return {
        background: limitedData.map(item => getSentimentColor(item.name || item.label || '', true)),
        border: limitedData.map(item => getSentimentColor(item.name || item.label || '', false)),
        hover: limitedData.map(item => getSentimentColor(item.name || item.label || '', true).replace('0.8', '0.9'))
      };
    }

    // Problemas: cores por item com base no setor
    if (categoryType === 'problem') {
      const backgrounds = limitedData.map(item => {
        const sector = extractProblemSector(String(item.name || item.label || ''));
        return PROBLEM_SECTOR_COLORS[sector] || PROBLEM_SECTOR_COLORS['Outros'];
      });
      const borders = limitedData.map(item => {
        const sector = extractProblemSector(String(item.name || item.label || ''));
        return PROBLEM_SECTOR_BORDERS[sector] || PROBLEM_SECTOR_BORDERS['Outros'];
      });
      return {
        background: backgrounds,
        border: borders,
        hover: backgrounds.map(c => c.replace('0.8', '0.9')),
      };
    }

    // Departamentos: cores específicas por área
    if (categoryType === 'department') {
      const backgrounds = limitedData.map(item => {
        const label = String(item.name || item.label || '');
        const sector = extractProblemSector(label);
        return PROBLEM_SECTOR_COLORS[sector] || PROBLEM_SECTOR_COLORS['Outros'];
      });
      const borders = limitedData.map(item => {
        const label = String(item.name || item.label || '');
        const sector = extractProblemSector(label);
        return PROBLEM_SECTOR_BORDERS[sector] || PROBLEM_SECTOR_BORDERS['Outros'];
      });
      return {
        background: backgrounds,
        border: borders,
        hover: backgrounds.map(c => c.replace('0.8', '0.9')),
      };
    }

    // Avaliações: cores por estrela
    if (categoryType === 'rating') {
      const getRatingFromLabel = (raw: string): number => {
        const match = raw.match(/(\d+)/);
        const num = match ? parseInt(match[1], 10) : NaN;
        if (Number.isNaN(num) || num < 1 || num > 5) return 0;
        return num as 1|2|3|4|5;
      };
      const backgrounds = limitedData.map(item => {
        const label = String(item.name || item.label || '');
        const r = getRatingFromLabel(label);
        return RATING_COLORS[r] || MODERN_COLORS.categories.rating.background;
      });
      const borders = limitedData.map(item => {
        const label = String(item.name || item.label || '');
        const r = getRatingFromLabel(label);
        return RATING_BORDER_COLORS[r] || MODERN_COLORS.categories.rating.border;
      });
      return {
        background: backgrounds,
        border: borders,
        hover: backgrounds.map(c => c.replace('0.8', '0.9')),
      };
    }

    if (categoryType && MODERN_COLORS.categories[categoryType]) {
      const categoryColors = MODERN_COLORS.categories[categoryType];
      return {
        background: type === 'pie' || type === 'doughnut' 
          ? MODERN_COLORS.primary.slice(0, limitedData.length) // Usar cores diferentes para pizza
          : categoryColors.background,
        border: type === 'pie' || type === 'doughnut'
          ? MODERN_COLORS.borders.slice(0, limitedData.length) // Usar bordas diferentes para pizza
          : categoryColors.border,
        hover: type === 'pie' || type === 'doughnut'
          ? MODERN_COLORS.primary.slice(0, limitedData.length).map(color => color.replace('0.8', '0.9')) // Hover diferentes para pizza
          : categoryColors.hover
      };
    }
    
    // Cores padrão
    return {
      background: type === 'pie' || type === 'doughnut' 
        ? MODERN_COLORS.primary.slice(0, limitedData.length)
        : MODERN_COLORS.primary[0],
      border: type === 'pie' || type === 'doughnut'
        ? MODERN_COLORS.borders.slice(0, limitedData.length)
        : MODERN_COLORS.borders[0],
      hover: type === 'pie' || type === 'doughnut'
        ? MODERN_COLORS.primary.slice(0, limitedData.length).map(color => color.replace('0.8', '0.9'))
        : MODERN_COLORS.primary[0].replace('0.8', '0.9')
    };
  };
  
  const colors = getCategoryColors();

  // Preparar dados para Chart.js
  const chartData = {
    labels: limitedData.map(item => {
      const label = item.name || item.label || '';
      // Exibir labels completos sem truncar
      return label;
    }),
    datasets: [
      {
        label: title || 'Dados',
        data: limitedData.map(item => item.value),
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 2,
        borderRadius: type === 'bar' || type === 'horizontalBar' ? 6 : 0,
        borderSkipped: false,
        hoverBackgroundColor: colors.hover,
        hoverBorderWidth: 3,
        barThickness: type === 'horizontalBar' ? 22 : undefined,
      },
    ],
  };

  // Configurações específicas por tipo de gráfico
  const getOptions = (): any => {
    const baseOptions = { ...getThemeAwareOptions() };

    // Utilitário para quebrar linhas de labels longos
    const wrapLabel = (text: string, max = 24): string[] | string => {
      if (!text || typeof text !== 'string') return text;
      if (text.length <= max) return text;
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const w of words) {
        if ((current + (current ? ' ' : '') + w).length > max) {
          if (current) lines.push(current);
          current = w;
        } else {
          current = current ? current + ' ' + w : w;
        }
      }
      if (current) lines.push(current);
      return lines;
    };
    
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
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (context: any) => {
                try {
                  // Em gráficos horizontais do Chart.js, context.parsed pode ser um objeto {x, y}
                  // Usamos o valor numérico (raw/x) para evitar "[object Object]" no tooltip
                  const parsedValue =
                    typeof context.raw === 'number'
                      ? context.raw
                      : typeof context.parsed === 'object'
                        ? (context.parsed?.x ?? context.parsed?.y ?? 0)
                        : context.parsed;
                  const base = `${context.label}: ${parsedValue}`;
                  // Somente para problemas com contexto
                  if (categoryType !== 'problem' || !contextRows || !Array.isArray(contextRows) || contextRows.length === 0) {
                    return base;
                  }
                  const idx = context.dataIndex ?? context.index;
                  const label = String(limitedData[idx]?.name || limitedData[idx]?.label || context.label || '');
                  const rows = contextRows.filter((r: any) => matchesProblemLabel(r, label));
                  if (!rows.length) return base;
                  const details = aggregateProblemDetails(rows, label);
                  if (!details.length) return base;
                  const lines = [base, '', 'Detalhes mais citados:'];
                  details.forEach(d => {
                    lines.push(`${d.detail} • ${d.count} (${d.pct.toFixed(0)}%)`);
                  });
                  // Embora Chart.js aceite string[], alguns temas podem não renderizar corretamente.
                  // Mantemos apenas a linha base aqui; os detalhes são exibidos via afterBody.
                  return base;
                } catch {
                  return `${context.label}: ${context.parsed}`;
                }
              },
              // Mantém o label padrão e adiciona detalhes após o corpo
              afterBody: (items: any[]) => {
                try {
                  if (!items || !items.length) return [];
                  const idx = items[0].dataIndex ?? items[0].index;
                  const label = String(limitedData[idx]?.name || limitedData[idx]?.label || '');

                  // Tooltips ricos para apartamentos
                  if (categoryType === 'apartment' && Array.isArray(contextRows) && contextRows.length) {
                    const aptLabelNormalized = label.replace(/^Apt\s+/i, '').trim();
                    const found = contextRows.find((d: any) => {
                      const dNorm = String(d.apartamento).replace(/^Apt\s+/i, '').trim();
                      return dNorm === aptLabelNormalized || `Apt ${dNorm}` === label;
                    });
                    if (!found) return [];
                    const problemTotal = typeof found.problemsTotal === 'number'
                      ? found.problemsTotal
                      : (Array.isArray(found.topProblems) ? found.topProblems.reduce((acc: number, p: any) => acc + (p?.count || 0), 0) : 0);
                    const principal = Array.isArray(found.topProblems) && found.topProblems.length ? found.topProblems[0] : null;
                    const lines: string[] = [
                      `Hotel: ${found.mainHotel}`,
                      `Problemas: ${problemTotal}`,
                      `Média de estrelas: ${Number(found.averageRating).toFixed(1)}`,
                      principal ? `Principal problema: ${principal.problem} (${principal.count})` : 'Principal problema: —',
                    ];
                    if (Array.isArray(found.topProblems) && found.topProblems.length > 1) {
                      lines.push('Outros problemas:');
                      found.topProblems.slice(1, 3).forEach((p: any) => {
                        lines.push(`${p.problem} • ${p.count}`);
                      });
                    }
                    return lines;
                  }

                  // Apenas para gráficos de problema quando há contexto disponível
                  if (categoryType !== 'problem' || !contextRows || !Array.isArray(contextRows) || contextRows.length === 0) {
                    return [];
                  }
                  const rows = contextRows.filter((r: any) => matchesProblemLabel(r, label));
                  if (!rows.length) return [];
                  const details = aggregateProblemDetails(rows, label);
                  if (!details.length) return [];
                  const header = 'Detalhes mais citados:';
                  const lines = details.map(d => `${d.detail} • ${d.count} (${d.pct.toFixed(0)}%)`);
                  return [header, ...lines];
                } catch {
                  return [];
                }
              },
            },
          },
        },
        layout: { padding: { left: 12, right: 6, top: 6, bottom: 6 } },
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
            // Melhorar legibilidade com quebras de linha e leve padding
            ticks: {
              ...baseOptions.scales.y.ticks,
              padding: 6,
              callback: (value: any, index: number) => {
                const raw = String(limitedData[index]?.name || limitedData[index]?.label || value || '');
                return wrapLabel(raw, 28);
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
export function ProblemsChart({ data, onClick, maxItems = 8, contextRows }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
  maxItems?: number;
  contextRows?: any[];
}) {
  return (
    <ModernChart
      data={data}
      type="horizontalBar"
      onClick={onClick}
      height={Math.max(300, maxItems * 40)}
      maxItems={maxItems}
      categoryType="problem"
      contextRows={contextRows}
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
      categoryType="rating"
    />
  );
}

// Componente específico para gráfico de departamentos (pizza)
export function DepartmentsChart({ data, onClick, maxItems }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
  maxItems?: number;
}) {
  return (
    <ModernChart
      data={data}
      type="doughnut"
      onClick={onClick}
      height={400}
      categoryType="department"
      maxItems={maxItems}
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
      categoryType="keyword"
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
export function SourcesChart({ data, onClick, categoryType }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
  categoryType?: 'department' | 'keyword' | 'language' | 'source';
}) {
  return (
    <ModernChart
      data={data}
      type="pie"
      onClick={onClick}
      height={400}
      categoryType={categoryType || "source"}
    />
  );
}

// Componente para gráfico de tendência de problemas
export function ProblemsTrendChart({ data, onClick }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
}) {
  return (
    <ModernChart 
      data={data} 
      type="line" 
      onClick={onClick}
      height={350}
    />
  );
}

// Componente para gráfico de problemas por sentimento
export function ProblemsBySentimentChart({ data, onClick }: {
  data: ChartData[];
  onClick?: (item: ChartData, index: number) => void;
}) {
  return (
    <ModernChart 
      data={data} 
      type="bar" 
      onClick={onClick}
      isSentiment={true}
      height={350}
    />
  );
}

// Componente para gráfico de distribuição de problemas por categoria
export function ProblemsDistributionChart({ data, onClick }: {
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
    // ===== Tooltip helpers com contexto =====
    const normalize = (v: any): string => {
      if (!v) return '';
      const s = String(v)
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // remove acentos
      return s;
    };
    const extractProblemLabelName = (raw: string): string => {
      if (!raw) return '';
      const s = String(raw);
      const normalizedDash = s.replace(' – ', ' - ');
      const parts = normalizedDash.split('-');
      if (parts.length > 1) {
        // usa parte após o primeiro "-" como nome do problema
        return parts.slice(1).join('-').trim();
      }
      return s.trim();
    };
    const extractLabelParts = (raw: string): { department: string; problem: string } => {
      if (!raw) return { department: '', problem: '' };
      const s = String(raw).replace(' – ', ' - ');
      const parts = s.split('-');
      const department = (parts[0] || '').trim();
      const problem = parts.length > 1 ? parts.slice(1).join('-').trim() : '';
      return { department, problem };
    };
    const matchesProblemLabel = (row: any, label: string): boolean => {
      try {
        const { department, problem } = extractLabelParts(label);
        const depTarget = normalize(department);
        const probTarget = normalize(problem);
        if (!probTarget || !depTarget) return false;
        // Preferir estrutura com allProblems
        if (Array.isArray(row?.allProblems)) {
          return row.allProblems.some((p: any) => {
            const pMain = normalize(p?.problem);
            const pDept = normalize(p?.sector ?? p?.department);
            return pDept === depTarget && pMain.includes(probTarget);
          });
        }
        // Fallback: checar setor e problema nos campos simples
        const sectorRaw = String(row?.sector || row?.department || '').trim();
        const sectors = sectorRaw
          ? sectorRaw.split(/[;,|]/).map((s: string) => normalize(s))
          : [];
        const sectorMatches = sectors.includes(depTarget);
        if (!sectorMatches) return false;
        const main = normalize(row?.problem_main ?? '');
        if (main && main.includes(probTarget)) return true;
        if (typeof row?.problem === 'string') {
          const parts = row.problem.split(';').map((s: string) => normalize(extractProblemLabelName(s)));
          return parts.some((s: string) => s.includes(probTarget));
        }
        return false;
      } catch {
        return false;
      }
    };
    const aggregateProblemDetails = (rows: any[], selectedLabel?: string) => {
      const map = new Map<string, { detail: string; count: number; ratingSum: number }>();
      const parts = selectedLabel ? extractLabelParts(selectedLabel) : { department: '', problem: '' };
      const depTarget = normalize(parts.department);
      const probTarget = normalize(parts.problem);
      for (const r of rows) {
        if (Array.isArray(r?.allProblems) && depTarget && probTarget) {
          for (const p of r.allProblems) {
            const pMain = normalize(p?.problem);
            const pDept = normalize(p?.sector ?? p?.department);
            if (!pMain || !pDept || pDept !== depTarget || !pMain.includes(probTarget)) continue;
            const det = String(p?.problem_detail ?? '').trim();
            if (!det) continue;
            const key = normalize(det);
            const rating = parseFloat(String(r?.rating ?? r?.rating_value ?? 0)) || 0;
            const prev = map.get(key);
            if (prev) {
              prev.count += 1;
              prev.ratingSum += rating;
            } else {
              map.set(key, { detail: det, count: 1, ratingSum: rating });
            }
          }
          continue;
        }
        if (depTarget && probTarget) {
          const sectorRaw = String(r?.sector || r?.department || '').trim();
          const sectors = sectorRaw
            ? sectorRaw.split(/[;,|]/).map((s: string) => normalize(s))
            : [];
          const sectorMatches = sectors.includes(depTarget);
          if (!sectorMatches) continue;
          const main = normalize(r?.problem_main ?? '');
          const list = typeof r?.problem === 'string'
            ? r.problem.split(';').map((s: string) => normalize(extractProblemLabelName(s)))
            : [];
          const matches = (main && main.includes(probTarget)) || list.some((s: string) => s.includes(probTarget));
          if (!matches) continue;
        }
        const det = String(r?.problem_detail ?? '').trim();
        if (!det) continue;
        const key = normalize(det);
        const rating = parseFloat(String(r?.rating ?? r?.rating_value ?? 0)) || 0;
        const prev = map.get(key);
        if (prev) {
          prev.count += 1;
          prev.ratingSum += rating;
        } else {
          map.set(key, { detail: det, count: 1, ratingSum: rating });
        }
      }
      const total = rows.length || 1;
      const agg = Array.from(map.values()).map(v => ({
        detail: v.detail,
        count: v.count,
        avg: v.ratingSum && v.count ? (v.ratingSum / v.count) : 0,
        pct: (v.count / total) * 100,
      }));
      agg.sort((a, b) => b.count - a.count || b.pct - a.pct);
      return agg.slice(0, 4); // top 4 detalhes
    };