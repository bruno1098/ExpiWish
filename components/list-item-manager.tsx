'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Pencil, 
  Trash2, 
  MoreHorizontal, 
  Save, 
  Shield,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  isDefaultItem,
  removeKeyword,
  removeProblem,
  removeDepartment,
  editKeyword,
  editProblem,
  editDepartment
} from '@/lib/dynamic-lists-service';

interface ListItemManagerProps {
  item: string;
  type: 'keyword' | 'problem' | 'department';
  onItemUpdated: () => void;
  className?: string;
}

export default function ListItemManager({ item, type, onItemUpdated, className }: ListItemManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editValue, setEditValue] = useState(item);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();
  const isDefault = isDefaultItem(item, type);

  const getTypeLabel = () => {
    switch (type) {
      case 'keyword': return 'palavra-chave';
      case 'problem': return 'problema';
      case 'department': return 'departamento';
      default: return 'item';
    }
  };

  const handleEdit = async () => {
    if (editValue.trim() === '' || editValue.trim() === item) {
      setEditDialogOpen(false);
      setEditValue(item);
      return;
    }

    setIsEditing(true);
    try {
      let success = false;
      
      switch (type) {
        case 'keyword':
          success = await editKeyword(item, editValue.trim());
          break;
        case 'problem':
          success = await editProblem(item, editValue.trim());
          break;
        case 'department':
          success = await editDepartment(item, editValue.trim());
          break;
      }

      if (success) {
        toast({
          title: "Sucesso",
          description: `${getTypeLabel().charAt(0).toUpperCase() + getTypeLabel().slice(1)} editado com sucesso.`,
        });
        setEditDialogOpen(false);
        onItemUpdated();
      } else {
        toast({
          title: "Erro",
          description: `Não foi possível editar o ${getTypeLabel()}. Verifique se o novo valor já existe.`,
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
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
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
        setDeleteDialogOpen(false);
        onItemUpdated();
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
      setIsDeleting(false);
    }
  };

  // Prevenir propagação do evento para o SelectItem
  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (isDefault) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs ml-auto shrink-0">
        <Shield className="h-3 w-3" />
        Padrão
      </Badge>
    );
  }

  return (
    <>
      <div className={`ml-auto shrink-0 ${className || ''}`} onClick={handleMenuClick}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
              onClick={handleMenuClick}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={handleMenuClick}>
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-3 w-3 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog de edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {getTypeLabel()}</DialogTitle>
            <DialogDescription>
              Modifique o {getTypeLabel()} abaixo. Esta alteração será aplicada globalmente para todos os hotéis.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`Novo ${getTypeLabel()}...`}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialogOpen(false);
                setEditValue(item);
              }}
              disabled={isEditing}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editValue.trim()}>
              {isEditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover "{item}"?
              <br />
              <strong>Esta ação não pode ser desfeita e afetará todos os hotéis.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isDeleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
