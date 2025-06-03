"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "@/lib/auth-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, CheckCircle, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("oobCode") || searchParams.get("code");

  useEffect(() => {
    if (code) {
      verifyCode();
    } else {
      toast.error("Código de redefinição não encontrado");
      router.push("/auth/login");
    }
  }, [code, router]);

  const verifyCode = async () => {
    try {
      const userEmail = await verifyPasswordResetCode(code!);
      setEmail(userEmail);
      setCodeValid(true);
    } catch (error: any) {
      console.error("Erro ao verificar código:", error);
      toast.error(error.message || "Código inválido ou expirado");
      setTimeout(() => {
        router.push("/auth/forgot-password");
      }, 3000);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(code!, newPassword);
      setResetComplete(true);
      toast.success("Senha redefinida com sucesso!");
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast.error(error.message || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  if (verifyingCode) {
    return (
      <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-300">Verificando código de redefinição...</p>
        </div>
      </div>
    );
  }

  if (!codeValid) {
    return (
      <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="bg-red-100 dark:bg-red-900/50 rounded-full p-4">
            <Lock className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Código Inválido
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            O código de redefinição é inválido ou expirou.
          </p>
          <Link href="/auth/forgot-password">
            <Button>Solicitar novo código</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-emerald-200 dark:bg-emerald-900 blur-3xl opacity-30 dark:opacity-20"></div>
          <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-green-200 dark:bg-green-900 blur-3xl opacity-30 dark:opacity-20"></div>
        </div>

        <div className="flex flex-col items-center justify-center w-full max-w-md z-10 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-full p-4 mb-6">
            <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
            Senha Redefinida!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Sua senha foi redefinida com sucesso. Agora você pode fazer login com sua nova senha.
          </p>

          <Button
            onClick={() => router.push("/auth/login")}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0,0,0,0.2) 2%, transparent 0%), 
                              radial-gradient(circle at 75px 75px, rgba(0,0,0,0.2) 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        ></div>
        
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-purple-200 dark:bg-purple-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-indigo-200 dark:bg-indigo-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-blue-200 dark:bg-blue-900 blur-3xl opacity-30 dark:opacity-20"></div>
      </div>
      
      <div className="flex flex-col md:flex-row w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-gray-900 z-10 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        {/* Seção de ilustração à esquerda */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 p-8 flex flex-col items-center justify-center relative border-r border-gray-200 dark:border-gray-700">
          <div className="w-full max-w-sm flex flex-col items-center space-y-8 z-10">
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-lg">
                <KeyRound className="h-24 w-24 text-purple-600 dark:text-purple-400" />
              </div>
              
              <div className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                <Lock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
              Nova Senha
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Digite sua nova senha segura
            </p>
            
            {email && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Redefinindo senha para:
                </p>
                <p className="font-medium text-gray-800 dark:text-white">{email}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Formulário à direita */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-900 p-8 md:p-12">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Redefinir Senha
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Crie uma senha forte para proteger sua conta
              </p>
            </div>
            
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="newPassword" className="text-gray-700 dark:text-gray-200 text-base">
                  Nova senha
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <Input
                    id="newPassword"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 py-5 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? (
                      <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-200 text-base">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={confirmPasswordVisible ? "text" : "password"}
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 py-5 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                  >
                    {confirmPasswordVisible ? (
                      <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>A senha deve ter:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Pelo menos 6 caracteres</li>
                  <li>Uma combinação de letras e números (recomendado)</li>
                </ul>
              </div>
              
              <Button
                type="submit"
                className="w-full py-5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Redefinindo...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Redefinir senha</span>
                  </div>
                )}
              </Button>
            </form>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Lembrou da senha? {" "}
              <Link href="/auth/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 