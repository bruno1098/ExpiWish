import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  Timestamp 
} from 'firebase/firestore';

// Interface para as listas dinâmicas
interface DynamicLists {
  keywords: string[];
  problems: string[];
  departments: string[];
  lastUpdated: Timestamp;
  lastUpdatedBy?: {
    uid: string;
    name: string;
    email: string;
  };
}

// Listas padrão que sempre estarão disponíveis
const DEFAULT_KEYWORDS = [
  'Experiência',
  'Localização',
  'A&B - Café da manhã',
  'A&B - Serviço',
  'A&B - Variedade',
  'A&B - Preço',
  'Limpeza - Quarto',
  'Limpeza - Banheiro',
  'Limpeza - Áreas sociais',
  'Enxoval',
  'Manutenção - Quarto',
  'Manutenção - Banheiro',
  'Manutenção - Instalações',
  'Ar-condicionado',
  'Elevador',
  'Frigobar',
  'Infraestrutura',
  'Lazer - Variedade',
  'Lazer - Estrutura',
  'Spa',
  'Piscina',
  'Tecnologia - Wi-fi',
  'Tecnologia - TV',
  'Estacionamento',
  'Atendimento',
  'Acessibilidade',
  'Reserva de cadeiras (pool)',
  'Processo',
  'Custo-benefício',
  'Comunicação',
  'Check-in - Atendimento',
  'Check-out - Atendimento',
  'Concierge',
  'Cotas',
  'Reservas'
];

const DEFAULT_PROBLEMS = [
  'VAZIO',
  'Demora no Atendimento',
  'Falta de Limpeza',
  'Capacidade Insuficiente',
  'Falta de Cadeiras',
  'Não Funciona',
  'Conexão Instável',
  'Ruído Excessivo',
  'Espaço Insuficiente',
  'Qualidade da Comida',
  'Muito Frio',
  'Muito Quente',
  'Pressão de Vendas',
  'Check-in Lento',
  'Check-out Lento'
];

const DEFAULT_DEPARTMENTS = [
  'A&B',
  'Governança', 
  'Manutenção',
  'Lazer',
  'TI',
  'Operações',
  'Produto',
  'Marketing',
  'Comercial',
  'Qualidade',
  'Recepção',
  'Programa de vendas'
];

// Nome da coleção no Firebase
const DYNAMIC_LISTS_COLLECTION = 'dynamic-lists';
const GLOBAL_LISTS_DOC = 'global-lists';

/**
 * Verifica se um item é padrão do sistema (não pode ser editado/removido)
 */
export const isDefaultItem = (item: string, type: 'keyword' | 'problem' | 'department'): boolean => {
  switch (type) {
    case 'keyword':
      return DEFAULT_KEYWORDS.includes(item);
    case 'problem':
      return DEFAULT_PROBLEMS.includes(item);
    case 'department':
      return DEFAULT_DEPARTMENTS.includes(item);
    default:
      return false;
  }
};

/**
 * Busca as listas dinâmicas do Firebase
 * Se não existirem, cria com os valores padrão
 */
export const getDynamicLists = async (): Promise<DynamicLists> => {
  try {
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as DynamicLists;
      
      // Processar keywords - agora pode ser MAP (por departamento) ou ARRAY (flat)
      let keywordsArray: string[] = [];
      
      if (typeof data.keywords === 'object' && !Array.isArray(data.keywords)) {
        // Nova estrutura: MAP por departamento
        keywordsArray = Object.values(data.keywords).flat() as string[];
      } else if (Array.isArray(data.keywords)) {
        // Estrutura antiga: ARRAY flat
        keywordsArray = data.keywords;
      }
      
      // Garantir que as listas padrão estejam sempre incluídas
      const keywordSet = new Set([...DEFAULT_KEYWORDS, ...keywordsArray]);
      const problemSet = new Set([...DEFAULT_PROBLEMS, ...(data.problems || [])]);
      const departmentSet = new Set([...DEFAULT_DEPARTMENTS, ...(data.departments || [])]);
      
      const mergedKeywords = Array.from(keywordSet);
      const mergedProblems = Array.from(problemSet);
      const mergedDepartments = Array.from(departmentSet);
      
      return {
        keywords: mergedKeywords.sort(),
        problems: mergedProblems.sort(),
        departments: mergedDepartments.sort(),
        lastUpdated: data.lastUpdated || Timestamp.now()
      };
    } else {
      // Criar documento inicial com listas padrão
      const initialData: DynamicLists = {
        keywords: DEFAULT_KEYWORDS.sort(),
        problems: DEFAULT_PROBLEMS.sort(),
        departments: DEFAULT_DEPARTMENTS.sort(),
        lastUpdated: Timestamp.now()
      };
      
      await setDoc(docRef, initialData);
      return initialData;
    }
  } catch (error) {
    console.error('Erro ao buscar listas dinâmicas:', error);
    // Retornar listas padrão em caso de erro
    return {
      keywords: DEFAULT_KEYWORDS.sort(),
      problems: DEFAULT_PROBLEMS.sort(),
      departments: DEFAULT_DEPARTMENTS.sort(),
      lastUpdated: Timestamp.now()
    };
  }
};

/**
 * Adiciona uma nova palavra-chave à lista global com informações do usuário
 */
export const addKeywordWithUser = async (keyword: string, userInfo: { uid: string; name: string; email: string }): Promise<boolean> => {
  try {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      throw new Error('Palavra-chave não pode estar vazia');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se já existe
    const currentLists = await getDynamicLists();
    if (currentLists.keywords.includes(trimmedKeyword)) {
      return true; // Já existe, não precisa adicionar
    }
    
    // Adicionar à lista
    await updateDoc(docRef, {
      keywords: arrayUnion(trimmedKeyword),
      lastUpdated: Timestamp.now(),
      lastUpdatedBy: userInfo
    });
    
    console.log('✅ Palavra-chave adicionada:', trimmedKeyword, 'por', userInfo.name);
    return true;
  } catch (error) {
    console.error('Erro ao adicionar palavra-chave:', error);
    return false;
  }
};

/**
 * Adiciona uma nova palavra-chave à lista global (compatibilidade)
 */
export const addKeyword = async (keyword: string): Promise<boolean> => {
  try {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      throw new Error('Palavra-chave não pode estar vazia');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se já existe
    const currentLists = await getDynamicLists();
    if (currentLists.keywords.includes(trimmedKeyword)) {
      return true; // Já existe, não precisa adicionar
    }
    
    // Adicionar à lista
    await updateDoc(docRef, {
      keywords: arrayUnion(trimmedKeyword),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Palavra-chave adicionada:', trimmedKeyword);
    return true;
  } catch (error) {
    console.error('Erro ao adicionar palavra-chave:', error);
    return false;
  }
};

/**
 * Adiciona um novo problema à lista global
 */
export const addProblem = async (problem: string): Promise<boolean> => {
  try {
    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      throw new Error('Problema não pode estar vazio');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se já existe
    const currentLists = await getDynamicLists();
    if (currentLists.problems.includes(trimmedProblem)) {
      return true; // Já existe, não precisa adicionar
    }
    
    // Adicionar à lista
    await updateDoc(docRef, {
      problems: arrayUnion(trimmedProblem),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Problema adicionado:', trimmedProblem);
    return true;
  } catch (error) {
    console.error('Erro ao adicionar problema:', error);
    return false;
  }
};

/**
 * Adiciona um novo departamento à lista global
 */
export const addDepartment = async (department: string): Promise<boolean> => {
  try {
    const trimmedDepartment = department.trim();
    if (!trimmedDepartment) {
      throw new Error('Departamento não pode estar vazio');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se já existe
    const currentLists = await getDynamicLists();
    if (currentLists.departments.includes(trimmedDepartment)) {
      return true; // Já existe, não precisa adicionar
    }
    
    // Adicionar à lista
    await updateDoc(docRef, {
      departments: arrayUnion(trimmedDepartment),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Departamento adicionado:', trimmedDepartment);
    return true;
  } catch (error) {
    console.error('Erro ao adicionar departamento:', error);
    return false;
  }
};

/**
 * Remove uma palavra-chave da lista global
 */
export const removeKeyword = async (keyword: string): Promise<boolean> => {
  try {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      throw new Error('Palavra-chave não pode estar vazia');
    }
    
    // Verificar se é uma palavra-chave padrão
    if (DEFAULT_KEYWORDS.includes(trimmedKeyword)) {
      throw new Error('Não é possível remover palavras-chave padrão do sistema');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Remover da lista
    await updateDoc(docRef, {
      keywords: arrayRemove(trimmedKeyword),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Palavra-chave removida:', trimmedKeyword);
    return true;
  } catch (error) {
    console.error('Erro ao remover palavra-chave:', error);
    return false;
  }
};

/**
 * Remove um problema da lista global
 */
export const removeProblem = async (problem: string): Promise<boolean> => {
  try {
    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      throw new Error('Problema não pode estar vazio');
    }
    
    // Verificar se é um problema padrão
    if (DEFAULT_PROBLEMS.includes(trimmedProblem)) {
      throw new Error('Não é possível remover problemas padrão do sistema');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Remover da lista
    await updateDoc(docRef, {
      problems: arrayRemove(trimmedProblem),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Problema removido:', trimmedProblem);
    return true;
  } catch (error) {
    console.error('Erro ao remover problema:', error);
    return false;
  }
};

/**
 * Remove um departamento da lista global
 */
export const removeDepartment = async (department: string): Promise<boolean> => {
  try {
    const trimmedDepartment = department.trim();
    if (!trimmedDepartment) {
      throw new Error('Departamento não pode estar vazio');
    }
    
    // Verificar se é um departamento padrão
    if (DEFAULT_DEPARTMENTS.includes(trimmedDepartment)) {
      throw new Error('Não é possível remover departamentos padrão do sistema');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Remover da lista
    await updateDoc(docRef, {
      departments: arrayRemove(trimmedDepartment),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Departamento removido:', trimmedDepartment);
    return true;
  } catch (error) {
    console.error('Erro ao remover departamento:', error);
    return false;
  }
};

/**
 * Edita uma palavra-chave existente
 */
export const editKeyword = async (oldKeyword: string, newKeyword: string): Promise<boolean> => {
  try {
    const trimmedOld = oldKeyword.trim();
    const trimmedNew = newKeyword.trim();
    
    if (!trimmedOld || !trimmedNew) {
      throw new Error('Palavras-chave não podem estar vazias');
    }
    
    if (trimmedOld === trimmedNew) {
      return true; // Não há mudança
    }
    
    // Verificar se é uma palavra-chave padrão
    if (DEFAULT_KEYWORDS.includes(trimmedOld)) {
      throw new Error('Não é possível editar palavras-chave padrão do sistema');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se a nova palavra-chave já existe
    const currentLists = await getDynamicLists();
    if (currentLists.keywords.includes(trimmedNew)) {
      throw new Error('Esta palavra-chave já existe na lista');
    }
    
    // Remover a antiga e adicionar a nova
    await updateDoc(docRef, {
      keywords: arrayRemove(trimmedOld),
      lastUpdated: Timestamp.now()
    });
    
    await updateDoc(docRef, {
      keywords: arrayUnion(trimmedNew),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Palavra-chave editada:', trimmedOld, '→', trimmedNew);
    return true;
  } catch (error) {
    console.error('Erro ao editar palavra-chave:', error);
    return false;
  }
};

/**
 * Edita um problema existente
 */
export const editProblem = async (oldProblem: string, newProblem: string): Promise<boolean> => {
  try {
    const trimmedOld = oldProblem.trim();
    const trimmedNew = newProblem.trim();
    
    if (!trimmedOld || !trimmedNew) {
      throw new Error('Problemas não podem estar vazios');
    }
    
    if (trimmedOld === trimmedNew) {
      return true; // Não há mudança
    }
    
    // Verificar se é um problema padrão
    if (DEFAULT_PROBLEMS.includes(trimmedOld)) {
      throw new Error('Não é possível editar problemas padrão do sistema');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se o novo problema já existe
    const currentLists = await getDynamicLists();
    if (currentLists.problems.includes(trimmedNew)) {
      throw new Error('Este problema já existe na lista');
    }
    
    // Remover o antigo e adicionar o novo
    await updateDoc(docRef, {
      problems: arrayRemove(trimmedOld),
      lastUpdated: Timestamp.now()
    });
    
    await updateDoc(docRef, {
      problems: arrayUnion(trimmedNew),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Problema editado:', trimmedOld, '→', trimmedNew);
    return true;
  } catch (error) {
    console.error('Erro ao editar problema:', error);
    return false;
  }
};

/**
 * Edita um departamento existente
 */
export const editDepartment = async (oldDepartment: string, newDepartment: string): Promise<boolean> => {
  try {
    const trimmedOld = oldDepartment.trim();
    const trimmedNew = newDepartment.trim();
    
    if (!trimmedOld || !trimmedNew) {
      throw new Error('Departamentos não podem estar vazios');
    }
    
    if (trimmedOld === trimmedNew) {
      return true; // Não há mudança
    }
    
    // Verificar se é um departamento padrão
    if (DEFAULT_DEPARTMENTS.includes(trimmedOld)) {
      throw new Error('Não é possível editar departamentos padrão do sistema');
    }
    
    const docRef = doc(db, DYNAMIC_LISTS_COLLECTION, GLOBAL_LISTS_DOC);
    
    // Verificar se o novo departamento já existe
    const currentLists = await getDynamicLists();
    if (currentLists.departments.includes(trimmedNew)) {
      throw new Error('Este departamento já existe na lista');
    }
    
    // Remover o antigo e adicionar o novo
    await updateDoc(docRef, {
      departments: arrayRemove(trimmedOld),
      lastUpdated: Timestamp.now()
    });
    
    await updateDoc(docRef, {
      departments: arrayUnion(trimmedNew),
      lastUpdated: Timestamp.now()
    });
    
    console.log('✅ Departamento editado:', trimmedOld, '→', trimmedNew);
    return true;
  } catch (error) {
    console.error('Erro ao editar departamento:', error);
    return false;
  }
};

// Importar React para o hook
import React from 'react';

export type { DynamicLists };

// Função para mover keyword entre departamentos/tópicos
export const moveKeywordToDepartment = async (
  keyword: string, 
  sourceDepartment: string,
  targetDepartment: string
): Promise<boolean> => {
  try {
    // Criar a nova keyword com o prefixo do departamento alvo
    let newKeyword = keyword;
    
    // Remover prefixo atual se existir
    const cleanKeyword = keyword.replace(/^[^-]+ - /, '');
    
    // Adicionar novo prefixo baseado no departamento alvo
    switch (targetDepartment) {
      case 'A&B':
        newKeyword = `A&B - ${cleanKeyword}`;
        break;
      case 'Governança':
        // Governança geralmente não tem prefixo para palavras específicas
        if (!['Enxoval', 'Travesseiro', 'Colchão', 'Espelho'].includes(cleanKeyword)) {
          newKeyword = `Governança - ${cleanKeyword}`;
        } else {
          newKeyword = cleanKeyword;
        }
        break;
      case 'Limpeza':
        newKeyword = `Limpeza - ${cleanKeyword}`;
        break;
      case 'Manutenção':
        // Algumas palavras de manutenção não têm prefixo
        if (!['Ar-condicionado', 'Elevador', 'Frigobar', 'Infraestrutura'].includes(cleanKeyword)) {
          newKeyword = `Manutenção - ${cleanKeyword}`;
        } else {
          newKeyword = cleanKeyword;
        }
        break;
      case 'Lazer':
        if (!['Spa', 'Piscina', 'Recreação', 'Mixologia'].includes(cleanKeyword)) {
          newKeyword = `Lazer - ${cleanKeyword}`;
        } else {
          newKeyword = cleanKeyword;
        }
        break;
      case 'TI':
        newKeyword = `Tecnologia - ${cleanKeyword}`;
        break;
      case 'Recepção':
        if (!cleanKeyword.startsWith('Check-')) {
          newKeyword = `Recepção - ${cleanKeyword}`;
        } else {
          newKeyword = cleanKeyword;
        }
        break;
      case 'Outros':
        // Para "Outros", manter apenas o texto limpo
        newKeyword = cleanKeyword;
        break;
      default:
        // Manter como está se não reconhecer o departamento
        newKeyword = keyword;
    }
    
    // Se a palavra não mudou, não fazer nada
    if (newKeyword === keyword) {
      return true;
    }
    
    // Editar a keyword (remove a antiga e adiciona a nova)
    const success = await editKeyword(keyword, newKeyword);
    
    if (success) {
      console.log(`✅ Keyword movida: "${keyword}" → "${newKeyword}" (${sourceDepartment} → ${targetDepartment})`);
    } else {
      console.error(`❌ Falha ao mover keyword: "${keyword}" → "${newKeyword}"`);
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao mover keyword entre departamentos:', error);
    return false;
  }
};

/**
 * Hook personalizado para gerenciar listas dinâmicas
 */
export const useDynamicLists = () => {
  const [lists, setLists] = React.useState<DynamicLists | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadLists = async () => {
      try {
        const dynamicLists = await getDynamicLists();
        setLists(dynamicLists);
      } catch (error) {
        console.error('Erro ao carregar listas dinâmicas:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadLists();
  }, []);
  
  const refreshLists = async () => {
    setLoading(true);
    try {
      const dynamicLists = await getDynamicLists();
      setLists(dynamicLists);
    } catch (error) {
      console.error('Erro ao atualizar listas dinâmicas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return {
    lists,
    loading,
    refreshLists,
    addKeyword: async (keyword: string) => {
      const success = await addKeyword(keyword);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    addProblem: async (problem: string) => {
      const success = await addProblem(problem);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    addDepartment: async (department: string) => {
      const success = await addDepartment(department);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    removeKeyword: async (keyword: string) => {
      const success = await removeKeyword(keyword);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    removeProblem: async (problem: string) => {
      const success = await removeProblem(problem);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    removeDepartment: async (department: string) => {
      const success = await removeDepartment(department);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    editKeyword: async (oldKeyword: string, newKeyword: string) => {
      const success = await editKeyword(oldKeyword, newKeyword);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    editProblem: async (oldProblem: string, newProblem: string) => {
      const success = await editProblem(oldProblem, newProblem);
      if (success) {
        await refreshLists();
      }
      return success;
    },
    editDepartment: async (oldDepartment: string, newDepartment: string) => {
      const success = await editDepartment(oldDepartment, newDepartment);
      if (success) {
        await refreshLists();
      }
      return success;
    }
  };
};