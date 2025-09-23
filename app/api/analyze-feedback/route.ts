import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Cache em memória para análises repetidas com limpeza automática
const analysisCache = new Map<string, any>();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE = 1000; // Limite de itens no cache

// Limpeza automática do cache a cada 15 minutos
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  analysisCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_EXPIRY) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => analysisCache.delete(key));
  
  // Se ainda tiver muitos itens, remove os mais antigos
  if (analysisCache.size > MAX_CACHE_SIZE) {
    const oldestEntries: Array<[string, number]> = [];
    analysisCache.forEach((value, key) => {
      oldestEntries.push([key, value.timestamp]);
    });
    
    oldestEntries.sort((a, b) => a[1] - b[1]);
    const toDelete = oldestEntries.slice(0, oldestEntries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => analysisCache.delete(key));
  }
  
  console.log(`🧹 [CACHE-CLEANUP] Limpeza realizada. Itens no cache: ${analysisCache.size}`);
}, 15 * 60 * 1000); // 15 minutos

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

// Dicionário raw aprimorado baseado nos feedbacks da cliente
const RAW_NORMALIZATION_DICT: Record<string, string> = {
  // === A&B - ALIMENTOS & BEBIDAS - SEÇÃO EXPANDIDA ===
  
  // Serviço (garçons, bartenders, atendimento restaurante/bar)
  "garçom": "A&B - Serviço",
  "garcom": "A&B - Serviço", 
  "garçons": "A&B - Serviço",
  "garcons": "A&B - Serviço",
  "garçonete": "A&B - Serviço",
  "garconete": "A&B - Serviço",
  "garçonetes": "A&B - Serviço",
  "garconetes": "A&B - Serviço",
  "waiter": "A&B - Serviço",
  "waiters": "A&B - Serviço",
  "waitress": "A&B - Serviço",
  "bartender": "A&B - Serviço",
  "barman": "A&B - Serviço",
  "atendente": "A&B - Serviço",
  "atendentes": "A&B - Serviço",
  "bar": "A&B - Serviço",
  "restaurante": "A&B - Serviço",
  "restaurant": "A&B - Serviço",
  "atendimento restaurante": "A&B - Serviço",
  "serviço restaurante": "A&B - Serviço",
  "equipe restaurante": "A&B - Serviço",
  "staff restaurante": "A&B - Serviço",
  "atendimento do restaurante": "A&B - Serviço",
  "serviço do restaurante": "A&B - Serviço",
  "equipe do restaurante": "A&B - Serviço",
  "funcionários do restaurante": "A&B - Serviço",
  "pessoal do restaurante": "A&B - Serviço",
  "atendimento bar": "A&B - Serviço",
  "serviço bar": "A&B - Serviço",
  "atendimento do bar": "A&B - Serviço",
  "serviço do bar": "A&B - Serviço",
  "quadro reduzido": "A&B - Serviço",
  "poucos garçons": "A&B - Serviço",
  "falta garçom": "A&B - Serviço",
  "demora garçom": "A&B - Serviço",
  "demora atendimento": "A&B - Serviço",
  "atendimento demorado": "A&B - Serviço",
  "atendimento lento": "A&B - Serviço",
  "serviço lento": "A&B - Serviço",
  "serviço demorado": "A&B - Serviço",
  "espera longa": "A&B - Serviço",
  "muito tempo esperando": "A&B - Serviço",
  "cardápio": "A&B - Serviço",
  "cardapio": "A&B - Serviço",
  "menu": "A&B - Serviço",
  "transparência cardápio": "A&B - Serviço",
  "transparência do cardápio": "A&B - Serviço",
  "cardápios": "A&B - Serviço",

  // Café da manhã - EXPANDIDO
  "cafe": "A&B - Café da manhã",
  "café": "A&B - Café da manhã",
  "cafe da manha": "A&B - Café da manhã",
  "café da manhã": "A&B - Café da manhã",
  "breakfast": "A&B - Café da manhã",
  "morning meal": "A&B - Café da manhã",
  "breakfast buffet": "A&B - Café da manhã",
  "buffet cafe": "A&B - Café da manhã",
  "buffet café": "A&B - Café da manhã",
  "buffet matinal": "A&B - Café da manhã",
  "café matinal": "A&B - Café da manhã",
  "refeição matinal": "A&B - Café da manhã",
  "pequeno almoço": "A&B - Café da manhã",
  "desjejum": "A&B - Café da manhã",
  "manhã": "A&B - Café da manhã",
  "matinal": "A&B - Café da manhã",
  "coffee": "A&B - Café da manhã",
  "qualidade do café": "A&B - Café da manhã",

  // Almoço/Jantar - EXPANDIDO
  "almoco": "A&B - Almoço",
  "almoço": "A&B - Almoço",
  "lunch": "A&B - Almoço",
  "almoçar": "A&B - Almoço",
  "almocar": "A&B - Almoço",
  "janta": "A&B - Almoço",
  "jantar": "A&B - Almoço",
  "dinner": "A&B - Almoço",
  "refeição": "A&B - Almoço",
  "refeicao": "A&B - Almoço",
  "meal": "A&B - Almoço",
  "buffet almoço": "A&B - Almoço",
  "buffet jantar": "A&B - Almoço",
  "lunch buffet": "A&B - Almoço",
  "dinner buffet": "A&B - Almoço",
  "refeição principal": "A&B - Almoço",
  "main meal": "A&B - Almoço",
  "evening meal": "A&B - Almoço",
  "noon meal": "A&B - Almoço",
  "meio-dia": "A&B - Almoço",
  "meio dia": "A&B - Almoço",
  "noite": "A&B - Almoço",
  "vespertino": "A&B - Almoço",
  "noturno": "A&B - Almoço",

  // Bebidas - NOVO
  "bebida": "A&B - Serviço",
  "bebidas": "A&B - Serviço",
  "drink": "A&B - Serviço",
  "drinks": "A&B - Serviço",
  "cerveja": "A&B - Serviço",
  "beer": "A&B - Serviço",
  "vinho": "A&B - Serviço",
  "wine": "A&B - Serviço",
  "caipirinha": "A&B - Serviço",
  "cocktail": "A&B - Serviço",
  "coquetail": "A&B - Serviço",
  "refrigerante": "A&B - Serviço",
  "soda": "A&B - Serviço",
  "agua": "A&B - Serviço",
  "água": "A&B - Serviço",
  "water": "A&B - Serviço",
  "suco": "A&B - Serviço",
  "juice": "A&B - Serviço",
  "cha": "A&B - Serviço",
  "chá": "A&B - Serviço",
  "tea": "A&B - Serviço",
  "cappuccino": "A&B - Serviço",
  "expresso": "A&B - Serviço",
  "espresso": "A&B - Serviço",
  "beverage": "A&B - Serviço",

  // Alimentos específicos - NOVO EXPANDIDO
  "comida": "A&B - Alimentos",
  "food": "A&B - Alimentos",
  "prato": "A&B - Alimentos",
  "pratos": "A&B - Alimentos",
  "dish": "A&B - Alimentos",
  "dishes": "A&B - Alimentos",
  "alimentos": "A&B - Alimentos",
  "alimentação": "A&B - Alimentos",
  "carne": "A&B - Alimentos",
  "meat": "A&B - Alimentos",
  "frango": "A&B - Alimentos",
  "chicken": "A&B - Alimentos",
  "peixe": "A&B - Alimentos",
  "fish": "A&B - Alimentos",
  "salada": "A&B - Alimentos",
  "saladas": "A&B - Alimentos",
  "fruta": "A&B - Alimentos",
  "frutas": "A&B - Alimentos",
  "fruit": "A&B - Alimentos",
  "fruits": "A&B - Alimentos",
  "verdura": "A&B - Alimentos",
  "verduras": "A&B - Alimentos",
  "vegetables": "A&B - Alimentos",
  "legume": "A&B - Alimentos",
  "legumes": "A&B - Alimentos",
  "arroz": "A&B - Alimentos",
  "rice": "A&B - Alimentos",
  "feijao": "A&B - Alimentos",
  "feijão": "A&B - Alimentos",
  "beans": "A&B - Alimentos",
  "macarrao": "A&B - Alimentos",
  "macarrão": "A&B - Alimentos",
  "pasta": "A&B - Alimentos",
  "massa": "A&B - Alimentos",
  "massas": "A&B - Alimentos",
  "sopa": "A&B - Alimentos",
  "soup": "A&B - Alimentos",
  "sobremesa": "A&B - Alimentos",
  "sobremesas": "A&B - Alimentos",
  "dessert": "A&B - Alimentos",
  "doce": "A&B - Alimentos",
  "doces": "A&B - Alimentos",
  "sweet": "A&B - Alimentos",
  "sweets": "A&B - Alimentos",
  "bolo": "A&B - Alimentos",
  "cake": "A&B - Alimentos",
  "pao": "A&B - Alimentos",
  "pão": "A&B - Alimentos",
  "paes": "A&B - Alimentos",
  "pães": "A&B - Alimentos",
  "bread": "A&B - Alimentos",
  "queijo": "A&B - Alimentos",
  "cheese": "A&B - Alimentos",
  "presunto": "A&B - Alimentos",
  "ham": "A&B - Alimentos",
  "ovo": "A&B - Alimentos",
  "ovos": "A&B - Alimentos",
  "eggs": "A&B - Alimentos",
  "leite": "A&B - Alimentos",
  "milk": "A&B - Alimentos",
  "iogurte": "A&B - Alimentos",
  "yogurt": "A&B - Alimentos",
  "cereal": "A&B - Alimentos",
  "cereais": "A&B - Alimentos",
  "granola": "A&B - Alimentos",
  "mel": "A&B - Alimentos",
  "honey": "A&B - Alimentos",
  "geleia": "A&B - Alimentos",
  "jam": "A&B - Alimentos",
  "manteiga": "A&B - Alimentos",
  "butter": "A&B - Alimentos",
  "margarina": "A&B - Alimentos",
  "margarine": "A&B - Alimentos",
  "bacon": "A&B - Alimentos",
  "linguica": "A&B - Alimentos",
  "linguiça": "A&B - Alimentos",
  "sausage": "A&B - Alimentos",
  "salsicha": "A&B - Alimentos",
  "hamburguer": "A&B - Alimentos",
  "hambúrguer": "A&B - Alimentos",
  "hamburger": "A&B - Alimentos",
  "pizza": "A&B - Alimentos",
  "sanduiche": "A&B - Alimentos",
  "sanduíche": "A&B - Alimentos",
  "sandwich": "A&B - Alimentos",
  "qualidade da comida": "A&B - Alimentos",
  "food quality": "A&B - Alimentos",

  // Variedade - EXPANDIDO
  "variedade": "A&B - Variedade",
  "variety": "A&B - Variedade",
  "opcao": "A&B - Variedade",
  "opção": "A&B - Variedade",
  "opcoes": "A&B - Variedade",
  "opções": "A&B - Variedade",
  "options": "A&B - Variedade",
  "escolha": "A&B - Variedade",
  "escolhas": "A&B - Variedade",
  "choice": "A&B - Variedade",
  "choices": "A&B - Variedade",
  "diversidade": "A&B - Variedade",
  "diversity": "A&B - Variedade",
  "selection": "A&B - Variedade",
  "selecao": "A&B - Variedade",
  "seleção": "A&B - Variedade",
  "alternativa": "A&B - Variedade",
  "alternativas": "A&B - Variedade",
  "alternative": "A&B - Variedade",
  "alternatives": "A&B - Variedade",
  "pouca variedade": "A&B - Variedade",
  "sem variedade": "A&B - Variedade",
  "falta variedade": "A&B - Variedade",
  "falta de variedade": "A&B - Variedade",
  "pouca opcao": "A&B - Variedade",
  "pouca opção": "A&B - Variedade",
  "poucas opcoes": "A&B - Variedade",
  "poucas opções": "A&B - Variedade",
  "sempre igual": "A&B - Variedade",
  "sempre a mesma": "A&B - Variedade",
  "repetitivo": "A&B - Variedade",
  "monotono": "A&B - Variedade",
  "monótono": "A&B - Variedade",
  "boring": "A&B - Variedade",
  "limited": "A&B - Variedade",
  "limitado": "A&B - Variedade",
  "limitada": "A&B - Variedade",
  "carne seca": "A&B - Variedade",
  "queijo coalho": "A&B - Variedade",
  "não estavam disponíveis": "A&B - Variedade",
  "indisponível": "A&B - Variedade",
  "falta de": "A&B - Variedade",
  "sem": "A&B - Variedade",

  // Preços - EXPANDIDO  
  "preco": "A&B - Preço",
  "preço": "A&B - Preço",
  "precos": "A&B - Preço",
  "preços": "A&B - Preço",
  "price": "A&B - Preço",
  "prices": "A&B - Preço",
  "caro": "A&B - Preço",
  "cara": "A&B - Preço",
  "caros": "A&B - Preço",
  "caras": "A&B - Preço",
  "expensive": "A&B - Preço",
  "costly": "A&B - Preço",
  "custo": "A&B - Preço",
  "cost": "A&B - Preço",
  "valor": "A&B - Preço",
  "value": "A&B - Preço",
  "preço alto": "A&B - Preço",
  "preços altos": "A&B - Preço",
  "muito caro": "A&B - Preço",
  "very expensive": "A&B - Preço",
  "too expensive": "A&B - Preço",
  "overpriced": "A&B - Preço",
  "superfaturado": "A&B - Preço",
  "absurdo": "A&B - Preço",
  "absurd": "A&B - Preço",
  "exagerado": "A&B - Preço",
  "exaggerated": "A&B - Preço",
  "alto": "A&B - Preço",
  "alta": "A&B - Preço",
  "altos": "A&B - Preço",
  "altas": "A&B - Preço",
  "high": "A&B - Preço",

  // Gastronomia - NOVO
  "gastronomia": "A&B - Gastronomia",
  "culinária": "A&B - Gastronomia", 
  "culinaria": "A&B - Gastronomia",
  "cuisine": "A&B - Gastronomia",
  "chef": "A&B - Gastronomia",
  "prato típico": "A&B - Gastronomia",
  "especialidade": "A&B - Gastronomia",
  "specialty": "A&B - Gastronomia",
  "típico": "A&B - Gastronomia",
  "regional": "A&B - Gastronomia",
  "local": "A&B - Gastronomia",
  
  // === SEÇÃO DUPLICADAS REMOVIDAS - MANTENDO APENAS A VERSÃO PRINCIPAL ===
  // (Todas essas chaves já existem na seção expandida acima)

  // === LIMPEZA - EXPANDIDO ===
  // Termos gerais de limpeza
  "limpeza": "Limpeza - Quarto",
  "limpo": "Limpeza - Quarto",
  "limpa": "Limpeza - Quarto",
  "limpas": "Limpeza - Quarto",
  "limpos": "Limpeza - Quarto",
  "sujo": "Limpeza - Quarto",
  "suja": "Limpeza - Quarto",
  "sujas": "Limpeza - Quarto",
  "sujos": "Limpeza - Quarto",
  "dirty": "Limpeza - Quarto",
  "clean": "Limpeza - Quarto",
  "cleaning": "Limpeza - Quarto",
  "higiene": "Limpeza - Quarto",
  "higienizado": "Limpeza - Quarto",
  "higienizada": "Limpeza - Quarto",
  "hygienic": "Limpeza - Quarto",
  "hygiene": "Limpeza - Quarto",
  "sanitizado": "Limpeza - Quarto",
  "sanitizada": "Limpeza - Quarto",
  "sanitize": "Limpeza - Quarto",
  "desinfectado": "Limpeza - Quarto",
  "desinfetado": "Limpeza - Quarto",
  "mal cheiroso": "Governança - Mofo",
  "cheiro ruim": "Governança - Mofo",
  "fedorento": "Governança - Mofo",
  "smelly": "Governança - Mofo",
  "bad smell": "Governança - Mofo",
  "odor": "Governança - Mofo",
  "odour": "Governança - Mofo",
  "cheiro": "Governança - Mofo",
  "smell": "Governança - Mofo",
  "fedor": "Governança - Mofo",
  "mau cheiro": "Governança - Mofo",
  "cheiro forte": "Governança - Mofo",
  "mofo": "Governança - Mofo",
  "mofado": "Governança - Mofo",
  "umidade": "Governança - Mofo",
  "úmido": "Governança - Mofo",
  "humid": "Governança - Mofo",
  "abafado": "Governança - Mofo",
  "perfumado": "Limpeza - Quarto",
  "cheiroso": "Limpeza - Quarto",
  "fragrante": "Limpeza - Quarto",
  "fragrant": "Limpeza - Quarto",
  
  // Limpeza específica do banheiro
  "banheiro sujo": "Limpeza - Banheiro",
  "bathroom dirty": "Limpeza - Banheiro",
  "banheiro limpo": "Limpeza - Banheiro",
  "bathroom clean": "Limpeza - Banheiro",
  "vaso sanitário": "Limpeza - Banheiro",
  "vaso sanitario": "Limpeza - Banheiro",
  "privada": "Limpeza - Banheiro",
  "toilet": "Limpeza - Banheiro",
  "pia": "Limpeza - Banheiro",
  "sink": "Limpeza - Banheiro",
  "lavatório": "Limpeza - Banheiro",
  "lavatorio": "Limpeza - Banheiro",
  "washbasin": "Limpeza - Banheiro",
  "box": "Limpeza - Banheiro",
  "shower": "Limpeza - Banheiro",
  "ducha": "Limpeza - Banheiro",
  "chuveiro": "Limpeza - Banheiro",
  "banheira": "Limpeza - Banheiro",
  "bathtub": "Limpeza - Banheiro",
  "tub": "Limpeza - Banheiro",
  "azulejo": "Limpeza - Banheiro",
  "azulejos": "Limpeza - Banheiro",
  "tiles": "Limpeza - Banheiro",
  "tile": "Limpeza - Banheiro",
  "rejunte": "Limpeza - Banheiro",
  "grout": "Limpeza - Banheiro",
  "piso": "Limpeza - Banheiro",
  "floor": "Limpeza - Banheiro",
  "chão": "Limpeza - Banheiro",
  "espelho": "Limpeza - Banheiro",
  "mirror": "Limpeza - Banheiro",
  "vidro": "Limpeza - Banheiro",
  "glass": "Limpeza - Banheiro",
  
  // Produtos de limpeza e amenities
  "saboneteira": "Limpeza - Banheiro",
  "saboneteira vazia": "Limpeza - Banheiro",
  "soap dispenser": "Limpeza - Banheiro",
  "sabonete": "Limpeza - Banheiro",
  "sabão": "Limpeza - Banheiro",
  "soap": "Limpeza - Banheiro",
  "shampoo": "Limpeza - Banheiro",
  "condicionador": "Limpeza - Banheiro",
  "conditioner": "Limpeza - Banheiro",
  "gel": "Limpeza - Banheiro",
  "shower gel": "Limpeza - Banheiro",
  "body wash": "Limpeza - Banheiro",
  "toalha": "Limpeza - Banheiro",
  "toalhas": "Limpeza - Banheiro",
  "towel": "Limpeza - Banheiro",
  "towels": "Limpeza - Banheiro",
  "toalha suja": "Limpeza - Banheiro",
  "toalha limpa": "Limpeza - Banheiro",
  "toalha molhada": "Limpeza - Banheiro",
  "toalha úmida": "Limpeza - Banheiro",
  "toalha umida": "Limpeza - Banheiro",
  "wet towel": "Limpeza - Banheiro",
  "damp towel": "Limpeza - Banheiro",
  "papel higiênico": "Limpeza - Banheiro",
  "papel higienico": "Limpeza - Banheiro",
  "toilet paper": "Limpeza - Banheiro",
  "papel": "Limpeza - Banheiro",
  "tissue": "Limpeza - Banheiro",
  
  // Limpeza do quarto
  "quarto sujo": "Limpeza - Quarto",
  "room dirty": "Limpeza - Quarto",
  "quarto limpo": "Limpeza - Quarto",
  "room clean": "Limpeza - Quarto",
  "cama": "Limpeza - Quarto",
  "bed": "Limpeza - Quarto",
  "cama suja": "Limpeza - Quarto",
  "cama limpa": "Limpeza - Quarto",
  "lençol": "Limpeza - Quarto",
  "lencol": "Limpeza - Quarto",
  "lençóis": "Limpeza - Quarto",
  "lencois": "Limpeza - Quarto",
  "sheet": "Limpeza - Quarto",
  "sheets": "Limpeza - Quarto",
  "bedsheet": "Limpeza - Quarto",
  "bedsheets": "Limpeza - Quarto",
  "lençol sujo": "Limpeza - Quarto",
  "lençol limpo": "Limpeza - Quarto",
  "sheet dirty": "Limpeza - Quarto",
  "sheet clean": "Limpeza - Quarto",
  "fronha": "Limpeza - Quarto",
  "pillowcase": "Limpeza - Quarto",
  "pillow case": "Limpeza - Quarto",
  "travesseiro": "Limpeza - Quarto",
  "pillow": "Limpeza - Quarto",
  "almofada": "Limpeza - Quarto",
  "cushion": "Limpeza - Quarto",
  "cobertor": "Limpeza - Quarto",
  "blanket": "Limpeza - Quarto",
  "edredom": "Limpeza - Quarto",
  "duvet": "Limpeza - Quarto",
  "comforter": "Limpeza - Quarto",
  "colcha": "Limpeza - Quarto",
  "bedspread": "Limpeza - Quarto",
  "carpete": "Limpeza - Quarto",
  "carpet": "Limpeza - Quarto",
  "tapete": "Limpeza - Quarto",
  "rug": "Limpeza - Quarto",
  "cortina": "Limpeza - Quarto",
  "cortinas": "Limpeza - Quarto",
  "curtain": "Limpeza - Quarto",
  "curtains": "Limpeza - Quarto",
  "persiana": "Limpeza - Quarto",
  "blinds": "Limpeza - Quarto",
  "móvel": "Limpeza - Quarto",
  "móveis": "Limpeza - Quarto",
  "movel": "Limpeza - Quarto",
  "moveis": "Limpeza - Quarto",
  "furniture": "Limpeza - Quarto",
  "mesa": "Limpeza - Quarto",
  "table": "Limpeza - Quarto",
  "cadeira": "Limpeza - Quarto",
  "chair": "Limpeza - Quarto",
  "poltrona": "Limpeza - Quarto",
  "armchair": "Limpeza - Quarto",
  "guarda-roupa": "Limpeza - Quarto",
  "guarda roupa": "Limpeza - Quarto",
  "wardrobe": "Limpeza - Quarto",
  "closet": "Limpeza - Quarto",
  "armario": "Limpeza - Quarto",
  "armário": "Limpeza - Quarto",
  "cabinet": "Limpeza - Quarto",
  
  // Limpeza áreas sociais
  "área social": "Limpeza - Áreas sociais",
  "area social": "Limpeza - Áreas sociais",
  "common area": "Limpeza - Áreas sociais",
  "lobby": "Limpeza - Áreas sociais",
  "saguao": "Limpeza - Áreas sociais",
  "saguão": "Limpeza - Áreas sociais",
  "hall": "Limpeza - Áreas sociais",
  "corredor": "Limpeza - Áreas sociais",
  "corridor": "Limpeza - Áreas sociais",
  "hallway": "Limpeza - Áreas sociais",
  "elevador": "Limpeza - Áreas sociais",
  "elevator": "Limpeza - Áreas sociais",
  "escada": "Limpeza - Áreas sociais",
  "stairs": "Limpeza - Áreas sociais",
  "staircase": "Limpeza - Áreas sociais",
  "varanda": "Limpeza - Quarto",
  "sacada": "Limpeza - Quarto",
  "balcony": "Limpeza - Quarto",
  "terraço": "Limpeza - Quarto",
  "terrace": "Limpeza - Quarto",
  "deck": "Limpeza - Quarto",

  // === MANUTENÇÃO - EXPANDIDO ===
  "cofre não funcionava": "Manutenção - Quarto",
  "cofre": "Manutenção - Quarto",
  "luzes ao lado da cama": "Manutenção - Quarto",
  "luz não funciona": "Manutenção - Quarto",
  "porta da varanda": "Manutenção - Quarto",
  "janela não fechava": "Manutenção - Quarto",
  "fechadura": "Manutenção - Quarto",
  "ar condicionado": "Ar-condicionado",
  "ar-condicionado": "Ar-condicionado",
  
  // Frigobar - Dividido entre contextos
  "frigobar quebrado": "Manutenção - Frigobar",
  "frigobar não funciona": "Manutenção - Frigobar",
  "frigobar com defeito": "Manutenção - Frigobar",
  "frigobar organizado": "Governança - Frigobar",
  "frigobar bagunçado": "Governança - Frigobar",
  "frigobar desorganizado": "Governança - Frigobar",
  "frigobar limpo": "Governança - Frigobar",
  "frigobar sujo": "Governança - Frigobar",
  "frigobar arrumado": "Governança - Frigobar",
  "frigobar faltando": "Governança - Frigobar",
  "organizar frigobar": "Governança - Frigobar",
  "faltar frigobar": "Governança - Frigobar",
  
  // Banheiro - ÚNICO (sem duplicatas)
  "torneira": "Manutenção - Banheiro",
  "torneira jorra água": "Manutenção - Banheiro",
  "chuveiro difícil": "Manutenção - Banheiro",
  "box do chuveiro": "Manutenção - Banheiro",
  "lixeira": "Manutenção - Banheiro",
  "lixeira quebrada": "Manutenção - Banheiro",
  
  // Instalações e jardinagem
  "hidromassagem": "Lazer - Estrutura",
  "hidromassagem quebrada": "Lazer - Estrutura",
  "jardim": "Manutenção - Jardinagem",
  "jardinagem": "Manutenção - Jardinagem",
  "plantas": "Manutenção - Jardinagem",
  "gramado": "Manutenção - Jardinagem",
  "grama": "Manutenção - Jardinagem",
  "paisagismo": "Manutenção - Jardinagem",
  "vegetação": "Manutenção - Jardinagem",
  "flores": "Manutenção - Jardinagem",
  "árvores": "Manutenção - Jardinagem",
  "arvores": "Manutenção - Jardinagem",
  "área verde": "Manutenção - Jardinagem",
  "area verde": "Manutenção - Jardinagem",
  "espaço verde": "Manutenção - Jardinagem",
  "espaco verde": "Manutenção - Jardinagem",
  
  // Estacionamento (movido para Recepção)
  "estacionamento": "Recepção - Estacionamento",
  "parking": "Recepção - Estacionamento",
  "vaga": "Recepção - Estacionamento",
  "vagas": "Recepção - Estacionamento",
  "carro": "Recepção - Estacionamento",
  "veiculo": "Recepção - Estacionamento",
  "veículo": "Recepção - Estacionamento",
  
  // Acessibilidade (movido para Produto)
  "acessibilidade": "Produto - Acessibilidade",
  "acessível": "Produto - Acessibilidade",
  "accessível": "Produto - Acessibilidade",
  "rampa": "Produto - Acessibilidade",
  "rampas": "Produto - Acessibilidade",
  "deficiente": "Produto - Acessibilidade",
  "mobilidade reduzida": "Produto - Acessibilidade",
  "cadeirante": "Produto - Acessibilidade",
  "wheelchair": "Produto - Acessibilidade",
  
  // Custo-benefício (movido para Produto)
  "custo beneficio": "Produto - Custo-benefício",
  "custo-beneficio": "Produto - Custo-benefício",
  "custo benefício": "Produto - Custo-benefício",
  "custo-benefício": "Produto - Custo-benefício",
  "valor pelo dinheiro": "Produto - Custo-benefício",
  "vale a pena": "Produto - Custo-benefício",
  "value for money": "Produto - Custo-benefício",
  
  // Processo (movido para Qualidade)
  "processo": "Qualidade - Processo",
  "processos": "Qualidade - Processo",
  "procedimento": "Qualidade - Processo",
  "procedimentos": "Qualidade - Processo",
  "qualidade": "Qualidade - Processo",
  "padronização": "Qualidade - Processo",
  "padronizacao": "Qualidade - Processo",
  "protocolo": "Qualidade - Processo",
  "protocolos": "Qualidade - Processo",
  
  // === FINAL DO DICIONÁRIO ===
  // (Todas as duplicatas foram removidas - mantendo apenas as definições originais expandidas acima)
};

// Dicionário normalizado para lookup eficiente
const NORMALIZATION_DICT = Object.fromEntries(
  Object.entries(RAW_NORMALIZATION_DICT).map(([k, v]) => [normalizeText(k), v])
);

// Keywords oficiais permitidas (removidas: Água, Reserva de cadeiras)
const OFFICIAL_KEYWORDS = [
  "A&B - Café da manhã", "A&B - Almoço", "A&B - Serviço", "A&B - Variedade", "A&B - Preço", "A&B - Gastronomia", "A&B - Alimentos",
  "Limpeza - Quarto", "Limpeza - Banheiro", "Limpeza - Áreas sociais", "Enxoval", "Governança - Serviço", "Governança - Mofo", "Governança - Frigobar",
  "Manutenção - Quarto", "Manutenção - Banheiro", "Manutenção - Instalações", "Manutenção - Serviço", "Manutenção - Jardinagem", "Manutenção - Frigobar",
  "Ar-condicionado", "Elevador",
  "Lazer - Variedade", "Lazer - Estrutura", "Spa", "Piscina", "Lazer - Serviço", "Lazer - Atividades de Lazer",
  "Tecnologia - Wi-fi", "Tecnologia - TV", "Academia",
  "Atendimento", "Processo", "Produto - Acessibilidade", "Produto - Custo-benefício", "Produto - Preço",
  "Comunicação", "Recepção - Serviço", "Recepção - Estacionamento", "Check-in - Atendimento Recepção", "Check-out - Atendimento Recepção",
  "Concierge", "Cotas", "Reservas",
  "Travesseiro", "Colchão", "Espelho", "Localização", "Mixologia", "Qualidade - Processo"
];

// Departamentos oficiais (mudança: Programa de vendas → EG)
const OFFICIAL_DEPARTMENTS = [
  "A&B", "Governança", "Limpeza", "Manutenção", "Produto",
  "Lazer", "TI", "Operações", "Qualidade", "Recepção", 
  "EG", "Comercial", "Academia"
];

// Problemas padronizados expandidos e melhorados
const STANDARD_PROBLEMS = [
  // Problemas de funcionamento
  "Não Funciona", "Funciona Mal", "Quebrado", "Com Defeito", "Intermitente",
  
  // Problemas de atendimento
  "Demora no Atendimento", "Atendimento Rude", "Atendimento Despreparado", "Falta de Staff", "Staff Insuficiente",
  
  // Problemas de qualidade
  "Qualidade Baixa", "Qualidade da Comida", "Qualidade de Bebida", "Sabor Ruim", "Comida Fria", "Bebida Quente",
  
  // Problemas de limpeza e higiene
  "Falta de Limpeza", "Sujo", "Mal Cheiroso", "Mofo", "Manchas", "Cabelos", "Lixo Acumulado",
  
  // Problemas de manutenção
  "Falta de Manutenção", "Desgastado", "Precisando Troca", "Enferrujado", "Descascado", "Rachado",
  
  // Problemas de disponibilidade
  "Falta de Disponibilidade", "Indisponível", "Esgotado", "Sem Estoque", "Fora de Funcionamento",
  
  // Problemas de variedade e opções
  "Falta de Variedade", "Pouca Variedade", "Sem Opções", "Limitado", "Repetitivo", "Monótono",
  
  // Problemas de espaço e estrutura
  "Espaço Insuficiente", "Muito Pequeno", "Apertado", "Lotado", "Superlotado", "Sem Lugar",
  
  // Problemas de temperatura
  "Muito Frio", "Muito Quente", "Temperatura Inadequada", "Não Resfria", "Não Esquenta",
  
  // Problemas de ruído
  "Ruído Excessivo", "Muito Barulho", "Barulhento", "Som Alto", "Música Alta", "Conversas Altas",
  
  // Problemas de equipamento
  "Falta de Equipamento", "Equipamento Velho", "Equipamento Inadequado", "Sem Equipamento",
  
  // Problemas de preço
  "Preço Alto", "Muito Caro", "Custo Elevado", "Fora do Padrão", "Não Vale o Preço",
  
  // Problemas de conexão e tecnologia
  "Conexão Instável", "Internet Lenta", "Sem Sinal", "Wi-fi Cai", "TV Sem Sinal", "Canais Limitados",
  
  // Problemas de comunicação
  "Comunicação Ruim", "Informação Incorreta", "Não Informaram", "Desinformação", "Falta de Transparência",
  
  // Problemas de processo
  "Processo Lento", "Burocrático", "Complicado", "Demorado", "Confuso", "Desorganizado",
  
  // Problemas de capacidade
  "Capacidade Insuficiente", "Poucos Funcionários", "Fila Longa", "Espera Longa", "Sobrecarga",
  
  // Problemas específicos
  "Localização Ruim", "Difícil Acesso", "Longe", "Vista Obstruída", "Isolamento Ruim",
  
  // Casos especiais
  "VAZIO", "Não Identificado", "Sugestão de Melhoria", "Elogio"
];

// Arrays normalizados para busca eficiente
const NORMALIZED_KEYWORDS = OFFICIAL_KEYWORDS.map(k => normalizeText(k));
const NORMALIZED_PROBLEMS = STANDARD_PROBLEMS.map(p => normalizeText(p));

// Função para validar e corrigir keyword - baseada nas correções da cliente
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
  
  // Verificar no dicionário de normalização
  const contextNormalized = normalizeText(context || '');
  const dictMatch = NORMALIZATION_DICT[contextNormalized] || NORMALIZATION_DICT[normalized];
  if (dictMatch && OFFICIAL_KEYWORDS.includes(dictMatch)) {
    return dictMatch;
  }
  
  // PRIORIDADE 1: A&B - baseado nas correções da cliente
  if (normalized.includes('a&b') || normalized.includes('alimento') || normalized.includes('bebida') ||
      normalized.includes('comida') || normalized.includes('restaurante') || normalized.includes('bar') ||
      normalized.includes('garcom') || normalized.includes('garcon') || normalized.includes('waiter')) {
    
    // Café da manhã tem prioridade
    if (contextNormalized.includes('cafe') || contextNormalized.includes('breakfast') || 
        contextNormalized.includes('manha') || contextNormalized.includes('morning')) {
      return "A&B - Café da manhã";
    }
    
    // Almoço e Janta
    if (contextNormalized.includes('almoco') || contextNormalized.includes('almoço') || 
        contextNormalized.includes('lunch') || contextNormalized.includes('janta') || 
        contextNormalized.includes('jantar') || contextNormalized.includes('dinner') ||
        contextNormalized.includes('refeicao') || contextNormalized.includes('refeição')) {
      return "A&B - Almoço";
    }
    
    // Preço
    if (contextNormalized.includes('preco') || contextNormalized.includes('caro') || 
        contextNormalized.includes('expensive') || contextNormalized.includes('price')) {
      return "A&B - Preço";
    }
    
    // Variedade
    if (contextNormalized.includes('variedade') || contextNormalized.includes('opcao') || 
        contextNormalized.includes('falta de') || contextNormalized.includes('sem')) {
      return "A&B - Variedade";
    }
    
    // Gastronomia
    if (contextNormalized.includes('gastronomia') || contextNormalized.includes('chef') || 
        contextNormalized.includes('culinaria') || contextNormalized.includes('prato')) {
      return "A&B - Gastronomia";
    }
    
    // Qualidade da comida
    if (contextNormalized.includes('qualidade') || contextNormalized.includes('sabor') || 
        contextNormalized.includes('ruim') || contextNormalized.includes('gostoso')) {
      return "A&B - Alimentos";
    }
    
    // Default A&B
    return "A&B - Serviço";
  }
  
  // PRIORIDADE 2: Manutenção vs Produto (baseado nas correções da cliente)
  if (normalized.includes('manutencao') || normalized.includes('quebrado') || normalized.includes('defeito') ||
      contextNormalized.includes('nao funciona') || contextNormalized.includes('conserto')) {
    
    if (contextNormalized.includes('banheiro') || contextNormalized.includes('chuveiro') || 
        contextNormalized.includes('torneira') || contextNormalized.includes('box')) {
      return "Manutenção - Banheiro";
    }
    
    if (contextNormalized.includes('quarto') || contextNormalized.includes('cofre') || 
        contextNormalized.includes('luz') || contextNormalized.includes('porta')) {
      return "Manutenção - Quarto";
    }
    
    return "Manutenção - Serviço";
  }
  
  // PRIORIDADE 3: Produto (baseado nas correções da cliente)
  if (normalized.includes('produto') || normalized.includes('qualidade') ||
      contextNormalized.includes('cobertas') || contextNormalized.includes('fino') || 
      contextNormalized.includes('pequeno') || contextNormalized.includes('frigobar')) {
    
    if (contextNormalized.includes('coberta') || contextNormalized.includes('toalha') || 
        contextNormalized.includes('lencol') || contextNormalized.includes('enxoval')) {
      return "Enxoval";
    }
    
    if (contextNormalized.includes('frigobar') || contextNormalized.includes('minibar')) {
      return "Frigobar";
    }
    
    if (contextNormalized.includes('travesseiro')) {
      return "Travesseiro";
    }
    
    if (contextNormalized.includes('colchao') || contextNormalized.includes('colchão')) {
      return "Colchão";
    }
    
    return "Enxoval";
  }
  
  // PRIORIDADE 4: Limpeza (baseado nas correções da cliente)
  if (normalized.includes('limpeza') || normalized.includes('limpo') || normalized.includes('sujo') ||
      contextNormalized.includes('saboneteira') || contextNormalized.includes('cortinas')) {
    
    if (contextNormalized.includes('banheiro') || contextNormalized.includes('saboneteira')) {
      return "Limpeza - Banheiro";
    }
    
    if (contextNormalized.includes('quarto') || contextNormalized.includes('cortinas')) {
      return "Limpeza - Quarto";
    }
    
    if (contextNormalized.includes('restaurante') || contextNormalized.includes('area social')) {
      return "Limpeza - Áreas sociais";
    }
    
    return "Limpeza - Quarto";
  }
  
  // PRIORIDADE 5: Lazer (baseado nas correções da cliente)  
  if (normalized.includes('lazer') || normalized.includes('recreacao') || normalized.includes('piscina') ||
      normalized.includes('atividade') || normalized.includes('bingo') || normalized.includes('monitor')) {
    
    if (contextNormalized.includes('piscina') || contextNormalized.includes('pool')) {
      return "Piscina";
    }
    
    if (contextNormalized.includes('academia') || contextNormalized.includes('gym')) {
      return "Academia";
    }
    
    if (contextNormalized.includes('spa') || contextNormalized.includes('massagem')) {
      return "Spa";
    }
    
    if (contextNormalized.includes('hidromassagem')) {
      return "Lazer - Estrutura";
    }
    
    if (contextNormalized.includes('bingo') || contextNormalized.includes('karaoke') || 
        contextNormalized.includes('fogueira') || contextNormalized.includes('atividade') ||
        contextNormalized.includes('mixologia')) {
      return "Lazer - Atividades de Lazer";
    }
    
    if (contextNormalized.includes('tio') || contextNormalized.includes('tia') || 
        contextNormalized.includes('monitor') || contextNormalized.includes('recreacao')) {
      return "Lazer - Serviço";
    }
    
    if (contextNormalized.includes('estrutura') || contextNormalized.includes('instalacao') ||
        contextNormalized.includes('brinquedo') || contextNormalized.includes('salao')) {
      return "Lazer - Estrutura";
    }
    
    return "Lazer - Serviço";
  }
  
  // PRIORIDADE 6: Tecnologia
  if (normalized.includes('tecnologia') || normalized.includes('wi-fi') || normalized.includes('wifi') ||
      normalized.includes('internet') || normalized.includes('tv') || normalized.includes('streaming')) {
    
    if (contextNormalized.includes('tv') || contextNormalized.includes('televisao') || 
        contextNormalized.includes('streaming') || contextNormalized.includes('canais')) {
      return "Tecnologia - TV";
    }
    
    return "Tecnologia - Wi-fi";
  }
  
  // PRIORIDADE 7: Recepção
  if (normalized.includes('recepcao') || normalized.includes('check') || normalized.includes('reception')) {
    return "Recepção - Serviço";
  }
  
  // PRIORIDADE 8: EG (antigo Programa de vendas)
  if (normalized.includes('concierge')) {
    return "Concierge";
  }
  
  if (normalized.includes('multipropriedade') || normalized.includes('timeshare') || 
      normalized.includes('pressao') || normalized.includes('insistencia') || normalized.includes('cotas')) {
    return "Cotas";
  }
  
  // PRIORIDADE 9: Localização
  if (normalized.includes('localizacao') || normalized.includes('location') || normalized.includes('vista') ||
      normalized.includes('acesso') || normalized.includes('proximidade') || normalized.includes('perto')) {
    return "Localização";
  }
  
  // Log para desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`🤖 Keyword não mapeada: "${keyword}" (contexto: "${context?.substring(0, 50)}...")`);
  }
  
  // Permitir que IA proponha classificação se não for vazia
  if (keyword && keyword.trim() !== '' && keyword.trim().toLowerCase() !== 'não identificado') {
    return keyword;
  }
  
  // Fallback padrão
  return "Atendimento";
}

// Função para validar departamento baseado nas correções da cliente
function validateDepartment(department: string, keyword: string): string {
  // Mapeamento keyword -> departamento baseado nas respostas da cliente
  const keywordToDepartment: Record<string, string> = {
    // A&B - Alimentos & Bebidas
    "A&B - Café da manhã": "A&B",
    "A&B - Almoço": "A&B",
    "A&B - Serviço": "A&B", 
    "A&B - Variedade": "A&B",
    "A&B - Preço": "A&B",
    "A&B - Gastronomia": "A&B",
    "A&B - Alimentos": "A&B",
    
    // Limpeza
    "Limpeza - Quarto": "Limpeza",
    "Limpeza - Banheiro": "Limpeza",
    "Limpeza - Áreas sociais": "Limpeza",
    
    // Governança/Produto (baseado nas correções da cliente)
    "Enxoval": "Produto", // Cliente preferiu Produto para enxoval/cobertas
    "Governança - Serviço": "Governança",
    "Governança - Mofo": "Governança",
    "Governança - Frigobar": "Governança",
    
    // Manutenção
    "Manutenção - Quarto": "Manutenção",
    "Manutenção - Banheiro": "Manutenção", 
    "Manutenção - Instalações": "Manutenção",
    "Manutenção - Serviço": "Manutenção",
    "Manutenção - Jardinagem": "Manutenção",
    "Manutenção - Frigobar": "Manutenção",
    
    // Infraestrutura específica
    "Ar-condicionado": "Manutenção",
    "Elevador": "Manutenção",
    
    // Lazer
    "Lazer - Variedade": "Lazer",
    "Lazer - Estrutura": "Lazer",
    "Lazer - Serviço": "Lazer",
    "Lazer - Atividades de Lazer": "Lazer",
    "Spa": "Lazer",
    "Piscina": "Lazer",
    "Academia": "Academia", // Cliente disse que academia é departamento próprio
    
    // Tecnologia
    "Tecnologia - Wi-fi": "TI",
    "Tecnologia - TV": "TI",
    
    // Operações (removido estacionamento)
    "Atendimento": "Operações",
    "Localização": "Operações",
    
    // Produto (atualizações conforme solicitado)
    "Produto - Acessibilidade": "Produto",
    "Produto - Custo-benefício": "Produto",
    "Produto - Preço": "Produto",
    
    // Qualidade (processo foi movido para cá)
    "Qualidade - Processo": "Qualidade",
    
    // Comunicação e Qualidade
    "Comunicação": "Qualidade",
    
    // Recepção (inclui estacionamento agora)
    "Recepção - Serviço": "Recepção",
    "Recepção - Estacionamento": "Recepção",
    "Check-in - Atendimento Recepção": "Recepção", // Nova keyword específica
    "Check-out - Atendimento Recepção": "Recepção", // Nova keyword específica
    
    // EG (antigo Programa de vendas)
    "Concierge": "EG",
    "Cotas": "EG",
    
    // Comercial
    "Reservas": "Comercial",
    
    // Produto (itens físicos)
    "Travesseiro": "Produto",
    "Colchão": "Produto",
    "Espelho": "Produto",
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

// Roteador de elogios melhorado - baseado nas correções da cliente
function reroutePraiseKeyword(keyword: string, problem: string, context?: string): string {
  // Só atua em elogios puros (problem="VAZIO") que foram classificados como "Atendimento"
  if (problem !== 'VAZIO' || normalizeText(keyword) !== normalizeText('Atendimento')) {
    return keyword;
  }
  
  const c = normalizeText(context || '');
  const has = (arr: string[]) => arr.some(t => c.includes(normalizeText(t)));

  // 🔥 DETECÇÃO BASEADA NAS CORREÇÕES DA CLIENTE - PRIORIDADE MÁXIMA
  
  // PRIORIDADE 1: A&B - detecção muito mais ampla baseada nas correções
  if (has(['garçom', 'garçonete', 'garçons', 'garcons', 'garcom', 'garconete', 'waiter', 'waitress', 'bartender'])) {
    return 'A&B - Serviço';
  }
  
  if (has(['restaurante', 'restaurant', 'bar', 'food', 'meal', 'dinner', 'lunch', 'atendimento do restaurante', 'pessoal do restaurante', 'equipe do restaurante', 'yasmin'])) {
    return 'A&B - Serviço';
  }
  
  if (has(['cafe', 'café', 'breakfast', 'café da manhã', 'cafe da manha', 'coffee'])) {
    return 'A&B - Café da manhã';
  }
  
  if (has(['cardápio', 'cardapio', 'menu', 'transparência']) && has(['restaurante', 'bar', 'comida'])) {
    return 'A&B - Serviço';
  }

  // PRIORIDADE 2: Lazer - detecção expandida baseada nas correções
  if (has(['piscina', 'pool', 'praia', 'beach'])) {
    return 'Piscina';
  }
  
  if (has(['academia', 'gym', 'fitness'])) {
    return 'Academia';
  }
  
  if (has(['spa', 'massagem', 'massage'])) {
    return 'Spa';
  }
  
  if (has(['hidromassagem', 'jacuzzi']) || (has(['quebrada', 'funcionando']) && has(['hidromassagem']))) {
    return 'Lazer - Estrutura';
  }
  
  if (has(['bingo', 'karaoke', 'fogueira', 'mixologia', 'aula', 'atividade', 'brincadeira', 'animacao', 'animação', 'entretenimento'])) {
    return 'Lazer - Atividades de Lazer';
  }
  
  if (has(['recreacao', 'recreação', 'monitor', 'monitores', 'tio', 'tia', 'lucas', 'claudia', 'diversao', 'diversão', 'lazer', 'equipe de recreação', 'pessoal da recreação'])) {
    return 'Lazer - Serviço';
  }
  
  if (has(['brinquedos infláveis', 'salão de jogos', 'salao de jogos', 'estrutura de lazer'])) {
    return 'Lazer - Estrutura';
  }

  // PRIORIDADE 3: Recepção - Check-in/Check-out específicos
  if (has(['check in', 'check-in', 'checkin'])) {
    return 'Check-in - Atendimento Recepção';
  }
  
  if (has(['check out', 'check-out', 'checkout'])) {
    return 'Check-out - Atendimento Recepção';
  }

  // PRIORIDADE 4: Recepção (outros serviços)
  if (has(['recepcao', 'recepção', 'front desk', 'reception', 'recepcionista', 'joao batista', 'joão batista'])) {
    return 'Recepção - Serviço';
  }

  // PRIORIDADE 4: Tecnologia - detecção expandida
  if (has(['wifi', 'wi-fi', 'internet', 'conexao', 'conexão', 'sinal', 'rede'])) {
    return 'Tecnologia - Wi-fi';
  }
  
  if (has(['tv', 'televisao', 'televisão', 'canal', 'canais', 'streaming', 'netflix', 'youtube'])) {
    return 'Tecnologia - TV';
  }

  // PRIORIDADE 5: Limpeza e Governança - baseado nas correções da cliente
  if (has(['quarto', 'room']) && has(['limpo', 'limpeza', 'cheiroso', 'arrumacao', 'arrumação', 'organizado', 'arrumado'])) {
    return 'Limpeza - Quarto';
  }
  
  if (has(['banheiro', 'bathroom']) && has(['limpo', 'limpeza', 'cheiroso', 'arrumado'])) {
    return 'Limpeza - Banheiro';
  }
  
  if (has(['restaurante', 'area social', 'areas sociais']) && has(['limpo', 'limpeza', 'organizado'])) {
    return 'Limpeza - Áreas sociais';
  }

  // PRIORIDADE 5.5: Governança - Mofo e cheiro
  if (has(['mofo', 'mofado', 'cheiro forte', 'mau cheiro', 'mal cheiroso', 'fedorento', 'umidade', 'úmido', 'abafado'])) {
    return 'Governança - Mofo';
  }

  // PRIORIDADE 6: Produto - baseado nas correções da cliente
  if (has(['toalha', 'lençol', 'lencol', 'enxoval', 'roupa de cama', 'coberta', 'cobertas'])) {
    return 'Enxoval';
  }
  
  if (has(['travesseiro', 'pillow'])) {
    return 'Travesseiro';
  }
  
  if (has(['colchao', 'colchão', 'mattress'])) {
    return 'Colchão';
  }
  
  // PRIORIDADE 6.5: Frigobar - contexto específico
  if (has(['frigobar', 'minibar', 'geladeira pequena'])) {
    // Verificar contexto para decidir entre Governança ou Manutenção
    if (has(['quebrado', 'não funciona', 'defeito', 'estragado', 'com problema'])) {
      return 'Manutenção - Frigobar';
    } else if (has(['organizar', 'bagunçado', 'desorganizado', 'limpo', 'sujo', 'arrumado', 'faltando'])) {
      return 'Governança - Frigobar';
    }
    // Default para Governança (organização é mais comum)
    return 'Governança - Frigobar';
  }

  // PRIORIDADE 7: Manutenção - baseado nas correções
  if (has(['cofre', 'safe']) && !has(['quebrado', 'nao funciona', 'defeito'])) {
    return 'Manutenção - Quarto'; // Se não há problema, pode ser elogio ao funcionamento
  }
  
  if (has(['ar condicionado', 'ar-condicionado', 'ac', 'climatização'])) {
    return 'Ar-condicionado';
  }
  
  if (has(['elevador', 'elevator'])) {
    return 'Elevador';
  }

  // PRIORIDADE 7.5: Manutenção - Jardinagem
  if (has(['jardim', 'jardinagem', 'plantas', 'gramado', 'grama', 'paisagismo', 'vegetação', 'flores', 'árvores', 'arvores', 'área verde', 'area verde', 'espaço verde', 'espaco verde'])) {
    return 'Manutenção - Jardinagem';
  }

  // PRIORIDADE 8: Localização - detecção expandida
  if (has(['localizacao', 'localização', 'perto', 'próximo', 'proximo', 'vista', 'acesso', 'posição', 'situado', 'location', 'convenient', 'close'])) {
    return 'Localização';
  }

  // PRIORIDADE 9: EG (antigo Programa de vendas) - baseado nas correções
  if (has(['concierge', 'keila', 'isabel']) && !has(['varias pessoas', 'várias pessoas', 'equipe'])) {
    return 'Concierge';
  }

  // PRIORIDADE 10: Estacionamento (movido para Recepção)
  if (has(['estacionamento', 'parking', 'vaga', 'carro'])) {
    return 'Recepção - Estacionamento';
  }

  // 🚨 REGRA ESPECIAL DA CLIENTE: Funcionários específicos por departamento
  // Se conseguir identificar o departamento da pessoa, usar departamento específico
  
  // Nomes conhecidos da equipe A&B
  if (has(['heny', 'juliete', 'jane', 'yasmin']) || 
      (has(['equipe', 'pessoal', 'funcionarios', 'staff']) && has(['restaurante', 'bar', 'a&b', 'alimentos', 'bebidas']))) {
    return 'A&B - Serviço';
  }
  
  // Nomes conhecidos da equipe Lazer  
  if (has(['lucas', 'claudia']) || 
      (has(['equipe', 'pessoal', 'funcionarios', 'staff']) && has(['recreacao', 'lazer', 'atividades', 'monitor']))) {
    return 'Lazer - Serviço';
  }

  // PRIORIDADE 11: Produto - novas palavras-chave
  if (has(['acessibilidade', 'acessível', 'accessível', 'rampa', 'deficiente', 'mobilidade reduzida'])) {
    return 'Produto - Acessibilidade';
  }
  
  if (has(['custo beneficio', 'custo-beneficio', 'custo benefício', 'custo-benefício', 'valor pelo dinheiro', 'vale a pena'])) {
    return 'Produto - Custo-benefício';
  }
  
  if (has(['preço', 'preco', 'preços', 'precos', 'caro', 'barato', 'valor', 'price']) && 
      !has(['frigobar', 'minibar', 'a&b', 'restaurante', 'bar', 'bebida', 'comida'])) {
    return 'Produto - Preço';
  }

  // PRIORIDADE 12: Qualidade - Processo
  if (has(['processo', 'procedimento', 'qualidade', 'padronização', 'padronizacao', 'protocolo'])) {
    return 'Qualidade - Processo';
  }

  // FALLBACK: sem pistas específicas, mantém "Atendimento" para elogios genéricos
  // Esta é a regra da cliente: quando não consegue identificar departamento específico
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

    // Log para debug (sem expor API key)
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

    if (!finalText || finalText.trim() === '' || finalText.trim().length < 3) {
      console.log("⚠️ [ANALYZE-FEEDBACK] Texto muito curto ou vazio, retornando padrão");
      return NextResponse.json({
        rating: 3,
        keyword: 'Atendimento',
        sector: 'Operações',
        problem: 'VAZIO',
        problem_detail: '',
        has_suggestion: false,
        suggestion_type: 'none',
        suggestion_summary: '',
        problems: [{
          keyword: 'Atendimento',
          sector: 'Operações', 
          problem: 'VAZIO',
          problem_detail: ''
        }],
        allProblems: [{
          keyword: 'Atendimento',
          sector: 'Operações', 
          problem: 'VAZIO',
          problem_detail: ''
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
      hasApiKey: !!apiKey,
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
            enum: ["none", "improvement_only", "improvement_with_criticism", "improvement_with_praise", "mixed_feedback"],
            description: "Tipo de sugestão: 'none'=sem sugestões, 'improvement_only'=apenas sugestão sem crítica, 'improvement_with_criticism'=sugestão por causa de problema, 'improvement_with_praise'=sugestão somada a elogio, 'mixed_feedback'=sugestão com múltiplos aspectos"
          },
          suggestion_summary: {
            type: "string",
            maxLength: 200,
            description: "Resumo EXCLUSIVAMENTE da sugestão de melhoria mencionada. NÃO inclua o problema, apenas a melhoria sugerida. Exemplos: 'Aumentar variedade de frutas no café', 'Colocar mais tomadas no quarto', 'Melhorar aquecimento da piscina'. Vazio se has_suggestion=false."
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
                  maxLength: 120,
                  description: "Descrição ESPECÍFICA do que exatamente aconteceu/não funciona. DIFERENTE do problem (categoria) e suggestion (melhoria). Exemplos: 'Cofre não respondia mesmo com senha correta', 'Saboneteira permaneceu vazia toda estadia', 'Garçom demorava 20+ min para atender pedidos'. Vazio apenas para elogios puros."
                }
              },
              required: ["keyword", "department", "problem"]
            }
          }
        },

        required: ["sentiment", "has_suggestion", "suggestion_type", "suggestion_summary", "issues"]

      }
    };

    const analysisPrompt = `Você é um auditor de reputação hoteleira com expertise em classificação precisa de feedbacks. O comentário pode estar EM QUALQUER IDIOMA; identifique internamente e traduza se necessário.

**🎯 MISSÃO CRÍTICA:** Analise TODO o comentário e identifique ATÉ 3 ASPECTOS DIFERENTES (problemas, elogios ou sugestões). Use análise semântica inteligente para detectar QUALQUER tipo de problema, crítica, falta, insatisfação OU ELOGIO mencionado. SEJA ASSERTIVO e CRIATIVO na classificação.

**⚠️ IMPORTANTE: ENTENDA A DIFERENÇA ENTRE OS CAMPOS:**

**🔍 PROBLEMA (problem):** Categoria padronizada do problema (ex: "Não Funciona", "Falta de Limpeza", "Demora no Atendimento", "VAZIO")
**📝 PROBLEM_DETAIL:** Descrição ESPECÍFICA e DETALHADA do que exatamente aconteceu (máx 120 chars)
**💡 SUGESTÃO:** Campo SEPARADO para sugestões de melhoria (suggestion_summary)

**EXEMPLOS DA DIFERENÇA:**
• Comentário: "Cofre não abria mesmo digitando senha correta"
  - problem: "Não Funciona" (categoria padrão)
  - problem_detail: "Cofre não respondia mesmo com senha correta digitada" (detalhe específico)
  - suggestion: "" (não há sugestão)

• Comentário: "Banheiro sujo, deveriam limpar melhor"  
  - problem: "Falta de Limpeza" (categoria padrão)
  - problem_detail: "Banheiro com sujeira visível e mal cheiroso" (detalhe específico)  
  - suggestion: "Melhorar frequência e qualidade da limpeza do banheiro" (sugestão específica)

**⚠️ IMPORTANTE: AUTONOMIA DA IA - VOCÊ TEM LIBERDADE TOTAL!**

🧠 **ANÁLISE SEMÂNTICA INTELIGENTE:** Você deve usar sua inteligência para classificar QUALQUER feedback, mesmo que não haja uma palavra exata no dicionário. Use análise semântica para entender o CONTEXTO e a INTENÇÃO do feedback.

🎯 **REGRAS DE AUTONOMIA:**
1. **SE NÃO ENCONTRAR PALAVRA EXATA:** Use sua inteligência para encontrar a categoria mais próxima
2. **ANÁLISE CONTEXTUAL:** Entenda sobre o que a pessoa está realmente falando
3. **SEJA CRIATIVO:** Não se limite apenas às palavras do prompt - use seu conhecimento sobre hotéis
4. **DEPARTAMENTO POR LÓGICA:** Se fala de comida = A&B, se fala de quebrado = Manutenção, etc.

**EXEMPLOS DE AUTONOMIA INTELIGENTE:**
• "A comida estava horrível" → A&B - Alimentos (mesmo sem palavra exata "comida")  
• "O atendente do restaurante foi mal educado" → A&B - Serviço (análise semântica)
• "Banheiro fedorento" → Limpeza - Banheiro (contexto de higiene)
• "Controle da TV não funcionava" → Tecnologia - TV (lógica de equipamento)
• "Piscina estava gelada" → Piscina (contexto de lazer aquático)
• "Funcionário da limpeza muito educado" → Limpeza - Quarto (contexto operacional)
• "Demora para fazer o check-in" → Recepção - Serviço (processo hoteleiro)
• "Vista do quarto incrível" → Localização (contexto geográfico)
• "Estacionamento pequeno" → Estacionamento (infraestrutura)

🔍 **DETECÇÃO INTELIGENTE POR CONTEXTO:**

**A&B (Alimentos & Bebidas):** SEMPRE que mencionar:
- Qualquer comida, bebida, refeição, sabor, tempero
- Garçom, garçonete, restaurante, bar, cardápio  
- Café da manhã, almoço, janta, lanche, buffet
- Fome, sede, variedade de comida, preços de comida
- Chef, cozinha, pratos, gastronomia

**Limpeza:** SEMPRE que mencionar:
- Sujo, limpo, higiene, cheiro, odor
- Toalhas, lençóis, travesseiros (quando sobre limpeza)
- Banheiro sujo, quarto desarrumado
- Produtos de limpeza, saboneteira, papel higiênico

**Manutenção:** SEMPRE que mencionar:
- Quebrado, não funciona, defeito, conserto
- Ar-condicionado, chuveiro, torneira, cofre, luzes
- Vazamento, goteira, porta, janela, fechadura
- Equipamentos com problema técnico

**Lazer:** SEMPRE que mencionar:  
- Piscina, academia, spa, atividades, recreação
- Diversão, entretenimento, bingo, karaoke
- Monitores, animação, tio/tia da recreação
- Estrutura de lazer, brinquedos, jogos

**TI/Tecnologia:** SEMPRE que mencionar:
- Wi-fi, internet, conexão, sinal
- TV, televisão, canais, controle remoto
- Streaming, Netflix, apps, tecnologia

**Recepção:** SEMPRE que mencionar:
- Check-in, check-out, recepção, recepcionista
- Chegada, saída, chaves, cadastro
- Front desk, balcão, atendimento inicial

**🚀 SEJA ASSERTIVO E INTELIGENTE:**
- Use sua experiência sobre hotéis e hospitalidade
- Pense como um auditor experiente de reputação hoteleira
- Classifique TUDO, mesmo termos incomuns ou gírias
- Priorize sempre a especificidade sobre a generalização
- Se tiver dúvida entre duas categorias, escolha a mais específica

**REGRAS FUNDAMENTAIS - BASEADAS EM CORREÇÕES DA CLIENTE:**

**1. MAPEAMENTO A&B (Alimentos & Bebidas) - PRIORIDADE MÁXIMA:**
- SEMPRE que mencionar GARÇOM/GARÇONETE/WAITER/WAITRESS → "A&B - Serviço"
- SEMPRE que mencionar BAR/RESTAURANTE/RESTAURANT → "A&B - Serviço"  
- SEMPRE que mencionar CAFÉ DA MANHÃ/BREAKFAST → "A&B - Café da manhã"
- SEMPRE que mencionar ALMOÇO/LUNCH/JANTA/JANTAR/DINNER → "A&B - Almoço"
- SEMPRE que mencionar FALTA DE COMIDA/SEM VARIEDADE → "A&B - Variedade"
- SEMPRE que mencionar PREÇO ALTO DE COMIDA/BEBIDA → "A&B - Preço"
- SEMPRE que mencionar QUALIDADE/SABOR DA COMIDA → "A&B - Alimentos"
- SEMPRE que mencionar CARDÁPIO/MENU/GASTRONOMIA → "A&B - Gastronomia"

**2. MANUTENÇÃO vs PRODUTO vs LIMPEZA:**
- QUEBRADO/NÃO FUNCIONA → Manutenção (ex: "Cofre não funcionava" → Manutenção - Quarto)
- QUALIDADE DO ITEM FÍSICO → Produto (ex: "Cobertas muito finas" → Enxoval/Produto)
- FALTA DE LIMPEZA/SUJO → Limpeza (ex: "Saboneteira vazia" → Limpeza - Banheiro)
- FRIGOBAR → sempre Produto (mesmo se for preço)

**3. LOCALIZAÇÃO ESPECÍFICA - MUITO IMPORTANTE:**
- Se menciona BANHEIRO + problema → palavra-chave com "Banheiro"
- Se menciona QUARTO + problema → palavra-chave com "Quarto"
- "Lixeira quebrada" → Manutenção - Banheiro (não Quarto)
- "Box do chuveiro" → Manutenção - Banheiro
- "Porta da varanda" → Manutenção - Quarto

**4. LAZER E RECREAÇÃO:**
- PISCINA → sempre "Piscina" (mesmo se aquecida)
- BINGO/KARAOKE/FOGUEIRA/ATIVIDADES → "Lazer - Atividades de Lazer"
- TIO/TIA DA RECREAÇÃO/MONITORES → "Lazer - Serviço"
- ACADEMIA → "Academia" (departamento próprio)
- HIDROMASSAGEM → "Lazer - Estrutura"
- SPA/MASSAGEM → "Spa"

**5. PESSOAS E FUNCIONÁRIOS - REGRA DA CLIENTE:**
- Se conseguir identificar o DEPARTAMENTO da pessoa → usar departamento específico
- Ex: "Yasmin garçonete" → A&B - Serviço
- Ex: "João da recepção" → Recepção - Serviço  
- Se NÃO conseguir identificar departamento → "Atendimento"
- CONCIERGE → se uma pessoa específica, use "Concierge"; se várias pessoas, use "Atendimento"

**6. PROBLEMAS PADRONIZADOS - SEJA ESPECÍFICO:**
Use problemas específicos da lista oficial:
- "não funciona" → "Não Funciona"
- "funciona mal" → "Funciona Mal"
- "quebrado" → "Quebrado"
- "demora" → "Demora no Atendimento"  
- "sujo" → "Falta de Limpeza"
- "caro" → "Preço Alto"
- "sem variedade" → "Falta de Variedade"
- "pequeno" → "Espaço Insuficiente"
- "barulho" → "Ruído Excessivo"
- "frio/quente" → "Temperatura Inadequada"

**7. MÚLTIPLOS ASPECTOS OBRIGATÓRIO:**
Se o comentário menciona VÁRIAS áreas, você DEVE criar múltiplos issues:
- "Café da manhã sem variedade e wi-fi ruim" → 2 issues separados
- "Garçom atencioso e piscina limpa" → 2 issues separados
- "Restaurante bom mas quarto sujo" → 2 issues separados

**8. DETECÇÃO DE SUGESTÕES - CAMPO SEPARADO:**
has_suggestion: true se contém QUALQUER das palavras:
- "poderia", "deveria", "seria bom", "sugiro", "recomendo", "melhoraria", "gostaria que"
- "falta", "faltou", "não tem", "senti falta", "deveria ter", "precisava ter"
- "se tivesse", "seria melhor com", "tendo mais", "com mais"
- "uma sugestão", "minha dica", "penso que", "acho que deveria"

**suggestion_summary:** Resuma APENAS a sugestão mencionada (máx 200 chars):
- ✅ "Aumentar variedade de frutas no café da manhã"
- ✅ "Colocar mais tomadas próximas à cama"
- ✅ "Melhorar aquecimento da piscina"
- ❌ "Cliente reclamou da piscina" (isso não é sugestão)

**9. ELOGIOS (problem="VAZIO"):**
Para elogios puros, escolha SEMPRE a keyword da área específica mencionada:
- Não use "Atendimento" genérico se puder ser mais específico
- "Equipe do restaurante excelente" → A&B - Serviço (não Atendimento)
- "Piscina incrível" → Piscina (não Atendimento)
- "Check-in rápido e eficiente" → Check-in - Atendimento Recepção (não Atendimento genérico)
- "Checkout feito por Fábio foi excelente" → Check-out - Atendimento Recepção (não Atendimento genérico)
- "Recepcionista muito gentil" → Recepção - Serviço (não Atendimento genérico)

**10. PROBLEM_DETAIL - SEJA DESCRITIVO E ESPECÍFICO:**
Crie detalhes úteis para gestão hoteleira (máx 120 chars):
- ✅ "Cofre do quarto não respondia mesmo com senha correta digitada"
- ✅ "Saboneteira do banheiro permaneceu vazia durante toda estadia" 
- ✅ "Garçons demoravam mais de 20 minutos para atender mesa"
- ✅ "Wi-fi caia constantemente impossibilitando trabalho remoto"
- ✅ "Cobertas muito finas não aqueciam adequadamente durante noite"
- ❌ "Problema com cofre" (muito genérico)
- ❌ "Limpeza ruim" (muito genérico)

**EXEMPLOS DE CLASSIFICAÇÃO CORRETA COMPLETA:**

• "Saboneteira da pia ficou vazia todo o tempo"
  → keyword: "Limpeza - Banheiro", problem: "Falta de Disponibilidade", 
     problem_detail: "Saboneteira permaneceu vazia durante toda estadia"

• "Yasmin garçonete foi excelente, muito atenciosa" 
  → keyword: "A&B - Serviço", problem: "VAZIO", 
     problem_detail: ""

• "Frigobar com preços muito altos, deveria ser mais barato"
  → keyword: "Frigobar", problem: "Preço Alto", 
     problem_detail: "Preços do frigobar considerados excessivos pelo hóspede",
     has_suggestion: true, suggestion_summary: "Reduzir preços dos itens do frigobar"

• "Falta de carne seca no café da manhã, sugiro adicionar"
  → keyword: "A&B - Variedade", problem: "Falta de Variedade", 
     problem_detail: "Ausência de carne seca no buffet matinal",
     has_suggestion: true, suggestion_summary: "Incluir carne seca no café da manhã"

• "Chuveiro difícil de abrir sem se molhar com água fria"
  → keyword: "Manutenção - Banheiro", problem: "Funciona Mal", 
     problem_detail: "Chuveiro espirra água fria antes de regular temperatura"

• "Cobertas muito finas e pequenas para o quarto"
  → keyword: "Enxoval", problem: "Qualidade Baixa", 
     problem_detail: "Cobertas inadequadas em tamanho e espessura"

• "Almoço sem variedade, sempre as mesmas opções"
  → keyword: "A&B - Almoço", problem: "Falta de Variedade", 
     problem_detail: "Cardápio do almoço repetitivo com poucas opções"

• "Jantar excelente, comida muito saborosa"
  → keyword: "A&B - Almoço", problem: "VAZIO",
     problem_detail: ""

• "Wi-fi sempre cai durante reuniões, sugiro melhorar a rede"
  → keyword: "Tecnologia - Wi-fi", problem: "Não Funciona",
     problem_detail: "Conexão wi-fi instável durante uso profissional",
     has_suggestion: true, suggestion_type: "improvement_with_criticism",
     suggestion_summary: "Melhorar estabilidade da rede wi-fi"

• "Seria incrível se tivessem jacuzzi na área da piscina"
  → keyword: "Lazer - Estrutura", problem: "VAZIO", 
     problem_detail: "",
     has_suggestion: true, suggestion_type: "improvement_only",
     suggestion_summary: "Instalar jacuzzi na área da piscina"

**REGRAS DE OURO:**
1. **PROBLEMA**: categoria padronizada oficial
2. **PROBLEM_DETAIL**: descrição específica do que aconteceu  
3. **SUGESTÃO**: separada, apenas se houver indicação clara de melhoria
4. **MÚLTIPLOS ISSUES**: sempre que houver várias áreas mencionadas
5. **ESPECIFICIDADE**: sempre prefira classificação mais específica possível

**AUTONOMIA TOTAL:** Você tem liberdade para interpretar semanticamente e criar classificações precisas. Priorize SEMPRE a especificidade sobre a generalização.

Comentário para analisar: "${finalText}"`;

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
        { keywords: ['restaurante', 'heny', 'juliete', 'jane'], result: { keyword: 'A&B - Serviço', sector: 'A&B', problem: 'VAZIO' }},
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
      suggestionType = 'improvement_only';
      
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
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
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