"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser, getCurrentUserData } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User, ShieldCheck, Building2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { isAuthenticated, userData, loading: authLoading } = useAuth();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!authLoading && isAuthenticated && userData) {
      const redirectPath = userData.role === 'admin' ? '/admin' : '/dashboard';
      router.replace(redirectPath);
    }
  }, [isAuthenticated, userData, authLoading, router]);

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Não renderizar a página de login se usuário já estiver logado
  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Tentando login com:", email, password);
      const user = await loginUser(email, password);
      console.log("Login realizado:", user);
      
      // Obter dados do usuário para verificar função
      const userData = await getCurrentUserData();

      toast.success("Login realizado com sucesso");

      // Redirecionar com base na função do usuário
      setTimeout(() => {
        if (userData?.role === 'admin') {
          router.push("/admin");
        } else {
        router.push("/dashboard");
        }
      }, 500);
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      setError(error.message || "Falha ao fazer login. Verifique suas credenciais.");
      toast.error(error.message || "Falha ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background com design arquitetônico e elementos visuais */}
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        {/* Padrão geométrico no fundo */}
        <div 
          className="absolute inset-0 opacity-10 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0,0,0,0.2) 2%, transparent 0%), 
                              radial-gradient(circle at 75px 75px, rgba(0,0,0,0.2) 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        ></div>
        
        {/* Elementos de fundo */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-200 dark:bg-blue-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-indigo-200 dark:bg-indigo-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-cyan-200 dark:bg-cyan-900 blur-3xl opacity-30 dark:opacity-20"></div>
        
        {/* Linhas decorativas */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10 overflow-hidden">
          <div className="absolute top-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          
          <div className="absolute left-20 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row w-full max-w-5xl overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-gray-900 z-10 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        {/* Seção de ilustração à esquerda */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-900 p-8 flex flex-col items-center justify-center relative border-r border-gray-200 dark:border-gray-700">
          {/* Elementos decorativos sutis */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/30 blur-xl opacity-50"></div>
            <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-indigo-100 dark:bg-indigo-900/30 blur-xl opacity-50"></div>
          </div>
          
          {/* Ilustração principal */}
          <div className="w-full max-w-sm flex flex-col items-center space-y-8 z-10">
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-lg">
                <Building2 className="h-24 w-24 text-slate-700 dark:text-slate-300" />
              </div>
              
              {/* Ícone de segurança que pulsa suavemente */}
              <div className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg animate-pulse">
                <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
              Sistema de Gestão Hoteleira
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Plataforma de administração completa para seu estabelecimento
            </p>
          </div>
        </div>
        
        {/* Formulário de login à direita */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-900 p-8 md:p-12">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Área Restrita</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Por favor, identifique-se para acessar o sistema
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 text-base">Email</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
          <Input
            id="email"
            type="email"
            placeholder="seu.email@hotel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 py-5 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            required
          />
                </div>
        </div>
        
              <div className="space-y-3">
          <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-200 text-base">Senha</Label>
            <Link 
              href="/auth/reset-password"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Esqueceu a senha?
            </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 py-5 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            required
          />
                </div>
        </div>
        
        {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}
        
        <Button 
          type="submit" 
                className="w-full py-5 text-base font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
          disabled={loading}
        >
                {loading ? "Autenticando..." : "Entrar no Sistema"}
        </Button>
      </form>
      
            <div className="text-center text-sm border-t border-gray-200 dark:border-gray-700 pt-6 mt-4">
              <p className="text-gray-600 dark:text-gray-400">
                Não possui acesso? Entre em contato com o administrador do sistema.
        </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 