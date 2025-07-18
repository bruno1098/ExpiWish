"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "./firebase"
import { getCurrentUserData, canUserAccess, type UserData } from "./auth-service"
import { useRouter, usePathname } from "next/navigation"
import { devAuth, devError, devLog } from "./dev-logger"

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
          const userDataResult = await getCurrentUserData();
          devAuth("Dados do usuário obtidos:", userDataResult);
          setUserData(userDataResult);
          
          if (userDataResult) {
            const hasAccess = await canUserAccess(authUser, userDataResult);
            devAuth("Usuário pode acessar:", hasAccess);
            setIsAuthenticated(hasAccess);
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          devError("Erro ao obter dados do usuário:", error);
          setIsAuthenticated(false);
          setUserData(null);
        }
      } else {
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