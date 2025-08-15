"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "./firebase"
import { getCurrentUserData, canUserAccess, updateUserLastAccess, markFirstAccess, type UserData } from "./auth-service"
import { useRouter, usePathname } from "next/navigation"
import { devAuth, devError, devLog } from "./dev-logger"

// Função para definir cookie
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; secure; samesite=strict`;
};

// Função para remover cookie
const removeCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

interface AuthContextType {
  isAuthenticated: boolean
  userData: UserData | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userData: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    devAuth("AuthProvider: Inicializando listener");
    const unsubscribe = onAuthStateChanged(auth, async (authUser: User | null) => {
      devAuth("Auth state changed:", authUser?.uid);
      
      if (authUser) {
        try {
          // Capturar e armazenar token de autenticação em cookie
          const token = await authUser.getIdToken();
          setCookie('firebase-auth-token', token, 1); // Cookie expira em 1 dia
          devAuth("🍪 Token de autenticação armazenado em cookie");
          
          const userDataResult = await getCurrentUserData();
          devAuth("Dados do usuário obtidos:", userDataResult);
          setUserData(userDataResult);
          
          if (userDataResult) {
            const hasAccess = await canUserAccess(authUser, userDataResult);
            devAuth("Usuário pode acessar:", hasAccess);
            setIsAuthenticated(hasAccess);
            
            // Atualizar timestamps de acesso
            if (hasAccess) {
              try {
                // Marcar primeiro acesso se não existir
                await markFirstAccess(authUser.uid);
                
                // Atualizar último acesso
                await updateUserLastAccess(authUser.uid);
                
                devAuth("✅ Timestamps de acesso atualizados para:", authUser.uid);
              } catch (accessError) {
                devError("❌ Erro ao atualizar timestamps de acesso:", accessError);
              }
            }
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          devError("Erro ao obter dados do usuário:", error);
          setIsAuthenticated(false);
          setUserData(null);
        }
      } else {
        // Remover cookie quando usuário faz logout
        removeCookie('firebase-auth-token');
        devAuth("🍪 Cookie de autenticação removido");
        
        // Limpar cache do dashboard administrativo no logout
        try {
          localStorage.removeItem('admin-dashboard-cache');
          localStorage.removeItem('admin-dashboard-timestamp');
          devAuth("🗑️ Cache do dashboard administrativo limpo no logout");
        } catch (error) {
          devError("Erro ao limpar cache no logout:", error);
        }
        
        setIsAuthenticated(false);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    devLog("AuthProvider state:", {
      isAuthenticated,
      userData: userData ? { role: userData.role, email: userData.email } : null,
      loading
    });
  }, [isAuthenticated, userData, loading]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        devAuth("❌ Usuário não autenticado, redirecionando para /auth/login");
        router.push("/auth/login");
      } else {
        devAuth("✅ Usuário pode acessar");
      }
    }
  }, [isAuthenticated, userData, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        devAuth("❌ Admin: Usuário não autenticado, redirecionando para /auth/login");
        router.push("/auth/login");
      } else if (userData?.role !== 'admin') {
        devAuth("❌ Admin: Usuário não é admin, redirecionando para dashboard");
        router.push("/dashboard");
      } else {
        devAuth("✅ Admin: Usuário pode acessar");
      }
    }
  }, [isAuthenticated, userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || userData?.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}