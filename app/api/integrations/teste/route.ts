import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { authenticateRequest } from '@/lib/server-auth';
import { db } from '@/lib/firebase';
import { getOpenAIApiKey } from '@/lib/openai-config';
import {
  getIntegrationDashboardData,
  processExternalFeedbacksWithAI
} from '@/lib/integrations/external-feedbacks';
import type {
  IntegrationAccessContext,
  IntegrationUserRole
} from '@/lib/integrations/external-feedbacks';

interface IntegrationRequestBody {
  apiKey?: string;
  limit?: number;
  dryRun?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userData) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const scope = await buildIntegrationScope(authResult.userData);
    const dashboard = await getIntegrationDashboardData(scope);
    return NextResponse.json(dashboard);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Falha ao consultar integrações externas',
      message: error?.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userData) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const scope = await buildIntegrationScope(authResult.userData);

    if (scope?.role !== 'admin' && !scope?.hotelId) {
      return NextResponse.json({ error: 'Nenhum hotel associado ao usuário atual.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as IntegrationRequestBody;
    const providedApiKey = body.apiKey?.trim();
    const envApiKey = getOpenAIApiKey();
    const apiKey = providedApiKey || envApiKey;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API key ausente. Informe no body (apiKey) ou configure lib/openai-config.ts / OPENAI_API_KEY.'
      }, { status: 400 });
    }

    const limit = typeof body.limit === 'number'
      ? Math.max(1, Math.min(500, Math.floor(body.limit)))
      : undefined;

    const result = await processExternalFeedbacksWithAI({
      origin: request.nextUrl.origin,
      apiKey,
      limit,
      dryRun: Boolean(body.dryRun),
      role: scope?.role ?? 'admin',
      hotelId: scope?.hotelId ?? null
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Falha ao executar integração externa',
      message: error?.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}

async function buildIntegrationScope(userData: { role?: string | null; hotelId?: string | null }): Promise<IntegrationAccessContext | undefined> {
  const normalizedRole = ((userData?.role || 'staff').toLowerCase() as IntegrationUserRole) || 'staff';

  if (normalizedRole === 'admin') {
    return { role: 'admin' };
  }

  const hotelIdentifier = (userData?.hotelId || '').trim();
  if (!hotelIdentifier) {
    return { role: normalizedRole, hotelId: null };
  }

  let resolvedHotelId = hotelIdentifier;

  try {
    const hotelDoc = await getDoc(doc(db, 'hotels', hotelIdentifier));
    if (hotelDoc.exists()) {
      const hotelData = hotelDoc.data() as { hotelId?: string };
      resolvedHotelId = hotelData?.hotelId || hotelIdentifier;
    }
  } catch (error) {
    console.error('Falha ao resolver hotel para integração:', error);
  }

  return {
    role: normalizedRole,
    hotelId: resolvedHotelId
  };
}
