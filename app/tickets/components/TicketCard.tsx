"use client";

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  Clock,
  User,
  Building,
  Tag,
  MessageSquare,
  Paperclip,
  Monitor,
  Wrench,
  Bot,
  Bug,
  Coffee,
  Users,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  Play,
  Plus,
  RefreshCw,
  FileText,
  Palette,
  Zap,
  TestTube
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Ticket, 
  TICKET_STATUS_LABELS, 
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_STATUS_COLORS,
  TicketPriority,
  TicketStatus
} from '@/types/ticket';

// Mapeamento de ícones para categorias
const categoryIcons = {
  fix: Bug,
  feat: Plus,
  style: Palette,
  perf: Zap,
  chore: Wrench,
};

// Mapeamento de ícones para status
const statusIcons = {
  open: AlertTriangle,
  in_progress: Play,
  done: CheckCircle,
};

interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
  onStatusChange?: (ticketId: string, newStatus: TicketStatus) => void;
  isDragging?: boolean;
  showHotel?: boolean; // Para admin ver qual hotel
}

export function TicketCard({ 
  ticket, 
  onClick, 
  onStatusChange, 
  isDragging = false,
  showHotel = false
}: TicketCardProps) {
  const CategoryIcon = categoryIcons[ticket.category] || HelpCircle;
  const StatusIcon = statusIcons[ticket.status] || AlertTriangle;
  
  // Calcular se o ticket está atrasado
  const isOverdue = ticket.dueDate && 
    ticket.status !== 'done' && 
    ticket.dueDate.toDate() < new Date();
  
  // Calcular iniciais do criador
  const creatorInitials = ticket.createdBy.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Tempo desde criação
  const timeAgo = formatDistanceToNow(ticket.createdAt.toDate(), {
    addSuffix: true,
    locale: ptBR
  });
  
  // Tempo até vencimento
  const dueTime = ticket.dueDate ? formatDistanceToNow(ticket.dueDate.toDate(), {
    addSuffix: true,
    locale: ptBR
  }) : null;
  
  const handleClick = () => {
    onClick?.(ticket);
  };
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md group border-l-4",
        isDragging && "opacity-50 rotate-2",
        TICKET_PRIORITY_COLORS[ticket.priority],
        isOverdue && "ring-2 ring-red-500 ring-opacity-50"
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CategoryIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
              {ticket.title}
            </CardTitle>
          </div>
          
          <Badge 
            variant="secondary"
            className={cn("text-xs flex-shrink-0", TICKET_STATUS_COLORS[ticket.status])}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {TICKET_STATUS_LABELS[ticket.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Descrição resumida */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {ticket.description}
        </p>
        
        {/* Categoria e Prioridade */}
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-xs">
            {TICKET_CATEGORY_LABELS[ticket.category]}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              ticket.priority === 'high' && "border-red-500 text-red-700 dark:text-red-400",
              ticket.priority === 'medium' && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
              ticket.priority === 'low' && "border-green-500 text-green-700 dark:text-green-400"
            )}
          >
            {TICKET_PRIORITY_LABELS[ticket.priority]}
          </Badge>
        </div>
        
        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ticket.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs px-1 py-0"
              >
                {tag}
              </Badge>
            ))}
            {ticket.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                +{ticket.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Informações do hotel (para admin) */}
        {showHotel && ticket.createdBy.hotelName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building className="h-3 w-3" />
            <span>{ticket.createdBy.hotelName}</span>
          </div>
        )}
        
        {/* Data de vencimento */}
        {ticket.dueDate && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{isOverdue ? 'Atrasado há' : 'Vence'} {dueTime}</span>
          </div>
        )}
        
        {/* Rodapé com informações */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {/* Avatar do criador */}
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {creatorInitials}
              </AvatarFallback>
            </Avatar>
            
            {/* Tempo de criação */}
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          
          {/* Indicadores */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {/* Anexos */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span className="text-xs">{ticket.attachments.length}</span>
              </div>
            )}
            
            {/* Comentários */}
            {ticket.comments && ticket.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span className="text-xs">{ticket.comments.length}</span>
              </div>
            )}
            
            {/* Horas estimadas */}
            {ticket.estimatedHours && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{ticket.estimatedHours}h</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}