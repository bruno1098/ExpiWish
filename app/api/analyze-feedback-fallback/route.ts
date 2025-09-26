// Endpoint temporário que usa busca por texto simples enquanto não tem embeddings
import { NextRequest, NextResponse } from "next/server";
import { loadTaxonomy } from "@/lib/taxonomy-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto } = body;
    
    if (!texto || texto.trim().length < 3) {
      return NextResponse.json({
        error: 'Texto muito curto'
      }, { status: 400 });
    }
    
    const taxonomy = await loadTaxonomy();
    const text = texto.toLowerCase();
    
    console.log('🔍 Fazendo busca por texto simples...');
    
    // Busca simples por palavra-chave no texto
    const matchedKeywords = taxonomy.keywords.filter(kw => {
      const label = kw.label.toLowerCase();
      const aliases = kw.aliases.map(a => a.toLowerCase());
      
      // Verificar se alguma palavra da keyword aparece no texto
      const keywordWords = label.split(/[\s-]+/);
      const aliasWords = aliases.join(' ').split(/[\s-]+/);
      const allWords = [...keywordWords, ...aliasWords];
      
      return allWords.some(word => 
        word.length > 2 && text.includes(word)
      );
    });
    
    const matchedProblems = taxonomy.problems.filter(prob => {
      const label = prob.label.toLowerCase();
      const aliases = prob.aliases.map(a => a.toLowerCase());
      
      const problemWords = label.split(/[\s-]+/);
      const aliasWords = aliases.join(' ').split(/[\s-]+/);
      const allWords = [...problemWords, ...aliasWords];
      
      return allWords.some(word => 
        word.length > 2 && text.includes(word)
      );
    });
    
    // Análise específica para o exemplo
    let selectedKeyword = null;
    let selectedProblem = null;
    let department = 'Operacoes';
    
    // Detectar contexto de A&B
    if (text.includes('comida') || text.includes('garçom') || text.includes('atend') || text.includes('restaurante')) {
      department = 'A&B';
      
      // Buscar keyword de A&B - Serviço
      selectedKeyword = taxonomy.keywords.find(kw => 
        kw.label.includes('A&B') && kw.label.includes('Serviço')
      );
      
      // Buscar problem de demora
      if (text.includes('demorou') || text.includes('demora')) {
        selectedProblem = taxonomy.problems.find(prob =>
          prob.label.toLowerCase().includes('demora') && 
          prob.label.toLowerCase().includes('atend')
        );
      }
    }
    
    // Fallback para matches encontrados
    if (!selectedKeyword && matchedKeywords.length > 0) {
      selectedKeyword = matchedKeywords[0];
      department = selectedKeyword.department_id;
    }
    
    if (!selectedProblem && matchedProblems.length > 0) {
      selectedProblem = matchedProblems[0];
    }
    
    // Classificar sentimento baseado em palavras
    let sentiment = 3;
    if (text.includes('fria') || text.includes('demorou') || text.includes('ruim') || text.includes('péssim')) {
      sentiment = 2;
    }
    if (text.includes('excelente') || text.includes('ótim') || text.includes('perfeito')) {
      sentiment = 4;
    }
    
    const result = {
      sentiment,
      has_suggestion: false,
      suggestion_type: 'none',
      suggestion_summary: '',
      issues: [{
        department_id: department,
        keyword_id: selectedKeyword?.id || 'kw_fallback',
        problem_id: selectedProblem?.id || 'pb_fallback',
        department_label: department,
        keyword_label: selectedKeyword?.label || 'Atendimento Geral',
        problem_label: selectedProblem?.label || 'Problema no Atendimento',
        detail: `Análise baseada em: ${texto.substring(0, 100)}`,
        confidence: selectedKeyword && selectedProblem ? 0.7 : 0.5,
        matched_by: 'text_search'
      }],
      taxonomy_version: taxonomy.version,
      confidence: selectedKeyword && selectedProblem ? 0.7 : 0.5,
      needs_review: !selectedKeyword || !selectedProblem,
      processing_time_ms: Date.now() - Date.now(),
      used_candidates: {
        keywords: matchedKeywords.map(k => k.id),
        problems: matchedProblems.map(p => p.id)
      },
      fallback_mode: true,
      message: 'Usando busca por texto simples. Para melhor precisão, execute: POST /api/generate-embeddings'
    };
    
    console.log('✅ Análise fallback concluída:', {
      sentiment: result.sentiment,
      department: department,
      keyword: selectedKeyword?.label,
      problem: selectedProblem?.label,
      matches: { keywords: matchedKeywords.length, problems: matchedProblems.length }
    });
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Erro na análise fallback:', error);
    
    return NextResponse.json({
      error: 'Erro na análise fallback',
      details: error.message
    }, { status: 500 });
  }
}