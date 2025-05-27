"use client";

import { useState } from "react";
import { registerUser } from "@/lib/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validações
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      // Criar usuário administrador com o hotel padrão
      await registerUser(
        email,
        password,
        "all-hotels",
        "Todos os Hotéis",
        "Administrador",
        "admin"
      );

      toast({
        title: "Sucesso",
        description: "Administrador criado com sucesso!"
      });
      
      setSetupDone(true);
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar administrador.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (setupDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Configuração Concluída</h1>
            <p className="mb-4">Administrador criado com sucesso!</p>
            <p>Redirecionando para a página de login...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Configuração Inicial</h1>
          <p className="text-muted-foreground">Crie o administrador principal do sistema</p>
        </div>
        
        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Administrador</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Configurando..." : "Criar Administrador"}
          </Button>
        </form>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Esta página só deve ser usada uma vez para configuração inicial.
            Após criar o administrador, use a página de gerenciamento de usuários.
          </p>
        </div>
      </Card>
    </div>
  );
} 