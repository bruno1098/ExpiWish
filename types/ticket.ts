import { Timestamp } from 'firebase/firestore';

// Status possíveis do ticket
export type TicketStatus = 'open' | 'in_progress' | 'done';

// Prioridade do ticket
export type TicketPriority = 'low' | 'medium' | 'high';

// Categoria do ticket
export type TicketCategory = 
  | 'fix'        // Correção de bug ou problema
  | 'feat'       // Nova funcionalidade
  | 'style'      // UI/UX melhorias
  | 'perf'       // Performance
  | 'chore';     // Manutenção/tarefas gerais

// Interface principal do ticket
export interface Ticket {
  id: string;
  title: string;
  description?: string; // Opcional também no ticket principal
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  createdBy: {
    uid: string;
    name: string;
    email: string;
    hotelId?: string;
    hotelName?: string;
  };
  assignedTo?: {
    uid: string;
    name: string;
    email: string;
  };
  attachments?: TicketAttachment[];
  comments?: TicketComment[];
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  isArchived?: boolean;
  // Campos para auditoria
  statusHistory?: TicketStatusHistory[];
}

// Interface para anexos
export interface TicketAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string; // MIME type
  uploadedAt: Timestamp;
  uploadedBy: string;
  path?: string; // Caminho no Storage para poder deletar
}

// Interface para comentários
export interface TicketComment {
  id: string;
  content: string;
  createdAt: Timestamp;
  createdBy: {
    uid: string;
    name: string;
    email: string;
  };
  isInternal: boolean; // Comentário interno (apenas admins veem)
  attachments?: TicketAttachment[];
}

// Histórico de mudanças de status
export interface TicketStatusHistory {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedAt: Timestamp;
  changedBy: {
    uid: string;
    name: string;
    email: string;
  };
  comment?: string;
}

// Interface para estatísticas de tickets
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  done: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byCategory: Record<TicketCategory, number>;
  avgResolutionTime: number; // em horas
}

// Filtros para busca de tickets
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  createdBy?: string;
  assignedTo?: string;
  hotelId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  searchQuery?: string;
}

// Interface para criação de ticket (dados do formulário)
export interface CreateTicketData {
  title: string;
  description?: string; // Agora é opcional
  priority: TicketPriority;
  category: TicketCategory;
  dueDate?: Date;
  tags?: string[];
  attachments?: TicketAttachment[];
  estimatedHours?: number;
}

// Interface para atualização de ticket
export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  dueDate?: Date;
  assignedTo?: {
    uid: string;
    name: string;
    email: string;
  } | null;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}

// Labels para exibição
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  done: 'Concluído'
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  fix: '🐛 Correção de Problema',
  feat: '✨ Nova Funcionalidade',
  style: '💄 Melhoria Visual',
  perf: '⚡ Otimização',
  chore: '🔧 Manutenção Geral'
};

// Cores para prioridades
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  high: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  low: 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
};

// Cores para status
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
};

// Ícones para categorias (Lucide React)
export const TICKET_CATEGORY_ICONS: Record<TicketCategory, string> = {
  fix: 'Bug',
  feat: 'Plus',
  style: 'Palette',
  perf: 'Zap',
  chore: 'Wrench'
};