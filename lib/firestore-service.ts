import { collection, addDoc, getDocs, doc, getDoc, query, orderBy, Timestamp, where } from 'firebase/firestore';
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

// Coleção para armazenar as análises
const analysisCollection = collection(db, 'analyses');

// Função para salvar uma nova análise
export const saveAnalysis = async (analysisData: Omit<AnalysisData, 'importDate'>) => {
  try {
    console.log('Salvando análise:', analysisData);
    
    // Verificar se estamos em ambiente de teste
    const isTestEnv = typeof window !== 'undefined' && localStorage.getItem('isTestEnvironment') === 'true';
    
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
    
    const docRef = await addDoc(analysisCollection, {
      ...cleanData,
      importDate: Timestamp.now()
    });
    
    console.log('Análise salva com ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao salvar análise:', error);
    throw error;
  }
};

// Função para obter todas as análises ordenadas por data
export const getAllAnalyses = async (hotelId?: string) => {
  try {
    const userData = await getCurrentUserData();
    const isAdmin = userData?.role === 'admin';
    
    // Criar uma base de consulta
    const analysesRef = collection(db, "analyses");
    
    // Filtrar por hotel se necessário
    const filterHotelId = hotelId || userData?.hotelId;
    
    // Verificar ambiente de teste
    const isTestEnv = localStorage.getItem('isTestEnvironment') === 'true';

    // Interface para os documentos retornados
    interface AnalysisDoc extends AnalysisData {
      id: string;
      isTestEnvironment?: boolean;
    }
    
    // Abordagem alternativa: fazer consulta separada para contornar a necessidade do índice
    if (filterHotelId) {
      // Consulta simples por hotelId
      const hotelQuery = query(analysesRef, where("hotelId", "==", filterHotelId));
      const querySnapshot = await getDocs(hotelQuery);
      
      // Filtrar resultados manualmente com tipagem explícita
      const results = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AnalysisDoc))
        .filter(doc => 
          // Se estamos em ambiente de teste, permitir dados de teste
          // Caso contrário, filtrar dados de teste
          isTestEnv || doc.isTestEnvironment !== true
        );
      
      return results;
    } else {
      // Consulta sem filtro de hotel (provavelmente para admin)
      const querySnapshot = await getDocs(analysesRef);
      
      // Filtrar resultados manualmente com tipagem explícita
      const results = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AnalysisDoc))
        .filter(doc => 
          isTestEnv || doc.isTestEnvironment !== true
        );
      
      return results;
    }
  } catch (error) {
    console.error("Erro ao buscar análises:", error);
    throw error;
  }
};


export const getAnalysisById = async (id: string) => {
  if (!id) {
    throw new Error('ID não fornecido');
  }
  
  try {
    console.log('Obtendo análise com ID:', id);
    const docRef = doc(db, 'analyses', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Documento encontrado');
      const data = docSnap.data();
      
      
      if (!data) {
        throw new Error('Documento existe mas não contém dados');
      }
      
      return {
        id: docSnap.id,
        ...data
      };
    } else {
      console.log('Documento não encontrado');
      throw new Error('Análise não encontrada');
    }
  } catch (error) {
    console.error('Erro ao obter análise:', error);
   
    throw error;
  }
};