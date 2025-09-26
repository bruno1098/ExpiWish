// Debug endpoint para verificar se dados do Firebase estão sendo carregados
import { NextRequest, NextResponse } from "next/server";
import { loadTaxonomy } from "@/lib/taxonomy-service";

export async function GET() {
  try {
    console.log('🔍 Carregando taxonomy para debug...');
    
    const taxonomy = await loadTaxonomy(true); // Force reload
    
    const response = {
      success: true,
      data: {
        version: taxonomy.version,
        loaded_at: taxonomy.loaded_at,
        expires_at: taxonomy.expires_at,
        departments: {
          count: taxonomy.departments.length,
          items: taxonomy.departments.map(d => ({
            id: d.id,
            label: d.label,
            active: d.active
          }))
        },
        keywords: {
          count: taxonomy.keywords.length,
          items: taxonomy.keywords.slice(0, 5).map(k => ({
            id: k.id,
            label: k.label,
            department_id: k.department_id,
            status: k.status,
            has_embedding: k.embedding && k.embedding.length > 0
          }))
        },
        problems: {
          count: taxonomy.problems.length,
          items: taxonomy.problems.slice(0, 5).map(p => ({
            id: p.id,
            label: p.label,
            status: p.status,
            has_embedding: p.embedding && p.embedding.length > 0
          }))
        }
      }
    };
    
    console.log('📊 Debug response:', response);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erro no debug:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, apiKey } = body;
    
    if (!text) {
      return NextResponse.json({ error: 'Text é obrigatório' }, { status: 400 });
    }
    
    console.log('🧪 Testando busca de candidatos...');
    
    const { findCandidates } = await import('@/lib/taxonomy-service');
    const candidates = await findCandidates(text, undefined, apiKey);
    
    return NextResponse.json({
      success: true,
      text: text,
      candidates: {
        departments: candidates.departments.length,
        keywords: {
          count: candidates.keywords.length,
          top3: candidates.keywords.slice(0, 3).map(k => ({
            id: k.id,
            label: k.label,
            similarity: k.similarity_score
          }))
        },
        problems: {
          count: candidates.problems.length,
          top3: candidates.problems.slice(0, 3).map(p => ({
            id: p.id,
            label: p.label,
            similarity: p.similarity_score
          }))
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no teste de candidatos:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}