"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Sparkles,
  BookOpen,
  User,
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
  RefreshCw,
  Activity,
  UserCheck,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Lightbulb,
  Target,
  Zap
} from "lucide-react"
import SharedDashboardLayout from "../shared-layout"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [apiKey, setApiKeyState] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isValidKey, setIsValidKey] = useState<boolean | null>(null)
  const { toast } = useToast()
  const { userData } = useAuth()
  const isAdmin = userData?.role === 'admin'

  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai-api-key")
    if (savedApiKey) {
      setApiKeyState(savedApiKey)
      setIsValidKey(true)
    }
  }, [])

  const validateApiKey = (key: string) => {
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

  // Componente do Tutorial
  const TutorialContent = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null)

    const tutorialSections = isAdmin ? [
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
    ] : [
      {
        id: "welcome",
        title: "Bem-vindo ao Sistema",
        icon: BookOpen,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        content: "Este tutorial vai te ensinar como usar a plataforma para analisar os comentários dos hóspedes do seu hotel de forma inteligente e eficiente. O sistema utiliza inteligência artificial para transformar todos os feedbacks recebidos em informações úteis que ajudam a melhorar a experiência dos guests."
      },
      {
        id: "login",
        title: "Fazendo Login",
        icon: Shield,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        borderColor: "border-purple-200 dark:border-purple-800",
        content: "Quando você receber suas credenciais de acesso, vá até a página de login do sistema. Digite seu email corporativo e senha nos campos indicados. Se for seu primeiro acesso, o sistema pode pedir para você alterar sua senha ou verificar seu email. Isso é normal e faz parte da segurança da plataforma."
      },
      {
        id: "dashboard",
        title: "Entendendo o Dashboard Principal",
        icon: BarChart3,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        content: "O dashboard é como o 'coração' do sistema - é aqui que você vai passar a maior parte do tempo analisando os dados. Logo no topo, você vê o nome do seu hotel e informações básicas. Na parte superior da tela, há quatro cards principais que mostram as métricas mais importantes: avaliação média, sentimento positivo, total de feedbacks e tendência geral."
      },
      {
        id: "filters",
        title: "Usando os Filtros",
        icon: Filter,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200 dark:border-orange-800",
        content: "Uma das funcionalidades mais poderosas do sistema são os filtros. No topo do dashboard, você encontra várias opções para personalizar o que está vendo. Pode filtrar por período específico, escolher visualizar apenas avaliações de determinado número de estrelas, ou focar em comentários positivos, negativos ou neutros."
      },
      {
        id: "charts",
        title: "Interagindo com os Gráficos",
        icon: MousePointer2,
        color: "text-pink-600",
        bgColor: "bg-pink-50 dark:bg-pink-950/30",
        borderColor: "border-pink-200 dark:border-pink-800",
        content: "Todos os gráficos no sistema são interativos. Quando você clica em uma barra, fatia de pizza ou ponto em um gráfico, o sistema mostra detalhes específicos sobre aquela informação. Por exemplo, se clicar na barra 'Governança' no gráfico de problemas por setor, verá exatamente quais aspectos de limpeza os hóspedes estão mencionando."
      },
      {
        id: "import",
        title: "Importando Novos Dados",
        icon: FileUp,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
        borderColor: "border-indigo-200 dark:border-indigo-800",
        content: "Uma das suas principais responsabilidades será manter o sistema atualizado com novos feedbacks. Para isso, você usa a seção 'Importar Dados' no menu lateral. A interface é muito simples: você pode arrastar arquivos diretamente da sua pasta para a área indicada na tela, ou clicar no botão para selecionar arquivos manualmente."
      },
      {
        id: "history",
        title: "Consultando o Histórico",
        icon: History,
        color: "text-teal-600",
        bgColor: "bg-teal-50 dark:bg-teal-950/30",
        borderColor: "border-teal-200 dark:border-teal-800",
        content: "A seção 'Histórico' guarda todas as importações que você já fez. É útil para acompanhar quando os dados foram atualizados pela última vez, verificar o status de processamentos em andamento, ou até mesmo reprocessar arquivos antigos se necessário."
      },
      {
        id: "tips",
        title: "Dicas Práticas para o Dia a Dia",
        icon: Lightbulb,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        content: "Para aproveitar melhor o sistema no seu trabalho diário, recomendamos uma rotina simples: comece sempre verificando o dashboard principal para ter uma visão geral da situação atual. Se identificar alguma área com performance baixa, use os filtros para investigar mais a fundo e encontrar padrões específicos."
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
                Tutorial {isAdmin ? 'para Administradores' : 'para Colaboradores'}
              </h3>
              <p className="text-muted-foreground">
                {isAdmin ? 'Guia completo das funcionalidades administrativas' : 'Aprenda a usar todas as funcionalidades do sistema'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 glass rounded-lg border animate-slide-in-right">
            <Badge variant="secondary" className="bg-white/80 dark:bg-gray-800/80 badge-pulse">
              {isAdmin ? <Crown className="h-3 w-3 mr-1 animate-rotate-slow" /> : <User className="h-3 w-3 mr-1" />}
              {isAdmin ? 'Administrador' : 'Colaborador'}
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
                    : "hover:bg-muted/50"
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
                      
                      {section.id === "welcome" && !isAdmin && (
                        <div className="mt-4 p-4 glass rounded-lg border animate-slide-in-right">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-blue-600 animate-pulse-soft" />
                            <span className="font-medium text-blue-900 dark:text-blue-100">Funcionalidades Principais</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <BarChart3 className="h-3 w-3" />
                              Dashboard Interativo
                            </div>
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <FileUp className="h-3 w-3" />
                              Importação de Dados
                            </div>
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <Filter className="h-3 w-3" />
                              Filtros Avançados
                            </div>
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <History className="h-3 w-3" />
                              Histórico Completo
                            </div>
                          </div>
                        </div>
                      )}

                      {section.id === "overview" && isAdmin && (
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
                {isAdmin 
                  ? 'Com essas informações, você já pode gerenciar toda a rede de hotéis de forma eficiente.'
                  : 'Agora você já sabe como usar todas as funcionalidades do sistema para analisar feedbacks.'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Configurações
          </h1>
          <p className="text-lg text-muted-foreground">
            Gerencie suas preferências e acesse o tutorial do sistema
          </p>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 glass">
            <TabsTrigger value="api" className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-white/20">
              <Key className="h-4 w-4" />
              Configurações da API
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-white/20">
              <BookOpen className="h-4 w-4" />
              Tutorial do Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-8 tab-content">
            {/* Status da API */}
            {isValidKey !== null && (
              <Card className={cn(
                "p-4 border-l-4 transition-all duration-300 animate-fade-in-up",
                isValidKey 
                  ? "bg-green-50 dark:bg-green-950/30 border-l-green-500 border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-950/30 border-l-red-500 border-red-200 dark:border-red-800"
              )}>
                <div className="flex items-center gap-3">
                  {isValidKey ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 animate-pulse-soft" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 animate-bounce-soft" />
                  )}
                  <div>
                    <p className={cn(
                      "font-medium",
                      isValidKey ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                    )}>
                      {isValidKey ? "IA Configurada e Pronta" : "Configuração Necessária"}
                    </p>
                    <p className={cn(
                      "text-sm",
                      isValidKey ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                    )}>
                      {isValidKey 
                        ? "Sua IA está pronta para analisar feedbacks automaticamente" 
                        : "Configure uma API Key válida para habilitar a análise inteligente"
                      }
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Configuração da API Key */}
            <Card className="p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Key className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Configuração da API</h3>
                    <p className="text-muted-foreground">
                      Configure sua chave de acesso para análise inteligente
                    </p>
                  </div>
                </div>

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
                        className={cn(
                          "pr-12 text-sm transition-all duration-200",
                          isValidKey === false && "border-red-300 focus:border-red-500",
                          isValidKey === true && "border-green-300 focus:border-green-500"
                        )}
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
                      <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in duration-200">
                        <AlertCircle className="h-3 w-3" />
                        Chave de acesso deve começar com 'sk-' e ter pelo menos 20 caracteres
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleSaveApiKey} 
                      disabled={isSaving || !apiKey.trim()}
                      className="flex items-center gap-2 btn-gradient text-white transition-all duration-200"
                    >
                      {isSaving ? (
                        <>
                          <div className="loader-dots">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                          </div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 animate-pulse-soft" />
                          Salvar Configuração
                        </>
                      )}
                    </Button>
                    
                    {apiKey && (
                      <Button 
                        variant="outline" 
                        onClick={clearApiKey}
                        className="flex items-center gap-2 transition-all duration-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-950/30"
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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
                    <p>Para obter sua chave de acesso à IA, entre em contato com o administrador do sistema.</p>
                    <p>O administrador irá fornecer as credenciais necessárias para habilitar a análise inteligente.</p>
                  </div>
                  <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-300 dark:border-blue-700">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Segurança: Sua chave de acesso é armazenada apenas localmente no seu navegador
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tutorial" className="space-y-8 tab-content">
            <TutorialContent />
          </TabsContent>
        </Tabs>
      </div>
    </SharedDashboardLayout>
  )
}