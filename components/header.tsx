"use client"

import { LogOut, User, Menu, Building2, Star, MapPin, Crown, Shield } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { Button } from "./ui/button"
import { logoutUser } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { ReactNode } from "react"

export default function Header({ children }: { children?: ReactNode }) {
  const { userData } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logoutUser()
      toast.success("Logout realizado", {
        description: "Você foi desconectado com sucesso."
      })
      router.push("/auth/login")
    } catch (error: any) {
      toast.error("Erro ao sair", {
        description: error.message || "Ocorreu um erro ao fazer logout"
      })
    }
  }

  // Função para renderizar as estrelas do hotel
  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ))
  }

  // Função para determinar a cor do badge baseado no role
  const getRoleBadgeStyle = (role: string) => {
    if (role === 'admin') {
      return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
    }
    return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
  }

  // Função para obter ícone baseado no role
  const getRoleIcon = (role: string) => {
    if (role === 'admin') {
      return <Crown className="w-3 h-3" />
    }
    return <Shield className="w-3 h-3" />
  }

  return (
    <header className="bg-gradient-to-r from-white via-slate-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex h-16 items-center px-4 lg:px-6 xl:px-8 gap-4">
        {children}
        
        {/* Área central com informações do usuário e hotel */}
        <div className="flex-1 flex items-center justify-center">
          {userData && (
            <div className="flex items-center gap-4 lg:gap-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl px-4 lg:px-6 py-3 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              
              {/* Saudação personalizada */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm lg:text-base font-semibold text-gray-700 dark:text-gray-200">
                      Olá, {userData.name || userData.email.split('@')[0]}
                    </span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleBadgeStyle(userData.role)}`}>
                      {getRoleIcon(userData.role)}
                      {userData.role === 'admin' ? 'Admin' : 'Colaborador'}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date().toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-600"></div>
              
              {/* Informações do hotel */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  {(userData as any).stars && (
                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full px-1.5 py-0.5 text-xs font-bold text-yellow-900">
                      {(userData as any).stars}★
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm lg:text-base font-semibold text-gray-700 dark:text-gray-200">
                      {userData.hotelName}
                    </span>
                    {(userData as any).stars && (
                      <div className="flex items-center gap-0.5">
                        {renderStars((userData as any).stars)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span>BI Qualidade • Grupo Wish</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative w-11 h-11 rounded-full bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 hover:bg-white/30 dark:hover:bg-gray-700/40 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <User className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="pb-2">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userData && (
              <>
                <DropdownMenuItem className="text-sm p-3 cursor-default">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {userData.name || userData.email.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {userData.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="text-sm p-3 cursor-default">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {userData.hotelName}
                      </span>
                      <div className="flex items-center gap-2">
                        {(userData as any).stars && (
                          <div className="flex items-center gap-0.5">
                            {renderStars((userData as any).stars)}
                          </div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Grupo Wish
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="text-sm p-3 cursor-default">
                  <div className="flex items-center gap-3 w-full">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRoleBadgeStyle(userData.role)}`}>
                      {getRoleIcon(userData.role)}
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {userData.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        BI Qualidade • Sistema de Gestão
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <ThemeToggle />
      </div>
    </header>
  )
}