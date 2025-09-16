"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequireAuth, useAuth } from '@/lib/auth-context';
import { 
  getTicketById, 
  updateTicket, 
  addTicketComment, 
  archiveTicket 
} from '@/lib/tickets-service';
import { 
  Ticket, 
  TicketStatus, 
  TicketPriority 
} from '@/types/ticket';
import { TicketModal } from '../components/TicketModal';
import { devLog, devError } from '@/lib/dev-logger';

export default function TicketDetailPage() {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { userData } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const ticketId = params.id as string;
  const isAdmin = userData?.role === 'admin';

  // Carregar ticket
  useEffect(() => {
    if (!ticketId) return;

    const loadTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const ticketData = await getTicketById(ticketId);
        
        if (!ticketData) {
          setError('Ticket não encontrado');
          return;
        }

        // Verificar se o usuário tem permissão para ver este ticket
        if (!isAdmin && userData && ticketData.createdBy.uid !== userData.uid) {
          if (!ticketData.createdBy.hotelId || ticketData.createdBy.hotelId !== userData.hotelId) {
            setError('Você não tem permissão para ver este ticket');
            return;
          }
        }
        
        setTicket(ticketData);
        devLog('Ticket carregado:', ticketData.id);
        
      } catch (err) {
        devError('Erro ao carregar ticket:', err);
        setError('Falha ao carregar ticket');
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [ticketId, userData, isAdmin]);

  // Handlers
  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    if (!userData) return;

    try {
      await updateTicket(ticketId, { status }, userData);
      
      // Atualizar ticket localmente
      setTicket(prev => prev ? { ...prev, status } : null);
      
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
      
      // Atualizar ticket localmente
      setTicket(prev => prev ? { ...prev, priority } : null);
      
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
      
      // Recarregar ticket para mostrar novo comentário
      const updatedTicket = await getTicketById(ticketId);
      if (updatedTicket) {
        setTicket(updatedTicket);
      }
      
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
      
      // Voltar para a lista
      router.push('/tickets');
      
    } catch (err) {
      devError('Erro ao arquivar ticket:', err);
      toast.error('Falha ao arquivar ticket');
    }
  };

  const handleClose = () => {
    router.push('/tickets');
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (error || !ticket) {
    return (
      <RequireAuth>
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/tickets')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Tickets
            </Button>
          </div>
          
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">❌ {error || 'Ticket não encontrado'}</div>
            <Button 
              variant="outline"
              onClick={() => router.push('/tickets')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Lista
            </Button>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/tickets')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Tickets
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(`/tickets/${ticketId}`, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir em Nova Aba
          </Button>
        </div>

        {/* Modal sempre visível nesta página */}
        <div className="bg-background">
          <TicketModal
            ticket={ticket}
            isOpen={true}
            onClose={handleClose}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePriority={handleUpdatePriority}
            onAddComment={handleAddComment}
            onArchive={handleArchiveTicket}
            currentUser={userData || undefined}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </RequireAuth>
  );
}