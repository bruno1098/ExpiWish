"use client";

import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Ticket, TicketStatus } from '@/types/ticket';
import { TicketCard } from './TicketCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableColumn({ id, children, className }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-3 min-h-[200px] transition-colors',
        isOver && 'bg-accent/20 rounded-lg',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DraggableTicketProps {
  ticket: Ticket;
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  showHotel?: boolean;
  isAdmin?: boolean;
  boardColumns: Array<{
    id: TicketStatus;
    title: string;
  }>;
}

export function DraggableTicket({ 
  ticket, 
  onTicketClick, 
  onStatusChange, 
  showHotel, 
  isAdmin,
  boardColumns 
}: DraggableTicketProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: ticket.id,
    data: {
      status: ticket.status,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(3deg)`,
  } : undefined;

  const handleStatusChange = (newStatus: TicketStatus) => {
    onStatusChange(ticket.id, newStatus);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isAdmin ? listeners : {})}
      {...(isAdmin ? attributes : {})}
      className={cn(
        'group relative transition-all duration-200',
        isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        isDragging && 'opacity-50 scale-105 shadow-lg z-50'
      )}
    >
      <TicketCard
        ticket={ticket}
        onClick={onTicketClick}
        showHotel={showHotel}
        isDragging={isDragging}
      />
      
      {/* Quick status change buttons */}
      {isAdmin && !isDragging && (
        <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
          {(() => {
            // Lógica para próximo status sequencial
            const currentIndex = boardColumns.findIndex(col => col.id === ticket.status);
            const nextStatus = currentIndex < boardColumns.length - 1 
              ? boardColumns[currentIndex + 1] 
              : null;
            const prevStatus = currentIndex > 0 
              ? boardColumns[currentIndex - 1] 
              : null;
            
            const statusButtons = [];
            
            // Botão para status anterior (se existir)
            if (prevStatus) {
              statusButtons.push(
                <Button
                  key={prevStatus.id}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleStatusChange(prevStatus.id);
                  }}
                  title={`Mover para ${prevStatus.title}`}
                >
                  ←
                </Button>
              );
            }
            
            // Botão para próximo status (se existir)
            if (nextStatus) {
              statusButtons.push(
                <Button
                  key={nextStatus.id}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleStatusChange(nextStatus.id);
                  }}
                  title={`Mover para ${nextStatus.title}`}
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              );
            }
            
            return statusButtons;
          })()}
        </div>
      )}
    </div>
  );
}