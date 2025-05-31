"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateUserPassword, loginWithTemporaryPassword, getCurrentUserData, updatePasswordAfterTemporaryLogin } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Key, AlertCircle, Shield } from "lucide-react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTemporaryLogin, setIsTemporaryLogin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData, isAuthenticated } = useAuth();

  useEffect(() => {
    const required = searchParams.get("required");
    const temporary = searchParams.get("temporary");
    const email = searchParams.get("email");
    
    if (temporary === "true" && email) {
      setIsTemporaryLogin(true);
      setUserEmail(email);
    } else if (required === "true" && userData?.mustChangePassword) {
      setIsTemporaryLogin(false);
    } else if (!isAuthenticated && !temporary) {
      // Se não está autenticado e não é login temporário, redirecionar para login
      router.push("/auth/login");
    }
  }, [searchParams, userData, isAuthenticated, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!newPassword || !confirmPassword) {
        throw new Error("Nova senha e confirmação são obrigatórias");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Nova senha e confirmação devem ser iguais");
      }

      if (newPassword.length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres");
      }

      if (isTemporaryLogin) {
        // Para login temporário, usar a função especial
        if (!currentPassword) {
          throw new Error("Digite a senha temporária fornecida pelo administrador");
        }

        // Usar a função especial para login temporário
        await updatePasswordAfterTemporaryLogin(userEmail, currentPassword, newPassword);
        
        toast.success("Senha alterada com sucesso! Você foi conectado automaticamente.");
        
        // Obter dados do usuário após alteração
        const userData = await getCurrentUserData();
        
        // Redirecionar baseado no role
        setTimeout(() => {
          if (userData?.role === 'admin') {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        }, 2000);
      } else {
        // Login normal que precisa trocar senha
        if (!currentPassword) {
          throw new Error("Digite sua senha atual");
        }

        await updateUserPassword(currentPassword, newPassword);
        
        toast.success("Senha alterada com sucesso!");
        
        // Redirecionar baseado no role
        setTimeout(() => {
          if (userData?.role === 'admin') {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <Key className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isTemporaryLogin ? "Definir Nova Senha" : "Alterar Senha Obrigatória"}
          </CardTitle>
          <CardDescription>
            {isTemporaryLogin 
              ? "Use a senha temporária fornecida pelo administrador e defina sua nova senha permanente"
              : "Por motivos de segurança, você deve alterar sua senha antes de continuar"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">Informações importantes:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {isTemporaryLogin ? (
                    <>
                      <li>Digite a senha temporária fornecida pelo administrador</li>
                      <li>Escolha uma nova senha segura e memorável</li>
                      <li>Sua nova senha será usada em todos os próximos acessos</li>
                    </>
                  ) : (
                    <>
                      <li>Digite sua senha atual primeiro</li>
                      <li>Escolha uma nova senha segura</li>
                      <li>Você não pode pular esta etapa</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {isTemporaryLogin ? "Senha Temporária" : "Senha Atual"} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={isTemporaryLogin ? "Digite a senha temporária" : "Digite sua senha atual"}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10"
                  disabled={loading}
                  minLength={6}
                  required
                />
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-red-600">⚠️ A senha deve ter pelo menos 6 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite novamente a nova senha"
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">⚠️ As senhas não coincidem</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                <p className="text-sm text-green-600">✅ Senhas coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
            >
              {loading ? "Alterando senha..." : "Alterar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 