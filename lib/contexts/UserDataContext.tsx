"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { UserData } from "@/lib/auth-service";

interface UserDataContextType {
  userData: UserData | null;
  loading: boolean;
}

const UserDataContext = createContext<UserDataContextType>({
  userData: null,
  loading: true
});

export const useUserData = () => useContext(UserDataContext);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // O userData já vem do AuthContext, só precisamos gerenciar o loading
    setLoading(false);
  }, [userData]);

  return (
    <UserDataContext.Provider value={{ userData, loading }}>
      {children}
    </UserDataContext.Provider>
  );
}; 