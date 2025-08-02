import { NextRequest } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserData } from './auth-service';

// Função para extrair token do cookie
export function getTokenFromCookies(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = decodeURIComponent(value || '');
    return acc;
  }, {} as Record<string, string>);

  return cookies['firebase-auth-token'] || null;
}

// Função simplificada para verificar se existe token (sem validação completa)
// Nota: Esta é uma implementação temporária. Para produção, use Firebase Admin SDK
export function hasAuthToken(request: NextRequest): boolean {
  const token = getTokenFromCookies(request);
  return !!token && token.length > 0;
}

// Função para verificar autenticação em API routes
export async function authenticateRequest(request: NextRequest): Promise<{ authenticated: boolean; userData: UserData | null; error: string | null }> {
  const token = getTokenFromCookies(request);
  
  if (!token) {
    return { authenticated: false, userData: null, error: 'Token não encontrado' };
  }
  
  // Verificar se o token tem um formato válido (JWT básico)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return { authenticated: false, userData: null, error: 'Token inválido' };
  }
  
  try {
    // Decodificar o payload do JWT para obter informações básicas
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Verificar se o token não expirou
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { authenticated: false, userData: null, error: 'Token expirado' };
    }
    
    const uid = payload.user_id || payload.sub;
    if (!uid) {
      return { authenticated: false, userData: null, error: 'UID não encontrado no token' };
    }
    
    // Buscar dados completos do usuário no Firestore
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { authenticated: false, userData: null, error: 'Usuário não encontrado' };
      }
      
      const userData = docSnap.data() as UserData;
      return { authenticated: true, userData, error: null };
    } catch (firestoreError) {
      console.error('Erro ao buscar dados do usuário no Firestore:', firestoreError);
      return { authenticated: false, userData: null, error: 'Erro ao buscar dados do usuário' };
    }
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return { authenticated: false, userData: null, error: 'Token inválido' };
  }
}