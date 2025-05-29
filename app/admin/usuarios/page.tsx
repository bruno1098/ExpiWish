"use client";

import React, { useEffect, useState } from 'react';
import { getAllUsers, registerUserSafe as registerUser, updateUserRole } from '@/lib/auth-service';
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
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2 } from "lucide-react";

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

// Função para buscar todos os hotéis
const getAllHotels = async (): Promise<Hotel[]> => {
  try {
    const hotelsRef = collection(db, "hotels");
    const querySnapshot = await getDocs(hotelsRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || doc.id
    }));
  } catch (error) {
    console.error("Erro ao listar hotéis:", error);
    return [];
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
}

function UserManagementContent() {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
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
        const usersData = await getAllUsers();
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (newUserPassword !== newUserConfirmPassword) {
      toast({
        title: "Erro de validação",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (!newUserHotelId) {
      toast({
        title: "Erro de validação",
        description: "Selecione um hotel.",
        variant: "destructive"
      });
      return;
    }

    // Encontrar o nome do hotel pelo ID
    const selectedHotel = hotels.find(h => h.id === newUserHotelId);
    if (!selectedHotel) {
      toast({
        title: "Erro",
        description: "Hotel selecionado não encontrado",
        variant: "destructive"
      });
      return;
    }

    // Registrar o usuário
    try {
      setIsLoading(true);
      
      // Usar o email original fornecido pelo usuário 
      const result = await registerUser(
        newUserEmail,  
        newUserPassword, 
        newUserHotelId, 
        selectedHotel.name,
        newUserName,
        newUserRole
      );
      
      // Mostrar mensagem de sucesso com informações de acesso
      toast({
        title: "✅ Usuário criado com sucesso!",
        description: (
          <div className="space-y-2">
            <p><strong>Nome:</strong> {newUserName || 'Não informado'}</p>
            <p><strong>Email:</strong> {newUserEmail}</p>
            <p><strong>Senha:</strong> {newUserPassword}</p>
            <p><strong>Hotel:</strong> {selectedHotel.name}</p>
            <p><strong>Função:</strong> {newUserRole === 'admin' ? 'Administrador' : 'Colaborador'}</p>
          </div>
        ),
        duration: 10000, // 10 segundos para dar tempo de ler
      });
      
      // Fechar o diálogo 
      setOpenDialog(false);
      
      // Limpar o formulário
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserConfirmPassword("");
      setNewUserHotelId("");
      setNewUserRole('staff');
      
      // Recarregar a lista de usuários
      const usersData = await getAllUsers();
      setUsers(usersData);
      
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      
      // Tratamento específico para email já em uso
      if (error.message && error.message.includes("auth/email-already-in-use")) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já está em uso por outro usuário. Por favor, use um email diferente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao criar usuário",
          description: error.message || "Falha ao criar usuário.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'staff') => {
    try {
      setIsLoading(true);
      await updateUserRole(userId, newRole);
      
      toast({
        title: "Função atualizada",
        description: "A função do usuário foi atualizada com sucesso."
      });
      
      // Recarregar a lista de usuários
      const usersData = await getAllUsers();
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

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'staff': return 'Colaborador';
      default: return role;
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold">Gerenciamento de Usuários</h2>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário no sistema.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@hotel.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={newUserConfirmPassword}
                  onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hotel">Hotel</Label>
                <Select
                  value={newUserHotelId}
                  onValueChange={setNewUserHotelId}
                >
                  <SelectTrigger>
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select value={newUserRole} onValueChange={(value: 'admin' | 'staff') => setNewUserRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="staff">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  onClick={() => {
                    // Validações
                    if (newUserPassword !== newUserConfirmPassword) {
                      toast({
                        title: "Erro de validação",
                        description: "As senhas não coincidem.",
                        variant: "destructive"
                      });
                      return;
                    }

                    if (newUserPassword.length < 6) {
                      toast({
                        title: "Erro de validação",
                        description: "A senha deve ter pelo menos 6 caracteres.",
                        variant: "destructive"
                      });
                      return;
                    }

                    if (!newUserHotelId) {
                      toast({
                        title: "Erro de validação",
                        description: "Selecione um hotel.",
                        variant: "destructive"
                      });
                      return;
                    }

                    // Encontrar o nome do hotel pelo ID
                    const selectedHotel = hotels.find(h => h.id === newUserHotelId);
                    if (!selectedHotel) {
                      toast({
                        title: "Erro",
                        description: "Hotel selecionado não encontrado",
                        variant: "destructive"
                      });
                      return;
                    }

                    // Registrar o usuário
                    (async () => {
                      try {
                        // Usar o email original fornecido pelo usuário 
                        await registerUser(
                          newUserEmail,  
                          newUserPassword, 
                          newUserHotelId, 
                          selectedHotel.name,
                          newUserName,
                          newUserRole
                        );
                        
                        toast({
                          title: "✅ Usuário criado com sucesso!",
                          description: (
                            <div className="space-y-2">
                              <p><strong>Nome:</strong> {newUserName || 'Não informado'}</p>
                              <p><strong>Email:</strong> {newUserEmail}</p>
                              <p><strong>Senha:</strong> {newUserPassword}</p>
                              <p><strong>Hotel:</strong> {selectedHotel.name}</p>
                              <p><strong>Função:</strong> {newUserRole === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                            </div>
                          ),
                          duration: 10000, // 10 segundos para dar tempo de ler
                        });
                        
                        // Fechar o diálogo 
                        setOpenDialog(false);
                        
                        // Limpar o formulário
                        setNewUserName("");
                        setNewUserEmail("");
                        setNewUserPassword("");
                        setNewUserConfirmPassword("");
                        setNewUserHotelId("");
                        setNewUserRole('staff');
                        
                        // Recarregar a lista de usuários
                        const usersData = await getAllUsers();
                        setUsers(usersData);
                      } catch (error: any) {
                        console.error("Erro ao criar usuário:", error);
                        
                        // Tratamento específico para email já em uso
                        if (error.message && error.message.includes("auth/email-already-in-use")) {
                          toast({
                            title: "Email já cadastrado",
                            description: "Este email já está em uso por outro usuário. Por favor, use um email diferente.",
                            variant: "destructive"
                          });
                        } else {
                          toast({
                            title: "Erro ao criar usuário",
                            description: error.message || "Falha ao criar usuário.",
                            variant: "destructive"
                          });
                        }
                      }
                    })();
                  }}
                >
                  Criar Usuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="p-4">
        <Table>
          <TableCaption>Lista de usuários cadastrados no sistema</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Função</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.name || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.hotelName}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <span className={user.role === 'admin' ? "font-bold text-primary" : ""}>
                      {getRoleName(user.role)}
                    </span>
                    
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
                          Tornar Administrador
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleChangeRole(user.uid, 'staff')}
                          disabled={user.role === 'staff'}
                        >
                          Tornar Colaborador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
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