import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { devLog, devError } from './dev-logger';

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
}

/**
 * Upload de arquivo para Firebase Storage
 */
export const uploadFile = async (
  file: File, 
  folder: string = 'tickets',
  ticketId?: string
): Promise<UploadResult> => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'bin';
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
    
    // Definir caminho no Storage
    const folderPath = ticketId ? `${folder}/${ticketId}` : folder;
    const filePath = `${folderPath}/${fileName}`;
    const storageRef = ref(storage, filePath);
    
    devLog('Iniciando upload:', { fileName, filePath, size: file.size });
    
    // Upload do arquivo
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const result: UploadResult = {
      url: downloadURL,
      path: filePath,
      name: file.name,
      size: file.size
    };
    
    devLog('Upload concluído:', result);
    return result;
    
  } catch (error) {
    devError('Erro no upload:', error);
    throw new Error(`Falha no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Deletar arquivo do Firebase Storage
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    devLog('Arquivo deletado:', filePath);
  } catch (error) {
    devError('Erro ao deletar arquivo:', error);
    throw new Error(`Falha ao deletar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Validar se o arquivo é uma imagem
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Validar tamanho do arquivo (em bytes)
 */
export const validateFileSize = (file: File, maxSize: number = 5 * 1024 * 1024): boolean => {
  return file.size <= maxSize; // 5MB por padrão
};

/**
 * Validar tipo de arquivo permitido
 */
export const validateFileType = (file: File, allowedTypes: string[] = []): boolean => {
  if (allowedTypes.length === 0) {
    // Por padrão, permitir imagens e alguns documentos
    allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
  }
  return allowedTypes.includes(file.type);
};