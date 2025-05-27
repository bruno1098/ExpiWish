import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, hotelId, address, city, state, country, stars, isTestEnvironment } = body;
    
    // Validação básica
    if (!name || !hotelId) {
      return NextResponse.json({ error: "Nome e ID do hotel são obrigatórios" }, { status: 400 });
    }
    
    // Verificar se já existe um hotel com este ID
    const hotelsRef = collection(db, "hotels");
    const q = query(hotelsRef, where("hotelId", "==", hotelId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return NextResponse.json({ 
        error: "Já existe um hotel com este ID" 
      }, { status: 409 });
    }
    
    // Criar novo hotel
    const docRef = await addDoc(collection(db, "hotels"), {
      name,
      hotelId,
      address: address || "",
      city: city || "",
      state: state || "",
      country: country || "",
      stars: stars || 0,
      createdAt: new Date(),
      isTestEnvironment: isTestEnvironment || false
    });
    
    return NextResponse.json({ 
      message: "Hotel criado com sucesso", 
      id: docRef.id,
      hotelId,
      name 
    }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar hotel:", error);
    return NextResponse.json({ error: "Falha ao criar hotel" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Verificar se devemos incluir hotéis de teste
    const { searchParams } = new URL(request.url);
    const includeTestEnvironment = searchParams.get('includeTestEnvironment') === 'true';
    
    // Consulta base para todos os hotéis
    const hotelsRef = collection(db, "hotels");
    const snapshot = await getDocs(hotelsRef);
    
    // Mapear todos os hotéis do snapshot
    const allHotels = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{
      id: string;
      isTestEnvironment?: boolean;
      name?: string;
      hotelId?: string;
      [key: string]: any;
    }>;
    
    // Filtrar com base no modo solicitado
    let hotels;
    const TEST_PREFIX = "TEST_";
    
    if (includeTestEnvironment) {
      // Incluir todos os hotéis
      hotels = allHotels;
    } else {
      // Filtrar hotéis de teste
      hotels = allHotels.filter(hotel => {
        // Excluir hotéis explicitamente marcados como de teste
        if (hotel.isTestEnvironment === true) return false;
        
        // Excluir hotéis com nome ou ID começando com TEST_
        if (hotel.name && typeof hotel.name === 'string' && hotel.name.startsWith(TEST_PREFIX)) return false;
        if (hotel.hotelId && typeof hotel.hotelId === 'string' && hotel.hotelId.startsWith(TEST_PREFIX)) return false;
        
        // Incluir todos os outros hotéis
        return true;
      });
    }
    
    // Responder com os hotéis filtrados
    return NextResponse.json({ hotels }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar hotéis:", error);
    return NextResponse.json({ error: "Falha ao buscar hotéis" }, { status: 500 });
  }
} 