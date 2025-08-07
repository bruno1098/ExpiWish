import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisById, updateAnalysisInFirestore } from '@/lib/firestore-service';
import { authenticateRequest } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const { analysisId, reason } = await request.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: 'ID da análise é obrigatório' },
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

    // Marcar análise como excluída em vez de deletar permanentemente
    const updateData = {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userData.email,
      deletedReason: reason || 'Análise removida pelo usuário'
    };

    const success = await updateAnalysisInFirestore(analysisId, updateData, userData.hotelId);

    if (success) {
      return NextResponse.json({ 
        message: 'Análise excluída com sucesso',
        analysisId 
      });
    } else {
      throw new Error('Falha ao atualizar análise no Firestore');
    }

  } catch (error: any) {
    console.error('❌ Erro ao excluir análise:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}