"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser, getCurrentUserData, sendEmailVerification, canUserAccess } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User, BarChart3, TrendingUp, Shield, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { isAuthenticated, userData, loading: authLoading } = useAuth();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!authLoading && isAuthenticated && userData) {
      const redirectPath = userData.role === 'admin' ? '/admin' : '/dashboard';
      console.log(`🔄 Usuário já logado (${userData.role}), redirecionando para: ${redirectPath}`);
      router.replace(redirectPath);
    }
  }, [isAuthenticated, userData, authLoading, router]);

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-b-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
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
      
      const user = await loginUser(email, password);
      
      // Obter dados do usuário para verificar função
      const userData = await getCurrentUserData();
      
      if (!userData) {
        toast.error("Erro ao obter dados do usuário");
        return;
      }

      // Verificar se usuário pode acessar (admins sempre podem, staff precisa verificar email)
      const canAccess = await canUserAccess(user, userData);
      
      if (!canAccess) {
        
        // Enviar email de verificação na primeira tentativa de login
        try {
          await sendEmailVerification();
          
        } catch (emailError) {
          console.error("❌ Erro ao enviar email:", emailError);
        }
        
        toast.info("Você precisa verificar seu email antes de acessar o sistema. Verifique sua caixa de entrada.");
        setTimeout(() => {
          router.push("/auth/verify-email");
        }, 1000);
        return;
      }
      
      // Verificar se deve trocar senha
      if (userData?.mustChangePassword) {
        
        toast.success("Login autorizado! Você será redirecionado para alterar sua senha.");
        
        // Redirecionar para página de troca de senha obrigatória
        setTimeout(() => {
          router.push("/auth/change-password?required=true");
        }, 1000);
        return;
      }

      // Login bem-sucedido - o redirecionamento será feito automaticamente pelo useAuth()
      toast.success("Login realizado com sucesso");
      
    } catch (error: any) {
      console.error("❌ Erro ao fazer login:", error);
      
      // Verificar se é redirecionamento para senha temporária
      if (error.message === "TEMP_PASSWORD_REDIRECT") {
        
        toast.success("Senha temporária detectada! Você será redirecionado para alterar sua senha.");
        // Redirecionar para página de troca de senha
        setTimeout(() => {
          router.push(`/auth/change-password?email=${encodeURIComponent(email)}&temporary=true`);
        }, 1000);
        return;
      }
      
      // Verificar se contém o código de redirecionamento mesmo que tenha outras palavras
      if (error.message && error.message.includes("TEMP_PASSWORD_REDIRECT")) {
        console.log("🔑 Senha temporária detectada (string), redirecionando...");
        toast.success("Senha temporária detectada! Você será redirecionado para alterar sua senha.");
        // Redirecionar para página de troca de senha
        setTimeout(() => {
          router.push(`/auth/change-password?email=${encodeURIComponent(email)}&temporary=true`);
        }, 1000);
        return;
      }
      
      setError(error.message || "Falha ao fazer login. Verifique suas credenciais.");
      toast.error(error.message || "Falha ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background com gradientes modernos e elementos fluidos */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
        {/* Elementos de fundo animados */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Orbs flutuantes com glassmorphism */}
          <div className="absolute -top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/4 -right-20 w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-20 left-1/4 w-56 h-56 sm:w-64 sm:h-64 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Padrão de grade sutil */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          ></div>
        </div>
      </div>

      {/* Container principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Lado esquerdo - Informações da marca */}
          <div className="order-2 lg:order-1 text-center lg:text-left space-y-6 lg:space-y-8 px-4 lg:px-0">
            {/* Logo/Ícone principal com efeito neumórfico */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl transform transition-all duration-300 group-hover:scale-105">
                  <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  {/* Glow effect mais sutil */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl blur-xl opacity-30 -z-10"></div>
                </div>
                {/* Pulse indicator */}
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Título principal */}
            <div className="space-y-3 lg:space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                BI Qualidade
              </h1>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <div className="h-0.5 sm:h-1 w-8 sm:w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <span className="text-lg sm:text-xl lg:text-2xl text-gray-300 font-medium">Grupo Wish</span>
                <div className="h-0.5 sm:h-1 w-8 sm:w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              </div>
            </div>

            {/* Descrição */}
            <p className="text-base sm:text-lg text-gray-400 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Plataforma inteligente de Business Intelligence para monitoramento da qualidade e excelência operacional em toda a rede hoteleira.
            </p>

            {/* Características */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-xs sm:text-sm text-gray-300">Analytics Avançado</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                <span className="text-xs sm:text-sm text-gray-300">Seguro & Confiável</span>
              </div>
            </div>
          </div>

          {/* Lado direito - Formulário de login com glassmorphism */}
          <div className="order-1 lg:order-2 w-full max-w-sm sm:max-w-md mx-auto">
            <div className="relative">
              {/* Card principal com glassmorphism melhorado */}
              <div className="bg-white/5 backdrop-blur-3xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
                {/* Header do formulário */}
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Área de Acesso</h2>
                  <p className="text-sm sm:text-base text-gray-400">Entre com suas credenciais para continuar</p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                  {/* Campo de email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium text-sm sm:text-base">Email</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu.email@grupowish.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 sm:pl-12 h-11 sm:h-12 bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-lg sm:rounded-xl focus:bg-white/10 focus:border-blue-400/30 transition-all duration-300 text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>

                  {/* Campo de senha */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium text-sm sm:text-base">Senha</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-lg sm:rounded-xl focus:bg-white/10 focus:border-blue-400/30 transition-all duration-300 text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Link esqueceu senha */}
                  <div className="text-right">
                    <Link 
                      href="/auth/forgot-password"
                      className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Esqueceu sua senha?
                    </Link>
                  </div>

                  {/* Mensagem de erro */}
                  {error && (
                    <div className="p-3 sm:p-4 bg-red-500/5 border border-red-500/20 text-red-300 text-xs sm:text-sm rounded-lg sm:rounded-xl backdrop-blur-sm">
                      {error}
                    </div>
                  )}

                  {/* Botão de submit */}
                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Autenticando...
                      </div>
                    ) : (
                      "Acessar Plataforma"
                    )}
                  </Button>
                </form>

                {/* Footer */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 text-center">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Acesso restrito aos colaboradores autorizados do Grupo Wish
                  </p>
                </div>
              </div>

              {/* Efeitos decorativos mais sutis */}
              <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl sm:rounded-3xl blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-ping opacity-20"></div>
        <div className="absolute top-3/4 right-1/4 w-0.5 h-0.5 sm:w-1 sm:h-1 bg-purple-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-pink-400 rounded-full animate-ping opacity-25" style={{ animationDelay: '4s' }}></div>
      </div>
    </div>
  );
} 