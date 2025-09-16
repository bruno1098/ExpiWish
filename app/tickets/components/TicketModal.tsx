"use client";

import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  Clock,
  User,
  Building,
  Tag,
  MessageSquare,
  Paperclip,
  Edit,
  Trash2,
  Archive,
  MoreHorizontal,
  Send,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Monitor,
  Wrench,
  Sparkles,
  Coffee,
  Users,
  HelpCircle,
  Bot,
  Bug,
  Download,
  Plus,
  RefreshCw,
  FileText,
  Palette,
  Zap,
  TestTube
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Ticket, 
  TicketStatus,
  TicketPriority,
  TicketComment,
  TicketAttachment,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_COLORS
} from '@/types/ticket';
import { UserData } from '@/lib/auth-service';

interface TicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (ticketId: string, status: TicketStatus) => Promise<void>;
  onUpdatePriority?: (ticketId: string, priority: TicketPriority) => Promise<void>;
  onAddComment?: (ticketId: string, comment: string, isInternal?: boolean) => Promise<void>;
  onArchive?: (ticketId: string) => Promise<void>;
  currentUser?: UserData;
  isAdmin?: boolean;
}

// Mapeamento de ícones para categorias
const categoryIcons = {
  fix: Bug,
  feat: Plus,
  style: Palette,
  perf: Zap,
  chore: Wrench,
};

// Mapeamento de ícones para status
const statusIcons = {
  open: AlertTriangle,
  in_progress: Play,
  done: CheckCircle2,
};

// Função utilitária para converter timestamps de forma segura
const safeToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  
  // Se já é uma instância de Date
  if (timestamp instanceof Date) return timestamp;
  
  // Se tem método toDate (Timestamp do Firebase)
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Se é um objeto com seconds (formato serializado do Firestore)
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  // Fallback para string ou number
  return new Date(timestamp);
};

export function TicketModal({
  ticket,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onAddComment,
  onArchive,
  currentUser,
  isAdmin = false
}: TicketModalProps) {
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentType, setCommentType] = useState<'public' | 'internal'>('public');
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);

  if (!ticket) return null;

  const CategoryIcon = categoryIcons[ticket.category] || HelpCircle;
  const StatusIcon = statusIcons[ticket.status] || AlertTriangle;
  
  // Calcular se o ticket está atrasado
  const isOverdue = ticket.dueDate && 
    ticket.status !== 'done' && 
    safeToDate(ticket.dueDate) < new Date();
  
  // Calcular iniciais do criador
  const creatorInitials = ticket.createdBy.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Pode editar se for admin ou se criou o ticket
  const canEdit = isAdmin || (currentUser && ticket.createdBy.uid === currentUser.uid);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (onUpdateStatus) {
      await onUpdateStatus(ticket.id, newStatus);
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (onUpdatePriority) {
      await onUpdatePriority(ticket.id, newPriority);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment) return;
    
    setIsAddingComment(true);
    try {
      await onAddComment(ticket.id, newComment.trim(), commentType === 'internal');
      setNewComment('');
      setCommentType('public');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleArchive = async () => {
    if (onArchive) {
      await onArchive(ticket.id);
      onClose();
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                TICKET_PRIORITY_COLORS[ticket.priority]
              )}>
                <CategoryIcon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold leading-tight pr-8">
                  {ticket.title}
                </DialogTitle>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="secondary" className={cn("text-xs", TICKET_STATUS_COLORS[ticket.status])}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </Badge>
                  
                  <Badge variant="outline" className="text-xs">
                    {TICKET_CATEGORY_LABELS[ticket.category]}
                  </Badge>
                  
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      ticket.priority === 'high' && "border-red-500 text-red-700 dark:text-red-400",
                      ticket.priority === 'medium' && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                      ticket.priority === 'low' && "border-green-500 text-green-700 dark:text-green-400"
                    )}
                  >
                    {TICKET_PRIORITY_LABELS[ticket.priority]}
                  </Badge>
                  
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Atrasado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions dropdown */}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {/* TODO: Edit ticket */}}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Informações principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground">Criado por</div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {creatorInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{ticket.createdBy.name}</div>
                  {ticket.createdBy.hotelName && (
                    <div className="text-xs text-muted-foreground">
                      {ticket.createdBy.hotelName}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Criado em</div>
              <div>
                {format(safeToDate(ticket.createdAt), "PPP 'às' pp", { locale: ptBR })}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(safeToDate(ticket.createdAt), { addSuffix: true, locale: ptBR })}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Última atualização</div>
              <div>
                {format(safeToDate(ticket.updatedAt), "PPP 'às' pp", { locale: ptBR })}
              </div>
            </div>
          </div>

          {/* Data de vencimento e horas estimadas */}
          {(ticket.dueDate || ticket.estimatedHours) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {ticket.dueDate && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Prazo</div>
                  <div className={cn(
                    "flex items-center gap-2",
                    isOverdue && "text-red-600 dark:text-red-400 font-medium"
                  )}>
                    <Calendar className="h-4 w-4" />
                    {format(safeToDate(ticket.dueDate), "PPP", { locale: ptBR })}
                  </div>
                </div>
              )}
              
              {ticket.estimatedHours && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Estimativa</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {ticket.estimatedHours}h
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Tags</div>
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Descrição</div>
            <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Anexos */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos ({ticket.attachments.length})
              </div>
              <div className="grid gap-2">
                {ticket.attachments.map((attachment) => (
                  <div 
                    key={attachment.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {attachment.type.startsWith('image/') ? (
                        <div className="relative">
                          <img 
                            src={attachment.url} 
                            alt={attachment.filename}
                            className="h-10 w-10 object-cover rounded border"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded border flex items-center justify-center">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {attachment.filename}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(attachment.size / 1024)}KB
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (attachment.type.startsWith('image/')) {
                          // Para imagens, abrir modal de preview
                          setPreviewAttachment(attachment);
                        } else {
                          // Para outros arquivos, tentar download
                          const link = document.createElement('a');
                          link.href = attachment.url;
                          link.download = attachment.filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="flex-shrink-0"
                    >
                      {attachment.type.startsWith('image/') ? 'Preview' : 'Download'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status e Priority Actions para Admin */}
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Alterar Status</div>
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Alterar Prioridade</div>
                <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Histórico de status */}
          {ticket.statusHistory && ticket.statusHistory.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Histórico</div>
              <div className="space-y-2">
                {ticket.statusHistory.map((history) => (
                  <div key={history.id} className="flex items-center gap-3 text-sm p-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-1">
                      {history.fromStatus && <ArrowLeft className="h-3 w-3" />}
                      <Badge variant="outline" className="text-xs">
                        {history.toStatus === 'open' && 'Aberto'}
                        {history.toStatus === 'in_progress' && 'Em Andamento'}
                        {history.toStatus === 'done' && 'Concluído'}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      por <span className="font-medium">{history.changedBy.name}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatDistanceToNow(safeToDate(history.changedAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentários */}
          <div className="space-y-4">
            <div className="text-sm font-medium">Comentários</div>
            
            {/* Lista de comentários */}
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-3">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="text-xs">
                        {comment.createdBy.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.createdBy.name}</span>
                        {comment.isInternal && (
                          <Badge variant="secondary" className="text-xs">
                            Interno
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(safeToDate(comment.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhum comentário ainda
              </div>
            )}

            {/* Adicionar comentário */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Adicionar comentário</span>
                {isAdmin && (
                  <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    size="sm"
                    className="gap-2"
                  >
                    <Send className="h-3 w-3" />
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Preview de Anexo */}
    {previewAttachment && (
      <Dialog open={true} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewAttachment.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewAttachment.type.startsWith('image/') ? (
              <div className="flex justify-center">
                <img 
                  src={previewAttachment.url} 
                  alt={previewAttachment.filename}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-8 bg-muted rounded-lg">
                  <Paperclip className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Preview não disponível para este tipo de arquivo
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewAttachment.url;
                    link.download = previewAttachment.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar Arquivo
                </Button>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground text-center">
              <p>Tamanho: {Math.round(previewAttachment.size / 1024)}KB</p>
              <p>Tipo: {previewAttachment.type}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
}