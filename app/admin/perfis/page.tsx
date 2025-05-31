"use client";

import React, { useEffect, useState } from 'react';
import { getAllUsers, getUserDetailedInfo } from '@/lib/auth-service';
import { useAuth } from '@/lib/auth-context';
import { RequireAdmin } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  User, 
  Activity, 
  Filter, 
  Eye, 
  RefreshCw, 
  UserCheck,
  Building,
  Mail,
  Shield,
  Timer,
  CalendarDays
} from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from "@/components/ui/use-toast";

interface User {
  uid: string;
  email: string;
  name?: string;
  hotelId: string;
  hotelName: string;
  role: 'admin' | 'staff';
  firstAccess?: any;
  firstAccessTimestamp?: number;
  lastAccess?: any;
  lastAccessTimestamp?: number;
}

interface UserDetail {
  userData: User;
  logs: any[];
  stats: {
    firstAccess: Date | null;
    lastAccess: Date | null;
    daysSinceFirstAccess: number | null;
    daysSinceLastAccess: number | null;
    totalLogins: number;
    totalActions: number;
  };
}

function PerfisPageContent() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Filtros
  const [nameFilter, setNameFilter] = useState("");
  const [hotelFilter, setHotelFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const formatBrazilianDateTime = (date: Date | null) => {
    if (!date) return 'Nunca acessou';
    
    // Não ajustar timezone, usar a data como está
    return format(date, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
  };

  const formatTimeDifference = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffDays > 0) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''} e ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} e ${diffSeconds} segundo${diffSeconds > 1 ? 's' : ''}`;
    } else {
      return `há ${diffSeconds} segundo${diffSeconds > 1 ? 's' : ''}`;
    }
  };

  const getDaysSinceFirstAccess = (user: User) => {
    if (!user.firstAccess) return null;
    
    const firstAccessDate = user.firstAccess.toDate ? user.firstAccess.toDate() : new Date(user.firstAccess);
    const now = new Date();
    const diffMs = now.getTime() - firstAccessDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getDaysSinceLastAccess = (user: User) => {
    if (!user.lastAccess) return null;
    
    const lastAccessDate = user.lastAccess.toDate ? user.lastAccess.toDate() : new Date(user.lastAccess);
    const now = new Date();
    const diffMs = now.getTime() - lastAccessDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getAccessStatus = (user: User) => {
    const daysSinceLastAccess = getDaysSinceLastAccess(user);
    
    if (!user.firstAccess) {
      return { label: 'Nunca acessou', color: 'bg-gray-100 text-gray-800' };
    } else if (daysSinceLastAccess === null) {
      return { label: 'Dados incompletos', color: 'bg-yellow-100 text-yellow-800' };
    } else if (daysSinceLastAccess === 0) {
      return { label: 'Online hoje', color: 'bg-green-100 text-green-800' };
    } else if (daysSinceLastAccess <= 7) {
      return { label: 'Ativo esta semana', color: 'bg-blue-100 text-blue-800' };
    } else if (daysSinceLastAccess <= 30) {
      return { label: 'Ativo este mês', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'Inativo há muito tempo', color: 'bg-red-100 text-red-800' };
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDetail = async (userId: string) => {
    try {
      setDetailLoading(true);
      console.log("🔄 Carregando detalhes do usuário:", userId);
      const userDetail = await getUserDetailedInfo(userId);
      console.log("✅ Detalhes carregados:", userDetail);
      setSelectedUser(userDetail);
      setUserDetailDialogOpen(true);
    } catch (error: any) {
      console.error("Erro ao carregar detalhes do usuário:", error);
      // Adicionar toast de erro
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message || "Não foi possível carregar os detalhes do usuário",
        variant: "destructive"
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesName = !nameFilter || 
      (user.name && user.name.toLowerCase().includes(nameFilter.toLowerCase())) ||
      user.email.toLowerCase().includes(nameFilter.toLowerCase());
    
    const matchesHotel = !hotelFilter || user.hotelId === hotelFilter;
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesName && matchesHotel && matchesRole;
  });

  const clearFilters = () => {
    setNameFilter("");
    setHotelFilter("");
    setRoleFilter("");
  };

  const getUniqueHotels = () => {
    const hotelsSet = new Set(users.map(user => user.hotelId));
    return Array.from(hotelsSet).map(hotelId => {
      const user = users.find(u => u.hotelId === hotelId);
      return {
        id: hotelId,
        name: user?.hotelName || hotelId
      };
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Perfis de Usuários</h1>
          <p className="text-muted-foreground">
            Visualize informações detalhadas de acesso dos usuários
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadUsers} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Nome ou Email</Label>
            <Input
              placeholder="Buscar por nome ou email..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Hotel</Label>
            <Select value={hotelFilter} onValueChange={setHotelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um hotel" />
              </SelectTrigger>
              <SelectContent>
                {getUniqueHotels().map((hotel) => (
                  <SelectItem key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="staff">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Exibindo {filteredUsers.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>

      {/* Tabela de Usuários */}
      <Card className="p-4">
        <Table>
          <TableCaption>
            Perfis de usuários com informações de acesso - Horário de Brasília
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Primeiro Acesso</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const accessStatus = getAccessStatus(user);
                const daysSinceFirst = getDaysSinceFirstAccess(user);
                const firstAccessDate = user.firstAccess?.toDate ? user.firstAccess.toDate() : null;
                const lastAccessDate = user.lastAccess?.toDate ? user.lastAccess.toDate() : null;
                
                return (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{user.name || 'Sem nome'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.hotelName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {firstAccessDate ? formatBrazilianDateTime(firstAccessDate) : 'Nunca acessou'}
                        </div>
                        {daysSinceFirst !== null && (
                          <div className="text-xs text-muted-foreground">
                            há {daysSinceFirst} dia{daysSinceFirst !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {lastAccessDate ? formatBrazilianDateTime(lastAccessDate) : 'Nunca acessou'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeDifference(lastAccessDate)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={accessStatus.color} variant="secondary">
                        <Activity className="h-3 w-3 mr-1" />
                        {accessStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadUserDetail(user.uid)}
                        disabled={detailLoading}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum usuário encontrado com os filtros aplicados
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Detalhes do Usuário */}
      <Dialog open={userDetailDialogOpen} onOpenChange={setUserDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Usuário
            </DialogTitle>
            <DialogDescription>
              Informações completas de acesso e atividade do usuário
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                    <p className="text-sm">{selectedUser.userData.name || 'Não informado'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm">{selectedUser.userData.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Hotel</Label>
                    <p className="text-sm">{selectedUser.userData.hotelName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Função</Label>
                    <Badge variant={selectedUser.userData.role === 'admin' ? 'default' : 'secondary'}>
                      {selectedUser.userData.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Estatísticas de Acesso */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Estatísticas de Acesso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Primeiro Acesso
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-mono">
                        {selectedUser.stats.firstAccess 
                          ? formatBrazilianDateTime(selectedUser.stats.firstAccess)
                          : 'Nunca acessou'
                        }
                      </p>
                      {selectedUser.stats.daysSinceFirstAccess !== null && (
                        <p className="text-xs text-muted-foreground">
                          há {selectedUser.stats.daysSinceFirstAccess} dia{selectedUser.stats.daysSinceFirstAccess !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        Último Acesso
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-mono">
                        {selectedUser.stats.lastAccess 
                          ? formatBrazilianDateTime(selectedUser.stats.lastAccess)
                          : 'Nunca acessou'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeDifference(selectedUser.stats.lastAccess)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        Total de Logins
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedUser.stats.totalLogins}
                    </p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        Total de Ações
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedUser.stats.totalActions}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Log de Atividades Recentes */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Atividades Recentes ({selectedUser.logs.length} registros)
                </h3>
                {selectedUser.logs.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUser.logs.slice(0, 10).map((log, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium">
                              {log.action === 'login' ? 'Login realizado' :
                               log.action === 'first_login' ? 'Primeiro login' :
                               log.action === 'logout' ? 'Logout realizado' :
                               log.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBrazilianDateTime(log.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatTimeDifference(log.timestamp)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhuma atividade registrada</p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PerfisPage() {
  return (
    <RequireAdmin>
      <PerfisPageContent />
    </RequireAdmin>
  );
} 