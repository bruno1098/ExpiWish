'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Pencil, 
  Trash2, 
  Settings,
  Shield,
  Loader2,
  Plus,
  X,
  GripVertical,
  Folder,
  List
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  isDefaultItem,
  removeKeyword,
  removeProblem,
  removeDepartment,
  editKeyword,
  editProblem,
  editDepartment,
  addKeyword,
  addProblem,
  addDepartment,
  moveKeywordToDepartment,
  type DynamicLists
} from '@/lib/dynamic-lists-service';

// Função para organizar keywords por tópicos/departamentos
const organizeKeywordsByTopics = (allKeywords: string[]) => {
  const topics: Record<string, string[]> = {}
  
  // Definir a ordem dos tópicos
  const topicOrder = ['A&B', 'Governança', 'Limpeza', 'Manutenção', 'Lazer', 'TI', 'Operações', 'Recepção', 'Qualidade', 'Comercial', 'Programa de vendas', 'Outros']
  
  // Agrupar keywords por tópicos
  allKeywords.forEach(keyword => {
    let topic = 'Outros' // Fallback padrão
    
    // Identificar tópico baseado no prefixo da keyword
    if (keyword.startsWith('A&B')) {
      topic = 'A&B'
    } else if (keyword.startsWith('Governança') || keyword === 'Enxoval' || keyword === 'Travesseiro' || keyword === 'Colchão' || keyword === 'Espelho') {
      topic = 'Governança'  
    } else if (keyword.startsWith('Limpeza')) {
      topic = 'Limpeza'
    } else if (keyword.startsWith('Manutenção') || keyword === 'Ar-condicionado' || keyword === 'Elevador' || keyword === 'Frigobar' || keyword === 'Infraestrutura') {
      topic = 'Manutenção'
    } else if (keyword.startsWith('Lazer') || keyword === 'Spa' || keyword === 'Piscina' || keyword === 'Recreação' || keyword === 'Mixologia') {
      topic = 'Lazer'
    } else if (keyword.startsWith('Tecnologia')) {
      topic = 'TI'
    } else if (keyword.startsWith('Recepção') || keyword.startsWith('Check-in') || keyword.startsWith('Check-out')) {
      topic = 'Recepção'
    } else if (keyword === 'Comunicação') {
      topic = 'Qualidade'
    } else if (keyword === 'Reservas') {
      topic = 'Comercial'
    } else if (keyword === 'Concierge' || keyword === 'Cotas') {
      topic = 'Programa de vendas'
    } else if (keyword === 'Atendimento' || keyword === 'Acessibilidade' || keyword === 'Reserva de cadeiras (pool)' || keyword === 'Processo' || keyword === 'Custo-benefício' || keyword === 'Estacionamento' || keyword === 'Água' || keyword === 'Localização') {
      topic = 'Operações'
    }
    
    if (!topics[topic]) {
      topics[topic] = []
    }
    topics[topic].push(keyword)
  })
  
  // Ordenar keywords dentro de cada tópico
  Object.keys(topics).forEach(topic => {
    topics[topic].sort()
  })
  
  // Retornar apenas tópicos que têm keywords, na ordem definida
  const result: Record<string, string[]> = {}
  topicOrder.forEach(topic => {
    if (topics[topic] && topics[topic].length > 0) {
      result[topic] = topics[topic]
    }
  })
  
  return result
}

// Função para detectar de qual tópico uma keyword pertence
const getKeywordTopic = (keyword: string): string => {
  if (keyword.startsWith('A&B')) return 'A&B'
  if (keyword.startsWith('Governança') || ['Enxoval', 'Travesseiro', 'Colchão', 'Espelho'].includes(keyword)) return 'Governança'
  if (keyword.startsWith('Limpeza')) return 'Limpeza'
  if (keyword.startsWith('Manutenção') || ['Ar-condicionado', 'Elevador', 'Frigobar', 'Infraestrutura'].includes(keyword)) return 'Manutenção'
  if (keyword.startsWith('Lazer') || ['Spa', 'Piscina', 'Recreação', 'Mixologia'].includes(keyword)) return 'Lazer'
  if (keyword.startsWith('Tecnologia')) return 'TI'
  if (keyword.startsWith('Recepção') || keyword.startsWith('Check-in') || keyword.startsWith('Check-out')) return 'Recepção'
  if (keyword === 'Comunicação') return 'Qualidade'
  if (keyword === 'Reservas') return 'Comercial'
  if (['Concierge', 'Cotas'].includes(keyword)) return 'Programa de vendas'
  if (['Atendimento', 'Acessibilidade', 'Reserva de cadeiras (pool)', 'Processo', 'Custo-benefício', 'Estacionamento', 'Água', 'Localização'].includes(keyword)) return 'Operações'
  return 'Outros'
}

interface QuickListManagerProps {
  type: 'keyword' | 'problem' | 'department';
  lists: DynamicLists;
  onListsUpdated: () => void;
  currentValue: string;
  onValueChange: (value: string) => void;
}

export default function QuickListManager({ type, lists, onListsUpdated, currentValue, onValueChange }: QuickListManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dragOverTopic, setDragOverTopic] = useState<string | null>(null); // Para drop zones dos tópicos
  const [organizedView, setOrganizedView] = useState(true); // Estado para view organizada
  
  const { toast } = useToast();

  const getTypeLabel = () => {
    switch (type) {
      case 'keyword': return 'palavra-chave';
      case 'problem': return 'problema';
      case 'department': return 'departamento';
      default: return 'item';
    }
  };

  const getItems = () => {
    switch (type) {
      case 'keyword': return lists.keywords;
      case 'problem': return lists.problems;
      case 'department': return lists.departments;
      default: return [];
    }
  };

  const handleAdd = async () => {
    if (!newItemValue.trim()) return;

    setIsLoading(true);
    try {
      let success = false;
      
      switch (type) {
        case 'keyword':
          success = await addKeyword(newItemValue.trim());
          break;
        case 'problem':
          success = await addProblem(newItemValue.trim());
          break;
        case 'department':
          success = await addDepartment(newItemValue.trim());
          break;
      }

      if (success) {
        toast({
          title: "Sucesso",
          description: `${getTypeLabel().charAt(0).toUpperCase() + getTypeLabel().slice(1)} adicionado com sucesso.`,
        });
        setNewItemValue('');
        onListsUpdated();
      } else {
        toast({
          title: "Erro",
          description: `Não foi possível adicionar o ${getTypeLabel()}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: `Ocorreu um erro ao adicionar o ${getTypeLabel()}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (oldItem: string) => {
    if (!editValue.trim() || editValue.trim() === oldItem) {
      setEditingItem(null);
      setEditValue('');
      return;
    }

    setIsLoading(true);
    try {
      let success = false;
      
      switch (type) {
        case 'keyword':
          success = await editKeyword(oldItem, editValue.trim());
          break;
        case 'problem':
          success = await editProblem(oldItem, editValue.trim());
          break;
        case 'department':
          success = await editDepartment(oldItem, editValue.trim());
          break;
      }

      if (success) {
        toast({
          title: "Sucesso",
          description: `${getTypeLabel().charAt(0).toUpperCase() + getTypeLabel().slice(1)} editado com sucesso.`,
        });
        setEditingItem(null);
        setEditValue('');
        
        // Se era o item selecionado, atualizar a seleção
        if (currentValue === oldItem) {
          onValueChange(editValue.trim());
        }
        
        onListsUpdated();
      } else {
        toast({
          title: "Erro",
          description: `Não foi possível editar o ${getTypeLabel()}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao editar item:', error);
      toast({
        title: "Erro",
        description: `Ocorreu um erro ao editar o ${getTypeLabel()}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: string) => {
    setIsLoading(true);
    try {
      let success = false;
      
      switch (type) {
        case 'keyword':
          success = await removeKeyword(item);
          break;
        case 'problem':
          success = await removeProblem(item);
          break;
        case 'department':
          success = await removeDepartment(item);
          break;
      }

      if (success) {
        toast({
          title: "Sucesso",
          description: `${getTypeLabel().charAt(0).toUpperCase() + getTypeLabel().slice(1)} removido com sucesso.`,
        });
        setDeleteConfirm(null);
        
        // Se era o item selecionado, limpar a seleção
        if (currentValue === item) {
          onValueChange('');
        }
        
        onListsUpdated();
      } else {
        toast({
          title: "Erro",
          description: `Não foi possível remover o ${getTypeLabel()}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast({
        title: "Erro",
        description: `Ocorreu um erro ao remover o ${getTypeLabel()}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
    }
  };

  const startEdit = (item: string) => {
    setEditingItem(item);
    setEditValue(item);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  // Funções de drag & drop
  const handleDragStart = (e: React.DragEvent, item: string) => {
    console.log('🚀 handleDragStart:', item);
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, item: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetItem: string) => {
    e.preventDefault();
    const sourceItem = e.dataTransfer.getData('text/plain');
    
    if (sourceItem !== targetItem) {
      // Simular reordenação (por enquanto apenas visual)
      toast({
        title: "Item Reordenado",
        description: `"${sourceItem}" movido para a posição de "${targetItem}"`,
      });
      console.log(`Drag & Drop: ${sourceItem} → ${targetItem}`);
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setDragOverTopic(null);
  };

  // Funções específicas para drag & drop entre tópicos
  const handleTopicDragOver = (e: React.DragEvent, topic: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTopic(topic);
  };

  const handleTopicDragLeave = (e: React.DragEvent) => {
    // Só limpar se realmente saiu da área (não foi para um elemento filho)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverTopic(null);
    }
  };

  const handleTopicDrop = async (e: React.DragEvent, targetTopic: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedKeyword = e.dataTransfer.getData('text/plain');
    console.log('🎯 handleTopicDrop chamado:', { draggedKeyword, targetTopic });
    
    if (!draggedKeyword) {
      console.log('❌ Nenhuma keyword arrastada encontrada');
      return;
    }
    
    const sourceTopic = getKeywordTopic(draggedKeyword);
    console.log('📍 Tópicos:', { sourceTopic, targetTopic });
    
    if (sourceTopic === targetTopic) {
      console.log('⚠️ Mesmo tópico, cancelando...');
      setDragOverTopic(null);
      return; // Não fazer nada se for o mesmo tópico
    }
    
    setIsLoading(true);
    try {
      console.log('🔄 Movendo keyword...');
      const success = await moveKeywordToDepartment(draggedKeyword, sourceTopic, targetTopic);
      
      if (success) {
        toast({
          title: "Palavra-chave movida",
          description: `"${draggedKeyword}" foi movida para ${targetTopic}`,
        });
        console.log('✅ Movimento bem-sucedido, atualizando lista...');
        onListsUpdated(); // Atualizar a lista
      } else {
        console.log('❌ Movimento falhou');
        toast({
          title: "Erro",
          description: "Não foi possível mover a palavra-chave",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Erro ao mover keyword:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao mover a palavra-chave",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDragOverTopic(null);
      setDraggedItem(null);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="ml-2 gap-1 h-7"
      >
        <Settings className="h-3 w-3" />
        Gerenciar
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar {getTypeLabel()}s</DialogTitle>
            <DialogDescription>
              Adicione, edite ou remova {getTypeLabel()}s. Alterações são aplicadas globalmente.
            </DialogDescription>
            
            {/* Botão para alternar visualização - apenas para keywords */}
            {type === 'keyword' && (
              <div className="flex justify-end mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOrganizedView(!organizedView)}
                  className="flex items-center gap-2 text-xs"
                >
                  {organizedView ? <List className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                  {organizedView ? 'Lista simples' : 'Por pastas'}
                </Button>
              </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Adicionar novo item */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={`Novo ${getTypeLabel()}...`}
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                className="flex-1"
              />
              <Button 
                onClick={handleAdd} 
                disabled={!newItemValue.trim() || isLoading}
                size="sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {type === 'keyword' && organizedView ? (
                // Visualização organizada por tópicos
                Object.entries(organizeKeywordsByTopics(getItems())).map(([topic, keywords]) => (
                  <div 
                    key={topic} 
                    className={`mb-4 p-2 rounded-lg transition-all duration-200 ${
                      dragOverTopic === topic 
                        ? 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-500 border-dashed' 
                        : 'hover:bg-gray-25 dark:hover:bg-gray-850'
                    }`}
                    onDragOver={(e) => handleTopicDragOver(e, topic)}
                    onDragLeave={handleTopicDragLeave}
                    onDrop={(e) => handleTopicDrop(e, topic)}
                  >
                    <div className="flex items-center gap-2 mb-2 px-2 py-1">
                      <Folder className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">{topic}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {keywords.length}
                      </span>
                      {dragOverTopic === topic && (
                        <span className="text-xs text-blue-600 font-medium ml-auto">
                          Solte aqui
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 ml-6">
                      {keywords.map((item) => {
                        const isDefault = isDefaultItem(item, type);
                        const isEditing = editingItem === item;

                        return (
                          <Card 
                            key={item} 
                            className={`p-2 transition-all duration-200 ${
                              draggedItem === item ? 'opacity-50 scale-95' : ''
                            } ${
                              dragOverItem === item ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' : ''
                            }`}
                            draggable={!isDefault && !isEditing}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragOver={(e) => handleDragOver(e, item)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, item)}
                            onDragEnd={handleDragEnd}
                          >
                            {isEditing ? (
                              <div className="flex gap-2 items-center">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1 h-8 text-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleEdit(item);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  autoFocus
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => handleEdit(item)}
                                  disabled={!editValue.trim() || isLoading}
                                  className="h-8 w-8 p-0"
                                >
                                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={cancelEdit}
                                  disabled={isLoading}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <div className={`p-1 rounded ${
                                    !isDefault && !isEditing 
                                      ? 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700' 
                                      : 'cursor-not-allowed opacity-50'
                                  }`}>
                                    <GripVertical className={`h-3 w-3 ${
                                      !isDefault && !isEditing ? 'text-gray-600' : 'text-gray-300'
                                    }`} />
                                  </div>
                                  <span className="text-sm">{item}</span>
                                  {isDefault && (
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                      <Shield className="h-3 w-3" />
                                      Padrão
                                    </Badge>
                                  )}
                                  {currentValue === item && (
                                    <Badge variant="default" className="text-xs">
                                      Selecionado
                                    </Badge>
                                  )}
                                </div>
                                {!isDefault && (
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => startEdit(item)}
                                      disabled={isLoading}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => setDeleteConfirm(item)}
                                      disabled={isLoading}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                // Visualização em lista simples (padrão para outros tipos)
                getItems().map((item) => {
                  const isDefault = isDefaultItem(item, type);
                  const isEditing = editingItem === item;

                  return (
                    <Card 
                      key={item} 
                      className={`p-3 transition-all duration-200 ${
                        draggedItem === item ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverItem === item ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' : ''
                      }`}
                      draggable={!isDefault && !isEditing}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragOver={(e) => handleDragOver(e, item)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item)}
                      onDragEnd={handleDragEnd}
                    >
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleEdit(item);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleEdit(item)}
                            disabled={!editValue.trim() || isLoading}
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={cancelEdit}
                            disabled={isLoading}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`p-1 rounded ${
                              !isDefault && !isEditing 
                                ? 'cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700' 
                                : 'cursor-not-allowed opacity-50'
                            }`}>
                              <GripVertical className={`h-4 w-4 ${
                                !isDefault && !isEditing ? 'text-gray-600' : 'text-gray-300'
                              }`} />
                            </div>
                            <span className="text-sm">{item}</span>
                            {isDefault && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Shield className="h-3 w-3" />
                                Padrão
                              </Badge>
                            )}
                            {currentValue === item && (
                              <Badge variant="default" className="text-xs">
                                Selecionado
                              </Badge>
                            )}
                          </div>
                          {!isDefault && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => startEdit(item)}
                                disabled={isLoading}
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setDeleteConfirm(item)}
                                disabled={isLoading}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover "{deleteConfirm}"?
              <br />
              <strong>Esta ação não pode ser desfeita e afetará todos os hotéis.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirm(null)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isLoading ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
