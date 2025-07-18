"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { updateUserProfile, updateUserPassword } from "@/lib/auth-service"
import { RequireAuth } from "@/lib/auth-context"
import { Loader2, User, Lock, Shield } from "lucide-react"
import SharedDashboardLayout from "../../shared-layout"

function ProfileContent() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [hotelName, setHotelName] = useState("")
  
  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
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
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await updateUserPassword(currentPassword, newPassword);
      
      toast({
        title: "✅ Senha alterada com sucesso",
        description: "Sua senha foi atualizada.",
        duration: 5000
      });

      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      
      let errorMessage = error.message || "Falha ao alterar senha.";
      
      if (error.message?.includes("wrong-password") || error.message?.includes("Senha atual incorreta")) {
        errorMessage = "Senha atual incorreta. Verifique e tente novamente.";
      } else if (error.message?.includes("weak-password")) {
        errorMessage = "A nova senha deve ter pelo menos 6 caracteres.";
      } else if (error.message?.includes("requires-recent-login")) {
        errorMessage = "Por segurança, faça login novamente antes de alterar a senha.";
      }
      
      toast({
        title: "❌ Erro ao alterar senha",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setIsChangingPassword(false);
    }
  }
  
  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-3xl font-bold">Meu Perfil</h2>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
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
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Para sua segurança, insira sua senha atual para definir uma nova senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                Senha Atual <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                disabled={isChangingPassword}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                Nova Senha <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isChangingPassword}
                minLength={6}
              />
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-red-600">⚠️ A senha deve ter pelo menos 6 caracteres</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite novamente sua nova senha"
                disabled={isChangingPassword}
                minLength={6}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">⚠️ As senhas não coincidem</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                <p className="text-sm text-green-600">✅ Senhas coincidem</p>
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Segurança:</strong> Sua nova senha será aplicada imediatamente e você permanecerá logado.
                </p>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </>
                )}
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