// Endpoint para pré-gerar embeddings uma única vez
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateBatchEmbeddings } from '@/lib/embeddings-service';
import { generateSlug } from '@/lib/taxonomy-service';
import { calculateTaxonomyVersion, markEmbeddingsUpdated, updateTaxonomyVersion } from '@/lib/taxonomy-version-manager';

const BATCH_SIZE = 20; // Processar 20 por vez

/**
 * Dicionário de CONTEXTOS SEMÂNTICOS CONCEITUAIS para embeddings
 * 
 * ABORDAGEM: Enriquecer com CONCEITOS e SIGNIFICADOS, não palavras literais
 * OBJETIVO: IA entende o SENTIDO da keyword, não faz match de palavras
 * 
 * Exemplo:
 * - ❌ ERRADO: "Limpeza - Banheiro" → "banheiro sujo" (palavra literal)
 * - ✅ CERTO: "Limpeza - Banheiro" → "higienização, arrumação, organização de ambiente sanitário"
 * 
 * Baseado em: scripts/organize-keywords-by-department.ts (48 keywords reais)
 */
const SEMANTIC_CONTEXT_DICT: Record<string, string[]> = {
  // A&B (6 keywords) - Conceitos de alimentação e bebidas
  "A&B - Café da manhã": ["primeira refeição do dia", "desjejum matinal", "buffet breakfast"],
  "A&B - Jantar": ["refeição noturna", "dinner service", "gastronomia da noite"],
  "A&B - Almoço": ["refeição do meio-dia", "almoço executivo", "lunch service"],
  "A&B - Serviço": ["atendimento de restaurante e bar", "qualidade do serviço gastronômico", "hospitalidade alimentação"],
  "A&B - Gastronomia": ["qualidade culinária", "sabor das refeições", "experiência gastronômica"],
  "A&B - Room Service": ["serviço de refeições no apartamento", "pedidos in-room"],
  
  // Limpeza/Governança (6 keywords) - Conceitos de higiene e organização
  "Limpeza - Banheiro": ["higienização de ambiente sanitário", "limpeza e organização de banheiros", "condições de higiene"],
  "Limpeza - Quarto": ["arrumação de acomodações", "higienização de apartamentos", "organização do espaço"],
  "Limpeza - Áreas sociais": ["higiene de espaços comuns", "limpeza de áreas públicas do hotel", "manutenção de zonas sociais"],
  "Limpeza - Enxoval": ["condições de roupas de cama e banho", "qualidade e higiene de têxteis", "troca e reposição de enxoval"],
  "Limpeza - Amenities": ["reposição de produtos de higiene", "disponibilidade de amenidades", "itens de cortesia"],
  "Limpeza - Frigobar": ["limpeza e organização de frigobar", "reposição de bebidas e snacks"],
  
  // Manutenção (6 keywords) - Conceitos de reparos e funcionamento
  "Manutenção - Ar-condicionado": ["funcionamento de sistema de climatização", "controle térmico", "regulação de temperatura"],
  "Manutenção - Banheiro": ["reparos hidráulicos", "funcionamento de instalações sanitárias", "problemas técnicos em banheiros"],
  "Manutenção - Instalações": ["conservação da estrutura física", "estado geral das instalações", "manutenção predial"],
  "Manutenção - Quarto": ["reparos em acomodações", "funcionamento de equipamentos do quarto", "defeitos estruturais"],
  "Manutenção - Elevador": ["funcionamento de elevadores", "sistema de transporte vertical"],
  "Manutenção - Jardinagem": ["manutenção de áreas verdes", "paisagismo e jardins", "conservação externa"],
  
  // Recepção (4 keywords) - Conceitos de recepção e entrada/saída
  "Recepção - Estacionamento": ["disponibilidade de vagas", "serviço de estacionamento", "facilidade de estacionar"],
  "Recepção - Check-in": ["processo de entrada", "chegada ao hotel", "procedimentos de registro"],
  "Recepção - Check-out": ["processo de saída", "finalização da hospedagem", "procedimentos de partida"],
  "Recepção - Serviço": ["atendimento de recepcionistas", "qualidade do front desk", "hospitalidade na chegada"],
  
  // TI/Tecnologia (2 keywords) - Conceitos de tecnologia
  "Tecnologia - TV": ["sistema de televisão", "qualidade de canais", "funcionamento de entretenimento audiovisual"],
  "Tecnologia - Wi-fi": ["conectividade de internet", "qualidade de rede sem fio", "estabilidade de conexão"],
  
  // Lazer (7 keywords) - Conceitos de entretenimento e bem-estar
  "Lazer - Estrutura": ["infraestrutura de entretenimento", "qualidade das instalações de lazer", "espaços recreativos"],
  "Lazer - Variedade": ["diversidade de atividades recreativas", "opções de entretenimento", "programação disponível"],
  "Lazer - Serviço": ["atendimento em áreas de lazer", "qualidade do serviço recreativo", "hospitalidade em entretenimento"],
  "Lazer - Atividades de Lazer": ["programação de entretenimento", "atividades recreativas oferecidas", "opções de diversão"],
  "Lazer - Piscina": ["área aquática", "espaço de natação", "infraestrutura de piscina"],
  "Lazer - Spa": ["serviços de bem-estar", "área de relaxamento", "tratamentos de beleza e massagem"],
  "Lazer - Academia": ["espaço fitness", "equipamentos de ginástica", "área de exercícios"],
  
  // Produto (9 keywords) - Conceitos MUITO ESPECÍFICOS para evitar confusão
  "Produto - Transfer": ["serviço de transporte aeroporto-hotel", "traslado entre destinos", "locomoção de chegada e partida"],
  "Produto - Acessibilidade": ["infraestrutura para pessoas com deficiência", "adaptações para mobilidade reduzida", "facilidades para cadeirantes"],
  "Produto - Custo-benefício": ["relação entre preço pago e valor recebido", "justificativa do investimento na hospedagem", "percepção de valor pelo custo"],
  "Produto - Localização": ["posicionamento geográfico do hotel", "distância de pontos turísticos", "conveniência de acesso ao entorno"],
  "Produto - Vista": ["paisagem visível das acomodações", "cenário externo observado", "panorama das janelas"],
  "Produto - Experiência": ["avaliação completa e holística da estadia", "impressão geral sobre TODA a hospedagem no hotel", "sentimento global sobre TODOS os aspectos combinados"],
  "Produto - Modernização": ["grau de atualização das instalações físicas", "estado de reforma do estabelecimento", "contemporaneidade da infraestrutura"],
  "Produto - All Inclusive": ["modalidade de pensão completa com tudo incluído", "sistema all-inclusive de hospedagem", "pacote com todas refeições e bebidas"],
  "Produto - Isolamento Acustico": ["qualidade de proteção contra ruídos externos", "eficácia do isolamento sonoro", "capacidade de bloqueio acústico"],
  
  // Operações (4 keywords) - Conceitos operacionais
  "Operações - Atendimento": ["qualidade geral do atendimento", "cordialidade da equipe", "prestatividade do staff"],
  "Operações - Cartão de acesso": ["sistema de chaves eletrônicas", "cartões de entrada", "mecanismo de acesso"],
  "Operações - Acesso ao quarto": ["facilidade de entrada na acomodação", "sistema de abertura de portas", "controle de acesso"],
  "Operações - Consumo Extra": ["cobranças adicionais", "taxas extras", "gastos não incluídos na diária"],
  
  // Corporativo (3 keywords) - Conceitos administrativos
  "Corporativo - Marketing": ["comunicação institucional", "divulgação do hotel", "estratégias promocionais"],
  "Corporativo - Reservas": ["sistema de agendamento", "processo de booking", "gestão de reservas"],
  "Corporativo - Financeiro": ["aspectos monetários", "cobranças e pagamentos", "gestão financeira da estadia"],
  
  // EG (1 keyword) - Conceito de experiência do hóspede
  "EG - Abordagem": ["relacionamento com cliente", "experiência de hospitalidade", "jornada do hóspede"],
};

/**
 * Dicionário de CONTEXTOS CONCEITUAIS para Problems
 * 
 * ABORDAGEM: Descrever o SIGNIFICADO do problema, não sintomas literais
 * OBJETIVO: IA entende a NATUREZA do problema, não palavras específicas
 * 
 * Exemplo:
 * - ❌ ERRADO: "Demora no Atendimento" → "demorou muito, esperamos horas"
 * - ✅ CERTO: "Demora no Atendimento" → "lentidão no serviço, tempo de espera excessivo"
 */
const PROBLEM_CONTEXT_DICT: Record<string, string[]> = {
  "Demora no Atendimento": ["lentidão no serviço", "tempo de espera excessivo", "atraso na prestação de serviço"],
  "Falta de Limpeza": ["condições inadequadas de higiene", "ausência de arrumação", "estado de desorganização"],
  "Equipamento com Falha": ["mau funcionamento de aparelhos", "defeitos técnicos", "indisponibilidade por problemas mecânicos"],
  "Qualidade da Refeição Abaixo do Esperado": ["baixa qualidade gastronômica", "insatisfação com sabor ou preparo", "deficiências culinárias"],
  "Wi-Fi Instável": ["problemas de conectividade", "instabilidade de rede", "falhas na conexão de internet"],
  "Preço Alto": ["valor percebido como excessivo", "desproporção custo-benefício", "insatisfação com precificação"],
  "Ruído Excessivo": ["poluição sonora", "distúrbios acústicos", "falta de silêncio"],
  "Falta de Variedade": ["limitação de opções", "ausência de diversidade", "escassez de alternativas"],
  "Espaço Insuficiente": ["dimensões inadequadas", "falta de amplitude", "restrição de área"],
  "Temperatura Inadequada": ["desconforto térmico", "climatização inadequada", "problemas de regulação térmica"],
  "Mau Cheiro": ["odores desagradáveis", "problemas olfativos", "falta de ventilação ou higiene aromática"],
  "Atendimento Grosseiro": ["falta de cordialidade", "tratamento indelicado", "ausência de hospitalidade"],
  "Informações Incorretas": ["dados imprecisos fornecidos", "comunicação equivocada", "falta de clareza informacional"],
  "Cobrança Indevida": ["erro em faturamento", "taxas não justificadas", "problemas financeiros na conta"],
  "Falta de Manutenção": ["estado de conservação precário", "desgaste visível", "necessidade de reparos"],
};

/**
 * Enriquece uma keyword com contexto semântico para gerar embeddings mais precisos
 */
function enrichKeywordWithContext(keyword: string): string {
  const contexts = SEMANTIC_CONTEXT_DICT[keyword];
  
  if (contexts && contexts.length > 0) {
    // Retorna: "Palavra-chave original. Contextos: variação1, variação2, variação3"
    return `${keyword}. Contextos: ${contexts.join(", ")}`;
  }
  
  // Se não tem contextos específicos, retorna a keyword original
  return keyword;
}

/**
 * Enriquece um problem com contexto semântico para gerar embeddings mais precisos
 */
function enrichProblemWithContext(problem: string): string {
  const contexts = PROBLEM_CONTEXT_DICT[problem];
  
  if (contexts && contexts.length > 0) {
    // Retorna: "Problema original. Contextos: variação1, variação2, variação3"
    return `${problem}. Contextos: ${contexts.join(", ")}`;
  }
  
  // Se não tem contextos específicos, retorna o problem original
  return problem;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, force = false, progressCallback } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key é obrigatória' },
        { status: 400 }
      );
    }

    console.log('🚀 Iniciando pré-geração de embeddings...');

    // Função helper para reportar progresso
    const reportProgress = (step: string, progress: number, details?: any) => {
      console.log(`📊 ${step}: ${progress}%`, details || '');
      // Em uma implementação futura, aqui poderia enviar via WebSocket ou SSE
    };

    // Carregar dados atuais
    const docRef = doc(db, 'dynamic-lists', 'global-lists');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    // Verificar se já foram gerados
    if (!force && data.keywords_with_embeddings && data.problems_with_embeddings) {
      return NextResponse.json({
        success: true,
        message: 'Embeddings já foram gerados. Use force=true para regenerar.',
        existing: {
          keywords: data.keywords_with_embeddings?.length || 0,
          problems: data.problems_with_embeddings?.length || 0,
          generated_at: data.embeddings_generated_at
        }
      });
    }

    // Processar keywords - pode ser MAP (por departamento) ou ARRAY (flat)
    let keywordsArray: string[] = [];
    
    if (typeof data.keywords === 'object' && !Array.isArray(data.keywords)) {
      // MAP por departamento - converter para array flat
      console.log('📋 Keywords em formato MAP, convertendo para array...');
      keywordsArray = Object.values(data.keywords).flat() as string[];
    } else if (Array.isArray(data.keywords)) {
      // ARRAY flat
      keywordsArray = data.keywords;
    } else {
      return NextResponse.json({
        error: 'Estrutura de keywords não reconhecida'
      }, { status: 400 });
    }
    
    const problems = data.problems || [];
    const departments = data.departments || [];

    console.log(`📊 Processando: ${keywordsArray.length} keywords, ${problems.length} problems`);
    reportProgress('Iniciando processamento', 5, { keywords: keywordsArray.length, problems: problems.length });

    // Calcular versão atual da taxonomia
    const taxonomyVersion = calculateTaxonomyVersion({ keywords: data.keywords, problems, departments });
    console.log('📋 Versão da taxonomia:', taxonomyVersion.version);

    const startTime = Date.now();

    // Processar Keywords em batches
    console.log('🔄 Gerando embeddings para keywords com enriquecimento semântico...');
    reportProgress('Gerando embeddings para keywords', 10);

    // Enriquecer keywords com contexto semântico para embeddings mais precisos
    const keywordTexts = keywordsArray.map((kw: string) => {
      const enriched = enrichKeywordWithContext(kw);
      if (enriched !== kw) {
        console.log(`   ✨ Enriquecido: "${kw}" → "${enriched.substring(0, 100)}..."`);
      }
      return enriched;
    });
    const keywordEmbeddings = await generateBatchEmbeddings(keywordTexts, apiKey, BATCH_SIZE);

    reportProgress('Keywords processadas', 40, { processed: keywordEmbeddings.length });

    const keywordsWithEmbeddings = keywordsArray.map((kw: string, index: number) => {
      const parts = kw.split(' - ');
      const department = parts.length > 1 ? parts[0].trim() : 'Operacoes';

      return {
        id: `kw_${Date.now()}_${index}`,
        label: kw,
        department_id: department,
        slug: generateSlug(kw),
        aliases: [kw.toLowerCase()],
        description: `Keyword: ${kw}`,
        examples: [kw],
        embedding: keywordEmbeddings[index] || [],
        status: 'active',
        created_by: 'batch_generation',
        created_at: new Date(),
        updated_at: new Date(),
        version: 1
      };
    });

    // Processar Problems em batches
    console.log('🔄 Gerando embeddings para problems com enriquecimento semântico...');
    reportProgress('Gerando embeddings para problems', 50);

    // Enriquecer problems com contexto semântico para embeddings mais precisos
    const problemTexts = problems.map((prob: string) => {
      const enriched = enrichProblemWithContext(prob);
      if (enriched !== prob) {
        console.log(`   ✨ Enriquecido: "${prob}" → "${enriched.substring(0, 100)}..."`);
      }
      return enriched;
    });
    const problemEmbeddings = await generateBatchEmbeddings(problemTexts, apiKey, BATCH_SIZE);

    reportProgress('Problems processados', 70, { processed: problemEmbeddings.length });

    const problemsWithEmbeddings = problems.map((prob: string, index: number) => ({
      id: `pb_${Date.now()}_${index}`,
      label: prob,
      slug: generateSlug(prob),
      aliases: [prob.toLowerCase()],
      description: `Problem: ${prob}`,
      examples: [prob],
      embedding: problemEmbeddings[index] || [],
      status: 'active',
      category: 'Geral',
      severity: 'medium',
      applicable_departments: [],
      created_by: 'batch_generation',
      created_at: new Date(),
      updated_at: new Date(),
      version: 1
    }));

    // Salvar no Firebase em documentos separados para evitar limite de 1MB
    console.log('💾 Salvando embeddings no Firebase (estrutura otimizada)...');
    reportProgress('Salvando no Firebase', 80);

    // Salvar keywords em chunks de 50 para evitar limite de tamanho
    const keywordChunks = [];
    const CHUNK_SIZE = 50;
    for (let i = 0; i < keywordsWithEmbeddings.length; i += CHUNK_SIZE) {
      keywordChunks.push(keywordsWithEmbeddings.slice(i, i + CHUNK_SIZE));
    }

    // Salvar cada chunk de keywords
    for (let i = 0; i < keywordChunks.length; i++) {
      const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', `keywords_chunk_${i}`);
      await setDoc(chunkRef, {
        chunk_index: i,
        total_chunks: keywordChunks.length,
        keywords: keywordChunks[i],
        updated_at: new Date()
      });
    }

    // Salvar problems em chunks de 50
    const problemChunks = [];
    for (let i = 0; i < problemsWithEmbeddings.length; i += CHUNK_SIZE) {
      problemChunks.push(problemsWithEmbeddings.slice(i, i + CHUNK_SIZE));
    }

    // Salvar cada chunk de problems
    for (let i = 0; i < problemChunks.length; i++) {
      const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', `problems_chunk_${i}`);
      await setDoc(chunkRef, {
        chunk_index: i,
        total_chunks: problemChunks.length,
        problems: problemChunks[i],
        updated_at: new Date()
      });
    }

    // Atualizar documento principal apenas com metadados
    await updateDoc(docRef, {
      embeddings_generated_at: new Date(),
      embedding_model: 'text-embedding-3-small',
      embeddings_structure: 'chunked', // Flag para indicar nova estrutura
      semantic_enrichment: true, // Flag indicando embeddings com contexto semântico
      batch_generation_stats: {
        total_keywords: keywordsWithEmbeddings.length,
        total_problems: problemsWithEmbeddings.length,
        keyword_chunks: keywordChunks.length,
        problem_chunks: problemChunks.length,
        processing_time_ms: Date.now() - startTime,
        batch_size_used: BATCH_SIZE,
        enriched_with_semantic_context: true
      }
    });

    // Atualizar informações de versão da taxonomia
    await updateTaxonomyVersion({ keywords: data.keywords, problems, departments });
    await markEmbeddingsUpdated(taxonomyVersion.version);

    reportProgress('Versões atualizadas', 95);

    const processingTime = Date.now() - startTime;
    reportProgress('Concluído', 100, { processingTime });

    console.log('✅ Pré-geração concluída!');

    return NextResponse.json({
      success: true,
      message: 'Embeddings gerados com sucesso!',
      stats: {
        keywords_processed: keywordsWithEmbeddings.length,
        problems_processed: problemsWithEmbeddings.length,
        processing_time_ms: processingTime,
        processing_time_human: `${Math.round(processingTime / 1000)}s`,
        batch_size: BATCH_SIZE,
        total_api_calls: Math.ceil((keywordsArray.length + problems.length) / BATCH_SIZE)
      },
      next_steps: 'Os embeddings estão salvos. Análises futuras serão muito mais rápidas!'
    });

  } catch (error: any) {
    console.error('❌ Erro na pré-geração:', error);

    // Mensagens de erro mais amigáveis para usuários
    let userFriendlyMessage = 'Erro interno na geração de embeddings';

    if (error.message?.includes('API key')) {
      userFriendlyMessage = 'Chave de API inválida ou sem permissões. Verifique sua chave OpenAI.';
    } else if (error.message?.includes('quota')) {
      userFriendlyMessage = 'Cota da API OpenAI excedida. Tente novamente mais tarde ou verifique seu plano.';
    } else if (error.message?.includes('rate limit')) {
      userFriendlyMessage = 'Muitas requisições. Aguarde alguns minutos e tente novamente.';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      userFriendlyMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message?.includes('permission')) {
      userFriendlyMessage = 'Erro de permissão no Firebase. Contate o administrador.';
    }

    return NextResponse.json({
      success: false,
      error: userFriendlyMessage,
      technical_error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}