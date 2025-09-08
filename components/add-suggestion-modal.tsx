"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddSuggestionModalProps {
  feedbackId: string;
  onSuggestionAdded?: (feedbackId: string, suggestion: string, suggestionType: 'only' | 'mixed') => void;
}

export const AddSuggestionModal: React.FC<AddSuggestionModalProps> = ({
  feedbackId,
  onSuggestionAdded
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionType, setSuggestionType] = useState<'only' | 'mixed'>('only');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!suggestion.trim()) {
      toast.error('Por favor, digite uma sugestão');
      return;
    }

    setIsLoading(true);
    
    try {
      // Aqui você pode adicionar a chamada para a API
      // Por enquanto, vamos simular o salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Chamar callback se fornecido
      if (onSuggestionAdded) {
        onSuggestionAdded(feedbackId, suggestion, suggestionType);
      }
      
      toast.success('Sugestão adicionada com sucesso!');
      
      // Limpar formulário e fechar modal
      setSuggestion('');
      setSuggestionType('only');
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar sugestão:', error);
      toast.error('Erro ao adicionar sugestão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSuggestion('');
    setSuggestionType('only');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs h-7 px-2"
          title="Adicionar sugestão manualmente"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Sugestão
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            Adicionar Sugestão Manual
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="suggestion-type">Tipo de Sugestão</Label>
            <Select value={suggestionType} onValueChange={(value: 'only' | 'mixed') => setSuggestionType(value)}>
              <SelectTrigger id="suggestion-type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="only">Apenas Sugestão</SelectItem>
                <SelectItem value="mixed">Mista (Problema + Sugestão)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="suggestion-text">Texto da Sugestão</Label>
            <Textarea
              id="suggestion-text"
              placeholder="Digite a sugestão que você identificou neste feedback..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            <p>💡 <strong>Dica:</strong> Seja específico e construtivo na sugestão.</p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !suggestion.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Adicionar Sugestão'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};