// Configurações de prioridade para problemas
export const PROBLEM_PRIORITIES = {
  // Problemas críticos (rating ≤ 2)
  CRITICAL: {
    rating: 2,
    color: 'red',
    urgency: 'ALTA',
    actionRequired: 'IMEDIATA'
  },
  
  // Problemas importantes (rating ≤ 3)
  HIGH: {
    rating: 3,
    color: 'orange', 
    urgency: 'MÉDIA',
    actionRequired: '7 DIAS'
  },
  
  // Problemas menores (rating > 3)
  MEDIUM: {
    rating: 5,
    color: 'yellow',
    urgency: 'BAIXA', 
    actionRequired: '30 DIAS'
  }
};

// Departamentos por ordem de impacto
export const DEPARTMENT_IMPACT_ORDER = [
  'A&B',
  'Recepção', 
  'Governança',
  'Manutenção',
  'TI',
  'Lazer',
  'Operações'
];

// Palavras-chave que indicam problemas graves
export const CRITICAL_KEYWORDS = [
  'não funciona',
  'quebrado',
  'sujo',
  'demora',
  'rude',
  'péssimo',
  'horrível',
  'inaceitável'
];

// Mapeamento de problem_detail para ações recomendadas
export const RECOMMENDED_ACTIONS: Record<string, string> = {
  'Wi-fi lento ou instável': 'Verificar infraestrutura de rede e considerar upgrade',
  'Ar-condicionado não resfria': 'Manutenção preventiva mensal nos aparelhos',
  'Demora no check-in': 'Implementar sistema de check-in antecipado',
  'Café da manhã sem variedade': 'Revisar cardápio semanal com chef',
  'Quarto mal limpo': 'Reforçar treinamento da equipe de limpeza',
  'Barulho excessivo': 'Implementar horários de silêncio e isolamento acústico',
  // Adicione mais conforme necessário
};