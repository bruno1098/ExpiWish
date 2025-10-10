/**
 * Script para sincronizar Problems do código para o Firebase
 * 
 * Este script:
 * 1. Extrai todos os problems do PROBLEM_CONTEXT_DICT
 * 2. Atualiza o campo "problems" em /dynamic-lists/global-lists no Firebase
 * 3. Mantém a ordem exata do código
 * 
 * ATENÇÃO: Este script SOBRESCREVE os problems no Firebase!
 * 
 * USO: node scripts/sync-problems-to-firebase.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Lista completa de problems extraída do PROBLEM_CONTEXT_DICT
 * Organizada por departamento, mantendo a ordem exata do código
 */
const ALL_PROBLEMS = [
  // A&B (19 problemas)
  "A&B - Atendimento demora",
  "A&B - Atendimento insistente",
  "A&B - Café da manhã não disponível",
  "A&B - Falta de higiene",
  "A&B - Falta de produto",
  "A&B - Má qualidade",
  "A&B - Não disponível",
  "A&B - Variedade limitada",
  "A&B - Qualidade da comida",
  "A&B - Preço elevado",
  "A&B - Demora no serviço",
  "A&B - Falta de opções",
  "A&B - Atendimento ruim",
  "A&B - Refeição fria",
  "A&B - Bebidas limitadas",
  "A&B - Espaço pequeno",
  "A&B - Falta de tempero",
  "A&B - Sujeira",
  "A&B - Horário restrito",

  // Corporativo (7 problemas)
  "Corporativo - Atendimento demora",
  "Corporativo - Cobrança indevida",
  "Corporativo - Informação incorreta",
  "Corporativo - Falta de comunicação",
  "Corporativo - Processo lento",
  "Corporativo - Erro no sistema",
  "Corporativo - Atendimento ruim",

  // EG - Experiência do Hóspede (7 problemas)
  "EG - Atendimento demora",
  "EG - Atendimento insistente",
  "EG - Falta de comunicacao",
  "EG - Experiência ruim",
  "EG - Falta de atenção",
  "EG - Serviço impessoal",
  "EG - Expectativa não atendida",

  // Governança (26 problemas)
  "Governança - Falta de limpeza",
  "Governança - Falta de produto",
  "Governança - Falta de limpeza no banheiro",
  "Governança - Falta de limpeza no quarto",
  "Governança - Roupa de cama suja",
  "Governança - Toalhas sujas",
  "Governança - Cheiro ruim",
  "Governança - Poeira",
  "Governança - Banheiro sujo",
  "Governança - Quarto mal arrumado",
  "Governança - Falta de amenities",
  "Governança - Lençóis manchados",
  "Governança - Falta de troca",
  "Governança - Sujeira visível",
  "Governança - Banheiro com cabelo",
  "Governança - Lixo não recolhido",
  "Governança - Chão sujo",
  "Governança - Espelho sujo",
  "Governança - Tapete sujo",
  "Governança - Cortina suja",
  "Governança - Frigobar sujo",
  "Governança - Roupão sujo",
  "Governança - Travesseiro sujo",
  "Governança - Cobertor sujo",
  "Governança - Colcha suja",
  "Governança - Janela suja",
  "Governança - Varanda suja",

  // Lazer (12 problemas)
  "Lazer - Falta de opções",
  "Lazer - Não disponível",
  "Lazer - Piscina suja",
  "Lazer - Superlotado",
  "Lazer - Spa indisponível",
  "Lazer - Atividades canceladas",
  "Lazer - Área pequena",
  "Lazer - Falta de toalhas",
  "Lazer - Horário restrito",
  "Lazer - Espreguiçadeiras sujas",
  "Lazer - Sem guarda-vidas",
  "Lazer - Barulho excessivo",

  // Manutenção (47 problemas)
  "Manutenção - Ar-condicionado com falha",
  "Manutenção - Chuveiro com falha",
  "Manutenção - Elevador com falha",
  "Manutenção - Equipamento com falha",
  "Manutenção - Falta de manutenção",
  "Manutenção - Infiltração",
  "Manutenção - Porta com falha",
  "Manutenção - Tomada com falha",
  "Manutenção - TV com falha",
  "Manutenção - Vazamento",
  "Manutenção - Janela com falha",
  "Manutenção - Banheiro com problemas",
  "Manutenção - Mofo",
  "Manutenção - Toalhas velhas",
  "Manutenção - Fechadura quebrada",
  "Manutenção - Iluminação ruim",
  "Manutenção - Cortina quebrada",
  "Manutenção - Frigobar com falha",
  "Manutenção - Descarga com falha",
  "Manutenção - Pia entupida",
  "Manutenção - Box quebrado",
  "Manutenção - Armário quebrado",
  "Manutenção - Cama quebrada",
  "Manutenção - Cadeira quebrada",
  "Manutenção - Mesa quebrada",
  "Manutenção - Cortineiro quebrado",
  "Manutenção - Espelho quebrado",
  "Manutenção - Pintura ruim",
  "Manutenção - Piso danificado",
  "Manutenção - Teto com problemas",
  "Manutenção - Varanda com problemas",
  "Manutenção - Persiana quebrada",
  "Manutenção - Ventilador com falha",
  "Manutenção - Aquecedor com falha",
  "Manutenção - Cofre com falha",
  "Manutenção - Telefone com falha",
  "Manutenção - Campainha quebrada",
  "Manutenção - Maçaneta solta",
  "Manutenção - Ralo entupido",
  "Manutenção - Umidade",
  "Manutenção - Equipamento de lazer com falha",
  "Manutenção - Falta de manutenção em lazer",
  "Manutenção - Academia com equipamentos ruins",
  "Manutenção - Piscina fria",
  "Manutenção - Falta de tomada USB",
  "Manutenção - Cartão de acesso com falha",

  // Operações (33 problemas)
  "Operações - Atendimento demora",
  "Operações - Atendimento insistente",
  "Operações - Atendimento ruim",
  "Operações - Barulho",
  "Operações - Check-in demora",
  "Operações - Check-out demora",
  "Operações - Cobrança indevida",
  "Operações - Falta de comunicação",
  "Operações - Falta de privacidade",
  "Operações - Informação incorreta",
  "Operações - Quarto não preparado",
  "Operações - Reserva com problema",
  "Operações - Segurança inadequada",
  "Operações - Estacionamento lotado",
  "Operações - Falta de informação",
  "Operações - Recepção ruim",
  "Operações - Upgrade negado",
  "Operações - Perda de pertences",
  "Operações - Falta de cortesia",
  "Operações - Demora na solução",
  "Operações - Falta de organização",
  "Operações - Reclamação ignorada",
  "Operações - Horário não cumprido",
  "Operações - Concierge ruim",
  "Operações - Bagagem extraviada",
  "Operações - Serviço impessoal",
  "Operações - Falta de agilidade",
  "Operações - Equipe despreparada",
  "Operações - Falta de empatia",
  "Operações - Erro no pedido",
  "Operações - Falta de flexibilidade",
  "Operações - Burocracia excessiva",
  "Operações - Atendimento telefônico ruim",

  // Produto (24 problemas)
  "Produto - Custo-benefício ruim",
  "Produto - Espaço insuficiente",
  "Produto - Falta de acessibilidade",
  "Produto - Localização ruim",
  "Produto - Muito caro",
  "Produto - Ruído externo",
  "Produto - Vista ruim",
  "Produto - Quarto pequeno",
  "Produto - Cama desconfortável",
  "Produto - Banheiro pequeno",
  "Produto - Falta de tomadas",
  "Produto - Decoração ruim",
  "Produto - Móveis velhos",
  "Produto - Colchão ruim",
  "Produto - Travesseiro ruim",
  "Produto - Falta de espelho",
  "Produto - Iluminação fraca",
  "Produto - Varanda pequena",
  "Produto - Closet pequeno",
  "Produto - Banheira pequena",
  "Produto - Isolamento acústico ruim",
  "Produto - All inclusive limitado",
  "Produto - Falta de privacidade",
  "Produto - Transfer não disponível",

  // TI (16 problemas)
  "TI - Wi-fi não conecta",
  "TI - Wi-fi lento",
  "TI - Wi-fi instável",
  "TI - Canais limitados",
  "TI - App do hotel ruim",
  "TI - Senha Wi-fi complicada",
  "TI - Sinal fraco",
  "TI - Falta de suporte técnico",
  "TI - Sistema lento",
  "TI - Aplicativo instável",
  "TI - TV não funciona",
  "TI - Sistema de som com falha",
  "TI - Chromecast com falha",
  "TI - Controle remoto quebrado",
  "TI - Smart TV com problemas",
  "TI - Streaming não disponível",
];

/**
 * Função principal
 */
async function syncProblemsToFirebase() {
  try {
    console.log('🚀 Iniciando sincronização de problems para o Firebase...\n');

    const docRef = doc(db, 'dynamic-lists', 'global-lists');

    // 1. Verificar documento atual
    console.log('📋 Buscando documento atual...');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error('❌ Documento não encontrado em /dynamic-lists/global-lists');
      process.exit(1);
    }

    const currentData = docSnap.data();
    const currentProblems = currentData.problems || [];

    console.log(`   ✅ Documento encontrado`);
    console.log(`   📊 Problems atuais no Firebase: ${currentProblems.length}`);
    console.log(`   📊 Problems no código: ${ALL_PROBLEMS.length}\n`);

    // 2. Mostrar diferenças
    console.log('🔍 Analisando diferenças...');
    
    const problemsNoFirebaseNaoNoCodigo = currentProblems.filter(p => !ALL_PROBLEMS.includes(p));
    const problemsNoCdigoNaoNoFirebase = ALL_PROBLEMS.filter(p => !currentProblems.includes(p));

    if (problemsNoFirebaseNaoNoCodigo.length > 0) {
      console.log(`\n⚠️  Problems no Firebase que NÃO estão no código (${problemsNoFirebaseNaoNoCodigo.length}):`);
      problemsNoFirebaseNaoNoCodigo.forEach(p => console.log(`   - ${p}`));
    }

    if (problemsNoCdigoNaoNoFirebase.length > 0) {
      console.log(`\n✨ Problems no código que NÃO estão no Firebase (${problemsNoCdigoNaoNoFirebase.length}):`);
      problemsNoCdigoNaoNoFirebase.forEach(p => console.log(`   - ${p}`));
    }

    if (problemsNoFirebaseNaoNoCodigo.length === 0 && problemsNoCdigoNaoNoFirebase.length === 0) {
      console.log('   ✅ Nenhuma diferença encontrada! Firebase e código estão sincronizados.');
      console.log('\n✨ Sincronização concluída com sucesso!\n');
      process.exit(0);
    }

    // 3. Atualizar no Firebase
    console.log('\n💾 Atualizando Firebase...');
    
    await updateDoc(docRef, {
      problems: ALL_PROBLEMS,
      problems_updated_at: new Date(),
      problems_synced_from: 'generate-embeddings/route.ts PROBLEM_CONTEXT_DICT',
      total_problems: ALL_PROBLEMS.length
    });

    console.log('   ✅ Firebase atualizado com sucesso!');

    // 4. Validar atualização
    console.log('\n🔍 Validando atualização...');
    const updatedDocSnap = await getDoc(docRef);
    const updatedData = updatedDocSnap.data();
    const updatedProblems = updatedData.problems || [];

    console.log(`   ✅ Problems no Firebase após atualização: ${updatedProblems.length}`);

    // 5. Resumo por departamento
    console.log('\n📊 Resumo por departamento:');
    const departamentos = {
      'A&B': 0,
      'Corporativo': 0,
      'EG': 0,
      'Governança': 0,
      'Lazer': 0,
      'Manutenção': 0,
      'Operações': 0,
      'Produto': 0,
      'TI': 0
    };
    
    console.log('   📝 Nota: Transfer movido de Operações → Produto (relacionado à keyword "Produto - Transfer")');

    ALL_PROBLEMS.forEach(problem => {
      const dept = problem.split(' - ')[0];
      if (departamentos[dept] !== undefined) {
        departamentos[dept]++;
      }
    });

    Object.entries(departamentos).forEach(([dept, count]) => {
      console.log(`   ${dept.padEnd(15)} ${count} problems`);
    });

    console.log(`\n   ${'TOTAL'.padEnd(15)} ${ALL_PROBLEMS.length} problems`);

    console.log('\n✨ Sincronização concluída com sucesso!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error);
    process.exit(1);
  }
}

// Executar script
syncProblemsToFirebase();
