import { collection, doc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import type { Feedback } from '@/types';
import type { LegacyFeedback } from '@/lib/ai-compatibility-adapter';
import { db } from '@/lib/firebase';
import { getNowBrasilia } from '@/lib/data-utils';
import { saveAnalysis } from '@/lib/firestore-service';

const PROVIDER_ID = 'sandbox-api';
const QUEUE_COLLECTION = 'external_feedback_queue';
const HOTELS_COLLECTION = 'hotels';
const REMOTE_API_URL = process.env.EXTERNAL_FEEDBACK_API_URL || 'http://localhost:3000/api/feedbacks';
const DEFAULT_SOURCE_NAME = 'Sandbox Feedback API';

export type IntegrationUserRole = 'admin' | 'manager' | 'staff';

export interface IntegrationAccessContext {
  role?: IntegrationUserRole | null;
  hotelId?: string | null;
}

export interface ExternalFeedbackRecord {
  id: string;
  name: string;
  email?: string | null;
  rating: number;
  message: string;
  hotelId: string;
  createdAt: string;
  source?: string;
}

export interface IntegrationPendingItem {
  externalId: string;
  provider: string;
  hotelId: string;
  hotelName: string;
  guestName: string;
  rating: number;
  message: string;
  createdAt: string;
}

export interface IntegrationProcessedItem {
  externalId: string;
  provider: string;
  hotelId: string;
  hotelName: string;
  status: 'processed' | 'failed';
  processedAt: string;
  error?: string;
  importId?: string;
}

export interface IntegrationDashboardData {
  source: {
    baseUrl: string;
  };
  pending: IntegrationPendingItem[];
  processed: IntegrationProcessedItem[];
  totals: {
    pending: number;
    processed: number;
    failed: number;
  };
  metadata: {
    updatedAt: string;
    lastSyncAt: string | null;
  };
}

export interface ProcessIntegrationOptions {
  origin: string;
  apiKey: string;
  limit?: number;
  dryRun?: boolean;
  role?: IntegrationUserRole;
  hotelId?: string | null;
}

export interface ProcessIntegrationResult {
  metadata: {
    totalCandidates: number;
    processed: number;
    skipped: number;
    failed: number;
    processedAt: string;
    hotels: Array<{
      hotelId: string;
      hotelName: string;
      count: number;
      importId: string;
    }>;
  };
  items: Array<{
    externalId: string;
    hotelId: string;
    hotelName: string;
    status: 'processed' | 'skipped' | 'failed';
    error?: string;
  }>;
  errors: Array<{ externalId: string; message: string }>;
}

interface QueueEntry {
  externalId: string;
  provider: string;
  hotelId: string;
  hotelName: string;
  status: 'processed' | 'failed';
  processedAtIso: string;
  error?: string;
  importId?: string;
}

export async function getIntegrationDashboardData(context?: IntegrationAccessContext): Promise<IntegrationDashboardData> {
  const [remoteFeedbacks, hotelsMap, queueEntries] = await Promise.all([
    fetchRemoteFeedbacks(),
    fetchHotelsMap(),
    fetchQueueEntries()
  ]);

  const scopedQueueEntries = filterEntriesByScope(queueEntries, context);
  const processedEntries = scopedQueueEntries.filter(entry => entry.status === 'processed');
  const failedEntries = scopedQueueEntries.filter(entry => entry.status === 'failed');
  const processedSet = new Set(processedEntries.map(entry => entry.externalId));
  const failedSet = new Set(failedEntries.map(entry => entry.externalId));

  const pending = filterEntriesByScope(
    remoteFeedbacks
      .filter(item => !processedSet.has(item.id))
      .map(item => toIntegrationPending(item, hotelsMap)),
    context
  );

  const history = [...scopedQueueEntries]
    .sort((a, b) => new Date(b.processedAtIso).getTime() - new Date(a.processedAtIso).getTime())
    .slice(0, 15)
    .map(entry => ({
      externalId: entry.externalId,
      provider: entry.provider,
      hotelId: entry.hotelId,
      hotelName: entry.hotelName,
      status: entry.status,
      processedAt: entry.processedAtIso,
      error: entry.error,
      importId: entry.importId
    }));

  return {
    source: {
      baseUrl: REMOTE_API_URL
    },
    pending,
    processed: history,
    totals: {
      pending: pending.length,
      processed: processedSet.size,
      failed: failedSet.size
    },
    metadata: {
      updatedAt: new Date().toISOString(),
      lastSyncAt: history.length ? history[0].processedAt : null
    }
  };
}

export async function processExternalFeedbacksWithAI(options: ProcessIntegrationOptions): Promise<ProcessIntegrationResult> {
  const { origin, apiKey, limit, dryRun = false, role = 'admin', hotelId } = options;
  const scope = role === 'admin' ? undefined : { role, hotelId: hotelId ?? null };
  const [remoteFeedbacks, hotelsMap, queueEntries] = await Promise.all([
    fetchRemoteFeedbacks(),
    fetchHotelsMap(),
    fetchQueueEntries()
  ]);

  const scopedQueueEntries = filterEntriesByScope(queueEntries, scope);
  const processedSet = new Set(scopedQueueEntries.filter(entry => entry.status === 'processed').map(entry => entry.externalId));
  const pending = remoteFeedbacks
    .filter(item => !processedSet.has(item.id))
    .filter(item => matchesHotelScope(item.hotelId, scope));
  const candidates = typeof limit === 'number' ? pending.slice(0, limit) : pending;

  if (!candidates.length) {
    return {
      metadata: {
        totalCandidates: pending.length,
        processed: 0,
        skipped: 0,
        failed: 0,
        processedAt: new Date().toISOString(),
        hotels: []
      },
      items: [],
      errors: []
    };
  }

  const groupedByHotel = new Map<string, {
    hotelName: string;
    feedbacks: Feedback[];
    entries: Array<{ externalId: string; error?: string }>;
  }>();

  const items: ProcessIntegrationResult['items'] = [];
  const errors: ProcessIntegrationResult['errors'] = [];

  for (const entry of candidates) {
    if (!entry.hotelId || entry.hotelId.trim() === '') {
      items.push({
        externalId: entry.id,
        hotelId: 'unknown',
        hotelName: 'Hotel não identificado',
        status: 'skipped',
        error: 'hotelId ausente no payload externo'
      });
      continue;
    }

    let analysis: LegacyFeedback | undefined;
    let errorMessage: string | undefined;

    try {
      analysis = await analyzeWithInternalPipeline(origin, entry.message, apiKey);
    } catch (error: any) {
      const message = error?.message || 'Falha ao analisar feedback';
      errorMessage = message;
      errors.push({ externalId: entry.id, message });
    }

    const hotelName = resolveHotelName(hotelsMap, entry.hotelId);
    const feedback = buildFeedback(entry, hotelName, analysis);

    if (!groupedByHotel.has(entry.hotelId)) {
      groupedByHotel.set(entry.hotelId, {
        hotelName,
        feedbacks: [],
        entries: []
      });
    }

    groupedByHotel.get(entry.hotelId)!.feedbacks.push(feedback);
    groupedByHotel.get(entry.hotelId)!.entries.push({ externalId: entry.id, error: errorMessage });

    items.push({
      externalId: entry.id,
      hotelId: entry.hotelId,
      hotelName,
      status: 'processed',
      error: errorMessage
    });
  }

  const hotelsSummary: ProcessIntegrationResult['metadata']['hotels'] = [];

  if (!dryRun) {
    for (const [hotelId, payload] of Array.from(groupedByHotel.entries())) {
      const importMoment = getNowBrasilia();
      const importId = `${hotelId}-${importMoment.getTime()}`;

      const feedbacksWithImport = payload.feedbacks.map((feedback: Feedback) => ({
        ...feedback,
        importId
      }));

      const analysisSummary = buildAnalysisSummary(feedbacksWithImport);

      await saveAnalysis({
        hotelId,
        hotelName: payload.hotelName,
        importDate: importMoment,
        data: feedbacksWithImport,
        analysis: analysisSummary
      });

      for (const entry of payload.entries) {
        await markQueueEntry({
          externalId: entry.externalId,
          hotelId,
          hotelName: payload.hotelName,
          status: 'processed',
          processedAt: importMoment,
          error: entry.error,
          importId
        });
      }

      hotelsSummary.push({
        hotelId,
        hotelName: payload.hotelName,
        count: feedbacksWithImport.length,
        importId
      });
    }
  }

  const processedCount = items.filter(item => item.status === 'processed').length;
  const skippedCount = items.filter(item => item.status === 'skipped').length;

  return {
    metadata: {
      totalCandidates: pending.length,
      processed: processedCount,
      skipped: skippedCount,
      failed: errors.length,
      processedAt: new Date().toISOString(),
      hotels: hotelsSummary
    },
    items,
    errors
  };
}

async function fetchRemoteFeedbacks(): Promise<ExternalFeedbackRecord[]> {
  try {
    const response = await fetch(REMOTE_API_URL, { cache: 'no-store' });

    if (!response.ok) {
      const message = await safeReadError(response);
      throw new Error(message);
    }

    const payload = await response.json();
    const feedbacks = Array.isArray(payload?.feedbacks) ? payload.feedbacks : [];

    return feedbacks
      .map(normalizeExternalRecord)
      .filter((item: ExternalFeedbackRecord) => item.message.length >= 5);
  } catch (error: any) {
    throw new Error(`Falha ao consultar API externa: ${error?.message || error}`);
  }
}

async function fetchHotelsMap(): Promise<Map<string, string>> {
  const snapshot = await getDocs(collection(db, HOTELS_COLLECTION));
  const map = new Map<string, string>();

  snapshot.forEach(hotelDoc => {
    const data = hotelDoc.data() as { hotelId?: string; name?: string };
    const hotelId = data.hotelId || hotelDoc.id;
    const hotelName = data.name || prettifyHotelId(hotelId);
    map.set(hotelId, hotelName);
  });

  return map;
}

async function fetchQueueEntries(): Promise<QueueEntry[]> {
  const snapshot = await getDocs(collection(db, QUEUE_COLLECTION));

  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as any;
    const processedAt = data.processedAt?.toDate?.() instanceof Date
      ? data.processedAt.toDate()
      : new Date(data.processedAtIso || Date.now());

    return {
      externalId: String(data.externalId || docSnapshot.id),
      provider: data.provider || PROVIDER_ID,
      hotelId: String(data.hotelId || 'unknown'),
      hotelName: data.hotelName || 'Não identificado',
      status: data.status === 'failed' ? 'failed' : 'processed',
      processedAtIso: processedAt.toISOString(),
      error: data.error,
      importId: data.importId
    } satisfies QueueEntry;
  });
}

async function markQueueEntry(entry: {
  externalId: string;
  hotelId: string;
  hotelName: string;
  status: 'processed' | 'failed';
  processedAt: Date;
  error?: string;
  importId?: string;
}) {
  const docId = `${PROVIDER_ID}-${entry.externalId}`;
  const docRef = doc(db, QUEUE_COLLECTION, docId);

  await setDoc(docRef, {
    provider: PROVIDER_ID,
    externalId: entry.externalId,
    hotelId: entry.hotelId,
    hotelName: entry.hotelName,
    status: entry.status,
    processedAt: Timestamp.fromDate(entry.processedAt),
    processedAtIso: entry.processedAt.toISOString(),
    error: entry.error ?? null,
    importId: entry.importId ?? null
  }, { merge: true });
}

function isAdminScope(context?: IntegrationAccessContext): boolean {
  return !context || context.role === 'admin';
}

function normalizeHotelId(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function matchesHotelScope(hotelId: string, context?: IntegrationAccessContext): boolean {
  if (isAdminScope(context)) {
    return true;
  }

  const allowedId = normalizeHotelId(context?.hotelId);
  if (!allowedId) {
    return false;
  }

  return normalizeHotelId(hotelId) === allowedId;
}

export function describeHotelIdRule(): string {
  return 'IDs devem estar no formato slug: minúsculo, hífens, sem acentos (ex.: Prodigy Gramado → prodigy-gramado).';
}

function filterEntriesByScope<T extends { hotelId: string }>(entries: T[], context?: IntegrationAccessContext): T[] {
  if (isAdminScope(context)) {
    return entries;
  }

  return entries.filter(entry => matchesHotelScope(entry.hotelId, context));
}

async function analyzeWithInternalPipeline(origin: string, text: string, apiKey: string): Promise<LegacyFeedback> {
  const response = await fetch(`${origin}/api/analyze-feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ texto: text })
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(message);
  }

  return response.json();
}

function buildFeedback(external: ExternalFeedbackRecord, hotelName: string, analysis?: LegacyFeedback): Feedback {
  const normalizedRating = resolveFinalRating(external, analysis);
  const sentiment = mapRatingToSentiment(normalizedRating);
  const detailFromAnalysis = analysis?.allProblems?.find(problem => problem.problem_detail)?.problem_detail;

  return {
    id: `${external.hotelId}-${external.id}`,
    date: external.createdAt,
    comment: external.message,
    rating: normalizedRating,
    sentiment,
    keyword: sanitizeLabel(analysis?.keyword) || 'Não identificado',
    sector: sanitizeLabel(analysis?.sector) || 'Não identificado',
    problem: sanitizeLabel(analysis?.problem) || 'EMPTY',
    problem_detail: detailFromAnalysis,
    hotel: hotelName,
    hotelName,
    hotelId: external.hotelId,
    source: external.source || DEFAULT_SOURCE_NAME,
    language: 'pt-BR',
    score: external.rating,
    author: external.name,
    allProblems: analysis?.allProblems,
    has_suggestion: analysis?.has_suggestion,
    suggestion_type: analysis?.suggestion_type as Feedback['suggestion_type'],
    suggestion_summary: analysis?.suggestion_summary,
    compliments: analysis?.compliments,
    positive_details: analysis?.positive_details,
    reasoning: analysis?.reasoning
  };
}

function buildAnalysisSummary(feedbacks: Feedback[]) {
  if (!feedbacks.length) {
    return {
      totalFeedbacks: 0,
      averageRating: 0,
      positiveSentiment: 0,
      responseRate: 0,
      hotelDistribution: [],
      sourceDistribution: [],
      languageDistribution: [],
      ratingDistribution: [],
      problemDistribution: [],
      keywordDistribution: [],
      apartamentoDistribution: [],
      recentFeedbacks: []
    };
  }

  const total = feedbacks.length;

  return {
    totalFeedbacks: total,
    averageRating: Number((feedbacks.reduce((acc, item) => acc + (item.rating || 0), 0) / total).toFixed(2)),
    positiveSentiment: Math.round((feedbacks.filter(item => item.sentiment === 'positive').length / total) * 100),
    responseRate: 85,
    hotelDistribution: processHotelDistribution(feedbacks),
    sourceDistribution: processSourceDistribution(feedbacks),
    languageDistribution: processLanguageDistribution(feedbacks),
    ratingDistribution: processRatingDistribution(feedbacks),
    problemDistribution: processProblemDistribution(feedbacks),
    keywordDistribution: processKeywordDistribution(feedbacks),
    apartamentoDistribution: processApartamentoDistribution(feedbacks),
    recentFeedbacks: [...feedbacks]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  };
}

function processHotelDistribution(data: Feedback[]) {
  const counts: Record<string, number> = {};
  data.forEach(item => {
    const key = item.hotel || 'Não identificado';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function processSourceDistribution(data: Feedback[]) {
  const counts: Record<string, number> = {};
  data.forEach(item => {
    const key = item.source || DEFAULT_SOURCE_NAME;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function processLanguageDistribution(data: Feedback[]) {
  const counts: Record<string, number> = {};
  data.forEach(item => {
    const key = item.language || 'Não identificado';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function processRatingDistribution(data: Feedback[]) {
  const counts: Record<number, number> = {};
  data.forEach(item => {
    const rating = item.rating || 0;
    counts[rating] = (counts[rating] || 0) + 1;
  });
  return Object.entries(counts).map(([rating, value]) => ({ rating: Number(rating), count: value }));
}

function processProblemDistribution(data: Feedback[]) {
  const counts: Record<string, number> = {};

  data.forEach(item => {
    if (Array.isArray(item.allProblems) && item.allProblems.length) {
      item.allProblems.forEach(problem => {
        const label = problem.problem || 'Não identificado';
        counts[label] = (counts[label] || 0) + 1;
      });
      return;
    }

    if (item.problem) {
      counts[item.problem] = (counts[item.problem] || 0) + 1;
    }
  });

  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function processKeywordDistribution(data: Feedback[]) {
  const counts: Record<string, number> = {};

  data.forEach(item => {
    if (Array.isArray(item.allProblems) && item.allProblems.length) {
      item.allProblems.forEach(problem => {
        const label = problem.keyword || 'Não identificado';
        counts[label] = (counts[label] || 0) + 1;
      });
      return;
    }

    if (item.keyword) {
      const labels = item.keyword.split(';').map(keyword => keyword.trim()).filter(Boolean);
      labels.forEach(label => {
        counts[label] = (counts[label] || 0) + 1;
      });
    }
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function processApartamentoDistribution(data: Feedback[]) {
  const counts: Record<string, number> = {};
  data.forEach(item => {
    if (item.apartamento) {
      counts[item.apartamento] = (counts[item.apartamento] || 0) + 1;
    }
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function toIntegrationPending(item: ExternalFeedbackRecord, hotelsMap: Map<string, string>): IntegrationPendingItem {
  const hotelName = resolveHotelName(hotelsMap, item.hotelId);
  return {
    externalId: item.id,
    provider: PROVIDER_ID,
    hotelId: item.hotelId,
    hotelName,
    guestName: item.name,
    rating: item.rating,
    message: item.message,
    createdAt: item.createdAt
  };
}

function resolveHotelName(hotelsMap: Map<string, string>, hotelId: string) {
  return hotelsMap.get(hotelId) || prettifyHotelId(hotelId);
}

function prettifyHotelId(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeExternalRecord(raw: any): ExternalFeedbackRecord {
  const createdAtRaw = raw.createdAt || raw.date || new Date().toISOString();
  const createdAtDate = new Date(createdAtRaw);
  const createdAt = Number.isNaN(createdAtDate.getTime()) ? new Date().toISOString() : createdAtDate.toISOString();
  const message = String(raw.message ?? raw.text ?? '').trim();

  return {
    id: String(raw.id ?? raw.externalId ?? `external-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: typeof raw.name === 'string' && raw.name.trim().length ? raw.name : 'Hóspede',
    email: typeof raw.email === 'string' ? raw.email : undefined,
    rating: normalizeRating(raw.rating),
    message,
    hotelId: String(raw.hotelId ?? raw.hotel_id ?? '').trim() || 'hotel-desconhecido',
    createdAt,
    source: raw.source || raw.origin || DEFAULT_SOURCE_NAME
  };
}

function normalizeRating(value: any) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function resolveFinalRating(external: ExternalFeedbackRecord, analysis?: LegacyFeedback) {
  if (typeof analysis?.rating === 'number' && !Number.isNaN(analysis.rating)) {
    return Math.min(5, Math.max(1, Math.round(analysis.rating)));
  }
  return normalizeRating(external.rating);
}

function mapRatingToSentiment(rating: number) {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

function sanitizeLabel(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'EMPTY' || trimmed === 'Não identificado') {
    return undefined;
  }
  return trimmed;
}

async function safeReadError(response: Response) {
  try {
    const data = await response.json();
    return data?.error || data?.message || response.statusText;
  } catch (error) {
    return response.statusText;
  }
}
