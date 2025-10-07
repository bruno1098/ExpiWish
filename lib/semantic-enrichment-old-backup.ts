/**
 * Sistema de Enriquecimento Semântico
 * 
 * Melhora a qualidade dos embeddings adicionando contexto rico,
 * sinônimos e variações linguísticas para cada keyword/problem.
 */

/**
 * Dicionário de contexto semântico para Keywords
 * 
 * Para cada keyword, define:
 * - Sinônimos: palavras equivalentes
 * - Contexto: termos relacionados que aparecem junto
 * - Variações: formas coloquiais/informais
 */
export const KEYWORD_SEMANTIC_CONTEXT: Record<string, {
  synonyms: string[];
  related_terms: string[];
  colloquial_variations: string[];
  examples: string[];
}> = {
  // ========== A&B (ALIMENTOS & BEBIDAS) ==========
  "A&B - Café da manhã": {
    synonyms: ["breakfast", "desjejum", "primeira refeição", "café"],
    related_terms: [
      "comida", "refeição", "buffet", "alimento", "alimentação",
      "pão", "bolo", "fruta", "suco", "leite", "queijo", "presunto",
      "ovo", "tapioca", "crepioca", "iogurte", "cereal", "granola",
      "café preto", "café com leite", "chá", "achocolatado"
    ],
    colloquial_variations: [
      "café da manhã", "café", "breakfast", "manhã", "comida da manhã",
      "refeição da manhã", "buffet de manhã", "buffet do café"
    ],
    examples: [
      "café da manhã estava delicioso",
      "comida do café muito boa",
      "buffet da manhã variado",
      "breakfast excelente",
      "pães fresquinhos no café",
      "frutas frescas no café da manhã"
    ]
  },

  "A&B - Gastronomia": {
    synonyms: ["culinária", "cozinha", "comida", "alimentação", "food"],
    related_terms: [
      "comida", "prato", "refeição", "sabor", "tempero", "qualidade",
      "delicioso", "saboroso", "gostoso", "bem feito", "bem preparado",
      "fresco", "quentinho", "temperatura", "apresentação", "porção"
    ],
    colloquial_variations: [
      "comida", "comidinha", "comidona", "pratão", "almoço", "janta",
      "jantar", "refeição", "comidinha boa", "comida boa demais"
    ],
    examples: [
      "comida estava deliciosa",
      "pratos muito bem feitos",
      "gastronomia excelente",
      "comida de qualidade",
      "tempero perfeito",
      "sabor incrível"
    ]
  },

  "A&B - Serviço": {
    synonyms: ["atendimento restaurante", "serviço restaurante", "service", "staff A&B"],
    related_terms: [
      "garçom", "garçonete", "atendente", "funcionário", "staff",
      "atendimento", "serviço", "prestativo", "atencioso", "educado",
      "simpático", "cordial", "rápido", "eficiente", "solicito",
      "restaurante", "bar", "mesa", "pedido", "conta"
    ],
    colloquial_variations: [
      "garçom", "moço", "moça", "atendente", "pessoal do restaurante",
      "funcionário do bar", "staff", "equipe", "quem atende", "bar"
    ],
    examples: [
      "atendimento do garçom excelente",
      "garçom muito atencioso",
      "atendimento do restaurante excelente",
      "funcionários educados no café",
      "staff do bar prestativo",
      "serviço rápido e eficiente",
      "atendentes simpáticos",
      "equipe do restaurante muito boa"
    ]
  },

  "A&B - Variedade": {
    synonyms: ["diversidade", "opções", "variedade", "escolha", "variety"],
    related_terms: [
      "opções", "variedade", "diversidade", "escolha", "cardápio",
      "menu", "pratos", "tipos", "diferentes", "variado",
      "pouca", "muita", "faltando", "limitado", "restrito"
    ],
    colloquial_variations: [
      "variedade", "opções", "escolha", "tipos", "tem pouco",
      "tem muito", "falta", "poderia ter mais"
    ],
    examples: [
      "pouca variedade no café",
      "faltou opções vegetarianas",
      "cardápio limitado",
      "pouca escolha de pratos",
      "variedade excelente",
      "muitas opções no buffet"
    ]
  },

  "A&B - Almoço": {
    synonyms: ["lunch", "refeição do meio-dia", "almoço"],
    related_terms: [
      "almoço", "almoçar", "meio-dia", "12h", "lunch",
      "comida", "prato", "refeição", "restaurante"
    ],
    colloquial_variations: ["almoço", "almoçar", "comida do meio-dia"],
    examples: [
      "almoço estava ótimo",
      "comida do almoço deliciosa",
      "restaurante no almoço"
    ]
  },

  "A&B - Jantar": {
    synonyms: ["dinner", "refeição da noite", "jantar", "janta"],
    related_terms: [
      "jantar", "janta", "jantar", "noite", "dinner",
      "comida", "prato", "refeição", "restaurante"
    ],
    colloquial_variations: ["jantar", "janta", "comida da noite"],
    examples: [
      "jantar estava ótimo",
      "comida do jantar deliciosa",
      "restaurante no jantar"
    ]
  },

  // ========== LIMPEZA / GOVERNANÇA ==========
  "Limpeza - Quarto": {
    synonyms: ["arrumação", "higiene", "cleaning", "housekeeping"],
    related_terms: [
      "quarto", "acomodação", "suite", "apartamento",
      "limpo", "sujo", "arrumado", "bagunçado", "organizado",
      "camareira", "governança", "limpeza", "arrumação",
      "cama", "lençol", "toalha", "banheiro", "chão", "poeira"
    ],
    colloquial_variations: [
      "quarto sujo", "quarto limpo", "quarto mal arrumado",
      "não arrumaram", "limpeza do quarto", "arrumação"
    ],
    examples: [
      "quarto estava sujo",
      "falta de limpeza no quarto",
      "quarto mal arrumado",
      "camareira não passou",
      "quarto limpíssimo",
      "arrumação perfeita"
    ]
  },

  "Limpeza - Banheiro": {
    synonyms: ["higiene do banheiro", "limpeza sanitária"],
    related_terms: [
      "banheiro", "sanitário", "toalete", "lavabo", "wc",
      "limpo", "sujo", "cheiroso", "mal cheiroso", "fedendo",
      "pia", "vaso", "box", "chuveiro", "azulejo", "espelho"
    ],
    colloquial_variations: [
      "banheiro sujo", "banheiro limpo", "banheiro fedendo",
      "banheiro mal limpo", "wc sujo"
    ],
    examples: [
      "banheiro estava sujo",
      "falta de limpeza no banheiro",
      "banheiro mal cheiroso",
      "sanitário impecável",
      "banheiro limpíssimo"
    ]
  },

  // ========== TECNOLOGIA / TI ==========
  "Tecnologia - Wi-fi": {
    synonyms: ["internet", "wifi", "wireless", "conexão", "rede"],
    related_terms: [
      "wifi", "wi-fi", "internet", "conexão", "rede", "wireless",
      "lento", "rápido", "não funciona", "não pega", "não conecta",
      "senha", "sinal", "fraco", "forte", "instável", "cai"
    ],
    colloquial_variations: [
      "wifi", "wi-fi", "internet", "net", "conexão",
      "não pega", "não funciona", "cai", "lento demais"
    ],
    examples: [
      "wifi não funcionava",
      "internet muito lenta",
      "wi-fi instável",
      "conexão péssima",
      "não consegui conectar",
      "sinal fraco",
      "internet excelente",
      "wifi rápido"
    ]
  },

  "Tecnologia - TV": {
    synonyms: ["televisão", "televisor", "tv a cabo"],
    related_terms: [
      "tv", "televisão", "televisor", "canais", "controle",
      "não funciona", "não liga", "sem sinal", "cabo", "smart tv"
    ],
    colloquial_variations: [
      "tv", "televisão", "não liga", "não funciona", "sem canal"
    ],
    examples: [
      "tv não funcionava",
      "televisão sem sinal",
      "poucos canais",
      "tv excelente"
    ]
  },

  // ========== MANUTENÇÃO ==========
  "Manutenção - Ar-condicionado": {
    synonyms: ["climatização", "ar condicionado", "AC"],
    related_terms: [
      "ar condicionado", "ar", "climatização", "temperatura",
      "frio", "quente", "gelado", "não funciona", "quebrado",
      "barulhento", "ruidoso", "pingando", "vazando"
    ],
    colloquial_variations: [
      "ar", "ar condicionado", "ar-condicionado", "climatização",
      "não funciona", "não gela", "não esquenta", "quebrado"
    ],
    examples: [
      "ar condicionado não funcionava",
      "ar não gelava",
      "climatização ruim",
      "ar barulhento",
      "ar quebrado",
      "ar perfeito"
    ]
  },

  "Manutenção - Chuveiro": {
    synonyms: ["ducha", "banho"],
    related_terms: [
      "chuveiro", "ducha", "banho", "água",
      "quente", "frio", "morno", "gelado", "pingando",
      "não funciona", "entupido", "fraco", "forte", "pressão"
    ],
    colloquial_variations: [
      "chuveiro", "ducha", "banho", "água do banho",
      "não sai água quente", "chuveiro frio", "chuveiro pingando"
    ],
    examples: [
      "chuveiro não tinha água quente",
      "água do banho fria",
      "chuveiro pingando",
      "pressão fraca",
      "chuveiro excelente"
    ]
  },

  // ========== RECEPÇÃO ==========
  "Recepção - Atendimento": {
    synonyms: ["front desk", "atendimento recepção", "recepcionista"],
    related_terms: [
      "recepção", "recepcionista", "front desk", "atendimento",
      "check-in", "check-out", "entrada", "saída",
      "funcionário", "atendente", "staff", "educado", "prestativo",
      "rápido", "demorado", "eficiente", "cordial", "simpático"
    ],
    colloquial_variations: [
      "recepção", "recepcionista", "moça da recepção",
      "rapaz da recepção", "pessoal da entrada"
    ],
    examples: [
      "recepcionista muito educada",
      "atendimento da recepção excelente",
      "staff da recepção prestativo",
      "recepção atenciosa",
      "atendimento rápido na entrada"
    ]
  },

  "Recepção - Check-in": {
    synonyms: ["entrada", "chegada", "registro"],
    related_terms: [
      "check-in", "check in", "entrada", "chegada", "registro",
      "recepção", "demorado", "rápido", "eficiente", "fila",
      "processo", "cadastro"
    ],
    colloquial_variations: [
      "check-in", "check in", "entrada", "chegada",
      "demorou muito", "foi rápido"
    ],
    examples: [
      "check-in demorado",
      "processo de entrada lento",
      "check-in eficiente",
      "chegada rápida"
    ]
  },

  "Recepção - Check-out": {
    synonyms: ["saída", "partida", "encerramento"],
    related_terms: [
      "check-out", "check out", "saída", "partida", "encerramento",
      "recepção", "demorado", "rápido", "eficiente", "conta"
    ],
    colloquial_variations: [
      "check-out", "check out", "saída", "partida",
      "demorou muito", "foi rápido"
    ],
    examples: [
      "check-out demorado",
      "processo de saída lento",
      "check-out eficiente",
      "saída rápida"
    ]
  },

  // ========== OPERAÇÕES (GENÉRICO) ==========
  "Atendimento": {
    synonyms: ["serviço", "service", "staff", "equipe"],
    related_terms: [
      "atendimento", "serviço", "staff", "equipe", "funcionário",
      "pessoal", "time", "colaborador", "atendente",
      "educado", "prestativo", "atencioso", "cordial", "simpático",
      "rude", "grosseiro", "mal educado", "antipático"
    ],
    colloquial_variations: [
      "atendimento", "pessoal", "funcionários", "staff",
      "equipe", "galera", "pessoal do hotel"
    ],
    examples: [
      "atendimento excelente",
      "equipe muito prestativa",
      "staff educado",
      "funcionários atenciosos",
      "pessoal cordial",
      "atendimento péssimo"
    ]
  },

  // ========== PRODUTO ==========
  "Localização": {
    synonyms: ["location", "posição", "situação", "lugar"],
    related_terms: [
      "localização", "localizado", "localizaçao", "location",
      "perto", "próximo", "longe", "distante", "acesso",
      "bem localizado", "mal localizado", "região", "área",
      "praia", "centro", "shopping", "aeroporto", "pontos turísticos",
      "restaurantes", "bares", "comércio", "fácil", "difícil"
    ],
    colloquial_variations: [
      "localização", "onde fica", "lugar", "posição",
      "bem localizado", "mal localizado", "perto de",
      "longe de", "fica perto", "fica longe"
    ],
    examples: [
      "hotel bem localizado",
      "localização perfeita",
      "perto da praia",
      "próximo ao centro",
      "longe de tudo",
      "mal localizado",
      "localização excelente"
    ]
  },

  "Experiência": {
    synonyms: ["estadia", "hospedagem", "stay", "vivência"],
    related_terms: [
      "experiência", "estadia", "hospedagem", "stay", "permanência",
      "geral", "gostei", "adorei", "amei", "recomendo",
      "voltarei", "voltaria", "perfeito", "maravilhoso", "excelente",
      "ótimo", "bom", "ruim", "péssimo", "incrível", "fantástico"
    ],
    colloquial_variations: [
      "tudo", "no geral", "experiência", "estadia",
      "adorei", "amei", "gostei muito", "não gostei"
    ],
    examples: [
      "experiência maravilhosa",
      "adorei tudo",
      "hotel incrível",
      "estadia perfeita",
      "gostei muito",
      "recomendo",
      "no geral foi ótimo"
    ]
  },

  "Custo-benefício": {
    synonyms: ["valor", "preço", "price", "cost"],
    related_terms: [
      "preço", "valor", "custo", "caro", "barato",
      "vale a pena", "não vale", "justo", "injusto",
      "benefício", "custo-benefício", "dinheiro"
    ],
    colloquial_variations: [
      "preço", "valor", "caro", "barato",
      "vale a pena", "não vale", "caro demais"
    ],
    examples: [
      "preço justo",
      "vale muito a pena",
      "caro para o que oferece",
      "barato demais",
      "custo-benefício excelente"
    ]
  },

  // ========== LAZER ==========
  "Lazer - Piscina": {
    synonyms: ["pool", "piscinas", "área de lazer"],
    related_terms: [
      "piscina", "pool", "natação", "nadar",
      "limpa", "suja", "água", "temperatura",
      "aquecida", "fria", "gelada", "quentinha"
    ],
    colloquial_variations: [
      "piscina", "piscininha", "área de lazer com piscina"
    ],
    examples: [
      "piscina estava limpa",
      "água da piscina gelada",
      "piscina aquecida ótima",
      "piscina suja"
    ]
  },

  "Lazer - Academia": {
    synonyms: ["gym", "fitness", "sala de musculação"],
    related_terms: [
      "academia", "gym", "fitness", "musculação",
      "exercício", "treino", "equipamentos", "aparelhos"
    ],
    colloquial_variations: [
      "academia", "gym", "sala de musculação"
    ],
    examples: [
      "academia bem equipada",
      "gym excelente",
      "equipamentos de qualidade"
    ]
  }
};

/**
 * Dicionário de contexto semântico para Problems
 */
export const PROBLEM_SEMANTIC_CONTEXT: Record<string, {
  synonyms: string[];
  indicators: string[]; // Palavras que indicam este problema
  negative_patterns: string[]; // Padrões negativos específicos
  examples: string[];
}> = {
  "Demora no Atendimento": {
    synonyms: ["lentidão", "demora", "delay", "espera"],
    indicators: [
      "demorou", "demora", "lento", "devagar", "esperando",
      "esperei", "aguardando", "tempo", "minutos", "horas",
      "nunca chegou", "não veio", "tardou"
    ],
    negative_patterns: [
      "demorou muito", "muito tempo", "tempo demais",
      "esperando horas", "nunca chegou", "tardou demais"
    ],
    examples: [
      "demorou muito para atender",
      "esperamos horas",
      "atendimento muito lento",
      "tardou demais"
    ]
  },

  "Falta de Limpeza": {
    synonyms: ["sujeira", "falta de higiene", "imundície"],
    indicators: [
      "sujo", "suja", "limpo", "limpeza", "imundo",
      "nojento", "fedendo", "mal cheiroso", "porco",
      "não limparam", "não arrumaram", "bagunçado"
    ],
    negative_patterns: [
      "muito sujo", "estava sujo", "sujo demais",
      "falta de limpeza", "não limpo", "mal limpo"
    ],
    examples: [
      "quarto estava sujo",
      "falta de limpeza",
      "muito sujo e mal cheiroso",
      "não limparam o banheiro"
    ]
  },

  "Equipamento com Falha": {
    synonyms: ["quebrado", "com defeito", "não funciona"],
    indicators: [
      "quebrado", "não funciona", "não funcionava", "defeito",
      "com problema", "parado", "não liga", "não ligava",
      "estragado", "danificado"
    ],
    negative_patterns: [
      "não funciona", "não funcionava", "quebrado",
      "com defeito", "não liga"
    ],
    examples: [
      "ar condicionado quebrado",
      "chuveiro não funcionava",
      "tv com defeito",
      "wifi não funciona"
    ]
  },

  "Qualidade da Refeição Abaixo do Esperado": {
    synonyms: ["comida ruim", "qualidade baixa", "mal preparado"],
    indicators: [
      "ruim", "péssimo", "horrível", "terrível", "intragável",
      "sem sabor", "sem gosto", "sem tempero", "fria", "frio",
      "mal feito", "mal preparado", "queimado", "cru"
    ],
    negative_patterns: [
      "comida ruim", "comida péssima", "sem sabor",
      "qualidade baixa", "mal feito", "estava fria"
    ],
    examples: [
      "comida estava ruim",
      "refeição péssima",
      "sem sabor nenhum",
      "comida fria e sem tempero"
    ]
  },

  "Wi-Fi Instável": {
    synonyms: ["internet ruim", "conexão ruim", "wifi lento"],
    indicators: [
      "lento", "lenta", "não funciona", "não pega",
      "cai", "caindo", "instável", "fraco", "ruim",
      "não conecta", "não consegui"
    ],
    negative_patterns: [
      "wifi não funciona", "internet lenta", "muito lento",
      "sempre cai", "não pega", "instável"
    ],
    examples: [
      "wifi muito lento",
      "internet sempre caindo",
      "não consegui conectar",
      "sinal fraco demais"
    ]
  },

  "Preço Alto": {
    synonyms: ["caro", "preço elevado", "valor alto"],
    indicators: [
      "caro", "cara", "preço alto", "muito caro",
      "preço elevado", "não vale", "valor alto"
    ],
    negative_patterns: [
      "muito caro", "caro demais", "preço alto",
      "não vale a pena"
    ],
    examples: [
      "muito caro para o que oferece",
      "preço alto demais",
      "não vale a pena pelo valor"
    ]
  },

  "Ruído Excessivo": {
    synonyms: ["barulho", "barulhento", "ruidoso"],
    indicators: [
      "barulho", "barulhento", "ruído", "ruidoso",
      "alto", "música alta", "som alto", "não consegui dormir"
    ],
    negative_patterns: [
      "muito barulho", "barulhento demais", "ruído excessivo",
      "não consegui dormir"
    ],
    examples: [
      "muito barulho à noite",
      "quarto barulhento",
      "não consegui dormir com o ruído"
    ]
  },

  "Falta de Variedade": {
    synonyms: ["pouca opção", "limitado", "restrito"],
    indicators: [
      "pouco", "pouca", "falta", "faltou", "limitado",
      "restrito", "sem opção", "poucas opções"
    ],
    negative_patterns: [
      "pouca variedade", "faltou opções", "muito limitado",
      "pouca escolha"
    ],
    examples: [
      "pouca variedade no café",
      "faltou opções vegetarianas",
      "cardápio muito limitado"
    ]
  }
};

/**
 * Gera texto enriquecido para embedding de uma keyword
 */
export function generateEnrichedKeywordText(keywordLabel: string): string {
  const context = KEYWORD_SEMANTIC_CONTEXT[keywordLabel];
  
  if (!context) {
    // Se não tem contexto definido, retorna apenas o label
    return keywordLabel;
  }

  // Monta texto rico com todos os elementos de contexto
  const parts = [
    keywordLabel, // Label original
    ...context.synonyms,
    ...context.related_terms,
    ...context.colloquial_variations,
    ...context.examples
  ];

  // Retorna texto concatenado (OpenAI normaliza automaticamente)
  return parts.join(' | ');
}

/**
 * Gera texto enriquecido para embedding de um problem
 */
export function generateEnrichedProblemText(problemLabel: string): string {
  const context = PROBLEM_SEMANTIC_CONTEXT[problemLabel];
  
  if (!context) {
    return problemLabel;
  }

  const parts = [
    problemLabel,
    ...context.synonyms,
    ...context.indicators,
    ...context.negative_patterns,
    ...context.examples
  ];

  return parts.join(' | ');
}

/**
 * Expande query do usuário com sinônimos e variações
 * 
 * Exemplo: "comida" → "comida refeição prato alimento gastronomia"
 */
export function expandUserQuery(userText: string): string {
  const textLower = userText.toLowerCase();
  const expansions: string[] = [userText]; // Sempre incluir texto original

  // Mapeamento de termos comuns → expansões
  const commonExpansions: Record<string, string[]> = {
    // Comida
    "comida": ["refeição", "prato", "alimento", "gastronomia", "alimentação"],
    "café da manhã": ["breakfast", "café", "manhã", "desjejum", "primeira refeição"],
    "almoço": ["lunch", "meio-dia", "refeição do meio-dia"],
    "jantar": ["janta", "dinner", "refeição da noite"],
    
    // Atendimento
    "garçom": ["garçonete", "atendente", "funcionário do restaurante", "staff A&B"],
    "atendimento": ["serviço", "staff", "equipe", "funcionários"],
    "recepcionista": ["recepção", "front desk", "atendente da recepção"],
    
    // Limpeza
    "quarto sujo": ["falta de limpeza", "quarto mal limpo", "limpeza ruim"],
    "limpo": ["limpeza", "arrumado", "organizado", "higienizado"],
    
    // Tecnologia
    "wifi": ["wi-fi", "internet", "conexão", "rede", "wireless"],
    "internet": ["wifi", "wi-fi", "conexão", "net"],
    
    // Manutenção
    "ar condicionado": ["ar", "climatização", "AC"],
    "chuveiro": ["ducha", "banho", "água do banho"],
    
    // Localização
    "localização": ["localizado", "lugar", "perto", "próximo", "região"],
    "perto": ["próximo", "perto de", "ao lado"],
    
    // Genéricos
    "muito bom": ["excelente", "ótimo", "maravilhoso", "perfeito"],
    "ruim": ["péssimo", "horrível", "terrível", "mal"],
    "quebrado": ["não funciona", "com defeito", "estragado"]
  };

  // Procurar termos que devem ser expandidos
  for (const [term, synonyms] of Object.entries(commonExpansions)) {
    if (textLower.includes(term)) {
      expansions.push(...synonyms);
    }
  }

  // Retornar texto expandido (sem duplicatas)
  return Array.from(new Set(expansions)).join(' ');
}
