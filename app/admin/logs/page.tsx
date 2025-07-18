"use client";

import React, { useEffect, useState } from 'react';
import {  getAllUsers, getAllHotels } from '@/lib/auth-service';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Activity, Filter, Download, RefreshCw } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogEntry {
  id: string;
  userId: string;
  action: string;
  details: any;
  timestamp: Date;
  createdAt: Date;
}

interface User {
  uid: string;
  email: string;
  name?: string;
  hotelId: string;
  hotelName: string;
  role: 'admin' | 'staff';
}

interface Hotel {
  id: string;
  name: string;
}

const actionTranslations: { [key: string]: string } = {
  'login': 'Login',
  'first_login': 'Primeiro Login',
  'logout': 'Logout',
  'password_reset': 'Redefinição de Senha',
  'user_created': 'Usuário Criado',
  'user_deleted': 'Usuário Excluído',
  'role_changed': 'Função Alterada',
  'password_changed': 'Senha Alterada',
  'profile_updated': 'Perfil Atualizado',
  'import_data': 'Importação de Dados',
  'export_data': 'Exportação de Dados',
  'view_report': 'Visualização de Relatório'
};

const actionColors: { [key: string]: string } = {
  'login': 'bg-green-100 text-green-800',
  'first_login': 'bg-blue-100 text-blue-800',
  'logout': 'bg-gray-100 text-gray-800',
  'password_reset': 'bg-yellow-100 text-yellow-800',
  'user_created': 'bg-emerald-100 text-emerald-800',
  'user_deleted': 'bg-red-100 text-red-800',
  'role_changed': 'bg-purple-100 text-purple-800',
  'password_changed': 'bg-orange-100 text-orange-800',
  'profile_updated': 'bg-cyan-100 text-cyan-800',
  'import_data': 'bg-indigo-100 text-indigo-800',
  'export_data': 'bg-pink-100 text-pink-800',
  'view_report': 'bg-lime-100 text-lime-800'
};

function LogsPageContent() {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  
  // Filtros
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit, setLimit] = useState<number>(100);

  const formatTimestamp = (timestamp: Date) => {
    return format(timestamp, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
  };

  const formatTimeDifference = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'agora mesmo';
    }
  };

  const getUserNameByUid = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user?.name || user?.email || 'Usuário não encontrado';
  };

  const getHotelNameById = (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    return hotel?.name || hotelId;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar usuários
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      // Carregar hotéis - usando a função específica para logs
      try {
        const hotelsData = await getAllHotels();
        // Garantir que os hotéis tenham a estrutura correta
        const formattedHotels = hotelsData.map((hotel: any) => ({
          id: hotel.id,
          name: hotel.name || hotel.id
        }));
        setHotels(formattedHotels);
      } catch (hotelError) {
        console.warn("Erro ao carregar hotéis, usando lista padrão:", hotelError);
        // Fallback para lista predefinida
        const predefinedHotels = [
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
        setHotels(predefinedHotels);
      }
      
      // Carregar logs com filtros
      const filters: any = { limit };
      
      if (selectedHotel) filters.hotelId = selectedHotel;
      if (selectedUser) filters.userId = selectedUser;
      if (selectedAction) filters.action = selectedAction;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate + 'T23:59:59');

    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedHotel("");
    setSelectedUser("");
    setSelectedAction("");
    setStartDate("");
    setEndDate("");
    setLimit(100);
  };

  const exportLogs = () => {
    const csvHeaders = ['Data/Hora', 'Usuário', 'Hotel', 'Ação', 'Detalhes'];
    const csvData = logs.map(log => [
      formatTimestamp(log.timestamp),
      getUserNameByUid(log.userId),
      getHotelNameById(log.details?.hotelId || ''),
      actionTranslations[log.action] || log.action,
      JSON.stringify(log.details)
    ]);
    
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs_auditoria_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [selectedHotel, selectedUser, selectedAction, startDate, endDate, limit]);

  if (isLoading && logs.length === 0) {
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
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">Acompanhe todas as ações dos usuários no sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportLogs} disabled={logs.length === 0} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={loadData} disabled={isLoading} variant="outline">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Hotel</Label>
            <Select value={selectedHotel} onValueChange={setSelectedHotel}>
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
            <Label>Usuário</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(user => !selectedHotel || user.hotelId === selectedHotel)
                  .map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ação</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma ação" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(actionTranslations).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Limite</Label>
            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 registros</SelectItem>
                <SelectItem value="100">100 registros</SelectItem>
                <SelectItem value="250">250 registros</SelectItem>
                <SelectItem value="500">500 registros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Exibindo {logs.length} registro{logs.length !== 1 ? 's' : ''}
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Tabela de Logs */}
      <Card className="p-4">
        <Table>
          <TableCaption>
            Logs de auditoria do sistema - Horário de Brasília
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Há quanto tempo</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatTimeDifference(log.timestamp)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getUserNameByUid(log.userId)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {getHotelNameById(log.details?.hotelId || '')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}
                      variant="secondary"
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      {actionTranslations[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-muted-foreground">
                      {log.details?.targetUser && (
                        <div>Usuário alvo: {log.details.targetUser}</div>
                      )}
                      {log.details?.adminEmail && (
                        <div>Admin: {log.details.adminEmail}</div>
                      )}
                      {log.details?.browser && (
                        <div className="truncate">Navegador: {log.details.browser.substring(0, 50)}...</div>
                      )}
                      {log.details?.method && (
                        <div>Método: {log.details.method}</div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum log encontrado com os filtros aplicados
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function LogsPage() {
  return (
    <RequireAdmin>
      <LogsPageContent />
    </RequireAdmin>
  );
} 