/**
 * Sistema de Versionamento da Taxonomia
 * Detecta mudanças e gerencia atualizações de embeddings automaticamente
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TaxonomyVersion {
  version: number;
  last_updated: Date;
  keywords_count: number;
  problems_count: number;
  departments_count: number;
  keywords_hash: string;
  problems_hash: string;
  departments_hash: string;
  embeddings_version?: number;
  embeddings_outdated: boolean;
}

export interface TaxonomyChangeDetection {
  hasChanges: boolean;
  changesDetected: {
    keywords: { added: number; removed: number; modified: number };
    problems: { added: number; removed: number; modified: number };
    departments: { added: number; removed: number; modified: number };
  };
  embeddingsOutdated: boolean;
  recommendRegeneration: boolean;
  lastEmbeddingsVersion?: number;
  currentTaxonomyVersion: number;
}

/**
 * Gera hash simples para detectar mudanças
 */
function generateHash(items: any[]): string {
  const sortedItems = items
    .map(item => `${item.id}:${item.label}:${item.status || 'active'}`)
    .sort()
    .join('|');
  
  // Hash simples baseado no conteúdo
  let hash = 0;
  for (let i = 0; i < sortedItems.length; i++) {
    const char = sortedItems.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Calcula versão da taxonomia baseada no conteúdo
 */
export function calculateTaxonomyVersion(taxonomy: any): TaxonomyVersion {
  const keywords = taxonomy.keywords || [];
  const problems = taxonomy.problems || [];
  const departments = taxonomy.departments || [];

  const keywordsHash = generateHash(keywords);
  const problemsHash = generateHash(problems);
  const departmentsHash = generateHash(departments);

  // Versão baseada na combinação dos hashes
  const combinedHash = `${keywordsHash}-${problemsHash}-${departmentsHash}`;
  let version = 0;
  for (let i = 0; i < combinedHash.length; i++) {
    version = ((version << 5) - version) + combinedHash.charCodeAt(i);
    version = version & version;
  }

  return {
    version: Math.abs(version),
    last_updated: new Date(),
    keywords_count: keywords.length,
    problems_count: problems.length,
    departments_count: departments.length,
    keywords_hash: keywordsHash,
    problems_hash: problemsHash,
    departments_hash: departmentsHash,
    embeddings_outdated: false // Será calculado depois
  };
}

/**
 * Detecta mudanças na taxonomia comparando com versão anterior
 */
export async function detectTaxonomyChanges(currentTaxonomy: any): Promise<TaxonomyChangeDetection> {
  try {
    // Carregar versão anterior do Firebase
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    const currentVersion = calculateTaxonomyVersion(currentTaxonomy);
    
    if (!docSnap.exists()) {
      // Primeira vez - não há versão anterior
      return {
        hasChanges: true,
        changesDetected: {
          keywords: { added: currentVersion.keywords_count, removed: 0, modified: 0 },
          problems: { added: currentVersion.problems_count, removed: 0, modified: 0 },
          departments: { added: currentVersion.departments_count, removed: 0, modified: 0 }
        },
        embeddingsOutdated: true,
        recommendRegeneration: true,
        currentTaxonomyVersion: currentVersion.version
      };
    }

    const data = docSnap.data();
    const previousVersion = data.taxonomy_version_info;
    const embeddingsVersion = data.embeddings_taxonomy_version;
    const embeddingsExist = data.embeddings_generated_at || data.embeddings_structure === 'chunked';

    console.log('🔍 Comparando versões:', {
      current: currentVersion,
      previous: previousVersion,
      embeddings_version: embeddingsVersion,
      embeddings_exist: embeddingsExist
    });

    if (!previousVersion) {
      // Não há informação de versão anterior - primeira execução
      console.log('📝 Primeira execução - salvando versão inicial');
      
      // Salvar versão atual como baseline
      await updateTaxonomyVersion(currentTaxonomy);
      
      return {
        hasChanges: embeddingsExist ? false : true, // Se embeddings existem, não há mudanças
        changesDetected: {
          keywords: { added: embeddingsExist ? 0 : currentVersion.keywords_count, removed: 0, modified: 0 },
          problems: { added: embeddingsExist ? 0 : currentVersion.problems_count, removed: 0, modified: 0 },
          departments: { added: embeddingsExist ? 0 : currentVersion.departments_count, removed: 0, modified: 0 }
        },
        embeddingsOutdated: !embeddingsExist,
        recommendRegeneration: !embeddingsExist,
        currentTaxonomyVersion: currentVersion.version
      };
    }

    // Comparar hashes para detectar mudanças
    const keywordsChanged = currentVersion.keywords_hash !== previousVersion.keywords_hash;
    const problemsChanged = currentVersion.problems_hash !== previousVersion.problems_hash;
    const departmentsChanged = currentVersion.departments_hash !== previousVersion.departments_hash;

    const hasChanges = keywordsChanged || problemsChanged || departmentsChanged;
    
    // Calcular mudanças específicas
    const changesDetected = {
      keywords: {
        added: Math.max(0, currentVersion.keywords_count - (previousVersion.keywords_count || 0)),
        removed: Math.max(0, (previousVersion.keywords_count || 0) - currentVersion.keywords_count),
        modified: keywordsChanged ? 1 : 0 // Simplificado - detecta se houve mudança
      },
      problems: {
        added: Math.max(0, currentVersion.problems_count - (previousVersion.problems_count || 0)),
        removed: Math.max(0, (previousVersion.problems_count || 0) - currentVersion.problems_count),
        modified: problemsChanged ? 1 : 0
      },
      departments: {
        added: Math.max(0, currentVersion.departments_count - (previousVersion.departments_count || 0)),
        removed: Math.max(0, (previousVersion.departments_count || 0) - currentVersion.departments_count),
        modified: departmentsChanged ? 1 : 0
      }
    };

    // Verificar se embeddings estão desatualizados
    const embeddingsOutdated = hasChanges || (
      embeddingsVersion && embeddingsVersion !== currentVersion.version
    );

    // Recomendar regeneração se há mudanças significativas
    const totalChanges = changesDetected.keywords.added + changesDetected.keywords.removed +
                        changesDetected.problems.added + changesDetected.problems.removed +
                        changesDetected.departments.added + changesDetected.departments.removed;
    
    const recommendRegeneration = embeddingsOutdated || totalChanges > 0;
    
    console.log('📊 Análise de mudanças:', {
      hasChanges,
      totalChanges,
      embeddingsOutdated,
      recommendRegeneration,
      currentVersion: currentVersion.version,
      embeddingsVersion
    });

    return {
      hasChanges,
      changesDetected,
      embeddingsOutdated,
      recommendRegeneration,
      lastEmbeddingsVersion: embeddingsVersion,
      currentTaxonomyVersion: currentVersion.version
    };

  } catch (error) {
    console.error('Erro ao detectar mudanças na taxonomia:', error);
    return {
      hasChanges: false,
      changesDetected: {
        keywords: { added: 0, removed: 0, modified: 0 },
        problems: { added: 0, removed: 0, modified: 0 },
        departments: { added: 0, removed: 0, modified: 0 }
      },
      embeddingsOutdated: false,
      recommendRegeneration: false,
      currentTaxonomyVersion: 1
    };
  }
}

/**
 * Atualiza informações de versão no Firebase
 */
export async function updateTaxonomyVersion(taxonomy: any): Promise<void> {
  try {
    const version = calculateTaxonomyVersion(taxonomy);
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    
    await updateDoc(docRef, {
      taxonomy_version_info: {
        ...version,
        last_updated: new Date()
      },
      taxonomy_version: version.version,
      last_taxonomy_update: new Date()
    });

    console.log('✅ Versão da taxonomia atualizada:', version.version);
  } catch (error) {
    console.error('❌ Erro ao atualizar versão da taxonomia:', error);
  }
}

/**
 * Marca embeddings como atualizados para a versão atual
 */
export async function markEmbeddingsUpdated(taxonomyVersion: number): Promise<void> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    
    await updateDoc(docRef, {
      embeddings_taxonomy_version: taxonomyVersion,
      embeddings_updated_at: new Date()
    });

    console.log('✅ Embeddings marcados como atualizados para versão:', taxonomyVersion);
  } catch (error) {
    console.error('❌ Erro ao marcar embeddings como atualizados:', error);
  }
}

/**
 * Verifica se embeddings precisam ser atualizados
 */
export async function checkEmbeddingsStatus(): Promise<{
  needsUpdate: boolean;
  reason: string;
  changes?: TaxonomyChangeDetection;
}> {
  try {
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return {
        needsUpdate: true,
        reason: 'Taxonomia não encontrada'
      };
    }

    const data = docSnap.data();
    const taxonomy = {
      keywords: data.keywords || [],
      problems: data.problems || [],
      departments: data.departments || []
    };

    const changes = await detectTaxonomyChanges(taxonomy);
    
    if (changes.recommendRegeneration) {
      const totalChanges = Object.values(changes.changesDetected).reduce((total, category) => 
        total + category.added + category.removed + category.modified, 0
      );
      
      return {
        needsUpdate: true,
        reason: `Detectadas ${totalChanges} mudanças na taxonomia`,
        changes
      };
    }

    return {
      needsUpdate: false,
      reason: 'Embeddings estão atualizados',
      changes
    };

  } catch (error) {
    console.error('Erro ao verificar status dos embeddings:', error);
    return {
      needsUpdate: false,
      reason: 'Erro na verificação'
    };
  }
}