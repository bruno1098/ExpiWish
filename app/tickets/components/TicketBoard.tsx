"use client";

import React, { useState, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { DragDropWrapper } from './DragDropWrapper';
import { DroppableColumn, DraggableTicket } from './DragDropComponents';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Plus,
  AlertTriangle,
  Play,
  CheckCircle,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Ticket, 
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS 
} from '@/types/ticket';
import { TicketCard } from './TicketCard';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Configuração das colunas do Kanban
const BOARD_COLUMNS = [
  {
    id: 'open' as TicketStatus,
    title: 'Abertos',
    icon: AlertTriangle,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  {
    id: 'in_progress' as TicketStatus,
    title: 'Em Andamento',
    icon: Play,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  {
    id: 'done' as TicketStatus,
    title: 'Concluídos',
    icon: CheckCircle,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800'
  }
];

interface TicketBoardProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  onCreateTicket: () => void;
  isAdmin?: boolean;
  loading?: boolean;
}

export function TicketBoard({
  tickets,
  onTicketClick,
  onStatusChange,
  onCreateTicket,
  isAdmin = false,
  loading = false
}: TicketBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.description?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    
    return matchesSearch && matchesPriority && matchesCategory && !ticket.isArchived;
  });

  // Agrupar tickets por status
  const ticketsByStatus = BOARD_COLUMNS.reduce((acc, column) => {
    acc[column.id] = filteredTickets.filter(ticket => ticket.status === column.id);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  // Handle status change with dropdown
  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    onStatusChange(ticketId, newStatus);
  };

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const sourceStatus = active.data.current?.status as TicketStatus;
    const targetStatus = over.id as TicketStatus;
    
    // Se não mudou de coluna, não fazer nada
    if (sourceStatus === targetStatus) return;
    
    // Alterar status do ticket
    onStatusChange(active.id as string, targetStatus);
  }, [onStatusChange]);

  // Calcular estatísticas
  const stats = {
    total: filteredTickets.length,
    open: ticketsByStatus.open.length,
    inProgress: ticketsByStatus.in_progress.length,
    done: ticketsByStatus.done.length,
    highPriority: filteredTickets.filter(t => t.priority === 'high').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DragDropWrapper onDragEnd={handleDragEnd}>
      <div className="space-y-6">
      {/* Header com filtros e ações */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Tickets da Plataforma
          </h1>
          <p className="text-muted-foreground">
            Gerencie problemas técnicos e solicitações da plataforma ExpiWish
          </p>
        </div>

        {/* Estatísticas rápidas */}
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">{stats.total}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-red-600">{stats.highPriority}</div>
            <div className="text-muted-foreground">Alta Prioridade</div>
          </div>
        </div>

        <Button onClick={onCreateTicket} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      {/* Barra de filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Board Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-400px)]">
        {BOARD_COLUMNS.map((column) => {
          const columnTickets = ticketsByStatus[column.id];
          const ColumnIcon = column.icon;

          return (
            <Card key={column.id} className={cn("flex flex-col", column.borderColor)}>
              <CardHeader className={cn("pb-3", column.bgColor)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
                    <CardTitle className="text-sm font-medium">
                      {column.title}
                    </CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {columnTickets.length}
                    </Badge>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        Ordenar por Prioridade
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Ordenar por Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3 p-3 overflow-y-auto">
                <DroppableColumn id={column.id}>
                  {columnTickets.map((ticket) => (
                    <DraggableTicket
                      key={ticket.id}
                      ticket={ticket}
                      onTicketClick={onTicketClick}
                      onStatusChange={handleStatusChange}
                      showHotel={isAdmin}
                      isAdmin={isAdmin}
                      boardColumns={BOARD_COLUMNS}
                    />
                  ))}
                </DroppableColumn>

                {/* Estado vazio */}
                {columnTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <ColumnIcon className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">
                      Nenhum ticket {column.title.toLowerCase()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estado vazio geral */}
      {filteredTickets.length === 0 && tickets.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Nenhum ticket encontrado</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Comece criando um novo ticket para reportar problemas ou solicitar melhorias na plataforma.
              </p>
            </div>
            <Button onClick={onCreateTicket} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Ticket
            </Button>
          </div>
        </Card>
      )}

      {/* Estado de filtros vazios */}
      {filteredTickets.length === 0 && tickets.length > 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Filter className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou termos de busca.
            </p>
          </div>
        </Card>
      )}
      </div>
    </DragDropWrapper>
  );
}