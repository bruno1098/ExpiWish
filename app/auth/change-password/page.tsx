"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  updateUserPassword,
  getCurrentUserData,
  updatePasswordAfterTemporaryLogin
} from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  Sparkles
} from "lucide-react";

const passwordTips = [
  "Combine letras maiúsculas, minúsculas, números e símbolos.",
  "Evite datas de aniversário, nomes ou sequências como 123456.",
  "Use um gerenciador de senhas confiável para armazenar com segurança."
];

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTemporaryLogin, setIsTemporaryLogin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData, isAuthenticated, refreshUserData } = useAuth();

  const displayName = userData?.name || userData?.email || userEmail || "boas-vindas";
  const roleLabel = userData?.role === "admin" ? "Administrador" : "Colaborador";

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
      router.push("/auth/login");
    }
  }, [searchParams, userData, isAuthenticated, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        throw new Error("Nova senha e confirmação são obrigatórias");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Nova senha e confirmação devem ser iguais");
      }

      if (newPassword.length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres");
      }

      if (!currentPassword) {
        throw new Error(isTemporaryLogin ? "Digite a senha temporária fornecida" : "Digite sua senha atual");
      }

      if (isTemporaryLogin) {
        await updatePasswordAfterTemporaryLogin(userEmail, currentPassword, newPassword);
        toast.success("Senha alterada com sucesso! Você foi conectado automaticamente.");
      } else {
        await updateUserPassword(currentPassword, newPassword);
        toast.success("Senha alterada com sucesso!");
      }

      await refreshUserData();
      const updatedUserData = await getCurrentUserData();

      setTimeout(() => {
        if (updatedUserData?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }, 1200);
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    newPassword !== confirmPassword ||
    newPassword.length < 6;

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/4 -right-24 w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="absolute -bottom-24 left-1/4 w-56 h-56 sm:w-64 sm:h-64 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-full blur-[100px] animate-pulse"
            style={{ animationDelay: "2.5s" }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)",
              backgroundSize: "36px 36px"
            }}
          />
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-10 py-10">
        <div className="w-full max-w-6xl grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div className="text-white space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-2xl border border-white/10 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-purple-200" />
              Segurança reforçada para sua conta
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                Olá, {displayName}! Vamos proteger o seu acesso 🚀
              </h1>
              <p className="text-base sm:text-lg text-white/80 max-w-xl">
                Por você ter recebido uma senha padrão do time administrativo, precisamos confirmar uma nova senha pessoal.
                Assim mantemos os dados do hotel seguros e o seu acesso exclusivo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-2xl p-4">
                <div className="flex items-center gap-3 text-white">
                  <Lock className="h-5 w-5 text-blue-200" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Status</p>
                    <p className="text-lg font-semibold">Senha padrão detectada</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-2xl p-4">
                <div className="flex items-center gap-3 text-white">
                  <Shield className="h-5 w-5 text-purple-200" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Perfil</p>
                    <p className="text-lg font-semibold">{roleLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-white">
                <AlertCircle className="h-5 w-5 text-amber-300" />
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-100">
                  Antes de continuar
                </p>
              </div>
              <ul className="space-y-3 text-white/80 text-sm">
                {passwordTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-300" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 blur-3xl" aria-hidden="true" />
            <div className="relative rounded-[28px] border border-white/20 dark:border-white/10 bg-white/95 dark:bg-slate-950/70 backdrop-blur-2xl shadow-2xl p-8 sm:p-10 space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 text-xs font-semibold dark:bg-blue-400/10 dark:text-blue-200">
                  <KeyRound className="h-4 w-4" />
                  Ajuste obrigatório de senha
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Defina uma senha só sua
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Informe a senha padrão recebida e escolha uma nova combinação. Você será redirecionado automaticamente após a confirmação.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 dark:border-amber-400/30 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold">Dica rápida</p>
                <p>
                  {isTemporaryLogin
                    ? "Use a senha temporária enviada pelo administrador apenas uma vez."
                    : "Comece digitando a senha padrão que você recebeu da equipe."}
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {isTemporaryLogin ? "Senha temporária" : "Senha atual"} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={isTemporaryLogin ? "Digite a senha temporária" : "Digite a senha padrão"}
                      className="pl-11 pr-11 h-11 text-sm"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Nova senha <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-11 pr-11 h-11 text-sm"
                      disabled={loading}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-xs text-red-500">A senha precisa ter pelo menos 6 caracteres.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Confirmar nova senha <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="pl-11 pr-11 h-11 text-sm"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">As senhas precisam ser iguais.</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                    <p className="text-xs text-emerald-500">Perfeito! As senhas coincidem.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-medium bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:pointer-events-none"
                  disabled={isSubmitDisabled}
                >
                  {loading ? "Salvando nova senha..." : "Confirmar nova senha"}
                </Button>

                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                  Após confirmar, encaminhamos você automaticamente para o ambiente adequado.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}