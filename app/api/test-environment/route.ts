import { NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  query, 
  where, 
  deleteDoc, 
  setDoc, 
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Prefixo para identificar itens de teste
const TEST_PREFIX = "TEST_";

// Verificar se um documento é de teste
const isTestDocument = (data: any) => {
  return data && (
    (data.isTestEnvironment === true) || 
    (typeof data.name === 'string' && data.name.startsWith(TEST_PREFIX)) ||
    (typeof data.hotelId === 'string' && data.hotelId.startsWith(TEST_PREFIX))
  );
};

// Criar ambiente de teste
async function createTestEnvironment() {
  try {
    // Verificar se já existe um ambiente de teste
    const existingEnv = await getTestEnvironmentStatus();
    
    if (existingEnv.active) {
      return {
        message: "Ambiente de teste já está ativo",
        environment: existingEnv
      };
    }

    // 1. Criar hotéis de teste
    const testHotels = [
      {
        name: `${TEST_PREFIX}Hotel Alpha`,
        hotelId: `${TEST_PREFIX}hotel-alpha`,
        address: "Av. Teste, 123",
        city: "Cidade Teste",
        state: "ST",
        country: "Brasil",
        stars: 4,
        createdAt: new Date(),
        isTestEnvironment: true
      },
      {
        name: `${TEST_PREFIX}Hotel Beta`,
        hotelId: `${TEST_PREFIX}hotel-beta`,
        address: "Rua de Testes, 456",
        city: "Cidade Teste",
        state: "ST",
        country: "Brasil",
        stars: 5,
        createdAt: new Date(),
        isTestEnvironment: true
      }
    ];

    // Adicionar hotéis
    const hotelPromises = testHotels.map(hotel => 
      addDoc(collection(db, "hotels"), hotel)
    );
    const hotelRefs = await Promise.all(hotelPromises);
    
    // 2. Criar entrada de configuração para controlar ambiente de teste
    await setDoc(doc(db, "system", "testEnvironment"), {
      active: true,
      createdAt: new Date(),
      lastAccessed: new Date(),
      hotelIds: testHotels.map(h => h.hotelId)
    });

    return {
      message: "Ambiente de teste criado com sucesso",
      hotels: testHotels,
      hotelRefs: hotelRefs.map(ref => ref.id)
    };
  } catch (error) {
    console.error("Erro ao criar ambiente de teste:", error);
    throw error;
  }
}

// Verificar status do ambiente de teste
async function getTestEnvironmentStatus() {
  try {
    // Verificar configuração
    const testConfigRef = doc(db, "system", "testEnvironment");
    const testConfigSnap = await getDoc(testConfigRef);
    
    const defaultResponse = {
      active: false,
      hotels: [],
      analyses: [],
      users: []
    };
    
    if (!testConfigSnap.exists()) {
      return defaultResponse;
    }
    
    const testConfig = testConfigSnap.data();
    
    if (!testConfig || !testConfig.active) {
      return defaultResponse;
    }
    
    // Buscar todos os hotéis
    const hotelsRef = collection(db, "hotels");
    const hotelsSnap = await getDocs(hotelsRef);
    
    // Filtrar hotéis de teste usando a função isTestDocument
    const hotels = hotelsSnap.docs
      .filter(doc => isTestDocument(doc.data()))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    
    // Buscar análises de teste
    const analysesRef = collection(db, "analyses");
    const analysesQ = query(analysesRef, where("isTestEnvironment", "==", true));
    const analysesSnap = await getDocs(analysesQ);
    const analyses = analysesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Buscar usuários de teste
    const usersRef = collection(db, "users");
    const usersQ = query(usersRef, where("isTestEnvironment", "==", true));
    const usersSnap = await getDocs(usersQ);
    const users = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      active: true,
      createdAt: testConfig.createdAt,
      lastAccessed: testConfig.lastAccessed,
      hotels,
      analyses,
      users
    };
  } catch (error) {
    console.error("Erro ao verificar ambiente de teste:", error);
    throw error;
  }
}

// Limpar ambiente de teste
async function clearTestEnvironment() {
  try {
    const results = {
      deletedHotels: 0,
      deletedAnalyses: 0,
      deletedUsers: 0,
      errors: []
    };

    // Remover hotéis de teste
    const hotelsRef = collection(db, "hotels");
    const hotelsSnap = await getDocs(hotelsRef);
    
    const hotelDeletePromises = hotelsSnap.docs
      .filter(doc => isTestDocument(doc.data()))
      .map(async (doc) => {
        try {
          await deleteDoc(doc.ref);
          results.deletedHotels++;
        } catch (error) {
          results.errors.push(`Erro ao excluir hotel ${doc.id}: ${error}`);
        }
      });
    
    // Remover análises de teste
    const analysesRef = collection(db, "analyses");
    const analysesSnap = await getDocs(analysesRef);
    
    const analysesDeletePromises = analysesSnap.docs
      .filter(doc => isTestDocument(doc.data()))
      .map(async (doc) => {
        try {
          await deleteDoc(doc.ref);
          results.deletedAnalyses++;
        } catch (error) {
          results.errors.push(`Erro ao excluir análise ${doc.id}: ${error}`);
        }
      });
    
    // Remover usuários de teste
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    
    const usersDeletePromises = usersSnap.docs
      .filter(doc => isTestDocument(doc.data()))
      .map(async (doc) => {
        try {
          await deleteDoc(doc.ref);
          results.deletedUsers++;
        } catch (error) {
          results.errors.push(`Erro ao excluir usuário ${doc.id}: ${error}`);
        }
      });
    
    // Executar todas as operações de exclusão
    await Promise.all([
      ...hotelDeletePromises,
      ...analysesDeletePromises,
      ...usersDeletePromises
    ]);
    
    // Atualizar status do ambiente de teste
    const testConfigRef = doc(db, "system", "testEnvironment");
    await setDoc(testConfigRef, {
      active: false,
      lastCleared: new Date()
    }, { merge: true });
    
    return {
      message: "Ambiente de teste limpo com sucesso",
      results
    };
  } catch (error) {
    console.error("Erro ao limpar ambiente de teste:", error);
    throw error;
  }
}

// Rota para criar ambiente de teste
export async function POST() {
  try {
    const result = await createTestEnvironment();
    
    // Após criar, buscar o status atual para retornar dados completos
    const status = await getTestEnvironmentStatus();
    
    return NextResponse.json({
      ...result,
      environment: status,
      active: true
    }, { status: 200 });
  } catch (error) {
    console.error("Erro na API de ambiente de teste:", error);
    return NextResponse.json({ error: "Falha ao criar ambiente de teste" }, { status: 500 });
  }
}

// Rota para verificar status do ambiente de teste
export async function GET() {
  try {
    const result = await getTestEnvironmentStatus();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Erro na API de ambiente de teste:", error);
    return NextResponse.json({ error: "Falha ao verificar ambiente de teste" }, { status: 500 });
  }
}

// Rota para limpar ambiente de teste
export async function DELETE() {
  try {
    const result = await clearTestEnvironment();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Erro na API de ambiente de teste:", error);
    return NextResponse.json({ error: "Falha ao limpar ambiente de teste" }, { status: 500 });
  }
} 