import { collection, addDoc, getDocs, doc, getDoc, query, orderBy, Timestamp, where, setDoc, deleteDoc, updateDoc, limit } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUserData } from './auth-service';

// Interface para os dados de análise
export interface AnalysisData {
  hotelId: string; // Campo para identificar o hotel
  hotelName: string;
  importDate: any; // Firestore Timestamp
  data: any[]; // Dados do XLSX
  analysis: any; // Resultado da análise do GPT
  isTestEnvironment?: boolean; // Propriedade opcional para ambiente de teste
}

// Nova estrutura hierárquica: analyse/{hotelId}/feedbacks/{feedbackId}
const COLLECTION_ANALYSE = 'analyse';
const SUBCOLLECTION_FEEDBACKS = 'feedbacks';

// Função para gerar ID numérico de 5 dígitos
const generateNumericId = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Função para normalizar nome do hotel para usar como ID do documento
const normalizeHotelName = (hotelName: string): string => {
  return hotelName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por underscore
    .replace(/_+/g, '_') // Remove underscores duplos
    .replace(/^_|_$/g, ''); // Remove underscores do início e fim
};

// Função para salvar uma nova análise na estrutura hierárquica
export const saveAnalysis = async (analysisData: Omit<AnalysisData, 'importDate'>) => {
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
    
    // Gerar ID numérico de 5 dígitos
    const feedbackId = generateNumericId();
    
    // Estrutura correta: analyse/{hotelId}/feedbacks/{feedbackId}
    const feedbackDocRef = doc(
      db, 
      COLLECTION_ANALYSE, 
      hotelDocId, 
      SUBCOLLECTION_FEEDBACKS, 
      feedbackId
    );
    
    await setDoc(feedbackDocRef, {
      ...cleanData,
      importDate: Timestamp.now()
    });

    return feedbackId;
  } catch (error) {
    console.error('Erro ao salvar análise:', error);
    throw error;
  }
};

// Função para obter todas as análises da nova estrutura hierárquica
export const getAllAnalyses = async (hotelId?: string) => {
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
                id: feedbackDoc.id,
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
                id: docSnap.id,
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
    
    // Filtrar resultados por ambiente de teste
    const filteredResults = results.filter((doc: AnalysisDoc) => 
      isTestEnv || doc.isTestEnvironment !== true
    );

    return filteredResults;
  } catch (error) {
    console.error("Erro ao buscar análises:", error);
    throw error;
  }
};

// Função para obter análise por ID na nova estrutura
export const getAnalysisById = async (id: string) => {
  if (!id) {
    throw new Error('ID não fornecido');
  }
  
  try {
    
    // Como agora a estrutura é hierárquica, precisamos buscar em todos os hotéis
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
    
    // Verificar quais desses hotéis existem na nova estrutura
    const existingHotels: string[] = [];
    
    for (const hotelId of Array.from(hotelNames)) {
      try {
        const feedbacksRef = collection(
          db, 
          COLLECTION_ANALYSE, 
          hotelId, 
          SUBCOLLECTION_FEEDBACKS
        );
        
        const snapshot = await getDocs(feedbacksRef);
        if (!snapshot.empty) {
          existingHotels.push(hotelId);
          
        } else {
          
        }
      } catch (error) {
        
      }
    }

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
export const updateFeedbackInFirestore = async (
  feedbackId: string, 
  updatedFeedback: any
): Promise<boolean> => {
  try {
    const userData = await getCurrentUserData();
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
export const getRecentEdits = async (limitDays: number = 7) => {
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
        // Filtrar pelos últimos X dias
        const editDate = new Date(edit.modifiedAt)
        return editDate >= pastDate
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
    saveRecentEdit
  };
}