import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import {
  NoticeMediaItem,
  NoticeMediaKind,
  NOTICE_MEDIA_FOLDERS,
  NOTICE_MEDIA_EXTENSIONS,
  buildMediaId,
  buildMediaSrc,
  deriveLabelFromFile,
} from '@/avisos/media-catalog';

interface MediaResponse {
  items: NoticeMediaItem[];
}

const MEDIA_BASE_PATH = path.join(process.cwd(), 'public', 'avisos');

const isValidExtension = (file: string, type: NoticeMediaKind) => {
  const ext = path.extname(file).toLowerCase();
  return NOTICE_MEDIA_EXTENSIONS[type].includes(ext);
};

const readMediaFolder = async (type: NoticeMediaKind): Promise<NoticeMediaItem[]> => {
  const folder = NOTICE_MEDIA_FOLDERS[type];
  const folderPath = path.join(MEDIA_BASE_PATH, folder);

  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && isValidExtension(entry.name, type))
      .map((entry) => ({
        id: buildMediaId(type, entry.name),
        type,
        label: deriveLabelFromFile(entry.name) || entry.name,
        src: buildMediaSrc(type, entry.name),
        description: undefined,
        thumbnail: null,
        fileName: entry.name,
      }));
  } catch (error) {
    console.warn(`Não foi possível carregar a pasta de avisos (${folder}).`, error);
    return [];
  }
};

export async function GET() {
  const [videos, images] = await Promise.all([
    readMediaFolder('video'),
    readMediaFolder('image'),
  ]);

  const payload: MediaResponse = {
    items: [...videos, ...images],
  };

  return NextResponse.json(payload, { status: 200 });
}
