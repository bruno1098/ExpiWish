// Serviço de embeddings para similarity search
import OpenAI from 'openai';
import { getOpenAIApiKey } from './openai-config';

// Cache de embeddings para evitar requests desnecessários
interface CachedEmbedding {
  embedding: number[];
  timestamp: number;
}

const embeddingCache = new Map<string, CachedEmbedding>();
const EMBEDDING_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CACHE_SIZE = 5000;

/**
 * Gera embedding para um texto usando OpenAI
 */
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  if (!text?.trim()) {
    throw new Error('Text cannot be empty');
  }

  // Normalizar texto para cache
  const normalizedText = text.toLowerCase().trim();
  const cacheKey = `embed_${normalizedText}`;

  // Verificar cache
  const cached = embeddingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_EXPIRY) {
    return cached.embedding;
  }

  // Usar API key do parâmetro ou das variáveis de ambiente
  const openaiApiKey = apiKey || getOpenAIApiKey();
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not found');
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: normalizedText,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;
    
    // Limpar cache se muito grande
    if (embeddingCache.size >= MAX_CACHE_SIZE) {
      clearOldCache();
    }

    // Salvar no cache
    embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    });

    return embedding;

  } catch (error: any) {
    console.error('Error generating embedding:', error);
    
    if (error?.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    if (error?.code === 'invalid_request_error') {
      throw new Error('Invalid request to OpenAI API');
    }
    
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Calcula cosine similarity entre dois vetores
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Encontra os N itens mais similares a um texto
 */
export function findTopSimilar(
  targetEmbedding: number[],
  candidates: { id: string; label: string; embedding: number[] }[],
  topN: number = 10
): Array<{ id: string; label: string; similarity: number }> {
  
  const similarities = candidates.map(candidate => ({
    id: candidate.id,
    label: candidate.label,
    similarity: cosineSimilarity(targetEmbedding, candidate.embedding)
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

/**
 * Calcula distância euclidiana entre dois vetores
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normaliza um vetor para magnitude unitária
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude === 0 ? vector : vector.map(val => val / magnitude);
}

/**
 * Gera embeddings em batch para múltiplos textos
 */
export async function generateBatchEmbeddings(
  texts: string[], 
  apiKey?: string,
  batchSize: number = 100
): Promise<number[][]> {
  
  if (texts.length === 0) {
    return [];
  }

  const results: number[][] = [];
  
  // Processar em chunks
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    // Usar API key do parâmetro ou das variáveis de ambiente
    const openaiApiKey = apiKey || getOpenAIApiKey();
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map(text => text.toLowerCase().trim()),
        encoding_format: 'float',
      });

      // Adicionar embeddings do batch aos resultados
      for (const data of response.data) {
        results.push(data.embedding);
        
        // Cache individual dos embeddings
        const originalText = batch[data.index];
        const cacheKey = `embed_${originalText.toLowerCase().trim()}`;
        embeddingCache.set(cacheKey, {
          embedding: data.embedding,
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      console.error(`Error in batch embedding (batch ${i}-${i + batchSize}):`, error);
      throw new Error(`Batch embedding failed: ${error.message}`);
    }
  }

  return results;
}

/**
 * Remove entradas antigas do cache para liberar memória
 */
function clearOldCache(): void {
  const now = Date.now();
  const entries = Array.from(embeddingCache.entries());
  
  // Remove entradas expiradas primeiro
  let removedExpired = 0;
  for (const [key, value] of entries) {
    if (now - value.timestamp > EMBEDDING_CACHE_EXPIRY) {
      embeddingCache.delete(key);
      removedExpired++;
    }
  }

  // Se ainda está muito cheio, remove as mais antigas
  if (embeddingCache.size >= MAX_CACHE_SIZE * 0.9) {
    const sortedEntries = Array.from(embeddingCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.floor(embeddingCache.size * 0.3); // Remove 30%
    for (let i = 0; i < toRemove; i++) {
      embeddingCache.delete(sortedEntries[i][0]);
    }
  }
}

/**
 * Limpa todo o cache de embeddings
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(embeddingCache.values());
  const expired = entries.filter(e => now - e.timestamp > EMBEDDING_CACHE_EXPIRY).length;
  
  return {
    total: embeddingCache.size,
    expired,
    active: embeddingCache.size - expired,
    maxSize: MAX_CACHE_SIZE
  };
}

/**
 * Verifica se dois textos são similares semanticamente
 */
export async function areTextsSimilar(
  text1: string, 
  text2: string, 
  threshold: number = 0.85,
  apiKey?: string
): Promise<{ similar: boolean; similarity: number }> {
  
  const [embedding1, embedding2] = await Promise.all([
    generateEmbedding(text1, apiKey),
    generateEmbedding(text2, apiKey)
  ]);

  const similarity = cosineSimilarity(embedding1, embedding2);
  
  return {
    similar: similarity >= threshold,
    similarity
  };
}