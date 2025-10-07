/**
 * API de TESTE para análise rápida de feedbacks
 * 
 * USO:
 * POST /api/test-analyze
 * Body: { "texto": "seu feedback aqui" }
 * 
 * Retorna a classificação completa da IA
 */

import { NextRequest, NextResponse } from 'next/server';
import { toBrasiliaTimestamp } from '@/lib/timezone-utils';

// API Key fixa para testes
const TEST_API_KEY = process.env.OPENAI_API_KEY || '';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, text, comment } = body;
    
    const feedbackText = texto || text || comment;
    
    if (!feedbackText || feedbackText.trim().length === 0) {
      return NextResponse.json({
        error: 'Campo "texto" é obrigatório',
        exemplo: {
          texto: 'Hotel maravilhoso, adorei o café da manhã!'
        }
      }, { status: 400 });
    }

    console.log('🧪 [TEST API] Analisando feedback:', feedbackText.substring(0, 100));

    // Chamar a API de análise com a API key fixa
    const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/analyze-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`
      },
      body: JSON.stringify({
        texto: feedbackText,
        apiKey: TEST_API_KEY
      })
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json();
      throw new Error(`Erro na análise: ${errorData.error || analyzeResponse.statusText}`);
    }

    const result = await analyzeResponse.json();

    console.log('✅ [TEST API] Análise concluída com sucesso');

    // Retornar resultado formatado para fácil leitura
    return NextResponse.json({
      success: true,
      feedback_original: feedbackText,
      analise: {
        sentimento: {
          valor: result.sentiment || result.rating,
          descricao: getSentimentDescription(result.sentiment || result.rating)
        },
        departamento: result.sector || result.department,
        palavra_chave: result.keyword,
        problema: result.problem || 'Sem problemas',
        detalhes_problema: result.problem_detail || '',
        elogios: result.compliments || null,
        detalhes_positivos: result.positive_details || null,
        tem_sugestao: result.has_suggestion || false,
        confianca: result.confidence || 0,
        precisa_revisao: result.needs_review || false
      },
      resultado_completo: result,
      metadata: {
        timestamp: toBrasiliaTimestamp(),
        versao_taxonomia: result.taxonomy_version,
        tempo_processamento_ms: result.processing_time_ms
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST API] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao processar feedback',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '🧪 API de Teste de Análise de Feedbacks',
    uso: {
      metodo: 'POST',
      endpoint: '/api/test-analyze',
      body: {
        texto: 'Seu feedback aqui'
      }
    },
    exemplos: [
      {
        descricao: 'Elogio genérico',
        texto: 'Hotel maravilhoso, adorei tudo!'
      },
      {
        descricao: 'Elogio específico (A&B)',
        texto: 'O café da manhã estava excelente e o garçom muito atencioso'
      },
      {
        descricao: 'Problema específico',
        texto: 'O Wi-fi não funcionava no quarto'
      },
      {
        descricao: 'Atendimento genérico',
        texto: 'Atendimento excelente, equipe muito prestativa'
      },
      {
        descricao: 'Misto (elogio + crítica)',
        texto: 'Hotel muito bom, mas o ar-condicionado do quarto estava com problema'
      }
    ],
    status: 'online',
    api_key_configurada: true
  });
}

function getSentimentDescription(sentiment: number): string {
  switch (sentiment) {
    case 1: return '⭐ Muito Insatisfeito';
    case 2: return '⭐⭐ Insatisfeito';
    case 3: return '⭐⭐⭐ Neutro';
    case 4: return '⭐⭐⭐⭐ Satisfeito';
    case 5: return '⭐⭐⭐⭐⭐ Muito Satisfeito';
    default: return '❓ Não identificado';
  }
}
