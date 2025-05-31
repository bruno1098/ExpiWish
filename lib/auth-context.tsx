"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { getCurrentUserData, updateUserLastAccess, markFirstAccess } from "./auth-service";
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
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

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
        
        // Registrar primeiro acesso se for a primeira vez
        await markFirstAccess(authUser.uid);
        
        // Atualizar último acesso
        await updateUserLastAccess(authUser.uid);
      } else {
        setUserData(null);
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
    isAdmin: userData?.role === 'admin'
  };

  console.log("AuthProvider state:", { user: !!user, userData: !!userData, loading, isAdmin: value.isAdmin });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Componente de proteção de rota
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log("Redirecionando para /auth/login");
      router.push("/auth/login");
    } else if (!loading) {
      setChecked(true);
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

// Componente de proteção de rota para admin
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, userData, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        console.log("Redirecionando para /auth/login");
        router.push("/auth/login");
      } else if (!isAdmin) {
        console.log("Usuário não é admin, redirecionando para dashboard");
        router.push("/dashboard");
      } else {
        setChecked(true);
      }
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (isAuthenticated && isAdmin) ? <>{children}</> : null;
}; 