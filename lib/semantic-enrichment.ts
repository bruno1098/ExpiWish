/**
 * Sistema de Enriquecimento Semântico - RECONSTRUÍDO
 * 
 * Taxonomia: keywords definidas pelo cliente (apenas as listadas)
 * Última atualização: 13/10/2025
 * 
 * Observação: A&B sempre refere-se a Alimentos & Bebidas (restaurante/bar).
 * As listas de sinônimos e termos mantêm o contexto de cada área
 * para reduzir confusão entre departamentos diferentes.
 */

/**
 * Dicionário de contexto semântico para Keywords (apenas as solicitadas)
 */
export const KEYWORD_SEMANTIC_CONTEXT: Record<string, {
  synonyms: string[];
  related_terms: string[];
  colloquial_variations: string[];
  examples: string[];
}> = {
  // ========== A&B (ALIMENTOS & BEBIDAS) ==========

  "A&B - Café da manhã": {
    synonyms: [
      "breakfast", "desjejum", "buffet matinal", "refeição matinal",
      "café da manhã", "manhã", "serviço de café"
    ],
    related_terms: [
      "A&B", "alimentos", "bebidas", "restaurante", "buffet",
      "pães", "frutas", "suco", "iogurte", "café", "chá",
      "variedade", "qualidade", "temperatura", "fresco"
    ],
    colloquial_variations: [
      "café", "breakfast", "buffet do café", "comida da manhã"
    ],
    examples: [
      "buffet de café da manhã variado", "breakfast excelente", "café fresquinho"
    ]
  },

  "A&B - Jantar": {
    synonyms: [
      "dinner", "janta", "refeição noturna", "jantar"
    ],
    related_terms: [
      "A&B", "alimentos", "bebidas", "restaurante", "menu", "cardápio",
      "pratos", "tempero", "qualidade", "horário do jantar"
    ],
    colloquial_variations: [ 
      "janta", "comida da noite", "dinner"
    ],
    examples: [
      "jantar muito saboroso", "cardápio do jantar variado", "restaurante à noite excelente"
    ]
  },

  "A&B - Almoço": {
    synonyms: [
      "lunch", "refeição do meio-dia", "almoço"
    ],
    related_terms: [
      "A&B", "alimentos", "bebidas", "restaurante", "menu", "pratos",
      "meio-dia", "qualidade", "variedade", "serviço"
    ],
    colloquial_variations: [
      "almoçar", "comida do almoço", "lunch"
    ],
    examples: [
      "almoço bem servido", "menu do almoço completo", "refeição do meio-dia ótima"
    ]
  },

  "A&B - Serviço": {
    synonyms: [
      "serviço do restaurante", "serviço de mesa", "garçom", "garçonete",
      "maître", "tempo de pedido", "entrega de pratos", "room service (comida)", "serviço no bar"
    ],
    related_terms: [
      "A&B", "alimentos", "bebidas", "restaurante", "bar", "café da manhã",
      "almoço", "jantar", "menu", "cardápio", "pedido", "prato",
      "bebidas", "comida", "conta", "cobrança", "lanche"
    ],
    colloquial_variations: [
      "garçom", "pessoal do restaurante", "serviço de mesa", "atendimento no restaurante"
    ],
    examples: [
      "garçom prestativo", "serviço de mesa rápido", "pedido entregue quente", "room service eficiente"
    ]
  },

  "A&B - Gastronomia": {
    synonyms: [
      "culinária", "cozinha", "comida", "alimentação", "food", "preparo"
    ],
    related_terms: [
      "A&B", "alimentos", "bebidas", "sabor", "tempero", "qualidade",
      "fresco", "bem feito", "apresentação", "chef"
    ],
    colloquial_variations: [
      "comida", "cozinha", "gastronomia"
    ],
    examples: [
      "gastronomia excelente", "pratos muito bem preparados", "sabor impecável"
    ]
  },

  "A&B - Room Service": {
    synonyms: [
      "serviço de quarto A&B", "room service", "pedido no quarto", "entrega no quarto"
    ],
    related_terms: [
      "A&B", "alimentos", "bebidas", "telefone", "cardápio", "pedido",
      "tempo de entrega", "taxa de serviço", "horário", "noite"
    ],
    colloquial_variations: [
      "room service", "comida no quarto", "pedido do quarto"
    ],
    examples: [
      "room service rápido", "comida no quarto saborosa", "pedido entregue quente"
    ]
  },

  // ========== GOVERNANÇA (LIMPEZA) ==========

  "Governança - Banheiro": {
    synonyms: [
      "higiene do banheiro", "limpeza sanitária", "banheiro limpo", "banheiro sujo"
    ],
    related_terms: [
      "housekeeping", "camareira", "pia", "vaso", "box", "chuveiro",
      "azulejo", "espelho", "sujeira", "desinfecção", "odor"
    ],
    colloquial_variations: [
      "lavabo", "toalete", "wc", "banheiro"
    ],
    examples: [
      "banheiro impecável", "box com manchas", "pia do banheiro suja"
    ]
  },

  "Governança - Quarto": {
    synonyms: [
      "arrumação", "higiene do quarto", "limpeza do quarto", "housekeeping"
    ],
    related_terms: [
      "camareira", "cama", "lençol", "toalha", "poeira", "organização",
      "aspiração", "troca de roupas", "checklist de limpeza", "cheiro"
    ],
    colloquial_variations: [
      "quarto limpo", "quarto sujo", "arrumado", "bagunçado"
    ],
    examples: [
      "quarto muito bem limpo", "lençóis trocados", "poeira no móvel"
    ]
  },

  "Governança - Áreas sociais": {
    synonyms: [
      "limpeza de áreas comuns", "higiene de espaços", "áreas sociais limpas"
    ],
    related_terms: [
      "lobby", "recepção", "corredores", "elevadores", "piscina", "academia",
      "restaurante", "organização", "coleta", "frequência de limpeza"
    ],
    colloquial_variations: [
      "áreas comuns", "espaços comuns", "lobby"
    ],
    examples: [
      "lobby sempre limpo", "corredores bem cuidados", "espaços comuns impecáveis"
    ]
  },

  "Governança - Enxoval": {
    synonyms: [
      "roupa de cama", "lençóis", "toalhas", "enxoval"
    ],
    related_terms: [
      "fronha", "cobertor", "travesseiro", "maciez", "manchas", "rasgos",
      "cheiro", "troca", "qualidade", "higienização", "textura", "enxoval novo",
      "enxoval velho", "toalha áspera", "lençol áspero"
    ],
    colloquial_variations: [
      "lençol", "toalha", "roupa de cama", "toalha ruim", "toalha boa",
      "lençol ruim", "lençol bom"
    ],
    examples: [
      "toalhas macias", "lençóis limpos", "enxoval com manchas",
      "qualidade das toalhas poderia ser melhor", "lençóis de ótima qualidade",
      "toalha muito áspera e fina"
    ]
  },

  "Governança - Amenities": {
    synonyms: [
      "amenidades", "produtos de banho", "itens de cortesia"
    ],
    related_terms: [
      "shampoo", "sabonete", "condicionador", "creme", "cotonete",
      "reposição", "qualidade", "falta", "fragrância", "kit banho"
    ],
    colloquial_variations: [
      "amenities", "produtos", "itens de banho"
    ],
    examples: [
      "amenities completos", "faltou shampoo", "produtos de banho de qualidade"
    ]
  },

  "Governança - Frigobar": {
    synonyms: [
      "frigobar", "minibar", "geladeira do quarto"
    ],
    related_terms: [
      "organização", "higiene", "temperatura", "inventário", "reposição",
      "verificação", "limpeza", "controle de itens"
    ],
    colloquial_variations: [
      "minibar", "geladeira", "frigobar"
    ],
    examples: [
      "frigobar limpo", "bebidas geladas", "itens faltando no minibar"
    ]
  },

  "Governança - Serviço": {
    synonyms: [
      "serviço de governança", "serviço das camareiras", "arrumação diária",
      "serviço de arrumação", "housekeeping", "housekeeping service"
    ],
    related_terms: [
      "camareira", "camareiras", "arrumadeira", "equipe de limpeza",
      "housekeeping", "gentileza", "educação", "rapidez", "agilidade",
      "frequência", "solicitações", "prontidão", "proatividade",
      "cordialidade", "simpatia", "profissionalismo"
    ],
    colloquial_variations: [
      "serviço das camareiras", "camareiras muito boas", "camareiras muito ruins",
      "camareiras atenciosas", "camareiras mal educadas",
      "pessoal da limpeza muito atencioso", "pessoal da limpeza mal educado",
      "serviço de arrumação", "serviço de limpeza do quarto"
    ],
    examples: [
      "camareiras muito atenciosas", "arrumação diária impecável",
      "pessoal da limpeza extremamente educado e prestativo",
      "camareiras demoravam muito para atender as solicitações",
      "serviço de governança excelente",
      "equipe de governança sempre muito gentil"
    ]
  },

  // ========== MANUTENÇÃO ==========

  "Manutenção - Ar-condicionado": {
    synonyms: [
      "ar condicionado", "climatização", "AC", "refrigeração"
    ],
    related_terms: [
      "temperatura", "frio", "quente", "não gela", "vazamento",
      "barulho", "filtro", "manutenção", "regulagem", "controle remoto"
    ],
    colloquial_variations: [
      "ar", "ar condicionado", "climatização"
    ],
    examples: [
      "ar não gelava", "AC barulhento", "vazamento no ar"
    ]
  },

  "Manutenção - Elétrica": {
    synonyms: [
      "instalação elétrica", "rede elétrica", "energia", "iluminação"
    ],
    related_terms: [
      "tomada", "disjuntor", "fusível", "curto-circuito", "quadro elétrico",
      "lâmpada", "interruptor", "queda de energia", "voltagem", "fio"
    ],
    colloquial_variations: [
      "tomada queimada", "luz piscando", "falta de energia"
    ],
    examples: [
      "tomada não funciona", "luz oscilando", "disjuntor desarmando"
    ]
  },

  "Manutenção - Banheiro": {
    synonyms: [
      "reparo banheiro", "conserto banheiro", "manutenção sanitária"
    ],
    related_terms: [
      "chuveiro", "torneira", "vaso", "descarga", "ralo",
      "vazamento", "entupimento", "box", "vedação", "pressão da água"
    ],
    colloquial_variations: [
      "chuveiro quebrado", "vaso entupido", "torneira pingando"
    ],
    examples: [
      "chuveiro sem pressão", "vaso sanitário entupido", "torneira pingando"
    ]
  },

  "Manutenção - Instalações": {
    synonyms: [
      "infraestrutura", "estrutura física", "instalações"
    ],
    related_terms: [
      "parede", "teto", "piso", "porta", "janela", "fechadura",
      "rachadura", "infiltração", "mofo", "umidade", "reforma"
    ],
    colloquial_variations: [
      "infraestrutura", "estrutura", "instalações"
    ],
    examples: [
      "parede com infiltração", "mofo no teto", "fechadura com problema"
    ]
  },

  "Manutenção - Quarto": {
    synonyms: [
      "reparo no quarto", "conserto no quarto", "manutenção de quarto"
    ],
    related_terms: [
      "cama quebrada", "controle", "tomada", "lâmpada", "cortina", "persiana",
      "porta", "janela", "fechadura", "não funciona"
    ],
    colloquial_variations: [
      "cama quebrada", "luz queimada", "tomada quebrada"
    ],
    examples: [
      "tv sem sinal", "lâmpada queimada", "tomada sem energia"
    ]
  },

  "Manutenção - Elevador": {
    synonyms: [
      "elevadores", "ascensor", "lift"
    ],
    related_terms: [
      "parado", "fora de serviço", "lento", "demora", "ruído",
      "manutenção", "sinalização", "capacidade", "sensor", "porta do elevador"
    ],
    colloquial_variations: [
      "elevador", "elevadores", "lift"
    ],
    examples: [
      "elevador não funcionava", "demora no elevador", "porta travando"
    ]
  },

  "Manutenção - Jardinagem": {
    synonyms: [
      "jardim", "paisagismo", "área verde"
    ],
    related_terms: [
      "grama", "árvore", "flor", "poda", "rega", "canteiro",
      "horta", "ornamentação", "limpeza externa", "manutenção"
    ],
    colloquial_variations: [
      "área verde", "paisagem", "jardim"
    ],
    examples: [
      "jardim bem cuidado", "grama aparada", "área verde bonita"
    ]
  },

  // ========== RECEPÇÃO ==========

  "Recepção - Estacionamento": {
    synonyms: [
      "garagem", "vaga", "parking", "estacionamento"
    ],
    related_terms: [
      "carro", "veículo", "manobrista", "coberto", "descoberto",
      "grátis", "pago", "seguro", "perto", "longe"
    ],
    colloquial_variations: [
      "garagem", "vaga", "estacionamento"
    ],
    examples: [
      "estacionamento gratuito", "garagem segura", "faltou vaga"
    ]
  },

  "Recepção - Check-in": {
    synonyms: [
      "entrada", "chegada", "registro", "check-in"
    ],
    related_terms: [
      "recepção", "fila", "tempo", "documentos", "processo",
      "cadastro", "chave", "liberação de quarto", "horário"
    ],
    colloquial_variations: [
      "entrada", "chegada", "check-in"
    ],
    examples: [
      "check-in demorado", "entrada rápida", "processo eficiente"
    ]
  },

  "Recepção - Check-out": {
    synonyms: [
      "saída", "partida", "encerramento", "check-out"
    ],
    related_terms: [
      "recepção", "conta", "pagamento", "tempo", "fatura",
      "devolução de cartão", "aviso", "horário"
    ],
    colloquial_variations: [
      "saída", "partida", "check-out"
    ],
    examples: [
      "check-out rápido", "processo de saída lento", "pagamento eficiente"
    ]
  },

  "Recepção - Serviço": {
    synonyms: [
      "atendimento recepção", "front desk", "serviço de lobby", "informações"
    ],
    related_terms: [
      "recepcionista", "atendente", "staff", "educado", "prestativo", "orientações", "suporte", "solicitações", "lobby"
    ],
    colloquial_variations: [
      "recepção", "front desk", "atendimento"
    ],
    examples: [
      "recepção atenciosa", "ajuda no lobby", "orientações claras"
    ]
  },

  "Recepção - Emprestimo de itens": {
    synonyms: [
      "empréstimo de ferro", "emprestar objetos", "solicitar itens", "itens emprestados"
    ],
    related_terms: [
      "ferro de passar", "cabos", "adaptadores", "berço", "roupões",
      "disponibilidade", "indisponibilidade", "pedido", "registro", "devolução"
    ],
    colloquial_variations: [
      "emprestimo", "ferro", "pedir ferro", "emprestar"
    ],
    examples: [
      "empréstimo de ferro rápido", "item indisponível", "solicitamos e atenderam"
    ]
  },

  "Recepção - Empréstimo de itens": {
    synonyms: [
      "empréstimo de ferro", "emprestar objetos", "solicitar itens", "itens emprestados"
    ],
    related_terms: [
      "ferro de passar", "cabos", "adaptadores", "berço", "roupões",
      "ventilador", "carregador", "kit bebê", "registro", "devolução",
      "recepção", "front desk"
    ],
    colloquial_variations: [
      "pedir ferro", "emprestar ferro", "solicitar itens", "pegar emprestado"
    ],
    examples: [
      "recepção emprestou ferro de passar", "item estava indisponível", "solicitamos secador e trouxeram"
    ]
  },

  "Recepção - Reservas": {
    synonyms: [
      "booking", "reserva", "pré-reserva", "alteração de reserva", "cancelamento"
    ],
    related_terms: [
      "confirmação", "número da reserva", "política", "prazo", "contato",
      "agência", "OTA", "website", "disponibilidade", "garantia"
    ],
    colloquial_variations: [
      "reserva", "booking", "marcar quarto"
    ],
    examples: [
      "reserva confirmada", "alteração sem dificuldades", "cancelamento processado"
    ]
  },

  // ========== TECNOLOGIA ==========

  "Tecnologia - TV": {
    synonyms: [
      "televisão", "televisor", "tv a cabo", "smart tv"
    ],
    related_terms: [
      "canais", "controle", "entrada HDMI", "sinal", "volume",
      "aplicativos", "configuração", "sem sinal", "imagem", "som"
    ],
    colloquial_variations: [
      "tv", "televisão", "televisor"
    ],
    examples: [
      "tv sem sinal", "poucos canais", "smart tv funcionando bem"
    ]
  },

  "Tecnologia - Wi-fi": {
    synonyms: [
      "internet", "wifi", "wi-fi", "rede", "conexão"
    ],
    related_terms: [
      "velocidade", "estabilidade", "queda", "sinal", "senha",
      "roteador", "alcance", "latência", "wireless", "rede hóspedes"
    ],
    colloquial_variations: [
      "wifi", "wi-fi", "internet", "net"
    ],
    examples: [
      "wi-fi instável", "internet muito lenta", "sinal fraco"
    ]
  },

  // ========== LAZER ==========

  "Lazer - Estrutura": {
    synonyms: [
      "infraestrutura de lazer", "instalações de lazer", "áreas de lazer"
    ],
    related_terms: [
      "piscina", "spa", "academia", "salas", "quadras", "kids club",
      "equipamentos", "conservação", "manutenção", "capacidade"
    ],
    colloquial_variations: [
      "espaço de lazer", "instalações", "estrutura", "áreas de lazer"
    ],
    examples: [
      "estrutura de lazer excelente", "áreas bem cuidadas", "equipamentos em bom estado"
    ]
  },

  "Lazer - Variedade": {
    synonyms: [
      "diversidade de atividades", "opções de lazer", "programação variada"
    ],
    related_terms: [
      "atividades", "esporte", "recreação", "música", "eventos",
      "para crianças", "adultos", "família", "dia", "noite", "variedade"
    ],
    colloquial_variations: [
      "variedade", "opções", "atividades"
    ],
    examples: [
      "muitas opções de lazer", "programação diversa", "falta atividade para crianças"
    ]
  },

  "Lazer - Serviço": {
    synonyms: [
      "atendimento lazer", "staff de lazer", "monitores", "instrutores"
    ],
    related_terms: [
      "educado", "prestativo", "organização", "segurança", "suporte",
      "programação", "horários", "equipamentos", "orientação", "atividades"
    ],
    colloquial_variations: [
      "pessoal do lazer", "monitores", "instrutores", "tio", "tia"
    ],
    examples: [
      "monitores atenciosos", "staff de lazer prestativo", "orientação clara"
    ]
  },

  "Lazer - Atividades de Lazer": {
    synonyms: [
      "programação", "entretenimento", "recreação", "agenda de lazer", "kids", 
    ],
    related_terms: [
      "jogos", "música", "show", "festa", "animação",
      "esportes", "arte", "workshops", "concurso", "temático"
    ],
    colloquial_variations: [
      "atividades", "programação", "entretenimento"
    ],
    examples: [
      "programação divertida", "atividades para crianças", "agenda variada"
    ]
  },

  "Lazer - Piscina": {
    synonyms: [
      "pool", "área aquática", "piscinas"
    ],
    related_terms: [
      "temperatura", "limpeza", "cloração", "profundidade", "cadeiras",
      "toalhas", "bar na piscina", "horário", "salva-vidas", "aquecida"
    ],
    colloquial_variations: [
      "piscina", "piscininha", "pool"
    ],
    examples: [
      "piscina limpa", "água aquecida", "bar da piscina muito bom"
    ]
  },

  "Lazer - Spa": {
    synonyms: [
      "spa", "wellness", "centro de bem-estar"
    ],
    related_terms: [
      "massagem", "tratamentos", "sauna", "jacuzzi", "relaxamento",
      "agenda", "preço do spa", "ambiente", "profissionais", "qualidade"
    ],
    colloquial_variations: [
      "spa", "massagem", "tratamento"
    ],
    examples: [
      "spa excelente", "massagem relaxante", "tratamentos muito bons"
    ]
  },

  "Lazer - Academia": {
    synonyms: [
      "gym", "fitness", "sala de musculação"
    ],
    related_terms: [
      "equipamentos", "aparelhos", "esteira", "peso", "funcionamento",
      "horário", "ventilação", "água", "toalhas", "limpeza"
    ],
    colloquial_variations: [
      "academia", "gym", "fitness"
    ],
    examples: [
      "academia bem equipada", "aparelhos novos", "equipamentos em bom estado"
    ]
  },

  "Lazer - Entretenimento": {
    synonyms: [
      "shows", "música", "animação", "apresentações", "programação cultural"
    ],
    related_terms: [
      "DJ", "bandas", "teatro", "cinema", "eventos", "festa",
      "tema", "iluminação", "som", "cronograma"
    ],
    colloquial_variations: [
      "entretenimento", "música", "show"
    ],
    examples: [
      "entretenimento noturno ótimo", "música ao vivo", "shows animados"
    ]
  },

  // ========== PRODUTO ==========

  "Produto - Quarto": {
    synonyms: [
      "quarto", "acomodação", "room", "suíte"
    ],
    related_terms: [
      "tamanho do quarto", "conforto", "cama", "móveis", "vista", "decoração",
      "silêncio", "layout", "iluminação", "climatização", "quarto confortável"
    ],
    colloquial_variations: [
      "quarto", "acomodação", "suíte", 
    ],
    examples: [
      "quarto confortável", "tamanho adequado", "decoração bonita"
    ]
  },

  "Produto - Banheiro": {
    synonyms: [
      "banheiro", "bathroom", "toalete", "lavabo"
    ],
    related_terms: [
      "tamanho", "chuveiro", "pia", "amenities", "acabamento",
      "pressão da água", "ventilação", "iluminação", "layout"
    ],
    colloquial_variations: [
      "banheiro", "lavabo", "toalete"
    ],
    examples: [
      "banheiro amplo", "chuveiro excelente", "amenities de qualidade"
    ]
  },

  "Produto - Transfer": {
    synonyms: [
      "transporte", "traslado", "shuttle", "transfer"
    ],
    related_terms: [
      "aeroporto", "van", "ônibus", "carro", "motorista",
      "horário", "ponto de encontro", "grátis", "pago", "rota"
    ],
    colloquial_variations: [
      "transfer", "transporte", "traslado"
    ],
    examples: [
      "transfer pontual", "transporte gratuito", "traslado eficiente"
    ]
  },

  "Produto - Acessibilidade": {
    synonyms: [
      "acessível", "adaptado", "PCD", "acessibilidade"
    ],
    related_terms: [
      "cadeira de rodas", "rampa", "elevador", "barras de apoio",
      "sinalização", "banheiro adaptado", "rotas acessíveis", "mobilidade", "normas"
    ],
    colloquial_variations: [
      "acessível", "adaptado", "PCD"
    ],
    examples: [
      "quarto adaptado", "banheiro acessível", "rotas com rampa"
    ]
  },

  "Produto - Custo-benefício": {
    synonyms: [
      "valor da hospedagem", "preço da diária", "price", "cost", "custo-benefício"
    ],
    related_terms: [
      "economia", "promoção", "tarifa", "justo", "barato", "caro",
      "vale a pena", "comparativo", "pacote", "política de preço"
    ],
    colloquial_variations: [
      "preço da diária", "valor", "custo-benefício"
    ],
    examples: [
      "preço justo pela estadia", "ótimo custo-benefício", "tarifas competitivas"
    ]
  },

  "Produto - Localização": {
    synonyms: [
      "location", "posição", "situação", "lugar"
    ],
    related_terms: [
      "perto", "próximo", "acesso", "região", "bairro", "praia",
      "centro", "transporte", "pontos turísticos", "rotas"
    ],
    colloquial_variations: [
      "bem localizado", "onde fica", "lugar"
    ],
    examples: [
      "hotel bem localizado", "perto da praia", "acesso fácil"
    ]
  },

  "Produto - Vista": {
    synonyms: [
      "view", "panorama", "visão", "paisagem"
    ],
    related_terms: [
      "mar", "montanha", "cidade", "jardim", "linda", "maravilhosa",
      "feia", "ampla", "janela", "varanda"
    ],
    colloquial_variations: [
      "vista", "view", "paisagem"
    ],
    examples: [
      "vista para o mar linda", "panorama da cidade", "paisagem bonita"
    ]
  },

  "Produto - Experiência": {
    synonyms: [
      "estadia", "hospedagem", "stay", "vivência", "experiência"
    ],
    related_terms: [
      "conforto", "satisfação", "recomendação", "positivo", "negativo",
      "memória", "impressão", "qualidade geral", "serviços", "percepção"
    ],
    colloquial_variations: [
      "adorei", "amei", "experiência", "estadia"
    ],
    examples: [
      "experiência maravilhosa", "adorei a estadia", "recomendo", "ótimo hotel"
    ]
  },

  "Produto - Modernização": {
    synonyms: [
      "moderno", "atualizado", "novo", "renovado", "modernização"
    ],
    related_terms: [
      "reforma", "revitalização", "decoração", "equipamentos", "instalações",
      "contemporâneo", "antigo", "ultrapassado", "troca", "upgrade"
    ],
    colloquial_variations: [
      "moderno", "renovado", "atualizado"
    ],
    examples: [
      "hotel modernizado", "instalações novas", "precisa de reforma"
    ]
  },

  "Produto - All Inclusive": {
    synonyms: [
      "tudo incluído", "all inclusive", "pensão completa"
    ],
    related_terms: [
      "comidas", "bebidas", "atividades", "pacote", "incluído",
      "sem custo adicional", "buffet", "bar", "restaurant", "opções"
    ],
    colloquial_variations: [
      "all inclusive", "tudo incluído", "incluso"
    ],
    examples: [
      "sistema all inclusive excelente", "vale a pena", "bebidas inclusas"
    ]
  },

  "Produto - Isolamento Acustico": {
    synonyms: [
      "isolamento acústico", "isolamento sonoro", "insonorização"
    ],
    related_terms: [
      "barulho", "ruído", "som", "silencioso", "lacre de porta",
      "vedação", "janela", "descanso", "sono", "tratamento acústico"
    ],
    colloquial_variations: [
      "barulho", "isolamento", "silêncio"
    ],
    examples: [
      "muito barulho", "quarto silencioso", "falta isolamento acústico", "muito barulho do show"
    ]
  },

  "Produto - Tamanho": {
    synonyms: [
      "dimensões", "espaço", "área", "amplitude", "tamanho"
    ],
    related_terms: [
      "tamanho do hotel", "espaço das áreas", "amplo", "reduzido", "compacto",
      "layout", "circulação", "metragem", "capacidade", "proporção"
    ],
    colloquial_variations: [
      "pequeno", "apertado", "espaçoso", "amplo"
    ],
    examples: [
      "hotel pequeno", "espaços reduzidos", "tamanho adequado"
    ]
  },

  // ========== OPERAÇÕES ==========

  "Operações - Atendimento": {
    synonyms: [
      "atendimento geral", "service", "staff", "equipe", "atencioso", "atenciosos", "prestativo", "educado", "cordial"
    ],
    related_terms: [
      "funcionários", "prestativo", "educado", "cordial", "resposta",
      "tempo", "tratativa", "suporte", "comunicação", "ajuda"
    ],
    colloquial_variations: [
      "atendimento", "equipe", "staff"
    ],
    examples: [
      "funcionários muito atenciosos", "equipe prestativa", "atendimento excelente"
    ]
  },

  "Operações - Cartão de acesso": {
    synonyms: [
      "keycard", "cartão magnético", "RFID", "chave eletrônica"
    ],
    related_terms: [
      "falha no cartão", "não lê", "desmagnetizou", "porta", "acesso",
      "troca de cartão", "ativação", "segurança", "reposição", "liberação"
    ],
    colloquial_variations: [
      "cartão de acesso", "cartão do quarto", "chave"
    ],
    examples: [
      "cartão não funcionou", "chave desmagnetizada", "trocamos o keycard"
    ]
  },

  "Operações - Acesso ao quarto": {
    synonyms: [
      "acesso ao quarto", "liberação do quarto", "porta travada"
    ],
    related_terms: [
      "porta", "fechadura", "trava", "liberação", "chave", "tempo",
      "espera", "check-in", "entrada", "segurança"
    ],
    colloquial_variations: [
      "não abre a porta", "liberação do quarto", "acesso"
    ],
    examples: [
      "porta não abria", "demora na liberação", "acesso ao quarto resolvido", "cheguei no quarto e não estava pronto"
    ]
  },

  "Operações - Consumo Extra": {
    synonyms: [
      "extras", "despesas adicionais", "consumo extra", "taxa adicional"
    ],
    related_terms: [
      "serviços", "lançamentos", "cobrança", "recibo",
      "verificação", "auditoria", "ajuste", "checkout", "conta"
    ],
    colloquial_variations: [
      "extras", "consumo", "taxa"
    ],
    examples: [
      "cobrança de extras", "consumo do frigobar", "ajuste de taxa"
    ]
  },

  // ========== CORPORATIVO ==========

  "Corporativo - Marketing": {
    synonyms: [
      "divulgação", "comunicação", "propaganda", "branding", "campanhas"
    ],
    related_terms: [
      "redes sociais", "site", "email", "promoções", "conteúdo",
      "parcerias", "publicidade", "material", "imagem", "estratégia"
    ],
    colloquial_variations: [
      "marketing", "propaganda", "divulgação"
    ],
    examples: [
      "campanha bem feita", "comunicação clara", "material bonito"
    ]
  },

  "Corporativo - Reservas": {
    synonyms: [
      "booking corporativo", "reservas corporativas", "contingente", "bloqueio"
    ],
    related_terms: [
      "acordo", "negociação", "disponibilidade", "tarifa", "política",
      "contrato", "rooming list", "evento", "empresa", "pagamento"
    ],
    colloquial_variations: [
      "reservas", "booking", "bloqueio"
    ],
    examples: [
      "bloqueio confirmado", "tarifa negociada", "rooming list entregue"
    ]
  },

  "Corporativo - Financeiro": {
    synonyms: [
      "financeiro", "pagamentos", "faturamento", "contas a receber"
    ],
    related_terms: [
      "nota fiscal", "boleto", "fatura", "cobrança", "prazo",
      "conciliação", "auditoria", "NF-e", "política", "comprovante"
    ],
    colloquial_variations: [
      "financeiro", "pagamento", "fatura"
    ],
    examples: [
      "pagamento processado", "fatura emitida", "conciliação concluída"
    ]
  },

  "Corporativo - Nota Fiscal": {
    synonyms: [
      "NF", "nota fiscal", "documento fiscal", "comprovante fiscal"
    ],
    related_terms: [
      "emissão", "NF-e", "cadastro", "CNPJ", "dados", "chave",
      "cancelamento", "reenvio", "prazo", "validação"
    ],
    colloquial_variations: [
      "nota", "NF", "comprovante"
    ],
    examples: [
      "nota fiscal emitida", "reenvio de NF", "erro na nota corrigido"
    ]
  },

  // ========== EG ==========

  "EG - Abordagem": {
  synonyms: [
    "abordagem ao hóspede", "contato", "apresentação", "captação",
    "follow-up", "relacionamento", "pós-venda", "concierge de vendas"
  ],
  related_terms: [
    "Exclusive Guest", "clube de férias", "programa de pontos", "RCI",
    "intercâmbio de semanas", "benefícios", "vantagens", "oferta",
    "agendamento de apresentação", "prospecção", "promessa de upgrades",
    "equipe comercial", "captação no lobby", "termos e condições",
    "uso de pontos", "reserva pelo programa"
  ],
  colloquial_variations: [
    "abordagem", "pessoal do EG", "vendedor do EG",
    "programa Exclusive Guest", "clube Exclusive"
  ],
  examples: [
    "abordagem do EG no lobby foi cordial e informativa",
    "vendedor do EG insistente para marcar apresentação",
    "recebi follow-up do EG com proposta de pontos e estadias",
    "prometeram vantagens via RCI, mas fiquei em dúvida sobre as regras",
    "captação concierge do EG durante o café da manhã",
    "dificuldade para usar pontos do EG na reserva",
    "não percebi privilégios no hotel apesar de ser EG",
    "tratativa rápida do EG para esclarecer benefícios"
  ]
},

  "EG - Exclusive Guest": {
    synonyms: [
      "clube Exclusive Guest", "programa EG", "clube de férias Wish", "membership",
      "programa de férias", "clube de vantagens", "plano Exclusive Guest"
    ],
    related_terms: [
      "Grupo Wish", "acúmulo de pontos", "troca de semanas", "RCI",
      "destinos nacionais", "destinos internacionais", "benefícios exclusivos",
      "serviços especiais", "upgrades", "consultor EG", "venda de clube"
    ],
    colloquial_variations: [
      "EG", "clube de férias", "programa Exclusive", "clube Wish"
    ],
    examples: [
      "fiz adesão ao EG para acumular pontos", "consultor do EG explicou sobre RCI",
      "não consegui usar minhas semanas do Exclusive Guest", "programa EG oferece experiências exclusivas"
    ]
  },

};

/**
 * Gera texto enriquecido para embedding de uma keyword
 * Inclui sinônimos, termos relacionados, variações e exemplos
 */
export function generateEnrichedKeywordText(keywordLabel: string): string {
  const context = KEYWORD_SEMANTIC_CONTEXT[keywordLabel];

  if (context) {
    const parts = [
      keywordLabel,
      ...context.synonyms,
      ...context.related_terms.slice(0, 12),
      ...context.colloquial_variations,
      ...context.examples.slice(0, 3)
    ];
    return parts.join(' | ');
  }

  // Fallback automático para keywords não mapeadas
  const parts = keywordLabel.split(' - ');
  const department = parts[0];
  const aspect = parts[1] || keywordLabel;

  const autoSynonyms = generateAutoSynonyms(aspect);
  const autoRelated = generateAutoRelatedTerms(department, aspect);
  const autoVariations = generateAutoVariations(aspect);

  return [keywordLabel, department, aspect, ...autoSynonyms, ...autoRelated, ...autoVariations].join(' | ');
}

/**
 * Gera sinônimos automáticos baseados em regras e termos conhecidos
 */
function generateAutoSynonyms(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  const synonyms: string[] = [];

  const synonymMap: Record<string, string[]> = {
    // A&B
    'café da manhã': ['breakfast', 'café', 'desjejum', 'buffet matinal'],
    'almoço': ['lunch', 'refeição do meio-dia'],
    'jantar': ['dinner', 'janta', 'refeição noturna'],
    'serviço': ['atendimento', 'service', 'staff', 'equipe'],
    'gastronomia': ['culinária', 'cozinha', 'food'],
    'room service': ['serviço de quarto', 'pedido no quarto'],

    // Governança
    'banheiro': ['sanitário', 'toalete', 'lavabo'],
    'quarto': ['acomodação', 'suíte', 'room'],
    'áreas sociais': ['áreas comuns', 'espaços comuns'],
    'enxoval': ['roupa de cama', 'lençóis', 'toalhas'],
    'amenities': ['produtos de banho', 'itens de cortesia'],
    'frigobar': ['minibar', 'geladeira do quarto'],

    // Manutenção
    'ar-condicionado': ['ar', 'climatização', 'ac'],
    'elétrica': ['energia', 'rede elétrica', 'iluminação'],
    'elevador': ['lift', 'ascensor'],

    // Recepção
    'check-in': ['entrada', 'chegada', 'registro'],
    'check-out': ['saída', 'partida', 'checkout'],
    'reservas': ['booking', 'pré-reserva'],

    // Tecnologia
    'wi-fi': ['wifi', 'internet', 'conexão'],
    'tv': ['televisão', 'televisor', 'smart tv'],

    // Lazer
    'piscina': ['pool', 'área aquática'],
    'academia': ['gym', 'fitness'],
    'spa': ['wellness', 'bem-estar'],
    'entretenimento': ['shows', 'música', 'animação'],

    // Produto
    'transfer': ['transporte', 'traslado', 'shuttle'],
    'acessibilidade': ['adaptado', 'pcd'],
    'custo-benefício': ['preço da diária', 'valor da hospedagem'],
    'localização': ['location', 'onde fica'],
    'vista': ['view', 'panorama', 'paisagem'],
    'experiência': ['estadia', 'hospedagem', 'stay'],
    'all inclusive': ['tudo incluído', 'pensão completa'],
    'isolamento acustico': ['insonorização', 'isolamento sonoro'],
    'tamanho': ['dimensões', 'espaço', 'amplitude'],

    // Operações
    'cartão de acesso': ['keycard', 'cartão magnético', 'rfid'],
    'acesso ao quarto': ['liberação do quarto', 'porta travada'],
    'consumo extra': ['extras', 'taxa adicional'],

    // Corporativo
    'marketing': ['propaganda', 'divulgação', 'branding'],
    'reservas corporativas': ['booking corporativo', 'bloqueio'],
    'financeiro': ['pagamentos', 'faturamento'],
    'nota fiscal': ['nf', 'documento fiscal']
  };

  for (const [key, syns] of Object.entries(synonymMap)) {
    if (lowerTerm.includes(key)) synonyms.push(...syns);
  }

  if (synonyms.length === 0) synonyms.push(lowerTerm);
  return Array.from(new Set(synonyms)).slice(0, 6);
}

/**
 * Gera termos relacionados automaticamente por departamento
 */
function generateAutoRelatedTerms(department: string, aspect: string): string[] {
  const dep = department.toLowerCase();
  switch (dep) {
    case 'a&b':
      return ['alimentos', 'bebidas', 'restaurante', 'bar', 'cardápio', 'garçom', 'pedido', 'conta', 'preço das refeições', 'tempo de atendimento'];
    case 'limpeza':
    case 'governança':
      return ['housekeeping', 'camareira', 'higiene', 'arrumação', 'troca de roupas', 'checklist', 'cheiro', 'poeira', 'organização', 'frequência'];
    case 'manutenção':
      return ['reparo', 'conserto', 'técnico', 'verificação', 'ajuste', 'peça', 'falha', 'funcionamento', 'preventiva', 'corretiva'];
    case 'recepção':
      return ['lobby', 'front desk', 'fila', 'documentos', 'orientação', 'suporte', 'registro', 'chave', 'liberação de quarto', 'política'];
    case 'tecnologia':
    case 'ti':
      return ['rede', 'sinal', 'senha', 'estabilidade', 'latência', 'canais', 'imagem', 'som', 'configuração', 'equipamento'];
    case 'lazer':
      return ['piscina', 'spa', 'academia', 'programação', 'eventos', 'recreação', 'segurança', 'equipamentos', 'horários', 'capacidade'];
    case 'produto':
      return ['quarto', 'banheiro', 'vista', 'localização', 'experiência', 'conforto', 'layout', 'silêncio', 'tarifa', 'pacote'];
    case 'operações':
      return ['cartão', 'acesso', 'porta', 'keycard', 'segurança', 'consumo', 'lançamentos', 'cobrança', 'procedimento', 'ajuda'];
    case 'corporativo':
      return ['contrato', 'tarifa', 'nota fiscal', 'fatura', 'pagamento', 'reserva', 'empresa', 'acordo', 'política', 'prazo'];
    case 'eg':
      return ['hóspede', 'contato', 'feedback', 'satisfação', 'tratativa', 'resposta', 'follow-up', 'prevenção', 'proatividade', 'comunicação'];
    default:
      return [department, aspect];
  }
}

/**
 * Gera variações coloquiais simples
 */
function generateAutoVariations(term: string): string[] {
  const t = term.toLowerCase();
  const variants = new Set<string>([t]);
  variants.add(t.replace(/ç/g, 'c'));
  variants.add(t.replace(/á|à|ã|â/g, 'a').replace(/é|ê/g, 'e').replace(/í/g, 'i').replace(/ó|ô/g, 'o').replace(/ú/g, 'u'));
  variants.add(t.replace(/\s+/g, '-'));
  return Array.from(variants).slice(0, 5);
}

/**
 * Gera texto enriquecido para embedding de um problem (alinhado à nova taxonomia)
 */
export function generateEnrichedProblemText(problemLabel: string): string {
  const text = problemLabel.toLowerCase();

  const synonyms: string[] = [];
  const indicators: string[] = [];
  const negatives: string[] = [];

  const add = (arr: string[], items: string[]) => { for (const i of items) arr.push(i); };

  // Demora / Atendimento
  if (text.includes('demora') || text.includes('lento') || text.includes('espera')) {
    add(synonyms, ['lentidão', 'delay', 'espera']);
    add(indicators, ['demorou', 'lento', 'esperando', 'tempo', 'minutos']);
    add(negatives, ['demorou muito', 'muito tempo', 'esperando horas']);
  }

  // Limpeza
  if (text.includes('sujo') || text.includes('limpeza') || text.includes('higiene')) {
    add(synonyms, ['sujeira', 'falta de higiene']);
    add(indicators, ['sujo', 'não limparam', 'bagunçado', 'odor']);
    add(negatives, ['muito sujo', 'falta de limpeza']);
  }

  // Equipamento / Falha
  if (text.includes('quebrado') || text.includes('defeito') || text.includes('não funciona')) {
    add(synonyms, ['com defeito', 'falha', 'não funciona']);
    add(indicators, ['quebrado', 'defeito', 'não liga', 'parado']);
    add(negatives, ['não funciona', 'com defeito', 'quebrado']);
  }

  // Wi-Fi / Internet
  if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet') || text.includes('conexão')) {
    add(synonyms, ['conexão ruim', 'internet ruim', 'wifi instável']);
    add(indicators, ['lento', 'cai', 'instável', 'fraco', 'não conecta']);
    add(negatives, ['wifi não funciona', 'internet lenta', 'sempre cai']);
  }

  // Preço
  if (text.includes('preço') || text.includes('caro') || text.includes('valor')) {
    add(synonyms, ['preço elevado', 'valor alto']);
    add(indicators, ['caro', 'preço alto', 'não vale']);
    add(negatives, ['caro demais', 'preço alto']);
  }

  // Ruído
  if (text.includes('barulho') || text.includes('ruído') || text.includes('barulhento')) {
    add(synonyms, ['ruído', 'barulhento']);
    add(indicators, ['barulho', 'som alto', 'não consegui dormir']);
    add(negatives, ['muito barulho', 'ruído excessivo']);
  }

  // Fallback: variações mínimas quando não há mapeamento
  if (synonyms.length === 0 && indicators.length === 0 && negatives.length === 0) {
    const baseTokens = generateAutoVariations(problemLabel);
    return [problemLabel, ...baseTokens].join(' | ');
  }

  const parts = [
    problemLabel,
    ...Array.from(new Set(synonyms)).slice(0, 8),
    ...Array.from(new Set(indicators)).slice(0, 10),
    ...Array.from(new Set(negatives)).slice(0, 6)
  ];

  return parts.join(' | ');
}

/**
 * Expande query do usuário com sinônimos e variações (alinhado à nova taxonomia)
 */
export function expandUserQuery(userText: string): string {
  const textLower = userText.toLowerCase();
  const expansions: string[] = [userText];

  const commonExpansions: Record<string, string[]> = {
    // A&B
    'restaurante': ['a&b', 'gastronomia', 'comida', 'cardápio', 'garçom'],
    'café da manhã': ['breakfast', 'café', 'desjejum', 'buffet matinal'],
    'almoço': ['lunch', 'meio-dia', 'refeição do almoço'],
    'jantar': ['dinner', 'janta', 'refeição noturna'],
    'room service': ['serviço de quarto', 'pedido no quarto'],

    // Governança
    'limpeza': ['higiene', 'arrumação', 'housekeeping'],
    'camareira': ['housekeeping', 'governança', 'arrumação', 'limpeza'],
    'banheiro': ['sanitário', 'toalete', 'lavabo'],
    'quarto': ['acomodação', 'suíte', 'room'],
    'amenities': ['produtos de banho', 'itens de cortesia'],
    'frigobar': ['minibar', 'geladeira do quarto'],

    // Manutenção
    'ar condicionado': ['ar-condicionado', 'climatização', 'ac'],
    'elétrica': ['energia', 'rede elétrica', 'iluminação'],
    'elevador': ['lift', 'ascensor'],

    // Recepção
    'recepção': ['front desk', 'lobby', 'atendimento'],
    'check-in': ['entrada', 'chegada', 'registro'],
    'check-out': ['saída', 'partida', 'checkout'],
    'estacionamento': ['garagem', 'parking', 'vaga'],
    'reservas': ['booking', 'pré-reserva'],

    // Tecnologia
    'wifi': ['wi-fi', 'internet', 'conexão', 'rede'],
    'tv': ['televisão', 'televisor', 'smart tv', 'canais'],

    // Lazer
    'piscina': ['pool', 'área aquática'],
    'academia': ['gym', 'fitness', 'musculação'],
    'spa': ['wellness', 'bem-estar', 'massagem'],
    'entretenimento': ['shows', 'música', 'animação'],

    // Produto
    'transfer': ['transporte', 'traslado', 'shuttle'],
    'localização': ['location', 'onde fica', 'próximo'],
    'custo benefício': ['preço da diária', 'valor da hospedagem'],
    'vista': ['view', 'panorama', 'paisagem'],
    'experiência': ['estadia', 'hospedagem', 'stay'],
    'all inclusive': ['tudo incluído', 'pensão completa'],
    'isolamento acústico': ['insonorização', 'isolamento sonoro'],

    // Operações
    'cartão de acesso': ['keycard', 'cartão magnético', 'rfid'],
    'acesso ao quarto': ['liberação do quarto', 'porta travada'],
    'consumo extra': ['extras', 'taxa adicional'],

    // Corporativo
    'nota fiscal': ['nf', 'nf-e', 'documento fiscal'],
    'financeiro': ['pagamentos', 'faturamento'],
    'marketing': ['divulgação', 'propaganda'],
  };

  for (const [term, syns] of Object.entries(commonExpansions)) {
    if (textLower.includes(term)) expansions.push(...syns);
  }

  const noAccents = userText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  expansions.push(noAccents);

  return Array.from(new Set(expansions)).join(' ');
}