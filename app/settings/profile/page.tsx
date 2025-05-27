"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { updateUserProfile } from "@/lib/auth-service"
import { RequireAuth } from "@/lib/auth-context"
import SharedDashboardLayout from "../../shared-layout"

function ProfileContent() {
  const { userData, user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [hotelName, setHotelName] = useState("")
  
  useEffect(() => {
    if (userData) {
      setName(userData.name || "")
      setEmail(userData.email || "")
      setHotelName(userData.hotelName || "")
    }
  }, [userData])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userData) return
    
    setLoading(true)
    try {
      await updateUserProfile(userData.uid, { name })
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso."
      })
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro ao atualizar seu perfil",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-3xl font-bold">Meu Perfil</h2>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>
            Visualize e atualize suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hotel">Hotel</Label>
              <Input
                id="hotel"
                value={hotelName}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Entre em contato com o administrador para alterar seu hotel</p>
            </div>
            
            <div className="pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <SharedDashboardLayout>
      <ProfileContent />
    </SharedDashboardLayout>
  )
} 