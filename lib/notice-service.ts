import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUserData, type UserData } from './auth-service';

export type NoticeMediaType = 'video' | 'image';

export interface NoticeUserRef {
  uid: string;
  email?: string;
  name?: string;
}

export interface NoticeRecord {
  id: string;
  title: string;
  subtitle: string;
  mediaId: string;
  mediaLabel: string;
  mediaType: NoticeMediaType;
  mediaSrc: string;
  mediaThumbnail?: string | null;
  isPublished: boolean;
  isPermanent: boolean;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy?: NoticeUserRef | null;
  lastUpdatedBy?: NoticeUserRef | null;
}

export interface NoticeUpsertPayload {
  title: string;
  subtitle: string;
  mediaId: string;
  mediaLabel: string;
  mediaType: NoticeMediaType;
  mediaSrc: string;
  mediaThumbnail?: string | null;
  isPublished: boolean;
  isPermanent: boolean;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
}

const NOTICES_COLLECTION = 'notices';
const NOTICE_CACHE_TTL = 15_000; // 15 segundos

let noticesCache: { expiresAt: number; items: NoticeRecord[] } | null = null;

const noticesRef = collection(db, NOTICES_COLLECTION);

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
};

const toTimestamp = (value?: Date | string | null) => {
  const parsed = typeof value === 'string' ? new Date(value) : value;
  if (!parsed || isNaN(parsed.getTime())) {
    return Timestamp.fromDate(new Date());
  }
  return Timestamp.fromDate(parsed);
};

const mapDoc = (docSnap: any): NoticeRecord => {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    title: data.title ?? '',
    subtitle: data.subtitle ?? '',
    mediaId: data.mediaId ?? '',
    mediaLabel: data.mediaLabel ?? '',
    mediaType: data.mediaType ?? 'video',
    mediaSrc: data.mediaSrc ?? '',
    mediaThumbnail: data.mediaThumbnail ?? null,
    isPublished: Boolean(data.isPublished),
    isPermanent: Boolean(data.isPermanent),
    startAt: toDate(data.startAt),
    endAt: toDate(data.endAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy ?? null,
    lastUpdatedBy: data.lastUpdatedBy ?? null,
  };
};

const getCachedNotices = () => {
  if (noticesCache && noticesCache.expiresAt > Date.now()) {
    return noticesCache.items;
  }
  return null;
};

const cacheNotices = (items: NoticeRecord[]) => {
  noticesCache = {
    items,
    expiresAt: Date.now() + NOTICE_CACHE_TTL,
  };
};

const invalidateCache = () => {
  noticesCache = null;
};

export const fetchAllNotices = async (): Promise<NoticeRecord[]> => {
  const cached = getCachedNotices();
  if (cached) {
    return cached;
  }

  const q = query(noticesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(mapDoc);
  cacheNotices(items);
  return items;
};

export const fetchPublishedNotices = async (): Promise<NoticeRecord[]> => {
  const items = await fetchAllNotices();
  return items.filter((item) => item.isPublished);
};

const isNoticeActive = (notice: NoticeRecord, referenceDate = new Date()) => {
  const startsAt = notice.startAt ?? referenceDate;
  const endsAt = notice.isPermanent ? null : notice.endAt;

  const started = startsAt ? referenceDate >= startsAt : true;
  const notExpired = endsAt ? referenceDate <= endsAt : true;

  return notice.isPublished && started && notExpired;
};

export const fetchActiveNotices = async (): Promise<NoticeRecord[]> => {
  const items = await fetchPublishedNotices();
  return items.filter((item) => isNoticeActive(item));
};

const buildUserRef = (user?: UserData | null): NoticeUserRef | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    name: user.name,
  };
};

const sanitizePayload = (payload: NoticeUpsertPayload) => {
  const now = Timestamp.now();
  const startTimestamp = toTimestamp(payload.startAt ?? new Date());
  const endTimestamp = payload.isPermanent ? null : toTimestamp(payload.endAt ?? payload.startAt ?? new Date());

  return {
    title: payload.title?.trim(),
    subtitle: payload.subtitle?.trim(),
    mediaId: payload.mediaId,
    mediaLabel: payload.mediaLabel,
    mediaType: payload.mediaType,
    mediaSrc: payload.mediaSrc,
    mediaThumbnail: payload.mediaThumbnail ?? null,
    isPublished: payload.isPublished,
    isPermanent: payload.isPermanent,
    startAt: startTimestamp,
    endAt: endTimestamp,
    updatedAt: now,
  };
};

export const createNotice = async (payload: NoticeUpsertPayload): Promise<string> => {
  const user = await getCurrentUserData();
  const sanitized = sanitizePayload(payload);
  const now = Timestamp.now();

  const docRef = await addDoc(noticesRef, {
    ...sanitized,
    createdAt: now,
    createdBy: buildUserRef(user),
    lastUpdatedBy: buildUserRef(user),
  });

  invalidateCache();
  return docRef.id;
};

export const updateNotice = async (id: string, payload: NoticeUpsertPayload): Promise<void> => {
  const user = await getCurrentUserData();
  const sanitized = sanitizePayload(payload);
  const docRef = doc(noticesRef, id);

  await updateDoc(docRef, {
    ...sanitized,
    lastUpdatedBy: buildUserRef(user),
  });

  invalidateCache();
};

export const deleteNotice = async (id: string): Promise<void> => {
  await deleteDoc(doc(noticesRef, id));
  invalidateCache();
};

export const resetNoticeCache = () => invalidateCache();
