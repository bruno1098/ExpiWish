export type NoticeMediaKind = 'video' | 'image';

export interface NoticeMediaItem {
  id: string;
  type: NoticeMediaKind;
  label: string;
  src: string; // Caminho público (sempre começa com /avisos)
  description?: string;
  thumbnail?: string | null;
  durationHint?: string;
  aspectRatio?: string;
  fileName?: string;
}

export const NOTICE_MEDIA_FOLDERS: Record<NoticeMediaKind, 'images' | 'videos'> = {
  video: 'videos',
  image: 'images',
};

export const NOTICE_MEDIA_EXTENSIONS: Record<NoticeMediaKind, string[]> = {
  video: ['.mp4', '.mov', '.webm', '.ogg', '.ogv'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
};

export const buildMediaId = (type: NoticeMediaKind, fileName: string) => `${type}:${fileName}`;

export const deriveLabelFromFile = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildMediaSrc = (type: NoticeMediaKind, fileName: string) =>
  `/avisos/${NOTICE_MEDIA_FOLDERS[type]}/${encodeURIComponent(fileName)}`;
