import { NextRequest, NextResponse } from 'next/server';
import { updateFeedbackInFirestore } from '@/lib/firestore-service';
import { getCurrentUserData } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const { feedbackId, reason } = await request.json();

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'ID do feedback é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se usuário está autenticado
    const userData = await getCurrentUserData();
    if (!userData) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Atualizar feedback no Firestore marcando como excluído
    const updateData = {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userData.email,
      deletedReason: reason || 'Conteúdo irrelevante'
    };

    const success = await updateFeedbackInFirestore(feedbackId, updateData);

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