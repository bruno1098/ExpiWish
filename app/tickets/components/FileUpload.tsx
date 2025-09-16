"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  Loader2,
  Eye,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketAttachment } from '@/types/ticket';
import { uploadFileAsBase64, isImageFile, validateFileSize, validateFileType, formatFileSize } from '@/lib/file-upload-base64';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FileUploadProps {
  onFilesUploaded?: (attachments: TicketAttachment[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // em bytes
  acceptedTypes?: string[];
  className?: string;
}

export function FileUpload({
  onFilesUploaded,
  maxFiles = 3, 
  maxSizePerFile = 5 * 1024 * 1024, // 5MB - compressão reduzirá automaticamente
  acceptedTypes = ['image/*', '.txt', '.pdf'],
  className
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<TicketAttachment[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload real para Firebase Storage
  const handleFileUpload = async (file: File): Promise<TicketAttachment> => {
    try {
      console.log('Iniciando upload do arquivo:', file.name);
      
      // Validações
      if (!validateFileSize(file, maxSizePerFile)) {
        throw new Error(`Arquivo muito grande. Máximo permitido: ${formatFileSize(maxSizePerFile)}`);
      }
      
      if (!validateFileType(file)) {
        throw new Error('Tipo de arquivo não permitido');
      }
      
      // Converter para base64 com compressão automática
      const uploadResult = await uploadFileAsBase64(file);
      
      // Mostrar informações de compressão se aplicável
      if (uploadResult.compressionRatio) {
        const compressionText = `Imagem comprimida: ${formatFileSize(uploadResult.originalSize)} → ${formatFileSize(uploadResult.size)} (${uploadResult.compressionRatio.toFixed(1)}% menor)`;
        setCompressionInfo(compressionText);
        // Limpar após 5 segundos
        setTimeout(() => setCompressionInfo(null), 5000);
      }
      
      console.log('Upload concluído:', uploadResult);
      
      const attachment: TicketAttachment = {
        id: Math.random().toString(36).substring(7),
        filename: file.name,
        url: uploadResult.url, // Data URL base64 otimizada
        type: file.type,
        size: uploadResult.size, // Tamanho após compressão
        uploadedAt: Timestamp.now(),
        uploadedBy: 'current_user', // TODO: usar usuário real
      };
      
      return attachment;
      
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validações
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const validFiles = fileArray.filter(file => {
      if (file.size > maxSizePerFile) {
        alert(`Arquivo ${file.name} é muito grande. Máximo ${formatFileSize(maxSizePerFile)}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = validFiles.map(file => handleFileUpload(file));
      const newAttachments = await Promise.all(uploadPromises);
      
      const updatedFiles = [...uploadedFiles, ...newAttachments];
      setUploadedFiles(updatedFiles);
      onFilesUploaded?.(updatedFiles);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    const updatedFiles = uploadedFiles.filter(file => file.id !== id);
    setUploadedFiles(updatedFiles);
    onFilesUploaded?.(updatedFiles);
  };

  const localFormatFileSize = (bytes: number) => {
    return formatFileSize(bytes);
  };

  const isImage = (type: string) => type.startsWith('image/');

  // Funcionalidade de paste - configurada após todas as funções
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      console.log('Paste event triggered'); // Debug
      
      if (!e.clipboardData) {
        console.log('No clipboard data');
        return;
      }
      
      const items = Array.from(e.clipboardData.items);
      console.log('Clipboard items:', items.map(item => item.type)); // Debug
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          console.log('Image found in clipboard:', item.type); // Debug
          e.preventDefault();
          
          const file = item.getAsFile();
          if (file) {
            console.log('File obtained:', file.name, file.size); // Debug
            
            // Usar setTimeout para evitar problemas de contexto
            setTimeout(() => {
              handleFiles([file]).catch(err => {
                console.error('Erro ao processar imagem colada:', err);
              });
            }, 100);
          }
          break;
        }
      }
    };

    console.log('Adding paste listener'); // Debug
    document.addEventListener('paste', handlePaste, { passive: false });
    
    return () => {
      console.log('Removing paste listener'); // Debug
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleFiles]); // Incluir handleFiles como dependência

  return (
    <div className={cn("space-y-4", className)}>
      {/* Área de upload */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-6 text-center">
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Fazendo upload dos arquivos...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Clique para selecionar ou arraste arquivos aqui
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Copy className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-blue-600 font-medium">
                    Cole imagem diretamente (Ctrl+V / Cmd+V)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Máximo {maxFiles} arquivos, {formatFileSize(maxSizePerFile)} cada
                </p>
                <p className="text-xs text-muted-foreground">
                  Aceita: imagens, PDF, documentos
                </p>
                <p className="text-xs text-green-600 font-medium">
                  ✨ Imagens são comprimidas automaticamente
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Informações de compressão */}
      {compressionInfo && (
        <Card className="p-3 border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <p className="text-sm text-green-700">
              {compressionInfo}
            </p>
          </div>
        </Card>
      )}

      {/* Lista de arquivos uploadados */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Arquivos Anexados ({uploadedFiles.length})</Label>
          <div className="grid gap-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isImage(file.type) ? (
                      <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {localFormatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isImage(file.type) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreviewImage(file.url);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal de preview de imagem */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview da Imagem</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}