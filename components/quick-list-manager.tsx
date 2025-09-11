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
  X
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
  type DynamicLists
} from '@/lib/dynamic-lists-service';

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
              {getItems().map((item) => {
                const isDefault = isDefaultItem(item, type);
                const isEditing = editingItem === item;

                return (
                  <Card key={item} className="p-3">
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
