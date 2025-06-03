"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  BarChart3,
  FileUp,
  Settings,
  LineChart,
  Building2,
  FileText,
  History,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
  Shield,
  RefreshCw,
  Activity,
  UserCheck
} from "lucide-react"
import { AnimatedText } from "./animated-text"

function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const { userData } = useAuth()
  const isAdmin = userData?.role === 'admin'

  // Rotas para colaboradores
  const staffRoutes = [
  {
    label: "Dashboard",
    icon: BarChart3,
      href: "/dashboard",
    color: "text-blue-400",
  },
  {
    label: "Importar Dados",
    icon: FileUp,
    href: "/import",
    color: "text-emerald-400",
  },
  {
    label: "Análise",
    icon: LineChart,
    color: "text-purple-400",
    href: "/analysis",
  },
  {
    label: "Histórico",
    icon: History,
    color: "text-amber-400",
    href: "/history",
  },
  {
    label: "Não Identificados",
    icon: RefreshCw,
    color: "text-orange-400",
    href: "/analysis/unidentified",
  },
    {
      label: "Meu Perfil",
      icon: User,
      color: "text-cyan-400",
      href: "/settings/profile",
    },
  {
    label: "Configurações",
    icon: Settings,
    href: "/settings",
    color: "text-gray-400",
  },
]

  // Rotas para administradores
  const adminRoutes = [
    {
      label: "Painel Admin",
      icon: Shield,
      href: "/admin",
      color: "text-red-400",
    },
    {
      label: "Gestão de Hotéis",
      icon: BarChart3,
      href: "/admin/comparacao",
      color: "text-yellow-400",
    },
    {
      label: "Importar Dados",
      icon: FileUp,
      href: "/import",
      color: "text-emerald-400",
    },
    {
      label: "Gerenciar Usuários",
      icon: Users,
      href: "/admin/usuarios",
      color: "text-blue-400",
    },
    {
      label: "Configuração",
      icon: Settings,
      href: "/admin/configuracao",
      color: "text-emerald-400",
    },
    {
      label: "Meu Perfil",
      icon: User,
      color: "text-cyan-400",
      href: "/settings/profile",
    },
  ]

  // Usar as rotas apropriadas com base no perfil do usuário
  const routes = isAdmin ? adminRoutes : staffRoutes

  // Usar localStorage para persistir o estado entre navegações
  useEffect(() => {
    setIsClient(true)
    const storedState = localStorage.getItem('sidebarCollapsed')
    if (storedState) {
      setCollapsed(storedState === 'true')
    }
  }, [])

  // Atualizar localStorage quando o estado mudar
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('sidebarCollapsed', String(collapsed))
      // Disparar evento customizado para notificar mudança
      window.dispatchEvent(new CustomEvent('sidebarToggle', { 
        detail: { collapsed } 
      }))
    }
  }, [collapsed, isClient])

  return (
    <div className={cn(
      "h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col relative border-r border-slate-700/50",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="absolute right-0 top-5 transform translate-x-1/2 z-50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 hover:scale-105"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      <div className="space-y-4 py-4 flex flex-col h-full">
      <div className="px-3 py-2 flex-1">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className={cn(
            "flex items-center mb-14 transition-all duration-200 ease-in-out group hover:scale-105",
            collapsed ? "justify-center pl-0" : "pl-3"
          )}>
          <div className="relative">
            <Building2 className="h-8 w-8 text-blue-400 transition-all duration-200 ease-in-out group-hover:text-blue-300" />
            <div className="absolute -inset-1 bg-blue-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
            {!collapsed && (
          <div className="transition-all duration-200 ease-in-out ml-3">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Expi × Wish
            </span>
          </div>
            )}
        </Link>
          
        <div className="space-y-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                  "text-sm group flex p-3 justify-start font-medium cursor-pointer rounded-xl transition-all duration-200 ease-in-out relative overflow-hidden",
                pathname === route.href
                  ? "text-white bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-white/10",
                  collapsed ? "justify-center" : "w-full"
              )}
                title={collapsed ? route.label : undefined}
            >
                {/* Background hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                
                <div className={cn(
                  "flex items-center transition-all duration-200 ease-in-out relative z-10",
                  collapsed ? "flex-col" : "flex-1"
                )}>
                  <route.icon className={cn(
                    "h-5 w-5 transition-all duration-200 ease-in-out group-hover:scale-110",
                    collapsed ? "mb-1" : "mr-3",
                    route.color
                  )} />
                  {!collapsed && (
                    <span className="transition-all duration-200 ease-in-out font-medium">
                      {route.label}
                    </span>
                  )}
              </div>
            </Link>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar;