// Script de migração dos dados existentes para o novo sistema de taxonomy

import { 
  initializeApp, 
  getApps, 
  type FirebaseApp
} from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { 
  Department, 
  Keyword, 
  Problem, 
  TaxonomyMeta 
} from '../lib/taxonomy-types';
import { generateSlug } from '../lib/taxonomy-service';
import { generateBatchEmbeddings } from '../lib/embeddings-service.js';

// Configuração Firebase (usar a mesma do projeto)
const firebaseConfig = {
  apiKey: "AIzaSyBoCA8htD7kcfCMfephG6O1oKlrG2hbGzU",
  authDomain: "expi-e7219.firebaseapp.com",
  databaseURL: "https://expi-e7219-default-rtdb.firebaseio.com",
  projectId: "expi-e7219",
  storageBucket: "expi-e7219.firebasestorage.app",
  messagingSenderId: "873889751904",
  appId: "1:873889751904:web:041d5ea449384087727405"
};

// Inicializar Firebase (se não estiver inicializado)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig, 'migration');
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Collections do novo sistema
const NEW_COLLECTIONS = {
  departments: 'taxonomy_departments',
  keywords: 'taxonomy_keywords',
  problems: 'taxonomy_problems',
  meta: 'taxonomy_meta',
  config: 'taxonomy_config'
};

// Departamentos do sistema atual (fixos)
const CURRENT_DEPARTMENTS = [
  { id: 'A&B', label: 'A&B', description: 'Alimentos & Bebidas' },
  { id: 'Governanca', label: 'Governança', description: 'Governança Hoteleira' },
  { id: 'Limpeza', label: 'Limpeza', description: 'Limpeza e Higienização' },
  { id: 'Manutencao', label: 'Manutenção', description: 'Manutenção e Reparos' },
  { id: 'Produto', label: 'Produto', description: 'Qualidade dos Produtos' },
  { id: 'Lazer', label: 'Lazer', description: 'Atividades de Lazer' },
  { id: 'TI', label: 'TI', description: 'Tecnologia da Informação' },
  { id: 'Operacoes', label: 'Operações', description: 'Operações Gerais' },
  { id: 'Qualidade', label: 'Qualidade', description: 'Controle de Qualidade' },
  { id: 'Recepcao', label: 'Recepção', description: 'Atendimento na Recepção' },
  { id: 'EG', label: 'EG', description: 'Experiências para Hóspedes' },
  { id: 'Comercial', label: 'Comercial', description: 'Área Comercial' },
  { id: 'Academia', label: 'Academia', description: 'Academia e Fitness' }
];

// Keywords do sistema atual (baseadas no analyze-feedback/route.ts)
const CURRENT_KEYWORDS = [
  // A&B
  { label: "A&B - Café da manhã", department_id: "A&B", aliases: ["cafe da manha", "breakfast", "matinal"] },
  { label: "A&B - Almoço", department_id: "A&B", aliases: ["almoco", "lunch", "jantar"] },
  { label: "A&B - Serviço", department_id: "A&B", aliases: ["garcom", "atendimento restaurante", "bar"] },
  { label: "A&B - Variedade", department_id: "A&B", aliases: ["variedade", "opcoes", "diversidade"] },
  { label: "A&B - Preço", department_id: "A&B", aliases: ["preco", "caro", "valor"] },
  { label: "A&B - Gastronomia", department_id: "A&B", aliases: ["gastronomia", "culinaria", "cuisine"] },
  { label: "A&B - Alimentos", department_id: "A&B", aliases: ["comida", "food", "pratos"] },
  
  // Limpeza
  { label: "Limpeza - Quarto", department_id: "Limpeza", aliases: ["quarto limpo", "room clean", "higiene quarto"] },
  { label: "Limpeza - Banheiro", department_id: "Limpeza", aliases: ["banheiro limpo", "bathroom clean", "higiene banheiro"] },
  { label: "Limpeza - Áreas sociais", department_id: "Limpeza", aliases: ["areas comuns", "lobby", "corredores"] },
  
  // Manutenção  
  { label: "Manutenção - Quarto", department_id: "Manutencao", aliases: ["cofre quebrado", "luz nao funciona", "porta com problema"] },
  { label: "Manutenção - Banheiro", department_id: "Manutencao", aliases: ["torneira", "chuveiro defeito", "box"] },
  { label: "Manutenção - Instalações", department_id: "Manutencao", aliases: ["estrutura danificada", "instalacao"] },
  
  // Governança
  { label: "Enxoval", department_id: "Produto", aliases: ["toalhas", "lencois", "cobertas"] },
  { label: "Governança - Serviço", department_id: "Governanca", aliases: ["organizacao", "arrumacao"] },
  { label: "Governança - Mofo", department_id: "Governanca", aliases: ["mofo", "umidade", "cheiro"] },
  
  // Lazer
  { label: "Piscina", department_id: "Lazer", aliases: ["piscina", "pool", "natacao"] },
  { label: "Spa", department_id: "Lazer", aliases: ["spa", "massagem", "relaxamento"] },
  { label: "Lazer - Atividades de Lazer", department_id: "Lazer", aliases: ["recreacao", "atividades", "entretenimento"] },
  { label: "Academia", department_id: "Academia", aliases: ["academia", "gym", "fitness"] },
  
  // TI
  { label: "Tecnologia - Wi-fi", department_id: "TI", aliases: ["wifi", "internet", "conexao"] },
  { label: "Tecnologia - TV", department_id: "TI", aliases: ["tv", "televisao", "canais"] },
  
  // Operações
  { label: "Atendimento", department_id: "Operacoes", aliases: ["atendimento", "service", "staff"] },
  { label: "Localização", department_id: "Operacoes", aliases: ["localizacao", "location", "acesso"] },
  
  // Recepção
  { label: "Recepção - Serviço", department_id: "Recepcao", aliases: ["recepcao", "check-in", "front desk"] },
  { label: "Check-in - Atendimento Recepção", department_id: "Recepcao", aliases: ["check in", "chegada"] },
  { label: "Check-out - Atendimento Recepção", department_id: "Recepcao", aliases: ["check out", "saida"] },
  
  // EG
  { label: "Concierge", department_id: "EG", aliases: ["concierge", "concierge service"] },
  { label: "Cotas", department_id: "EG", aliases: ["multipropriedade", "timeshare", "vendas"] },
  
  // Comercial
  { label: "Reservas", department_id: "Comercial", aliases: ["reserva", "booking", "agendamento"] },
  
  // Produto
  { label: "Travesseiro", department_id: "Produto", aliases: ["travesseiro", "pillow", "almofada"] },
  { label: "Colchão", department_id: "Produto", aliases: ["colchao", "mattress", "cama"] },
  { label: "Ar-condicionado", department_id: "Manutencao", aliases: ["ar condicionado", "climatizacao"] },
  { label: "Produto - Experiência", department_id: "Produto", aliases: ["experiencia", "estadia", "geral"] }
];

// Problems do sistema atual (baseados no analyze-feedback/route.ts) 
const CURRENT_PROBLEMS = [
  // Atendimento
  { label: "Atendimento Insistente", category: "Atendimento", severity: "medium" },
  { label: "Demora no Atendimento", category: "Atendimento", severity: "high" },
  { label: "Atendimento Rude", category: "Atendimento", severity: "high" },
  { label: "Falta de Disponibilidade Staff", category: "Atendimento", severity: "medium" },
  { label: "Atendimento Despreparado", category: "Atendimento", severity: "medium" },
  { label: "Comunicação Deficiente", category: "Atendimento", severity: "medium" },
  { label: "Falta de Proatividade", category: "Atendimento", severity: "low" },
  
  // Estrutura/Instalações
  { label: "Equipamento com Falha", category: "Estrutura", severity: "high" },
  { label: "Equipamento Inoperante", category: "Estrutura", severity: "critical" },
  { label: "Estrutura Danificada", category: "Estrutura", severity: "high" },
  { label: "Falta de Manutenção Preventiva", category: "Estrutura", severity: "medium" },
  { label: "Instalação Inadequada", category: "Estrutura", severity: "medium" },
  { label: "Problema de Funcionamento", category: "Estrutura", severity: "high" },
  { label: "Desgaste Excessivo", category: "Estrutura", severity: "low" },
  
  // Limpeza/Higienização
  { label: "Quarto com Resíduos", category: "Limpeza", severity: "high" },
  { label: "Área Comum com Limpeza Insuficiente", category: "Limpeza", severity: "medium" },
  { label: "Banheiro Sujo", category: "Limpeza", severity: "high" },
  { label: "Enxoval Manchado", category: "Limpeza", severity: "medium" },
  { label: "Falta de Higienização", category: "Limpeza", severity: "high" },
  { label: "Odor Desagradável", category: "Limpeza", severity: "high" },
  { label: "Mofo Presente", category: "Limpeza", severity: "critical" },
  { label: "Organização Deficiente", category: "Limpeza", severity: "low" },
  
  // A&B
  { label: "Qualidade da Refeição Abaixo do Esperado", category: "A&B", severity: "high" },
  { label: "Cardápio com Poucas Opções", category: "A&B", severity: "medium" },
  { label: "Comida Fria", category: "A&B", severity: "medium" },
  { label: "Bebida Inadequada", category: "A&B", severity: "low" },
  { label: "Falta de Variedade no Buffet", category: "A&B", severity: "medium" },
  { label: "Preço Elevado A&B", category: "A&B", severity: "medium" },
  { label: "Demora no Serviço de Mesa", category: "A&B", severity: "high" },
  { label: "Apresentação Inadequada", category: "A&B", severity: "low" },
  
  // Processos/Organização
  { label: "Check-in Demorado", category: "Processos", severity: "medium" },
  { label: "Falta de Informação Clara", category: "Processos", severity: "medium" },
  { label: "Processo Confuso", category: "Processos", severity: "medium" },
  { label: "Documentação Incompleta", category: "Processos", severity: "low" },
  { label: "Reserva com Problemas", category: "Processos", severity: "high" },
  { label: "Cobrança Incorreta", category: "Processos", severity: "critical" },
  { label: "Política Não Transparente", category: "Processos", severity: "medium" },
  
  // TI/Conectividade
  { label: "Wi-Fi Instável", category: "TI", severity: "high" },
  { label: "Sistema de Reservas Fora do Ar", category: "TI", severity: "critical" },
  { label: "Conexão Lenta", category: "TI", severity: "medium" },
  { label: "Falha em Aplicativo", category: "TI", severity: "medium" },
  { label: "Equipamento Digital Defeituoso", category: "TI", severity: "high" },
  { label: "Sinal Fraco", category: "TI", severity: "medium" },
  { label: "Plataforma Não Funcional", category: "TI", severity: "high" },
  
  // Outros
  { label: "Ruído Externo Afetando Experiência", category: "Ambiente", severity: "medium" },
  { label: "Comunicação Interna Falha", category: "Comunicação", severity: "medium" },
  { label: "Localização com Restrições", category: "Localização", severity: "low" },
  { label: "Acessibilidade Limitada", category: "Acessibilidade", severity: "high" },
  { label: "Segurança Insuficiente", category: "Segurança", severity: "critical" },
  { label: "Estacionamento Inadequado", category: "Estacionamento", severity: "medium" },
  
  // Casos Especiais
  { label: "VAZIO", category: "Especial", severity: "low" },
  { label: "Não Identificado", category: "Especial", severity: "low" },
  { label: "Sugestão de Melhoria", category: "Especial", severity: "low" },
  { label: "Elogio", category: "Especial", severity: "low" }
];

/**
 * Migra departamentos
 */
async function migrateDepartments(): Promise<void> {
  console.log('🏢 Migrando departamentos...');
  
  for (let i = 0; i < CURRENT_DEPARTMENTS.length; i++) {
    const dept = CURRENT_DEPARTMENTS[i];
    
    const department: Department = {
      id: dept.id,
      label: dept.label,
      description: dept.description,
      active: true,
      order: i + 1,
      created_at: Timestamp.now()
    };
    
    await setDoc(
      doc(db, NEW_COLLECTIONS.departments, dept.id),
      department
    );
    
    console.log(`✅ Departamento criado: ${dept.label}`);
  }
}

/**
 * Migra keywords com embeddings
 */
async function migrateKeywords(): Promise<void> {
  console.log('🔑 Migrando keywords...');
  
  // Preparar textos para gerar embeddings em lote
  const keywordTexts = CURRENT_KEYWORDS.map(k => 
    `${k.label} ${k.aliases.join(' ')}`
  );
  
  console.log('🧠 Gerando embeddings para keywords...');
  const embeddings = await generateBatchEmbeddings(keywordTexts);
  
  for (let i = 0; i < CURRENT_KEYWORDS.length; i++) {
    const kw = CURRENT_KEYWORDS[i];
    const keywordId = `kw_migrated_${Date.now()}_${i}`;
    
    // Gerar alguns exemplos automáticos
    const examples = [
      `Feedback sobre ${kw.label.toLowerCase()}`,
      `Comentário relacionado a ${kw.aliases[0] || kw.label}`,
    ];
    
    const keyword: Keyword = {
      id: keywordId,
      label: kw.label,
      department_id: kw.department_id,
      slug: generateSlug(kw.label),
      aliases: kw.aliases,
      description: `Keyword migrada do sistema anterior: ${kw.label}`,
      examples,
      embedding: embeddings[i],
      status: 'active',
      created_by: 'migration_script',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      version: 1
    };
    
    await setDoc(
      doc(db, NEW_COLLECTIONS.keywords, keywordId),
      keyword
    );
    
    console.log(`✅ Keyword criada: ${kw.label}`);
  }
}

/**
 * Migra problems com embeddings
 */
async function migrateProblems(): Promise<void> {
  console.log('⚠️ Migrando problems...');
  
  // Preparar textos para gerar embeddings em lote
  const problemTexts = CURRENT_PROBLEMS.map(p => 
    `${p.label} categoria ${p.category}`
  );
  
  console.log('🧠 Gerando embeddings para problems...');
  const embeddings = await generateBatchEmbeddings(problemTexts);
  
  for (let i = 0; i < CURRENT_PROBLEMS.length; i++) {
    const prob = CURRENT_PROBLEMS[i];
    const problemId = `pb_migrated_${Date.now()}_${i}`;
    
    // Gerar alguns exemplos automáticos
    const examples = [
      `Problema de ${prob.label.toLowerCase()}`,
      `Issue relacionada a ${prob.category.toLowerCase()}`,
    ];
    
    const problem: Problem = {
      id: problemId,
      label: prob.label,
      slug: generateSlug(prob.label),
      aliases: [prob.label.toLowerCase()],
      description: `Problema migrado: ${prob.label} (${prob.category})`,
      examples,
      embedding: embeddings[i],
      status: 'active',
      severity: prob.severity as any,
      category: prob.category,
      created_by: 'migration_script', 
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      version: 1
    };
    
    await setDoc(
      doc(db, NEW_COLLECTIONS.problems, problemId),
      problem
    );
    
    console.log(`✅ Problem criado: ${prob.label}`);
  }
}

/**
 * Cria meta informações
 */
async function createTaxonomyMeta(): Promise<void> {
  console.log('📊 Criando taxonomy meta...');
  
  const meta: TaxonomyMeta = {
    version: 1,
    updated_at: Timestamp.now(),
    updated_by: 'migration_script',
    departments_count: CURRENT_DEPARTMENTS.length,
    keywords_count: CURRENT_KEYWORDS.length,
    problems_count: CURRENT_PROBLEMS.length,
    last_embedding_update: Timestamp.now(),
    embedding_model: 'text-embedding-3-small'
  };
  
  await setDoc(
    doc(db, NEW_COLLECTIONS.meta, 'main'),
    meta
  );
  
  console.log('✅ Taxonomy meta criada');
}

/**
 * Executa migração completa
 */
export async function runMigration(): Promise<void> {
  try {
    console.log('🚀 Iniciando migração do sistema de taxonomy...');
    
    await migrateDepartments();
    await migrateKeywords();
    await migrateProblems();
    await createTaxonomyMeta();
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('📈 Estatísticas:');
    console.log(`   - Departamentos: ${CURRENT_DEPARTMENTS.length}`);
    console.log(`   - Keywords: ${CURRENT_KEYWORDS.length}`);  
    console.log(`   - Problems: ${CURRENT_PROBLEMS.length}`);
    console.log('');
    console.log('🔄 Próximos passos:');
    console.log('   1. Testar o novo sistema de classificação');
    console.log('   2. Migrar gradualmente do route.ts antigo para o novo');
    console.log('   3. Implementar painel administrativo para taxonomy');
    console.log('   4. Configurar Cloud Functions para auto-validação');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migração falhou:', error);
      process.exit(1);
    });
}