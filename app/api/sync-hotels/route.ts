import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// Interface para os resultados da sincronização
interface SyncHotelResult {
  id: string;
  name: string;
  status: string;
  docId?: string;
}

// Interface para os resultados da operação
interface SyncResults {
  total: number;
  created: number;
  updated: number;
  hotels: SyncHotelResult[];
}

export async function GET() {
  try {
    // Inicializar resultados com tipagem adequada
    const results: SyncResults = {
      total: 0,
      created: 0,
      updated: 0,
      hotels: []
    };

    // Buscar hotéis existentes
    const hotelsRef = collection(db, "hotels");
    const snapshot = await getDocs(hotelsRef);
    
    // Mapear por hotelId
    const existingHotels = new Map();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      existingHotels.set(data.hotelId, {
        id: doc.id,
        ref: doc,
        ...data
      });
    });
    
    // Processar cada hotel predefinido
    for (const hotel of PREDEFINED_HOTELS) {
      results.total++;
      
      // Verificar se o hotel já existe
      if (existingHotels.has(hotel.id)) {
        // Hotel já existe, nada a fazer
        results.hotels.push({
          id: hotel.id,
          name: hotel.name,
          status: "existing"
        });
      } else {
        // Criar novo hotel
        const newHotel = {
          name: hotel.name,
          hotelId: hotel.id,
          address: "",
          city: "",
          state: "",
          country: "Brasil",
          stars: 5,
          createdAt: new Date(),
          isTestEnvironment: false
        };
        
        // Adicionar ao Firestore
        const docRef = await addDoc(collection(db, "hotels"), newHotel);
        
        results.created++;
        results.hotels.push({
          id: hotel.id,
          name: hotel.name,
          status: "created",
          docId: docRef.id
        });
      }
    }
    
    return NextResponse.json({
      message: `Sincronização concluída: ${results.created} hotéis criados`,
      results
    }, { status: 200 });
  } catch (error) {
    console.error("Erro ao sincronizar hotéis:", error);
    return NextResponse.json({ error: "Falha ao sincronizar hotéis" }, { status: 500 });
  }
} 