"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { RequireAdmin } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { AlertCircle, Check, Loader2, HotelIcon, Database, RefreshCw, User, Hotel, Plus, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Lista predefinida de hotéis para exibição
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

interface HotelData {
  id: string;
  hotelId: string;
  name: string;
  createdAt?: any;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  stars?: number;
}

function ConfigPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [isHotelsLoading, setIsHotelsLoading] = useState(false);
  
  // Estados para o formulário de novo hotel
  const [newHotel, setNewHotel] = useState({
    name: "",
    hotelId: "",
    address: "",
    city: "",
    state: "",
    country: "",
    stars: 0
  });
  const [isAddingHotel, setIsAddingHotel] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Adicionar estados ao início do componente
  const [testEnvironment, setTestEnvironment] = useState<any>(null);
  const [isLoadingTestEnv, setIsLoadingTestEnv] = useState(false);
  const [isCreatingTestEnv, setIsCreatingTestEnv] = useState(false);
  const [isClearingTestEnv, setIsClearingTestEnv] = useState(false);
  
  // Função para buscar a lista de hotéis
  const fetchHotels = async () => {
    setIsHotelsLoading(true);
    try {
      // Determinar se devemos incluir hotéis de teste
      const includeTest = testEnvironment?.active === true;
      const url = includeTest ? "/api/hotels?includeTestEnvironment=true" : "/api/hotels";
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setHotels(data.hotels);
      } else {
        throw new Error(data.error || "Erro ao buscar hotéis");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível carregar a lista de hotéis",
        variant: "destructive"
      });
    } finally {
      setIsHotelsLoading(false);
    }
  };
  
  // Carregar hotéis quando a página for montada
  useEffect(() => {
    fetchHotels();
    fetchTestEnvironmentStatus(); // Adicionado
  }, []);

  const handleSyncHotels = async () => {
    setIsLoading(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/sync-hotels");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao sincronizar hotéis");
      }

      setSyncResult(data);
      toast({
        title: "Sucesso!",
        description: data.message || `Hotéis sincronizados com sucesso.`,
      });
      
      // Atualizar a lista de hotéis
      fetchHotels();
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro durante a sincronização");
      toast({
        title: "Erro",
        description: err.message || "Ocorreu um erro durante a sincronização",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddHotel = async () => {
    // Validação básica
    if (!newHotel.name || !newHotel.hotelId) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e ID do hotel são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingHotel(true);
    
    try {
      const response = await fetch("/api/hotels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newHotel),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar hotel");
      }
      
      toast({
        title: "Hotel criado com sucesso",
        description: `O hotel ${newHotel.name} foi adicionado ao sistema.`,
      });
      
      // Limpar formulário
      setNewHotel({
        name: "",
        hotelId: "",
        address: "",
        city: "",
        state: "",
        country: "",
        stars: 0
      });
      
      // Fechar dialog
      setDialogOpen(false);
      
      // Atualizar lista de hotéis
      fetchHotels();
    } catch (err: any) {
      toast({
        title: "Erro ao criar hotel",
        description: err.message || "Não foi possível criar o hotel",
        variant: "destructive",
      });
    } finally {
      setIsAddingHotel(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    
    let date: Date;
    
    try {
      // Verificar se é um timestamp do Firestore
      if (dateValue && typeof dateValue === 'object' && dateValue.toDate && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      } 
      // Verificar se é um objeto Date
      else if (dateValue instanceof Date) {
        date = dateValue;
      } 
      // Verificar se é um timestamp numérico
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      // Verificar se é uma string ISO
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } 
      // Se nada funcionar, considere-o inválido
      else {
        return "Data inválida";
      }
      
      // Verificar se a data resultante é válida
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error("Erro ao formatar data:", error, dateValue);
      return "Data inválida";
    }
  };

  // Adicionar esta função para buscar o status do ambiente de teste
  const fetchTestEnvironmentStatus = async () => {
    setIsLoadingTestEnv(true);
    try {
      const response = await fetch("/api/test-environment");
      const data = await response.json();
      
      if (response.ok) {
        setTestEnvironment(data);
      } else {
        throw new Error(data.error || "Erro ao buscar status do ambiente de teste");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Falha ao verificar ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTestEnv(false);
    }
  };

  // Adicionar esta função para criar o ambiente de teste
  const createTestEnvironment = async () => {
    setIsCreatingTestEnv(true);
    try {
      const response = await fetch("/api/test-environment", {
        method: "POST"
      });
      const data = await response.json();
      
      if (response.ok) {
        setTestEnvironment(data);
        toast({
          title: "Sucesso",
          description: "Ambiente de teste criado com sucesso",
        });
        // Atualizar a lista de hotéis
        fetchHotels();
      } else {
        throw new Error(data.error || "Erro ao criar ambiente de teste");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Falha ao criar ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTestEnv(false);
    }
  };

  // Adicionar esta função para limpar o ambiente de teste
  const clearTestEnvironment = async () => {
    setIsClearingTestEnv(true);
    try {
      const response = await fetch("/api/test-environment", {
        method: "DELETE"
      });
      const data = await response.json();
      
      if (response.ok) {
        setTestEnvironment({
          active: false,
          hotels: [],
          analyses: [],
          users: []
        });
        toast({
          title: "Sucesso",
          description: `Ambiente de teste limpo: ${data.results.deletedHotels} hotéis, ${data.results.deletedAnalyses} análises, ${data.results.deletedUsers} usuários removidos`,
        });
        // Atualizar a lista de hotéis
        fetchHotels();
      } else {
        throw new Error(data.error || "Erro ao limpar ambiente de teste");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Falha ao limpar ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsClearingTestEnv(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Configuração do Sistema</h1>
      
      <Tabs defaultValue="hotels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hotels">Hotéis</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
        </TabsList>
        
        {/* Aba de Hotéis */}
        <TabsContent value="hotels" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Gerenciamento de Hotéis</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={fetchHotels}
                disabled={isHotelsLoading}
              >
                {isHotelsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Atualizar</span>
              </Button>
              
              <Button 
                variant="default"
                size="sm"
                onClick={handleSyncHotels}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                <span className="ml-2">Sincronizar Hotéis Predefinidos</span>
              </Button>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Hotel
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Hotel</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do novo hotel. Nome e ID são obrigatórios.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Nome
                      </Label>
                      <Input
                        id="name"
                        value={newHotel.name}
                        onChange={(e) => setNewHotel({...newHotel, name: e.target.value})}
                        className="col-span-3"
                        placeholder="Ex: Hotel Estrela"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="hotelId" className="text-right">
                        ID
                      </Label>
                      <Input
                        id="hotelId"
                        value={newHotel.hotelId}
                        onChange={(e) => setNewHotel({...newHotel, hotelId: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        className="col-span-3"
                        placeholder="Ex: hotel-estrela"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="address" className="text-right">
                        Endereço
                      </Label>
                      <Input
                        id="address"
                        value={newHotel.address}
                        onChange={(e) => setNewHotel({...newHotel, address: e.target.value})}
                        className="col-span-3"
                        placeholder="Endereço do hotel"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="city" className="text-right">
                        Cidade
                      </Label>
                      <Input
                        id="city"
                        value={newHotel.city}
                        onChange={(e) => setNewHotel({...newHotel, city: e.target.value})}
                        className="col-span-3"
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="state" className="text-right">
                        Estado
                      </Label>
                      <Input
                        id="state"
                        value={newHotel.state}
                        onChange={(e) => setNewHotel({...newHotel, state: e.target.value})}
                        className="col-span-3"
                        placeholder="Estado"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="country" className="text-right">
                        País
                      </Label>
                      <Input
                        id="country"
                        value={newHotel.country}
                        onChange={(e) => setNewHotel({...newHotel, country: e.target.value})}
                        className="col-span-3"
                        placeholder="País"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="stars" className="text-right">
                        Estrelas
                      </Label>
                      <Input
                        id="stars"
                        type="number"
                        min="1"
                        max="5"
                        value={newHotel.stars}
                        onChange={(e) => setNewHotel({...newHotel, stars: parseInt(e.target.value) || 0})}
                        className="col-span-3"
                        placeholder="1-5"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleAddHotel} 
                      disabled={isAddingHotel}
                    >
                      {isAddingHotel ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Hotel"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Hotéis Cadastrados</CardTitle>
              <CardDescription>
                Lista de todos os hotéis disponíveis no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHotelsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : hotels.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow key={hotel.id}>
                        <TableCell className="font-medium">{hotel.name}</TableCell>
                        <TableCell>{hotel.hotelId}</TableCell>
                        <TableCell>{[hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ') || 'N/A'}</TableCell>
                        <TableCell>{formatDate(hotel.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum hotel cadastrado
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sincronização de Hotéis</CardTitle>
              <CardDescription>
                Atualiza a lista de hotéis com a configuração padrão do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Esta operação irá verificar e atualizar os hotéis predefinidos no sistema.
                Hotéis existentes serão atualizados, e hotéis faltantes serão criados.
              </p>
              
              <div className="border rounded-md p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Hotéis a sincronizar:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {PREDEFINED_HOTELS.map((hotel) => (
                    <li key={hotel.id}>
                      {hotel.name} <span className="text-muted-foreground text-sm">({hotel.id})</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={handleSyncHotels} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sincronizar Hotéis
                    </>
                  )}
                </Button>
                
                {syncResult && (
                  <div className="flex items-center text-green-600">
                    <Check className="h-5 w-5 mr-1" />
                    {syncResult.message || "Hotéis sincronizados"}
                  </div>
                )}
                
                {error && (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="h-5 w-5 mr-1" />
                    {error}
                  </div>
                )}
              </div>
              
              {syncResult && (
                <div className="mt-4 p-4 border rounded-md bg-muted/30">
                  <h3 className="font-semibold mb-2">Resultado da sincronização:</h3>
                  <div className="text-sm">
                    <p>Total: {syncResult.results?.total || 0} hotéis</p>
                    <p>Criados: {syncResult.results?.created || 0} hotéis</p>
                    <p>Atualizados: {syncResult.results?.updated || 0} hotéis</p>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">Ver detalhes</summary>
                    <pre className="text-xs overflow-auto p-2 bg-muted rounded-md mt-2 max-h-40">
                      {JSON.stringify(syncResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Sistema */}
        <TabsContent value="system" className="space-y-4">
          <h2 className="text-2xl font-semibold">Configurações do Sistema</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Visão geral das configurações atuais do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Versão</h3>
                  <p className="text-sm">1.0.0</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Ambiente</h3>
                  <p className="text-sm">Produção</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Data da última atualização</h3>
                  <p className="text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Status</h3>
                  <p className="text-sm flex items-center">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Ativo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Contatos de Suporte</CardTitle>
              <CardDescription>
                Canais de suporte disponíveis para administradores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Suporte Técnico</h3>
                    <p className="text-sm text-muted-foreground">suporte@expi.com.br</p>
                    <p className="text-sm text-muted-foreground">+55 (11) 99999-9999</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Gerente de Conta</h3>
                    <p className="text-sm text-muted-foreground">gerente@expi.com.br</p>
                    <p className="text-sm text-muted-foreground">+55 (11) 88888-8888</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Dados */}
        <TabsContent value="data" className="space-y-4">
          <h2 className="text-2xl font-semibold">Gerenciamento de Dados</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Banco de Dados</CardTitle>
              <CardDescription>
                Informações sobre os dados armazenados no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Hotéis</h3>
                    <Hotel className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{hotels.length}</p>
                  <p className="text-xs text-muted-foreground">Total de hotéis no sistema</p>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Usuários</h3>
                    <User className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold mt-2">--</p>
                  <p className="text-xs text-muted-foreground">Total de usuários</p>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Análises</h3>
                    <Database className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold mt-2">--</p>
                  <p className="text-xs text-muted-foreground">Total de análises</p>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Feedbacks</h3>
                    <MessageSquare className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold mt-2">--</p>
                  <p className="text-xs text-muted-foreground">Total de feedbacks processados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Operações de Dados</CardTitle>
              <CardDescription>
                Ferramentas para gerenciar os dados do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Aviso
                </h3>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                  As operações abaixo são sensíveis e podem afetar permanentemente os dados do sistema.
                  Use com cautela.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-semibold mb-2">Exportar Dados</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Exporta todos os dados do sistema em formato JSON para backup.
                  </p>
                  <Button variant="outline">
                    Exportar Dados
                  </Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-semibold mb-2">Importar Dados</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Importa dados de backup para o sistema.
                  </p>
                  <Button variant="outline">
                    Importar Dados
                  </Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-semibold mb-2">Limpar Dados de Teste</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Remove todos os dados de teste do sistema.
                  </p>
                  <Button variant="outline">
                    Limpar Dados de Teste
                  </Button>
                </div>
                
                <div className="border border-red-200 dark:border-red-900 rounded-md p-4">
                  <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">Resetar Banco de Dados</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Remove todos os dados do sistema. Esta ação não pode ser desfeita.
                  </p>
                  <Button variant="destructive">
                    Resetar Banco de Dados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico do Sistema</CardTitle>
              <CardDescription>
                Verifique o estado atual do sistema e execute diagnósticos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Executar Diagnóstico
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Ambiente de Teste</CardTitle>
              <CardDescription>
                Crie um ambiente isolado para testar funcionalidades sem afetar dados reais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingTestEnv ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${testEnvironment?.active ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span className="font-medium">
                      {testEnvironment?.active ? "Ambiente de teste ativo" : "Ambiente de teste inativo"}
                    </span>
                  </div>
                  
                  {testEnvironment?.active && (
                    <div className="space-y-2 mt-4">
                      <div className="text-sm">
                        <span className="font-medium">Criado em:</span> {formatDate(testEnvironment.createdAt)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Hotéis de teste:</span> {testEnvironment.hotels?.length || 0}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Análises de teste:</span> {testEnvironment.analyses?.length || 0}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Usuários de teste:</span> {testEnvironment.users?.length || 0}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 mt-4">
                    {!testEnvironment?.active ? (
                      <Button
                        onClick={createTestEnvironment}
                        disabled={isCreatingTestEnv}
                      >
                        {isCreatingTestEnv ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          "Criar Ambiente de Teste"
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={clearTestEnvironment}
                        disabled={isClearingTestEnv}
                      >
                        {isClearingTestEnv ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Limpando...
                          </>
                        ) : (
                          "Limpar Ambiente de Teste"
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mt-4">
                    <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Sobre o Ambiente de Teste
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                      Todas as entidades (hotéis, análises, usuários) criadas durante o ambiente de teste
                      são prefixadas com "TEST_" e podem ser facilmente identificadas e removidas.
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                      Use este ambiente para testar funcionalidades como importação de dados sem
                      afetar o banco de dados principal.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente com proteção de administrador
export default function AdminConfigPage() {
  return (
    <RequireAdmin>
      <ConfigPage />
    </RequireAdmin>
  );
} 