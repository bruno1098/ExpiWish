import { NextRequest, NextResponse } from 'next/server';
import { updateFeedbackInFirestoreWithUserData } from '@/lib/firestore-service';
import { authenticateRequest } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const { feedbackId } = await request.json();

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'ID do feedback é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar autenticação usando cookies
    const cookieAuth = await authenticateRequest(request);
    
    if (!cookieAuth.authenticated || !cookieAuth.userData) {
      return NextResponse.json(
        { error: cookieAuth.error || 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    
    const userData = cookieAuth.userData;

    // Verificar se é admin
    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem restaurar feedbacks.' },
        { status: 403 }
      );
    }

    // Atualizar feedback no Firestore removendo flag de exclusão
    const updateData = {
      deleted: false, // Remover flag de exclusão
      restoredAt: new Date().toISOString(),
      restoredBy: userData.email,
      // Remover campos de exclusão mantendo histórico se necessário
      deletedAt: undefined,
      deletedBy: undefined,
      deletedReason: undefined
    };

    const success = await updateFeedbackInFirestoreWithUserData(feedbackId, updateData, userData);

    if (success) {
      
      return NextResponse.json({ 
        message: 'Feedback restaurado com sucesso',
        feedbackId 
      });
    } else {
      throw new Error('Falha ao atualizar feedback no Firestore');
    }

  } catch (error: any) {
    console.error('❌ Erro ao restaurar feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}