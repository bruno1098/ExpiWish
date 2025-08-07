import { NextRequest, NextResponse } from 'next/server';
import { deleteAnalysisInFirestoreWithUserData } from '@/lib/firestore-service';
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

    // Marcar análise como excluída no Firestore
    const updateData = {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userData.email,
      deletedReason: reason || 'Análise removida pelo usuário'
    };

    const success = await deleteAnalysisInFirestoreWithUserData(analysisId, userData, reason);

    if (success) {
      return NextResponse.json({ 
        message: 'Análise excluída com sucesso',
        analysisId 
      });
    } else {
      throw new Error('Falha ao excluir análise no Firestore');
    }

  } catch (error: any) {
    console.error('❌ Erro ao excluir análise:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}