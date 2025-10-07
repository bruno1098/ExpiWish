/**
 * Sistema de Enriquecimento Semântico - ATUALIZADO
 * 
 * Taxonomia: 44 keywords organizadas em 10 departamentos
 * Última atualização: 04/10/2025
 */

/**
 * Dicionário de contexto semântico para Keywords
 */
export const KEYWORD_SEMANTIC_CONTEXT: Record<string, {
  synonyms: string[];
  related_terms: string[];
  colloquial_variations: string[];
  examples: string[];
}> = {
  // ========== A&B (ALIMENTOS & BEBIDAS) - 6 keywords ==========
  
  "A&B - Café da manhã": {
    synonyms: ["breakfast", "desjejum", "primeira refeição", "café"],
    related_terms: [
      "comida", "refeição", "buffet", "alimento", "pão", "bolo", "fruta", 
      "suco", "leite", "queijo", "presunto", "ovo", "tapioca", "iogurte", 
      "cereal", "granola", "café preto", "café com leite", "chá"
    ],
    colloquial_variations: [
      "café da manhã", "café", "breakfast", "manhã", "buffet da manhã"
    ],
    examples: [
      "café da manhã estava delicioso",
      "buffet da manhã variado",
      "breakfast excelente"
    ]
  },

  "A&B - Jantar": {
    synonyms: ["dinner", "janta", "refeição da noite", "jantar"],
    related_terms: [
      "comida", "prato", "refeição", "noite", "restaurante", "menu", 
      "cardápio", "jantar", "ceia"
    ],
    colloquial_variations: [
      "jantar", "janta", "comida da noite", "dinner"
    ],
    examples: [
      "jantar estava ótimo",
      "comida do jantar deliciosa",
      "restaurante no jantar excelente"
    ]
  },

  "A&B - Almoço": {
    synonyms: ["lunch", "refeição do meio-dia", "almoço"],
    related_terms: [
      "comida", "prato", "refeição", "meio-dia", "restaurante", "menu"
    ],
    colloquial_variations: [
      "almoço", "almoçar", "comida do meio-dia", "lunch"
    ],
    examples: [
      "almoço estava ótimo",
      "comida do almoço deliciosa"
    ]
  },

  "A&B - Serviço": {
    synonyms: ["atendimento restaurante", "serviço restaurante", "staff A&B"],
    related_terms: [
      "garçom", "garçonete", "atendente", "funcionário", "staff",
      "atendimento", "serviço", "prestativo", "atencioso", "educado",
      "preço", "cardápio", "menu", "variedade", "opções",
      "restaurante", "bar", "café da manhã", "maître", "recepção do restaurante"
    ],
    colloquial_variations: [
      "garçom", "moço", "moça", "atendente", "pessoal do restaurante"
    ],
    examples: [
      "garçom muito atencioso",
      "atendimento do restaurante excelente",
      "atendente do café da manhã muito educada",
      "recepção do restaurante com serviço impecável",
      "maître do restaurante prestativo",
      "preço justo no restaurante",
      "cardápio variado"
    ]
  },

  "A&B - Gastronomia": {
    synonyms: ["culinária", "cozinha", "comida", "alimentação", "food"],
    related_terms: [
      "comida", "prato", "refeição", "sabor", "tempero", "qualidade",
      "delicioso", "saboroso", "gostoso", "bem feito", "fresco"
    ],
    colloquial_variations: [
      "comida", "comidinha", "pratão", "refeição"
    ],
    examples: [
      "comida estava deliciosa",
      "pratos muito bem feitos",
      "gastronomia excelente"
    ]
  },

  "A&B - Room Service": {
    synonyms: ["serviço de quarto", "room service", "comida no quarto"],
    related_terms: [
      "quarto", "pedido", "entrega", "telefone", "cardápio",
      "comida", "bebida", "atendimento", "demora", "rápido"
    ],
    colloquial_variations: [
      "room service", "comida no quarto", "pedido no quarto"
    ],
    examples: [
      "room service rápido",
      "comida no quarto deliciosa",
      "serviço de quarto eficiente"
    ]
  },

  // ========== GOVERNANÇA (LIMPEZA) - 6 keywords ==========
  
  "Limpeza - Banheiro": {
    synonyms: ["higiene do banheiro", "limpeza sanitária"],
    related_terms: [
      "banheiro limpo", "banheiro sujo", "sanitário limpo", "toalete limpo", 
      "lavabo limpo", "pia suja", "vaso sujo", "box sujo", "chuveiro sujo",
      "azulejo sujo", "espelho sujo", "higiene", "sujeira", "limpar"
    ],
    colloquial_variations: [
      "banheiro sujo", "banheiro limpo", "wc sujo", "lavabo sujo"
    ],
    examples: [
      "banheiro estava sujo",
      "falta de limpeza no banheiro",
      "banheiro limpíssimo",
      "pia do banheiro suja"
    ]
  },

  "Limpeza - Quarto": {
    synonyms: ["arrumação", "higiene", "cleaning", "housekeeping"],
    related_terms: [
      "quarto limpo", "quarto sujo", "acomodação limpa", "arrumado", "bagunçado",
      "camareira", "governança", "cama suja", "lençol sujo", "toalha suja", 
      "chão sujo", "poeira", "sujeira", "limpeza", "arrumação"
    ],
    colloquial_variations: [
      "quarto sujo", "quarto limpo", "arrumação", "camareira"
    ],
    examples: [
      "quarto estava sujo",
      "falta de limpeza no quarto",
      "quarto limpíssimo",
      "camareira não limpou"
    ]
  },

  "Limpeza - Áreas sociais": {
    synonyms: ["limpeza áreas comuns", "higiene espaços comuns"],
    related_terms: [
      "lobby", "recepção", "corredor", "elevador", "piscina", "academia",
      "restaurante", "limpo", "sujo", "organizado"
    ],
    colloquial_variations: [
      "áreas comuns", "espaços comuns", "lobby"
    ],
    examples: [
      "áreas comuns sempre limpas",
      "lobby organizado",
      "espaços bem cuidados"
    ]
  },

  "Limpeza - Enxoval": {
    synonyms: ["roupa de cama", "lençóis", "toalhas"],
    related_terms: [
      "lençol", "toalha", "fronha", "cobertor", "travesseiro",
      "limpo", "sujo", "manchado", "rasgado", "novo", "velho"
    ],
    colloquial_variations: [
      "lençol", "toalha", "roupa de cama"
    ],
    examples: [
      "lençóis limpos",
      "toalhas macias",
      "enxoval de qualidade"
    ]
  },

  "Limpeza - Amenities": {
    synonyms: ["amenidades", "produtos de banho", "itens de cortesia"],
    related_terms: [
      "shampoo", "sabonete", "condicionador", "creme", "gel",
      "escova", "pente", "cotonete", "qualidade", "falta"
    ],
    colloquial_variations: [
      "amenities", "produtos", "itens de banho"
    ],
    examples: [
      "amenities de qualidade",
      "produtos de banho bons",
      "faltou shampoo"
    ]
  },

  "Limpeza - Frigobar": {
    synonyms: ["frigobar", "minibar", "geladeira do quarto"],
    related_terms: [
      "frigobar", "bebida", "água", "refrigerante", "cerveja",
      "limpo", "sujo", "gelado", "quente", "preço", "caro"
    ],
    colloquial_variations: [
      "frigobar", "geladeira", "minibar"
    ],
    examples: [
      "frigobar limpo",
      "bebidas geladas",
      "preço alto no frigobar"
    ]
  },

  // ========== MANUTENÇÃO - 6 keywords ==========
  
  "Manutenção - Ar-condicionado": {
    synonyms: ["climatização", "ar condicionado", "AC"],
    related_terms: [
      "ar", "temperatura", "frio", "quente", "gelado", "não funciona",
      "quebrado", "barulhento", "ruidoso", "pingando", "vazando"
    ],
    colloquial_variations: [
      "ar", "ar condicionado", "climatização"
    ],
    examples: [
      "ar condicionado não funcionava",
      "ar não gelava",
      "ar barulhento"
    ]
  },

  "Manutenção - Banheiro": {
    synonyms: ["reparo banheiro", "conserto banheiro"],
    related_terms: [
      "chuveiro", "torneira", "vaso", "descarga", "ralo",
      "vazamento", "entupido", "quebrado", "pingando"
    ],
    colloquial_variations: [
      "chuveiro quebrado", "vaso entupido", "torneira pingando"
    ],
    examples: [
      "chuveiro não funcionava",
      "vaso sanitário entupido",
      "torneira pingando"
    ]
  },

  "Manutenção - Instalações": {
    synonyms: ["infraestrutura", "estrutura física", "instalações", "espaço", "tamanho"],
    related_terms: [
      "parede", "teto", "piso", "porta", "janela", "fechadura",
      "rachadura", "infiltração", "mofo", "umidade",
      "banheiro apertado", "banheiro pequeno", "banheiro estreito",
      "quarto apertado", "quarto pequeno", "quarto estreito",
      "espaço", "tamanho", "dimensão", "apertado", "pequeno", "estreito",
      "área", "amplo", "grande", "reduzido", "compacto"
    ],
    colloquial_variations: [
      "infraestrutura", "estrutura", "instalações", "apertado", "pequeno"
    ],
    examples: [
      "instalações precisam de reforma",
      "infraestrutura antiga",
      "parede com infiltração",
      "banheiro muito apertado",
      "quarto pequeno demais",
      "espaço reduzido"
    ]
  },

  "Manutenção - Quarto": {
    synonyms: ["reparo quarto", "conserto quarto"],
    related_terms: [
      "tv", "controle", "tomada", "luz", "lâmpada", "cortina",
      "persiana", "fechadura", "porta", "janela", "não funciona"
    ],
    colloquial_variations: [
      "tv não funciona", "luz queimada", "tomada quebrada"
    ],
    examples: [
      "tv não ligava",
      "lâmpada queimada",
      "tomada não funcionava"
    ]
  },

  "Manutenção - Elevador": {
    synonyms: ["elevadores", "ascensor"],
    related_terms: [
      "elevador", "não funciona", "quebrado", "lento", "demora",
      "parado", "fora de serviço", "escada"
    ],
    colloquial_variations: [
      "elevador", "elevadores", "lift"
    ],
    examples: [
      "elevador não funcionava",
      "elevadores sempre quebrados",
      "demora no elevador"
    ]
  },

  "Manutenção - Jardinagem": {
    synonyms: ["jardim", "paisagismo", "área verde"],
    related_terms: [
      "jardim", "planta", "grama", "árvore", "flor",
      "bem cuidado", "mal cuidado", "bonito", "feio"
    ],
    colloquial_variations: [
      "jardim", "área verde", "paisagem"
    ],
    examples: [
      "jardim bem cuidado",
      "área verde bonita",
      "plantas bonitas"
    ]
  },

  // ========== RECEPÇÃO - 4 keywords ==========
  
  "Recepção - Estacionamento": {
    synonyms: ["garagem", "vaga", "parking"],
    related_terms: [
      "estacionamento", "garagem", "vaga", "carro", "veículo",
      "manobrista", "grátis", "pago", "seguro", "longe", "perto"
    ],
    colloquial_variations: [
      "estacionamento", "garagem", "vaga"
    ],
    examples: [
      "estacionamento gratuito",
      "garagem segura",
      "faltou vaga"
    ]
  },

  "Recepção - Check-in": {
    synonyms: ["entrada", "chegada", "registro"],
    related_terms: [
      "check-in", "entrada", "chegada", "registro", "recepção",
      "demorado", "rápido", "eficiente", "fila", "processo"
    ],
    colloquial_variations: [
      "check-in", "entrada", "chegada"
    ],
    examples: [
      "check-in demorado",
      "processo de entrada lento",
      "check-in eficiente"
    ]
  },

  "Recepção - Check-out": {
    synonyms: ["saída", "partida", "encerramento"],
    related_terms: [
      "check-out", "saída", "partida", "recepção", "conta",
      "demorado", "rápido", "eficiente"
    ],
    colloquial_variations: [
      "check-out", "saída", "partida"
    ],
    examples: [
      "check-out demorado",
      "processo de saída lento",
      "check-out eficiente"
    ]
  },

  "Recepção - Serviço": {
    synonyms: ["atendimento recepção", "front desk"],
    related_terms: [
      "recepcionista", "atendente", "funcionário", "staff",
      "educado", "prestativo", "atencioso", "rude", "grosseiro",
      "empréstimo", "ferro", "item", "informação",
      "lobby", "check-in", "check-out", "recepção do hotel", "entrada"
    ],
    colloquial_variations: [
      "recepção", "recepcionista", "front desk"
    ],
    examples: [
      "recepcionista muito educada",
      "atendimento da recepção excelente",
      "atendimento no lobby impecável",
      "recepção do hotel muito atenciosa",
      "funcionários do check-in prestativos",
      "empréstimo de ferro rápido"
    ]
  },

  // ========== TI (TECNOLOGIA) - 2 keywords ==========
  
  "Tecnologia - TV": {
    synonyms: ["televisão", "televisor", "tv a cabo"],
    related_terms: [
      "tv", "televisão", "canais", "controle", "smart tv",
      "não funciona", "não liga", "sem sinal", "cabo"
    ],
    colloquial_variations: [
      "tv", "televisão", "televisor"
    ],
    examples: [
      "tv não funcionava",
      "televisão sem sinal",
      "poucos canais"
    ]
  },

  "Tecnologia - Wi-fi": {
    synonyms: ["internet", "wifi", "wireless", "conexão", "rede"],
    related_terms: [
      "wifi", "wi-fi", "internet", "conexão", "rede", "wireless",
      "lento", "rápido", "não funciona", "não pega", "cai", "senha", "sinal"
    ],
    colloquial_variations: [
      "wifi", "wi-fi", "internet", "net", "conexão"
    ],
    examples: [
      "wifi não funcionava",
      "internet muito lenta",
      "wi-fi instável"
    ]
  },

  // ========== LAZER - 7 keywords ==========
  
  "Lazer - Estrutura": {
    synonyms: ["infraestrutura de lazer", "instalações de lazer"],
    related_terms: [
      "estrutura", "instalação", "espaço", "área", "qualidade",
      "boa", "ruim", "antiga", "moderna", "nova", "velha"
    ],
    colloquial_variations: [
      "estrutura", "instalações", "espaço de lazer"
    ],
    examples: [
      "estrutura de lazer excelente",
      "instalações bem cuidadas",
      "área de lazer ampla"
    ]
  },

  "Lazer - Variedade": {
    synonyms: ["diversidade de atividades", "opções de lazer"],
    related_terms: [
      "variedade", "opções", "atividades", "diversidade", "escolha",
      "pouca", "muita", "falta"
    ],
    colloquial_variations: [
      "variedade", "opções", "atividades"
    ],
    examples: [
      "pouca variedade de atividades",
      "muitas opções de lazer",
      "falta atividades"
    ]
  },

  "Lazer - Serviço": {
    synonyms: ["atendimento lazer", "staff lazer"],
    related_terms: [
      "atendente", "funcionário", "staff", "monitor", "instrutor",
      "educado", "prestativo", "atencioso", "rude"
    ],
    colloquial_variations: [
      "atendimento", "pessoal do lazer", "funcionários"
    ],
    examples: [
      "atendimento na piscina excelente",
      "funcionários do lazer prestativos",
      "monitor atencioso"
    ]
  },

  "Lazer - Atividades de Lazer": {
    synonyms: ["programação", "entretenimento", "recreação"],
    related_terms: [
      "atividade", "programação", "entretenimento", "recreação",
      "jogo", "música", "show", "festa", "animação"
    ],
    colloquial_variations: [
      "atividades", "programação", "entretenimento"
    ],
    examples: [
      "atividades de lazer divertidas",
      "programação variada",
      "entretenimento para crianças"
    ]
  },

  "Lazer - Piscina": {
    synonyms: ["pool", "piscinas", "área de lazer aquática"],
    related_terms: [
      "piscina", "pool", "natação", "nadar", "água",
      "limpa", "suja", "aquecida", "fria", "gelada"
    ],
    colloquial_variations: [
      "piscina", "piscininha", "pool"
    ],
    examples: [
      "piscina estava limpa",
      "água da piscina gelada",
      "piscina aquecida ótima"
    ]
  },

  "Lazer - Spa": {
    synonyms: ["spa", "centro de bem-estar", "wellness"],
    related_terms: [
      "spa", "massagem", "tratamento", "relaxamento", "bem-estar",
      "sauna", "jacuzzi", "serviço", "qualidade"
    ],
    colloquial_variations: [
      "spa", "massagem", "tratamento"
    ],
    examples: [
      "spa excelente",
      "massagem relaxante",
      "tratamentos de qualidade"
    ]
  },

  "Lazer - Academia": {
    synonyms: ["gym", "fitness", "sala de musculação"],
    related_terms: [
      "academia", "gym", "fitness", "musculação", "exercício",
      "treino", "equipamentos", "aparelhos", "esteira", "peso"
    ],
    colloquial_variations: [
      "academia", "gym", "sala de musculação"
    ],
    examples: [
      "academia bem equipada",
      "gym excelente",
      "equipamentos de qualidade"
    ]
  },

  // ========== PRODUTO - 9 keywords ==========
  
  "Produto - Transfer": {
    synonyms: ["transporte", "traslado", "shuttle"],
    related_terms: [
      "transfer", "transporte", "traslado", "shuttle", "aeroporto",
      "van", "ônibus", "carro", "motorista", "grátis", "pago"
    ],
    colloquial_variations: [
      "transfer", "transporte", "traslado"
    ],
    examples: [
      "transfer do aeroporto eficiente",
      "transporte gratuito",
      "traslado pontual"
    ]
  },

  "Produto - Acessibilidade": {
    synonyms: ["acessível", "adaptado", "PCD"],
    related_terms: [
      "acessibilidade", "cadeira de rodas", "rampa", "elevador",
      "adaptado", "PCD", "deficiente", "mobilidade"
    ],
    colloquial_variations: [
      "acessibilidade", "acessível", "adaptado"
    ],
    examples: [
      "hotel acessível",
      "rampa de acesso",
      "quarto adaptado para PCD"
    ]
  },

  "Produto - Custo-benefício": {
    synonyms: ["valor", "preço", "price", "cost"],
    related_terms: [
      "preço", "valor", "custo", "caro", "barato",
      "vale a pena", "justo", "injusto"
    ],
    colloquial_variations: [
      "preço", "valor", "custo-benefício"
    ],
    examples: [
      "preço justo",
      "vale muito a pena",
      "custo-benefício excelente"
    ]
  },

  "Produto - Localização": {
    synonyms: ["location", "posição", "situação", "lugar"],
    related_terms: [
      "localização", "localizado", "location", "perto", "próximo",
      "longe", "distante", "acesso", "região", "área", "praia", "centro"
    ],
    colloquial_variations: [
      "localização", "onde fica", "lugar", "bem localizado"
    ],
    examples: [
      "hotel bem localizado",
      "localização perfeita",
      "perto da praia"
    ]
  },

  "Produto - Vista": {
    synonyms: ["view", "panorama", "visão"],
    related_terms: [
      "vista", "view", "panorama", "paisagem", "mar", "montanha",
      "bonita", "feia", "linda", "maravilhosa"
    ],
    colloquial_variations: [
      "vista", "view", "paisagem"
    ],
    examples: [
      "vista para o mar linda",
      "view maravilhosa",
      "paisagem bonita"
    ]
  },

  "Produto - Experiência": {
    synonyms: ["estadia", "hospedagem", "stay", "vivência"],
    related_terms: [
      "experiência", "estadia", "hospedagem", "stay", "gostei",
      "adorei", "amei", "recomendo", "perfeito", "maravilhoso"
    ],
    colloquial_variations: [
      "experiência", "estadia", "adorei", "amei"
    ],
    examples: [
      "experiência maravilhosa",
      "adorei tudo",
      "estadia perfeita"
    ]
  },

  "Produto - Modernização": {
    synonyms: ["moderno", "atualizado", "novo", "renovado"],
    related_terms: [
      "moderno", "novo", "atualizado", "renovado", "reforma",
      "antigo", "velho", "ultrapassado", "contemporâneo"
    ],
    colloquial_variations: [
      "moderno", "novo", "renovado"
    ],
    examples: [
      "hotel modernizado",
      "instalações novas",
      "precisa de reforma"
    ]
  },

  "Produto - All Inclusive": {
    synonyms: ["tudo incluído", "all inclusive", "pensão completa"],
    related_terms: [
      "all inclusive", "tudo incluído", "pensão completa",
      "comida", "bebida", "atividades", "grátis", "incluído"
    ],
    colloquial_variations: [
      "all inclusive", "tudo incluído", "incluso"
    ],
    examples: [
      "sistema all inclusive excelente",
      "tudo incluído vale a pena",
      "comidas e bebidas inclusas"
    ]
  },

  "Produto - Isolamento Acustico": {
    synonyms: ["isolamento acústico", "isolamento sonoro", "insonorização"],
    related_terms: [
      "barulho", "ruído", "som", "silêncio", "silencioso",
      "barulhento", "ruidoso", "dormir", "descanso"
    ],
    colloquial_variations: [
      "barulho", "isolamento", "silêncio"
    ],
    examples: [
      "muito barulho",
      "falta isolamento acústico",
      "quarto silencioso"
    ]
  },

  // ========== OPERAÇÕES - 4 keywords ==========
  
  "Operações - Atendimento": {
    synonyms: ["serviço", "service", "staff", "equipe"],
    related_terms: [
      "atendimento", "serviço", "staff", "equipe", "funcionário",
      "educado", "prestativo", "atencioso", "cordial", "simpático"
    ],
    colloquial_variations: [
      "atendimento", "funcionários", "staff", "equipe"
    ],
    examples: [
      "atendimento excelente",
      "equipe muito prestativa",
      "funcionários atenciosos"
    ]
  },

  "Operações - Cartão de acesso": {
    synonyms: ["chave do quarto", "cartão magnético", "keycard"],
    related_terms: [
      "cartão", "chave", "acesso", "porta", "quarto",
      "não funciona", "desmagnetiza", "perde", "troca"
    ],
    colloquial_variations: [
      "cartão", "chave", "keycard"
    ],
    examples: [
      "cartão não funcionava",
      "chave desmagnetizou",
      "precisei trocar o cartão"
    ]
  },

  "Operações - Acesso ao quarto": {
    synonyms: ["entrada no quarto", "acesso acomodação"],
    related_terms: [
      "acesso", "entrada", "porta", "quarto", "chave", "cartão",
      "dificuldade", "problema", "não consegui"
    ],
    colloquial_variations: [
      "entrar no quarto", "acesso", "porta"
    ],
    examples: [
      "dificuldade para entrar no quarto",
      "problema no acesso",
      "porta não abria"
    ]
  },

  "Operações - Consumo Extra": {
    synonyms: ["extras", "adicionais", "serviços extras"],
    related_terms: [
      "consumo", "extra", "adicional", "cobrança", "conta",
      "frigobar", "telefone", "serviço", "preço"
    ],
    colloquial_variations: [
      "extras", "consumo", "cobrança extra"
    ],
    examples: [
      "cobrança de extras",
      "consumo do frigobar",
      "serviços adicionais"
    ]
  },

  // ========== CORPORATIVO - 3 keywords ==========
  
  "Corporativo - Marketing": {
    synonyms: ["divulgação", "comunicação", "propaganda"],
    related_terms: [
      "marketing", "propaganda", "divulgação", "comunicação",
      "promessa", "expectativa", "realidade", "foto", "site"
    ],
    colloquial_variations: [
      "marketing", "propaganda", "fotos enganosas"
    ],
    examples: [
      "marketing enganoso",
      "fotos não correspondem",
      "expectativa vs realidade"
    ]
  },

  "Corporativo - Reservas": {
    synonyms: ["booking", "reserva", "agendamento"],
    related_terms: [
      "reserva", "booking", "agendamento", "confirmação",
      "cancelamento", "problema", "erro", "sistema"
    ],
    colloquial_variations: [
      "reserva", "booking", "agendamento"
    ],
    examples: [
      "problema na reserva",
      "erro no booking",
      "cancelamento difícil"
    ]
  },

  "Corporativo - Financeiro": {
    synonyms: ["cobrança", "pagamento", "faturamento"],
    related_terms: [
      "cobrança", "pagamento", "conta", "valor", "preço",
      "erro", "desconto", "reembolso", "cartão"
    ],
    colloquial_variations: [
      "cobrança", "conta", "pagamento"
    ],
    examples: [
      "erro na cobrança",
      "valor incorreto na conta",
      "problema no pagamento"
    ]
  },

  // ========== EG (EXPERIÊNCIA DO HÓSPEDE) - 1 keyword ==========
  
  "EG - Abordagem": {
    synonyms: ["atendimento personalizado", "relacionamento"],
    related_terms: [
      "abordagem", "tratamento", "relacionamento", "personalizado",
      "educado", "gentil", "atenção", "cuidado", "especial"
    ],
    colloquial_variations: [
      "abordagem", "tratamento", "atenção"
    ],
    examples: [
      "abordagem personalizada",
      "tratamento especial",
      "atenção aos detalhes"
    ]
  }
};

/**
 * Dicionário de contexto semântico para Problems
 */
export const PROBLEM_SEMANTIC_CONTEXT: Record<string, {
  synonyms: string[];
  indicators: string[];
  negative_patterns: string[];
  examples: string[];
}> = {
  "Demora no Atendimento": {
    synonyms: ["lentidão", "demora", "delay", "espera"],
    indicators: [
      "demorou", "demora", "lento", "devagar", "esperando",
      "esperei", "aguardando", "tempo", "minutos", "horas"
    ],
    negative_patterns: [
      "demorou muito", "muito tempo", "esperando horas"
    ],
    examples: [
      "demorou muito para atender",
      "esperamos horas",
      "atendimento muito lento"
    ]
  },

  "Falta de Limpeza": {
    synonyms: ["sujeira", "falta de higiene", "imundície"],
    indicators: [
      "sujo", "suja", "imundo", "nojento", "fedendo",
      "não limparam", "não arrumaram", "bagunçado"
    ],
    negative_patterns: [
      "muito sujo", "estava sujo", "falta de limpeza"
    ],
    examples: [
      "quarto estava sujo",
      "falta de limpeza",
      "muito sujo e mal cheiroso"
    ]
  },

  "Equipamento com Falha": {
    synonyms: ["quebrado", "com defeito", "não funciona"],
    indicators: [
      "quebrado", "não funciona", "defeito", "problema",
      "parado", "não liga", "estragado"
    ],
    negative_patterns: [
      "não funciona", "quebrado", "com defeito"
    ],
    examples: [
      "ar condicionado quebrado",
      "chuveiro não funcionava",
      "tv com defeito"
    ]
  },

  "Qualidade da Refeição Abaixo do Esperado": {
    synonyms: ["comida ruim", "qualidade baixa"],
    indicators: [
      "ruim", "péssimo", "horrível", "sem sabor",
      "fria", "mal feito", "queimado", "cru"
    ],
    negative_patterns: [
      "comida ruim", "sem sabor", "estava fria"
    ],
    examples: [
      "comida estava ruim",
      "refeição péssima",
      "sem sabor nenhum"
    ]
  },

  "Wi-Fi Instável": {
    synonyms: ["internet ruim", "conexão ruim"],
    indicators: [
      "lento", "não funciona", "não pega", "cai",
      "instável", "fraco", "ruim"
    ],
    negative_patterns: [
      "wifi não funciona", "internet lenta", "sempre cai"
    ],
    examples: [
      "wifi muito lento",
      "internet sempre caindo",
      "não consegui conectar"
    ]
  },

  "Preço Alto": {
    synonyms: ["caro", "preço elevado"],
    indicators: [
      "caro", "preço alto", "muito caro", "não vale"
    ],
    negative_patterns: [
      "muito caro", "caro demais", "preço alto"
    ],
    examples: [
      "muito caro para o que oferece",
      "preço alto demais"
    ]
  },

  "Ruído Excessivo": {
    synonyms: ["barulho", "barulhento", "ruidoso"],
    indicators: [
      "barulho", "barulhento", "ruído", "ruidoso",
      "alto", "não consegui dormir"
    ],
    negative_patterns: [
      "muito barulho", "barulhento demais", "ruído excessivo"
    ],
    examples: [
      "muito barulho à noite",
      "quarto barulhento",
      "não consegui dormir"
    ]
  },

  "Falta de Variedade": {
    synonyms: ["pouca opção", "limitado"],
    indicators: [
      "pouco", "pouca", "falta", "faltou", "limitado"
    ],
    negative_patterns: [
      "pouca variedade", "faltou opções", "muito limitado"
    ],
    examples: [
      "pouca variedade no café",
      "faltou opções vegetarianas"
    ]
  }
};

/**
 * Gera texto enriquecido para embedding de uma keyword
 * ✅ NOVO: Fallback automático para keywords não mapeadas
 */
export function generateEnrichedKeywordText(keywordLabel: string): string {
  const context = KEYWORD_SEMANTIC_CONTEXT[keywordLabel];
  
  // Se tem contexto manual, usar
  if (context) {
    const parts = [
      keywordLabel,
      ...context.synonyms,
      ...context.related_terms.slice(0, 10),
      ...context.colloquial_variations,
      ...context.examples.slice(0, 3)
    ];
    return parts.join(' | ');
  }

  // ✅ FALLBACK AUTOMÁTICO: Gerar contexto para keywords não mapeadas
  console.log(`🔧 Gerando enriquecimento automático para: ${keywordLabel}`);
  
  const parts = keywordLabel.split(' - ');
  const department = parts[0]; // Ex: "Produto", "A&B", "Limpeza"
  const aspect = parts[1] || keywordLabel; // Ex: "Transfer", "Serviço"
  
  // Gerar sinônimos automáticos baseados no aspecto
  const autoSynonyms = generateAutoSynonyms(aspect);
  
  // Gerar termos relacionados baseados no departamento
  const autoRelated = generateAutoRelatedTerms(department, aspect);
  
  // Gerar variações coloquiais
  const autoVariations = generateAutoVariations(aspect);
  
  const enrichedParts = [
    keywordLabel,
    department,
    aspect,
    ...autoSynonyms,
    ...autoRelated,
    ...autoVariations
  ];
  
  return enrichedParts.join(' | ');
}

/**
 * ✅ NOVO: Gera sinônimos automáticos baseados em regras linguísticas
 */
function generateAutoSynonyms(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  const synonyms: string[] = [];
  
  // Mapeamento de sinônimos comuns
  const synonymMap: Record<string, string[]> = {
    'serviço': ['atendimento', 'service', 'staff', 'equipe'],
    'limpeza': ['higiene', 'arrumação', 'cleaning', 'housekeeping'],
    'café da manhã': ['breakfast', 'café', 'manhã', 'desjejum'],
    'jantar': ['dinner', 'janta', 'refeição noturna'],
    'almoço': ['lunch', 'refeição', 'meio-dia'],
    'quarto': ['acomodação', 'suite', 'apartamento', 'room'],
    'banheiro': ['sanitário', 'toalete', 'lavabo', 'bathroom'],
    'wi-fi': ['wifi', 'internet', 'conexão', 'wireless', 'rede'],
    'tv': ['televisão', 'televisor', 'smart tv'],
    'piscina': ['pool', 'natação', 'área aquática'],
    'academia': ['gym', 'fitness', 'musculação'],
    'transfer': ['transporte', 'traslado', 'shuttle'],
    'localização': ['location', 'lugar', 'posição', 'situado'],
    'custo-benefício': ['preço', 'valor', 'price', 'cost'],
    'vista': ['view', 'panorama', 'paisagem', 'visual'],
    'experiência': ['estadia', 'hospedagem', 'stay', 'vivência'],
    'check-in': ['entrada', 'chegada', 'registro'],
    'check-out': ['saída', 'partida', 'checkout'],
    'estacionamento': ['garagem', 'parking', 'vaga'],
    'ar-condicionado': ['ar', 'climatização', 'ac', 'refrigeração'],
    'elevador': ['lift', 'ascensor'],
    'gastronomia': ['culinária', 'comida', 'cozinha', 'food'],
    'room service': ['serviço de quarto', 'quarto service'],
    'all inclusive': ['tudo incluído', 'pensão completa'],
    'isolamento acustico': ['barulho', 'ruído', 'silêncio', 'insonorização'],
    'atendimento': ['service', 'staff', 'equipe', 'funcionários'],
    'variedade': ['diversidade', 'opções', 'escolhas'],
    'estrutura': ['instalações', 'infraestrutura', 'facilities']
  };
  
  // Buscar sinônimos exatos
  for (const [key, syns] of Object.entries(synonymMap)) {
    if (lowerTerm.includes(key)) {
      synonyms.push(...syns);
    }
  }
  
  // Se não encontrou, adicionar termo em inglês genérico
  if (synonyms.length === 0) {
    synonyms.push(term.toLowerCase());
  }
  
  return Array.from(new Set(synonyms)).slice(0, 5);
}

/**
 * ✅ NOVO: Gera termos relacionados baseados no departamento
 */
function generateAutoRelatedTerms(department: string, aspect: string): string[] {
  const related: string[] = [];
  
  // Termos relacionados por departamento
  const deptTerms: Record<string, string[]> = {
    'A&B': ['comida', 'bebida', 'restaurante', 'garçom', 'refeição', 'prato', 'menu'],
    'Governança': ['limpo', 'sujo', 'arrumado', 'camareira', 'higiene'],
    'Manutenção': ['quebrado', 'conserto', 'reparo', 'não funciona', 'defeito'],
    'Recepção': ['recepcionista', 'lobby', 'front desk', 'atendimento'],
    'TI': ['tecnologia', 'internet', 'conexão', 'funciona', 'sinal'],
    'Tecnologia': ['tecnologia', 'internet', 'conexão', 'funciona', 'sinal'],
    'Lazer': ['diversão', 'atividade', 'entretenimento', 'recreação'],
    'Produto': ['hotel', 'qualidade', 'oferece', 'disponível'],
    'Operações': ['funcionário', 'staff', 'equipe', 'atendimento', 'serviço'],
    'Corporativo': ['gestão', 'administração', 'sistema'],
    'EG': ['experiência', 'hóspede', 'personalizado', 'especial']
  };
  
  if (deptTerms[department]) {
    related.push(...deptTerms[department].slice(0, 7));
  }
  
  // Adicionar termos específicos do aspecto
  related.push(aspect.toLowerCase());
  
  return Array.from(new Set(related));
}

/**
 * ✅ NOVO: Gera variações coloquiais automáticas
 */
function generateAutoVariations(term: string): string[] {
  const variations: string[] = [];
  const lowerTerm = term.toLowerCase();
  
  // Adicionar versão sem acentos
  const noAccents = lowerTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  variations.push(noAccents);
  
  // Adicionar versão sem hífens
  if (lowerTerm.includes('-')) {
    variations.push(lowerTerm.replace(/-/g, ' '));
    variations.push(lowerTerm.replace(/-/g, ''));
  }
  
  // Adicionar plural/singular simples
  if (lowerTerm.endsWith('s') && lowerTerm.length > 3) {
    variations.push(lowerTerm.slice(0, -1)); // Remove 's' final
  } else {
    variations.push(lowerTerm + 's'); // Adiciona 's'
  }
  
  return Array.from(new Set(variations)).slice(0, 3);
}

/**
 * Gera texto enriquecido para embedding de um problem
 * ✅ NOVO: Fallback automático para problems não mapeados
 */
export function generateEnrichedProblemText(problemLabel: string): string {
  const context = PROBLEM_SEMANTIC_CONTEXT[problemLabel];
  
  // Se tem contexto manual, usar
  if (context) {
    const parts = [
      problemLabel,
      ...context.synonyms,
      ...context.indicators.slice(0, 10),
      ...context.negative_patterns,
      ...context.examples.slice(0, 3)
    ];
    return parts.join(' | ');
  }

  // ✅ FALLBACK AUTOMÁTICO: Gerar contexto para problems não mapeados
  console.log(`🔧 Gerando enriquecimento automático para problem: ${problemLabel}`);
  
  const lowerLabel = problemLabel.toLowerCase();
  
  // Detectar palavras-chave negativas no label
  const negativeIndicators = extractNegativeIndicators(lowerLabel);
  
  // Gerar sinônimos do problema
  const problemSynonyms = generateProblemSynonyms(lowerLabel);
  
  // Adicionar padrões negativos comuns
  const negativePatterns = [
    `${problemLabel.toLowerCase()} problema`,
    `falta de ${problemLabel.toLowerCase()}`,
    `${problemLabel.toLowerCase()} ruim`,
    `${problemLabel.toLowerCase()} não funciona`
  ];
  
  const enrichedParts = [
    problemLabel,
    ...problemSynonyms,
    ...negativeIndicators,
    ...negativePatterns
  ];
  
  return enrichedParts.join(' | ');
}

/**
 * ✅ NOVO: Extrai indicadores negativos de um problem label
 */
function extractNegativeIndicators(problemText: string): string[] {
  const indicators: string[] = [];
  
  // Palavras negativas comuns em problems
  const negativeWords = [
    'demora', 'lento', 'demorado', 'espera',
    'falta', 'faltou', 'não tem', 'sem',
    'sujo', 'suja', 'imundo', 'nojento',
    'quebrado', 'não funciona', 'defeito', 'problema',
    'ruim', 'péssimo', 'horrível', 'terrível',
    'caro', 'alto', 'excessivo',
    'barulho', 'barulhento', 'ruidoso',
    'mal', 'erro', 'errado', 'incorreto'
  ];
  
  // Adicionar palavras negativas que aparecem no texto
  for (const word of negativeWords) {
    if (problemText.includes(word)) {
      indicators.push(word);
    }
  }
  
  // Adicionar indicadores genéricos
  indicators.push('problema', 'insatisfeito', 'reclamação');
  
  return Array.from(new Set(indicators)).slice(0, 8);
}

/**
 * ✅ NOVO: Gera sinônimos para um problem
 */
function generateProblemSynonyms(problemText: string): string[] {
  const synonyms: string[] = [];
  
  // Mapeamento de sinônimos de problems comuns
  const problemSynonymMap: Record<string, string[]> = {
    'demora': ['lentidão', 'delay', 'espera', 'demorado'],
    'falta': ['faltou', 'não tem', 'sem', 'ausência'],
    'limpeza': ['higiene', 'arrumação', 'sujeira'],
    'quebrado': ['não funciona', 'defeito', 'problema', 'estragado'],
    'atendimento': ['serviço', 'staff', 'funcionário'],
    'caro': ['preço alto', 'excessivo', 'custoso'],
    'barulho': ['ruído', 'som', 'barulhento', 'ruidoso'],
    'qualidade': ['padrão', 'nível', 'estado']
  };
  
  // Buscar sinônimos
  for (const [key, syns] of Object.entries(problemSynonymMap)) {
    if (problemText.includes(key)) {
      synonyms.push(...syns);
    }
  }
  
  return Array.from(new Set(synonyms)).slice(0, 5);
}

/**
 * Expande query do usuário com sinônimos e variações
 * ✅ MELHORADO: Expansão mais completa com as 44 keywords
 */
export function expandUserQuery(userText: string): string {
  const textLower = userText.toLowerCase();
  const expansions: string[] = [userText];

  // ✅ EXPANDIDO: Mapeamento completo para todas as 44 keywords
  const commonExpansions: Record<string, string[]> = {
    // A&B
    "comida": ["refeição", "prato", "alimento", "gastronomia", "food"],
    "café da manhã": ["breakfast", "café", "manhã", "desjejum"],
    "almoço": ["lunch", "meio-dia", "refeição"],
    "jantar": ["janta", "dinner", "refeição noturna"],
    "garçom": ["garçonete", "atendente", "funcionário do restaurante", "staff"],
    "restaurante": ["comida", "gastronomia", "refeição", "A&B"],
    "room service": ["serviço de quarto", "comida no quarto"],
    
    // Governança (Limpeza)
    "limpeza": ["higiene", "arrumação", "cleaning", "housekeeping"],
    "sujo": ["sujeira", "falta de limpeza", "não limpo", "imundo"],
    "limpo": ["limpeza", "higiene", "arrumado", "impecável"],
    "quarto": ["acomodação", "suite", "apartamento", "room"],
    "banheiro": ["sanitário", "toalete", "lavabo", "bathroom", "box", "chuveiro"],
    "toalha": ["enxoval", "roupa de cama", "lençol"],
    "amenities": ["produtos de banho", "shampoo", "sabonete"],
    
    // Manutenção
    "ar condicionado": ["ar", "climatização", "ac", "refrigeração"],
    "quebrado": ["não funciona", "defeito", "problema", "estragado"],
    "conserto": ["reparo", "manutenção", "arrumação"],
    "elevador": ["lift", "ascensor"],
    
    // Recepção
    "recepção": ["recepcionista", "front desk", "lobby", "atendimento"],
    "check-in": ["entrada", "chegada", "registro"],
    "check-out": ["saída", "partida", "checkout"],
    "estacionamento": ["garagem", "parking", "vaga", "carro"],
    
    // TI/Tecnologia
    "wifi": ["wi-fi", "internet", "conexão", "wireless", "rede"],
    "internet": ["wifi", "wi-fi", "conexão", "rede"],
    "tv": ["televisão", "televisor", "smart tv", "canais"],
    
    // Lazer
    "piscina": ["pool", "natação", "área aquática"],
    "academia": ["gym", "fitness", "musculação", "treino"],
    "spa": ["massagem", "tratamento", "relaxamento"],
    
    // Produto
    "transfer": ["transporte", "traslado", "shuttle", "aeroporto"],
    "localização": ["localizado", "location", "perto", "próximo", "situado"],
    "custo benefício": ["preço", "valor", "cost", "barato", "caro"],
    "vista": ["view", "panorama", "paisagem", "visual"],
    "experiência": ["estadia", "hospedagem", "stay", "vivência"],
    "all inclusive": ["tudo incluído", "pensão completa", "incluso"],
    "barulho": ["ruído", "isolamento acústico", "som", "barulhento"],
    
    // Operações
    "atendimento": ["serviço", "service", "staff", "equipe", "funcionários"],
    "funcionário": ["staff", "equipe", "atendente", "colaborador"],
    "cartão": ["chave", "acesso", "keycard"],
    
    // Sentimentos positivos
    "muito bom": ["excelente", "ótimo", "maravilhoso", "perfeito"],
    "excelente": ["ótimo", "maravilhoso", "perfeito", "incrível"],
    "adorei": ["amei", "gostei muito", "excelente", "maravilhoso"],
    
    // Sentimentos negativos
    "ruim": ["péssimo", "horrível", "terrível", "muito ruim"],
    "péssimo": ["horrível", "ruim", "terrível", "muito ruim"],
    "deixa a desejar": ["ruim", "insatisfatório", "poderia melhorar"]
  };

  // Expandir com sinônimos
  for (const [term, synonyms] of Object.entries(commonExpansions)) {
    if (textLower.includes(term)) {
      expansions.push(...synonyms);
    }
  }

  // Adicionar o texto original sem acentos
  const noAccents = userText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  expansions.push(noAccents);

  return Array.from(new Set(expansions)).join(' ');
}
