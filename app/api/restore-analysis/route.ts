import { NextRequest, NextResponse } from 'next/server';
import { restoreAnalysis } from '@/lib/firestore-service';
import { authenticateRequest } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const { analysisId } = await request.json();

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

    // Verificar se é admin
    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores podem restaurar análises' },
        { status: 403 }
      );
    }

    // Restaurar análise
    const success = await restoreAnalysis(analysisId);

    if (success) {
      return NextResponse.json({ 
        message: 'Análise restaurada com sucesso',
        analysisId 
      });
    } else {
      throw new Error('Falha ao restaurar análise');
    }

  } catch (error: any) {
    console.error('❌ Erro ao restaurar análise:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
