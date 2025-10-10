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

// ⚠️ REMOVIDO: Listas DEFAULT hardcoded
// Sistema agora usa 100% dados do Firebase
// Para adicionar itens padrão, use o Firebase Console ou a interface de configuração

// Nome da coleção no Firebase
const DYNAMIC_LISTS_COLLECTION = 'dynamic-lists';
const GLOBAL_LISTS_DOC = 'global-lists';

/**
 * Verifica se um item é padrão do sistema (não pode ser editado/removido)
 * ⚠️ ATUALIZADO: Agora todos os itens podem ser editados (100% Firebase)
 */
export const isDefaultItem = (item: string, type: 'keyword' | 'problem' | 'department'): boolean => {
  // Todos os itens agora são editáveis - removido conceito de "default"
  return false;
};

/**
 * Busca as listas dinâmicas do Firebase
 * ⚠️ ATUALIZADO: Retorna APENAS dados do Firebase (sem merge com defaults)
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
        // Nova estrutura: MAP por departamento com objetos {label, details}
        const allKeywordObjects = Object.values(data.keywords).flat();
        keywordsArray = allKeywordObjects.map((kw: any) => 
          typeof kw === 'string' ? kw : kw.label
        );
      } else if (Array.isArray(data.keywords)) {
        // Estrutura antiga: ARRAY flat
        keywordsArray = data.keywords.map((kw: any) => 
          typeof kw === 'string' ? kw : kw.label
        );
      }
      
      // Processar problems - agora também são objetos {label, details}
      const problemsArray = (data.problems || []).map((prob: any) =>
        typeof prob === 'string' ? prob : prob.label
      );
      
      // ✅ APENAS dados do Firebase - sem merge com defaults
      return {
        keywords: keywordsArray.sort(),
        problems: problemsArray.sort(),
        departments: (data.departments || []).sort(),
        lastUpdated: data.lastUpdated || Timestamp.now()
      };
    } else {
      // Documento não existe - retornar listas vazias
      console.warn('⚠️ Documento dynamic-lists não encontrado no Firebase. Configure as listas primeiro.');
      return {
        keywords: [],
        problems: [],
        departments: [],
        lastUpdated: Timestamp.now()
      };
    }
  } catch (error) {
    console.error('❌ Erro ao buscar listas dinâmicas:', error);
    // Retornar listas vazias em caso de erro
    return {
      keywords: [],
      problems: [],
      departments: [],
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
 * ⚠️ ATUALIZADO: Todos os itens agora podem ser removidos (100% Firebase)
 */
export const removeKeyword = async (keyword: string): Promise<boolean> => {
  try {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      throw new Error('Palavra-chave não pode estar vazia');
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
 * ⚠️ ATUALIZADO: Todos os itens agora podem ser removidos (100% Firebase)
 */
export const removeProblem = async (problem: string): Promise<boolean> => {
  try {
    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      throw new Error('Problema não pode estar vazio');
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
 * ⚠️ ATUALIZADO: Todos os itens agora podem ser removidos (100% Firebase)
 */
export const removeDepartment = async (department: string): Promise<boolean> => {
  try {
    const trimmedDepartment = department.trim();
    if (!trimmedDepartment) {
      throw new Error('Departamento não pode estar vazio');
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
 * ⚠️ ATUALIZADO: Todos os itens agora podem ser editados (100% Firebase)
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
 * ⚠️ ATUALIZADO: Todos os itens agora podem ser editados (100% Firebase)
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
 * ⚠️ ATUALIZADO: Todos os itens agora podem ser editados (100% Firebase)
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