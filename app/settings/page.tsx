"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Sparkles
} from "lucide-react"
import SharedDashboardLayout from "../shared-layout"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [apiKey, setApiKeyState] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isValidKey, setIsValidKey] = useState<boolean | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai-api-key")
    if (savedApiKey) {
      setApiKeyState(savedApiKey)
      setIsValidKey(true)
    }
  }, [])

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

  return (
    <SharedDashboardLayout>
      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Configurações
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure sua API Key para habilitar a análise inteligente de feedbacks
          </p>
        </div>

        {/* Status da API */}
        {isValidKey !== null && (
          <Card className={cn(
            "p-4 border-l-4",
            isValidKey 
              ? "bg-green-50 dark:bg-green-950/30 border-l-green-500 border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-950/30 border-l-red-500 border-red-200 dark:border-red-800"
          )}>
            <div className="flex items-center gap-3">
              {isValidKey ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
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
                      "pr-12 text-sm",
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
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Chave de acesso deve começar com 'sk-' e ter pelo menos 20 caracteres
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
      </div>
    </SharedDashboardLayout>
  )
}