import { NextRequest, NextResponse } from 'next/server';
import { updateFeedbackInFirestoreWithUserData } from '@/lib/firestore-service';
import { authenticateRequest } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const { feedbackId, reason } = await request.json();

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

    // Atualizar feedback no Firestore marcando como excluído
    const updateData = {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userData.email,
      deletedReason: reason || 'Conteúdo irrelevante'
    };

    const success = await updateFeedbackInFirestoreWithUserData(feedbackId, updateData, userData);

    if (success) {
      
      return NextResponse.json({ 
        message: 'Feedback excluído com sucesso',
        feedbackId 
      });
    } else {
      throw new Error('Falha ao atualizar feedback no Firestore');
    }

  } catch (error: any) {
    console.error('❌ Erro ao excluir feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}