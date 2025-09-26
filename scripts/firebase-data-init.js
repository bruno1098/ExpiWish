// Script simplificado para popular o Firebase com dados iniciais
// Para ser executado no console do navegador ou como API route

const initializeFirebaseData = async () => {
  console.log('🚀 Iniciando população do Firebase...');
  
  const departments = [
    { id: 'A&B', label: 'A&B', description: 'Alimentos e Bebidas', active: true, order: 1 },
    { id: 'Limpeza', label: 'Limpeza', description: 'Governança e Limpeza', active: true, order: 2 },
    { id: 'Recepcao', label: 'Recepção', description: 'Atendimento e Check-in/out', active: true, order: 3 },
    { id: 'Manutencao', label: 'Manutenção', description: 'Estrutura e Equipamentos', active: true, order: 4 },
    { id: 'Tecnologia', label: 'Tecnologia', description: 'Wi-fi, TV, Sistemas', active: true, order: 5 },
    { id: 'Lazer', label: 'Lazer', description: 'Piscina, Academia, Entretenimento', active: true, order: 6 },
    { id: 'Operacoes', label: 'Operações', description: 'Operações Gerais', active: true, order: 7 }
  ];

  const keywords = [
    // A&B
    { id: 'kw_aeb_servico', label: 'A&B - Serviço', department_id: 'A&B', slug: 'aeb-servico', aliases: ['atendimento restaurante', 'garçom', 'serviço mesa', 'atendimento a&b'], status: 'active' },
    { id: 'kw_aeb_alimentos', label: 'A&B - Alimentos', department_id: 'A&B', slug: 'aeb-alimentos', aliases: ['comida', 'refeição', 'prato', 'alimento'], status: 'active' },
    { id: 'kw_aeb_bebidas', label: 'A&B - Bebidas', department_id: 'A&B', slug: 'aeb-bebidas', aliases: ['drinks', 'refrigerante', 'água', 'suco'], status: 'active' },
    { id: 'kw_aeb_cafe_manha', label: 'A&B - Café da Manhã', department_id: 'A&B', slug: 'aeb-cafe-manha', aliases: ['café da manhã', 'breakfast', 'café'], status: 'active' },
    
    // Limpeza
    { id: 'kw_limpeza_quarto', label: 'Limpeza - Quarto', department_id: 'Limpeza', slug: 'limpeza-quarto', aliases: ['limpeza', 'arrumação', 'governança'], status: 'active' },
    { id: 'kw_limpeza_banheiro', label: 'Limpeza - Banheiro', department_id: 'Limpeza', slug: 'limpeza-banheiro', aliases: ['banheiro sujo', 'toalhas'], status: 'active' },
    
    // Recepção
    { id: 'kw_recepcao_checkin', label: 'Recepção - Check-in', department_id: 'Recepcao', slug: 'recepcao-checkin', aliases: ['check-in', 'entrada', 'recepção'], status: 'active' },
    { id: 'kw_recepcao_checkout', label: 'Recepção - Check-out', department_id: 'Recepcao', slug: 'recepcao-checkout', aliases: ['check-out', 'saída'], status: 'active' },
    
    // Tecnologia
    { id: 'kw_tech_wifi', label: 'Tecnologia - Wi-fi', department_id: 'Tecnologia', slug: 'tecnologia-wifi', aliases: ['wifi', 'internet', 'conexão'], status: 'active' },
    { id: 'kw_tech_tv', label: 'Tecnologia - TV', department_id: 'Tecnologia', slug: 'tecnologia-tv', aliases: ['televisão', 'tv', 'canais'], status: 'active' },
  ];

  const problems = [
    // Problemas gerais
    { id: 'pb_demora_atendimento', label: 'Demora no Atendimento', slug: 'demora-atendimento', aliases: ['demorado', 'lento', 'demora'], category: 'Atendimento', severity: 'medium', status: 'active' },
    { id: 'pb_qualidade_baixa', label: 'Qualidade Abaixo do Esperado', slug: 'qualidade-baixa', aliases: ['ruim', 'péssimo', 'baixa qualidade'], category: 'Qualidade', severity: 'high', status: 'active' },
    { id: 'pb_temperatura_inadequada', label: 'Temperatura Inadequada', slug: 'temperatura-inadequada', aliases: ['frio', 'quente', 'temperatura'], category: 'Qualidade', severity: 'medium', status: 'active' },
    { id: 'pb_falta_limpeza', label: 'Falta de Limpeza', slug: 'falta-limpeza', aliases: ['sujo', 'sujeira', 'mal limpo'], category: 'Limpeza', severity: 'high', status: 'active' },
    { id: 'pb_nao_funciona', label: 'Não Funcionando', slug: 'nao-funciona', aliases: ['quebrado', 'defeito', 'não funciona'], category: 'Estrutura', severity: 'high', status: 'active' },
    { id: 'pb_indisponivel', label: 'Indisponível', slug: 'indisponivel', aliases: ['sem', 'falta', 'não tinha'], category: 'Disponibilidade', severity: 'medium', status: 'active' },
  ];

  const firebaseData = {
    departments,
    keywords,
    problems,
    meta: {
      version: 1,
      updated_at: new Date(),
      updated_by: 'migration_script',
      departments_count: departments.length,
      keywords_count: keywords.length,
      problems_count: problems.length,
      embedding_model: 'text-embedding-3-small'
    },
    config: {
      embedding_model: 'text-embedding-3-small',
      similarity_threshold: 0.85,
      recall_top_n: 10,
      min_confidence_threshold: 0.5,
      auto_approve_threshold: 0.95,
      max_aliases_per_item: 10,
      max_examples_per_item: 5,
      cache_expiry_minutes: 30
    }
  };

  console.log('📊 Dados preparados:', {
    departments: departments.length,
    keywords: keywords.length,  
    problems: problems.length
  });

  return firebaseData;
};

// Para usar no console:
// const data = await initializeFirebaseData();
// console.log('Dados prontos:', data);

export default initializeFirebaseData;