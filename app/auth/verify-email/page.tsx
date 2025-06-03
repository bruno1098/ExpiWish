"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, checkEmailVerified, logoutUser } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle, ExternalLink } from "lucide-react";

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const router = useRouter();
  const { user, userData } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Verificar se o email já está verificado
    if (user.emailVerified) {
      setEmailVerified(true);
      setTimeout(() => {
        const redirectPath = userData?.role === 'admin' ? '/admin' : '/dashboard';
        router.push(redirectPath);
      }, 2000);
    }
  }, [user, userData, router]);

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      await sendEmailVerification();
      toast.success("Email de verificação reenviado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao reenviar email:", error);
      toast.error(error.message || "Erro ao reenviar email de verificação");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        setEmailVerified(true);
        toast.success("Email verificado com sucesso!");
        setTimeout(() => {
          const redirectPath = userData?.role === 'admin' ? '/admin' : '/dashboard';
          router.push(redirectPath);
        }, 1500);
      } else {
        toast.info("Email ainda não foi verificado. Verifique sua caixa de entrada.");
      }
    } catch (error: any) {
      console.error("Erro ao verificar email:", error);
      toast.error(error.message || "Erro ao verificar status do email");
    } finally {
      setChecking(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await logoutUser();
      router.push("/auth/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      router.push("/auth/login");
    }
  };

  if (emailVerified) {
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
            Email Verificado!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Seu email foi verificado com sucesso. Você será redirecionado para o sistema.
          </p>

          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">Redirecionando...</span>
          </div>
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
        
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-200 dark:bg-blue-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-indigo-200 dark:bg-indigo-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-cyan-200 dark:bg-cyan-900 blur-3xl opacity-30 dark:opacity-20"></div>
      </div>
      
      <div className="flex flex-col md:flex-row w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-gray-900 z-10 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        {/* Seção de ilustração à esquerda */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 flex flex-col items-center justify-center relative border-r border-gray-200 dark:border-gray-700">
          <div className="w-full max-w-sm flex flex-col items-center space-y-8 z-10">
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-lg">
                <Mail className="h-24 w-24 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg animate-pulse">
                <ExternalLink className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
              Verificação de Email
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Confirme seu endereço de email para acessar o sistema
            </p>
            
            {user?.email && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Email enviado para:
                </p>
                <p className="font-medium text-gray-800 dark:text-white">{user.email}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Conteúdo à direita */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-900 p-8 md:p-12">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Verifique seu email
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Enviamos um link de verificação para seu email. Clique no link para ativar sua conta.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Como verificar seu email:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>Verifique sua caixa de entrada</li>
                  <li>Procure por um email de verificação</li>
                  <li>Clique no link "Verificar Email"</li>
                  <li>Volte aqui e clique em "Verificar status"</li>
                </ol>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleCheckVerification}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={checking}
                >
                  {checking ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5" />
                      <span>Verificar status</span>
                    </div>
                  )}
                </Button>

                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>Reenviar email</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                <strong>Não recebeu o email?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verifique sua pasta de spam/lixo eletrônico</li>
                <li>Aguarde alguns minutos para o email chegar</li>
                <li>Clique em "Reenviar email" se necessário</li>
              </ul>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Problemas com a verificação? {" "}
                <button 
                  onClick={handleBackToLogin}
                  className="text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer"
                >
                  Voltar ao login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 