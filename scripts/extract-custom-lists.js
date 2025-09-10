#!/usr/bin/env node
/**
 * Script para extrair todas as listas dinâmicas personalizadas do Firebase
 * Mostra palavras-chave, problemas e departamentos salvos pelos usuários
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');



// Listas padrão para comparação
const DEFAULT_KEYWORDS = [
  'A&B - Café da manhã', 'A&B - Serviço', 'A&B - Variedade', 'A&B - Preço',
  'Limpeza - Quarto', 'Limpeza - Banheiro', 'Limpeza - Áreas sociais', 'Enxoval',
  'Manutenção - Quarto', 'Manutenção - Banheiro', 'Manutenção - Instalações',
  'Ar-condicionado', 'Elevador', 'Frigobar', 'Infraestrutura',
  'Lazer - Variedade', 'Lazer - Estrutura', 'Spa', 'Piscina',
  'Tecnologia - Wi-fi', 'Tecnologia - TV', 'Comodidade', 'Estacionamento',
  'Atendimento', 'Acessibilidade', 'Reserva de cadeiras (pool)', 'Processo',
  'Custo-benefício', 'Comunicação', 'Check-in - Atendimento', 'Check-out - Atendimento',
  'Concierge', 'Cotas', 'Reservas'
];

const DEFAULT_PROBLEMS = [
  'VAZIO', 'Demora no Atendimento', 'Falta de Limpeza', 'Capacidade Insuficiente',
  'Falta de Cadeiras', 'Não Funciona', 'Conexão Instável', 'Ruído Excessivo',
  'Espaço Insuficiente', 'Qualidade da Comida', 'Muito Frio', 'Muito Quente',
  'Pressão de Vendas', 'Check-in Lento', 'Check-out Lento'
];

const DEFAULT_DEPARTMENTS = [
  'A&B', 'Governança', 'Manutenção', 'Manutenção - Quarto', 'Manutenção - Banheiro',
  'Manutenção - Instalações', 'Lazer', 'TI', 'Operações', 'Produto', 'Marketing',
  'Comercial', 'Qualidade', 'Recepção', 'Programa de vendas'
];

async function extractCustomLists() {
  try {
    console.log('🔥 Conectando ao Firebase...\n');
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Buscar listas dinâmicas globais
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('❌ Nenhuma lista personalizada encontrada no Firebase.');
      console.log('✅ Isso significa que ainda não foram criadas personalizações pelos usuários.\n');
      return;
    }
    
    const data = docSnap.data();
    const lastUpdated = data.lastUpdated?.toDate?.() || 'Não informado';
    
    console.log('📊 LISTAS DINÂMICAS EXTRAÍDAS DO FIREBASE');
    console.log('=' * 60);
    console.log(`📅 Última atualização: ${lastUpdated}\n`);
    
    // Palavras-chave personalizadas
    const customKeywords = (data.keywords || []).filter(k => !DEFAULT_KEYWORDS.includes(k));
    console.log('🏷️  PALAVRAS-CHAVE PERSONALIZADAS:');
    console.log('-' * 40);
    if (customKeywords.length > 0) {
      customKeywords.sort().forEach((keyword, index) => {
        console.log(`${index + 1}. ${keyword}`);
      });
      console.log(`\n📈 Total de palavras-chave personalizadas: ${customKeywords.length}`);
    } else {
      console.log('🔍 Nenhuma palavra-chave personalizada encontrada.');
      console.log('✅ Todos os itens são do conjunto padrão do sistema.');
    }
    
    console.log('\n' + '=' * 60 + '\n');
    
    // Problemas personalizados
    const customProblems = (data.problems || []).filter(p => !DEFAULT_PROBLEMS.includes(p));
    console.log('⚠️  PROBLEMAS PERSONALIZADOS:');
    console.log('-' * 40);
    if (customProblems.length > 0) {
      customProblems.sort().forEach((problem, index) => {
        console.log(`${index + 1}. ${problem}`);
      });
      console.log(`\n📈 Total de problemas personalizados: ${customProblems.length}`);
    } else {
      console.log('🔍 Nenhum problema personalizado encontrado.');
      console.log('✅ Todos os itens são do conjunto padrão do sistema.');
    }
    
    console.log('\n' + '=' * 60 + '\n');
    
    // Departamentos personalizados
    const customDepartments = (data.departments || []).filter(d => !DEFAULT_DEPARTMENTS.includes(d));
    console.log('🏢 DEPARTAMENTOS PERSONALIZADOS:');
    console.log('-' * 40);
    if (customDepartments.length > 0) {
      customDepartments.sort().forEach((department, index) => {
        console.log(`${index + 1}. ${department}`);
      });
      console.log(`\n📈 Total de departamentos personalizados: ${customDepartments.length}`);
    } else {
      console.log('🔍 Nenhum departamento personalizado encontrado.');
      console.log('✅ Todos os itens são do conjunto padrão do sistema.');
    }
    
    console.log('\n' + '=' * 60);
    
    // Resumo geral
    console.log('\n📋 RESUMO GERAL:');
    console.log(`🏷️  Palavras-chave: ${(data.keywords || []).length} total (${customKeywords.length} personalizadas)`);
    console.log(`⚠️  Problemas: ${(data.problems || []).length} total (${customProblems.length} personalizados)`);
    console.log(`🏢 Departamentos: ${(data.departments || []).length} total (${customDepartments.length} personalizados)`);
    
    // Exportar para markdown se houver personalizações
    if (customKeywords.length > 0 || customProblems.length > 0 || customDepartments.length > 0) {
      console.log('\n📝 FORMATO MARKDOWN PARA DOCUMENTAÇÃO:');
      console.log('-' * 50);
      
      if (customKeywords.length > 0) {
        console.log('\n### 🏷️ Palavras-chave Personalizadas Criadas pelos Usuários:');
        customKeywords.forEach(keyword => {
          console.log(`- **${keyword}**`);
        });
      }
      
      if (customProblems.length > 0) {
        console.log('\n### ⚠️ Problemas Personalizados Criados pelos Usuários:');
        customProblems.forEach(problem => {
          console.log(`- **${problem}**`);
        });
      }
      
      if (customDepartments.length > 0) {
        console.log('\n### 🏢 Departamentos Personalizados Criados pelos Usuários:');
        customDepartments.forEach(department => {
          console.log(`- **${department}**`);
        });
      }
    }
    
    console.log('\n✅ Extração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao extrair listas personalizadas:', error);
    console.log('\n💡 Verifique se:');
    console.log('1. A conexão com internet está funcionando');
    console.log('2. As credenciais do Firebase estão corretas');
    console.log('3. As permissões de leitura estão configuradas');
  }
}

// Executar o script
extractCustomLists().then(() => {
  console.log('\n🔚 Script finalizado.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
