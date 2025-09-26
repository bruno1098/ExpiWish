import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticateRequest } from '@/lib/server-auth';
import { detectTaxonomyChanges, checkEmbeddingsStatus } from '@/lib/taxonomy-version-manager';

export interface EmbeddingsStatus {
  exists: boolean;
  generated_at?: Date;
  keywords_count: number;
  problems_count: number;
  departments_count: number;
  version: number;
  structure: 'legacy' | 'chunked';
  last_error?: string;
  generation_progress?: number;
  // Novos campos para detecção de mudanças
  taxonomy_outdated?: boolean;
  needs_regeneration?: boolean;
  changes_detected?: {
    keywords: { added: number; removed: number; modified: number };
    problems: { added: number; removed: number; modified: number };
    departments: { added: number; removed: number; modified: number };
  };
  last_taxonomy_update?: Date;
  embeddings_taxonomy_version?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userData) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 Verificando status dos embeddings...');
    
    // Verificar documento principal da taxonomia
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({
        exists: false,
        keywords_count: 0,
        problems_count: 0,
        departments_count: 0,
        version: 0,
        structure: 'legacy',
        taxonomy_outdated: false,
        needs_regeneration: true
      } as EmbeddingsStatus);
    }
    
    const data = docSnap.data();
    
    // Verificar mudanças na taxonomia
    const taxonomy = {
      keywords: data.keywords || [],
      problems: data.problems || [],
      departments: data.departments || []
    };
    
    const changeDetection = await detectTaxonomyChanges(taxonomy);
    
    // Verificar se embeddings foram gerados
    const hasEmbeddings = data.embeddings_generated_at || data.embeddings_structure === 'chunked';
    
    if (!hasEmbeddings) {
      return NextResponse.json({
        exists: false,
        keywords_count: data.keywords?.length || 0,
        problems_count: data.problems?.length || 0,
        departments_count: data.departments?.length || 0,
        version: 1,
        structure: 'legacy'
      } as EmbeddingsStatus);
    }
    
    // Embeddings existem - verificar estrutura
    const isChunked = data.embeddings_structure === 'chunked';
    const stats = data.batch_generation_stats || {};
    
    const status: EmbeddingsStatus = {
      exists: true,
      generated_at: data.embeddings_generated_at?.toDate(),
      keywords_count: stats.total_keywords || data.keywords_with_embeddings?.length || 0,
      problems_count: stats.total_problems || data.problems_with_embeddings?.length || 0,
      departments_count: data.departments?.length || 0,
      version: data.taxonomy_version || 1,
      structure: isChunked ? 'chunked' : 'legacy',
      // Informações sobre mudanças na taxonomia
      taxonomy_outdated: changeDetection.embeddingsOutdated,
      needs_regeneration: changeDetection.recommendRegeneration,
      changes_detected: changeDetection.hasChanges ? changeDetection.changesDetected : undefined,
      last_taxonomy_update: data.last_taxonomy_update?.toDate(),
      embeddings_taxonomy_version: data.embeddings_taxonomy_version
    };
    
    console.log('✅ Status dos embeddings:', status);

    return NextResponse.json(status);
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar status dos embeddings:', error);
    
    return NextResponse.json({
      exists: false,
      keywords_count: 0,
      problems_count: 0,
      departments_count: 0,
      version: 0,
      structure: 'legacy',
      last_error: error.message
    } as EmbeddingsStatus, { status: 500 });
  }
}

// Endpoint para verificação rápida (sem autenticação para uso interno)
export async function POST(request: NextRequest) {
  try {
    const { quick_check } = await request.json();
    
    if (!quick_check) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    // Verificação rápida apenas se embeddings existem
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ exists: false });
    }
    
    const data = docSnap.data();
    const hasEmbeddings = data.embeddings_generated_at || data.embeddings_structure === 'chunked';
    
    return NextResponse.json({ 
      exists: hasEmbeddings,
      structure: data.embeddings_structure || 'legacy'
    });
    
  } catch (error: any) {
    console.error('❌ Erro na verificação rápida:', error);
    return NextResponse.json({ exists: false, error: error.message });
  }
}