"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { getCurrentUserData, updateUserLastAccess, markFirstAccess, canUserAccess } from "./auth-service";
import { useRouter } from "next/navigation";

// Interface para dados do usuário
export interface UserData {
  uid: string;
  email: string;
  hotelId: string;
  hotelName: string;
  role: 'admin' | 'staff';
  name?: string;
  firstAccess?: any;
  firstAccessTimestamp?: number;
  lastAccess?: any;
  lastAccessTimestamp?: number;
  mustChangePassword?: boolean;
  emailVerifiedByAdmin?: {
    verifiedBy: string;
    verifiedByEmail: string;
    verifiedAt: any;
    reason: string;
  };
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canAccess: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  canAccess: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    console.log("AuthProvider: Inicializando listener");
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("Auth state changed:", authUser?.uid);
      setUser(authUser);
      
      if (authUser) {
        // Buscar dados do usuário
        const userDataResult = await getCurrentUserData();
        console.log("Dados do usuário obtidos:", userDataResult);
        setUserData(userDataResult);
        
        // Verificar se o usuário pode acessar o sistema
        if (userDataResult) {
          const hasAccess = await canUserAccess(authUser, userDataResult);
          console.log("Usuário pode acessar:", hasAccess);
          setCanAccess(hasAccess);
          
          // Se pode acessar, registrar acessos
          if (hasAccess) {
            await markFirstAccess(authUser.uid);
            await updateUserLastAccess(authUser.uid);
          }
        } else {
          setCanAccess(false);
        }
      } else {
        setUserData(null);
        setCanAccess(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    isAdmin: userData?.role === 'admin',
    canAccess: !!user && canAccess
  };

  console.log("AuthProvider state:", { 
    user: !!user, 
    userData: !!userData, 
    loading, 
    isAdmin: value.isAdmin,
    canAccess: value.canAccess 
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Componente de proteção de rota
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, canAccess, userData, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado, redirecionando para /auth/login");
        router.push("/auth/login");
      } else if (!canAccess) {
        console.log("❌ Usuário não pode acessar (email não verificado), redirecionando para verificação");
        // Se for staff e não pode acessar, redirecionar para verificação
        if (userData?.role === 'staff') {
          router.push("/auth/verify-email");
        } else {
          // Se não é staff e não pode acessar, algo está errado
          console.error("⚠️ Usuário admin sem acesso - isso não deveria acontecer");
          router.push("/auth/login");
        }
      } else {
        console.log("✅ Usuário pode acessar");
        setChecked(true);
      }
    }
  }, [isAuthenticated, canAccess, userData, loading, router]);

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (isAuthenticated && canAccess) ? <>{children}</> : null;
};

// Componente de proteção de rota para admin
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, canAccess, userData, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        console.log("❌ Admin: Usuário não autenticado, redirecionando para /auth/login");
        router.push("/auth/login");
      } else if (!canAccess) {
        console.log("❌ Admin: Usuário não pode acessar, redirecionando para verificação");
        router.push("/auth/verify-email");
      } else if (!isAdmin) {
        console.log("❌ Admin: Usuário não é admin, redirecionando para dashboard");
        router.push("/dashboard");
      } else {
        console.log("✅ Admin: Usuário pode acessar");
        setChecked(true);
      }
    }
  }, [isAuthenticated, canAccess, isAdmin, loading, router]);

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (isAuthenticated && canAccess && isAdmin) ? <>{children}</> : null;
}; 