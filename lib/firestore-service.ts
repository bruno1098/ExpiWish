import { collection, addDoc, getDocs, doc, getDoc, query, orderBy, Timestamp, where, setDoc, deleteDoc, updateDoc, limit } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUserData, UserData } from './auth-service';

// Interface para os dados de análise
export interface AnalysisData {
  hotelId: string; // Campo para identificar o hotel
  hotelName: string;
  importDate: any; // Firestore Timestamp
  data: any[]; // Dados do XLSX
  analysis: any; // Resultado da análise do GPT
  isTestEnvironment?: boolean; // Propriedade opcional para ambiente de teste
  deleted?: boolean; // Flag para análises excluídas
  deletedAt?: string; // Data de exclusão
  deletedBy?: string; // Usuário que excluiu
  deletedReason?: string; // Motivo da exclusão
  hidden?: boolean; // Flag para análises ocultas
  hiddenAt?: Date | null; // Data de ocultação
  hiddenReason?: string | null; // Motivo da ocultação
}

// Nova estrutura hierárquica: analyse/{hotelId}/feedbacks/{feedbackId}
const COLLECTION_ANALYSE = 'analyse';
const SUBCOLLECTION_FEEDBACKS = 'feedbacks';

// Função para gerar ID numérico de 5 dígitos
const generateNumericId = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Função para gerar ID único mais robusta com milissegundos
const generateUniqueId = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const millisecond = now.getMilliseconds().toString().padStart(3, '0');
  
  // Formato: ddmmaa_hhmmss_mmm (incluindo milissegundos)
  return `${day}${month}${year}_${hour}${minute}${second}_${millisecond}`;
};

// Função utilitária para gerar IDs únicos mais robustos que evitem duplicações
export const generateRobustUniqueId = (prefix?: string) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const baseId = generateUniqueId();
  
  // Combinar timestamp, ID base e número aleatório para máxima unicidade
  const robustId = `${baseId}_${timestamp}_${random}`;
  
  return prefix ? `${prefix}_${robustId}` : robustId;
};

// Função para detectar e corrigir IDs duplicados em análises existentes no Firebase
export const detectAndFixDuplicateIds = async () => {
  try {
    console.log('🔍 Iniciando detecção de IDs duplicados...');
    
    const analysesRef = collection(db, COLLECTION_ANALYSE);
    const snapshot = await getDocs(analysesRef);
    
    const duplicateReport = {
      totalHotels: 0,
      duplicatesFound: 0,
      duplicatesFixed: 0,
      errors: [] as string[]
    };
    
    for (const hotelDoc of snapshot.docs) {
      duplicateReport.totalHotels++;
      const hotelId = hotelDoc.id;
      
      try {
        // Buscar todos os feedbacks deste hotel
        const feedbacksRef = collection(db, COLLECTION_ANALYSE, hotelId, SUBCOLLECTION_FEEDBACKS);
        const feedbacksSnapshot = await getDocs(feedbacksRef);
        
        const feedbackIds = new Map<string, string[]>();
        
        // Agrupar feedbacks por ID base (sem milissegundos)
        feedbacksSnapshot.docs.forEach(doc => {
          const fullId = doc.id;
          // Extrair ID base removendo milissegundos e timestamp se existirem
          const baseId = fullId.split('_').slice(0, 2).join('_'); // ddmmaa_hhmmss
          
          if (!feedbackIds.has(baseId)) {
            feedbackIds.set(baseId, []);
          }
          feedbackIds.get(baseId)!.push(fullId);
        });
        
        // Identificar e corrigir duplicatas
         for (const [baseId, ids] of Array.from(feedbackIds.entries())) {
          if (ids.length > 1) {
            duplicateReport.duplicatesFound += ids.length - 1;
            console.log(`⚠️ Duplicatas encontradas para ${hotelId}/${baseId}:`, ids);
            
            // Manter o primeiro, renomear os outros
            for (let i = 1; i < ids.length; i++) {
              const oldId = ids[i];
              const newId = generateRobustUniqueId('fixed');
              
              try {
                // Buscar dados do documento antigo
                const oldDocRef = doc(db, COLLECTION_ANALYSE, hotelId, SUBCOLLECTION_FEEDBACKS, oldId);
                const oldDocSnap = await getDoc(oldDocRef);
                
                if (oldDocSnap.exists()) {
                  const data = oldDocSnap.data();
                  
                  // Criar novo documento com ID único
                  const newDocRef = doc(db, COLLECTION_ANALYSE, hotelId, SUBCOLLECTION_FEEDBACKS, newId);
                  await setDoc(newDocRef, {
                    ...data,
                    originalId: oldId,
                    fixedAt: new Date().toISOString(),
                    fixReason: 'Duplicate ID detected and fixed'
                  });
                  
                  // Deletar documento antigo
                  await deleteDoc(oldDocRef);
                  
                  duplicateReport.duplicatesFixed++;
                  console.log(`✅ Duplicata corrigida: ${oldId} → ${newId}`);
                }
              } catch (error) {
                const errorMsg = `Erro ao corrigir duplicata ${oldId}: ${error}`;
                duplicateReport.errors.push(errorMsg);
                console.error(errorMsg);
              }
            }
          }
        }
      } catch (error) {
        const errorMsg = `Erro ao processar hotel ${hotelId}: ${error}`;
        duplicateReport.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    console.log('📊 Relatório de correção de duplicatas:', duplicateReport);
    return duplicateReport;
    
  } catch (error) {
    console.error('❌ Erro na detecção de duplicatas:', error);
    throw error;
  }
};

// Função para normalizar nome do hotel para usar como ID do documento
export const normalizeHotelName = (hotelName: string): string => {
  return hotelName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por underscore
    .replace(/_+/g, '_') // Remove underscores duplos
    .replace(/^_|_$/g, ''); // Remove underscores do início e fim
};

// Função para salvar uma nova análise na estrutura hierárquica
// ✅ CORREÇÃO: Aceitar importDate como parâmetro em vez de gerar nova data
export const saveAnalysis = async (analysisData: AnalysisData | Omit<AnalysisData, 'importDate'>) => {
  try {
    
    // Verificar se estamos em ambiente de teste
    const isTestEnv = typeof window !== 'undefined' && localStorage.getItem('isTestEnvironment') === 'true';
    
    // Normalizar nome do hotel para usar como ID do documento
    const hotelDocId = normalizeHotelName(analysisData.hotelName);
    
    // Função recursiva para remover campos undefined
    const removeUndefined = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      
      // Se for um array, filtrar e mapear
      if (Array.isArray(obj)) {
        return obj
          .filter(item => item !== undefined)
          .map(item => removeUndefined(item));
      }
      
      // Se for um objeto, processar cada propriedade
      const cleanObj: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleanObj[key] = removeUndefined(obj[key]);
        }
      }
      return cleanObj;
    };
    
    // Limpar dados antes de salvar
    const cleanData = removeUndefined(analysisData);
    
    // Adicionar flag de ambiente de teste se necessário
    if (isTestEnv) {
      cleanData.isTestEnvironment = true;
    }
    
    // Gerar ID incluindo hotelId para consistência com import
    const feedbackId = `${hotelDocId}_${generateUniqueId()}`;
    
    // Estrutura correta: analyse/{hotelId}/feedbacks/{feedbackId}
    const feedbackDocRef = doc(
      db, 
      COLLECTION_ANALYSE, 
      hotelDocId, 
      SUBCOLLECTION_FEEDBACKS, 
      feedbackId
    );
    
    // ✅ SOLUÇÃO DEFINITIVA: Usar importDate passado ou criar novo se não houver
    let importTimestamp: any;
    
    if ('importDate' in analysisData && analysisData.importDate) {
      // Usar a data que foi passada (já capturada no momento correto da importação)
      const importDate = analysisData.importDate instanceof Date 
        ? analysisData.importDate 
        : analysisData.importDate;
      importTimestamp = Timestamp.fromDate(importDate as Date);
      
      console.log('📅 Usando data de importação passada:');
      console.log('   Data:', (importDate as Date).toLocaleDateString('pt-BR'));
      console.log('   Hora:', (importDate as Date).toLocaleTimeString('pt-BR'));
    } else {
      // Fallback: criar nova data se não foi passada
      const now = new Date();
      importTimestamp = Timestamp.fromDate(now);
      
      console.log('📅 Criando nova data de importação (fallback):');
      console.log('   Data:', now.toLocaleDateString('pt-BR'));
      console.log('   Hora:', now.toLocaleTimeString('pt-BR'));
    }
    
    await setDoc(feedbackDocRef, {
      ...cleanData,
      importDate: importTimestamp
    });

    return feedbackId;
  } catch (error) {
    console.error('Erro ao salvar análise:', error);
    throw error;
  }
};

// Cache para otimizar carregamento
let analysesCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 segundos

// Função para limpar o cache (útil após atualizações)
export const clearAnalysesCache = () => {
  analysesCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Cache de análises limpo');
};

// Função para obter todas as análises da nova estrutura hierárquica
export const getAllAnalyses = async (hotelId?: string, includeHidden: boolean = false) => {
  try {
    const userData = await getCurrentUserData();
    const isAdmin = userData?.role === 'admin';
    
    // Verificar ambiente de teste
    const isTestEnv = typeof window !== 'undefined' && localStorage.getItem('isTestEnvironment') === 'true';

    // Interface para os documentos retornados
    interface AnalysisDoc extends AnalysisData {
      id: string;
      isTestEnvironment?: boolean;
      hotelDocId?: string;
      hotelDisplayName?: string;
      deleted?: boolean;
    }
    
    const results: AnalysisDoc[] = [];

    if (isAdmin) {
      // Admin: buscar todos os hotéis ou um específico
      
      try {
        const hotels = await listAllHotels();
        
        // Para cada hotel encontrado, buscar seus feedbacks
        for (const hotel of hotels) {
          // Se hotelId foi especificado, filtrar apenas esse hotel
          if (hotelId && hotel.docId !== hotelId) {
            continue;
          }
          
          try {
            console.log(`Buscando feedbacks para hotel: ${hotel.hotelName} (${hotel.docId})`);
            
            const feedbacksRef = collection(
              db, 
              COLLECTION_ANALYSE, 
              hotel.docId, 
              SUBCOLLECTION_FEEDBACKS
            );
            
            const feedbacksSnapshot = await getDocs(feedbacksRef);
            
            feedbacksSnapshot.docs.forEach((feedbackDoc) => {
              const data = feedbackDoc.data() as AnalysisData;
              results.push({
                id: feedbackDoc.id, // IMPORTANTE: usar o ID do documento
                ...data,
                // Adicionar informação do hotel baseado na estrutura hierárquica
                hotelDocId: hotel.docId,  // ID do documento do hotel
                hotelDisplayName: hotel.hotelName // Nome real do hotel
              });
            });
          } catch (error) {
            
          }
        }

      } catch (error) {
        console.error('Erro ao buscar dados para admin:', error);
      }
    } else {
      // Usuário normal: buscar apenas feedbacks do seu hotel
      
      if (userData?.hotelId) {
        try {
          // Buscar na coleção hotels o nome do hotel do usuário
          const hotelDocRef = doc(db, 'hotels', userData.hotelId);
          const hotelDoc = await getDoc(hotelDocRef);
          
          if (hotelDoc.exists()) {
            const hotelData = hotelDoc.data();
            const hotelName = hotelData.name;
            const hotelDocId = normalizeHotelName(hotelName);
            
            console.log(`Buscando feedbacks para hotel do usuário: ${hotelName} (${hotelDocId})`);
            
            const feedbacksRef = collection(
              db, 
              COLLECTION_ANALYSE, 
              hotelDocId, 
              SUBCOLLECTION_FEEDBACKS
            );
            
            const querySnapshot = await getDocs(feedbacksRef);
            
            querySnapshot.docs.forEach((docSnap) => {
              const data = docSnap.data() as AnalysisData;
              results.push({
                id: docSnap.id,  // IMPORTANTE: usar o ID do documento, não o campo interno
                ...data,
                // Adicionar informação do hotel
                hotelDocId: userData.hotelId,
                hotelDisplayName: hotelName
              });
            });
          } else {
            
          }
        } catch (error) {
          
        }
      } else {
        
      }
    }
    
    // Filtrar resultados por ambiente de teste, análises não excluídas e visibilidade
    const filteredResults = results.filter((doc: AnalysisDoc) => {
      // Filtrar por ambiente de teste
      const testFilter = isTestEnv || doc.isTestEnvironment !== true;
      
      // Filtrar análises não excluídas
      const deletedFilter = !doc.deleted;
      
      // Filtrar análises ocultas (apenas se includeHidden for false)
      const hiddenFilter = includeHidden || !doc.hidden;
      
      return testFilter && deletedFilter && hiddenFilter;
    });

    // Ordenar por data de importação - MAIS RECENTE PRIMEIRO
    const sortedResults = filteredResults.sort((a, b) => {
      // Converter timestamps para Date para comparação
      let dateA: Date;
      let dateB: Date;
      
      // Tratar diferentes formatos de data
      if (a.importDate && typeof a.importDate === 'object' && 'toDate' in a.importDate) {
        // Firestore Timestamp
        dateA = (a.importDate as any).toDate();
      } else if (a.importDate) {
        // String ou Date
        dateA = new Date(a.importDate);
      } else {
        // Fallback para data muito antiga se não tiver importDate
        dateA = new Date('1900-01-01');
      }
      
      if (b.importDate && typeof b.importDate === 'object' && 'toDate' in b.importDate) {
        // Firestore Timestamp
        dateB = (b.importDate as any).toDate();
      } else if (b.importDate) {
        // String ou Date
        dateB = new Date(b.importDate);
      } else {
        // Fallback para data muito antiga se não tiver importDate
        dateB = new Date('1900-01-01');
      }
      
      // Ordenação decrescente (mais recente primeiro)
      return dateB.getTime() - dateA.getTime();
    });

    return sortedResults;
  } catch (error) {
    console.error("Erro ao buscar análises:", error);
    throw error;
  }
};

// Função para obter análise por ID - busca apenas no hotel do usuário logado
export const getAnalysisById = async (id: string) => {
  if (!id) {
    throw new Error('ID não fornecido');
  }
  
  try {
    const userData = await getCurrentUserData();
    
    if (!userData || !userData.hotelId) {
      throw new Error('Usuário não autenticado ou hotel não identificado');
    }

    const hotelDocId = normalizeHotelName(userData.hotelName || '');
    
    const feedbackDocRef = doc(
      db, 
      COLLECTION_ANALYSE, 
      hotelDocId, 
      SUBCOLLECTION_FEEDBACKS, 
      id
    );
    
    const docSnap = await getDoc(feedbackDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      if (!data) {
        throw new Error('Documento existe mas não contém dados');
      }
      
      return {
        id: docSnap.id,
        ...data
      };
    }

    throw new Error('Análise não encontrada no seu hotel');
  } catch (error) {
    console.error('Erro ao obter análise:', error);
    throw error;
  }
};

// Função para obter análise por ID - busca em todos os hotéis (apenas para admins)
export const getAnalysisByIdAdmin = async (id: string) => {
  if (!id) {
    throw new Error('ID não fornecido');
  }
  
  try {
    const userData = await getCurrentUserData();
    
    // Verificar se é admin
    if (userData?.role !== 'admin') {
      throw new Error('Acesso negado: apenas administradores podem buscar em todos os hotéis');
    }
    
    // Buscar em todos os hotéis
    const hotels = await listAllHotels();
    
    for (const hotel of hotels) {
      const feedbackDocRef = doc(
        db, 
        COLLECTION_ANALYSE, 
        hotel.docId, 
        SUBCOLLECTION_FEEDBACKS, 
        id
      );
      
      const docSnap = await getDoc(feedbackDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (!data) {
          throw new Error('Documento existe mas não contém dados');
        }
        
        return {
          id: docSnap.id,
          ...data
        };
      }
    }

    throw new Error('Análise não encontrada');
  } catch (error) {
    console.error('Erro ao obter análise:', error);
    throw error;
  }
};

// Função de migração para mover dados da estrutura antiga para a nova (usar apenas uma vez)
export const migrateToNewStructure = async () => {
  try {
    
    // Buscar todos os documentos da estrutura antiga
    const oldAnalysesRef = collection(db, 'analyses');
    const oldSnapshot = await getDocs(oldAnalysesRef);

    for (const oldDoc of oldSnapshot.docs) {
      const data = oldDoc.data() as AnalysisData;
      
      if (data.hotelName) {
        const hotelDocId = normalizeHotelName(data.hotelName);
        const feedbackId = generateNumericId();
        
        // Criar documento na nova estrutura
        const newDocRef = doc(
          db, 
          COLLECTION_ANALYSE, 
          hotelDocId, 
          SUBCOLLECTION_FEEDBACKS, 
          feedbackId
        );
        
        await setDoc(newDocRef, data);
        
      }
    }

  } catch (error) {
    console.error('Erro durante migração:', error);
    throw error;
  }
};

// Função para visualizar a estrutura hierárquica do Firebase
export const visualizeFirebaseStructure = async () => {
  try {

    const hotels = await listAllHotels();

    if (hotels.length === 0) {
      console.log('   └── (vazio)');
      return;
    }
    
    for (const hotel of hotels) {
      
      console.log(`   │   └── 📁 ${SUBCOLLECTION_FEEDBACKS}/ (${hotel.feedbackCount} documentos)`);
    }

  } catch (error) {
    console.error('❌ Erro ao visualizar estrutura:', error);
  }
};

// Função auxiliar para descobrir hotéis na nova estrutura hierárquica
const discoverHotelsInNewStructure = async (): Promise<string[]> => {
  try {
    
    // Usar a coleção 'hotels' para obter lista de hotéis
    const hotelsRef = collection(db, 'hotels');
    const hotelsSnapshot = await getDocs(hotelsRef);
    
    const hotelNames = new Set<string>();
    
    hotelsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.name) {
        const normalizedName = normalizeHotelName(data.name);
        hotelNames.add(normalizedName);
      }
    });
    
    console.log(`Hotéis encontrados na coleção hotels: ${Array.from(hotelNames).join(', ')}`);
    
    // Verificar quais desses hotéis existem na nova estrutura usando Promise.all para melhor performance
    const hotelChecks = Array.from(hotelNames).map(async (hotelId) => {
      try {
        const feedbacksRef = collection(
          db, 
          COLLECTION_ANALYSE, 
          hotelId, 
          SUBCOLLECTION_FEEDBACKS
        );
        
        const snapshot = await getDocs(feedbacksRef);
        return snapshot.empty ? null : hotelId;
      } catch (error) {
        console.warn(`Erro ao verificar hotel ${hotelId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(hotelChecks);
    const existingHotels = results.filter((hotelId): hotelId is string => hotelId !== null);
    
    console.log(`✅ Hotéis com dados encontrados: ${existingHotels.join(', ')}`);
    return existingHotels;
  } catch (error) {
    console.error('Erro ao descobrir hotéis:', error);
    return [];
  }
};

// Função para listar todos os hotéis na nova estrutura
export const listAllHotels = async () => {
  try {
    
    const hotelIds = await discoverHotelsInNewStructure();
    
    const hotels = [];
    
    for (const hotelId of hotelIds) {
      try {
        const feedbacksRef = collection(
          db, 
          COLLECTION_ANALYSE, 
          hotelId, 
          SUBCOLLECTION_FEEDBACKS
        );
        
        const feedbacksSnapshot = await getDocs(feedbacksRef);
        
        // Buscar o primeiro feedback para obter o nome real do hotel
        let realHotelName = hotelId;
        if (!feedbacksSnapshot.empty) {
          const firstFeedback = feedbacksSnapshot.docs[0].data() as AnalysisData;
          realHotelName = firstFeedback.hotelName || hotelId;
        }
        
        hotels.push({
          docId: hotelId,
          hotelName: realHotelName,
          feedbackCount: feedbacksSnapshot.docs.length
        });
      } catch (error) {
        
      }
    }

    return hotels;
  } catch (error) {
    console.error('Erro ao listar hotéis:', error);
    throw error;
  }
};

// Função utilitária para testar a nova estrutura (usar no console do navegador)
export const testNewFirebaseStructure = async () => {
  try {

    // 1. Visualizar estrutura atual
    
    await visualizeFirebaseStructure();
    
    // 2. Listar hotéis
    
    const hotels = await listAllHotels();
    console.table(hotels);
    
    // 3. Testar busca de análises
    
    const analyses = await getAllAnalyses();
    
    if (analyses.length > 0) {

    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
};

// Função para atualizar um feedback específico no Firebase
// Versão original para uso no cliente
export const updateFeedbackInFirestore = async (
  feedbackId: string, 
  updatedFeedback: any
): Promise<boolean> => {
  try {
    const userData = await getCurrentUserData();
    if (!userData || !userData.hotelId) {
      throw new Error('Usuário não autenticado ou hotel não identificado');
    }

    return await updateFeedbackInFirestoreWithUserData(feedbackId, updatedFeedback, userData);
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    throw error;
  }
};

// Versão para uso em API routes (servidor)
export const updateFeedbackInFirestoreWithUserData = async (
  feedbackId: string, 
  updatedFeedback: any,
  userData: UserData
): Promise<boolean> => {
  try {
    if (!userData || !userData.hotelId) {
      throw new Error('Usuário não autenticado ou hotel não identificado');
    }

    const hotelDocId = normalizeHotelName(userData.hotelName || '');
    
    // Buscar todas as análises do hotel para encontrar o feedback
    const analysisCollectionRef = collection(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS);
    const querySnapshot = await getDocs(analysisCollectionRef);
    
    let targetAnalysisId = null;
    let feedbackIndex = -1;
    
    // Procurar o feedback nas análises
    for (const analysisDoc of querySnapshot.docs) {
      const analysisData = analysisDoc.data();
      if (analysisData.data && Array.isArray(analysisData.data)) {
        const index = analysisData.data.findIndex((f: any) => f.id === feedbackId);
        if (index !== -1) {
          targetAnalysisId = analysisDoc.id;
          feedbackIndex = index;
          break;
        }
      }
    }
    
    if (!targetAnalysisId || feedbackIndex === -1) {
      throw new Error('Feedback não encontrado no Firebase');
    }
    
    // Buscar a análise específica
    const analysisDocRef = doc(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS, targetAnalysisId);
    const analysisDoc = await getDoc(analysisDocRef);
    
    if (!analysisDoc.exists()) {
      throw new Error('Análise não encontrada');
    }
    
    const analysisData = analysisDoc.data();
    const updatedData = [...analysisData.data];
    
    // Atualizar o feedback específico - suporta qualquer campo
    updatedData[feedbackIndex] = {
      ...updatedData[feedbackIndex],
      ...updatedFeedback, // Aplicar todas as mudanças passadas
      lastModified: Timestamp.now()
    };
    
    // Salvar de volta no Firebase
    await updateDoc(analysisDocRef, {
      data: updatedData,
      lastModified: Timestamp.now()
    });

    return true;
    
  } catch (error) {
    console.error('Erro ao atualizar feedback no Firebase:', error);
    throw error;
  }
};

// Função para salvar edição recente no Firebase
export const saveRecentEdit = async (editData: any) => {
  try {
    const editsRef = collection(db, "recent_edits")
    const docRef = await addDoc(editsRef, {
      ...editData,
      timestamp: Timestamp.now()
    })

    return docRef.id
  } catch (error) {
    console.error("Erro ao salvar edição recente:", error)
    throw error
  }
}

// Função para obter edições recentes do Firebase
export const getRecentEdits = async (limitDays: number = 7, hotelId?: string) => {
  try {
    const editsRef = collection(db, "recent_edits")
    
    // Buscar todos os documentos e filtrar no cliente para evitar problemas de índice
    const snapshot = await getDocs(editsRef)
    
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - limitDays)
    
    const edits = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((edit: any) => {
        // Verificar se o documento tem os campos necessários
        if (!edit.modifiedAt) {
          return false
        }
        
        // Filtrar pelos últimos X dias
        const editDate = new Date(edit.modifiedAt)
        const isWithinDateRange = editDate >= pastDate
        
        // Se hotelId foi fornecido, filtrar também por hotel
        if (hotelId) {
          // Comparação mais robusta de hotelId - compatível com nova estrutura
          const editHotelId = String(edit.hotelId || '').trim()
          const targetHotelId = String(hotelId || '').trim()
          
          // Verificar correspondência direta
          if (editHotelId === targetHotelId) {
            return isWithinDateRange
          }
          
          // Verificar correspondência parcial (para compatibilidade)
          if (editHotelId && targetHotelId && 
              (editHotelId.includes(targetHotelId) || targetHotelId.includes(editHotelId))) {
            return isWithinDateRange
          }
          
          // Verificar pelo feedbackId se disponível (nova estrutura)
          if (edit.feedbackId && edit.feedbackId.includes(targetHotelId)) {
            return isWithinDateRange
          }
          
          return false
        }
        
        return isWithinDateRange
      })
      .sort((a: any, b: any) => {
        // Ordenar por data mais recente primeiro
        return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
      })

    return edits
  } catch (error) {
    console.error("Erro ao buscar edições recentes:", error)
    return [] // Retorna array vazio em caso de erro
  }
}

// Função para limpar edições antigas (usar apenas para debug/teste)
export const clearRecentEdits = async () => {
  try {
    const editsRef = collection(db, "recent_edits")
    const snapshot = await getDocs(editsRef)
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

  } catch (error) {
    console.error("Erro ao limpar edições:", error)
  }
}

// Função para marcar análise como excluída
export const deleteAnalysisInFirestore = async (
  analysisId: string,
  reason?: string
): Promise<boolean> => {
  try {
    const userData = await getCurrentUserData();
    if (!userData || !userData.hotelId) {
      throw new Error('Usuário não autenticado ou hotel não identificado');
    }

    return await deleteAnalysisInFirestoreWithUserData(analysisId, userData, reason);
  } catch (error) {
    console.error('Erro ao excluir análise:', error);
    throw error;
  }
};

// Versão para uso em API routes (servidor)
export const deleteAnalysisInFirestoreWithUserData = async (
  analysisId: string,
  userData: UserData,
  reason?: string
): Promise<boolean> => {
  try {
    if (!userData || !userData.hotelId) {
      throw new Error('Usuário não autenticado ou hotel não identificado');
    }

    // Buscar informações do hotel do usuário primeiro
    const hotelDocRef = doc(db, 'hotels', userData.hotelId);
    const hotelDoc = await getDoc(hotelDocRef);
    
    if (!hotelDoc.exists()) {
      throw new Error('Hotel não encontrado');
    }
    
    const hotelData = hotelDoc.data();
    const hotelName = hotelData.name;
    const hotelDocId = normalizeHotelName(hotelName);
    
    // Buscar a análise APENAS no hotel do usuário logado
    const analysisDocRef = doc(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS, analysisId);
    const analysisDoc = await getDoc(analysisDocRef);
    
    // Se não encontrou no hotel do usuário, vamos buscar em todos os hotéis
    let foundAnalysisRef = null;
    let foundAnalysisData = null;
    let foundInHotel = null;
    
    if (analysisDoc.exists()) {
      foundAnalysisRef = analysisDocRef;
      foundAnalysisData = analysisDoc.data();
      foundInHotel = hotelDocId;
    } else {
      // SOLUÇÃO ALTERNATIVA: Buscar por campo interno 'id' APENAS no hotel do usuário
      const feedbacksRef = collection(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS);
      const querySnapshot = await getDocs(feedbacksRef);
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if ((data as any).id === analysisId) {
          foundAnalysisRef = doc.ref;
          foundAnalysisData = data;
          foundInHotel = hotelDocId;
          break;
        }
      }
    }
    
    if (!foundAnalysisRef || !foundAnalysisData) {
      throw new Error(`Análise não encontrada no hotel ${hotelName}`);
    }
    
    // Verificar se já foi excluída
    if (foundAnalysisData?.deleted === true) {
      throw new Error('Esta análise já foi excluída anteriormente');
    }
    
    // Marcar como excluída (SOFT DELETE - mantém para backup)
    const updateData = {
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userData.email,
      deletedByName: userData.name || userData.email,
      deletedReason: reason || 'Análise removida pelo usuário',
      lastModified: Timestamp.now(),
      // Manter dados originais para backup
      originalHotelId: foundAnalysisData.hotelId,
      originalHotelName: foundAnalysisData.hotelName,
      backupCreatedAt: foundAnalysisData.importDate || foundAnalysisData.createdAt
    };
    
    await updateDoc(foundAnalysisRef, updateData);
    
    // Limpar cache após exclusão para forçar refresh
    clearAnalysesCache();
    
    return true;
    
  } catch (error) {
    console.error('Erro ao excluir análise:', error);
    throw error;
  }
};

// Função para buscar análises excluídas (para admins recuperarem)
export const getDeletedAnalyses = async () => {
  try {
    const userData = await getCurrentUserData();
    if (userData?.role !== 'admin') {
      throw new Error('Acesso negado - apenas administradores');
    }
    
    const results: any[] = [];
    const hotels = await listAllHotels();
    
    for (const hotel of hotels) {
      const feedbacksRef = collection(db, COLLECTION_ANALYSE, hotel.docId, SUBCOLLECTION_FEEDBACKS);
      const querySnapshot = await getDocs(feedbacksRef);
      
      querySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.deleted === true) {
          results.push({
            id: docSnap.id,
            ...data,
            hotelDocId: hotel.docId,
            hotelDisplayName: hotel.hotelName
          });
        }
      });
    }
    
    return results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    
  } catch (error) {
    console.error('Erro ao buscar análises excluídas:', error);
    throw error;
  }
};

// Função para restaurar análise excluída (para admins)
export const restoreAnalysis = async (analysisId: string) => {
  try {
    const userData = await getCurrentUserData();
    if (userData?.role !== 'admin') {
      throw new Error('Acesso negado - apenas administradores');
    }
    
    // Buscar a análise excluída em todos os hotéis
    const hotels = await listAllHotels();
    
    for (const hotel of hotels) {
      const analysisRef = doc(db, COLLECTION_ANALYSE, hotel.docId, SUBCOLLECTION_FEEDBACKS, analysisId);
      const analysisDoc = await getDoc(analysisRef);
      
      if (analysisDoc.exists() && analysisDoc.data().deleted === true) {
        const restoreData = {
          deleted: false,
          restoredAt: new Date().toISOString(),
          restoredBy: userData.email,
          restoredByName: userData.name || userData.email,
          lastModified: Timestamp.now()
        };
        
        await updateDoc(analysisRef, restoreData);
        console.log('✅ Análise restaurada com sucesso:', analysisId);
        return true;
      }
    }
    
    throw new Error('Análise excluída não encontrada');
    
  } catch (error) {
    console.error('Erro ao restaurar análise:', error);
    throw error;
  }
};

// Função para verificar análises duplicadas
export const checkForDuplicateAnalyses = async () => {
  try {
    console.log('🔍 Verificando análises duplicadas...');
    
    const hotels = await listAllHotels();
    const allAnalyses: any[] = [];
    
    for (const hotel of hotels) {
      const feedbacksRef = collection(db, COLLECTION_ANALYSE, hotel.docId, SUBCOLLECTION_FEEDBACKS);
      const querySnapshot = await getDocs(feedbacksRef);
      
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        allAnalyses.push({
           id: doc.id,
           hotelId: hotel.docId,
           hotelName: hotel.hotelName,
           importDate: data.importDate,
           deleted: data.deleted,
           data: data.data
         });
      });
    }
    
    console.log(`📊 Total de análises encontradas: ${allAnalyses.length}`);
    
    // Agrupar por data de importação para identificar possíveis duplicatas
    const groupedByDate = allAnalyses.reduce((acc, analysis) => {
      const dateKey = analysis.importDate?.toDate?.()?.toISOString() || 'unknown';
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(analysis);
      return acc;
    }, {});
    
    // Identificar grupos com múltiplas análises
    const duplicates = Object.entries(groupedByDate)
      .filter(([date, analyses]: [string, any]) => analyses.length > 1)
      .map(([date, analyses]: [string, any]) => ({ date, analyses }));
    
    if (duplicates.length > 0) {
      console.log('⚠️ Possíveis duplicatas encontradas:');
      duplicates.forEach(({ date, analyses }) => {
        console.log(`📅 Data: ${date}`);
        analyses.forEach((analysis: any) => {
          console.log(`  - ID: ${analysis.id}, Hotel: ${analysis.hotelName}, Excluída: ${analysis.deleted}`);
        });
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    return { total: allAnalyses.length, duplicates };
    
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas:', error);
    throw error;
  }
};



// Disponibilizar funções globalmente para testes no console
if (typeof window !== 'undefined') {
  (window as any).firebaseUtils = {
    migrateToNewStructure,
    visualizeFirebaseStructure,
    listAllHotels,
    testNewFirebaseStructure,
    normalizeHotelName,
    clearRecentEdits,
    getRecentEdits,
    saveRecentEdit,
    checkForDuplicateAnalyses,
    detectAndFixDuplicateIds
  };
}

// Função para alternar visibilidade de análise (ocultar/mostrar)
export const toggleAnalysisVisibility = async (
  analysisId: string,
  hidden: boolean,
  reason?: string,
  userData?: UserData
): Promise<{ success: boolean; message: string; foundInHotel?: string }> => {
  try {
    // Obter dados do usuário se não fornecidos
    let currentUserData = userData;
    if (!currentUserData) {
      const fetchedUserData = await getCurrentUserData();
      if (!fetchedUserData) {
        throw new Error('Usuário não autenticado');
      }
      currentUserData = fetchedUserData;
    }

    let analysisRef = null;
    let analysisSnap = null;
    let foundInHotel: string | undefined = undefined;

    // Buscar a análise na nova estrutura hierárquica
    if (currentUserData.role === 'admin') {
      // Admin pode buscar em todos os hotéis
      const hotels = await listAllHotels();
      
      for (const hotel of hotels) {
        const testAnalysisRef = doc(db, COLLECTION_ANALYSE, hotel.docId, SUBCOLLECTION_FEEDBACKS, analysisId);
        const testAnalysisSnap = await getDoc(testAnalysisRef);
        
        if (testAnalysisSnap.exists()) {
          analysisRef = testAnalysisRef;
          analysisSnap = testAnalysisSnap;
          foundInHotel = hotel.docId;
          break;
        }
      }
    } else {
      // Staff só pode buscar no próprio hotel
      if (!currentUserData.hotelId) {
        throw new Error('Hotel do usuário não identificado');
      }
      
      // Buscar o nome do hotel para normalizar
      const hotelDoc = await getDoc(doc(db, 'hotels', currentUserData.hotelId));
      if (!hotelDoc.exists()) {
        throw new Error('Hotel não encontrado');
      }
      
      const hotelData = hotelDoc.data();
      const hotelDocId = normalizeHotelName(hotelData.name);
      
      analysisRef = doc(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS, analysisId);
      analysisSnap = await getDoc(analysisRef);
      foundInHotel = hotelDocId;
    }

    // Se não encontrou na busca inicial e é admin, buscar em todos os hotéis da estrutura
    if ((!analysisSnap || !analysisSnap.exists()) && currentUserData.role === 'admin') {
      console.log(`🔍 Buscando análise ${analysisId} em todos os hotéis da estrutura hierárquica`);
      
      const analyseCollectionRef = collection(db, COLLECTION_ANALYSE);
      const hotelsSnapshot = await getDocs(analyseCollectionRef);
      
      for (const hotelDoc of hotelsSnapshot.docs) {
        const hotelId = hotelDoc.id;
        const feedbackRef = doc(db, COLLECTION_ANALYSE, hotelId, SUBCOLLECTION_FEEDBACKS, analysisId);
        const feedbackSnap = await getDoc(feedbackRef);
        
        if (feedbackSnap.exists()) {
          analysisRef = feedbackRef;
          analysisSnap = feedbackSnap;
          foundInHotel = hotelId;
          break;
        }
      }
    }

    if (!analysisSnap || !analysisSnap.exists()) {
      throw new Error('Análise não encontrada');
    }

    const analysisData = analysisSnap.data();

    // Verificar se já está no estado desejado
    if (analysisData.hidden === hidden) {
      return {
        success: false,
        message: `Análise já está ${hidden ? 'oculta' : 'visível'}`,
        foundInHotel
      };
    }

    // Preparar dados de atualização
    const updateData: any = {
      hidden: hidden,
      hiddenAt: hidden ? new Date() : undefined,
      hiddenReason: hidden ? (reason || 'Ocultado pelo usuário') : undefined,
      lastModified: new Date()
    };

    // Se está sendo mostrado novamente, limpar campos de ocultação
    if (!hidden) {
      updateData.hiddenAt = undefined;
      updateData.hiddenReason = undefined;
    }

    // Garantir que analysisRef não é null antes de usar
    if (!analysisRef) {
      throw new Error('Referência da análise não encontrada');
    }

    await updateDoc(analysisRef, updateData);

    // Limpar cache após alteração
    clearAnalysesCache();

    console.log(`✅ Análise ${analysisId} ${hidden ? 'ocultada' : 'mostrada'} com sucesso`);

    return {
      success: true,
      message: `Análise ${hidden ? 'ocultada' : 'mostrada'} com sucesso`,
      foundInHotel
    };

  } catch (error: any) {
    console.error('❌ Erro ao alterar visibilidade da análise:', error);
    throw error;
  }
};

// Função para atualizar uma análise específica no Firebase
// Baseada na lógica de updateFeedbackInFirestoreWithUserData
export const updateAnalysisInFirestoreWithUserData = async (
  analysisId: string, 
  updatedAnalysis: any,
  userData: UserData
): Promise<boolean> => {
  try {
    console.log(`🔍 updateAnalysisInFirestoreWithUserData: Iniciando busca para análise ${analysisId}`);
    console.log(`👤 Usuário: ${userData.name} (${userData.role}) - Hotel: ${userData.hotelId}`);

    let foundAnalysisRef = null;
    let foundAnalysisData = null;
    let foundInHotel = null;
    
    // Se o usuário é admin, buscar diretamente em todos os hotéis
    if (userData.role === 'admin') {
      console.log(`🔑 Admin: Buscando análise ${analysisId} em todos os hotéis...`);
    } else {
      // Para usuários não-admin, buscar primeiro no próprio hotel
      if (!userData.hotelId) {
        throw new Error('Hotel do usuário não encontrado');
      }
      
      const hotelDocRef = doc(db, 'hotels', userData.hotelId);
      const hotelDoc = await getDoc(hotelDocRef);
      
      if (!hotelDoc.exists()) {
        throw new Error('Hotel não encontrado');
      }
      
      const hotelData = hotelDoc.data();
      const hotelName = hotelData.name;
      const hotelDocId = normalizeHotelName(hotelName);
      
      console.log(`🔍 Buscando análise ${analysisId} no hotel: ${hotelName} (${hotelDocId})`);
      
      // Primeiro tentar buscar pelo ID do documento
      const analysisDocRef = doc(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS, analysisId);
      const analysisDoc = await getDoc(analysisDocRef);
      
      if (analysisDoc.exists()) {
        foundAnalysisRef = analysisDocRef;
        foundAnalysisData = analysisDoc.data();
        foundInHotel = hotelDocId;
        console.log(`✅ Análise encontrada pelo ID do documento no hotel: ${hotelName}`);
      } else {
        console.log(`❌ Análise não encontrada pelo ID do documento. Buscando pelo campo interno 'id'...`);
        
        // Se não encontrou pelo ID do documento, buscar pelo campo interno 'id'
        const feedbacksRef = collection(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS);
        const querySnapshot = await getDocs(feedbacksRef);
        
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          if (data.id === analysisId) {
            foundAnalysisRef = docSnap.ref;
            foundAnalysisData = data;
            foundInHotel = hotelDocId;
            console.log(`✅ Análise encontrada pelo campo interno 'id' no hotel: ${hotelName}`);
            break;
          }
        }
      }
    }
    
    // Se não encontrou no hotel do usuário OU se o usuário é admin, buscar em todos os hotéis
    if (!foundAnalysisRef) {
      console.log(`🔍 Buscando análise em todos os hotéis...`);
      
      // Buscar na estrutura hierárquica (analyse/hotel/feedbacks)
      const analyseCollectionRef = collection(db, COLLECTION_ANALYSE);
      const analyseSnapshot = await getDocs(analyseCollectionRef);
      
      for (const hotelDoc of analyseSnapshot.docs) {
        const hotelDocId = hotelDoc.id;
        console.log(`🔍 Verificando hotel: ${hotelDocId}`);
        
        // Primeiro tentar buscar pelo ID do documento
        const analysisDocRef = doc(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS, analysisId);
        const analysisDoc = await getDoc(analysisDocRef);
        
        if (analysisDoc.exists()) {
          foundAnalysisRef = analysisDocRef;
          foundAnalysisData = analysisDoc.data();
          foundInHotel = hotelDocId;
          console.log(`✅ Análise encontrada pelo ID do documento no hotel: ${hotelDocId}`);
          break;
        }
        
        // Se não encontrou pelo ID do documento, buscar pelo campo interno 'id'
        const feedbacksRef = collection(db, COLLECTION_ANALYSE, hotelDocId, SUBCOLLECTION_FEEDBACKS);
        const querySnapshot = await getDocs(feedbacksRef);
        
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          if (data.id === analysisId) {
            foundAnalysisRef = docSnap.ref;
            foundAnalysisData = data;
            foundInHotel = hotelDocId;
            console.log(`✅ Análise encontrada pelo campo interno 'id' no hotel: ${hotelDocId}`);
            break;
          }
        }
        
        if (foundAnalysisRef) break;
      }
      
      // Se ainda não encontrou, buscar na coleção antiga 'analyses'
      if (!foundAnalysisRef) {
        console.log(`🔍 Buscando na coleção antiga 'analyses'...`);
        const oldAnalysisDocRef = doc(db, 'analyses', analysisId);
        const oldAnalysisDoc = await getDoc(oldAnalysisDocRef);
        
        if (oldAnalysisDoc.exists()) {
          foundAnalysisRef = oldAnalysisDocRef;
          foundAnalysisData = oldAnalysisDoc.data();
          foundInHotel = 'analyses';
          console.log(`✅ Análise encontrada na coleção antiga 'analyses'`);
        }
      }
    }
    
    if (!foundAnalysisRef) {
      throw new Error('Análise não encontrada no Firebase');
    }
    
    console.log(`📍 Análise encontrada em: ${foundInHotel}`);
    
    // Verificar permissões para staff
    if (userData.role === 'staff' && foundInHotel !== normalizeHotelName(userData.hotelName || '')) {
      throw new Error('Acesso negado. Staff só pode acessar análises do próprio hotel.');
    }
    
    // Atualizar a análise específica - suporta qualquer campo
    const updateData = {
      ...foundAnalysisData,
      ...updatedAnalysis, // Aplicar todas as mudanças passadas
      lastModified: Timestamp.now()
    };
    
    // Salvar de volta no Firebase
    await updateDoc(foundAnalysisRef, updateData);

    console.log(`✅ Análise ${analysisId} atualizada com sucesso no hotel: ${foundInHotel}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao atualizar análise no Firebase:', error);
    throw error;
  }
};