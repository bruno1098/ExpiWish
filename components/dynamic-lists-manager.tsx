'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDynamicLists, 
  isDefaultItem,
  addKeyword,
  addProblem,
  addDepartment,
  removeKeyword,
  removeProblem,
  removeDepartment,
  editKeyword,
  editProblem,
  editDepartment,
  DynamicLists 
} from '@/lib/dynamic-lists-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  AlertTriangle,
  Shield,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditState {
  isEditing: boolean;
  originalValue: string;
  newValue: string;
}

export default function DynamicListsManager() {
  const [lists, setLists] = useState<DynamicLists | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState({
    keyword: '',
    problem: '',
    department: ''
  });
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'keyword' | 'problem' | 'department';
    item: string;
  } | null>(null);
  
  const { toast } = useToast();

  // Carregar listas
  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const dynamicLists = await getDynamicLists();
      setLists(dynamicLists);
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as listas dinâmicas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Adicionar novo item
  const handleAddItem = async (type: 'keyword' | 'problem' | 'department') => {
    const value = newItems[type].trim();
    if (!value) return;

    setSaving(true);
    try {
      let success = false;
      
      switch (type) {
        case 'keyword':
          success = await addKeyword(value);
          break;
        case 'problem':
          success = await addProblem(value);
          break;
        case 'department':
          success = await addDepartment(value);
          break;
      }

      if (success) {
        setNewItems(prev => ({ ...prev, [type]: '' }));
        await loadLists();
        toast({
          title: "Sucesso",
          description: `${type === 'keyword' ? 'Palavra-chave' : type === 'problem' ? 'Problema' : 'Departamento'} adicionado com sucesso.`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível adicionar o item. Verifique se ele já existe.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao adicionar o item.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Iniciar edição
  const startEdit = (item: string, type: 'keyword' | 'problem' | 'department') => {
    const key = `${type}-${item}`;
    setEditStates(prev => ({
      ...prev,
      [key]: {
        isEditing: true,
        originalValue: item,
        newValue: item
      }
    }));
  };

  // Cancelar edição
  const cancelEdit = (item: string, type: 'keyword' | 'problem' | 'department') => {
    const key = `${type}-${item}`;
    setEditStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  // Salvar edição
  const saveEdit = async (item: string, type: 'keyword' | 'problem' | 'department') => {
    const key = `${type}-${item}`;
    const editState = editStates[key];
    if (!editState || editState.newValue.trim() === '') return;

    setSaving(true);
    try {
      let success = false;
      
      switch (type) {
        case 'keyword':
          success = await editKeyword(editState.originalValue, editState.newValue.trim());
          break;
        case 'problem':
          success = await editProblem(editState.originalValue, editState.newValue.trim());
          break;
        case 'department':
          success = await editDepartment(editState.originalValue, editState.newValue.trim());
          break;
      }

      if (success) {
        cancelEdit(item, type);
        await loadLists();
        toast({
          title: "Sucesso",
          description: `${type === 'keyword' ? 'Palavra-chave' : type === 'problem' ? 'Problema' : 'Departamento'} editado com sucesso.`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível editar o item. Verifique se o novo valor já existe.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao editar item:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao editar o item.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Confirmar exclusão
  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setSaving(true);
    try {
      let success = false;
      
      switch (deleteConfirm.type) {
        case 'keyword':
          success = await removeKeyword(deleteConfirm.item);
          break;
        case 'problem':
          success = await removeProblem(deleteConfirm.item);
          break;
        case 'department':
          success = await removeDepartment(deleteConfirm.item);
          break;
      }

      if (success) {
        setDeleteConfirm(null);
        await loadLists();
        toast({
          title: "Sucesso",
          description: `${deleteConfirm.type === 'keyword' ? 'Palavra-chave' : deleteConfirm.type === 'problem' ? 'Problema' : 'Departamento'} removido com sucesso.`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível remover o item.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover o item.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Renderizar item da lista
  const renderListItem = (item: string, type: 'keyword' | 'problem' | 'department') => {
    const key = `${type}-${item}`;
    const editState = editStates[key];
    const isDefault = isDefaultItem(item, type);

    if (editState?.isEditing) {
      return (
        <div key={item} className="flex items-center gap-2 p-2 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <Input
            value={editState.newValue}
            onChange={(e) => setEditStates(prev => ({
              ...prev,
              [key]: { ...editState, newValue: e.target.value }
            }))}
            className="flex-1"
            placeholder={`Novo ${type === 'keyword' ? 'palavra-chave' : type === 'problem' ? 'problema' : 'departamento'}`}
          />
          <Button
            size="sm"
            onClick={() => saveEdit(item, type)}
            disabled={saving || !editState.newValue.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => cancelEdit(item, type)}
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div key={item} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <span className="flex-1">{item}</span>
        {isDefault && (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Padrão
          </Badge>
        )}
        {!isDefault && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEdit(item, type)}
              disabled={saving}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteConfirm({ type, item })}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando listas...</span>
      </div>
    );
  }

  if (!lists) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível carregar as listas dinâmicas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gerenciar Listas Dinâmicas</h2>
        <p className="text-muted-foreground">
          Gerencie palavras-chave, problemas e departamentos personalizados criados durante a edição de feedbacks.
          <br />
          <strong>Importante:</strong> Alterações feitas aqui são aplicadas globalmente para todos os hotéis.
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Itens marcados como "Padrão" são parte do sistema e não podem ser editados ou removidos.
          Alterações nas listas personalizadas afetam todos os hotéis da rede.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="keywords" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keywords">Palavras-chave ({lists.keywords.length})</TabsTrigger>
          <TabsTrigger value="problems">Problemas ({lists.problems.length})</TabsTrigger>
          <TabsTrigger value="departments">Departamentos ({lists.departments.length})</TabsTrigger>
        </TabsList>

        {/* Informação da última atualização */}
        {lists.lastUpdatedBy && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-muted-foreground">
            <span>Última atualização: {lists.lastUpdated.toDate().toLocaleString('pt-BR')} por {lists.lastUpdatedBy.name}</span>
          </div>
        )}

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Palavras-chave</CardTitle>
              <CardDescription>
                Gerencie as palavras-chave personalizadas. Alterações são aplicadas globalmente para todos os hotéis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra-chave..."
                  value={newItems.keyword}
                  onChange={(e) => setNewItems(prev => ({ ...prev, keyword: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('keyword')}
                />
                <Button
                  onClick={() => handleAddItem('keyword')}
                  disabled={saving || !newItems.keyword.trim()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lists.keywords.map(keyword => renderListItem(keyword, 'keyword'))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problems" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Problemas</CardTitle>
              <CardDescription>
                Gerencie os problemas personalizados. Alterações são aplicadas globalmente para todos os hotéis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo problema..."
                  value={newItems.problem}
                  onChange={(e) => setNewItems(prev => ({ ...prev, problem: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('problem')}
                />
                <Button
                  onClick={() => handleAddItem('problem')}
                  disabled={saving || !newItems.problem.trim()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lists.problems.map(problem => renderListItem(problem, 'problem'))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Departamentos</CardTitle>
              <CardDescription>
                Gerencie os departamentos personalizados. Alterações são aplicadas globalmente para todos os hotéis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo departamento..."
                  value={newItems.department}
                  onChange={(e) => setNewItems(prev => ({ ...prev, department: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem('department')}
                />
                <Button
                  onClick={() => handleAddItem('department')}
                  disabled={saving || !newItems.department.trim()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lists.departments.map(department => renderListItem(department, 'department'))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover "{deleteConfirm?.item}"?
              <br />
              <strong>Esta ação não pode ser desfeita.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
