// Script de teste para verificar tracking de acesso
// Execute com: npx ts-node scripts/test-access-tracking.ts

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAccessTracking() {
  console.log('🧪 Iniciando teste de tracking de acesso...');
  
  try {
    // 1. Fazer login com um usuário de teste
    console.log('1️⃣ Fazendo login...');
    const email = 'teste@exemplo.com'; // Substitua por um email válido
    const password = 'senha123'; // Substitua por uma senha válida
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ Login realizado:', user.email);
    
    // 2. Aguardar um pouco para as funções de tracking executarem
    console.log('2️⃣ Aguardando execução do tracking...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Verificar dados do usuário no Firestore
    console.log('3️⃣ Verificando dados no Firestore...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📊 Dados do usuário:');
      console.log('  - Email:', userData.email);
      console.log('  - Nome:', userData.name);
      console.log('  - Hotel:', userData.hotelName);
      console.log('  - Função:', userData.role);
      console.log('  - Primeiro acesso:', userData.firstAccess);
      console.log('  - Timestamp primeiro acesso:', userData.firstAccessTimestamp);
      console.log('  - Último acesso:', userData.lastAccess);
      console.log('  - Timestamp último acesso:', userData.lastAccessTimestamp);
      
      // 4. Verificar se os timestamps foram atualizados
      if (userData.firstAccess || userData.firstAccessTimestamp) {
        console.log('✅ Primeiro acesso registrado!');
      } else {
        console.log('❌ Primeiro acesso NÃO registrado!');
      }
      
      if (userData.lastAccess || userData.lastAccessTimestamp) {
        console.log('✅ Último acesso registrado!');
      } else {
        console.log('❌ Último acesso NÃO registrado!');
      }
    } else {
      console.log('❌ Documento do usuário não encontrado!');
    }
    
    // 5. Fazer logout
    console.log('4️⃣ Fazendo logout...');
    await signOut(auth);
    console.log('✅ Logout realizado');
    
    // 6. Aguardar um pouco e verificar se último acesso foi atualizado
    console.log('5️⃣ Aguardando atualização do último acesso...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fazer login novamente para verificar
    const userCredential2 = await signInWithEmailAndPassword(auth, email, password);
    const user2 = userCredential2.user;
    
    const userDoc2 = await getDoc(doc(db, 'users', user2.uid));
    if (userDoc2.exists()) {
      const userData2 = userDoc2.data();
      console.log('📊 Dados após logout/login:');
      console.log('  - Último acesso:', userData2.lastAccess);
      console.log('  - Timestamp último acesso:', userData2.lastAccessTimestamp);
    }
    
    await signOut(auth);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testAccessTracking().then(() => {
  console.log('🏁 Teste concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
}); 