"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

// Defina a interface para o UserData
export interface UserData {
  uid: string;
  email: string;
  hotelId: string;
  hotelName: string;
  role: 'admin' | 'manager' | 'staff';
}

// Crie o contexto
const UserDataContext = createContext<UserData | null>(null);

// Crie o hook para usar o contexto
export const useUserData = () => useContext(UserDataContext);

// Crie o provedor do contexto
export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const { userData } = useAuth();
  
  return (
    <UserDataContext.Provider value={userData}>
      {children}
    </UserDataContext.Provider>
  );
}; 