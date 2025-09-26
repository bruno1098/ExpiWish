import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug completo dos embeddings...');
    
    // Carregar dados do Firebase
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({
        error: 'Documento não encontrado',
        exists: false
      });
    }
    
    const data = docSnap.data();
    
    // Informações básicas
    const basicInfo = {
      keywords_count: data.keywords?.length || 0,
      problems_count: data.problems?.length || 0,
      departments_count: data.departments?.length || 0,
      embeddings_generated_at: data.embeddings_generated_at,
      embeddings_structure: data.embeddings_structure,
      taxonomy_version: data.taxonomy_version,
      taxonomy_version_info: data.taxonomy_version_info,
      embeddings_taxonomy_version: data.embeddings_taxonomy_version,
      last_taxonomy_update: data.last_taxonomy_update
    };
    
    // Verificar se embeddings existem
    const embeddingsExist = data.embeddings_generated_at || data.embeddings_structure === 'chunked';
    
    // Calcular hash atual da taxonomia
    const currentKeywordsHash = generateSimpleHash(data.keywords || []);
    const currentProblemsHash = generateSimpleHash(data.problems || []);
    
    // Comparar com hash dos embeddings (se existir)
    const storedKeywordsHash = data.taxonomy_version_info?.keywords_hash;
    const storedProblemsHash = data.taxonomy_version_info?.problems_hash;
    
    const keywordsChanged = storedKeywordsHash && currentKeywordsHash !== storedKeywordsHash;
    const problemsChanged = storedProblemsHash && currentProblemsHash !== storedProblemsHash;
    
    const result = {
      success: true,
      embeddings_exist: embeddingsExist,
      basic_info: basicInfo,
      hash_comparison: {
        keywords: {
          current_hash: currentKeywordsHash,
          stored_hash: storedKeywordsHash,
          changed: keywordsChanged
        },
        problems: {
          current_hash: currentProblemsHash,
          stored_hash: storedProblemsHash,
          changed: problemsChanged
        }
      },
      status_summary: {
        embeddings_exist: embeddingsExist,
        taxonomy_changed: keywordsChanged || problemsChanged,
        needs_regeneration: embeddingsExist && (keywordsChanged || problemsChanged),
        first_time_setup: !embeddingsExist && !storedKeywordsHash
      },
      recommendations: {
        action: !embeddingsExist 
          ? 'Gerar embeddings pela primeira vez'
          : (keywordsChanged || problemsChanged)
          ? 'Regenerar embeddings - taxonomia foi alterada'
          : 'Embeddings estão atualizados',
        priority: !embeddingsExist ? 'high' : (keywordsChanged || problemsChanged) ? 'medium' : 'low'
      }
    };
    
    console.log('📊 Resultado do debug:', result.status_summary);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Erro no debug:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// Função helper para gerar hash simples
function generateSimpleHash(items: any[]): string {
  if (!items || items.length === 0) return 'empty';
  
  const sortedItems = items
    .map(item => `${item.id || item}:${item.label || item}`)
    .sort()
    .join('|');
  
  let hash = 0;
  for (let i = 0; i < sortedItems.length; i++) {
    const char = sortedItems.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}