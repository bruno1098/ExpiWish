"use client"

import { Search, LogOut, User, Menu } from "lucide-react"
import { Input } from "./ui/input"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { Button } from "./ui/button"
import { logoutUser } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useToast } from "./ui/use-toast"
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
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await logoutUser()
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      })
      router.push("/auth/login")
    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message || "Ocorreu um erro ao fazer logout",
        variant: "destructive"
      })
    }
  }

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 gap-4">
        {children}
        <div className="flex-1">
          <form className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Pesquisar feedbacks..."
              className="pl-8"
            />
          </form>
        </div>
        
        {userData && (
          <div className="hidden md:flex items-center mr-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Olá, {userData.name || userData.email.split('@')[0]}</span>
            <span className="mx-2">•</span>
            <span>{userData.hotelName}</span>
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userData && (
              <>
                <DropdownMenuItem className="text-sm">
                  <span className="font-medium">{userData.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm text-muted-foreground">
                  Hotel: {userData.hotelName}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
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