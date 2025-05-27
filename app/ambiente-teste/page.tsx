"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Import, BarChart4 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { RequireAdmin } from "@/lib/auth-context";
import SharedDashboardLayout from "../shared-layout";

function AmbienteTestePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [testEnvironment, setTestEnvironment] = useState<any>(null);

  // Verificar status do ambiente de teste ao carregar
  useEffect(() => {
    fetchTestEnvironmentStatus();
  }, []);

  // Verificar status do ambiente de teste
  const fetchTestEnvironmentStatus = async () => {
    setIsLoading(true);
    try {
      console.log("Buscando status do ambiente de teste...");
      const response = await fetch("/api/test-environment");
      
      if (response.ok) {
        const data = await response.json();
        console.log("Status do ambiente de teste:", data);
        console.log("Hotéis encontrados:", data.hotels?.length || 0);
        
        setTestEnvironment(data);
        
        // Atualizar localStorage baseado na resposta real
        if (data.active) {
          localStorage.setItem('isTestEnvironment', 'true');
        } else {
          localStorage.removeItem('isTestEnvironment');
        }
      } else {
        throw new Error("Falha ao verificar ambiente de teste");
      }
    } catch (error: any) {
      console.error("Erro ao verificar ambiente de teste:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao verificar ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Criar ambiente de teste
  const createTestEnvironment = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/test-environment", {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Dados retornados pela API:", data); // Debug
        
        // Se o ambiente foi criado, definir como ativo e guardar os dados
        if (data.environment) {
          setTestEnvironment(data.environment);
        } else if (data.active) {
          // Alternativa 1: usar os dados diretos
          setTestEnvironment(data);
        } else {
          // Alternativa 2: buscar o status atual
          await fetchTestEnvironmentStatus();
        }
        
        localStorage.setItem('isTestEnvironment', 'true');
        
        toast({
          title: "Sucesso",
          description: "Ambiente de teste criado com sucesso",
        });
      } else {
        throw new Error("Erro ao criar ambiente de teste");
      }
    } catch (error: any) {
      console.error("Erro ao criar ambiente de teste:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Limpar ambiente de teste
  const clearTestEnvironment = async () => {
    setIsClearing(true);
    try {
      const response = await fetch("/api/test-environment", {
        method: "DELETE"
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestEnvironment({
          active: false,
          hotels: [],
          analyses: [],
          users: []
        });
        
        localStorage.removeItem('isTestEnvironment');
        
        toast({
          title: "Sucesso",
          description: `Ambiente de teste limpo: ${data.results.deletedHotels} hotéis, ${data.results.deletedAnalyses} análises, ${data.results.deletedUsers} usuários removidos`,
        });
      } else {
        throw new Error("Erro ao limpar ambiente de teste");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao limpar ambiente de teste",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Função específica para buscar hotéis de teste
  const fetchTestHotels = async () => {
    try {
      const response = await fetch("/api/hotels?includeTestEnvironment=true");
      if (response.ok) {
        const data = await response.json();
        // Filtrar apenas hotéis de teste
        const testHotels = data.hotels.filter((hotel: any) => 
          hotel.isTestEnvironment === true || 
          hotel.name.startsWith('TEST_') || 
          hotel.hotelId.startsWith('TEST_')
        );
        return testHotels;
      } else {
        throw new Error("Erro ao buscar hotéis de teste");
      }
    } catch (error) {
      console.error("Erro ao buscar hotéis de teste:", error);
      return [];
    }
  };

  return (
    <SharedDashboardLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Ambiente de Teste</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ambiente de Teste Isolado</CardTitle>
            <CardDescription>
              Teste funcionalidades como importação e análise sem afetar os dados reais do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`h-4 w-4 rounded-full mr-2 ${testEnvironment?.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium text-lg">
                    {testEnvironment?.active ? 'Ambiente de teste ativo' : 'Ambiente de teste inativo'}
                  </span>
                </div>
                
                {testEnvironment?.active && (
                  <div className="border rounded-md p-4 bg-green-50 dark:bg-green-900/20 mt-4">
                    <div className="flex items-center text-green-600 dark:text-green-400 mb-2">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Ambiente de teste está pronto para uso</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Você pode agora importar arquivos e testar funcionalidades sem afetar os dados reais.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => router.push('/import')}
                      >
                        <Import className="mr-2 h-4 w-4" />
                        Importar Dados
                      </Button>
                      
                      {/* Botão para o Dashboard de Teste */}
                      <Button 
                        variant="outline"
                        onClick={() => router.push('/ambiente-teste/dashboard')}
                      >
                        <BarChart4 className="mr-2 h-4 w-4" />
                        Ver Dashboard de Teste
                      </Button>
                    </div>
                  </div>
                )}
                
                {testEnvironment?.active && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Hotéis de Teste</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{testEnvironment.hotels?.length || 0}</p>
                        <div className="mt-2 text-sm">
                          {testEnvironment.hotels?.map((hotel: any) => (
                            <div key={hotel.id} className="py-1 border-b last:border-b-0">
                              {hotel.name}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Análises de Teste</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{testEnvironment.analyses?.length || 0}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3 mt-6">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={fetchTestEnvironmentStatus}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Status
                  </Button>
                  
                  {!testEnvironment?.active ? (
                    <Button
                      onClick={createTestEnvironment}
                      disabled={isCreating}
                    >
                      {isCreating ? (
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
                      disabled={isClearing}
                    >
                      {isClearing ? (
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
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
            <CardDescription>Como usar o ambiente de teste de forma eficaz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">1. Criar o ambiente de teste</h3>
              <p className="text-sm text-muted-foreground">
                Ao criar o ambiente de teste, dois hotéis de teste serão criados automaticamente no sistema.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">2. Importar dados de teste</h3>
              <p className="text-sm text-muted-foreground">
                No ambiente de teste, você pode importar arquivos sem preocupações. Todos os dados importados
                serão marcados como dados de teste e não afetarão os relatórios reais.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">3. Limpar quando terminar</h3>
              <p className="text-sm text-muted-foreground">
                Quando concluir seus testes, limpe o ambiente de teste para remover todos os dados de teste
                do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SharedDashboardLayout>
  );
}

// Proteger a página - apenas administradores
export default function AmbienteTestePageProtected() {
  return (
    <RequireAdmin>
      <AmbienteTestePage />
    </RequireAdmin>
  );
} 