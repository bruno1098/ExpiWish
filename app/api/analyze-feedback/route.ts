import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Cache em memória para análises repetidas
const analysisCache = new Map<string, any>();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutos

// Controle de rate limiting
let requestCount = 0;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 180; // Limite mais alto para melhor performance

// Reset do contador a cada minuto
setInterval(() => {
  requestCount = 0;
}, RATE_LIMIT_WINDOW);

// Função para normalizar texto (deve vir antes do dicionário)
function normalizeText(text: string): string {
  if (!text) return text;
  
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Dicionário raw antes da normalização
const RAW_NORMALIZATION_DICT: Record<string, string> = {
  // Keywords genéricas
  "serviço / café da manhã": "A&B - Serviço", 
  "café da manhã": "A&B - Café da manhã",
  "check-in": "Recepção - Serviço",
  "check in": "Recepção - Serviço",
  "check-out": "Recepção - Serviço",
  "check out": "Recepção - Serviço",
  "wifi": "Tecnologia - Wi-fi",
  "wi-fi": "Tecnologia - Wi-fi",
  "wi fi": "Tecnologia - Wi-fi",
  "internet": "Tecnologia - Wi-fi",
  "ar condicionado": "Ar-condicionado",
  "ar-condicionado": "Ar-condicionado",
  "estrutura de lazer": "Lazer - Estrutura",
  "lazer estrutura": "Lazer - Estrutura",
  "manutenção do banheiro": "Manutenção - Banheiro",
  "manutenção do quarto": "Manutenção - Quarto", 
  "manutenção quarto": "Manutenção - Quarto",
  "limpeza do quarto": "Limpeza - Quarto",
  "limpeza quarto": "Limpeza - Quarto",
  "limpeza do banheiro": "Limpeza - Banheiro",
  "limpeza banheiro": "Limpeza - Banheiro",
  "limpeza das áreas sociais": "Limpeza - Áreas sociais",
  "limpeza áreas sociais": "Limpeza - Áreas sociais",
  // Problemas padronizados
  "lento": "Demora no Atendimento",
  "demora no atendimento": "Demora no Atendimento",
  "atendimento lento": "Demora no Atendimento",
  "serviço lento": "Demora no Atendimento",
  "ruído": "Ruído Excessivo",
  "barulho": "Ruído Excessivo",
  "ruído excessivo": "Ruído Excessivo",
  "muito barulho": "Ruído Excessivo",
  "barulhos": "Ruído Excessivo",
  "barulhento": "Ruído Excessivo",
  "barulhenta": "Ruído Excessivo",
  "carrinho": "Ruído Excessivo",
  "carrinhos": "Ruído Excessivo",
  "carrinho de serviço": "Ruído Excessivo",
  "carrinhos de serviço": "Ruído Excessivo",
  "quarto pequeno": "Espaço Insuficiente",
  "espaço pequeno": "Espaço Insuficiente",
  "pouco espaço": "Espaço Insuficiente",
  "comida ruim": "Qualidade da Comida",
  "qualidade da comida": "Qualidade da Comida",
  "comida sem sabor": "Qualidade da Comida",
  "não funciona": "Não Funciona",
  "quebrado": "Não Funciona",
  "com defeito": "Não Funciona",
  "conexão ruim": "Conexão Instável",
  "internet lenta": "Conexão Instável",
  "wifi lento": "Conexão Instável",
  "falta de limpeza": "Falta de Limpeza",
  "sujo": "Falta de Limpeza",
  "sem limpeza": "Falta de Limpeza",
  "preço alto": "Preço Alto",
  "caro": "Preço Alto",
  "muito caro": "Preço Alto",
  "falta de variedade": "Falta de Variedade",
  "pouca variedade": "Falta de Variedade",
  "sem variedade": "Falta de Variedade",
  // Normalizações para as novas keywords dos Excel
  "garçom": "A&B - Serviço",
  "garçons": "A&B - Serviço", 
  "garcom": "A&B - Serviço",
  "garcons": "A&B - Serviço",
  "bar": "A&B - Serviço",
  "bingo": "Lazer - Atividades de Lazer",
  "recreação": "Lazer - Atividades de Lazer",
  "recreacao": "Lazer - Atividades de Lazer",
  "Lazer": "Lazer - Atividades de Lazer", 
  "Paz": "Lazer - Atividades de Lazer", 
  "tia da recreação": "Lazer - Serviço",
  "tio": "Lazer - Serviço",
  "tia": "Lazer - Serviço",
  "monitores": "Lazer - Serviço",
  "monitor": "Lazer - Serviço",
  "karaokê": "Lazer - Atividades de Lazer",
  "karaoke": "Lazer - Atividades de Lazer",
  "fogueira": "Lazer - Atividades de Lazer",
  "piscina fria": "Muito Frio/Quente",
  "janela suja": "Falta de Limpeza",
  "janelas sujas": "Falta de Limpeza",
  "janelas do quarto sujas": "Falta de Limpeza",
  "cheiro de mofo": "Falta de Limpeza",
  "mofo": "Falta de Limpeza",
  "poucos pontos de luz": "Falta de Equipamento",
  "baixa iluminação": "Falta de Equipamento",
  "pouca luminosidade": "Falta de Equipamento",
  "falta de luminosidade": "Falta de Equipamento",
  // Adições baseadas nas edições recentes (iluminação/tomadas)
  "poucos pontos de luz elétrica": "Falta de Equipamento",
  "poucos pontos de energia": "Falta de Equipamento",
  "poucos pontos de tomada": "Falta de Equipamento",
  "poucas tomadas": "Falta de Equipamento",
  "tomadas insuficientes": "Falta de Equipamento",
  "tomada insuficiente": "Falta de Equipamento",
  "falta de tomada": "Falta de Equipamento",
  "falta de tomadas": "Falta de Equipamento",
  "iluminação insuficiente": "Falta de Equipamento",
  "iluminacao insuficiente": "Falta de Equipamento",
  // Adições baseadas nas edições recentes (modernização/antigo)
  "falta de modernização": "Falta de Manutenção",
  "falta de modernizacao": "Falta de Manutenção",
  "hotel antigo": "Falta de Manutenção",
  "estrutura antiga": "Falta de Manutenção",
  "instalações antigas": "Falta de Manutenção",
  "instalacoes antigas": "Falta de Manutenção",
  "precisa modernizar": "Falta de Manutenção",
  "precisa de modernização": "Falta de Manutenção",
  "precisa de modernizacao": "Falta de Manutenção",
  "precisa de reforma": "Falta de Manutenção",
  "precisa reforma": "Falta de Manutenção",
  "cofre": "Não Funciona",
  "fechadura": "Não Funciona",
  "torneira": "Não Funciona",
  "espirra água": "Falta de Manutenção",
  "quadro reduzido": "Capacidade Insuficiente",
  "maior variedade de frutas": "Falta de Variedade",
  "qualidade do café da manhã": "Qualidade da Comida",
  "abordagem repetitiva": "Comunicação Ruim",
  // Regras específicas para pressões de venda / multipropriedade / timeshare
  "insistência": "Comunicação Ruim",
  "insistencia": "Comunicação Ruim",
  "insistente": "Comunicação Ruim",
  "insistiram": "Comunicação Ruim",
  "pressão": "Comunicação Ruim",
  "pressao": "Comunicação Ruim",
  "pressionaram": "Comunicação Ruim",
  "coação": "Comunicação Ruim",
  "coacao": "Comunicação Ruim",
  "assédio": "Comunicação Ruim",
  "assedio": "Comunicação Ruim",
  "venda agressiva": "Cotas",
  "vendas agressivas": "Cotas",
  "apresentação de vendas": "Cotas",
  "apresentacao de vendas": "Cotas",
  "multipropriedade": "Cotas",
  "timeshare": "Cotas",
  "compra de multipropriedade": "Cotas",
  "insistência para comprar": "Cotas",
  "pressão para comprar": "Cotas",
  "coagidos": "Cotas",
  "salas de trabalho": "Falta de Disponibilidade",
  // Elogios de atendimento e simpatia - direcionamento para Atendimento/Operações
  "simpático": "Atendimento",
  "simpática": "Atendimento",
  "simpaticos": "Atendimento",
  "simpaticas": "Atendimento",
  "simpáticos": "Atendimento",
  "simpáticas": "Atendimento",
  "gentil": "Atendimento",
  "gentis": "Atendimento",
  "educado": "Atendimento",
  "educada": "Atendimento",
  "educados": "Atendimento",
  "educadas": "Atendimento",
  "cordial": "Atendimento",
  "cordiais": "Atendimento",
  "solicito": "Atendimento",
  "solicita": "Atendimento",
  "solícito": "Atendimento",
  "solícita": "Atendimento",
  "solícitos": "Atendimento",
  "solícitas": "Atendimento",
  "amável": "Atendimento",
  "amáveis": "Atendimento",
  "prestativo": "Atendimento",
  "prestativa": "Atendimento",
  "prestativos": "Atendimento",
  "prestativas": "Atendimento",
  "bem atendido": "Atendimento",
  "bem atendida": "Atendimento",
  "bem atendidos": "Atendimento",
  "bem atendidas": "Atendimento",
  "bem recebido": "Atendimento",
  "bem recebida": "Atendimento",
  "bem recebidos": "Atendimento",
  "bem recebidas": "Atendimento",
  "recepcionistas": "Atendimento",
  "funcionários simpáticos": "Atendimento",
  "funcionarios simpaticos": "Atendimento",
  "funcionária simpática": "Atendimento",
  "funcionario simpatico": "Atendimento",
  "staff simpático": "Atendimento",
  "staff simpatico": "Atendimento",
  "equipe simpática": "Atendimento",
  "equipe simpatica": "Atendimento",
  "atendimento excelente": "Atendimento",
  "atendimento ótimo": "Atendimento",
  "atendimento otimo": "Atendimento",
  "atendimento muito bom": "Atendimento",
  "bom atendimento": "Atendimento",
  "ótimo atendimento": "Atendimento",
  "otimo atendimento": "Atendimento",
  "excelente atendimento": "Atendimento",
  // Termos específicos de concierge
  "concierge": "Concierge",
  "concierges": "Concierge", 
  "atendimento da concierge": "Concierge",
  "atendimento do concierge": "Concierge",
  "serviço de concierge": "Concierge",
  "concierge excelente": "Concierge",
  "concierge ótima": "Concierge",
  "concierge perfeita": "Concierge",
  // Termos de recreação/animação (evitando duplicatas)
  "equipe de recreação": "Lazer - Serviço",
  "equipe da recreação": "Lazer - Serviço",
  "pessoal da recreação": "Lazer - Serviço",
  "funcionários da recreação": "Lazer - Serviço",
  "animação": "Lazer - Atividades de Lazer",
  "animadores": "Lazer - Serviço",
  "música": "Lazer - Serviço",
  "musica": "Lazer - Serviço",
  "som": "Lazer - Serviço",
  "restaurante": "A&B - Serviço",
  "travesseiro": "Travesseiro",
  "colchão": "Colchão",
  "colchao": "Colchão",
  "espelho": "Espelho",
  // Normalizações para problemas específicos
  "fila": "Fila Longa",
  "fila longa": "Fila Longa", 
  "fila no check-in": "Fila Longa",
  "bebida ruim": "Qualidade de Bebida",
  "drink ruim": "Qualidade de Bebida",
  "sem espelho": "Falta de Equipamento",
  "faltando espelho": "Falta de Equipamento",
  "água indisponível": "Falta de Disponibilidade",
  "sem água": "Falta de Disponibilidade",
  "música alta": "Ruído Excessivo",
  "som alto": "Ruído Excessivo",
  "música muito alta": "Ruído Excessivo",
  "barulho da música": "Ruído Excessivo",
  "volume alto": "Ruído Excessivo",
  "senti falta": "Falta de Disponibilidade",
  "faltou": "Falta de Disponibilidade",
  "não tinha": "Falta de Disponibilidade",
  "sem problemas": "VAZIO",
  // Termos de comida que devem ir para A&B
  "food": "A&B - Serviço",
  "meal": "A&B - Serviço", 
  "dinner": "A&B - Serviço",
  "lunch": "A&B - Serviço",
  "breakfast": "A&B - Café da manhã",
  "pasta": "A&B - Serviço",
  "restaurant": "A&B - Serviço",
  "drink": "A&B - Serviço",
  "beverage": "A&B - Serviço",
  "coffee": "A&B - Café da manhã",
  "tea": "A&B - Café da manhã",
  // Termos específicos de gastronomia vs alimentos
  "gastronomia": "A&B - Gastronomia",
  "culinária": "A&B - Gastronomia",
  "culinaria": "A&B - Gastronomia",
  "pratos": "A&B - Gastronomia",
  "cardápio": "A&B - Gastronomia",
  "cardapio": "A&B - Gastronomia",
  "chef": "A&B - Gastronomia",
  "prato típico": "A&B - Gastronomia",
  "especialidade": "A&B - Gastronomia",
  // Alimentos gerais
  "comida": "A&B - Alimentos",
  "alimentos": "A&B - Alimentos",
  "alimentação": "A&B - Alimentos",
  "alimentacao": "A&B - Alimentos",
  // Termos de localização/vista
  "localização": "Localização",
  "localizacao": "Localização", 
  "localizado": "Localização",
  "vista": "Localização",
  "vista mar": "Localização",
  "proximidade": "Localização",
  "perto": "Localização",
  "próximo": "Localização",
  "proximo": "Localização",
  "acesso": "Localização",
  // Mais termos de atendimento específicos
  "joão batista": "Atendimento",
  "joao batista": "Atendimento",
  "recepcionista": "Recepção - Serviço",
  "pessoal da recepção": "Recepção - Serviço",
  "pessoal da recepcao": "Recepção - Serviço",
  "atendimento na recepção": "Recepção - Serviço",
  "atendimento da recepção": "Recepção - Serviço",
};

// Dicionário normalizado para lookup eficiente
const NORMALIZATION_DICT = Object.fromEntries(
  Object.entries(RAW_NORMALIZATION_DICT).map(([k, v]) => [normalizeText(k), v])
);

// Keywords oficiais permitidas
const OFFICIAL_KEYWORDS = [
  "A&B - Café da manhã", "A&B - Serviço", "A&B - Variedade", "A&B - Preço", "A&B - Gastronomia", "A&B - Alimentos",
  "Limpeza - Quarto", "Limpeza - Banheiro", "Limpeza - Áreas sociais", "Enxoval", "Governança - Serviço",
  "Manutenção - Quarto", "Manutenção - Banheiro", "Manutenção - Instalações", "Manutenção - Serviço",
  "Ar-condicionado", "Elevador", "Frigobar", "Infraestrutura",
  "Lazer - Variedade", "Lazer - Estrutura", "Spa", "Piscina", "Lazer - Serviço", "Lazer - Atividades de Lazer",
  "Tecnologia - Wi-fi", "Tecnologia - TV", "Estacionamento",
  "Atendimento", "Acessibilidade", "Reserva de cadeiras (pool)", "Processo",
  "Custo-benefício", "Comunicação", "Recepção - Serviço",
  "Concierge", "Cotas", "Reservas", "Água", "Recreação",
  "Travesseiro", "Colchão", "Espelho", "Localização", "Mixologia"
];

// Departamentos oficiais
const OFFICIAL_DEPARTMENTS = [
  "A&B", "Governança", "Manutenção", "Manutenção - Quarto", "Manutenção - Instalações",
  "Lazer", "TI", "Operações", "Qualidade", "Recepção", 
  "Programa de vendas", "Comercial"
];

// Problemas padronizados
const STANDARD_PROBLEMS = [
  "Demora no Atendimento", "Espaço Insuficiente", "Qualidade da Comida",
  "Não Funciona", "Muito Frio/Quente", "Conexão Instável", "Falta de Limpeza",
  "Ruído Excessivo", "Capacidade Insuficiente", "Falta de Cadeiras", 
  "Preço Alto", "Falta de Variedade", "Qualidade Baixa", "Falta de Manutenção",
  "Falta de Acessibilidade", "Comunicação Ruim", "Processo Lento", 
  "Falta de Equipamento", "Fila Longa", "Qualidade de Bebida", 
  "Falta de Disponibilidade", "VAZIO", "Não identificado"
];

// Arrays normalizados para busca eficiente
const NORMALIZED_KEYWORDS = OFFICIAL_KEYWORDS.map(k => normalizeText(k));
const NORMALIZED_PROBLEMS = STANDARD_PROBLEMS.map(p => normalizeText(p));

// Função para validar e corrigir keyword - com mais autonomia para a IA
function validateKeyword(keyword: string, context?: string): string {
  const normalized = normalizeText(keyword);
  
  // Verificar se está na lista oficial normalizada (match exato)
  const index = NORMALIZED_KEYWORDS.indexOf(normalized);
  if (index !== -1) {
    return OFFICIAL_KEYWORDS[index];
  }
  
  // Tentar encontrar correspondência próxima nas keywords oficiais
  const partialMatch = NORMALIZED_KEYWORDS.findIndex(official => 
    official.includes(normalized) || normalized.includes(official)
  );
  
  if (partialMatch !== -1) {
    return OFFICIAL_KEYWORDS[partialMatch];
  }
  
  // Verificar se a keyword da IA é uma variação válida de keywords existentes
  // Permitir que a IA use sua própria classificação se fizer sentido semântico
  const contextNormalized = normalizeText(context || '');
  
  // Se a IA sugeriu algo relacionado a A&B e o contexto confirma
  if (normalized.includes('a&b') || normalized.includes('alimento') || normalized.includes('bebida') ||
      normalized.includes('comida') || normalized.includes('restaurante') || normalized.includes('bar')) {
    // Tentar encontrar a subcategoria mais específica de A&B
    if (contextNormalized.includes('cafe') || contextNormalized.includes('breakfast')) {
      return "A&B - Café da manhã";
    }
    if (contextNormalized.includes('preco') || contextNormalized.includes('caro') || contextNormalized.includes('barato')) {
      return "A&B - Preço";
    }
    if (contextNormalized.includes('variedade') || contextNormalized.includes('opcao') || contextNormalized.includes('escolha')) {
      return "A&B - Variedade";
    }
    return "A&B - Serviço";
  }
  
  // Se a IA sugeriu algo relacionado a lazer e o contexto confirma
  if (normalized.includes('lazer') || normalized.includes('recreacao') || normalized.includes('piscina') ||
      normalized.includes('spa') || normalized.includes('atividade')) {
    if (contextNormalized.includes('piscina') || contextNormalized.includes('pool')) {
      return "Piscina";
    }
    if (contextNormalized.includes('spa') || contextNormalized.includes('massagem')) {
      return "Spa";
    }
    if (contextNormalized.includes('estrutura') || contextNormalized.includes('instalacao')) {
      return "Lazer - Estrutura";
    }
    if (contextNormalized.includes('variedade') || contextNormalized.includes('opcao')) {
      return "Lazer - Variedade";
    }
    if (contextNormalized.includes('recreacao') || contextNormalized.includes('atividade') || 
        contextNormalized.includes('tio') || contextNormalized.includes('tia')) {
      return "Lazer - Atividades de Lazer";
    }
    return "Lazer - Serviço";
  }
  
  // Se a IA sugeriu algo relacionado a limpeza/governança e o contexto confirma
  if (normalized.includes('limpeza') || normalized.includes('governanca') || normalized.includes('enxoval') ||
      normalized.includes('limpo') || normalized.includes('sujo')) {
    if (contextNormalized.includes('quarto') || contextNormalized.includes('room')) {
      return "Limpeza - Quarto";
    }
    if (contextNormalized.includes('banheiro') || contextNormalized.includes('bathroom')) {
      return "Limpeza - Banheiro";
    }
    if (contextNormalized.includes('area') || contextNormalized.includes('social') || contextNormalized.includes('publica')) {
      return "Limpeza - Áreas sociais";
    }
    if (contextNormalized.includes('toalha') || contextNormalized.includes('lencol') || contextNormalized.includes('enxoval')) {
      return "Enxoval";
    }
    return "Governança - Serviço";
  }
  
  // Se a IA sugeriu algo relacionado a manutenção e o contexto confirma
  if (normalized.includes('manutencao') || normalized.includes('quebrado') || normalized.includes('defeito') ||
      normalized.includes('reforma') || normalized.includes('conservacao')) {
    if (contextNormalized.includes('quarto') || contextNormalized.includes('room')) {
      return "Manutenção - Quarto";
    }
    if (contextNormalized.includes('banheiro') || contextNormalized.includes('bathroom')) {
      return "Manutenção - Banheiro";
    }
    if (contextNormalized.includes('instalacao') || contextNormalized.includes('predial') || contextNormalized.includes('estrutura')) {
      return "Manutenção - Instalações";
    }
    return "Manutenção - Serviço";
  }
  
  // Se a IA sugeriu algo relacionado a tecnologia e o contexto confirma
  if (normalized.includes('tecnologia') || normalized.includes('wi-fi') || normalized.includes('wifi') ||
      normalized.includes('internet') || normalized.includes('tv') || normalized.includes('tecnologico')) {
    if (contextNormalized.includes('tv') || contextNormalized.includes('televisao') || contextNormalized.includes('canal')) {
      return "Tecnologia - TV";
    }
    return "Tecnologia - Wi-fi";
  }
  
  // Se a IA sugeriu algo relacionado a recepção e o contexto confirma
  if (normalized.includes('recepcao') || normalized.includes('check') || normalized.includes('reception') ||
      normalized.includes('front desk')) {
    return "Recepção - Serviço";
  }
  
  // Se a IA sugeriu algo relacionado a localização e o contexto confirma
  if (normalized.includes('localizacao') || normalized.includes('location') || normalized.includes('vista') ||
      normalized.includes('acesso') || normalized.includes('proximidade')) {
    return "Localização";
  }
  
  // FALLBACK INTELIGENTE: análise semântica do contexto, não palavras-chave fixas
  // Dar autonomia à IA para entender o sentido do comentário
  
  // PRIORIDADE 1: Análise semântica de recreação/lazer
  // Detectar padrões que indicam atividades de lazer ou recreação
  const indicadoresLazer = [
    'recreacao', 'recreação', 'animacao', 'animação', 'atividade', 'diversao', 'diversão',
    'brincadeira', 'entretenimento', 'lazer', 'legal', 'divertido', 'fogueira', 'karaoke',
    'mixologia', 'aula de', 'monitor', 'animador', 'tio ', 'tia '
  ];
  
  const temIndicadorLazer = indicadoresLazer.some(termo => contextNormalized.includes(termo));
  
  if (temIndicadorLazer) {
    // Se menciona atividades específicas → Atividades de Lazer
    if (contextNormalized.includes('mixologia') || contextNormalized.includes('aula de') || 
        contextNormalized.includes('karaoke') || contextNormalized.includes('fogueira') ||
        contextNormalized.includes('atividade')) {
      return "Lazer - Atividades de Lazer";
    }
    // Caso contrário → Serviço de Lazer
    return "Lazer - Serviço";
  }
  
  // PRIORIDADE 2: Análise semântica de A&B/Restaurante
  // Detectar padrões que indicam alimentação, bebidas ou serviço de restaurante
  const indicadoresAB = [
    'restaurante', 'comida', 'cafe', 'café', 'bar', 'bebida', 'drink', 'garcom', 'garçom',
    'alimento', 'refeicao', 'refeição', 'jantar', 'almoco', 'almoço', 'breakfast', 'food',
    'meal', 'dinner', 'lunch', 'atendimento do restaurante', 'pessoal do restaurante',
    'equipe do restaurante', 'cardapio', 'cardápio'
  ];
  
  const temIndicadorAB = indicadoresAB.some(termo => contextNormalized.includes(termo));
  
  if (temIndicadorAB) {
    // Análise mais específica do contexto
    if (contextNormalized.includes('cafe') || contextNormalized.includes('café') || 
        contextNormalized.includes('breakfast')) {
      return "A&B - Café da manhã";
    }
    if (contextNormalized.includes('preco') || contextNormalized.includes('preço') || 
        contextNormalized.includes('caro') || contextNormalized.includes('barato')) {
      return "A&B - Preço";
    }
    if (contextNormalized.includes('variedade') || contextNormalized.includes('opcao') || 
        contextNormalized.includes('opção') || contextNormalized.includes('escolha')) {
      return "A&B - Variedade";
    }
    return "A&B - Serviço";
  }
  
  // PRIORIDADE 3: Análise semântica de outros serviços específicos
  if (contextNormalized.includes('recepcao') || contextNormalized.includes('recepção') || 
      contextNormalized.includes('check') || contextNormalized.includes('front desk')) {
    return "Recepção - Serviço";
  }
  
  if (contextNormalized.includes('piscina') || contextNormalized.includes('pool')) {
    return "Piscina";
  }
  
  if (contextNormalized.includes('wifi') || contextNormalized.includes('wi-fi') || 
      contextNormalized.includes('internet') || contextNormalized.includes('conexao')) {
    return "Tecnologia - Wi-fi";
  }
  
  if (contextNormalized.includes('limpeza') && contextNormalized.includes('quarto')) {
    return "Limpeza - Quarto";
  }
  
  if (contextNormalized.includes('localizacao') || contextNormalized.includes('localização') || 
      contextNormalized.includes('vista') || contextNormalized.includes('acesso') ||
      contextNormalized.includes('perto') || contextNormalized.includes('próximo')) {
    return "Localização";
  }
  
  // Contexto indica recepção/check-in/check-out
  if (contextNormalized.includes('recepcao') || contextNormalized.includes('check') ||
      contextNormalized.includes('checkin') || contextNormalized.includes('checkout') ||
      contextNormalized.includes('reception') || contextNormalized.includes('front desk')) {
    return "Recepção - Serviço";
  }
  
  // Contexto indica A&B (comida/bebida)
  if (contextNormalized.includes('comida') || contextNormalized.includes('cafe') || 
      contextNormalized.includes('restaurante') || contextNormalized.includes('bar') ||
      contextNormalized.includes('food') || contextNormalized.includes('breakfast') ||
      contextNormalized.includes('garcom') || contextNormalized.includes('garcons') ||
      contextNormalized.includes('yasmin') || contextNormalized.includes('alimento')) {
    return "A&B - Serviço";
  }
  
  // Contexto indica piscina
  if (contextNormalized.includes('piscina') || contextNormalized.includes('pool')) {
    return "Piscina";
  }
  
  // Contexto indica localização específica
  if (contextNormalized.includes('localizacao') || contextNormalized.includes('perto') ||
      contextNormalized.includes('proximo') || contextNormalized.includes('centro') ||
      contextNormalized.includes('vista') || contextNormalized.includes('acesso')) {
    return "Localização";
  }
  
  // Contexto indica limpeza de quarto
  if (contextNormalized.includes('quarto') && (contextNormalized.includes('limpo') || 
      contextNormalized.includes('sujo') || contextNormalized.includes('limpeza'))) {
    return "Limpeza - Quarto";
  }
  
  // Contexto indica wifi/internet
  if (contextNormalized.includes('wifi') || contextNormalized.includes('internet') ||
      contextNormalized.includes('wi-fi') || contextNormalized.includes('conexao')) {
    return "Tecnologia - Wi-fi";
  }
  
  // Log para monitoramento (só em desenvolvimento) - agora com mais detalhes
  if (process.env.NODE_ENV === 'development') {
    console.log(`🤖 IA sugeriu keyword não mapeada: "${keyword}" (normalizada: "${normalized}") para contexto: "${context?.substring(0, 100)}..." - permitindo classificação da IA`);
  }
  
  // ÚLTIMO RECURSO: usar a keyword que a IA sugeriu, desde que não seja vazia
  // Isso permite que a IA aprenda e classifique novos tipos de feedback
  if (keyword && keyword.trim() !== '' && keyword.trim().toLowerCase() !== 'não identificado') {
    return keyword;
  }
  
  // Só usar fallback para casos completamente vazios ou inválidos
  return "Atendimento";
}

// Função para validar departamento
function validateDepartment(department: string, keyword: string): string {
  // Mapeamento keyword -> departamento
  const keywordToDepartment: Record<string, string> = {
    "A&B - Café da manhã": "A&B",
    "A&B - Serviço": "A&B", 
    "A&B - Variedade": "A&B",
    "A&B - Preço": "A&B",
    "A&B - Gastronomia": "A&B",
    "A&B - Alimentos": "A&B",
    "Limpeza - Quarto": "Governança",
    "Limpeza - Banheiro": "Governança",
    "Limpeza - Áreas sociais": "Governança",
    "Enxoval": "Governança",
    "Governança - Serviço": "Governança",
    "Manutenção - Quarto": "Manutenção",
    "Manutenção - Banheiro": "Manutenção", 
    "Manutenção - Instalações": "Manutenção",
    "Manutenção - Serviço": "Manutenção",
    "Ar-condicionado": "Manutenção - Quarto",
    "Elevador": "Manutenção - Instalações",
    "Frigobar": "Manutenção - Quarto",
    "Infraestrutura": "Manutenção",
    "Lazer - Variedade": "Lazer",
    "Lazer - Estrutura": "Lazer",
    "Lazer - Serviço": "Lazer",
    "Lazer - Atividades de Lazer": "Lazer",
    "Spa": "Lazer",
    "Piscina": "Lazer",
    "Tecnologia - Wi-fi": "TI",
    "Tecnologia - TV": "TI",
    "Estacionamento": "Operações",
    "Atendimento": "Operações",
    "Acessibilidade": "Operações",
    "Reserva de cadeiras (pool)": "Operações",
    "Processo": "Operações",
    "Custo-benefício": "Operações",
    "Comunicação": "Qualidade",
    "Recepção - Serviço": "Recepção",
    "Concierge": "Programa de vendas",
    "Cotas": "Programa de vendas",
    "Reservas": "Comercial",
    "Água": "Operações",
    "Recreação": "Lazer",
    "Travesseiro": "Governança",
    "Colchão": "Governança",
    "Espelho": "Governança",
    "Localização": "Operações",
    "Mixologia": "Lazer"
  };
  
  return keywordToDepartment[keyword] || "Operações";
}

// Função para validar problema
function validateProblem(problem: string): string {
  if (!problem) return "VAZIO";
  
  const normalized = normalizeText(problem);
  
  // Verificar mapeamento no dicionário
  const mappedByDictionary = NORMALIZATION_DICT[normalized];
  if (mappedByDictionary && STANDARD_PROBLEMS.includes(mappedByDictionary)) {
    return mappedByDictionary;
  }

  if (normalized === "vazio") return "VAZIO";
  
  // Buscar na lista padrão normalizada
  const index = NORMALIZED_PROBLEMS.indexOf(normalized);
  if (index !== -1) return STANDARD_PROBLEMS[index];
  
  // Buscar correspondência próxima
  const matchIndex = NORMALIZED_PROBLEMS.findIndex(standard => 
    standard.includes(normalized) || normalized.includes(standard)
  );
  
  return matchIndex !== -1 ? STANDARD_PROBLEMS[matchIndex] : (mappedByDictionary || normalized);
}

// Roteador de elogios - reclassifica feedbacks com problem="VAZIO" baseado no contexto semântico
function reroutePraiseKeyword(keyword: string, problem: string, context?: string): string {
  // Só atua em elogios puros (problem="VAZIO") que foram classificados como "Atendimento"
  if (problem !== 'VAZIO' || normalizeText(keyword) !== normalizeText('Atendimento')) {
    return keyword;
  }
  
  const c = normalizeText(context || '');
  const has = (arr: string[]) => arr.some(t => c.includes(normalizeText(t)));

  // 🔥 DETECÇÃO AGRESSIVA DE ÁREAS ESPECÍFICAS
  
  // PRIORIDADE 1: A&B - detecção muito mais ampla
  if (has(['restaurante', 'restaurant', 'bar', 'garcom', 'garçom', 'garcons', 'garçons', 'malta', 'food', 'meal', 'dinner', 'lunch'])) {
    return 'A&B - Serviço';
  }
  if (has(['cafe', 'café', 'breakfast', 'café da manhã', 'cafe da manha'])) {
    return 'A&B - Café da manhã';
  }

  // PRIORIDADE 2: Lazer - detecção muito mais ampla
  if (has(['piscina', 'pool', 'praia', 'beach'])) {
    return 'Piscina';
  }
  if (has(['bingo', 'karaoke', 'fogueira', 'mixologia', 'aula', 'atividade', 'brincadeira', 'animacao', 'animação'])) {
    return 'Lazer - Atividades de Lazer';
  }
  if (has(['recreacao', 'recreação', 'monitor', 'monitores', 'tio', 'tia', 'lucas', 'claudia', 'entretenimento', 'diversao', 'diversão', 'lazer'])) {
    return 'Lazer - Serviço';
  }
  if (has(['spa', 'massagem'])) {
    return 'Spa';
  }

  // PRIORIDADE 3: Recepção - detecta contexto de check-in/out
  if (has(['check in', 'check-in', 'check out', 'check-out', 'recepcao', 'recepção', 'front desk', 'reception'])) {
    return 'Recepção - Serviço';
  }

  // PRIORIDADE 4: Governança - detecta contexto de limpeza/arrumação
  if (has(['quarto', 'room']) && has(['limpo', 'limpeza', 'cheiroso', 'arrumacao', 'arrumação', 'organizado'])) {
    return 'Limpeza - Quarto';
  }
  if (has(['banheiro', 'bathroom']) && has(['limpo', 'limpeza', 'cheiroso'])) {
    return 'Limpeza - Banheiro';
  }
  if (has(['toalha', 'lençol', 'lencol', 'enxoval', 'roupa de cama'])) {
    return 'Enxoval';
  }

  // PRIORIDADE 5: Tecnologia - detecta contexto técnico
  if (has(['wifi', 'wi-fi', 'internet', 'conexao', 'conexão', 'sinal'])) {
    return 'Tecnologia - Wi-fi';
  }
  if (has(['tv', 'televisao', 'televisão', 'canal', 'canais'])) {
    return 'Tecnologia - TV';
  }

  // PRIORIDADE 6: Localização - detecta contexto geográfico
  if (has(['localizacao', 'localização', 'perto', 'próximo', 'proximo', 'vista', 'acesso', 'posição', 'situado'])) {
    return 'Localização';
  }

  // PRIORIDADE 7: Infraestrutura específica
  if (has(['elevador'])) return 'Elevador';
  if (has(['frigobar'])) return 'Frigobar';
  if (has(['ar condicionado', 'ar-condicionado'])) return 'Ar-condicionado';

  // 🚨 ÚLTIMA CHECAGEM: Se menciona nomes próprios comuns do setor hoteleiro
  if (has(['heny', 'juliete', 'jane', 'lucas', 'claudia'])) {
    // Se menciona nomes + contexto de comida/restaurante → A&B
    if (has(['restaurante', 'refeicao', 'refeição', 'comida', 'food', 'meal'])) {
      return 'A&B - Serviço';
    }
    // Se menciona nomes + contexto de recreação → Lazer
    if (has(['recreacao', 'recreação', 'brincadeira', 'atividade', 'diversao', 'diversão', 'animacao', 'animação'])) {
      return 'Lazer - Serviço';
    }
  }

  // FALLBACK: sem pistas específicas, mantém "Atendimento" para elogios genéricos
  return 'Atendimento';
}

export async function POST(request: NextRequest) {
  try {
    // Verificar rate limit
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Rate limit atingido. Aguarde um momento.' },
        { status: 429 }
      );
    }
    requestCount++;

    const body = await request.json();
    const { texto, comment, apiKey: clientApiKey, text } = body;
    
    // Usar comment se texto não estiver presente (compatibilidade)
    const finalText = texto || comment || text;

    // Verificar se API key está no header Authorization
    const authHeader = request.headers.get('authorization');
    const headerApiKey = authHeader?.replace('Bearer ', '');

    // Log para debug
    console.log("🔍 [ANALYZE-FEEDBACK] Processando feedback:", {
      hasText: !!finalText,
      textLength: finalText?.length || 0,
      environment: process.env.NODE_ENV,
      hasClientApiKey: !!clientApiKey,
      hasHeaderApiKey: !!headerApiKey,
      hasServerApiKey: !!process.env.OPENAI_API_KEY,
      userAgent: request.headers.get('user-agent'),
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      contentLength: request.headers.get('content-length'),
      timestamp: new Date().toISOString()
    });

    // Priorizar API key do header, depois do body, depois do servidor
    const apiKey = headerApiKey || clientApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error("❌ [ANALYZE-FEEDBACK] Nenhuma API Key disponível - nem no header, nem no body, nem no servidor");
      return NextResponse.json(
        { error: 'API Key não configurada. Configure sua chave nas Configurações.' },
        { status: 400 }
      );
    }

    if (!finalText || finalText.trim() === '') {
      return NextResponse.json({
        rating: 3,
        keyword: 'Atendimento',
        sector: 'Operações',
        problem: 'VAZIO',
        has_suggestion: false,
        suggestion_type: 'none',
        problems: [{
          keyword: 'Atendimento',
          sector: 'Operações', 
          problem: 'VAZIO'
        }],
        legacyFormat: 'Atendimento, Operações, VAZIO'
      });
    }

    // Criar chave de cache
    const cacheKey = `${finalText.trim().toLowerCase().slice(0, 100)}`;

    // Verificar cache
    const cached = analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return NextResponse.json(cached.data);
    }

    // Verificar se o texto contém apenas números ou caracteres não significativos
    const cleanText = finalText.trim();

    const isOnlyNumbers = /^\d+$/.test(cleanText);
    const isOnlySpecialChars = /^[^\w\s]+$/.test(cleanText);
    const isTooShort = cleanText.length < 10;
    
    if (isOnlyNumbers || isOnlySpecialChars || isTooShort) {
      const defaultResponse = {
        rating: 3,
        keyword: 'Atendimento',
        sector: 'Operações',
        problem: 'VAZIO',
        has_suggestion: false,
        suggestion_type: 'none',
        problems: [{
          keyword: 'Atendimento',
          sector: 'Operações',
          problem: 'VAZIO'
        }],
        legacyFormat: 'Atendimento, Operações, VAZIO'
      };
      
      // Cache resultado padrão
      analysisCache.set(cacheKey, {
        data: defaultResponse,
        timestamp: Date.now()
      });
      
      return NextResponse.json(defaultResponse);
    }

    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Usar sempre o GPT-4 Mini
    const model = "gpt-4o-mini";

    console.log("🤖 [ANALYZE-FEEDBACK] Enviando para OpenAI:", {
      model,
      textPreview: finalText.substring(0, 100) + '...',
      apiKeyPrefix: apiKey.substring(0, 7) + '...',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    });

    // Configurar timeout específico para produção
    const timeoutMs = process.env.NODE_ENV === 'production' ? 30000 : 60000; // 30s prod, 60s dev

    // Definir a função estruturada para classificação
    const classifyFunction = {
      name: "classify_feedback",
      description: "Classifica o feedback do hóspede em sentimento, problemas estruturados e detecção de sugestões",
      parameters: {
        type: "object",
        properties: {
          sentiment: {
            type: "integer",
            enum: [1, 2, 3, 4, 5],
            description: "1=Muito insatisfeito, 2=Insatisfeito, 3=Neutro, 4=Satisfeito, 5=Muito satisfeito"
          },
          has_suggestion: {
            type: "boolean",
            description: "true se o comentário contém alguma sugestão de melhoria, false caso contrário"
          },
          suggestion_type: {
            type: "string",
            enum: ["none", "only_suggestion", "with_criticism", "with_praise", "mixed"],
            description: "Tipo de sugestão: 'none'=sem sugestões, 'only_suggestion'=apenas sugestões, 'with_criticism'=sugestões com críticas, 'with_praise'=sugestões com elogios, 'mixed'=sugestões com críticas E elogios"
          },
          suggestion_summary: {
            type: "string",
            description: "Resumo objetivo da(s) sugestão(ões) mencionada(s) no comentário. Máximo 200 caracteres. Deixe vazio se has_suggestion for false."

          },
          issues: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object", 
              properties: {
                keyword: {
                  type: "string",
                  enum: OFFICIAL_KEYWORDS,
                  description: "Palavra-chave oficial da tabela de mapeamento"
                },
                department: {
                  type: "string", 
                  enum: OFFICIAL_DEPARTMENTS,
                  description: "Departamento correspondente à palavra-chave"
                },
                                 problem: {
                   type: "string",
                   enum: STANDARD_PROBLEMS,
                   description: "Problema específico identificado ou 'VAZIO' se apenas elogio"
                 },
                problem_detail: {
                  type: "string",
                  description: "Breve detalhe objetivo do problema: o que exatamente não funciona/falta/está ruim. Ex.: 'Ar-condicionado sem resfriar', 'Wi‑Fi cai toda hora', 'Poucas tomadas no quarto'. Máx. 120 caracteres."
                }
              },
              required: ["keyword", "department", "problem"]
            }
          }
        },

        required: ["sentiment", "has_suggestion", "suggestion_type", "suggestion_summary", "issues"]

      }
    };

    const analysisPrompt = `Você é um auditor de reputação hoteleira especializado. O comentário pode estar EM QUALQUER IDIOMA; identifique internamente e traduza se necessário.

**MISSÃO CRÍTICA:** Analise TODO o comentário e identifique ATÉ 3 ASPECTOS DIFERENTES (problemas, elogios ou sugestões). Use análise semântica inteligente para detectar QUALQUER tipo de problema, crítica, falta, insatisfação OU ELOGIO mencionado. SEJA ASSERTIVO e CRIATIVO na classificação - SEMPRE encontre uma categoria apropriada.

**⚠️ REGRA FUNDAMENTAL - NUNCA AGRUPE TUDO EM "ATENDIMENTO":**
- Se o comentário menciona BAR → sempre "A&B - Serviço" + "A&B"
- Se o comentário menciona RESTAURANTE → sempre "A&B - Serviço" + "A&B" 
- Se o comentário menciona PISCINA → sempre "Piscina" + "Lazer"
- Se o comentário menciona BINGO/RECREAÇÃO/TIO/TIA → sempre "Lazer - Atividades de Lazer" + "Lazer"
- Se o comentário menciona CAFÉ DA MANHÃ → sempre "A&B - Café da manhã" + "A&B"
- Se o comentário menciona WI-FI/INTERNET → sempre "Tecnologia - Wi-fi" + "TI"

**REGRA MÚLTIPLOS ELOGIOS OBRIGATÓRIA:** Se o comentário menciona VÁRIAS áreas positivas, você DEVE criar múltiplos issues:
- "Piscina incrível e bingo divertido" → Issue 1: "Piscina" + Issue 2: "Lazer - Atividades de Lazer"
- "Bar excelente e restaurante bom" → Issue 1: "A&B - Serviço" (bar) + Issue 2: "A&B - Serviço" (restaurante) 
- "Funcionários do restaurante e rapazes do bar" → Issue 1: "A&B - Serviço" (restaurante) + Issue 2: "A&B - Serviço" (bar)

**AUTONOMIA DA IA:** Você tem TOTAL LIBERDADE para interpretar semanticamente o comentário. NÃO se baseie apenas em palavras-chave fixas:
- Analise o CONTEXTO COMPLETO do comentário
- Entenda a INTENÇÃO por trás das palavras
- Se alguém menciona pessoas em contexto de diversão/entretenimento → provavelmente Lazer
- Se alguém menciona pessoas em contexto de comida/bebida/restaurante → provavelmente A&B
- Se alguém menciona funcionários sem contexto específico → use sua inteligência para decidir
- Seja CRIATIVO e ASSERTIVO na classificação baseada no SENTIDO GERAL

**REGRA FUNDAMENTAL:** NUNCA use "Não identificado" a menos que o comentário seja completamente vazio ou inválido. SEMPRE classifique feedback real em categorias específicas e precisas baseadas no CONTEXTO SEMÂNTICO.

**ATENÇÃO CRÍTICA:** Se o comentário contém QUALQUER palavra ou expressão que indique sugestão, melhoria ou mudança, SEMPRE defina has_suggestion como true. NÃO ignore sugestões!

**DETECÇÃO DE SUGESTÕES (OBRIGATÓRIA E CRÍTICA):**
- has_suggestion: true se o comentário contém QUALQUER sugestão de melhoria, implementação ou mudança
- suggestion_type: classifique o tipo de sugestão:
  * "none": sem sugestões
  * "only_suggestion": comentário contém APENAS sugestões (sem críticas ou elogios)
  * "with_criticism": sugestões combinadas com críticas/problemas
  * "with_praise": sugestões combinadas com elogios
  * "mixed": sugestões com críticas E elogios

**PADRÕES DE SUGESTÃO (ANÁLISE OBRIGATÓRIA):**
- Palavras diretas: "poderia", "deveria", "seria bom", "sugiro", "recomendo", "melhoraria se", "gostaria que", "seria interessante", "poderiam implementar", "precisam de", "deveriam ter", "seria legal", "seria ótimo"
- Expressões de falta: "falta", "faltou", "não tem", "não tinha", "senti falta", "faz falta", "deveria ter", "precisava ter", "não há", "ausência de"
- Frases condicionais: "se tivesse...", "seria melhor com...", "faltou apenas...", "se houvesse...", "com mais...", "tendo..."
- Comparações construtivas: "poderia ser melhor", "deveria melhorar", "precisa de mais", "seria ideal", "esperava mais"
- Sugestões implícitas: "tenho uma sugestão", "uma dica", "uma ideia", "minha opinião", "acredito que", "penso que", "acho que deveria"
- Ideias construtivas: propostas de melhorias, implementações, mudanças, adições, modificações

**REGRA CRÍTICA DE SUGESTÕES:** Se encontrar QUALQUER das palavras acima no comentário, SEMPRE defina has_suggestion=true. Não há exceções!

**MAPEAMENTOS INTELIGENTES POR CONTEXTO (seja criativo e específico):**
• Concierge específico → "Concierge" + "Programa de vendas"  
• Recreação/Animação → "Lazer - Serviço" + "Lazer"
• Fogueira/Atividades → "Lazer - Atividades de Lazer" + "Lazer"
• Café da manhã → "A&B - Café da manhã" + "A&B"
• Restaurante/Bar → "A&B - Serviço" + "A&B"
• Wi-Fi/Internet → "Tecnologia - Wi-fi" + "TI"
• Limpeza de quarto → "Limpeza - Quarto" + "Governança"
• Piscina → "Piscina" + "Lazer"
• Localização/Vista → "Localização" + "Operações"

**REGRAS PARA ELOGIOS (problem="VAZIO") - PRIORIDADE MÁXIMA:**
- **MÚLTIPLOS ELOGIOS**: Se o comentário menciona várias áreas positivas, crie um issue separado para cada uma
- Escolha SEMPRE a keyword do principal aspecto/área citada (não "Atendimento"):
  * café da manhã → "A&B - Café da manhã"
  * restaurante/bar/garçom → "A&B - Serviço"
  * piscina → "Piscina"
  * recreação/monitor/animação → "Lazer - Serviço" ou "Lazer - Atividades de Lazer"
  * check-in/check-out/recepção → "Recepção - Serviço"
  * wi-fi/internet → "Tecnologia - Wi-fi"
  * limpeza de quarto/banheiro → "Limpeza - Quarto"/"Limpeza - Banheiro"
  * localização/vista → "Localização"
- Quando houver pessoas + área específica (ex: garçons no restaurante), PRIORIZE a área específica ("A&B - Serviço"), NÃO "Atendimento"
- SÓ use "Atendimento" quando o elogio é sobre equipe genérica SEM qualquer pista de serviço/área específica
- Gere até 3 issues, mas mantenha "VAZIO" em problem quando for elogio puro

**EXEMPLOS DE CRIATIVIDADE PERMITIDA:**
• "Toalhas sujas" → "Enxoval" + "Governança" (mais específico que "Limpeza")
• "Elevador quebrado" → "Elevador" + "Manutenção - Instalações" (específico)
• "Ar-condicionado não gelava" → "Ar-condicionado" + "Manutenção - Quarto" (específico)
• "Frigobar vazio" → "Frigobar" + "Manutenção - Quarto" (específico)
• "TV sem sinal" → "Tecnologia - TV" + "TI" (específico)
• "Estacionamento lotado" → "Estacionamento" + "Operações" (específico)
• "Banheiro com vazamento" → "Manutenção - Banheiro" + "Manutenção" (específico)
• "Varanda suja" → "Limpeza - Áreas sociais" + "Governança" (adaptado)
• "Drinks caros" → "A&B - Preço" + "A&B" (específico)
• "Poucos canais de TV" → "Tecnologia - TV" + "TI" (específico)

**REGRA DE OURO:** SEMPRE seja o mais específico possível. Se menciona algo concreto, classifique especificamente!

**EXEMPLOS DE CLASSIFICAÇÃO CORRETA PARA ELOGIOS:**
• "Equipe do restaurante foi maravilhosa" → keyword="A&B - Serviço", dept="A&B", problem="VAZIO"
• "Café da manhã excelente e variado" → keyword="A&B - Café da manhã", dept="A&B", problem="VAZIO"
• "Piscina incrível para as crianças" → keyword="Piscina", dept="Lazer", problem="VAZIO"
• "Check-in rápido e cordial" → keyword="Recepção - Serviço", dept="Recepção", problem="VAZIO"
• "Wi-Fi perfeito em todo hotel" → keyword="Tecnologia - Wi-fi", dept="TI", problem="VAZIO"
• "Quarto muito limpo e cheiroso" → keyword="Limpeza - Quarto", dept="Governança", problem="VAZIO"
• "Hotel muito bem localizado" → keyword="Localização", dept="Operações", problem="VAZIO"
• "Garçons muito atenciosos no bar" → keyword="A&B - Serviço", dept="A&B", problem="VAZIO"
• "Monitores foram incríveis com as crianças" → keyword="Lazer - Serviço", dept="Lazer", problem="VAZIO"
• "Mixologia fantástica!" → keyword="Lazer - Atividades de Lazer", dept="Lazer", problem="VAZIO"
• "Fogueira muito legal à noite" → keyword="Lazer - Atividades de Lazer", dept="Lazer", problem="VAZIO"
• "Funcionários simpáticos" (SEM contexto específico) → keyword="Atendimento", dept="Operações", problem="VAZIO"

**EXEMPLOS ESPECÍFICOS DOS ERROS IDENTIFICADOS:**
• "tenho uma sugestao de melhorar a piscina, que é aumentar ela" →
  - keyword="Piscina", dept="Lazer", problem="Espaço Insuficiente", has_suggestion=true
• "Muito bom a noite de bingo com a tia Claudia" →
  - keyword="Lazer - Atividades de Lazer", dept="Lazer", problem="VAZIO"
• "funcionários do restaurante Malta foram incríveis" →
  - keyword="A&B - Serviço", dept="A&B", problem="VAZIO"
• "rapazes do bar tornaram momentos na piscina melhores" →
  - Issue 1: keyword="A&B - Serviço", dept="A&B", problem="VAZIO"
  - Issue 2: keyword="Piscina", dept="Lazer", problem="VAZIO"
• "tio Lucas com brincadeiras tornou tudo divertido" →
  - keyword="Lazer - Atividades de Lazer", dept="Lazer", problem="VAZIO"

**EXEMPLOS DE MÚLTIPLOS ELOGIOS (CRÍTICO - GERE VÁRIOS ISSUES):**
• "Café da manhã excelente, piscina limpa e wi-fi rápido" → 
  - Issue 1: "A&B - Café da manhã", "A&B", "VAZIO"
  - Issue 2: "Piscina", "Lazer", "VAZIO"  
  - Issue 3: "Tecnologia - Wi-fi", "TI", "VAZIO"
• "funcionários do restaurante e rapazes do bar excelentes" →
  - Issue 1: "A&B - Serviço", "A&B", "VAZIO" (restaurante)
  - Issue 2: "A&B - Serviço", "A&B", "VAZIO" (bar)
• "Recreação divertida, restaurante bom e localização perfeita" →
  - Issue 1: "Lazer - Serviço", "Lazer", "VAZIO" 
  - Issue 2: "A&B - Serviço", "A&B", "VAZIO"
  - Issue 3: "Localização", "Operações", "VAZIO"
• "bingo com tia Claudia e bar na piscina excelentes" →
  - Issue 1: "Lazer - Atividades de Lazer", "Lazer", "VAZIO"
  - Issue 2: "A&B - Serviço", "A&B", "VAZIO"
  - Issue 3: "Piscina", "Lazer", "VAZIO"

**EXEMPLOS ESPECÍFICOS PARA ALIMENTAÇÃO (A&B):**
• "Dinner food was horrible" → "A&B - Serviço" + "A&B" + "Qualidade da Comida"
• "Food was terrible, pasta was inedible" → "A&B - Serviço" + "A&B" + "Qualidade da Comida"
• "Café da manhã sem variedade" → "A&B - Café da manhã" + "A&B" + "Falta de Variedade"
• "Restaurant service was slow" → "A&B - Serviço" + "A&B" + "Demora no Atendimento"
• "Bar drinks were expensive" → "A&B - Preço" + "A&B" + "Preço Alto"

**⚠️ ATENÇÃO ESPECIAL - COMENTÁRIOS IRRELEVANTES:**
APENAS classifique como "Não identificado" se o comentário for COMPLETAMENTE VAZIO ou INVÁLIDO:
• Comentários vazios: "", "...", "---", "N/A"
• Referências vazias: "conforme meu relato acima", "ver comentário anterior", "mesmo problema"
• Testes óbvios: "teste", "test", "testing"

**IMPORTANTE:** SEMPRE seja específico e preciso na classificação. EVITE categorias genéricas quando puder ser mais específico:
• Para elogios gerais → "Lazer"
• Para feedback específico → SEMPRE identifique a categoria mais precisa possível
• Para problemas técnicos → use categorias específicas como "Ar-condicionado", "Elevador", "Frigobar"
• Para áreas específicas → use "Limpeza - Quarto", "Manutenção - Banheiro", etc.
• Para serviços específicos → use "A&B - Café da manhã", "Lazer - Atividades de Lazer", etc.

**CRITÉRIO DE EXCELÊNCIA:** Prefira sempre a classificação mais específica e precisa possível!

**ATENÇÃO - VENDAS/MULTIPROPRIEDADE:** Se houver insistência/pressão/assédio/coação para comprar multipropriedade (timeshare) ou situações de venda agressiva, crie um dos items em "issues" com: keyword="Cotas", department="Programa de vendas" e problem="Comunicação Ruim".

**EXEMPLOS DE AUTONOMIA SEMÂNTICA:**
• "Pessoal da recreação muito legal" → IA deve entender: recreação = "Lazer - Serviço" + "Lazer"
• "Garçons simpáticos no restaurante" → IA deve entender: garçons = "A&B - Serviço" + "A&B"
• "Aula de drinks foi incrível" → IA deve entender: atividade específica = "Lazer - Atividades de Lazer" + "Lazer"
• "Funcionários do bar atenciosos" → IA deve entender: bar = "A&B - Serviço" + "A&B"
• "Monitores de lazer legais" → IA deve entender: lazer + monitores = "Lazer - Serviço" + "Lazer"
• "Wi-Fi não funciona" → "Tecnologia - Wi-fi" + "TI" + "Não Funciona"
• "Quarto sujo" → "Limpeza - Quarto" + "Governança" + "Falta de Limpeza"
• "Hotel bem localizado" → "Localização" + "Operações" + "VAZIO"

**AUTONOMIA DA IA:** Analise o CONTEXTO SEMÂNTICO, não palavras isoladas. Entenda a INTENÇÃO do comentário!

**REGRA DE INTERPRETAÇÃO:** Se alguém elogia pessoas específicas em contexto de recreação/lazer → sempre "Lazer - Serviço"
Se alguém elogia pessoas específicas em contexto de restaurante/comida → sempre "A&B - Serviço"

**SAÍDA:** até 3 items com keyword oficial, department compatível, problem padrão, problem_detail (120 chars max).

Comentário: "${finalText}"`;

    const response = await Promise.race([
      openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: analysisPrompt }],
        tools: [{ type: "function", function: classifyFunction }],
        tool_choice: { type: "function", function: { name: "classify_feedback" } },
        temperature: 0.0
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
      )
    ]) as OpenAI.Chat.Completions.ChatCompletion;

    let result;
    
    if (response.choices[0].message.tool_calls?.[0]) {
      const toolCall = response.choices[0].message.tool_calls[0];
      if (toolCall.function) {
        try {
          result = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          console.error("Erro ao parsear JSON da função:", parseError);
          throw new Error("Resposta inválida da IA");
        }
      }
    }

    if (!result) {
      throw new Error("IA não retornou resultado estruturado");
    }

    // Pós-validação e normalização
    const rating = result.sentiment || 3;
    let processedProblems: Array<{keyword: string, sector: string, problem: string, problem_detail?: string}> = [];
    
    if (result.issues && Array.isArray(result.issues)) {
      for (const issue of result.issues.slice(0, 3)) {
        let validatedKeyword = validateKeyword(issue.keyword || "Atendimento", finalText);
        let validatedDepartment = validateDepartment(issue.department || "Operações", validatedKeyword);
        const validatedProblem = validateProblem(issue.problem || "");
        
        // 🎯 ROTEADOR DE ELOGIOS: Se for elogio puro (problem="VAZIO"), refine a keyword pelo contexto
        if (validatedProblem === 'VAZIO') {
          validatedKeyword = reroutePraiseKeyword(validatedKeyword, validatedProblem, finalText);
          validatedDepartment = validateDepartment(validatedDepartment, validatedKeyword);
        }
        
        // Definir detalhe do problema
        let problemDetail: string = (issue.problem_detail || issue.detail || '').toString().trim();
        if (!problemDetail) {
          const normalizedProblem = (validatedProblem || '').toLowerCase();
          if (['vazio', 'não identificado', 'nao identificado'].includes(normalizedProblem)) {
            problemDetail = '';
          } else if (normalizedProblem.includes('não funciona') && validatedKeyword !== "Atendimento") {
            problemDetail = `${validatedKeyword} não funciona`;
          } else if (validatedProblem) {
            problemDetail = normalizedProblem.startsWith('falta') 
              ? `${validatedProblem} de ${validatedKeyword}`
              : `${validatedProblem} em ${validatedKeyword}`;
          }
          if (problemDetail.length > 120) problemDetail = problemDetail.slice(0, 117).trimEnd() + '...';
        }
        
        processedProblems.push({
          keyword: validatedKeyword,
          sector: validatedDepartment,
          problem: validatedProblem,
          problem_detail: problemDetail
        });
      }
    }
    
    // Se não há problemas processados ou apenas placeholders, usar padrão
    if (processedProblems.length === 0) {
      processedProblems = [{ keyword: 'Atendimento', sector: 'Operações', problem: 'VAZIO', problem_detail: '' }];
    } else {
      const hasRealIssues = processedProblems.some(p => {
        const pr = (p.problem || '').toLowerCase();
        return !['vazio', 'não identificado', 'nao identificado'].includes(pr) && pr.trim() !== '';
      });

      if (hasRealIssues) {
        processedProblems = processedProblems.filter(p => {
          const pr = (p.problem || '').toLowerCase();
          const isPlaceholder = ['vazio', 'não identificado', 'nao identificado'].includes(pr) || 
                               (p.keyword === 'Atendimento' && p.sector === 'Operações' && pr === 'vazio');
          return !isPlaceholder;
        });
      } else {
        processedProblems = [{ keyword: 'Atendimento', sector: 'Operações', problem: 'VAZIO', problem_detail: '' }];
      }
    }

    // 🔥 DETECÇÃO ADICIONAL DE MÚLTIPLAS ÁREAS (pós-processamento agressivo)
    // Se só gerou 1 problema "Atendimento + VAZIO" mas o texto claramente menciona múltiplas áreas
    if (processedProblems.length === 1 && processedProblems[0].keyword === 'Atendimento' && processedProblems[0].problem === 'VAZIO') {
      const contextNormalized = normalizeText(finalText);
      const additionalIssues: Array<{keyword: string, sector: string, problem: string, problem_detail?: string}> = [];
      
      // Detectar áreas específicas mencionadas no texto
      const areaDetections = [
        { keywords: ['piscina', 'pool'], result: { keyword: 'Piscina', sector: 'Lazer', problem: 'VAZIO' }},
        { keywords: ['bingo', 'karaoke', 'fogueira', 'tio', 'tia', 'lucas', 'claudia', 'recreacao', 'recreação'], result: { keyword: 'Lazer - Atividades de Lazer', sector: 'Lazer', problem: 'VAZIO' }},
        { keywords: ['restaurante', 'malta', 'heny', 'juliete', 'jane'], result: { keyword: 'A&B - Serviço', sector: 'A&B', problem: 'VAZIO' }},
        { keywords: ['bar', 'drink', 'bebida'], result: { keyword: 'A&B - Serviço', sector: 'A&B', problem: 'VAZIO' }},
        { keywords: ['cafe da manha', 'café da manhã', 'breakfast'], result: { keyword: 'A&B - Café da manhã', sector: 'A&B', problem: 'VAZIO' }},
        { keywords: ['wifi', 'wi-fi', 'internet'], result: { keyword: 'Tecnologia - Wi-fi', sector: 'TI', problem: 'VAZIO' }}
      ];

      for (const detection of areaDetections) {
        const hasArea = detection.keywords.some(keyword => contextNormalized.includes(normalizeText(keyword)));
        if (hasArea) {
          // Evitar duplicatas
          const alreadyExists = additionalIssues.some(issue => issue.keyword === detection.result.keyword);
          if (!alreadyExists) {
            additionalIssues.push(detection.result);
          }
        }
      }

      // Se detectou áreas específicas, substitui o "Atendimento" genérico
      if (additionalIssues.length > 0) {
        // Manter "Atendimento" apenas se for realmente genérico (sem menção de áreas específicas)
        const hasGenericPraise = contextNormalized.includes('funcionario') && 
                                !contextNormalized.includes('restaurante') && 
                                !contextNormalized.includes('bar') && 
                                !contextNormalized.includes('piscina') &&
                                !contextNormalized.includes('recreacao');
        
        processedProblems = hasGenericPraise 
          ? [processedProblems[0], ...additionalIssues.slice(0, 2)] // Manter Atendimento + até 2 áreas específicas
          : additionalIssues.slice(0, 3); // Só áreas específicas, até 3
      }
    }

    // Compatibilidade com formato anterior
    const firstProblem = processedProblems[0] || {
      keyword: 'Atendimento', sector: 'Operações', problem: 'VAZIO', problem_detail: ''
    };

    // Extrair e validar campos de sugestão
    let hasSuggestion = result.has_suggestion || false;
    let suggestionType = result.suggestion_type || 'none';
    let suggestionSummary = result.suggestion_summary || '';

    // Validação pós-processamento: força detecção de sugestões
    const suggestionKeywords = [
      'sugestao', 'sugestão', 'sugiro', 'seria bom', 'seria legal', 'seria interessante',
      'poderia', 'poderiam', 'deveria', 'deveriam', 'melhorar', 'implementar', 'adicionar',
      'seria melhor', 'recomendo', 'gostaria que', 'falta', 'faltou', 'precisa de', 'necessita'
    ];

    const normalizedComment = normalizeText(finalText.toLowerCase());
    const hasSuggestionKeyword = suggestionKeywords.some(keyword => 
      normalizedComment.includes(normalizeText(keyword))
    );

    if (hasSuggestionKeyword && !hasSuggestion) {
      console.log('🔍 Validação pós-processamento: Forçando detecção de sugestão');
      hasSuggestion = true;
      suggestionType = 'only_suggestion';
      
      if (!suggestionSummary.trim()) {
        const words = finalText.split(' ');
        suggestionSummary = words.slice(0, 25).join(' ') + (words.length > 25 ? '...' : '');
      }
    }

    const finalResult = {
      rating,
      keyword: firstProblem.keyword,
      sector: firstProblem.sector,
      problem: firstProblem.problem,
      problem_detail: firstProblem.problem_detail || '',
      has_suggestion: hasSuggestion,
      suggestion_type: suggestionType,
      suggestion_summary: suggestionSummary,
      problems: processedProblems,
      allProblems: processedProblems,
      legacyFormat: processedProblems.map(p => 
        `${p.keyword}, ${p.sector}, ${p.problem || 'VAZIO'}`
      ).join(';')
    };

    // Cache resultado
    analysisCache.set(cacheKey, {
      data: finalResult,
      timestamp: Date.now()
    });

    console.log("✅ [ANALYZE-FEEDBACK] Análise concluída com sucesso:", {
      rating: finalResult.rating,
      keyword: finalResult.keyword,
      sector: finalResult.sector,
      problem: finalResult.problem,
      hasSuggestion: finalResult.has_suggestion
    });

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("❌ [ANALYZE-FEEDBACK] Erro na análise:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      environment: process.env.NODE_ENV,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...' || 'N/A'
    });
    
    // Tratamento específico para diferentes tipos de erro
    if (error.message.includes('exceeded your current quota')) {
      return NextResponse.json(
        { error: 'Limite de quota da API atingido. Verifique seu saldo na OpenAI.' },
        { status: 429 }
      );
    }
    
    if (error.message.includes('invalid api key') || error.message.includes('Incorrect API key')) {
      return NextResponse.json(
        { error: 'Chave de API inválida. Verifique sua configuração.' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Limite de taxa atingido. Aguarde alguns segundos.' },
        { status: 429 }
      );
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Timeout na conexão. Tente novamente.' },
        { status: 503 }
      );
    }

    // Erro 400 específico - pode ser problema com o request
    if (error.status === 400) {
      console.error("🚨 [ANALYZE-FEEDBACK] Erro 400 da OpenAI:", {
        message: error.message,
        code: error.code,
        data: error.error,
        type: error.type,
        param: error.param,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { 
          error: 'Solicitação inválida para a API OpenAI. Verifique os dados enviados.',
          details: error.message 
        },
        { status: 400 }
      );
    }
    
    // Log detalhado para debug
    console.error("📊 [ANALYZE-FEEDBACK] Detalhes completos do erro:", {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
      stack: error.stack?.substring(0, 500),
      environment: process.env.NODE_ENV,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Erro temporário no servidor. Tentando novamente...' },
      { status: 500 }
    );
  }
}