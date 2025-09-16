"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TicketBoard } from './components/TicketBoard';
import { TicketModal } from './components/TicketModal';
import { RequireAuth, useAuth } from '@/lib/auth-context';
import { 
  getTickets, 
  updateTicket, 
  addTicketComment, 
  archiveTicket, 
  subscribeToTickets, 
  moveTicketToStatus 
} from '@/lib/tickets-service';
import { 
  Ticket, 
  TicketStatus, 
  TicketPriority,
  TicketFilters 
} from '@/types/ticket';
import { devLog, devError } from '@/lib/dev-logger';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { userData } = useAuth();
  const router = useRouter();
  
  const isAdmin = userData?.role === 'admin';

  // Carregar tickets iniciais
  useEffect(() => {
    if (!userData) return;

    const loadTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const filters: TicketFilters = {};
        const ticketsData = await getTickets(filters, userData);
        
        setTickets(ticketsData);
        devLog(`Carregados ${ticketsData.length} tickets`);
        
      } catch (err) {
        devError('Erro ao carregar tickets:', err);
        setError('Falha ao carregar tickets');
        toast.error('Erro ao carregar tickets');
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [userData]);

  // Configurar listener em tempo real
  useEffect(() => {
    if (!userData) return;

    let unsubscribe: (() => void) | null = null;

    const setupRealtimeUpdates = () => {
      try {
        const filters: TicketFilters = {};
        
        unsubscribe = subscribeToTickets(
          filters,
          userData,
          (updatedTickets) => {
            setTickets(updatedTickets);
            devLog(`Tickets atualizados via listener: ${updatedTickets.length}`);
          }
        );
        
      } catch (err) {
        devError('Erro ao configurar listener de tickets:', err);
      }
    };

    // Configurar listener após carregamento inicial
    if (!loading) {
      setupRealtimeUpdates();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userData, loading]);

  // Handlers
  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleCreateTicket = () => {
    router.push('/tickets/new');
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    if (!userData) return;

    try {
      await moveTicketToStatus(ticketId, newStatus, userData);
      
      // Atualizar localmente para feedback imediato
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status: newStatus, updatedAt: new Date() as any }
          : ticket
      ));

      // Atualizar ticket selecionado se for o mesmo
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast.success(`Ticket movido para "${newStatus === 'open' ? 'Aberto' : newStatus === 'in_progress' ? 'Em Andamento' : 'Concluído'}"`);
      
    } catch (err) {
      devError('Erro ao atualizar status:', err);
      toast.error('Falha ao atualizar status do ticket');
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    if (!userData) return;

    try {
      await updateTicket(ticketId, { status }, userData);
      toast.success('Status atualizado com sucesso!');
      
    } catch (err) {
      devError('Erro ao atualizar status:', err);
      toast.error('Falha ao atualizar status');
    }
  };

  const handleUpdatePriority = async (ticketId: string, priority: TicketPriority) => {
    if (!userData) return;

    try {
      await updateTicket(ticketId, { priority }, userData);
      toast.success('Prioridade atualizada com sucesso!');
      
    } catch (err) {
      devError('Erro ao atualizar prioridade:', err);
      toast.error('Falha ao atualizar prioridade');
    }
  };

  const handleAddComment = async (ticketId: string, comment: string, isInternal = false) => {
    if (!userData) return;

    try {
      await addTicketComment(ticketId, comment, userData, isInternal);
      toast.success('Comentário adicionado!');
      
    } catch (err) {
      devError('Erro ao adicionar comentário:', err);
      toast.error('Falha ao adicionar comentário');
    }
  };

  const handleArchiveTicket = async (ticketId: string) => {
    try {
      await archiveTicket(ticketId, true);
      toast.success('Ticket arquivado com sucesso!');
      
    } catch (err) {
      devError('Erro ao arquivar ticket:', err);
      toast.error('Falha ao arquivar ticket');
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">❌ {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="container mx-auto p-6 space-y-6">
        <TicketBoard
          tickets={tickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
          onCreateTicket={handleCreateTicket}
          isAdmin={isAdmin}
          loading={loading}
        />

        <TicketModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={handleCloseModal}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePriority={handleUpdatePriority}
          onAddComment={handleAddComment}
          onArchive={handleArchiveTicket}
          currentUser={userData || undefined}
          isAdmin={isAdmin}
        />
      </div>
    </RequireAuth>
  );
}