import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Função para adicionar hotéis de teste
async function addTestHotels() {
  // Verificar se já existem hotéis
  const hotelsRef = collection(db, "hotels");
  const snapshot = await getDocs(hotelsRef);
  
  if (!snapshot.empty) {
    // Já existem hotéis, retornar os existentes
    const hotels = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      message: "Hotéis já existentes",
      hotels: hotels
    };
  }
  
  // Adicionar hotéis de teste
  const testHotels = [
    {
      name: "Hotel Copacabana Palace",
      address: "Av. Atlântica, 1702",
      city: "Rio de Janeiro",
      state: "RJ",
      country: "Brasil",
      stars: 5,
      createdAt: new Date()
    },
    {
      name: "Hotel Ibis São Paulo",
      address: "Av. Paulista, 2355",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      stars: 3,
      createdAt: new Date()
    },
    {
      name: "Resort All Inclusive",
      address: "Praia do Forte, s/n",
      city: "Salvador",
      state: "BA",
      country: "Brasil",
      stars: 5,
      createdAt: new Date()
    }
  ];
  
  const results = [];
  
  for (const hotel of testHotels) {
    const docRef = await addDoc(collection(db, "hotels"), hotel);
    results.push({
      id: docRef.id,
      ...hotel
    });
  }
  
  return {
    message: "Hotéis de teste criados com sucesso",
    hotels: results
  };
}

export async function GET() {
  try {
    const result = await addTestHotels();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Erro ao configurar dados de teste:", error);
    return NextResponse.json({ error: "Falha ao configurar dados de teste" }, { status: 500 });
  }
} 