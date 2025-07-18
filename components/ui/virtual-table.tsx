"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { ScrollArea } from './scroll-area';
// Função para calcular itens visíveis em virtual scroll
const calculateVisibleItems = (
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  buffer: number = 5
) => {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(startIndex + visibleCount + buffer * 2);
  
  return { startIndex, endIndex, visibleCount };
};

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemHeight?: number;
  height?: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
  bufferSize?: number;
}

export function VirtualTable<T>({
  data,
  columns,
  itemHeight = 50,
  height = 400,
  onRowClick,
  className = "",
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  bufferSize = 5
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(height);

  // Calcular itens visíveis usando a função otimizada
  const { startIndex, endIndex, visibleCount } = useMemo(() => {
    return calculateVisibleItems(containerHeight, itemHeight, scrollTop, bufferSize);
  }, [containerHeight, itemHeight, scrollTop, bufferSize]);

  // Dados visíveis (apenas os que estão na viewport + buffer)
  const visibleData = useMemo(() => {
    const actualEndIndex = Math.min(endIndex, data.length);
    return data.slice(startIndex, actualEndIndex).map((item, index) => ({
      item,
      originalIndex: startIndex + index
    }));
  }, [data, startIndex, endIndex]);

  // Total height da tabela virtual
  const totalHeight = data.length * itemHeight;

  // Offset para posicionar os itens visíveis corretamente
  const offsetY = startIndex * itemHeight;

  // Handle scroll otimizado com throttle
  const handleScroll = useMemo(() => {
    let ticking = false;
    
    return (e: React.UIEvent<HTMLDivElement>) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollTop(e.currentTarget.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };
  }, []);

  // Observar mudanças no tamanho do container
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    if (scrollElementRef.current) {
      resizeObserver.observe(scrollElementRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Renderizar célula otimizada
  const renderCell = (column: Column<T>, item: T, originalIndex: number) => {
    if (column.render) {
      return column.render(item, originalIndex);
    }
    
    const value = column.key === 'index' ? originalIndex + 1 : (item as any)[column.key];
    return value?.toString() || '';
  };

  if (loading) {
    return (
      <div className={`border rounded-lg ${className}`} style={{ height }}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  style={{ width: column.width }}
                  className={column.className}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`border rounded-lg ${className}`} style={{ height }}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  style={{ width: column.width }}
                  className={column.className}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`} style={{ height }}>
      {/* Header fixo */}
      <div className="border-b bg-muted/50">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  style={{ width: column.width }}
                  className={column.className}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
      </div>

      {/* Área de scroll virtualizada */}
      <div 
        ref={scrollElementRef}
        className="overflow-auto"
        style={{ height: height - 41 }} // Subtrair altura do header
        onScroll={handleScroll}
      >
        {/* Container virtual com altura total */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Tabela com apenas itens visíveis */}
          <div
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
            }}
          >
            <Table>
              <TableBody>
                {visibleData.map(({ item, originalIndex }, index) => (
                  <TableRow
                    key={originalIndex}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    style={{ height: itemHeight }}
                    onClick={() => onRowClick?.(item, originalIndex)}
                  >
                    {columns.map((column, colIndex) => (
                      <TableCell 
                        key={colIndex}
                        style={{ width: column.width }}
                        className={`${column.className || ''} py-2`}
                      >
                        {renderCell(column, item, originalIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Informações de performance (só em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="border-t bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
          Renderizando {visibleData.length} de {data.length} itens 
          (índices {startIndex}-{Math.min(endIndex, data.length - 1)})
        </div>
      )}
    </div>
  );
}

// Hook para usar com filtros otimizados
export function useVirtualTableData<T>(
  originalData: T[],
  filters: Record<string, any>,
  searchTerm: string = '',
  searchFields: (keyof T)[] = []
) {
  const filteredData = useMemo(() => {
    let result = originalData;

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter((item: any) => {
          const itemValue = item[key];
          if (typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      }
    });

    // Aplicar busca de texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((item: any) => {
        return searchFields.some(field => {
          const fieldValue = item[field];
          return fieldValue?.toString().toLowerCase().includes(searchLower);
        });
      });
    }

    return result;
  }, [originalData, filters, searchTerm, searchFields]);

  return filteredData;
}

// Componente otimizado para listas simples (não tabelas)
interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  height: number;
  className?: string;
  gap?: number;
}

export function VirtualList<T>({
  data,
  renderItem,
  itemHeight,
  height,
  className = "",
  gap = 0
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const effectiveItemHeight = itemHeight + gap;
  const { startIndex, endIndex } = calculateVisibleItems(
    height, 
    effectiveItemHeight, 
    scrollTop, 
    3
  );

  const visibleData = useMemo(() => {
    const actualEndIndex = Math.min(endIndex, data.length);
    return data.slice(startIndex, actualEndIndex).map((item, index) => ({
      item,
      originalIndex: startIndex + index
    }));
  }, [data, startIndex, endIndex]);

  const totalHeight = data.length * effectiveItemHeight;
  const offsetY = startIndex * effectiveItemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div 
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleData.map(({ item, originalIndex }) => (
            <div
              key={originalIndex}
              style={{ 
                height: itemHeight, 
                marginBottom: gap 
              }}
            >
              {renderItem(item, originalIndex)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 