import { NextRequest, NextResponse } from 'next/server';
import { updateAnalysisInFirestoreWithUserData } from '@/lib/firestore-service';
import { authenticateRequest } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 });
    }

    const { analysisId, hidden, reason } = await request.json();

    if (!analysisId || typeof hidden !== 'boolean') {
      return NextResponse.json({ 
        error: 'analysisId e hidden são obrigatórios' 
      }, { status: 400 });
    }

    // Preparar dados para atualização
    const updateData: any = {
      hidden
    };

    // Se está escondendo a análise, adicionar timestamp e razão
    if (hidden) {
      updateData.hiddenAt = new Date().toISOString();
      if (reason) {
        updateData.hiddenReason = reason;
      }
    } else {
      // Se está mostrando a análise, remover campos relacionados ao hide
      updateData.hiddenAt = null;
      updateData.hiddenReason = null;
    }

    // Verificar se userData existe
    if (!authResult.userData) {
      return NextResponse.json({ error: 'Dados do usuário não encontrados' }, { status: 401 });
    }

    // Atualizar no Firestore
    const result = await updateAnalysisInFirestoreWithUserData(
      analysisId,
      updateData,
      authResult.userData
    );

    if (!result) {
      return NextResponse.json({ 
        error: 'Erro ao atualizar análise' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: hidden ? 'Análise ocultada com sucesso' : 'Análise exibida com sucesso',
      newState: {
        hidden,
        hiddenAt: updateData.hiddenAt,
        hiddenReason: updateData.hiddenReason
      }
    });

  } catch (error) {
    console.error('Erro ao alterar visibilidade da análise:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}