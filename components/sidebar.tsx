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
  UserCheck,
  AlertCircle,
  Ticket,
  ClipboardList,
  Megaphone,
} from "lucide-react"

function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [showPulseAnimation, setShowPulseAnimation] = useState(false)
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
    label: "Tickets",
    icon: Ticket,
    href: "/tickets",
    color: "text-red-400",
  },
  {
    label: "Planos de Ação",
    icon: ClipboardList,
    href: "/action-plans",
    color: "text-lime-400",
    disabled: true,
    disabledTooltip: "Módulo em construção",
    disabledBadgeLabel: "Em construção",
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
      label: "Feedbacks Não Identificados",
      icon: AlertCircle,
      href: "/admin/feedback-nao-identificados",
      color: "text-orange-400",
    },
    {
      label: "Gerenciar Usuários",
      icon: Users,
      href: "/admin/usuarios",
      color: "text-blue-400",
    },
    {
      label: "Avisos Globais",
      icon: Megaphone,
      href: "/admin/avisos",
      color: "text-fuchsia-400",
    },
      {
      label: "Tickets da Plataforma",
      icon: Ticket,
      href: "/tickets",
      color: "text-red-400",
    },
    {
      label: "Planos de Ação",
      icon: ClipboardList,
      href: "/action-plans",
      color: "text-lime-400",
      disabled: false,
      disabledTooltip: "Módulo em construção",
      disabledBadgeLabel: "Em construção",
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

  // Apenas marcar como cliente, sem persistir estado
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Iniciar animação de pulse quando userData estiver disponível (login)
  useEffect(() => {
    if (userData && isClient) {
      setShowPulseAnimation(true)
      // Parar a animação após 5 segundos
      const timer = setTimeout(() => {
        setShowPulseAnimation(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [userData, isClient])

  // Resetar para fechado sempre que a rota mudar
  useEffect(() => {
    setCollapsed(true)
  }, [pathname])

  // Atualizar variável CSS sempre que o estado da sidebar mudar
  useEffect(() => {
    if (isClient) {
      const sidebarWidth = collapsed ? '80px' : '288px'
      document.documentElement.style.setProperty('--sidebar-width', sidebarWidth)
      
      // Também aplicar classe CSS para garantia
      if (collapsed) {
        document.documentElement.classList.add('sidebar-collapsed')
        document.documentElement.classList.remove('sidebar-expanded')
      } else {
        document.documentElement.classList.add('sidebar-expanded')
        document.documentElement.classList.remove('sidebar-collapsed')
      }
    }
  }, [collapsed, isClient])

  return (
    <div className={cn(
      "h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-500 ease-out flex flex-col relative border-r border-slate-700/50 shadow-2xl",
      collapsed ? "w-20" : "w-72"
    )}>
      <div className="absolute right-0 top-5 transform translate-x-1/2 z-50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "relative flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300 overflow-hidden group",
            "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600",
            "hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700",
            "shadow-lg hover:shadow-xl hover:shadow-blue-500/25",
            "transform hover:scale-110 active:scale-95",
            "border border-white/20",
            showPulseAnimation && "animate-subtle-bounce"
          )}
        >
          {/* Gradient overlay para efeito hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Ring de pulse automático */}
          {showPulseAnimation && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping" />
          )}
          
          {/* Ícone da seta */}
          <div className="relative z-10 transition-transform duration-300 ease-out group-hover:scale-110">
            {collapsed ? (
              <ChevronRight size={20} className="text-white drop-shadow-sm transition-all duration-300" />
            ) : (
              <ChevronLeft size={20} className="text-white drop-shadow-sm transition-all duration-300" />
            )}
          </div>
          
          {/* Shine effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
        </button>
        
        {/* Tooltip quando colapsado */}
        {collapsed && showPulseAnimation && (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700 animate-fade-in">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800 border-l border-t border-slate-700"></div>
              Clique para expandir o menu
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4 py-4 flex flex-col h-full">
      <div className="px-3 py-2 flex-1">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className={cn(
            "flex items-center mb-14 transition-all duration-300 ease-out group hover:scale-105",
            collapsed ? "justify-center pl-0" : "pl-3"
          )}>
          <div className="relative">
            <Building2 className="h-8 w-8 text-blue-400 transition-all duration-300 ease-out group-hover:text-blue-300" />
            <div className="absolute -inset-1 bg-blue-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
            {!collapsed && (
          <div className="transition-all duration-300 ease-out ml-3 overflow-hidden">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Expi × Wish
            </span>
          </div>
            )}
        </Link>
          
        <div className="space-y-2">
          {routes.map((route) => {
            const isDisabled = Boolean(route.disabled)
            const disabledTooltip = route.disabledTooltip ?? "Recurso em construção"
            const disabledBadgeLabel = route.disabledBadgeLabel ?? "Em breve"
            const itemTitle = isDisabled ? disabledTooltip : (collapsed ? route.label : undefined)

            return (
              <Link
                key={route.href}
                href={route.href}
                aria-disabled={isDisabled}
                data-disabled={isDisabled || undefined}
                onClick={(event) => {
                  if (isDisabled) {
                    event.preventDefault()
                    event.stopPropagation()
                  }
                }}
                className={cn(
                  "text-sm group flex p-3 justify-start font-medium rounded-xl transition-all duration-300 ease-out relative overflow-hidden",
                  pathname === route.href
                    ? "text-white bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 shadow-lg transform scale-105"
                    : "text-slate-300 hover:text-white hover:bg-white/10 hover:scale-105",
                  collapsed ? "justify-center" : "w-full",
                  isDisabled && "cursor-not-allowed opacity-60 hover:scale-100 hover:bg-white/5"
                )}
                title={itemTitle}
              >
                {/* Background hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out"></div>
                
                <div className={cn(
                  "flex items-center transition-all duration-300 ease-out relative z-10",
                  collapsed ? "flex-col" : "flex-1"
                )}>
                  <route.icon className={cn(
                    "h-5 w-5 transition-all duration-300 ease-out group-hover:scale-110",
                    collapsed ? "mb-1" : "mr-3",
                    route.color
                  )} />
                  {!collapsed && (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="transition-all duration-300 ease-out font-medium whitespace-nowrap">
                        {route.label}
                      </span>
                      {isDisabled && (
                        <span className="text-[10px] uppercase tracking-wide text-amber-200 bg-amber-500/10 border border-amber-400/40 rounded-full px-2 py-0.5 font-semibold">
                          {disabledBadgeLabel}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar;