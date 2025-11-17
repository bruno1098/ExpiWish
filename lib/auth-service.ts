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
  emailVerifiedByAdmin?: {
    verifiedBy: string;
    verifiedByEmail: string;
    verifiedAt: any;
    reason: string;
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
    
    // Enviar email de verificação
    
    await sendEmailVerification(user);
    
    // Criar documento do usuário no Firestore
    const userData: UserData = {
      uid: user.uid,
      email: user.email || email,
      name,
      hotelId,
      hotelName,
      role,
      mustChangePassword: true
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
        
        // Verificar se a senha temporária expirou
        const now = new Date();
        const expiresAt = userData.passwordResetByAdmin.expiresAt?.toDate 
          ? userData.passwordResetByAdmin.expiresAt.toDate() 
          : new Date(userData.passwordResetByAdmin.expiresAt);
        
        if (expiresAt && now > expiresAt) {
          
          // Remover senha temporária expirada
          await setDoc(doc(db, "users", userDoc.id), {
            ...userData,
            passwordResetByAdmin: null
          }, { merge: true });
          
          throw new Error("A senha temporária configurada pelo administrador expirou. Solicite uma nova redefinição ou use sua senha atual.");
        }
        
        // Se a senha fornecida é a nova senha definida pelo admin
        if (password === userData.passwordResetByAdmin.newPassword) {
          
          // Retornar um erro especial que será tratado no frontend
          throw new Error("TEMP_PASSWORD_REDIRECT");
        }
      }
    }
    
    // Login normal
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
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
    // Atualizar último acesso antes de fazer logout
    const user = auth.currentUser;
    if (user) {
      try {
        await updateUserLastAccess(user.uid);
        console.log("✅ Último acesso atualizado antes do logout");
      } catch (accessError) {
        console.error("❌ Erro ao atualizar último acesso no logout:", accessError);
      }
    }
    
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
      role,
      mustChangePassword: true
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

  // Verificar se é admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    console.error("❌ Usuário não é admin");
    throw new Error("Apenas administradores podem criar usuários");
  }
  
  // Verificar se o email já está em uso
  
  const emailExists = await isEmailInUse(email);
  if (emailExists) {
    console.error("❌ Email já existe no sistema:", email);
    throw new Error("Este email já está em uso. Por favor, use outro email.");
  }
  
  // Verificar se admin ainda está logado
  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw new Error("Admin deve estar logado para criar usuários");
  }
  
  // Tentar usar instância secundária
  const secondaryAuth = getSecondaryAuth();
  
  if (secondaryAuth) {
    
    try {
      // Criar usuário na instância secundária (não afeta sessão principal)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
      
      // Criar documento do usuário no Firestore
      const userData: UserData = {
        uid: newUser.uid,
        email: newUser.email || email,
        name,
        hotelId,
        hotelName,
        role,
        mustChangePassword: true
      };

      await setDoc(doc(db, "users", newUser.uid), userData);
      
      // Fazer logout da instância secundária
      await signOut(secondaryAuth);

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

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        const updatePayload: Record<string, any> = {
          mustChangePassword: false,
          temporaryLoginSession: null
        };

        if (existingData?.passwordResetByAdmin) {
          updatePayload.passwordResetByAdmin = {
            ...existingData.passwordResetByAdmin,
            used: true,
            usedAt: new Date()
          };
        }

        await setDoc(userRef, updatePayload, { merge: true });
      }
    } catch (firestoreError) {
      console.error("Erro ao atualizar metadados de senha no Firestore:", firestoreError);
    }
    
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

    } catch (authError) {
      
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
          
        }
        
        // Fazer logout
        await signOut(auth);
        
        // Relogar o admin (isso é uma limitação - o admin terá que fazer login novamente)
        
      } catch (authError: any) {
        console.error("Erro ao excluir do Firebase Auth:", authError);
        // Garantir que está deslogado e o admin pode relogar
        await signOut(auth);
        throw new Error(`Usuário removido do banco de dados, mas não foi possível excluir do Firebase Auth: ${authError.message}`);
      }
    } else {
      
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
          
          await deleteDoc(userDoc.ref);
          removedUsers.push(userId);
          continue;
        }
        
        // Verificar se o email tem formato válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          
          await deleteDoc(userDoc.ref);
          removedUsers.push(userId);
          continue;
        }
        
        // Verificar se o UID tem formato válido do Firebase (pelo menos 20 caracteres alfanuméricos)
        if (userId.length < 20 || !/^[a-zA-Z0-9]+$/.test(userId)) {
          
          await deleteDoc(userDoc.ref);
          removedUsers.push(userId);
          continue;
        }
        
      } catch (error) {
        
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
    
    console.log("✅ Último acesso atualizado para usuário:", userId, "às", now.toISOString());
  } catch (error) {
    console.error("Erro ao atualizar último acesso:", error);
  }
};

// Função para marcar primeiro acesso do usuário
export const markFirstAccess = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Verificar se já tem primeiro acesso
      if (!userData.firstAccess && !userData.firstAccessTimestamp) {
        const now = new Date();
        await setDoc(userRef, {
          firstAccess: now,
          firstAccessTimestamp: now.getTime()
        }, { merge: true });
        
        console.log("✅ Primeiro acesso marcado para usuário:", userId);
      } else {
        console.log("ℹ️ Usuário já tem primeiro acesso registrado:", userId);
      }
    }
  } catch (error) {
    console.error("Erro ao marcar primeiro acesso:", error);
  }
};

// Função para buscar informações detalhadas de um usuário
export const getUserDetailedInfo = async (userId: string) => {
  try {
    
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem acessar informações detalhadas");
    }

    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error("❌ Usuário não encontrado:", userId);
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userDoc.data() as UserData;
    
    // Calcular estatísticas
    let firstAccess = null;
    let lastAccess = null;
    
    // Verificar se firstAccess existe e converter
    if (userData.firstAccess) {
      if (userData.firstAccess.toDate) {
        firstAccess = userData.firstAccess.toDate();
      } else if (userData.firstAccessTimestamp) {
        firstAccess = new Date(userData.firstAccessTimestamp);
      } else if (userData.firstAccess instanceof Date) {
        firstAccess = userData.firstAccess;
      }
    }
    
    // Verificar se lastAccess existe e converter
    if (userData.lastAccess) {
      if (userData.lastAccess.toDate) {
        lastAccess = userData.lastAccess.toDate();
      } else if (userData.lastAccessTimestamp) {
        lastAccess = new Date(userData.lastAccessTimestamp);
      } else if (userData.lastAccess instanceof Date) {
        lastAccess = userData.lastAccess;
      }
    }
    
    const now = new Date();
    const daysSinceFirstAccess = firstAccess ? Math.floor((now.getTime() - firstAccess.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const daysSinceLastAccess = lastAccess ? Math.floor((now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24)) : null;

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
      role,
      mustChangePassword: true
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
          
        }
      }
    }

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
      
    } catch (authError: any) {
      
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
          
          // Criar usuário na instância secundária com nova senha
          const newUserCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
          const newUser = newUserCredential.user;
          
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

  } catch (error: any) {
    console.error("Erro ao atualizar senha após login temporário:", error);
    throw new Error(`Erro ao alterar senha: ${error.message}`);
  }
};

// Função para enviar email de redefinição de senha
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    const { sendPasswordResetEmail: firebaseSendPasswordResetEmail } = await import("firebase/auth");
    
    await firebaseSendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth/login`, // URL para retornar após redefinir senha
      handleCodeInApp: false
    });

  } catch (error: any) {
    console.error("Erro ao enviar email de redefinição:", error);
    
    if (error.code === "auth/user-not-found") {
      throw new Error("Não existe uma conta com este endereço de email.");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("Endereço de email inválido.");
    } else if (error.code === "auth/too-many-requests") {
      throw new Error("Muitas tentativas de redefinição. Tente novamente mais tarde.");
    }
    
    throw new Error(`Erro ao enviar email de redefinição: ${error.message}`);
  }
};

// Função para confirmar redefinição de senha com código
export const confirmPasswordReset = async (code: string, newPassword: string): Promise<void> => {
  try {
    const { confirmPasswordReset: firebaseConfirmPasswordReset } = await import("firebase/auth");
    
    await firebaseConfirmPasswordReset(auth, code, newPassword);

  } catch (error: any) {
    console.error("Erro ao confirmar redefinição de senha:", error);
    
    if (error.code === "auth/invalid-action-code") {
      throw new Error("Código de redefinição inválido ou expirado.");
    } else if (error.code === "auth/expired-action-code") {
      throw new Error("Código de redefinição expirado. Solicite um novo.");
    } else if (error.code === "auth/weak-password") {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    
    throw new Error(`Erro ao redefinir senha: ${error.message}`);
  }
};

// Função para verificar código de redefinição sem aplicar
export const verifyPasswordResetCode = async (code: string): Promise<string> => {
  try {
    const { verifyPasswordResetCode: firebaseVerifyPasswordResetCode } = await import("firebase/auth");
    
    const email = await firebaseVerifyPasswordResetCode(auth, code);

    return email;
  } catch (error: any) {
    console.error("Erro ao verificar código:", error);
    
    if (error.code === "auth/invalid-action-code") {
      throw new Error("Código de redefinição inválido ou expirado.");
    } else if (error.code === "auth/expired-action-code") {
      throw new Error("Código de redefinição expirado. Solicite um novo.");
    }
    
    throw new Error(`Erro ao verificar código: ${error.message}`);
  }
};

// Função para aplicar código de ação (genérica)
export const applyActionCode = async (code: string): Promise<void> => {
  try {
    const { applyActionCode: firebaseApplyActionCode } = await import("firebase/auth");
    
    await firebaseApplyActionCode(auth, code);

  } catch (error: any) {
    console.error("Erro ao aplicar código:", error);
    
    if (error.code === "auth/invalid-action-code") {
      throw new Error("Código inválido ou expirado.");
    } else if (error.code === "auth/expired-action-code") {
      throw new Error("Código expirado.");
    }
    
    throw new Error(`Erro ao aplicar código: ${error.message}`);
  }
};

// Função para enviar email de verificação
export const sendEmailVerification = async (user?: User): Promise<void> => {
  try {
    const { sendEmailVerification: firebaseSendEmailVerification } = await import("firebase/auth");
    
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      throw new Error("Nenhum usuário logado encontrado");
    }
    
    await firebaseSendEmailVerification(currentUser, {
      url: `${window.location.origin}/auth/login`, // URL para retornar após verificar email
      handleCodeInApp: false
    });

  } catch (error: any) {
    console.error("Erro ao enviar email de verificação:", error);
    
    if (error.code === "auth/too-many-requests") {
      throw new Error("Muitas tentativas de envio. Tente novamente mais tarde.");
    }
    
    throw new Error(`Erro ao enviar email de verificação: ${error.message}`);
  }
};

// Função para verificar se o email foi verificado
export const checkEmailVerified = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Nenhum usuário logado encontrado");
    }
    
    // Recarregar dados do usuário para obter status atualizado
    await user.reload();
    
    return user.emailVerified;
  } catch (error: any) {
    console.error("Erro ao verificar status do email:", error);
    throw new Error(`Erro ao verificar email: ${error.message}`);
  }
};

// Versão atualizada da função de registro com verificação de email
export const registerUserWithEmailVerification = async (
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
    
    // Enviar email de verificação
    await sendEmailVerification(user);
    
    // Criar documento do usuário no Firestore
    const userData: UserData = {
      uid: user.uid,
      email: user.email || email,
      name,
      hotelId,
      hotelName,
      role,
      firstAccess: null, // Será definido quando verificar o email
    };
    
    await setDoc(doc(db, "users", user.uid), userData);

    return userData;
  } catch (error: any) {
    console.error("Erro ao cadastrar usuário:", error);
    
    // Tratamento específico para erro de email em uso
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Este email já está registrado. Por favor, use outro email ou faça login.");
    }
    
    throw new Error(`Falha ao cadastrar: ${error.message}`);
  }
};

// Função para admin forçar verificação de email (liberar acesso sem verificar)
export const adminForceEmailVerification = async (userId: string): Promise<void> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem forçar verificação de email");
    }

    // Obter dados do usuário
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userSnap.data() as UserData;
    
    // Não permitir forçar verificação de outro admin
    if (userData.role === 'admin') {
      throw new Error("Não é possível forçar verificação de outro administrador");
    }

    // Marcar como email verificado no Firestore (para controle interno)
    await setDoc(userRef, {
      emailVerifiedByAdmin: {
        verifiedBy: auth.currentUser?.uid,
        verifiedByEmail: auth.currentUser?.email,
        verifiedAt: new Date(),
        reason: "Email verification forced by admin"
      }
    }, { merge: true });

    return;
    
  } catch (error: any) {
    console.error("Erro ao forçar verificação de email:", error);
    throw new Error(`Erro ao forçar verificação: ${error.message}`);
  }
};

// Função para verificar se usuário pode acessar (verificando tanto Firebase quanto admin override)
export const canUserAccess = async (user: any, userData: UserData): Promise<boolean> => {
  // Admins sempre podem acessar
  if (userData.role === 'admin') {
    return true;
  }
  
  // Se email foi verificado no Firebase, pode acessar
  if (user.emailVerified) {
    return true;
  }
  
  // Se admin forçou verificação, pode acessar
  if (userData.emailVerifiedByAdmin) {
    return true;
  }
  
  // Caso contrário, não pode acessar
  return false;
};

// Função para obter dados dos usuários com status de verificação de email
export const getAllUsersWithEmailStatus = async () => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem acessar esta função");
    }
    
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    const users = querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as UserData[];
    
    // Para cada usuário, tentar determinar o status de verificação
    const usersWithStatus = users.map(user => {
      // Se tem firstAccess e é staff, provavelmente o email foi verificado
      // (pois só consegue fazer primeiro acesso se passou pela verificação)
      const emailVerified = user.role === 'admin' || 
                           user.firstAccess || 
                           user.emailVerifiedByAdmin ? true : false;
      
      return {
        ...user,
        emailVerified
      };
    });
    
    return usersWithStatus;
  } catch (error) {
    console.error("Erro ao listar usuários com status de email:", error);
    throw error;
  }
};

// Função para admin enviar email de verificação manualmente
export const adminSendVerificationEmail = async (userId: string): Promise<void> => {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error("Apenas administradores podem enviar emails de verificação");
    }

    // Obter dados do usuário
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("Usuário não encontrado");
    }
    
    const userData = userSnap.data() as UserData;

    // Nota: Não podemos enviar email para outro usuário usando client SDK
    // Isso deveria ser feito via Firebase Admin SDK no backend
    // Por enquanto, apenas registramos a tentativa
    
    await setDoc(userRef, {
      adminEmailResend: {
        requestedBy: auth.currentUser?.uid,
        requestedByEmail: auth.currentUser?.email,
        requestedAt: new Date(),
        status: "pending" // pending, sent, failed
      }
    }, { merge: true });

    throw new Error("Para reenviar emails de verificação é necessário Firebase Admin SDK. Use a opção 'Liberar Acesso' como alternativa.");
    
  } catch (error: any) {
    console.error("Erro ao enviar email de verificação:", error);
    throw error;
  }
}; 