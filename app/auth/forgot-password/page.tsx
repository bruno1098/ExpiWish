"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "@/lib/auth-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, ArrowLeft, KeyRound, Building2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setEmailSent(true);
      toast.success("Email de redefinição enviado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar email de redefinição:", error);
      toast.error(error.message || "Erro ao enviar email de redefinição");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background similar ao login */}
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
          <div 
            className="absolute inset-0 opacity-10 dark:opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0,0,0,0.2) 2%, transparent 0%), 
                                radial-gradient(circle at 75px 75px, rgba(0,0,0,0.2) 2%, transparent 0%)`,
              backgroundSize: '100px 100px',
            }}
          ></div>
          
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-emerald-200 dark:bg-emerald-900 blur-3xl opacity-30 dark:opacity-20"></div>
          <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-green-200 dark:bg-green-900 blur-3xl opacity-30 dark:opacity-20"></div>
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-teal-200 dark:bg-teal-900 blur-3xl opacity-30 dark:opacity-20"></div>
        </div>

        <div className="flex flex-col items-center justify-center w-full max-w-md z-10 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-full p-4 mb-6">
            <Mail className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
            Email Enviado!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Enviamos um link de redefinição de senha para <strong>{email}</strong>. 
            Verifique sua caixa de entrada e siga as instruções no email.
          </p>

          <div className="space-y-4 w-full">
            <Button
              onClick={() => router.push("/auth/login")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Login
            </Button>
            
            <Button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              variant="ghost"
              className="w-full"
            >
              Enviar para outro email
            </Button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6">
            Não recebeu o email? Verifique sua pasta de spam ou aguarde alguns minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background similar ao login */}
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0,0,0,0.2) 2%, transparent 0%), 
                              radial-gradient(circle at 75px 75px, rgba(0,0,0,0.2) 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        ></div>
        
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-orange-200 dark:bg-orange-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-amber-200 dark:bg-amber-900 blur-3xl opacity-30 dark:opacity-20"></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-yellow-200 dark:bg-yellow-900 blur-3xl opacity-30 dark:opacity-20"></div>
        
        {/* Linhas decorativas */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10 overflow-hidden">
          <div className="absolute top-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
          <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl bg-white dark:bg-gray-900 z-10 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        {/* Seção de ilustração à esquerda */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 p-8 flex flex-col items-center justify-center relative border-r border-gray-200 dark:border-gray-700">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-orange-100 dark:bg-orange-900/30 blur-xl opacity-50"></div>
            <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-amber-100 dark:bg-amber-900/30 blur-xl opacity-50"></div>
          </div>
          
          <div className="w-full max-w-sm flex flex-col items-center space-y-8 z-10">
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-lg">
                <KeyRound className="h-24 w-24 text-amber-600 dark:text-amber-400" />
              </div>
              
              <div className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                <Mail className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
              Recuperação de Senha
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Enviaremos um link seguro para redefinir sua senha
            </p>
          </div>
        </div>
        
        {/* Formulário à direita */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-900 p-8 md:p-12">
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Esqueci minha senha
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Digite seu email para receber instruções de redefinição
              </p>
            </div>
            
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 text-base">
                  Email cadastrado
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
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
              
              <Button
                type="submit"
                className="w-full py-5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Enviar email de redefinição</span>
                  </div>
                )}
              </Button>
            </form>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Lembrou da senha? {" "}
              <Link href="/auth/login" className="text-amber-600 hover:text-amber-700 font-medium">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 