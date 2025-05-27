"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import {  getApiKey } from "@/lib/openai"
import SharedDashboardLayout from "../shared-layout"

export default function SettingsPage() {
  const [apiKey, setApiKeyState] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const [useFineTuned, setUseFineTuned] = useState(true)

  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai-api-key")
    if (savedApiKey) {
      setApiKeyState(savedApiKey)
    }
  }, [])

  const handleSaveApiKey = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      localStorage.setItem("openai-api-key", apiKey)
      
      if (window) {
        window.dispatchEvent(new Event('apiKeyChanged'))
      }
      
      toast({
        title: "Configuração salva",
        description: "Sua API Key foi salva com sucesso!",
        variant: "default",
      
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar sua API Key",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SharedDashboardLayout>
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-8">Configurações</h2>

        <div className="grid gap-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Configuração do OpenAI</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Digite sua API key"
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                />
                <Button 
                  onClick={handleSaveApiKey} 
                  className="w-fit mt-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin mr-2">⚪</span>
                      Salvando...
                    </>
                  ) : (
                    'Salvar API Key'
                  )}
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  defaultValue="turbo"
                  placeholder="Digite o nome do modelo"
                  disabled
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={useFineTuned}
                  onCheckedChange={setUseFineTuned}
                />
                <Label>Usar modelo com ajuste fino para análise</Label>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Notificações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações sobre novos feedbacks
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Semanais</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber relatórios semanais de análise de feedback
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Gerenciamento de Dados</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Limpar Todos os Dados</Label>
                <p className="text-sm text-muted-foreground">
                  Remover todos os dados de feedback importados e resultados de análise
                </p>
                <Button variant="destructive" className="w-fit">
                  Limpar Dados
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SharedDashboardLayout>
  )
}