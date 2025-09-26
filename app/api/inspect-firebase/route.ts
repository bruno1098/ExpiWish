// Endpoint para inspecionar dados brutos do Firebase
import { NextResponse } from "next/server";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Documento não encontrado'
      });
    }
    
    const data = docSnap.data();
    
    const response = {
      success: true,
      raw_data_keys: Object.keys(data),
      original_data: {
        departments: Array.isArray(data.departments) ? data.departments.length : 'not array',
        keywords: Array.isArray(data.keywords) ? data.keywords.length : 'not array', 
        problems: Array.isArray(data.problems) ? data.problems.length : 'not array',
      },
      pre_generated_data: {
        keywords_with_embeddings: data.keywords_with_embeddings ? data.keywords_with_embeddings.length : 'not found',
        problems_with_embeddings: data.problems_with_embeddings ? data.problems_with_embeddings.length : 'not found',
        embeddings_generated_at: data.embeddings_generated_at ? data.embeddings_generated_at.toString() : 'not found',
        generation_stats: data.batch_generation_stats || 'not found'
      },
      sample_keyword_with_embedding: data.keywords_with_embeddings ? {
        label: data.keywords_with_embeddings[0]?.label,
        has_embedding: Array.isArray(data.keywords_with_embeddings[0]?.embedding) && data.keywords_with_embeddings[0].embedding.length > 0,
        embedding_length: data.keywords_with_embeddings[0]?.embedding?.length || 0
      } : 'no keywords_with_embeddings found',
      sample_problem_with_embedding: data.problems_with_embeddings ? {
        label: data.problems_with_embeddings[0]?.label,
        has_embedding: Array.isArray(data.problems_with_embeddings[0]?.embedding) && data.problems_with_embeddings[0].embedding.length > 0,
        embedding_length: data.problems_with_embeddings[0]?.embedding?.length || 0
      } : 'no problems_with_embeddings found'
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}