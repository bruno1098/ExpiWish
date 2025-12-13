import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIApiKey } from '@/lib/openai-config';

const TEST_API_KEY = getOpenAIApiKey();

/**
 * API de teste DETALHADA para análise de feedback
 * Mostra TODO o raciocínio da IA, incluindo:
 * - Candidatos enviados
 * - Response completa da IA
 * - Matching de keywords/problems
 * - Decisões tomadas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, text, comment } = body;
    
    const feedbackText = texto || text || comment;
    
    if (!feedbackText || feedbackText.trim().length === 0) {
      return NextResponse.json({
        error: 'Campo "texto" é obrigatório',
        exemplo: {
          texto: 'Agradeço o atendimento no café'
        }
      }, { status: 400 });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 ANÁLISE DETALHADA - MODO DEBUG');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Feedback: "${feedbackText}"\n`);

    // Chamar a API de análise
    const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/analyze-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'X-Debug-Mode': 'true' // Header especial para ativar modo debug
      },
      body: JSON.stringify({
        texto: feedbackText,
      }),
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json();
      console.error('❌ Erro na análise:', errorData);
      return NextResponse.json({
        error: 'Erro ao analisar feedback',
        details: errorData
      }, { status: analyzeResponse.status });
    }

    const result = await analyzeResponse.json();

    // Formatar saída detalhada
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULTADO FINAL DA IA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`\n🎭 Sentimento (rating): ${result.rating}/5`);
    console.log(`🏢 Departamento: ${result.sector}`);
    console.log(`🏷️  Palavra-chave: ${result.keyword}`);
    console.log(`❌ Problema: ${result.problem || 'Nenhum'}`);
    console.log(`💬 Detalhes positivos: ${result.positive_details || '—'}`);
    console.log(`⏱️  Tempo de processamento: ${result.processing_time_ms}ms`);
    console.log(`🎯 Confiança média: ${result.confidence}`);

    if (result.allProblems) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TODAS AS ISSUES DETECTADAS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      result.allProblems.forEach((issue: any, index: number) => {
        console.log(`\n📌 Issue ${index + 1}:`);
        console.log(`   🏷️  Keyword: ${issue.keyword}`);
        console.log(`   🏢 Setor: ${issue.sector}`);
        console.log(`   ❌ Problema: ${issue.problem || 'Nenhum (elogio)'}`);
        console.log(`   💬 Detalhe: ${issue.problem_detail}`);
        console.log(`   🎯 Matched by: ${issue.matched_by}`);
        console.log(`   🔢 Confidence: ${issue.confidence}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Análise concluída');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Retornar resultado formatado
    return NextResponse.json({
      success: true,
      feedback_analisado: feedbackText,
      
      analise_resumo: {
        sentimento: { valor: result.rating, descricao: result.rating >= 4 ? 'Positivo' : (result.rating <= 2 ? 'Negativo' : 'Neutro') },
        departamento: result.sector,
        palavra_chave: result.keyword,
        problema: result.problem || 'Nenhum',
        detalhes: result.positive_details || undefined,
        confianca: result.confidence,
      },

      issues_detectadas: result.allProblems || [],

      metadata: {
        tempo_processamento_ms: result.processing_time_ms,
        versao_taxonomia: result.taxonomy_version,
        modo_direto: true,
      },

      debug_info: {
        total_keywords_disponiveis: 48,
        total_problems_disponiveis: 157,
        score_mode: 'todos keywords com score 1.0 (modo direto)',
        contexto_analisado: 'IA recebe TODAS as keywords e deve escolher baseado em CONTEXTO, não em palavras isoladas',
      },

      resultado_completo: result,
    });

  } catch (error: any) {
    console.error('\n❌ Erro na API de teste:', error);
    return NextResponse.json({
      error: 'Erro interno',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '🧪 API de Teste DETALHADA - Análise de Feedbacks',
    uso: {
      metodo: 'POST',
      endpoint: '/api/test-analyze-detailed',
      body: {
        texto: 'Seu feedback aqui'
      }
    },
    exemplos_teste: [
      {
        titulo: 'Atendimento no café (deve ser A&B - Serviço)',
        texto: 'Agradeço o atendimento no café, o Jefferson foi muito atencioso'
      },
      {
        titulo: 'Recepção do restaurante (deve ser A&B - Serviço)',
        texto: 'A atendente na recepção do restaurante foi educada e carismática'
      },
      {
        titulo: 'Recepção do hotel (deve ser Recepção - Serviço)',
        texto: 'Os recepcionistas no lobby foram muito prestativos no check-in'
      },
      {
        titulo: 'Transfer (deve ser Produto - Transfer)',
        texto: 'O serviço de transfer do aeroporto foi excelente'
      },
    ],
    detalhes: {
      modo_operacao: 'MODO DIRETO (USE_DIRECT_ANALYSIS: true)',
      comportamento: 'IA recebe TODAS as 48 keywords com score 1.0',
      expectativa: 'IA deve escolher baseado em CONTEXTO SEMÂNTICO, não em palavras isoladas',
      problema_atual: 'IA está fazendo matching superficial (vê "atendimento" → escolhe "Operações" ignorando "no café")',
    }
  });
}
