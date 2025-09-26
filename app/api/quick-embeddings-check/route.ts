import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({
        status: 'error',
        message: 'Taxonomia não encontrada'
      });
    }
    
    const data = docSnap.data();
    
    // Contadores atuais
    const currentCounts = {
      keywords: data.keywords?.length || 0,
      problems: data.problems?.length || 0,
      departments: data.departments?.length || 0
    };
    
    // Contadores dos embeddings
    const embeddingsCounts = {
      keywords: data.batch_generation_stats?.total_keywords || 0,
      problems: data.batch_generation_stats?.total_problems || 0
    };
    
    // Verificar se embeddings existem
    const embeddingsExist = data.embeddings_generated_at || data.embeddings_structure === 'chunked';
    
    // Detectar mudanças simples
    const keywordsChanged = embeddingsExist && (currentCounts.keywords !== embeddingsCounts.keywords);
    const problemsChanged = embeddingsExist && (currentCounts.problems !== embeddingsCounts.problems);
    const hasChanges = keywordsChanged || problemsChanged;
    
    let status = 'ok';
    let message = 'Embeddings atualizados';
    
    if (!embeddingsExist) {
      status = 'missing';
      message = 'Embeddings não foram gerados ainda';
    } else if (hasChanges) {
      status = 'outdated';
      message = `Taxonomia alterada: ${keywordsChanged ? `keywords ${currentCounts.keywords} → ${embeddingsCounts.keywords}` : ''} ${problemsChanged ? `problems ${currentCounts.problems} → ${embeddingsCounts.problems}` : ''}`;
    }
    
    return NextResponse.json({
      status,
      message,
      embeddings_exist: embeddingsExist,
      needs_regeneration: hasChanges,
      current_counts: currentCounts,
      embeddings_counts: embeddingsCounts,
      changes: {
        keywords_changed: keywordsChanged,
        problems_changed: problemsChanged,
        keywords_diff: currentCounts.keywords - embeddingsCounts.keywords,
        problems_diff: currentCounts.problems - embeddingsCounts.problems
      },
      timestamps: {
        embeddings_generated_at: data.embeddings_generated_at,
        last_taxonomy_update: data.last_taxonomy_update
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no check rápido:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error.message,
      embeddings_exist: false,
      needs_regeneration: true
    });
  }
}