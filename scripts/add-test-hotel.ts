import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Função para adicionar um hotel de teste ao Firestore
export const addTestHotel = async () => {
  try {
    // Dados do hotel de teste
    const testHotel = {
      name: "Hotel Teste",
      address: "Av. Exemplo, 1234 - Centro",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      stars: 4,
      createdAt: new Date()
    };
    
    // Adicionar o hotel à coleção "hotels"
    const hotelRef = await addDoc(collection(db, "hotels"), testHotel);
    
    console.log("Hotel de teste criado com sucesso com ID: ", hotelRef.id);
    return {
      id: hotelRef.id,
      ...testHotel
    };
  } catch (error) {
    console.error("Erro ao criar hotel de teste:", error);
    throw error;
  }
};

// Se este arquivo for executado diretamente, adicionar o hotel
if (require.main === module) {
  addTestHotel()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} 