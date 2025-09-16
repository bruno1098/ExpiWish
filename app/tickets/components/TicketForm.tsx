"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  Tag,
  Upload,
  X,
  Plus,
  Loader2,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CreateTicketData, 
  TicketPriority,
  TicketCategory,
  TicketAttachment,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS 
} from '@/types/ticket';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileUpload } from './FileUpload';

// Esquema de validação com Zod
const ticketSchema = z.object({
  title: z.string()
    .min(5, 'Título deve ter pelo menos 5 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  description: z.string().optional(), // Agora é opcional
  priority: z.enum(['low', 'medium', 'high'] as const),
  category: z.enum(['fix', 'feat', 'style', 'perf', 'chore'] as const),
  dueDate: z.date().optional(),
  estimatedHours: z.number().min(0.5).max(100).optional(),
  tags: z.array(z.string()).max(10).optional()
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  onSubmit: (data: CreateTicketData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

// Predefined tags para problemas da plataforma
const PLATFORM_TAGS = [
  'bug', 
  'performance', 
  'ui/ux', 
  'api', 
  'database', 
  'authentication', 
  'analytics', 
  'import', 
  'export', 
  'dashboard', 
  'mobile', 
  'security',
  'feature-request',
  'documentation',
  'integration',
  'openai',
  'gpt',
  'classification',
  'feedback-analysis',
  'sentiment',
  'keywords'
];

// Descrições das categorias focadas em desenvolvimento
const CATEGORY_DESCRIPTIONS: Record<TicketCategory, string> = {
  fix: 'Correção de bugs, problemas de funcionalidade ou erros do sistema',
  feat: 'Implementação de novas funcionalidades ou melhorias',
  style: 'Melhorias na interface, design ou experiência do usuário',
  perf: 'Otimizações de performance e velocidade do sistema',
  chore: 'Tarefas de manutenção, configurações e melhorias gerais'
};

export function TicketForm({ 
  onSubmit, 
  onCancel, 
  loading = false,
  className 
}: TicketFormProps) {
  const [customTag, setCustomTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  
  // Estados para controlar campos opcionais
  const [showOptionals, setShowOptionals] = useState(false);
  const [activeOptionals, setActiveOptionals] = useState<Set<string>>(new Set());

  // Opções disponíveis para adicionar
  const optionalFields = [
    { id: 'dueDate', label: '📅 Prazo', icon: 'Calendar' },
    { id: 'estimatedHours', label: '⏱️ Tempo Estimado', icon: 'Clock' },
    { id: 'tags', label: '🏷️ Tags', icon: 'Tag' }
  ];

  const toggleOptional = (fieldId: string) => {
    const newActiveOptionals = new Set(activeOptionals);
    if (newActiveOptionals.has(fieldId)) {
      newActiveOptionals.delete(fieldId);
    } else {
      newActiveOptionals.add(fieldId);
    }
    setActiveOptionals(newActiveOptionals);
  };

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      category: 'fix', // Mudado para 'fix' como padrão
      tags: []
    }
  });

  const handleSubmit = async (data: TicketFormData) => {
    try {
      const submitData: CreateTicketData = {
        ...data,
        tags: selectedTags,
        attachments: attachments,
        // Se description estiver vazia, não enviar
        description: data.description && data.description.trim() ? data.description.trim() : undefined
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim().toLowerCase());
      setCustomTag('');
    }
  };

  return (
    <Card className={cn("max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Novo Ticket da Plataforma
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reporte bugs, solicite features ou melhorias na plataforma ExpiWish
        </p>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Problema/Solicitação *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Dashboard não carrega dados de análise"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Seja específico e claro sobre o problema
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria e Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div>
                              <div className="font-medium">{label}</div>
                              <div className="text-xs text-muted-foreground">
                                {CATEGORY_DESCRIPTIONS[value as TicketCategory]}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            {TICKET_PRIORITY_LABELS.low}
                            <span className="text-xs text-muted-foreground">- Pode aguardar</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            {TICKET_PRIORITY_LABELS.medium}
                            <span className="text-xs text-muted-foreground">- Importante</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            {TICKET_PRIORITY_LABELS.high}
                            <span className="text-xs text-muted-foreground">- Urgente</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição Detalhada - sempre visível */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva detalhes adicionais sobre o problema ou solicitação..."
                      className="min-h-[80px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Adicione mais contexto que possa ajudar na resolução
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload de arquivos - sempre visível */}
            <div className="space-y-3">
              <Label>Anexos (Opcional)</Label>
              <FileUpload 
                onFilesUploaded={setAttachments}
                maxFiles={5}
                maxSizePerFile={10 * 1024 * 1024} // 10MB
              />
            </div>

            {/* Botão para Campos Opcionais */}
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOptionals(!showOptionals)}
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Adicionar Campos Opcionais
                {showOptionals ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {/* Lista de Opcionais Disponíveis */}
              {showOptionals && (
                <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                  <h4 className="text-sm font-medium mb-3">Selecione o que deseja adicionar:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {optionalFields.map((field) => (
                      <Button
                        key={field.id}
                        type="button"
                        variant={activeOptionals.has(field.id) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleOptional(field.id)}
                        className="justify-start"
                      >
                        {field.label}
                        {activeOptionals.has(field.id) && (
                          <X className="h-3 w-3 ml-auto" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Campos Opcionais Ativados */}
            {activeOptionals.has('description') && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>📝 Descrição Detalhada</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhes adicionais se necessário..."
                        className="min-h-[80px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Adicione mais contexto sobre o problema ou solicitação
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {activeOptionals.has('description') && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>📝 Descrição Detalhada</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhes adicionais se necessário..."
                        className="min-h-[80px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Adicione mais contexto sobre o problema ou solicitação
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Data de Prazo */}
            {activeOptionals.has('dueDate') && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>📅 Prazo</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Data limite para resolução
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Horas Estimadas */}
            {activeOptionals.has('estimatedHours') && (
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>⏱️ Tempo Estimado (horas)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.5" 
                        max="100" 
                        step="0.5"
                        placeholder="Ex: 2.5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimativa de tempo para resolução
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tags */}
            {activeOptionals.has('tags') && (
              <div className="space-y-3">
                <Label>🏷️ Tags</Label>
                <div className="space-y-3">
                  {/* Tags selecionadas */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tags predefinidas */}
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_TAGS
                      .filter(tag => !selectedTags.includes(tag))
                      .slice(0, 8)
                      .map((tag) => (
                        <Button
                          key={tag}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => addTag(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                  </div>

                  {/* Custom tag input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar tag personalizada"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomTag}
                      disabled={!customTag.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 pt-6">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Criar Ticket
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}