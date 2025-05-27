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
  MessageSquare,
  FileText,
  History,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
  Shield,
  RefreshCw
} from "lucide-react"
import { AnimatedText } from "./animated-text"

function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const { userData } = useAuth()
  const isAdmin = userData?.role === 'admin'

  // Rotas para funcionários
  const staffRoutes = [
  {
    label: "Dashboard",
    icon: BarChart3,
      href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Importar Dados",
    icon: FileUp,
    href: "/import",
    color: "text-violet-500",
  },
  {
    label: "Análise",
    icon: LineChart,
    color: "text-pink-700",
    href: "/analysis",
  },
  {
    label: "Histórico",
    icon: History,
    color: "text-green-500",
    href: "/history",
  },
    {
      label: "Meu Perfil",
      icon: User,
      color: "text-orange-500",
      href: "/settings/profile",
    },
  {
    label: "Configurações",
    icon: Settings,
    href: "/settings",
  },
]

  // Rotas para administradores
  const adminRoutes = [
    {
      label: "Painel Admin",
      icon: Shield,
      href: "/admin",
      color: "text-red-500",
    },
    {
      label: "Importar Dados",
      icon: FileUp,
      href: "/import",
      color: "text-violet-500",
    },
    {
      label: "Gerenciar Usuários",
      icon: Users,
      href: "/admin/usuarios",
      color: "text-blue-500",
    },
    {
      label: "Configuração",
      icon: Settings,
      href: "/admin/configuracao",
      color: "text-emerald-500",
    },
    {
      label: "Meu Perfil",
      icon: User,
      color: "text-orange-500",
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
    }
  }, [collapsed, isClient])

  return (
    <div className={cn(
      "h-full bg-[#111827] text-white transition-all duration-300 flex flex-col relative",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="absolute right-0 top-5 transform translate-x-1/2 z-50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      <div className="space-y-4 py-4 flex flex-col h-full">
      <div className="px-3 py-2 flex-1">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className={cn(
            "flex items-center mb-14",
            collapsed ? "justify-center pl-0" : "pl-3"
          )}>
          <MessageSquare className="h-8 w-8 text-primary" />
            {!collapsed && (
          <AnimatedText
            text="expi"
            className="text-2xl font-bold ml-2"
          />
            )}
        </Link>
          
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                  "text-sm group flex p-3 justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "text-white bg-white/10"
                    : "text-zinc-400",
                  collapsed ? "justify-center" : "w-full"
              )}
                title={collapsed ? route.label : undefined}
            >
                <div className={cn(
                  "flex items-center",
                  collapsed ? "flex-col" : "flex-1"
                )}>
                  <route.icon className={cn(
                    "h-5 w-5",
                    collapsed ? "mb-1" : "mr-3",
                    route.color
                  )} />
                  {!collapsed && route.label}
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