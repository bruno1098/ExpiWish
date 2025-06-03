"use client";

import React, { useEffect, useState } from 'react';
import { getAllUsers, createUserKeepingAdminLoggedIn, createUserAsAdmin, updateUserRole, deleteUser, deleteUserCompletely, syncUsersWithAuth, adminForceEmailVerification, canUserAccess, getCurrentUserData, getAllUsersWithEmailStatus } from '@/lib/auth-service';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequireAdmin } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, Trash2, RefreshCw, Key, Copy, User, Mail, Lock, Building, UserCheck, Globe, MessageSquare, Shield, CheckCircle, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';

// Lista predefinida de hotéis
const PREDEFINED_HOTELS = [
  { id: "wish-serrano", name: "Wish Serrano" },
  { id: "wish-foz", name: "Wish Foz" },
  { id: "wish-bahia", name: "Wish Bahia" },
  { id: "wish-natal", name: "Wish Natal" },
  { id: "prodigy-santos-dumont", name: "Prodigy Santos Dumont" },
  { id: "prodigy-gramado", name: "Prodigy Gramado" },
  { id: "marupiara", name: "Marupiara" },
  { id: "linx-confins", name: "Linx Confins" },
  { id: "linx-galeao", name: "Linx Galeão" }
];

// Função para buscar hotéis
const getAllHotels = async (): Promise<Hotel[]> => {
  try {
    const hotelsRef = collection(db, "hotels");
    const querySnapshot = await getDocs(hotelsRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || doc.id
    }));
  } catch (error) {
    console.error("Erro ao carregar hotéis:", error);
    return PREDEFINED_HOTELS;
  }
};

interface Hotel {
  id: string;
  name: string;
}

interface User {
  uid: string;
  email: string;
  name?: string;
  hotelId: string;
  hotelName: string;
  role: 'admin' | 'staff';
  emailVerified?: boolean; // Status de verificação do Firebase
  emailVerifiedByAdmin?: {
    verifiedBy: string;
    verifiedByEmail: string;
    verifiedAt: any;
    reason: string;
  };
}

function UserManagementContent() {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToDeleteData, setUserToDeleteData] = useState<User | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    hotel: string;
    role: string;
  } | null>(null);
  const [usedFallbackMethod, setUsedFallbackMethod] = useState(false);
  
  // Estados para verificação de email
  const [forceVerifyDialogOpen, setForceVerifyDialogOpen] = useState(false);
  const [userToForceVerify, setUserToForceVerify] = useState<User | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(false);
  
  const { toast } = useToast();

  // Estados para novo usuário
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");
  const [newUserHotelId, setNewUserHotelId] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff'>('staff');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const usersData = await getAllUsersWithEmailStatus();
        
        setUsers(usersData);
        
        // Carregar hotéis
        const hotelsData = await getAllHotels();
        setHotels(hotelsData.length > 0 ? hotelsData : PREDEFINED_HOTELS);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'staff') => {
    try {
      setIsLoading(true);
      
      // Buscar dados do usuário antes da mudança
      const targetUser = users.find(u => u.uid === userId);
      const oldRole = targetUser?.role;
      
      await updateUserRole(userId, newRole);
      
      toast({
        title: "Função atualizada",
        description: "A função do usuário foi atualizada com sucesso."
      });
      
      // Recarregar a lista de usuários
      const usersData = await getAllUsersWithEmailStatus();
      setUsers(usersData);
    } catch (error: any) {
      console.error("Erro ao atualizar função:", error);
      toast({
        title: "Erro ao atualizar função",
        description: error.message || "Falha ao atualizar função do usuário.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset de loading se necessário
    setIsLoading(false);
    
    // Validações completas
    const errors: string[] = [];
    
    // Validar nome (obrigatório)
    if (!newUserName.trim()) {
      errors.push("Nome é obrigatório");
    } else if (newUserName.trim().length < 2) {
      errors.push("Nome deve ter pelo menos 2 caracteres");
    }
    
    // Validar email
    if (!newUserEmail.trim()) {
      errors.push("Email é obrigatório");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUserEmail.trim())) {
        errors.push("Email deve ter um formato válido (exemplo@dominio.com)");
      }
    }
    
    // Validar senha
    if (!newUserPassword) {
      errors.push("Senha é obrigatória");
    } else if (newUserPassword.length < 6) {
      errors.push("Senha deve ter pelo menos 6 caracteres");
    } else if (newUserPassword.length > 50) {
      errors.push("Senha não pode ter mais de 50 caracteres");
    }
    
    // Validar confirmação de senha
    if (!newUserConfirmPassword) {
      errors.push("Confirmação de senha é obrigatória");
    } else if (newUserPassword !== newUserConfirmPassword) {
      errors.push("Senha e confirmação de senha devem ser iguais");
    }
    
    // Validar hotel
    if (!newUserHotelId) {
      errors.push("Seleção de hotel é obrigatória");
    }
    
    // Validar função
    if (!newUserRole || !['admin', 'staff'].includes(newUserRole)) {
      errors.push("Função deve ser Administrador ou Colaborador");
    }
    
    // Se há erros, mostrar todos
    if (errors.length > 0) {
      toast({
        title: "❌ Erro de validação",
        description: (
          <div className="space-y-1">
            {errors.map((error, index) => (
              <p key={index}>• {error}</p>
            ))}
          </div>
        ),
        variant: "destructive",
        duration: 8000
      });
      return;
    }

    // Encontrar o hotel selecionado
    const selectedHotel = hotels.find(h => h.id === newUserHotelId);
    if (!selectedHotel) {
      toast({
        title: "❌ Erro",
        description: "Hotel selecionado não encontrado. Tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }

    // Tentar registrar o usuário
    try {
      setIsLoading(true);
      
      let result;
      try {
        // Tentar usar a nova função que mantém o admin logado
        result = await createUserKeepingAdminLoggedIn(
          newUserEmail.trim(),
          newUserPassword,
          newUserHotelId,
          selectedHotel.name,
          newUserName.trim(),
          newUserRole
        );
      } catch (secondaryError: any) {
        console.warn("Método secundário falhou, usando método original:", secondaryError.message);
        
        // Fallback: usar método original que desloga o admin
        result = await createUserAsAdmin(
          newUserEmail.trim(),
          newUserPassword,
          newUserHotelId,
          selectedHotel.name,
          newUserName.trim(),
          newUserRole
        );
        
        // Aviso sobre redirecionamento
        toast({
          title: "⚠️ Usuário criado com método alternativo",
          description: "O usuário foi criado, mas você será redirecionado para login devido a limitações técnicas.",
          duration: 8000,
        });
        
        // Definir flag para indicar que usou método original
        setUsedFallbackMethod(true);
      }
      
      // Armazenar credenciais para exibição
      setCreatedUserCredentials({
        name: result.userData.name || 'Não informado',
        email: result.userData.email,
        password: result.credentials.password,
        hotel: result.userData.hotelName,
        role: result.userData.role === 'admin' ? 'Administrador' : 'Colaborador'
      });
      
      // Registrar a criação nos logs
      if (userData) {
        console.log("Usuário criado com sucesso, logs não implementados");
      }
      
      // Limpar formulário e fechar dialog principal
      clearCreateUserForm();
      setOpenDialog(false);
      
      // Mostrar dialog com credenciais
      setShowCredentials(true);
      
      // Mostrar toast de sucesso (adaptado ao método usado)
      if (usedFallbackMethod) {
        toast({
          title: "✅ Usuário criado!",
          description: "Usuário criado com sucesso. Você será redirecionado para login.",
          duration: 5000,
        });
      } else {
        toast({
          title: "✅ Usuário criado com sucesso!",
          description: "O admin permaneceu logado! As credenciais estão sendo exibidas para você copiar.",
          duration: 5000,
        });
      }
      
      // Recarregar lista de usuários
      const usersData = await getAllUsersWithEmailStatus();
      setUsers(usersData);
      
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      console.error("Tipo do erro:", typeof error);
      console.error("Error.message:", error.message);
      console.error("Error.code:", error.code);
      
      // Garantir que o erro apareça na tela
      let errorMessage = "Falha ao criar usuário.";
      let errorTitle = "❌ Erro ao criar usuário";
      
      if (error && error.message) {
        errorMessage = error.message;
        
        // Tratamento específico de erros comuns
        if (error.message.includes("já está em uso") || error.message.includes("email-already-in-use")) {
          errorTitle = "❌ Email já cadastrado";
          errorMessage = "Este email já está sendo usado por outro usuário. Por favor, use um email diferente.";
        } else if (error.message.includes("invalid-email")) {
          errorTitle = "❌ Email inválido";
          errorMessage = "O formato do email não é válido. Verifique e tente novamente.";
        } else if (error.message.includes("weak-password")) {
          errorTitle = "❌ Senha muito fraca";
          errorMessage = "A senha deve ter pelo menos 6 caracteres. Use uma senha mais forte.";
        } else if (error.message.includes("network")) {
          errorTitle = "❌ Erro de conexão";
          errorMessage = "Verifique sua conexão com a internet e tente novamente.";
        }
      }
      
      // Armazenar erro no state para debug
      setLastError(`${errorTitle}: ${errorMessage}`);
      
      // Estratégia 1: Toast normal
      try {
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
          duration: 15000
        });
        console.log("✅ Toast de erro enviado com sucesso");
      } catch (toastError) {
        console.error("❌ Erro ao mostrar toast:", toastError);
      }
      
      // Estratégia 2: Console bem visível
      console.error("🚨🚨🚨 ERRO PARA O USUÁRIO 🚨🚨🚨");
      console.error(`Título: ${errorTitle}`);
      console.error(`Mensagem: ${errorMessage}`);
      console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
      
      // Log adicional para debug
      console.log("Toast chamado com:", { title: errorTitle, description: errorMessage });
      
      // Se o erro for relacionado à autenticação, redirecionar para login
      if (errorMessage.includes("Admin deve estar logado") || 
          errorMessage.includes("Apenas administradores")) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'staff': return 'Colaborador';
      default: return role;
    }
  };

  const handleSyncUsers = async () => {
    try {
      setIsLoading(true);
      const result = await syncUsersWithAuth();
      
      toast({
        title: "Sincronização concluída",
        description: `${result.removedCount} usuários órfãos foram removidos do sistema.`,
      });
      
      // Recarregar a lista de usuários
      const usersData = await getAllUsersWithEmailStatus();
      setUsers(usersData);
    } catch (error: any) {
      console.error("Erro ao sincronizar usuários:", error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Falha ao sincronizar usuários.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDeleteData) return;
    
    // Verificar se o nome foi digitado corretamente
    const expectedName = userToDeleteData.name || userToDeleteData.email;
    if (deleteConfirmationName.trim().toLowerCase() !== expectedName.toLowerCase()) {
      toast({
        title: "Nome incorreto",
        description: "Digite exatamente o nome do usuário para confirmar a exclusão.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await deleteUser(userToDeleteData.uid);
      
      // Registrar a exclusão nos logs
      if (userData && userToDeleteData) {
        console.log("Usuário excluído, logs não implementados");
      }
      
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema com sucesso."
      });
      
      // Recarregar a lista de usuários
      const usersData = await getAllUsersWithEmailStatus();
      setUsers(usersData);
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Falha ao excluir usuário.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setUserToDeleteData(null);
      setDeleteConfirmationName("");
    }
  };

  // Função para limpar o formulário de criação de usuário
  const clearCreateUserForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserConfirmPassword("");
    setNewUserHotelId("");
    setNewUserRole('staff');
  };

  // Função para verificar se o formulário está válido
  const isCreateFormValid = () => {
    return (
      newUserName.trim().length >= 2 &&
      newUserEmail.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail.trim()) &&
      newUserPassword.length >= 6 &&
      newUserPassword === newUserConfirmPassword &&
      newUserHotelId.length > 0 &&
      ['admin', 'staff'].includes(newUserRole)
    );
  };

  // Função para admin forçar verificação de email (liberar acesso)
  const handleForceEmailVerification = async () => {
    if (!userToForceVerify) return;

    setLoadingVerification(true);
    try {
      await adminForceEmailVerification(userToForceVerify.uid);
      
      toast({
        title: "Acesso liberado com sucesso!",
        description: `O usuário ${userToForceVerify.name || userToForceVerify.email} pode agora acessar o sistema sem verificar o email.`,
        variant: "default"
      });

      // Recarregar lista de usuários
      const usersData = await getAllUsersWithEmailStatus();
      setUsers(usersData);
      
    } catch (error: any) {
      console.error("Erro ao forçar verificação:", error);
      toast({
        title: "Erro ao liberar acesso",
        description: error.message || "Não foi possível liberar o acesso do usuário.",
        variant: "destructive"
      });
    } finally {
      setLoadingVerification(false);
      setForceVerifyDialogOpen(false);
      setUserToForceVerify(null);
    }
  };

  // Função para verificar status de acesso do usuário
  const getUserAccessStatus = (user: User) => {
    // Admins sempre podem acessar
    if (user.role === 'admin') {
      return { canAccess: true, reason: 'Admin', icon: Shield };
    }
    
    // Se email foi verificado no Firebase Auth
    if (user.emailVerified) {
      return { 
        canAccess: true, 
        reason: 'Email verificado', 
        icon: CheckCircle 
      };
    }
    
    // Se admin forçou verificação
    if (user.emailVerifiedByAdmin) {
      return { 
        canAccess: true, 
        reason: 'Liberado pelo admin', 
        icon: CheckCircle,
        verifiedBy: user.emailVerifiedByAdmin.verifiedByEmail,
        verifiedAt: user.emailVerifiedByAdmin.verifiedAt
      };
    }
    
    // Se não tem verificação (Firebase ou admin)
    return { canAccess: false, reason: 'Email não verificado', icon: XCircle };
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        <div className="flex gap-2">
          <Button onClick={handleSyncUsers} disabled={isLoading} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar Usuários
          </Button>
          
          <Button asChild variant="outline">
            <Link href="/admin/perfis">
              <UserCheck className="h-4 w-4 mr-2" />
              Ver Perfis
            </Link>
          </Button>
          
          {/* Botão de teste para verificar se toasts funcionam */}
          <Button 
            onClick={() => {
              toast({
                title: "🧪 Teste de Toast",
                description: "Se você está vendo isso, os toasts estão funcionando!",
                variant: "destructive",
                duration: 5000
              });
            }} 
            variant="outline"
            size="sm"
          >
            Testar Toast
          </Button>
          
          <Dialog open={openDialog} onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) {
              clearCreateUserForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>Adicionar Usuário</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo usuário no sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-1">
                <form onSubmit={handleCreateUser} className="space-y-4 py-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nome completo do usuário"
                      required
                      minLength={2}
                      maxLength={100}
                      className={!newUserName.trim() && newUserName !== "" ? "border-red-300" : ""}
                    />
                    {!newUserName.trim() && newUserName !== "" && (
                      <p className="text-sm text-red-600">Nome é obrigatório</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value.toLowerCase().trim())}
                      placeholder="usuario@hotel.com"
                      required
                      maxLength={100}
                      className={newUserEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) ? "border-red-300" : ""}
                    />
                    {newUserEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail) && (
                      <p className="text-sm text-red-600">Email deve ter um formato válido</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Senha <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      maxLength={50}
                      className={newUserPassword && newUserPassword.length < 6 ? "border-red-300" : ""}
                    />
                    {newUserPassword && newUserPassword.length < 6 && (
                      <p className="text-sm text-red-600">Senha deve ter pelo menos 6 caracteres</p>
                    )}
                    {newUserPassword && newUserPassword.length >= 6 && (
                      <p className="text-sm text-green-600">✓ Senha válida</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Senha <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={newUserConfirmPassword}
                      onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente"
                      required
                      minLength={6}
                      maxLength={50}
                      className={newUserConfirmPassword && newUserPassword !== newUserConfirmPassword ? "border-red-300" : ""}
                    />
                    {newUserConfirmPassword && newUserPassword !== newUserConfirmPassword && (
                      <p className="text-sm text-red-600">Senhas não coincidem</p>
                    )}
                    {newUserConfirmPassword && newUserPassword === newUserConfirmPassword && newUserPassword.length >= 6 && (
                      <p className="text-sm text-green-600">✓ Senhas coincidem</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hotel">
                      Hotel <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newUserHotelId}
                      onValueChange={setNewUserHotelId}
                      required
                    >
                      <SelectTrigger className={!newUserHotelId ? "border-red-300" : ""}>
                        <SelectValue placeholder="Selecione um hotel" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!newUserHotelId && (
                      <p className="text-sm text-red-600">Seleção de hotel é obrigatória</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      Função <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={newUserRole} 
                      onValueChange={(value: 'admin' | 'staff') => setNewUserRole(value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Colaborador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-md">
                    <p className="font-medium mb-1">Informações importantes:</p>
                    <ul className="space-y-1">
                      <li>• Todos os campos com * são obrigatórios</li>
                      <li>• O email deve ser único no sistema</li>
                      <li>• A senha deve ter pelo menos 6 caracteres</li>
                    </ul>
                  </div>
                </form>
              </div>
              
              <DialogFooter className="flex-shrink-0 flex gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setOpenDialog(false);
                    clearCreateUserForm();
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleCreateUser}
                  disabled={isLoading || !isCreateFormValid()}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Usuário"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card className="p-4">
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>ℹ️ Funcionalidades disponíveis:</strong> <br/>
            • <strong>Excluir Usuário:</strong> Remove usuário permanentemente do sistema<br/>
            • <strong>Sincronizar Usuários:</strong> Limpa dados inconsistentes do sistema<br/>
            • <strong>Criar Usuário:</strong> Admin permanece logado durante o processo<br/>
            • <strong>Alterar Função:</strong> Promove/rebaixa usuários entre Administrador e Colaborador<br/>
            • <strong>Liberar Acesso:</strong> Permite acesso sem verificação de email (colaboradores)<br/>
            <em>Para alterar senhas: usuários devem acessar suas próprias configurações de perfil</em>
          </p>
        </div>
        
        <Table>
          <TableCaption>Lista de usuários cadastrados no sistema</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status de Acesso</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => {
                const accessStatus = getUserAccessStatus(user);
                const StatusIcon = accessStatus.icon;
                
                return (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.hotelName}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <span className={user.role === 'admin' ? "font-bold text-primary" : ""}>
                        {getRoleName(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${
                          accessStatus.canAccess 
                            ? user.role === 'admin' 
                              ? 'text-blue-600' 
                              : 'text-green-600' 
                            : 'text-red-600'
                        }`} />
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${
                            accessStatus.canAccess ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                          }`}>
                            {accessStatus.reason}
                          </span>
                          {accessStatus.verifiedBy && (
                            <span className="text-xs text-muted-foreground">
                              Por: {accessStatus.verifiedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleChangeRole(user.uid, 'admin')}
                            disabled={user.role === 'admin'}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Tornar Administrador
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleChangeRole(user.uid, 'staff')}
                            disabled={user.role === 'staff'}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Tornar Colaborador
                          </DropdownMenuItem>
                          
                          {/* Separador e opções de email apenas para colaboradores */}
                          {user.role === 'staff' && (
                            <>
                              <DropdownMenuSeparator />
                              {!accessStatus.canAccess && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setUserToForceVerify(user);
                                    setForceVerifyDialogOpen(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Liberar Acesso
                                </DropdownMenuItem>
                              )}
                              {accessStatus.canAccess && user.emailVerifiedByAdmin && (
                                <DropdownMenuItem 
                                  disabled
                                  className="text-green-600 opacity-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Acesso já liberado
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setUserToDeleteData(user);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={user.uid === userData?.uid}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente o usuário do sistema. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Usuário a ser excluído:</Label>
              <p className="text-sm font-medium bg-muted p-2 rounded">
                {userToDeleteData?.name || userToDeleteData?.email}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmName">
                Digite o nome do usuário para confirmar:
              </Label>
              <Input
                id="confirmName"
                value={deleteConfirmationName}
                onChange={(e) => setDeleteConfirmationName(e.target.value)}
                placeholder={userToDeleteData?.name || userToDeleteData?.email || "Nome do usuário"}
              />
              <p className="text-xs text-muted-foreground">
                Digite exatamente: <strong>{userToDeleteData?.name || userToDeleteData?.email}</strong>
              </p>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUserToDeleteData(null);
              setDeleteConfirmationName("");
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isLoading || deleteConfirmationName.trim().toLowerCase() !== (userToDeleteData?.name || userToDeleteData?.email || "").toLowerCase()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para confirmar liberação de acesso */}
      <AlertDialog open={forceVerifyDialogOpen} onOpenChange={setForceVerifyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Liberar Acesso do Usuário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação permitirá que o usuário acesse o sistema sem verificar o email. 
              O acesso será liberado imediatamente e ficará registrado como "liberado pelo admin".
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Usuário que terá o acesso liberado:</Label>
              <div className="bg-muted p-3 rounded-lg border">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    <User className="h-4 w-4 inline mr-1" />
                    {userToForceVerify?.name || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 inline mr-1" />
                    {userToForceVerify?.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <Building className="h-4 w-4 inline mr-1" />
                    {userToForceVerify?.hotelName}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>O que acontecerá:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    <li>O usuário poderá fazer login imediatamente</li>
                    <li>Não será necessário verificar o email</li>
                    <li>O sistema registrará que foi liberado por você</li>
                    <li>O status mudará para "Liberado pelo admin"</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Use esta opção quando:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    <li>O usuário não recebeu o email de verificação</li>
                    <li>O email está indo para spam</li>
                    <li>É necessário acesso urgente ao sistema</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUserToForceVerify(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForceEmailVerification}
              disabled={loadingVerification}
              className="bg-green-600 hover:bg-green-700"
            >
              {loadingVerification && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Liberar Acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para exibir credenciais do usuário criado */}
      <Dialog open={showCredentials} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
              🎉 Usuário Criado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Copie as credenciais abaixo e envie para o colaborador.
            </DialogDescription>
          </DialogHeader>
          
          {createdUserCredentials && (
            <div className="flex-1 overflow-y-auto px-1">
              <div className="space-y-6 py-4">
                
                {/* Header de Informações de Login */}
                <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center">
                      <Key className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary dark:text-primary-foreground">
                        Credenciais de Acesso
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Informações necessárias para o primeiro login
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-background/50 dark:bg-background/30 rounded-md p-3 border">
                    <div className="space-y-2 text-sm font-mono text-foreground">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <strong>Portal:</strong> <span className="break-all">{window.location.origin}/login</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <strong>Email:</strong> <span className="break-all">{createdUserCredentials.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <strong>Senha:</strong> <span>{createdUserCredentials.password}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações Detalhadas do Usuário */}
                <div className="bg-muted/50 dark:bg-muted/20 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">Detalhes do Usuário</h3>
                  </div>
                  
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-md border">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium text-muted-foreground">Nome:</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground">{createdUserCredentials.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(createdUserCredentials.name);
                            toast({ title: "Nome copiado!", duration: 2000 });
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-md border">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium text-muted-foreground">Email (Login):</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground break-all">{createdUserCredentials.email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(createdUserCredentials.email);
                            toast({ title: "Email copiado!", duration: 2000 });
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-md border">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium text-muted-foreground">Senha:</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground bg-muted/50 px-2 py-1 rounded">
                          {createdUserCredentials.password}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(createdUserCredentials.password);
                            toast({ title: "Senha copiada!", duration: 2000 });
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-md border">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium text-muted-foreground">Hotel:</Label>
                      </div>
                      <span className="text-sm text-foreground">{createdUserCredentials.hotel}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-md border">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium text-muted-foreground">Função:</Label>
                      </div>
                      <span className="text-sm text-foreground font-medium">{createdUserCredentials.role}</span>
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                      Copiar para Envio
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-blue-950/50 border border-blue-200 dark:border-blue-700 rounded-md p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Mensagem completa para WhatsApp/Email:
                      </p>
                      <div className="bg-blue-50 dark:bg-blue-900/30 border rounded text-sm font-mono p-3 text-blue-900 dark:text-blue-100 overflow-auto">
                        <div className="space-y-1">
                          <div><strong>🔐 Acesso ao Sistema ExpiWish</strong></div>
                          <div className="h-2"></div>
                          <div><strong>🌐 Link:</strong> {window.location.origin}/login</div>
                          <div><strong>👤 Email:</strong> {createdUserCredentials.email}</div>
                          <div><strong>🔐 Senha:</strong> {createdUserCredentials.password}</div>
                          <div><strong>🏨 Hotel:</strong> {createdUserCredentials.hotel}</div>
                          <div><strong>⚡ Função:</strong> {createdUserCredentials.role}</div>
                          <div className="h-2"></div>
                          <div><strong>ℹ️</strong> Use essas credenciais para acessar o sistema pela primeira vez.</div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const credentials = `🔐 Acesso ao Sistema ExpiWish

🌐 Link: ${window.location.origin}/login
👤 Email: ${createdUserCredentials.email}
🔐 Senha: ${createdUserCredentials.password}
🏨 Hotel: ${createdUserCredentials.hotel}
⚡ Função: ${createdUserCredentials.role}

ℹ️ Use essas credenciais para acessar o sistema pela primeira vez.`;
                        navigator.clipboard.writeText(credentials);
                        toast({ title: "📋 Mensagem completa copiada!", duration: 3000 });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Mensagem Completa
                    </Button>
                  </div>
                </div>

                {/* Status da Operação */}
                <div className={`border rounded-lg p-4 ${usedFallbackMethod 
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' 
                  : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}>
                  <p className={`text-sm ${usedFallbackMethod 
                    ? 'text-amber-800 dark:text-amber-300' 
                    : 'text-green-800 dark:text-green-300'
                  }`}>
                    {usedFallbackMethod ? (
                      <>
                        <strong>⚠️ Método Alternativo:</strong> O usuário foi criado com sucesso, mas por limitações técnicas você será redirecionado para fazer login novamente.
                      </>
                    ) : (
                      <>
                        <strong>✅ Sucesso:</strong> O usuário foi criado e você permaneceu logado como administrador. 
                        Você pode continuar gerenciando usuários ou enviar essas credenciais para o colaborador.
                      </>
                    )}
                  </p>
                </div>

                {/* Indicador de fim do conteúdo */}
                <div className="border-t border-dashed border-muted-foreground/30 pt-4 mt-6">
                  <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Todas as informações foram exibidas</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-xs">
                      Certifique-se de ter copiado as credenciais necessárias antes de continuar
                    </p>
                  </div>
                </div>

                {/* Botão de fechar no final do scroll */}
                <div className="mt-6 space-y-3">
                  <div className="text-center text-sm text-muted-foreground">
                    ✅ Após copiar todas as informações necessárias, clique no botão abaixo
                  </div>
                  <Button
                    onClick={() => {
                      setShowCredentials(false);
                      setCreatedUserCredentials(null);
                      setUsedFallbackMethod(false);
                      
                      // Se usou fallback, redirecionar para login
                      if (usedFallbackMethod) {
                        window.location.href = '/login';
                      }
                    }}
                    className="w-full py-3"
                    size="lg"
                  >
                    {usedFallbackMethod ? "Fechar e Ir para Login" : "Fechar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 pt-2">
            <div className="text-center text-xs text-muted-foreground">
              Role para baixo para ver todas as informações
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seção de debug - remover em produção */}
      {lastError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-red-800 font-medium">🐛 Debug - Último Erro:</h3>
              <p className="text-red-700 text-sm mt-1">{lastError}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLastError(null)}
              className="text-red-600 border-red-300"
            >
              Limpar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function UserManagement() {
  return (
    <RequireAdmin>
      <UserManagementContent />
    </RequireAdmin>
  );
} 