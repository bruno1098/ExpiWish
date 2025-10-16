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
    
    // Detectar contexto de A&B (somente com sinais claros de restaurante/bar)
    const hasABContext = (
      text.includes('comida') ||
      text.includes('restaurante') ||
      text.includes('café') ||
      text.includes('jantar') ||
      text.includes('almoço') ||
      text.includes('bar') ||
      text.includes('bebida') ||
      text.includes('garçom') ||
      text.includes('gastronomia') ||
      text.includes('refeição') ||
      text.includes('room service') ||
      text.includes('serviço de quarto') ||
      text.includes('servico de quarto')
    );

    const hasReceptionContext = (
      text.includes('recepção') ||
      text.includes('front desk') ||
      text.includes('check-in') ||
      text.includes('check-out')
    );

    const mentionsServiceStaff = (
      text.includes('atendimento') ||
      text.includes('atendente') ||
      text.includes('equipe') ||
      text.includes('staff') ||
      text.includes('funcionário') ||
      text.includes('funcionarios') ||
      text.includes('colaborador')
    );

    if (hasABContext) {
      department = 'A&B';
      const hasRoomService = (
        text.includes('room service') ||
        text.includes('serviço de quarto') ||
        text.includes('servico de quarto')
      );
      // Priorizar A&B - Room Service quando houver menção explícita
      selectedKeyword = hasRoomService
        ? (
            taxonomy.keywords.find(kw => kw.label.includes('A&B') && kw.label.includes('Room Service')) ||
            taxonomy.keywords.find(kw => kw.label.includes('A&B') && kw.label.includes('Serviço'))
          )
        : taxonomy.keywords.find(kw => kw.label.includes('A&B') && kw.label.includes('Serviço'));
    } else if (hasReceptionContext) {
      department = 'Recepção';
      selectedKeyword = taxonomy.keywords.find(kw => 
        kw.label.includes('Recepção') && kw.label.includes('Atendimento')
      );
    } else if (mentionsServiceStaff) {
      department = 'Operações';
      selectedKeyword =
        taxonomy.keywords.find(kw => kw.label.includes('Operações') && kw.label.includes('Atendimento')) ||
        taxonomy.keywords.find(kw => kw.label === 'Atendimento') ||
        null;
    }

    // Buscar problem de demora específico do departamento, quando aplicável
    if (text.includes('demorou') || text.includes('demora')) {
      const findByDept = (deptLabel: string) => taxonomy.problems.find(prob =>
        prob.label.toLowerCase().includes('demora') &&
        prob.label.toLowerCase().includes('atend') &&
        prob.label.includes(deptLabel)
      );

      selectedProblem =
        (department === 'A&B' && findByDept('A&B')) ||
        (department === 'Operações' && findByDept('Operações')) ||
        (department === 'Recepção' && findByDept('Recepção')) ||
        taxonomy.problems.find(prob => prob.label.toLowerCase() === 'demora no atendimento') ||
        taxonomy.problems.find(prob =>
          prob.label.toLowerCase().includes('demora') && prob.label.toLowerCase().includes('atend')
        ) ||
        null;
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