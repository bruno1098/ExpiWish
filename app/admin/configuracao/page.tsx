"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { RequireAdmin } from "@/lib/auth-context";
import { updateUserPassword } from "@/lib/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { 
  AlertCircle, 
  Check, 
  Loader2, 
  HotelIcon, 
  Database, 
  RefreshCw, 
  User, 
  Hotel, 
  Plus, 
  MessageSquare, 
  Activity, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Info, 
  Sparkles,
  BookOpen,
  Crown,
  FileUp,
  BarChart3,
  LineChart,
  History,
  Settings,
  Building2,
  Filter,
  MousePointer2,
  Users,
  Shield,
  TrendingUp,
  ChevronRight,
  Lightbulb,
  Target,
  Zap
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from 'next/link';
import { cn } from "@/lib/utils";

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
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [isHotelsLoading, setIsHotelsLoading] = useState(false);
  
  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Estados para API Key
  const [apiKey, setApiKeyState] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidKey, setIsValidKey] = useState<boolean | null>(null);
  
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
    
    // Carregar API key salva
    const savedApiKey = localStorage.getItem("openai-api-key")
    if (savedApiKey) {
      setApiKeyState(savedApiKey)
      setIsValidKey(true)
    }
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

  // Funções para gerenciar API Key
  const validateApiKey = (key: string) => {
    // Validação básica do formato da API key
    const isValid = key.startsWith('sk-') && key.length > 20
    setIsValidKey(isValid)
    return isValid
  }

  const handleApiKeyChange = (value: string) => {
    setApiKeyState(value)
    if (value.length > 0) {
      validateApiKey(value)
    } else {
      setIsValidKey(null)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, insira uma chave de acesso válida",
        variant: "destructive",
      })
      return
    }

    if (!validateApiKey(apiKey)) {
      toast({
        title: "Chave de Acesso Inválida",
        description: "A chave de acesso deve começar com 'sk-' e ter pelo menos 20 caracteres",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      localStorage.setItem("openai-api-key", apiKey)
      
      if (window) {
        window.dispatchEvent(new Event('apiKeyChanged'))
      }
      
      toast({
        title: "Configuração Salva",
        description: "Sua chave de acesso foi configurada com sucesso! A IA está pronta para análise.",
        variant: "default",
      })
      
      setIsValidKey(true)
    } catch (error) {
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar sua chave de acesso. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const clearApiKey = () => {
    setApiKeyState("")
    setIsValidKey(null)
    localStorage.removeItem("openai-api-key")
    toast({
      title: "Chave de Acesso Removida",
      description: "A configuração foi limpa com sucesso",
    })
  }

  const handleChangePassword = async () => {
    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await updateUserPassword(currentPassword, newPassword);
      
      toast({
        title: "✅ Senha alterada com sucesso",
        description: "Sua senha foi atualizada."
      });

      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      
      let errorMessage = error.message || "Falha ao alterar senha.";
      
      if (error.message?.includes("wrong-password") || error.message?.includes("Senha atual incorreta")) {
        errorMessage = "Senha atual incorreta. Verifique e tente novamente.";
      } else if (error.message?.includes("weak-password")) {
        errorMessage = "A nova senha deve ter pelo menos 6 caracteres.";
      } else if (error.message?.includes("requires-recent-login")) {
        errorMessage = "Por segurança, faça login novamente antes de alterar a senha.";
      }
      
      toast({
        title: "❌ Erro ao alterar senha",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Componente do Tutorial para Administradores
  const TutorialContent = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null)

    const tutorialSections = [
      {
        id: "overview",
        title: "Visão Geral Administrativa",
        icon: Crown,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        borderColor: "border-purple-200 dark:border-purple-800",
        content: "Como administrador, você tem acesso a funcionalidades avançadas que permitem gerenciar múltiplos hotéis, comparar performance entre propriedades e administrar toda a equipe que usa o sistema. Seu painel é diferente do dashboard padrão dos colaboradores - foi desenvolvido especificamente para dar uma visão estratégica de toda a operação."
      },
      {
        id: "dashboard",
        title: "Painel Administrativo Principal",
        icon: BarChart3,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        content: "Quando você faz login, é direcionado automaticamente para o painel administrativo que mostra uma visão consolidada de todos os hotéis da rede. Na parte superior, você vê métricas agregadas como a avaliação média geral da rede, total de feedbacks processados em todos os hotéis e tendências gerais de satisfação. O centro da tela mostra cards individuais para cada hotel da rede com informações essenciais e gráficos de preview."
      },
      {
        id: "comparison",
        title: "Comparação Entre Hotéis",
        icon: TrendingUp,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        content: "Uma das funcionalidades mais valiosas para administradores é a capacidade de comparar performance entre diferentes propriedades. Na seção 'Gestão de Hotéis', você encontra ferramentas específicas para benchmarking interno. O sistema gera automaticamente rankings de performance, mostrando quais hotéis estão nos melhores e piores posicionamentos em diferentes métricas."
      },
      {
        id: "users",
        title: "Gestão de Usuários",
        icon: Users,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
        borderColor: "border-indigo-200 dark:border-indigo-800",
        content: "Na seção 'Gerenciar Usuários', você controla quem tem acesso ao sistema e quais permissões cada pessoa possui. Pode criar novos usuários para colaboradores de qualquer hotel da rede, definir se são administradores ou staff regular, e associá-los aos hotéis específicos onde trabalham. Quando cria um novo usuário, o sistema gera automaticamente uma senha temporária que é enviada por email."
      },
      {
        id: "strategic",
        title: "Análise Estratégica Multi-Hotel",
        icon: Building2,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200 dark:border-orange-800",
        content: "Uma das grandes vantagens da visão administrativa é a capacidade de fazer análises estratégicas que consideram toda a rede simultaneamente. Pode identificar tendências sazonais que afetam todos os hotéis, entender como eventos externos impactam diferentes propriedades, e tomar decisões baseadas em dados agregados. O sistema oferece relatórios consolidados que mostram performance da rede em diferentes dimensões temporais."
      },
      {
        id: "decisions",
        title: "Tomada de Decisão Baseada em Dados",
        icon: Target,
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        content: "Como administrador, você tem a responsabilidade de transformar os insights gerados pelo sistema em ações concretas que melhorem a experiência dos hóspedes em toda a rede. Use as comparações entre hotéis para identificar oportunidades de melhoria e boas práticas a serem replicadas. O histórico de dados permite acompanhar o impacto das ações tomadas ao longo do tempo."
      }
    ]

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 animate-fade-in-up">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl shadow-lg animate-bounce-soft">
              <BookOpen className="h-6 w-6 text-blue-600 animate-pulse-soft" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gradient">
                Tutorial para Administradores
              </h3>
              <p className="text-muted-foreground">
                Guia completo das funcionalidades administrativas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 glass rounded-lg border animate-slide-in-right">
            <Badge variant="secondary" className="bg-white/80 dark:bg-gray-800/80 badge-pulse">
              <Crown className="h-3 w-3 mr-1 animate-rotate-slow" />
              Administrador
            </Badge>
            <span className="text-sm text-muted-foreground">
              Tutorial personalizado para seu perfil de acesso
            </span>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4 custom-scrollbar">
          <div className="space-y-4">
            {tutorialSections.map((section, index) => (
              <Card 
                key={section.id}
                className={cn(
                  "tutorial-section card-hover transition-all duration-300 cursor-pointer gpu-acceleration",
                  activeSection === section.id 
                    ? `${section.bgColor} ${section.borderColor} border-2 shadow-lg active` 
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
                )}
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 gpu-acceleration">
                        <div className={cn("p-2 rounded-lg transition-all duration-300", section.bgColor)}>
                          <section.icon className={cn("h-5 w-5 transition-all duration-300", section.color)} />
                        </div>
                      </div>
                      <div className="animate-fade-in-up">
                        <h4 className="font-semibold text-lg">{section.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Seção {index + 1} de {tutorialSections.length}
                        </p>
                      </div>
                    </div>
                    <ChevronRight 
                      className={cn(
                        "h-5 w-5 transition-all duration-300 gpu-acceleration",
                        activeSection === section.id ? "rotate-90" : "",
                        section.color
                      )} 
                    />
                  </div>

                  {activeSection === section.id && (
                    <div className="mt-6 space-y-4 animate-fade-in-up">
                      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="text-muted-foreground leading-relaxed text-justify">
                          {section.content}
                        </p>
                      </div>
                      
                      {section.id === "overview" && (
                        <div className="mt-4 p-4 glass rounded-lg border animate-slide-in-right">
                          <div className="flex items-center gap-2 mb-2">
                            <Crown className="h-4 w-4 text-purple-600 animate-bounce-soft" />
                            <span className="font-medium text-purple-900 dark:text-purple-100">Funcionalidades Administrativas</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              <Building2 className="h-3 w-3" />
                              Gestão Multi-Hotel
                            </div>
                            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              <Users className="h-3 w-3" />
                              Gerenciar Usuários
                            </div>
                            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              <TrendingUp className="h-3 w-3" />
                              Comparação de Performance
                            </div>
                            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              <Target className="h-3 w-3" />
                              Análise Estratégica
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <Card className="p-6 gradient-emerald-teal rounded-lg glass border animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-white">
                Pronto para começar!
              </h4>
              <p className="text-sm text-white/90">
                Com essas informações, você já pode gerenciar toda a rede de hotéis de forma eficiente.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Configuração do Sistema</h1>
      
      <Tabs defaultValue="hotels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hotels">Hotéis</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
          <TabsTrigger value="audit">Logs</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="tutorial" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Tutorial
          </TabsTrigger>
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
                      são prefixadas com &quot;TEST_&quot; e podem ser facilmente identificadas e removidas.
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
        
        {/* Aba de Logs */}
        <TabsContent value="audit" className="space-y-4">
          <h2 className="text-2xl font-semibold">Logs do Sistema</h2>
          
          {/* Aviso de desenvolvimento */}
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                <AlertCircle className="h-5 w-5" />
                Funcionalidade em Desenvolvimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-orange-700 dark:text-orange-400">
                <p className="mb-3">
                  <strong>⚠️ Esta funcionalidade está temporariamente indisponível.</strong>
                </p>
                <p className="text-sm mb-2">
                  O sistema de logs está sendo desenvolvido e implementado. Em breve você poderá:
                </p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Visualizar logs de ações dos usuários</li>
                  <li>Monitorar acessos e atividades</li>
                  <li>Filtrar logs por período, usuário e tipo de ação</li>
                  <li>Exportar relatórios de auditoria</li>
                </ul>
                <p className="text-xs mt-3 text-orange-600 dark:text-orange-500">
                  Esta funcionalidade será liberada em uma próxima atualização do sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Perfil */}
        <TabsContent value="profile" className="space-y-4">
          <h2 className="text-2xl font-semibold">Perfil do Usuário</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Informações do Usuário</CardTitle>
              <CardDescription>
                Dados da sua conta atual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Nome:</Label>
                  <div className="col-span-3">
                    <span className="text-sm">{userData?.name || "Não informado"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Email:</Label>
                  <div className="col-span-3">
                    <span className="text-sm">{userData?.email}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Hotel:</Label>
                  <div className="col-span-3">
                    <span className="text-sm">{userData?.hotelName}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Função:</Label>
                  <div className="col-span-3">
                    <span className="text-sm">{userData?.role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuração da API Key */}
          {isValidKey !== null && (
            <Card className={`p-4 border-l-4 ${
              isValidKey 
                ? "bg-green-50 dark:bg-green-950/30 border-l-green-500 border-green-200 dark:border-green-800" 
                : "bg-red-50 dark:bg-red-950/30 border-l-red-500 border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-center gap-3">
                {isValidKey ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    isValidKey ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                  }`}>
                    {isValidKey ? "IA Configurada e Pronta" : "Configuração Necessária"}
                  </p>
                  <p className={`text-sm ${
                    isValidKey ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                  }`}>
                    {isValidKey 
                      ? "Sua IA está pronta para analisar feedbacks automaticamente" 
                      : "Configure uma API Key válida para habilitar a análise inteligente"
                    }
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <span>Configuração da API</span>
                  <CardDescription className="mt-1">
                    Configure sua chave de acesso para análise inteligente
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-base font-medium">
                    Chave de Acesso da IA
                  </Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      className={`pr-12 text-sm ${
                        isValidKey === false ? "border-red-300 focus:border-red-500" : ""
                      } ${
                        isValidKey === true ? "border-green-300 focus:border-green-500" : ""
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  
                  {isValidKey === false && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Chave de acesso deve começar com &apos;sk-&apos; e ter pelo menos 20 caracteres
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleSaveApiKey} 
                    disabled={isSaving || !apiKey.trim()}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Salvar Configuração
                      </>
                    )}
                  </Button>
                  
                  {apiKey && (
                    <Button 
                      variant="outline" 
                      onClick={clearApiKey}
                      className="flex items-center gap-2"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações sobre a API */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  Como obter sua Chave de Acesso
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>Como administrador, você pode obter sua chave de acesso à IA diretamente dos provedores de serviços.</p>
                  <p>Configure a chave para habilitar a análise inteligente de feedbacks em todo o sistema.</p>
                </div>
                <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-300 dark:border-blue-700">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Segurança: Sua chave de acesso é armazenada apenas localmente no seu navegador
                  </p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Para sua segurança, insira sua senha atual para definir uma nova senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currentPassword" className="text-right">
                    Senha Atual <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    className="col-span-3"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    disabled={isChangingPassword}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="newPassword" className="text-right">
                    Nova Senha <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    className="col-span-3"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isChangingPassword}
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="confirmPassword" className="text-right">
                    Confirmar Nova Senha <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="col-span-3"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente sua nova senha"
                    disabled={isChangingPassword}
                    minLength={6}
                  />
                </div>
              </div>
              
              {/* Feedback visual */}
              {newPassword && newPassword.length < 6 && (
                <div className="text-sm text-red-600 mb-4">
                  ⚠️ A senha deve ter pelo menos 6 caracteres
                </div>
              )}
              
              {confirmPassword && newPassword !== confirmPassword && (
                <div className="text-sm text-red-600 mb-4">
                  ⚠️ As senhas não coincidem
                </div>
              )}
              
              {newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                <div className="text-sm text-green-600 mb-4">
                  ✅ Senhas coincidem
                </div>
              )}
              
              <Button 
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Tutorial */}
        <TabsContent value="tutorial" className="space-y-4">
          <TutorialContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Estilos CSS específicos para a página
const styles = `
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    0% {
      opacity: 0;
      transform: translateX(-20px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse-soft {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes bounce-soft {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-3px);
    }
    60% {
      transform: translateY(-2px);
    }
  }

  @keyframes rotate-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-slide-in-right {
    animation: slideInRight 0.6s ease-out forwards;
  }

  .animate-pulse-soft {
    animation: pulse-soft 2s ease-in-out infinite;
  }

  .animate-bounce-soft {
    animation: bounce-soft 2s ease-in-out infinite;
  }

  .animate-rotate-slow {
    animation: rotate-slow 8s linear infinite;
  }

  .tutorial-section {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tutorial-section:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }

  .tutorial-section.active {
    transform: scale(1.02);
  }

  .glass {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .text-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .gradient-emerald-teal {
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
  }

  .card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }

  .badge-pulse {
    animation: pulse-soft 3s ease-in-out infinite;
  }

  .gpu-acceleration {
    transform: translateZ(0);
    will-change: transform;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(45deg, #667eea, #764ba2);
    border-radius: 10px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(45deg, #764ba2, #667eea);
  }

  /* Dark mode adjustments */
  .dark .glass {
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .dark .tutorial-section:hover {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }

  .dark .card-hover:hover {
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  if (!document.head.querySelector('style[data-tutorial-styles]')) {
    styleSheet.setAttribute('data-tutorial-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

// Componente com proteção de administrador
export default function AdminConfigPage() {
  return (
    <RequireAdmin>
      <ConfigPage />
    </RequireAdmin>
  );
} 