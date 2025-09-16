import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp,
  onSnapshot,
  writeBatch,
  arrayUnion,
  serverTimestamp,
  setDoc,
  deleteField
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db } from '@/lib/firebase';
import { 
  Ticket, 
  CreateTicketData, 
  UpdateTicketData, 
  TicketFilters, 
  TicketStats,
  TicketComment,
  TicketAttachment,
  TicketStatusHistory,
  TicketStatus
} from '@/types/ticket';
import { UserData } from '@/lib/auth-service';
import { devLog, devError } from '@/lib/dev-logger';

// Collection reference
const TICKETS_COLLECTION = 'tickets';

/**
 * Gerar ID único para ticket seguindo padrão do projeto
 */
const generateTicketId = (): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const millisecond = now.getMilliseconds().toString().padStart(3, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `T${day}${month}${year}_${hour}${minute}${second}_${millisecond}${random}`;
};

/**
 * Criar novo ticket
 */
export const createTicket = async (
  ticketData: CreateTicketData, 
  currentUser: UserData
): Promise<Ticket> => {
  try {
    devLog('Criando novo ticket:', ticketData);
    
    const ticketId = generateTicketId();
    const now = Timestamp.now();
    
    // Preparar dados do ticket
    const ticket: Omit<Ticket, 'id'> = {
      title: ticketData.title,
      description: ticketData.description,
      status: 'open',
      priority: ticketData.priority,
      category: ticketData.category,
      createdAt: now,
      updatedAt: now,
      createdBy: {
        uid: currentUser.uid,
        name: currentUser.name || currentUser.email,
        email: currentUser.email,
        hotelId: currentUser.hotelId,
        hotelName: currentUser.hotelName
      },
      attachments: ticketData.attachments || [],
      comments: [],
      tags: ticketData.tags || [],
      ...(ticketData.estimatedHours && { estimatedHours: ticketData.estimatedHours }),
      ...(ticketData.dueDate && { dueDate: Timestamp.fromDate(ticketData.dueDate) }),
      isArchived: false,
      statusHistory: [{
        id: generateTicketId(),
        fromStatus: null,
        toStatus: 'open',
        changedAt: now,
        changedBy: {
          uid: currentUser.uid,
          name: currentUser.name || currentUser.email,
          email: currentUser.email
        },
        comment: 'Ticket criado'
      }]
    };
    
    // Salvar no Firestore
    const docRef = doc(db, TICKETS_COLLECTION, ticketId);
    await setDoc(docRef, ticket);
    
    const savedTicket: Ticket = {
      id: ticketId,
      ...ticket
    };
    
    devLog('Ticket criado com sucesso:', ticketId);
    return savedTicket;
    
  } catch (error) {
    devError('Erro ao criar ticket:', error);
    throw new Error('Falha ao criar ticket');
  }
};

/**
 * Buscar ticket por ID
 */
export const getTicketById = async (id: string): Promise<Ticket | null> => {
  try {
    const docRef = doc(db, TICKETS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Ticket;
    }
    
    return null;
  } catch (error) {
    devError('Erro ao buscar ticket:', error);
    throw new Error('Falha ao buscar ticket');
  }
};

/**
 * Buscar todos os tickets com filtros
 */
export const getTickets = async (
  filters: TicketFilters = {}, 
  currentUser: UserData
): Promise<Ticket[]> => {
  try {
    // Query simples para evitar necessidade de índices compostos
    const q = query(
      collection(db, TICKETS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    let tickets: Ticket[] = [];
    
    querySnapshot.forEach((doc) => {
      const ticket = { id: doc.id, ...doc.data() } as Ticket;
      tickets.push(ticket);
    });
    
    // Aplicar filtros no cliente para evitar necessidade de índices
    tickets = tickets.filter(ticket => {
      // REMOVIDO: Filtro para staff - agora todos podem ver todos os tickets
      // Tickets são globais para melhor colaboração e transparência
      
      // Filtro de arquivados
      if (ticket.isArchived === true) {
        return false;
      }
      
      // Filtros opcionais
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(ticket.status)) {
          return false;
        }
      }
      
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(ticket.priority)) {
          return false;
        }
      }
      
      if (filters.category && filters.category.length > 0) {
        if (!filters.category.includes(ticket.category)) {
          return false;
        }
      }
      
      if (filters.createdBy) {
        if (ticket.createdBy?.uid !== filters.createdBy) {
          return false;
        }
      }
      
      if (filters.hotelId && currentUser.role === 'admin') {
        if (ticket.createdBy?.hotelId !== filters.hotelId) {
          return false;
        }
      }
      
      // Filtro por texto de busca
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const titleMatch = ticket.title.toLowerCase().includes(searchLower);
        const descriptionMatch = ticket.description?.toLowerCase().includes(searchLower) || false;
        const tagsMatch = ticket.tags?.some(tag => 
          tag.toLowerCase().includes(searchLower)
        );
        
        if (!(titleMatch || descriptionMatch || tagsMatch)) {
          return false;
        }
      }
      
      // Filtro por data
      if (filters.dateFrom && ticket.createdAt) {
        const ticketDate = ticket.createdAt.toDate();
        if (ticketDate < filters.dateFrom) {
          return false;
        }
      }
      
      if (filters.dateTo && ticket.createdAt) {
        const ticketDate = ticket.createdAt.toDate();
        if (ticketDate > filters.dateTo) {
          return false;
        }
      }
      
      // Filtro por tags
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = ticket.tags?.some(tag => 
          filters.tags!.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
    
    devLog(`Encontrados ${tickets.length} tickets`);
    return tickets;
    
  } catch (error) {
    devError('Erro ao buscar tickets:', error);
    throw new Error('Falha ao buscar tickets');
  }
};

/**
 * Atualizar ticket
 */
export const updateTicket = async (
  id: string, 
  updateData: UpdateTicketData,
  currentUser: UserData
): Promise<void> => {
  try {
    devLog('Atualizando ticket:', id, updateData);
    
    const docRef = doc(db, TICKETS_COLLECTION, id);
    const now = Timestamp.now();
    
    // Buscar ticket atual para comparar status
    const currentTicket = await getTicketById(id);
    if (!currentTicket) {
      throw new Error('Ticket não encontrado');
    }
    
    // Verificar permissão para mudança de status - apenas admins podem alterar
    if (updateData.status && updateData.status !== currentTicket.status) {
      if (currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem alterar o status dos tickets');
      }
    }
    
    // Preparar dados de atualização
    const updatePayload: any = {
      ...updateData,
      updatedAt: now
    };
    
    // Tratar dueDate especificamente para evitar undefined
    if (updateData.dueDate !== undefined) {
      if (updateData.dueDate) {
        updatePayload.dueDate = Timestamp.fromDate(updateData.dueDate);
      } else {
        // Se dueDate for null, remover o campo
        updatePayload.dueDate = deleteField();
      }
    }
    
    // Se o status mudou, adicionar ao histórico
    if (updateData.status && updateData.status !== currentTicket.status) {
      const statusHistory: TicketStatusHistory = {
        id: generateTicketId(),
        fromStatus: currentTicket.status,
        toStatus: updateData.status,
        changedAt: now,
        changedBy: {
          uid: currentUser.uid,
          name: currentUser.name || currentUser.email,
          email: currentUser.email
        }
      };
      
      updatePayload.statusHistory = arrayUnion(statusHistory);
    }
    
    await updateDoc(docRef, updatePayload);
    devLog('Ticket atualizado com sucesso:', id);
    
  } catch (error) {
    devError('Erro ao atualizar ticket:', error);
    throw new Error('Falha ao atualizar ticket');
  }
};

/**
 * Arquivar/desarquivar ticket
 */
export const archiveTicket = async (
  id: string, 
  archive: boolean = true
): Promise<void> => {
  try {
    const docRef = doc(db, TICKETS_COLLECTION, id);
    await updateDoc(docRef, {
      isArchived: archive,
      updatedAt: Timestamp.now()
    });
    
    devLog(`Ticket ${archive ? 'arquivado' : 'desarquivado'}:`, id);
  } catch (error) {
    devError('Erro ao arquivar ticket:', error);
    throw new Error('Falha ao arquivar ticket');
  }
};

/**
 * Adicionar comentário ao ticket
 */
export const addTicketComment = async (
  ticketId: string,
  content: string,
  currentUser: UserData,
  isInternal: boolean = false
): Promise<void> => {
  try {
    const comment: TicketComment = {
      id: generateTicketId(),
      content,
      createdAt: Timestamp.now(),
      createdBy: {
        uid: currentUser.uid,
        name: currentUser.name || currentUser.email,
        email: currentUser.email
      },
      isInternal
    };
    
    const docRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(docRef, {
      comments: arrayUnion(comment),
      updatedAt: Timestamp.now()
    });
    
    devLog('Comentário adicionado ao ticket:', ticketId);
  } catch (error) {
    devError('Erro ao adicionar comentário:', error);
    throw new Error('Falha ao adicionar comentário');
  }
};

/**
 * Obter estatísticas de tickets
 */
export const getTicketStats = async (currentUser: UserData): Promise<TicketStats> => {
  try {
    const tickets = await getTickets({}, currentUser);
    
    const stats: TicketStats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      done: tickets.filter(t => t.status === 'done').length,
      byPriority: {
        high: tickets.filter(t => t.priority === 'high').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        low: tickets.filter(t => t.priority === 'low').length
      },
      byCategory: {
        fix: tickets.filter(t => t.category === 'fix').length,
        feat: tickets.filter(t => t.category === 'feat').length,
        style: tickets.filter(t => t.category === 'style').length,
        perf: tickets.filter(t => t.category === 'perf').length,
        chore: tickets.filter(t => t.category === 'chore').length
      },
      avgResolutionTime: 0 // TODO: Calcular tempo médio de resolução
    };
    
    return stats;
  } catch (error) {
    devError('Erro ao calcular estatísticas:', error);
    throw new Error('Falha ao calcular estatísticas');
  }
};

/**
 * Listener para tickets em tempo real
 */
export const subscribeToTickets = (
  filters: TicketFilters,
  currentUser: UserData,
  callback: (tickets: Ticket[]) => void
) => {
  try {
    // Query simples para evitar necessidade de índices compostos
    const q = query(
      collection(db, TICKETS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      let tickets: Ticket[] = [];
      
      querySnapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as Ticket);
      });
      
      // Aplicar filtros no cliente
      tickets = tickets.filter(ticket => {
        // REMOVIDO: Filtro para staff - agora todos podem ver todos os tickets
        // Tickets são globais para melhor colaboração e transparência
        
        // Filtro de arquivados
        if (ticket.isArchived === true) {
          return false;
        }
        
        return true;
      });
      
      callback(tickets);
    });
    
  } catch (error) {
    devError('Erro ao configurar listener de tickets:', error);
    throw new Error('Falha ao configurar listener');
  }
};

/**
 * Buscar tickets por hotel (apenas admin)
 */
export const getTicketsByHotel = async (
  hotelId: string,
  currentUser: UserData
): Promise<Ticket[]> => {
  if (currentUser.role !== 'admin') {
    throw new Error('Acesso negado: apenas administradores podem acessar tickets de outros hotéis');
  }
  
  return getTickets({ hotelId }, currentUser);
};

/**
 * Mover ticket para outro status (drag & drop)
 */
export const moveTicketToStatus = async (
  ticketId: string, 
  newStatus: TicketStatus,
  currentUser: UserData
): Promise<void> => {
  await updateTicket(ticketId, { status: newStatus }, currentUser);
};

/**
 * Buscar tickets atrasados
 */
export const getOverdueTickets = async (currentUser: UserData): Promise<Ticket[]> => {
  try {
    const allTickets = await getTickets({}, currentUser);
    const now = new Date();
    
    return allTickets.filter(ticket => {
      if (!ticket.dueDate || ticket.status === 'done') return false;
      return ticket.dueDate.toDate() < now;
    });
    
  } catch (error) {
    devError('Erro ao buscar tickets atrasados:', error);
    throw new Error('Falha ao buscar tickets atrasados');
  }
};