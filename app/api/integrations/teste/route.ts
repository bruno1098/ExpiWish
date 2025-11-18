import { NextRequest, NextResponse } from 'next/server';
import {
  appendMockFeedback,
  applyMockIngestionUpdate,
  getMockExternalFeedbacks,
  getMockIngestionSnapshot,
  getReclameAquiMockResponse,
  getTrustYouMockResponse,
  runMockIntegration
} from '@/lib/integrations/teste';

interface TestIntegrationRequest {
  apiKey?: string;
  skipAnalysis?: boolean;
  action?: 'run' | 'append';
  newMock?: {
    provider: 'trustyou' | 'reclameaqui';
    title?: string;
    reviewText: string;
    rating?: number;
    reviewerName?: string;
    submittedAt?: string;
    tags?: string[];
  };
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de teste para simular integrações externas (TrustYou/Reclame Aqui).',
    uso: {
      metodo: 'POST',
      endpoint: '/api/integrations/teste',
      body: {
        apiKey: 'opcional - usa process.env.OPENAI_API_KEY se não for enviado',
        skipAnalysis: 'opcional - true para apenas retornar os dados mockados'
      }
    },
    documentacao_referencia: {
      trustyou: 'https://developer.trustyou.com (acesso restrito)',
      reclameAquiHugMe: 'https://hugme.com.br (portal do Reclame Aqui para integradores)'
    },
    providers: {
      trustyou: getTrustYouMockResponse(),
      reclameAqui: getReclameAquiMockResponse()
    },
    normalizedSample: getMockExternalFeedbacks(),
    ingestionSnapshot: getMockIngestionSnapshot(),
    observacoes: [
      'O GET não executa a análise interna, apenas retorna a amostra mockada.',
      'Use o POST para processar os feedbacks com a stack atual e retornar o payload completo no formato interno.'
    ]
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as TestIntegrationRequest;
    const action = body.action ?? 'run';

    if (action === 'append') {
      if (!body.newMock) {
        return NextResponse.json({
          error: 'Corpo inválido: informe newMock para adicionar feedback.'
        }, { status: 400 });
      }

      const created = appendMockFeedback({
        provider: body.newMock.provider,
        title: body.newMock.title,
        reviewText: body.newMock.reviewText,
        rating: body.newMock.rating,
        reviewerName: body.newMock.reviewerName,
        submittedAt: body.newMock.submittedAt,
        tags: body.newMock.tags
      });

      return NextResponse.json({
        message: 'Feedback mock adicionado à fila.',
        created,
        providers: {
          trustyou: getTrustYouMockResponse(),
          reclameAqui: getReclameAquiMockResponse()
        },
        normalizedSample: getMockExternalFeedbacks(),
        ingestionSnapshot: getMockIngestionSnapshot()
      });
    }

    const skipAnalysis = body.skipAnalysis ?? false;
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY;

    if (!skipAnalysis && !apiKey) {
      return NextResponse.json({
        error: 'API key ausente. Informe no body (apiKey) ou configure process.env.OPENAI_API_KEY.',
        hint: 'Envie { "skipAnalysis": true } para apenas inspecionar o payload mockado.'
      }, { status: 400 });
    }

    const snapshotBefore = getMockIngestionSnapshot();

    const result = await runMockIntegration({
      origin: request.nextUrl.origin,
      apiKey,
      skipAnalysis,
      ingestionSnapshot: snapshotBefore
    });

    const enrichedSnapshot = result.metadata.analysisExecuted
      ? applyMockIngestionUpdate(result)
      : snapshotBefore;

    return NextResponse.json({
      ...result,
      ingestionSnapshot: enrichedSnapshot
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Falha ao executar integração mockada',
      message: error?.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}
