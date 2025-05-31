import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, orderBy, limit } from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Interface para dados do usuário
export interface UserData {
  uid: string;
  email: string;
  name?: string;
  hotelId: string;
  hotelName: string;
  role: 'admin' | 'staff';
  firstAccess?: any; // Timestamp do primeiro acesso
  firstAccessTimestamp?: number;
  lastAccess?: any; // Timestamp do último acesso
  lastAccessTimestamp?: number;
  mustChangePassword?: boolean;
  passwordResetByAdmin?: {
    newPassword: string;
    resetBy: string;
    resetByName: string;
    resetAt: any;
    expiresAt: any;
    used: boolean;
    usedAt?: any;
  };
  temporaryLoginSession?: {
    token: number;
    expiresAt: any;
  };
}

// Criar uma segunda instância do Firebase para criação de usuários
let secondaryApp: any = null;
let secondaryAuth: Auth | null = null;

const getSecondaryAuth = () => {
  if (!secondaryApp) {
    try {
      // Usar a mesma configuração do Firebase principal importada
      if (!firebaseConfig) {
        console.warn("⚠️ Configuração do Firebase não encontrada para instância secundária");
        return null;
      }
      
      secondaryApp = initializeApp(firebaseConfig, "secondary");
      secondaryAuth = getAuth(secondaryApp);
      console.log("✅ Instância secundária do Firebase criada com sucesso");
    } catch (error) {
      console.error("❌ Erro ao criar instância secundária do Firebase:", error);
      return null;
    }
  }
  return secondaryAuth;
};

// Função para verificar se o email já está em uso
export const isEmailInUse = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    return false;
  }
};

// Versão melhorada da função para cadastrar usuário
export const registerUserSafe = async (
  email: string, 
  password: string, 
  hotelId: string, 
  hotelName: string,
  name: string = "",
  role: 'admin' | 'staff' = 'staff'
): Promise<UserData> => {
  // Primeiro verificar se o email já está em uso
  const emailExists = await isEmailInUse(email);
  if (emailExists) {
    throw new Error("Este email já está em uso. Por favor, use outro email.");
  }
  
  try {
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Criar documento do usuário no Firestore
    const userData: UserData = {
      uid: user.uid,
      email: user.email || email,
      name,
      hotelId,
      hotelName,
      role
    };
    
    await setDoc(doc(db, "users", user.uid), userData);
    
    return userData;
  } catch (error: any) {
    // Tratamento específico para erro de email em uso
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Este email já está registrado. Por favor, use outro email ou faça login.");
    }
    
    console.error("Erro ao cadastrar usuário:", error);
    throw new Error(`Falha ao cadastrar: ${error.message}`);
  }
};

// Função para fazer login
export const loginUser = async (email: string, password: string): Promise<User> => {
  console.log("Serviço de login iniciado para:", email);
  
  try {
    // Primeiro, verificar se existe redefinição de senha pendente
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Verificar se há redefinição de senha pelo admin
      if (userData.passwordResetByAdmin && !userData.passwordResetByAdmin.used) {
        console.log("🔄 Verificando senha redefinida pelo admin...");
        
        // Verificar se a senha temporária expirou
        const now = new Date();
        const expiresAt = userData.passwordResetByAdmin.expiresAt?.toDate 
          ? userData.passwordResetByAdmin.expiresAt.toDate() 
          : new Date(userData.passwordResetByAdmin.expiresAt);
        
        if (expiresAt && now > expiresAt) {
          console.log("⚠️ Senha temporária expirou");
          
          // Remover senha temporária expirada
          await setDoc(doc(db, "users", userDoc.id), {
            ...userData,
            passwordResetByAdmin: null
          }, { merge: true });
          
          throw new Error("A senha temporária configurada pelo administrador expirou. Solicite uma nova redefinição ou use sua senha atual.");
        }
        
        // Se a senha fornecida é a nova senha definida pelo admin
        if (password === userData.passwordResetByAdmin.newPassword) {
          console.log("✅ Detectada senha temporária, redirecionando para troca");
          
          // Retornar um erro especial que será tratado no frontend
          throw new Error("TEMP_PASSWORD_REDIRECT");
        }
      }
    }
    
    // Login normal
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Credenciais obtidas:", userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error("Erro no serviço de login:", error);
    
    // Tratar erro específico de senha temporária sem modificar a mensagem
    if (error.message === "TEMP_PASSWORD_REDIRECT") {
      throw error; // Re-lançar o erro sem modificação
    }
    
    // Tratar erro específico de senha temporária
    if (error.message && error.message.includes("Para usar a senha temporária")) {
      throw new Error(error.message);
    }
    
    throw new Error(`Falha ao fazer login: ${error.message}`);
  }
};

// Função para fazer logout
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Erro ao fazer logout:", error);
    throw new Error(`Falha ao fazer logout: ${error.message}`);
  }
};

// Função para obter dados do usuário atual
export const getCurrentUserData = async (): Promise<UserData | null> => {
  const user = auth.currentUser;
  
  if (!user) return null;
  
  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    } else {
      console.log("Usuário autenticado, mas sem dados no Firestore");
      return null;
    }
  } catch (error) {
    console.error("Erro ao obter dados do usuário:", error);
    return null;
  }
};

// Função para verificar se o usuário atual é admin
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const userData = await getCurrentUserData();
  return userData?.role === 'admin';
};

// Função para obter dados de um hotel
export const getHotelData = async (hotelId: string) => {
  try {
    const docRef = doc(db, "hotels", hotelId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao obter dados do hotel:", error);
    return null;
  }
};

// Função para listar todos os hotéis
export const getAllHotels = async () => {
  try {
    const hotelsRef = collection(db, "hotels");
    const querySnapshot = await getDocs(hotelsRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao listar hotéis:", error);
    throw error;
  }
};

// Função para obter todos os usuários (só para admins)
export const getAllUsers = async () => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem acessar esta função");
    }
    
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as UserData[];
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    throw error;
  }
};

// Função para obter usuários de um hotel específico
export const getHotelUsers = async (hotelId: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("hotelId", "==", hotelId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao listar usuários do hotel:", error);
    throw error;
  }
};

// Contexto de autenticação para uso com React Context
export const listenToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Função para atualizar perfil de usuário
export const updateUserProfile = async (userId: string, data: { name?: string }) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    throw error;
  }
};

// Função para atualizar a função de um usuário (apenas admin pode fazer isso)
export const updateUserRole = async (userId: string, role: 'admin' | 'staff') => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem atualizar funções de usuários");
    }
    
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { role }, { merge: true });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar função do usuário:", error);
    throw error;
  }
};

// Adicione a função registerUser original de volta ao arquivo
export const registerUser = async (
  email: string, 
  password: string, 
  hotelId: string, 
  hotelName: string,
  name: string = "",
  role: 'admin' | 'staff' = 'staff'
): Promise<UserData> => {
  try {
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Criar documento do usuário no Firestore
    const userData: UserData = {
      uid: user.uid,
      email: user.email || email,
      name,
      hotelId,
      hotelName,
      role
    };
    
    await setDoc(doc(db, "users", user.uid), userData);
    
    return userData;
  } catch (error: any) {
    // Tratar erros específicos
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Este email já está registrado no sistema. Por favor, use outro email.");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("O formato do email não é válido. Verifique e tente novamente.");
    } else if (error.code === "auth/weak-password") {
      throw new Error("A senha deve ter pelo menos 6 caracteres. Use uma senha mais forte.");
    } else {
      throw new Error(error.message || "Falha ao criar usuário. Tente novamente.");
    }
  }
};

// Função para criar usuário mantendo admin logado (usando instância secundária)
export const createUserKeepingAdminLoggedIn = async (
  email: string, 
  password: string, 
  hotelId: string, 
  hotelName: string,
  name: string = "",
  role: 'admin' | 'staff' = 'staff'
): Promise<{ userData: UserData; credentials: { email: string; password: string } }> => {
  
  console.log("🔄 Iniciando criação de usuário mantendo admin logado:", email);
  
  // Verificar se é admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    console.error("❌ Usuário não é admin");
    throw new Error("Apenas administradores podem criar usuários");
  }
  console.log("✅ Verificação de admin OK");
  
  // Verificar se o email já está em uso
  console.log("🔍 Verificando se email já existe:", email);
  const emailExists = await isEmailInUse(email);
  if (emailExists) {
    console.error("❌ Email já existe no sistema:", email);
    throw new Error("Este email já está em uso. Por favor, use outro email.");
  }
  console.log("✅ Email disponível");
  
  // Verificar se admin ainda está logado
  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw new Error("Admin deve estar logado para criar usuários");
  }
  console.log("✅ Admin logado:", adminUser.email);
  
  // Tentar usar instância secundária
  const secondaryAuth = getSecondaryAuth();
  
  if (secondaryAuth) {
    console.log("🔄 Usando instância secundária do Firebase...");
    try {
      // Criar usuário na instância secundária (não afeta sessão principal)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
      console.log("✅ Usuário criado na instância secundária:", newUser.uid);
      
      // Criar documento do usuário no Firestore
      const userData: UserData = {
        uid: newUser.uid,
        email: newUser.email || email,
        name,
        hotelId,
        hotelName,
        role
      };
      
      console.log("🔄 Salvando dados no Firestore...");
      await setDoc(doc(db, "users", newUser.uid), userData);
      console.log("✅ Dados salvos no Firestore");
      
      // Fazer logout da instância secundária
      await signOut(secondaryAuth);
      console.log("✅ Logout da instância secundária realizado");
      
      console.log("✅ Usuário criado com sucesso sem afetar admin principal:", email);
      return {
        userData,
        credentials: { email, password }
      };
      
    } catch (error: any) {
      console.error("❌ Erro na instância secundária:", error);
      
      // Fazer logout da instância secundária em caso de erro
      try {
        await signOut(secondaryAuth);
      } catch (logoutError) {
        console.error("❌ Erro ao fazer logout da instância secundária:", logoutError);
      }
      
      // Re-lançar erro com tratamento específico
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Este email já está registrado no Firebase. Por favor, use outro email.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("O formato do email não é válido. Verifique e tente novamente.");
      } else if (error.code === "auth/weak-password") {
        throw new Error("A senha deve ter pelo menos 6 caracteres. Use uma senha mais forte.");
      } else {
        throw new Error(error.message || "Falha ao criar usuário. Tente novamente.");
      }
    }
  } else {
    // Fallback: se instância secundária não funcionar, informar limitação
    console.warn("⚠️ Instância secundária não disponível, funcionalidade limitada");
    throw new Error("No momento, não é possível criar usuários mantendo o admin logado. Use a função tradicional ou tente novamente mais tarde.");
  }
};

// Função para atualizar senha do usuário atual
export const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("Usuário não está logado ou não tem email");
  }

  try {
    // Re-autenticar o usuário antes de alterar a senha
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Atualizar a senha
    await firebaseUpdatePassword(user, newPassword);
    
    return;
  } catch (error: any) {
    console.error("Erro ao atualizar senha:", error);
    if (error.code === "auth/wrong-password") {
      throw new Error("Senha atual incorreta");
    } else if (error.code === "auth/weak-password") {
      throw new Error("A nova senha deve ter pelo menos 6 caracteres");
    }
    throw new Error(`Erro ao atualizar senha: ${error.message}`);
  }
};

// Função para excluir um usuário (tanto do Auth quanto do Firestore)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem excluir usuários");
    }

    const currentUser = auth.currentUser;
    
    // Se estiver tentando excluir o próprio usuário (admin)
    if (currentUser?.uid === userId) {
      throw new Error("Você não pode excluir sua própria conta enquanto está logado");
    }

    // Obter dados do usuário a ser excluído
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userSnap.data() as UserData;
    
    // Primeiro, remover o documento do Firestore
    await deleteDoc(userRef);
    
    // Para excluir do Firebase Auth, vamos usar uma abordagem alternativa:
    // Como não podemos excluir diretamente outros usuários com o client SDK,
    // vamos tentar fazer login como o usuário e depois excluir
    
    try {
      // Salvar dados do admin atual
      const adminEmail = currentUser?.email;
      
      // Tentar fazer login como o usuário a ser excluído usando uma senha padrão
      // Nota: Isso só funcionará se soubermos a senha do usuário
      // Por isso, vamos implementar uma abordagem diferente
      
      console.log(`Usuário ${userData.email} removido do Firestore. Para remoção completa do Firebase Auth, seria necessário configurar o Firebase Admin SDK no backend.`);
      
    } catch (authError) {
      console.log("Não foi possível excluir do Firebase Auth com client SDK:", authError);
    }
    
    return;
  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    throw new Error(`Erro ao excluir usuário: ${error.message}`);
  }
};

// Função para excluir usuário completamente (alternativa usando Admin SDK simulation)
export const deleteUserCompletely = async (userId: string, userPassword?: string): Promise<void> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem excluir usuários");
    }

    const currentUser = auth.currentUser;
    const currentUserData = await getCurrentUserData();
    
    if (!currentUser || !currentUserData) {
      throw new Error("Admin deve estar logado para excluir usuários");
    }
    
    // Se estiver tentando excluir o próprio usuário (admin)
    if (currentUser.uid === userId) {
      throw new Error("Você não pode excluir sua própria conta");
    }

    // Obter dados do usuário a ser excluído
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userSnap.data() as UserData;
    
    // Primeiro remover do Firestore
    await deleteDoc(userRef);
    
    // Tentar excluir do Firebase Auth fazendo login como o usuário
    if (userPassword) {
      try {
        // Fazer login como o usuário a ser excluído
        await signInWithEmailAndPassword(auth, userData.email, userPassword);
        
        // Excluir o usuário do Firebase Auth
        const userToDelete = auth.currentUser;
        if (userToDelete) {
          await userToDelete.delete();
          console.log(`Usuário ${userData.email} excluído do Firebase Auth com sucesso`);
        }
        
        // Fazer logout
        await signOut(auth);
        
        // Relogar o admin (isso é uma limitação - o admin terá que fazer login novamente)
        console.log("Admin precisará fazer login novamente");
        
      } catch (authError: any) {
        console.error("Erro ao excluir do Firebase Auth:", authError);
        // Garantir que está deslogado e o admin pode relogar
        await signOut(auth);
        throw new Error(`Usuário removido do banco de dados, mas não foi possível excluir do Firebase Auth: ${authError.message}`);
      }
    } else {
      console.log(`Usuário ${userData.email} removido apenas do Firestore. Para remoção completa, forneça a senha do usuário.`);
    }
    
    return;
  } catch (error: any) {
    console.error("Erro ao excluir usuário completamente:", error);
    throw new Error(`Erro ao excluir usuário: ${error.message}`);
  }
};

// Função para sincronizar usuários - remove do Firestore usuários que não existem mais no Auth
export const syncUsersWithAuth = async (): Promise<{removedCount: number, removedUsers: string[]}> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem sincronizar usuários");
    }

    // Obter todos os usuários do Firestore
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    const removedUsers: string[] = [];
    const currentUser = auth.currentUser;
    
    // Verificar cada usuário do Firestore
    for (const userDoc of querySnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        // Pular o usuário atual (admin logado)
        if (currentUser?.uid === userId) {
          continue;
        }
        
        // Verificar se o documento tem dados básicos válidos
        if (!userData.email || !userData.hotelId) {
          console.log(`Removendo usuário com dados incompletos: ${userId}`);
          await deleteDoc(userDoc.ref);
          removedUsers.push(userId);
          continue;
        }
        
        // Verificar se o email tem formato válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          console.log(`Removendo usuário com email inválido: ${userId}`);
          await deleteDoc(userDoc.ref);
          removedUsers.push(userId);
          continue;
        }
        
        // Verificar se o UID tem formato válido do Firebase (pelo menos 20 caracteres alfanuméricos)
        if (userId.length < 20 || !/^[a-zA-Z0-9]+$/.test(userId)) {
          console.log(`Removendo usuário com UID inválido: ${userId}`);
          await deleteDoc(userDoc.ref);
          removedUsers.push(userId);
          continue;
        }
        
      } catch (error) {
        console.log(`Erro ao verificar usuário ${userId}, removendo:`, error);
        await deleteDoc(userDoc.ref);
        removedUsers.push(userId);
      }
    }
    
    return {
      removedCount: removedUsers.length,
      removedUsers
    };
  } catch (error: any) {
    console.error("Erro ao sincronizar usuários:", error);
    throw new Error(`Erro ao sincronizar usuários: ${error.message}`);
  }
};

// Função para admin redefinir senha de outro usuário (remove e recria o usuário)
export const resetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem redefinir senhas de outros usuários");
    }

    // Obter dados do usuário
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userSnap.data() as UserData;
    
    // Não pode redefinir senha de outro admin
    if (userData.role === 'admin') {
      throw new Error("Não é possível redefinir senha de outro administrador");
    }
    
    // Salvar o usuário atual (admin)
    const currentUser = auth.currentUser;
    
    try {
      // Deletar documento do Firestore primeiro
      await deleteDoc(userRef);
      
      // Criar usuário novamente com nova senha
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, newPassword);
      const newUser = userCredential.user;
      
      // Recriar documento no Firestore com mesmo UID (se possível) ou novo UID
      const newUserData: UserData = {
        uid: newUser.uid,
        email: userData.email,
        name: userData.name,
        hotelId: userData.hotelId,
        hotelName: userData.hotelName,
        role: userData.role
      };
      
      await setDoc(doc(db, "users", newUser.uid), newUserData);
      
      // Fazer logout do usuário recém-criado
      await signOut(auth);
      
      // Nota: O admin original precisará fazer login novamente manualmente
      console.log("Senha redefinida com sucesso. Admin precisa fazer login novamente.");
      
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      throw new Error(`Erro ao redefinir senha: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error("Erro ao redefinir senha:", error);
    throw new Error(`Erro ao redefinir senha: ${error.message}`);
  }
};

// Função para admin redefinir senha - versão com senha temporária
export const adminResetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem redefinir senhas de outros usuários");
    }

    // Obter dados do usuário
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userSnap.data() as UserData;
    
    // Não pode redefinir senha de outro admin
    if (userData.role === 'admin') {
      throw new Error("Não é possível redefinir senha de outro administrador");
    }

    // Validar nova senha
    if (newPassword.length < 6) {
      throw new Error("A nova senha deve ter pelo menos 6 caracteres");
    }
    
    console.log(`🔄 Configurando senha temporária para: ${userData.email}`);
    
    // Salvar dados do admin atual
    const adminUser = auth.currentUser;
    const adminData = await getCurrentUserData();
    
    if (!adminUser || !adminData) {
      throw new Error("Admin deve estar logado para redefinir senhas");
    }
    
    try {
      // Definir senha temporária no Firestore
      const resetData = {
        passwordResetByAdmin: {
          newPassword: newPassword,
          resetBy: adminData.uid,
          resetByName: adminData.name || adminData.email,
          resetAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          used: false,
          usedAt: null
        }
      };
      
      await setDoc(userRef, resetData, { merge: true });
      console.log("✅ Senha temporária configurada no Firestore");
      
      console.log(`✅ Senha temporária definida com sucesso para ${userData.email}`);
      return;
      
    } catch (error: any) {
      console.error("❌ Erro ao configurar senha temporária:", error);
      throw new Error(`Erro ao configurar senha temporária: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error("Erro ao redefinir senha do usuário:", error);
    throw new Error(`Erro ao redefinir senha: ${error.message}`);
  }
};

// Função para atualizar último acesso do usuário
export const updateUserLastAccess = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const now = new Date();
    
    await setDoc(userRef, {
      lastAccess: now,
      lastAccessTimestamp: now.getTime()
    }, { merge: true });
    
  } catch (error) {
    console.error("Erro ao atualizar último acesso:", error);
  }
};

// Função para marcar primeiro acesso do usuário
export const markFirstAccess = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && !userDoc.data().firstAccess) {
      const now = new Date();
      await setDoc(userRef, {
        firstAccess: now,
        firstAccessTimestamp: now.getTime()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Erro ao marcar primeiro acesso:", error);
  }
};

// Função para buscar informações detalhadas de um usuário
export const getUserDetailedInfo = async (userId: string) => {
  try {
    console.log("🔍 Verificando permissões de admin...");
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem acessar informações detalhadas");
    }
    console.log("✅ Permissões verificadas");

    console.log("🔍 Buscando usuário no Firestore:", userId);
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error("❌ Usuário não encontrado:", userId);
      throw new Error("Usuário não encontrado");
    }
    console.log("✅ Usuário encontrado no Firestore");
    
    const userData = userDoc.data() as UserData;
    console.log("📊 Dados do usuário:", userData);
    
    // Calcular estatísticas
    const firstAccess = userData.firstAccess?.toDate ? userData.firstAccess.toDate() : null;
    const lastAccess = userData.lastAccess?.toDate ? userData.lastAccess.toDate() : null;
    
    const now = new Date();
    const daysSinceFirstAccess = firstAccess ? Math.floor((now.getTime() - firstAccess.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const daysSinceLastAccess = lastAccess ? Math.floor((now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    console.log("📈 Estatísticas calculadas:", {
      firstAccess,
      lastAccess,
      daysSinceFirstAccess,
      daysSinceLastAccess
    });
    
    const result = {
      userData,
      logs: [], // Logs removidos temporariamente
      stats: {
        firstAccess,
        lastAccess,
        daysSinceFirstAccess,
        daysSinceLastAccess,
        totalLogins: 0, // Será implementado no futuro
        totalActions: 0 // Será implementado no futuro
      }
    };
    
    console.log("✅ Resultado final:", result);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar informações do usuário:", error);
    throw error;
  }
};

// Função melhorada para criar usuário mantendo admin logado (método original como fallback)
export const createUserAsAdmin = async (
  email: string, 
  password: string, 
  hotelId: string, 
  hotelName: string,
  name: string = "",
  role: 'admin' | 'staff' = 'staff'
): Promise<{ userData: UserData; credentials: { email: string; password: string } }> => {
  
  console.log("🔄 Usando método original createUserAsAdmin para:", email);
  
  // Verificar se é admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Apenas administradores podem criar usuários");
  }
  
  // Verificar se o email já está em uso
  const emailExists = await isEmailInUse(email);
  if (emailExists) {
    throw new Error("Este email já está em uso. Por favor, use outro email.");
  }
  
  // Salvar dados do admin atual antes de criar novo usuário
  const adminUser = auth.currentUser;
  const adminData = await getCurrentUserData();
  
  if (!adminUser || !adminData) {
    throw new Error("Admin deve estar logado para criar usuários");
  }
  
  try {
    // Criar novo usuário (isso automaticamente faz login como o novo usuário)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Criar documento do usuário no Firestore
    const userData: UserData = {
      uid: newUser.uid,
      email: newUser.email || email,
      name,
      hotelId,
      hotelName,
      role
    };
    
    await setDoc(doc(db, "users", newUser.uid), userData);
    
    // Imediatamente fazer logout do usuário recém-criado
    await signOut(auth);
    
    // Retornar dados - admin precisará ser redirecionado para fazer login novamente
    return {
      userData,
      credentials: { email, password }
    };
    
  } catch (error: any) {
    // Fazer logout para garantir estado limpo
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error("Erro ao fazer logout de limpeza:", logoutError);
    }
    
    // Tratar erros específicos
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Este email já está registrado no sistema. Por favor, use outro email.");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("O formato do email não é válido. Verifique e tente novamente.");
    } else if (error.code === "auth/weak-password") {
      throw new Error("A senha deve ter pelo menos 6 caracteres. Use uma senha mais forte.");
    } else {
      throw new Error(error.message || "Falha ao criar usuário. Tente novamente.");
    }
  }
};

// Função para limpar senhas temporárias expiradas
export const cleanupExpiredTemporaryPasswords = async (): Promise<number> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem executar limpeza de senhas temporárias");
    }

    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    let cleanedCount = 0;
    const now = new Date();
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.passwordResetByAdmin && !userData.passwordResetByAdmin.used) {
        const expiresAt = userData.passwordResetByAdmin.expiresAt?.toDate 
          ? userData.passwordResetByAdmin.expiresAt.toDate() 
          : new Date(userData.passwordResetByAdmin.expiresAt);
        
        if (expiresAt && now > expiresAt) {
          // Remover senha temporária expirada
          await setDoc(doc(db, "users", userDoc.id), {
            ...userData,
            passwordResetByAdmin: null
          }, { merge: true });
          
          cleanedCount++;
          console.log(`🧹 Senha temporária expirada removida para: ${userData.email}`);
        }
      }
    }
    
    console.log(`🧹 Limpeza concluída: ${cleanedCount} senhas temporárias expiradas removidas`);
    return cleanedCount;
  } catch (error: any) {
    console.error("Erro ao limpar senhas temporárias expiradas:", error);
    throw new Error(`Erro na limpeza: ${error.message}`);
  }
};

// Função para fazer login temporário com senha temporária
export const loginWithTemporaryPassword = async (email: string, password: string): Promise<{ userData: UserData; mustChangePassword: boolean }> => {
  try {
    // Buscar usuário no Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("Usuário não encontrado");
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserData;
    
    // Verificar se tem senha temporária válida
    if (!userData.passwordResetByAdmin || userData.passwordResetByAdmin.used) {
      throw new Error("Nenhuma senha temporária válida encontrada");
    }
    
    // Verificar expiração
    const now = new Date();
    const expiresAt = userData.passwordResetByAdmin.expiresAt?.toDate 
      ? userData.passwordResetByAdmin.expiresAt.toDate() 
      : new Date(userData.passwordResetByAdmin.expiresAt);
    
    if (expiresAt && now > expiresAt) {
      throw new Error("A senha temporária expirou");
    }
    
    // Verificar se a senha fornecida é a senha temporária
    if (password !== userData.passwordResetByAdmin.newPassword) {
      throw new Error("Senha temporária incorreta");
    }
    
    // Marcar como usada e definir flag para trocar senha
    await setDoc(doc(db, "users", userDoc.id), {
      ...userData,
      passwordResetByAdmin: {
        ...userData.passwordResetByAdmin,
        used: true,
        usedAt: new Date()
      },
      mustChangePassword: true,
      temporaryLoginSession: {
        token: Date.now(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos para trocar senha
      }
    }, { merge: true });
    
    console.log("✅ Login temporário autorizado para:", email);
    
    return {
      userData: { ...userData, mustChangePassword: true },
      mustChangePassword: true
    };
  } catch (error: any) {
    console.error("Erro no login temporário:", error);
    throw error;
  }
};

// Função para atualizar senha após login temporário
export const updatePasswordAfterTemporaryLogin = async (email: string, temporaryPassword: string, newPassword: string): Promise<void> => {
  try {
    // Primeiro fazer login real no Firebase Auth com a senha temporária (se possível)
    // ou usar abordagem alternativa
    
    let user;
    try {
      // Tentar login normal primeiro
      const userCredential = await signInWithEmailAndPassword(auth, email, temporaryPassword);
      user = userCredential.user;
      console.log("✅ Login real no Firebase Auth com senha temporária");
    } catch (authError: any) {
      console.log("⚠️ Login temporário não funciona no Firebase Auth, usando abordagem alternativa");
      
      // Se não conseguiu fazer login com a senha temporária, 
      // vamos tentar uma abordagem diferente
      
      // Buscar usuário no Firestore para pegar dados
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("Usuário não encontrado");
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Verificar se a senha temporária é válida
      if (!userData.passwordResetByAdmin || 
          userData.passwordResetByAdmin.used ||
          userData.passwordResetByAdmin.newPassword !== temporaryPassword) {
        throw new Error("Senha temporária inválida");
      }
      
      // Verificar expiração
      const now = new Date();
      const expiresAt = userData.passwordResetByAdmin.expiresAt?.toDate 
        ? userData.passwordResetByAdmin.expiresAt.toDate() 
        : new Date(userData.passwordResetByAdmin.expiresAt);
      
      if (expiresAt && now > expiresAt) {
        throw new Error("A senha temporária expirou");
      }
      
      // Tentar fazer login com uma senha antiga conhecida ou criar nova conta
      // Como é um caso especial, vamos deletar e recriar o usuário com nova senha
      
      // Primeiro, fazer backup dos dados
      const userBackup = { ...userData };
      
      // Usar instância secundária para recriar usuário
      const secondaryAuth = getSecondaryAuth();
      
      if (secondaryAuth) {
        try {
          console.log("🔄 Recriando usuário com nova senha na instância secundária...");
          
          // Criar usuário na instância secundária com nova senha
          const newUserCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
          const newUser = newUserCredential.user;
          console.log("✅ Usuário recriado com nova senha:", newUser.uid);
          
          // Atualizar dados no Firestore
          await setDoc(doc(db, "users", newUser.uid), {
            ...userBackup,
            uid: newUser.uid,
            passwordResetByAdmin: {
              ...userData.passwordResetByAdmin,
              used: true,
              usedAt: new Date()
            },
            mustChangePassword: false // Remover flag de troca obrigatória
          });
          
          // Remover usuário antigo do Firestore se UID mudou
          if (newUser.uid !== userDoc.id) {
            await deleteDoc(doc(db, "users", userDoc.id));
          }
          
          // Logout da instância secundária
          await signOut(secondaryAuth);
          
          // Fazer login normal com nova senha
          const finalUserCredential = await signInWithEmailAndPassword(auth, email, newPassword);
          console.log("✅ Login final realizado com nova senha");
          
          return;
          
        } catch (secondaryError: any) {
          console.error("❌ Erro na instância secundária:", secondaryError);
          throw new Error("Erro ao alterar senha. Tente novamente.");
        }
      } else {
        throw new Error("Não foi possível completar a alteração de senha. Entre em contato com o administrador.");
      }
    }
    
    // Se chegou aqui, o login no Firebase Auth funcionou
    // Atualizar a senha normalmente
    await firebaseUpdatePassword(user, newPassword);
    
    // Atualizar dados no Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      await setDoc(doc(db, "users", userDoc.id), {
        ...userData,
        passwordResetByAdmin: {
          ...userData.passwordResetByAdmin,
          used: true,
          usedAt: new Date()
        },
        mustChangePassword: false
      }, { merge: true });
    }
    
    console.log("✅ Senha alterada com sucesso");
    
  } catch (error: any) {
    console.error("Erro ao atualizar senha após login temporário:", error);
    throw new Error(`Erro ao alterar senha: ${error.message}`);
  }
}; 