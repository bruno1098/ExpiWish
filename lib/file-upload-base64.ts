import { devLog, devError } from './dev-logger';

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  originalSize: number;
  compressionRatio?: number;
}

export interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0.1 - 1.0
  format: 'jpeg' | 'png' | 'webp';
}

/**
 * Comprimir imagem usando Canvas
 */
const compressImage = async (file: File, options: CompressionOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas não suportado'));
      return;
    }
    
    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      const { maxWidth, maxHeight } = options;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Configurar canvas
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para base64 com qualidade
      const mimeType = `image/${options.format}`;
      const base64String = canvas.toDataURL(mimeType, options.quality);
      
      resolve(base64String);
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };
    
    // Criar URL da imagem
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Converter arquivo para base64 otimizado com compressão
 */
export const uploadFileAsBase64 = async (file: File): Promise<UploadResult> => {
  try {
    devLog('Processando arquivo:', { name: file.name, size: file.size });
    const originalSize = file.size;
    
    // Se for imagem, comprimir automaticamente
    if (isImageFile(file)) {
      const compressionOptions: CompressionOptions = {
        maxWidth: 1200,  // Max 1200px largura
        maxHeight: 1200, // Max 1200px altura
        quality: 0.8,    // 80% qualidade
        format: 'jpeg'   // JPEG é mais eficiente para fotos
      };
      
      try {
        const compressedBase64 = await compressImage(file, compressionOptions);
        const compressedSize = getBase64Size(compressedBase64);
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        
        devLog('Compressão concluída:', { 
          originalSize, 
          compressedSize, 
          compressionRatio: `${compressionRatio.toFixed(1)}%`
        });
        
        return {
          url: compressedBase64,
          name: file.name,
          size: compressedSize,
          originalSize,
          compressionRatio
        };
      } catch (compressionError) {
        devError('Erro na compressão, usando original:', compressionError);
        // Fallback para conversão normal se compressão falhar
      }
    }
    
    // Para arquivos não-imagem ou se compressão falhar
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64String = reader.result as string;
        
        const result: UploadResult = {
          url: base64String,
          name: file.name,
          size: originalSize,
          originalSize
        };
        
        devLog('Conversão para base64 concluída:', { name: file.name });
        resolve(result);
      };
      
      reader.onerror = () => {
        devError('Erro na conversão para base64:', reader.error);
        reject(new Error('Falha ao converter arquivo'));
      };
      
      reader.readAsDataURL(file);
    });
    
  } catch (error) {
    devError('Erro no upload base64:', error);
    throw new Error(`Falha no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
 * Para base64 com compressão, podemos ser mais flexíveis
 */
export const validateFileSize = (file: File, maxSize: number = 5 * 1024 * 1024): boolean => {
  // Aumentei para 5MB pois a compressão vai reduzir drasticamente
  return file.size <= maxSize;
};

/**
 * Validar tipo de arquivo permitido
 */
export const validateFileType = (file: File, allowedTypes: string[] = []): boolean => {
  if (allowedTypes.length === 0) {
    allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/gif',
      'image/webp',
      'text/plain',
      'application/pdf' // PDFs pequenos também são úteis
    ];
  }
  return allowedTypes.includes(file.type);
};

/**
 * Calcular tamanho do base64 (aproximadamente 33% maior que o arquivo original)
 */
export const getBase64Size = (base64String: string): number => {
  // Remove o prefixo data:...;base64,
  const base64Data = base64String.split(',')[1] || base64String;
  // Cada caractere base64 representa 6 bits, então 4 chars = 3 bytes
  return Math.ceil((base64Data.length * 3) / 4);
};

/**
 * Verificar se o arquivo resultará em base64 muito grande para Firestore
 * Firestore tem limite de 1MB por documento
 */
export const willExceedFirestoreLimit = (base64String: string): boolean => {
  const size = getBase64Size(base64String);
  return size > 800 * 1024; // 800KB de margem de segurança
};

/**
 * Formatar tamanho de arquivo para exibição
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};