import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateBatchEmbeddings } from '@/lib/embeddings-service';
import { generateSlug } from '@/lib/taxonomy-service';
import { calculateTaxonomyVersion, markEmbeddingsUpdated, updateTaxonomyVersion } from '@/lib/taxonomy-version-manager';
import { KEYWORD_SEMANTIC_CONTEXT, generateEnrichedKeywordText } from '@/lib/semantic-enrichment';

const BATCH_SIZE = 20; // Processar 20 por vez


/**
 * Dicionário de CONTEXTOS CONCEITUAIS para Problems
 * 
 * ABORDAGEM: Descrever o SIGNIFICADO do problema, não sintomas literais
 * OBJETIVO: IA entende a NATUREZA do problema, não palavras específicas
 * 
 * IMPORTANTE: Todos os problems seguem formato "Departamento - Problema"
 * Exemplo: "A&B - Variedade limitada", "TI - Wi-fi não conecta"
 * 
 * Total: 191 problemas organizados por departamento
 */
const PROBLEM_CONTEXT_DICT: Record<string, string[]> = { 
  // A&B (31 problemas) ⭐ ATUALIZADO: +12 problems da cliente
  "A&B - Atendimento demorado": ["lentidão no serviço de alimentação", "tempo de espera excessivo para refeições", "garçons lentos", "demora nos pedidos", "atendimento demorado no restaurante", "garçons demoram muito", "serviço lento no bar", "demora para servir", "espera longa", "room service demorou para entregar"],
  "A&B - Atendimento insistente": ["abordagem excessiva da equipe", "falta de discrição no serviço"],
  "A&B - Café da manhã não disponível": ["ausência de serviço matinal", "indisponibilidade de desjejum"],
  "A&B - Falta de higiene": ["condições sanitárias inadequadas na área de alimentação", "ausência de limpeza"],
  "A&B - Falta de produto": ["ausência de itens no cardápio", "falta de opções disponíveis"],
  
  "A&B - Não disponível": ["serviço de alimentação indisponível", "restaurante fechado"],
  "A&B - Variedade limitada": ["poucas opções de cardápio", "falta de diversidade gastronômica"],
  "A&B - Falta de opções": ["menu com poucas opções", "cardápio limitado", "pouca variedade"],
  "A&B - Qualidade da comida": ["sabor inadequado", "preparo insatisfatório das refeições", "falta de tempero", "alimentos sem sabor", "comida sem frescor"],
  "A&B - Preço elevado": ["custo alto das refeições", "valor desproporcional"],
  
  
  "A&B - Atendimento ruim": ["qualidade insatisfatória do serviço", "falta de cordialidade", "garçons mal educados"],
  "A&B - Refeição fria": ["temperatura inadequada da comida", "pratos servidos frios"],
  "A&B - Bebidas limitadas": ["poucas opções de bebidas", "variedade restrita"],
  "A&B - Espaço pequeno": ["área de refeições insuficiente", "restaurante com pouca capacidade"],
  
  "A&B - Horário restrito": ["horários limitados de funcionamento", "pouca flexibilidade de horários"],
  // ⭐ NOVOS DA CLIENTE (12 problems):
  "A&B - Café da manhã repetitivo": ["café da manhã repetitivo", "mesmas opções todo dia", "falta de renovação no buffet matinal", "variedade limitada no café da manhã"],
  "A&B - Almoço repetitivo": ["poucas opções no almoço", "falta de diversidade no lunch", "almoço repetitivo"],
  "A&B - Jantar repetitivo": ["poucas opções no jantar", "falta de diversidade no dinner", "jantar repetitivo"],
  "A&B - Drinks insatisfatórios": ["bebidas ruins", "drinks de baixa qualidade", "coquetéis mal preparados"],
  "A&B - Atendimento pouco acolhedor": ["atendimento frio", "garçom pouco simpático", "falta de hospitalidade no restaurante"],
  "A&B - Utensílios em mau estado": ["talheres sujos", "pratos quebrados", "copos manchados", "utensílios mal conservados"],
  "A&B - Mise en place incompleto": ["mesa sem montagem adequada", "guardanapos faltando", "talheres incompletos", "pratos e copos ausentes", "arrumação de mesa incompleta"],
  "A&B - Reposição do mise en place": ["falta reposição de itens", "buffet vazio", "demora na reposição"],

  // Corporativo (7 problemas)
  "Corporativo - Atendimento demorado": ["lentidão em processos administrativos", "tempo excessivo em serviços corporativos"],
  "Corporativo - Cobrança indevida": ["erro em faturamento", "taxas não justificadas"],
  "Corporativo - Informação incorreta": ["dados imprecisos fornecidos", "comunicação equivocada"],
  "Corporativo - Falta de comunicação": ["ausência de informações", "comunicação inadequada"],
  "Corporativo - Processo lento": ["demora em procedimentos administrativos", "burocracia excessiva"],
  "Corporativo - Erro no sistema": ["falha nos sistemas corporativos", "problemas técnicos administrativos"],
  "Corporativo - Atendimento ruim": ["qualidade insatisfatória em serviços corporativos", "falta de profissionalismo"],

  // EG - Experiência do Hóspede (6 problemas)
  "EG - Atendimento insistente": ["abordagem excessiva da equipe", "falta de privacidade"],
  "EG - Experiência ruim": ["impressão negativa geral", "insatisfação com a estadia"],
  "EG - Falta de atenção": ["ausência de cuidado com o hóspede", "negligência no atendimento"],
  "EG - Serviço impessoal": ["atendimento sem personalização", "falta de hospitalidade genuína"],
  "EG - Expectativa não atendida": ["promessas não cumpridas", "experiência abaixo do esperado"],

  // Governança (32 problemas) - APENAS limpeza, higiene e amenities ⭐ ATUALIZADO: +6 problems da cliente
  "Governança - Falta de limpeza no hotel": ["condições inadequadas de higiene", "ausência de arrumação"],
  "Governança - Falta de limpeza no banheiro": ["banheiro sujo", "higienização inadequada do sanitário"],
  "Governança - Falta de limpeza no quarto": ["quarto mal arrumado", "higienização insuficiente"],
  "Governança - Roupa de cama suja": ["lençóis com manchas", "roupa de cama não trocada", "cobertor sujo", "colcha suja", "lençol manchado"],
  "Governança - Toalhas sujas": ["toalhas manchadas", "falta de troca de toalhas", "toalhas velhas", "toalhas desgastadas"],
  "Governança - Cheiro ruim": ["odor desagradável no quarto", "falta de ventilação"],
  "Governança - Poeira": ["acúmulo de poeira", "limpeza superficial"],
  "Governança - Mofo": ["presença de fungos", "umidade excessiva causando mofo", "odor de mofo", "manchas de mofo"],
  
  "Governança - Falta de amenities": ["ausência de produtos de higiene", "amenities não repostos", "ferro de passar indisponível", "não emprestaram ferro"],
  "Governança - Falta de troca": ["ausência de troca diária", "serviço de arrumação não realizado"],
  "Governança - Sujeira visível": ["falta de limpeza aparente", "sujeira não removida"],
  "Governança - Banheiro com cabelo": ["cabelos não removidos", "limpeza superficial do banheiro"],
  "Governança - Lixo não recolhido": ["lixeiras não esvaziadas", "resíduos acumulados"],
  "Governança - Chão sujo": ["piso mal limpo", "sujeira no chão"],
  "Governança - Espelho sujo": ["espelho com manchas", "falta de limpeza em espelhos"],
  "Governança - Tapete sujo": ["tapete manchado", "carpete mal aspirado"],
  "Governança - Cortina suja": ["cortinas com poeira", "tecidos mal conservados"],
  "Governança - Frigobar sujo": ["frigobar mal higienizado", "interior do frigobar com sujeira"],
  "Governança - Roupão sujo": ["roupão manchado", "roupão não trocado"],
  "Governança - Travesseiro sujo": ["travesseiro com manchas", "fronhas sujas"],
  "Governança - Janela suja": ["vidros sujos", "janelas mal limpas"],
  "Governança - Varanda suja": ["área externa suja", "varanda mal higienizada"],
  // ⭐ NOVOS DA CLIENTE (6 problems):
  "Governança - Falta de secador": ["secador não disponível", "ausência de secador de cabelo", "falta secador no banheiro"],
  "Governança - Qualidade dos amenities insatisfatória": ["amenities de baixa qualidade", "produtos ruins", "shampoo ruim"],
  "Governança - Falta de toalhas": ["toalhas insuficientes", "falta de toalhas limpas", "ausência de toalhas"],
  "Governança - Falta de cobertas": ["cobertas insuficientes", "falta de cobertores", "frio no quarto sem coberta"],
  "Governança - Limpeza realizada sem permissão": ["camareira entrou sem avisar", "limpeza invadiu privacidade", "arrumação sem consentimento"],
  "Governança - Academia Suja": ["academia suja", "sala de musculação mal higienizada", "equipamentos de ginástica sujos"],

  // Lazer (15 problemas) - APENAS serviço, disponibilidade e experiência (sem quebrados/falhas) ⭐ ATUALIZADO: +3 problems da cliente
  "Lazer - Falta de opções": ["poucas atividades disponíveis", "variedade limitada de lazer"],
  "Lazer - Não disponível": ["área de lazer fechada", "serviço indisponível"],
  "Lazer - Piscina suja": ["água turva", "falta de limpeza na piscina"],
  "Lazer - Superlotado": ["área de lazer muito cheia", "excesso de pessoas"],
  "Lazer - Spa indisponível": ["serviços de spa não disponíveis", "área de wellness fechada"],
  "Lazer - Atividades canceladas": ["programação não realizada", "eventos cancelados"],
  "Lazer - Área pequena": ["espaço de lazer insuficiente", "área reduzida"],
  "Lazer - Falta de toalhas": ["ausência de toalhas na piscina", "toalhas não disponíveis"],
  "Lazer - Horário restrito": ["horários limitados de funcionamento", "pouca flexibilidade"],
  "Lazer - Espreguiçadeiras sujas": ["cadeiras mal limpas", "mobiliário sujo"],
  "Lazer - Sem guarda-vidas": ["falta de segurança na piscina", "ausência de salva-vidas"],
  "Lazer - Barulho excessivo": ["poluição sonora na área de lazer", "falta de tranquilidade"],
  // ⭐ NOVOS DA CLIENTE (3 problems):
  "Lazer - Academia com Equipamentos insuficientes": ["poucos aparelhos na academia", "falta de equipamentos de ginástica", "academia mal equipada"],
  "Lazer - Academia com Necessidade de atualização": ["academia com equipamentos antigos", "aparelhos desatualizados", "precisa modernizar academia"],
  "Lazer - Academia com Espaço limitado": ["academia pequena", "espaço reduzido para treino", "sala de musculação apertada"],

  // Manutenção (56 problemas) - TODOS os problemas com falhas, quebrados, defeitos ⭐ ATUALIZADO: +8 problems da cliente
  "Manutenção - Ar-condicionado com falha": ["climatização não funciona", "ar-condicionado quebrado"],
  "Manutenção - Chuveiro com falha": ["chuveiro não funciona", "problemas com água quente"],
  "Manutenção - Elevador com falha": ["elevador quebrado", "mau funcionamento do elevador"],
  "Manutenção - Equipamento com falha": ["aparelhos não funcionam", "defeitos em equipamentos"],
  "Manutenção - Falta de manutenção": ["estado de conservação precário", "desgaste visível", "manutenção não realizada", "revisão pendente"],
  "Manutenção - Infiltração": ["vazamento de água", "umidade nas paredes"],
  "Manutenção - Porta com falha": ["porta não fecha", "problemas na fechadura"],
  "Manutenção - Tomada com falha": ["tomadas não funcionam", "problemas elétricos"],
  "Manutenção - TV com falha": ["televisão quebrada", "TV não liga"],
  "Manutenção - Vazamento": ["escape de água", "canos com vazamento"],
  "Manutenção - Janela com falha": ["janela não abre/fecha", "vidros quebrados"],
  "Manutenção - Fechadura quebrada": ["porta não tranca", "sistema de fechamento com defeito"],
  "Manutenção - Iluminação ruim": ["lâmpadas queimadas", "luz insuficiente"],
  "Manutenção - Cortina quebrada": ["cortina não funciona", "mecanismo de abertura com defeito", "cortineiro quebrado", "trilho da cortina com problema"],
  "Manutenção - Frigobar com falha": ["frigobar não gela", "refrigeração não funciona"],
  "Manutenção - Descarga com falha": ["descarga não funciona", "problemas no vaso sanitário"],
  "Manutenção - Pia entupida": ["escoamento lento", "pia não drena"],
  "Manutenção - Box quebrado": ["porta do box com problemas", "vidro trincado"],
  "Manutenção - Armário quebrado": ["portas de armário soltas", "gavetas com defeito"],
  "Manutenção - Cama quebrada": ["estrutura da cama com defeito", "colchão com problema"],
  "Manutenção - Cadeira quebrada": ["mobiliário danificado", "assento com defeito"],
  "Manutenção - Mesa quebrada": ["mesa instável", "móvel danificado"],
  "Manutenção - Espelho quebrado": ["espelho trincado", "vidro danificado"],
  "Manutenção - Pintura ruim": ["paredes descascadas", "pintura desgastada"],
  "Manutenção - Piso danificado": ["chão com problemas", "revestimento solto"],
  "Manutenção - Teto com problemas": ["infiltração no teto", "reboco caindo"],
  "Manutenção - Varanda com problemas": ["área externa com defeitos", "piso da varanda danificado"],
  "Manutenção - Persiana quebrada": ["persiana não abre/fecha", "mecanismo com defeito"],
  "Manutenção - Ventilador com falha": ["ventilador não funciona", "ventilação inadequada"],
  "Manutenção - Aquecedor com falha": ["aquecimento não funciona", "equipamento térmico quebrado"],
  "Manutenção - Cofre com falha": ["cofre não abre/fecha", "sistema de segurança com defeito"],
  "Manutenção - Telefone com falha": ["telefone não funciona", "linha telefônica com problema"],
  "Manutenção - Campainha quebrada": ["campainha não toca", "sistema de chamada com defeito"],
  "Manutenção - Maçaneta solta": ["maçaneta frouxa", "mecanismo de abertura com problema"],
  "Manutenção - Ralo entupido": ["escoamento bloqueado", "drenagem não funciona"],
  "Manutenção - Umidade": ["excesso de umidade", "ambiente úmido"],
  // Movidos de Lazer para Manutenção (equipamentos quebrados/com falha)
  "Manutenção - Equipamento de lazer com falha": ["aparelhos quebrados na área de lazer", "equipamentos recreativos não funcionais", "falta de manutenção nas áreas de lazer"],
  "Manutenção - Academia com equipamentos ruins": ["aparelhos de ginástica quebrados", "academia mal equipada"],
  "Manutenção - Piscina fria": ["temperatura inadequada da água", "aquecimento da piscina insuficiente"],
  // Movidos de TI para Manutenção (equipamentos tecnológicos quebrados/com falha)
  "Manutenção - Falta de tomada USB": ["ausência de pontos USB", "sem carregamento USB"],
  // Movido de Operações para Manutenção (sistema eletrônico com falha)
  "Manutenção - Cartão de acesso com falha": ["chave eletrônica não funciona", "problemas com cartão"],
  // ⭐ NOVOS DA CLIENTE (8 problems):
  "Manutenção - Chuveirinho inoperante": ["ducha higiênica quebrada", "chuveirinho não funciona", "bidê não funciona"],
  "Manutenção - Ducha entupida": ["chuveiro com jato fraco", "ducha entupida", "furos bloqueados no chuveiro"],
  "Manutenção - Lixeira quebrada": ["lixeira danificada", "cesto de lixo quebrado", "lixeira sem tampa"],
  "Manutenção - Necessidade de reforma": ["banheiro precisa reforma", "sanitário antigo", "instalações precisam renovação", "banheiro com problema estrutural"],
  "Manutenção - Vazão baixa da água": ["água fraca no chuveiro", "pressão baixa", "pouca água"],
  "Manutenção - Ar condicionado com vazamento": ["ar vazando água", "ar pingando", "climatização com escape de água"],
  "Manutenção - Melhora nos jardins": ["jardim precisa cuidados", "área verde mal cuidada", "paisagismo precisa melhorar"],

  // Operações (37 problemas) - APENAS atendimento, processos e serviços (sem equipamentos quebrados) ⭐ ATUALIZADO: +4 problems da cliente
  "Operações - Atendimento demorado": ["lentidão no atendimento operacional", "tempo de espera excessivo"],
  "Operações - Atendimento insistente": ["abordagem excessiva da equipe", "falta de discrição"],
  "Operações - Atendimento ruim": ["qualidade insatisfatória do serviço", "falta de cordialidade", "concierge ruim", "concierge desatencioso"],
  "Operações - Barulho": ["poluição sonora", "falta de silêncio"],
  
  "Operações - Cobrança indevida": ["erro em faturamento", "taxas incorretas"],
  "Operações - Falta de comunicação": ["ausência de informações", "comunicação deficiente"],
  
  "Operações - Quarto não preparado": ["acomodação não arrumada na chegada", "quarto não pronto"],
  "Operações - Segurança inadequada": ["falta de segurança", "vigilância insuficiente"],
  
  
  // Recepção (2 problemas) - processos de entrada/saída
  "Recepção - Check-in demorado": ["processo de entrada lento", "fila longa na recepção"],
  "Recepção - Check-out demorado": ["processo de saída demorado", "fila no checkout"],
  "Recepção - Atendimento ruim": ["atendimento insatisfatório na recepção", "falta de cordialidade", "equipe despreparada"],
  "Recepção - Falta de informação": ["ausência de orientações", "informações não fornecidas", "não explicaram procedimento"],
  "Recepção - Informação incorreta": ["dados imprecisos", "orientação equivocada", "informaram errado"],
  "Recepção - Estacionamento lotado": ["falta de vagas", "estacionamento cheio", "vaga indisponível"],
  "Recepção - Reserva com problema": ["erro na reserva", "reserva não encontrada", "booking não reconhecido"],
  "Operações - Upgrade negado": ["solicitação de upgrade recusada", "melhoria não concedida"],
  "Operações - Perda de pertences": ["objetos extraviados", "itens perdidos"],
  "Operações - Falta de cortesia": ["ausência de gentileza", "tratamento frio"],
  "Operações - Demora na solução": ["lentidão em resolver problemas", "resposta demorada"],
  "Operações - Falta de organização": ["desorganização operacional", "processos confusos"],
  "Operações - Reclamação ignorada": ["queixa não atendida", "problema não resolvido"],
  "Operações - Horário não cumprido": ["atrasos em serviços", "horários não respeitados"],
  "Operações - Bagagem extraviada": ["malas perdidas", "pertences não localizados"],
  "Operações - Serviço impessoal": ["atendimento sem personalização", "falta de hospitalidade"],
  "Operações - Falta de agilidade": ["lentidão operacional", "demora em processos"],
  "Operações - Equipe despreparada": ["staff sem treinamento", "funcionários sem conhecimento"],
  "Operações - Falta de empatia": ["ausência de compreensão", "atendimento insensível"],
  "Operações - Erro no pedido": ["solicitação mal executada", "pedido incorreto"],
  "Operações - Falta de flexibilidade": ["rigidez em políticas", "falta de adaptação"],
  "Operações - Burocracia excessiva": ["processos muito complexos", "excesso de procedimentos"],
  "Operações - Atendimento telefônico ruim": ["dificuldade de contato", "telefone não atende"],
  // ⭐ NOVOS DA CLIENTE (4 problems):
  "Operações - Atendimento sem fluência em outro idioma": ["funcionário não fala idiomas estrangeiros", "falta atendimento em outro idioma", "barreira linguística", "atendimento sem fluência em espanhol"],
  "Operações - Quadro reduzido de funcionários": ["falta de pessoal", "equipe insuficiente", "poucos funcionários"],
  
  "Operações - Demora na liberação do quarto": ["quarto demorou para ficar pronto", "espera longa pelo quarto", "acomodação não liberada no horário"],

  // Produto (28 problemas) - Características do produto/hotel ⭐ ATUALIZADO: +4 problems da cliente
  "Produto - Custo-benefício ruim": ["preço desproporcional ao valor", "não vale o que custa"],
  "Produto - Espaço insuficiente": ["quarto pequeno", "área reduzida"],
  "Produto - Falta de acessibilidade": ["ausência de adaptações para PCD", "dificuldade de acesso"],
  "Produto - Localização ruim": ["distância de pontos importantes", "localização inconveniente"],
  "Produto - Muito caro": ["preço elevado", "valor acima do mercado"],
  "Produto - Ruído externo": ["barulho da rua", "poluição sonora externa"],
  "Produto - Vista ruim": ["paisagem desagradável", "vista obstruída"],
  "Produto - Quarto pequeno": ["espaço reduzido", "acomodação apertada"],
  "Produto - Cama desconfortável": ["colchão ruim", "cama inadequada"],
  "Produto - Banheiro pequeno": ["sanitário apertado", "espaço reduzido no banheiro"],
  "Produto - Falta de tomadas": ["poucas tomadas", "ausência de pontos de energia"],
  "Produto - Decoração ruim": ["ambiente mal decorado", "estética desagradável"],
  "Produto - Móveis velhos": ["mobiliário desgastado", "móveis antigos"],
  "Produto - Colchão ruim": ["colchão desconfortável", "qualidade ruim do colchão"],
  "Produto - Travesseiro ruim": ["travesseiro inadequado", "qualidade ruim dos travesseiros"],
  "Produto - Falta de espelho": ["ausência de espelhos", "espelho insuficiente"],
  "Produto - Iluminação fraca": ["luz insuficiente", "ambiente escuro"],
  "Produto - Varanda pequena": ["área externa reduzida", "espaço limitado na varanda"],
  "Produto - Closet pequeno": ["espaço de armazenamento insuficiente", "armário pequeno"],
  "Produto - Banheira pequena": ["banheira apertada", "tamanho inadequado"],
  "Produto - Isolamento acústico ruim": ["falta de isolamento sonoro", "barulho entre quartos"],
  "Produto - All inclusive limitado": ["sistema all inclusive com restrições", "poucas opções inclusas"],
  "Produto - Falta de privacidade": ["quartos muito próximos", "falta de isolamento"],
  // Movido de Operações para Produto (relacionado à keyword "Produto - Transfer")
  "Produto - Transfer não disponível": ["serviço de transporte indisponível", "traslado não oferecido"],
  // ⭐ NOVOS DA CLIENTE (4 problems):
  "All Inclusive - Horário limitado": ["all inclusive com horário restrito", "refeições com tempo limitado", "horários curtos no all inclusive"],
  "All Inclusive - Cobrança de taxas extras": ["cobranças extras no all inclusive", "taxas adicionais", "all inclusive cobra à parte"],
  "All Inclusive - Informações contraditórias": ["informação confusa sobre all inclusive", "divergência nas regras", "falta clareza no all inclusive"],
  "Produto - Valor da meia pensão elevado": ["meia pensão cara", "preço alto half board", "valor desproporcional da meia pensão"],

  // TI (17 problemas) - Conectividade, serviços e equipamentos tecnológicos ⭐ ATUALIZADO: +1 problem da cliente
  "TI - Wi-fi não conecta": ["impossibilidade de conexão", "wifi não funciona"],
  "TI - Wi-fi lento": ["internet lenta", "velocidade baixa de conexão"],
  "TI - Wi-fi instável": ["conexão intermitente", "queda constante de sinal"],
  "TI - Canais limitados": ["poucas opções de canais", "programação limitada"],
  "TI - App do hotel ruim": ["aplicativo mal desenvolvido", "app não funciona", "app instável", "aplicativo fecha sozinho", "aplicativo trava"],
  "TI - Senha Wi-fi complicada": ["dificuldade para conectar", "senha muito complexa"],
  "TI - Sinal fraco": ["cobertura wifi insuficiente", "sinal de internet baixo"],
  "TI - Falta de suporte técnico": ["ausência de ajuda para problemas técnicos", "TI não responde"],
  "TI - Sistema lento": ["tecnologia defasada", "equipamentos lentos"],
  "TI - TV não funciona": ["televisão quebrada", "TV não liga"],
  "TI - Sistema de som com falha": ["qualidade de áudio inadequada", "som não funciona"],
  "TI - Controle remoto quebrado": ["controle não funciona", "botões com defeito"],
  "TI - Smart TV com problemas": ["TV inteligente com problemas", "sistema da TV lento", "chromecast com falha", "chromecast não conecta"],
  "TI - Streaming não disponível": ["serviços de streaming bloqueados", "Netflix/YouTube não funciona"],
  // ⭐ NOVO DA CLIENTE (1 problem):
  "TV - TV com funções limitadas": ["TV sem recursos", "televisão básica", "poucos recursos na TV"],
};

// ⭐ ADICIONADO APÓS TI: 3 problems de EG e 1 de Corporativo que faltavam

/**
 * Problems adicionais de EG e Corporativo (da cliente)
 */
const ADDITIONAL_PROBLEMS_EG_CORPORATIVO: Record<string, string[]> = {
  // EG - Exclusive Guest (3 problemas NOVOS da cliente)
  "EG - Abordagem não agradável após recusa": ["insistência após recusa", "abordagem inconveniente", "forçar venda do programa EG"],
  "EG - Abordagem repetitiva excessiva": ["abordagem insistente do EG", "vendedor do EG muito insistente", "pressão para comprar EG"],
  "EG - Promessas não cumpridas": ["promessas do EG não realizadas", "programa EG não entregou", "expectativa EG não atendida"],
  
  // Corporativo - Nota Fiscal (1 problem NOVO da cliente)
  "Corporativo - NF não entregue": ["nota fiscal não emitida", "falta de nota fiscal", "NF não enviada", "sem recibo fiscal"],
};

// Merge dos dicionários
Object.assign(PROBLEM_CONTEXT_DICT, ADDITIONAL_PROBLEMS_EG_CORPORATIVO);

/**
 * Enriquece uma keyword com contexto semântico para gerar embeddings mais precisos
 */
function enrichKeywordWithContext(keyword: string): string {
  // Usa o enriquecimento centralizado do semantic-enrichment
  return generateEnrichedKeywordText(keyword);
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

    const keywordCounts: Record<string, number> = {};
    keywordsArray.forEach((kw) => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
    const duplicatedKeywords = Object.entries(keywordCounts)
      .filter(([, count]) => count > 1)
      .map(([kw, count]) => `${kw} (${count}x)`);
    if (duplicatedKeywords.length > 0) {
      console.log('♻️ Keywords duplicadas encontradas e removidas:', duplicatedKeywords);
    }
    keywordsArray = Array.from(new Set(keywordsArray));
    
    // Fonte AUTORITATIVA de problems: usar exatamente as chaves de PROBLEM_CONTEXT_DICT
    const problems = Object.keys(PROBLEM_CONTEXT_DICT);
    const departments = data.departments || [];

    // Não filtrar keywords fora do mapeamento: usar fallback automático
    // Apenas reportar se há keywords sem contexto explícito
    const beforeCount = keywordsArray.length;
    const allowedKeywords = new Set(Object.keys(KEYWORD_SEMANTIC_CONTEXT));
    const missingKeywords = keywordsArray.filter((kw: string) => !allowedKeywords.has(kw));
    if (missingKeywords.length > 0) {
      console.log(`⚠️ ${missingKeywords.length} keywords sem mapeamento explícito, usando fallback de enriquecimento. Exemplos:`, missingKeywords.slice(0, 10));
    }

    console.log(`📊 Processando: ${keywordsArray.length} keywords, ${problems.length} problems (fonte: PROBLEM_CONTEXT_DICT)`);
    reportProgress('Iniciando processamento', 5, { keywords: keywordsArray.length, problems: problems.length, missing_keywords: missingKeywords.length });

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

    // 🔧 CORREÇÃO: Problems podem vir como objetos ou strings
    const problemsArray: string[] = problems;

    // Enriquecer problems com contexto semântico para embeddings mais precisos
    const problemTexts = problemsArray.map((prob: string) => {
      const enriched = enrichProblemWithContext(prob);
      if (enriched !== prob) {
        console.log(`   ✨ Enriquecido: "${prob}" → "${enriched.substring(0, 100)}..."`);
      }
      return enriched;
    });
    const problemEmbeddings = await generateBatchEmbeddings(problemTexts, apiKey, BATCH_SIZE);

    reportProgress('Problems processados', 70, { processed: problemEmbeddings.length });

    const problemsWithEmbeddings = problemsArray.map((prob: string, index: number) => ({
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
      // 🔧 Sincronizar lista de problems no Firebase para evitar divergência
      problems: problemsArray,
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
    await updateTaxonomyVersion({ keywords: data.keywords, problems: problemsArray, departments });
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
        total_api_calls: Math.ceil((keywordsArray.length + problemsArray.length) / BATCH_SIZE)
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