"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/auth-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Adicionar estas interfaces no início do arquivo
interface ApiHotel {
  id: string;
  hotelId?: string;
  name: string;
  [key: string]: any; // Para quaisquer outras propriedades que possam vir da API
}

interface HotelOption {
  id: string;
  name: string;
}

// Lista predefinida de hotéis como fallback
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

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hotels, setHotels] = useState<HotelOption[]>(PREDEFINED_HOTELS);
  const [isLoadingHotels, setIsLoadingHotels] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Carregar lista de hotéis do backend
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await fetch('/api/hotels');
        const data = await response.json();

        if (response.ok && data.hotels && data.hotels.length > 0) {
          // Transformar para o formato esperado
          const formattedHotels = data.hotels.map((hotel: ApiHotel): HotelOption => ({
            id: hotel.hotelId || hotel.id,
            name: hotel.name
          }));
          setHotels(formattedHotels);
        }
      } catch (error) {
        console.error("Erro ao carregar hotéis:", error);
        // Mantenha os hotéis predefinidos como fallback
      } finally {
        setIsLoadingHotels(false);
      }
    };

    fetchHotels();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validações básicas
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (!hotelId) {
      setError("Selecione um hotel");
      setLoading(false);
      return;
    }

    try {
      // Encontrar o nome do hotel pelo ID
      const selectedHotel = hotels.find(h => h.id === hotelId);
      if (!selectedHotel) {
        throw new Error("Hotel selecionado não encontrado");
      }

      await registerUser(email, password, hotelId, selectedHotel.name, name, 'staff');
      
      toast({
        title: "Conta criada com sucesso",
        description: "Seu cadastro foi realizado. Faça login para continuar."
      });
      
      router.push("/auth/login");
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      setError(error.message || "Falha ao criar conta. Tente novamente.");
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Falha ao criar conta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 space-y-6">
      <div className="flex flex-col items-center space-y-2 text-center">
        <MessageSquare className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Expi - Cadastro</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Crie sua conta para acessar o sistema
        </p>
      </div>
      
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu.email@hotel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hotel">Selecione seu Hotel</Label>
          <Select
            value={hotelId}
            onValueChange={setHotelId}
            disabled={isLoadingHotels}
          >
            <SelectTrigger>
              {isLoadingHotels ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Carregando hotéis...</span>
                </div>
              ) : (
                <SelectValue placeholder="Selecione um hotel" />
              )}
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
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-200 text-red-600 text-sm rounded">
            {error}
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading || isLoadingHotels}
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <p className="text-gray-500 dark:text-gray-400">
          Já tem uma conta?{" "}
          <Link 
            href="/auth/login"
            className="text-blue-500 hover:text-blue-700"
          >
            Faça login
          </Link>
        </p>
      </div>
    </Card>
  );
} 