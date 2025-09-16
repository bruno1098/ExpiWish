"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketForm } from '../components/TicketForm';
import { RequireAuth, useAuth } from '@/lib/auth-context';
import { createTicket } from '@/lib/tickets-service';
import { CreateTicketData } from '@/types/ticket';
import { devLog, devError } from '@/lib/dev-logger';

export default function NewTicketPage() {
  const [loading, setLoading] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const handleSubmit = async (data: CreateTicketData) => {
    if (!userData) {
      toast.error('Usuário não autenticado');
      return;
    }

    setLoading(true);
    try {
      devLog('Criando novo ticket:', data);
      
      const newTicket = await createTicket(data, userData);
      
      devLog('Ticket criado com sucesso:', newTicket.id);
      toast.success('Ticket criado com sucesso!');
      
      // Redirecionar para a lista de tickets
      router.push('/tickets');
      
    } catch (err) {
      devError('Erro ao criar ticket:', err);
      toast.error('Falha ao criar ticket. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <RequireAuth>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header com breadcrumb */}
        <div className="flex items-center gap-4">
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

        {/* Formulário */}
        <TicketForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </RequireAuth>
  );
}