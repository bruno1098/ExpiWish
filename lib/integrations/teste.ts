/* Legacy mock integration retained for reference. Original implementation follows.
import type { LegacyFeedback } from '@/lib/ai-compatibility-adapter';
import type { Feedback } from '@/types';

export type ExternalFeedbackProvider = 'trustyou' | 'reclameaqui';

export type MockIngestionRecordStatus = 'pending' | 'processing' | 'processed' | 'errored';

export interface MockIngestionRecord {
  id: string;
  externalId: string;
  provider: ExternalFeedbackProvider;
  status: MockIngestionRecordStatus;
  firstSeenAt: string;
  lastUpdateAt: string;
  processedAt: string | null;
  checksum: string;
  attemptCount: number;
  priority: 'normal' | 'high';
  cursor: string;
  lastError?: string;
}

export interface MockIngestionProviderState {
  provider: ExternalFeedbackProvider;
  hotelId: string;
  hotelName: string;
  lastCursor: string;
  lastSuccessfulSync: string;
  nextScheduledSync: string;
  pendingWindowStart: string;
  pendingWindowEnd: string;
  totals: {
    queued: number;
    processed: number;
    errored: number;
  };
  queuePreview: MockIngestionRecord[];
}

export interface MockIngestionSnapshot {
  generatedAt: string;
  providers: MockIngestionProviderState[];
}

export interface MockExternalFeedback {
  externalId: string;
  provider: ExternalFeedbackProvider;
  submittedAt: string;
  stayDate: string;
  score?: number;
  rating?: number;
  title?: string;
  reviewText: string;
  language: string;
  reviewerName: string;
  reviewerProfileUrl?: string;
  sourceName?: string;
  hotel: {
    id: string;
    name: string;
    city: string;
    state: string;
    country?: string;
  };
  sourceUrl?: string;
  tags?: string[];
}

export interface ProcessMockOptions {
  origin: string;
  apiKey?: string;
  skipAnalysis?: boolean;
  ingestionSnapshot?: MockIngestionSnapshot;
}

export interface ProcessedMockFeedback {
  external: MockExternalFeedback;
  analysis?: LegacyFeedback;
  feedback: Feedback;
  providerPayload: Record<string, any>;
  error?: string;
}

export interface NewMockPayload {
  provider: ExternalFeedbackProvider;
  title?: string;
  reviewText: string;
  rating?: number;
  submittedAt?: string;
  reviewerName?: string;
  tags?: string[];
}

export interface MockIntegrationResult {
  metadata: {
    provider: ExternalFeedbackProvider | 'mixed-mock';
    total: number;
    processedAt: string;
    analysisExecuted: boolean;
  };
  items: ProcessedMockFeedback[];
  errors: Array<{ externalId: string; message: string }>;
  ingestionSnapshot?: MockIngestionSnapshot;
}

export interface TrustYouReview {
  review_id: string;
  external_id: string;
  published_at: string;
  language: string;
  stay_interval: {
    start: string | null;
    end: string | null;
  };
  rating: {
    overall: number;
    normalized_score: number;
    traveler_type: 'business' | 'couple' | 'family' | 'solo' | 'friends';
    subratings: Record<string, number>;
  };
  title: string;
  text: string;
  reviewer: {
    display_name: string;
    country: string;
    profile_url?: string;
  };
  source: {
    name: string;
    type: 'ota' | 'meta' | 'survey' | 'direct';
    review_url: string;
  };
  management_response?: {
    published_at: string;
    message: string;
  };
  tags: string[];
}

export interface TrustYouReviewResponse {
  meta: {
    request_id: string;
    retrieved_at: string;
    timezone: string;
    pagination: {
      page: number;
      per_page: number;
      total_entries: number;
      total_pages: number;
    };
    hotel: {
      id: string;
      name: string;
      city: string;
      state: string;
      country: string;
      latitude: number;
      longitude: number;
    };
  };
  data: TrustYouReview[];
}

export interface ReclameAquiCase {
  id: number;
  protocol: string;
  status: 'pending' | 'answered' | 'closed' | 'resolved';
  created_at: string;
  updated_at: string;
  last_status_change: string;
  occurred_at?: string;
  title: string;
  description: string;
  category: {
    id: number;
    name: string;
    subcategory: {
      id: number;
      name: string;
    };
  };
  consumer: {
    id: number;
    name: string;
    nickname: string;
    city: string;
    state: string;
    country: string;
    portal_url?: string;
    avatar_url?: string;
  };
  company: {
    id: string;
    name: string;
    document: string;
    slug?: string;
  };
  evaluation: {
    solved: boolean;
    consumer_score: number | null;
    rating: number | null;
    answered_at?: string | null;
  };
  interactions: Array<{
    id: string;
    actor: 'consumer' | 'company';
    created_at: string;
    message: string;
  }>;
  tags: string[];
  links?: {
    public_view?: string;
  };
}

export interface ReclameAquiCasesResponse {
  meta: {
    request_id: string;
    retrieved_at: string;
    pagination: {
      page: number;
      per_page: number;
      total_entries: number;
      total_pages: number;
    };
    company: {
      id: string;
      name: string;
      city: string;
      state: string;
      country: string;
    };
  };
  data: ReclameAquiCase[];
}

const BASE_TRUSTYOU_REVIEW_RESPONSE: TrustYouReviewResponse = {
  meta: {
    request_id: 'ty-mock-20240314',
    retrieved_at: '2025-11-18T14:40:00Z',
    timezone: 'America/Sao_Paulo',
    pagination: {
      page: 1,
      per_page: 50,
      total_entries: 2,
      total_pages: 1
    },
    hotel: {
      id: 'hotel-copacabana-01',
      name: 'Hotel Copacabana Vista Mar',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'BR',
      latitude: -22.9672,
      longitude: -43.1806
    }
  },
  data: [
    {
      review_id: 'TY-98421',
      external_id: 'trustyou-98421',
      published_at: '2024-03-14T13:45:00Z',
      language: 'pt',
      stay_interval: {
        start: '2024-02-24',
        end: '2024-02-28'
      },
      rating: {
        overall: 4.4,
        normalized_score: 88,
        traveler_type: 'business',
        subratings: {
          breakfast: 4.8,
          service: 4.9,
          wifi: 2.1,
          business_amenities: 3.8
        }
      },
      title: 'Café da manhã excelente, mas o Wi-Fi falhou',
      text: 'Adoramos o atendimento e o café da manhã variado, porém o Wi-Fi caiu várias vezes e nos deixou sem acesso para trabalhar.',
      reviewer: {
        display_name: 'Carolina S.',
        country: 'BR',
        profile_url: 'https://trustyou.example.com/user/98421'
      },
      source: {
        name: 'Booking.com',
        type: 'ota',
        review_url: 'https://trustyou.example.com/review/98421'
      },
      management_response: {
        published_at: '2024-03-15T09:10:00Z',
        message: 'Agradecemos o feedback e já reajustamos o roteador do andar executivo.'
      },
      tags: ['wifi', 'breakfast', 'business']
    },
    {
      review_id: 'TY-98425',
      external_id: 'trustyou-98425',
      published_at: '2024-03-01T18:27:00Z',
      language: 'pt',
      stay_interval: {
        start: '2024-02-18',
        end: '2024-02-20'
      },
      rating: {
        overall: 4.6,
        normalized_score: 74,
        traveler_type: 'family',
        subratings: {
          housekeeping: 4.9,
          service: 4.7,
          comfort: 4.5
        }
      },
      title: 'Equipe simpática e limpeza impecável',
      text: 'Equipe de limpeza muito atenciosa, quarto sempre impecável e recepção resolveu rapidamente um pedido de travesseiros extras.',
      reviewer: {
        display_name: 'Sofia Andrade',
        country: 'BR'
      },
      source: {
        name: 'Google Reviews',
        type: 'meta',
        review_url: 'https://trustyou.example.com/review/98425'
      },
      tags: ['cleaning', 'service']
    }
  ]
};

const BASE_RECLAMEAQUI_CASES_RESPONSE: ReclameAquiCasesResponse = {
  meta: {
    request_id: 'ra-mock-20240310',
    retrieved_at: '2025-11-18T14:40:00-03:00',
    pagination: {
      page: 1,
      per_page: 50,
      total_entries: 1,
      total_pages: 1
    },
    company: {
      id: 'hotel-center-business-11',
      name: 'Center Business Hotel',
      city: 'São Paulo',
      state: 'SP',
      country: 'BR'
    }
  },
  data: [
    {
      id: 77110,
      protocol: 'HOS-77110/2024',
      status: 'pending',
      created_at: '2024-03-10T02:12:00-03:00',
      updated_at: '2024-03-10T02:42:00-03:00',
      last_status_change: '2024-03-10T02:42:00-03:00',
      occurred_at: '2024-03-05',
      title: 'Quarto barulhento e demora na recepção',
      description: 'Fiquei no quarto 1205 e foi impossível descansar com o barulho do corredor. Além disso, levei 25 minutos para conseguir atendimento na recepção durante o check-in.',
      category: {
        id: 1040,
        name: 'Hotelaria e Turismo',
        subcategory: {
          id: 2110,
          name: 'Atendimento na recepção'
        }
      },
      consumer: {
        id: 558822,
        name: 'Luiz Fernando',
        nickname: 'Luiz F.',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
        portal_url: 'https://www.reclameaqui.com.br/usuario/luiz-fernando',
        avatar_url: 'https://reclameaqui.example.com/avatar/luiz-fernando.png'
      },
      company: {
        id: 'hotel-center-business-11',
        name: 'Center Business Hotel',
        document: '12.345.678/0001-99',
        slug: 'center-business-hotel'
      },
      evaluation: {
        solved: false,
        consumer_score: null,
        rating: null,
        answered_at: null
      },
      interactions: [
        {
          id: 'msg-77110-1',
          actor: 'consumer',
          created_at: '2024-03-10T02:12:00-03:00',
          message: 'Fiquei no quarto 1205 e foi impossível descansar com o barulho do corredor.'
        },
        {
          id: 'msg-77110-2',
          actor: 'consumer',
          created_at: '2024-03-10T02:20:00-03:00',
          message: 'Também tive problemas para ser atendido na recepção durante o check-in.'
        }
      ],
      tags: ['check-in', 'noise'],
      links: {
        public_view: 'https://www.reclameaqui.com.br/empresa/center-business-hotel/reclamacao/77110'
      }
    }
  ]
};

let runtimeTrustYouReviews: TrustYouReview[] = [...BASE_TRUSTYOU_REVIEW_RESPONSE.data];
let runtimeReclameAquiCases: ReclameAquiCase[] = [...BASE_RECLAMEAQUI_CASES_RESPONSE.data];
let runtimeSnapshot: MockIngestionSnapshot | null = null;
let runtimeInitialized = false;
let trustYouMockCounter = 1;
let reclameAquiMockCounter = 1;

function createSnapshotForCurrentData(): MockIngestionSnapshot {
  const now = new Date();
  const nowIso = now.toISOString();

  const trustYouQueue = runtimeTrustYouReviews.map<MockIngestionRecord>((review, index) => ({
    id: `trustyou-ingestion-${review.review_id}-${index}`,
    externalId: review.external_id,
    provider: 'trustyou',
    status: 'pending',
    firstSeenAt: nowIso,
    lastUpdateAt: nowIso,
    processedAt: null,
    checksum: `sha256:${review.external_id}`,
    attemptCount: 0,
    priority: index === runtimeTrustYouReviews.length - 1 ? 'high' : 'normal',
    cursor: `after:${review.review_id}`
  }));

  const reclameAquiQueue = runtimeReclameAquiCases.map<MockIngestionRecord>((item, index) => ({
    id: `reclameaqui-ingestion-${item.id}-${index}`,
    externalId: String(item.id),
    provider: 'reclameaqui',
    status: 'pending',
    firstSeenAt: nowIso,
    lastUpdateAt: nowIso,
    processedAt: null,
    checksum: `sha256:${item.id}`,
    attemptCount: 0,
    priority: index === runtimeReclameAquiCases.length - 1 ? 'high' : 'normal',
    cursor: `after:RA-${item.id}`
  }));

  return {
    generatedAt: nowIso,
    providers: [
      {
        provider: 'trustyou',
        hotelId: BASE_TRUSTYOU_REVIEW_RESPONSE.meta.hotel.id,
        hotelName: BASE_TRUSTYOU_REVIEW_RESPONSE.meta.hotel.name,
        lastCursor: trustYouQueue.at(-1)?.cursor ?? 'after:none',
        lastSuccessfulSync: nowIso,
        nextScheduledSync: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
        pendingWindowStart: runtimeTrustYouReviews[0]?.published_at ?? nowIso,
        pendingWindowEnd: runtimeTrustYouReviews.at(-1)?.published_at ?? nowIso,
        totals: {
          queued: trustYouQueue.length,
          processed: 0,
          errored: 0
        },
        queuePreview: trustYouQueue
      },
      {
        provider: 'reclameaqui',
        hotelId: BASE_RECLAMEAQUI_CASES_RESPONSE.meta.company.id,
        hotelName: BASE_RECLAMEAQUI_CASES_RESPONSE.meta.company.name,
        lastCursor: reclameAquiQueue.at(-1)?.cursor ?? 'after:none',
        lastSuccessfulSync: nowIso,
        nextScheduledSync: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
        pendingWindowStart: runtimeReclameAquiCases[0]?.created_at ?? nowIso,
        pendingWindowEnd: runtimeReclameAquiCases.at(-1)?.created_at ?? nowIso,
        totals: {
          queued: reclameAquiQueue.length,
          processed: 0,
          errored: 0
        },
        queuePreview: reclameAquiQueue
      }
    ]
  };
}

function ensureRuntimeState() {
  if (!runtimeInitialized) {
    runtimeSnapshot = createSnapshotForCurrentData();
    runtimeInitialized = true;
  }
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

function pushRecordToSnapshot(provider: ExternalFeedbackProvider, external: MockExternalFeedback, cursor: string) {
  ensureRuntimeState();
  if (!runtimeSnapshot) {
    return;
  }

  const nowIso = new Date().toISOString();
  const providerState = runtimeSnapshot.providers.find(item => item.provider === provider);
  if (!providerState) {
    return;
  }

  const record: MockIngestionRecord = {
    id: `${provider}-ingestion-${external.externalId}`,
    externalId: external.externalId,
    provider,
    status: 'pending',
    firstSeenAt: nowIso,
    lastUpdateAt: nowIso,
    processedAt: null,
    checksum: `sha256:${external.externalId}`,
    attemptCount: 0,
    priority: 'high',
    cursor
  };

  providerState.queuePreview = [record, ...providerState.queuePreview];
  providerState.totals.queued += 1;
  providerState.nextScheduledSync = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  providerState.lastCursor = cursor;

  const submitted = external.submittedAt ?? record.firstSeenAt;
  const submittedTime = new Date(submitted).getTime();
  const currentStart = providerState.pendingWindowStart ? new Date(providerState.pendingWindowStart).getTime() : Number.POSITIVE_INFINITY;
  const currentEnd = providerState.pendingWindowEnd ? new Date(providerState.pendingWindowEnd).getTime() : Number.NEGATIVE_INFINITY;

  if (submittedTime < currentStart) {
    providerState.pendingWindowStart = submitted;
  }
  if (submittedTime > currentEnd) {
    providerState.pendingWindowEnd = submitted;
  }

  runtimeSnapshot.generatedAt = nowIso;
}

function createTrustYouReviewFromPayload(payload: NewMockPayload): TrustYouReview {
  const timestamp = Date.now() + trustYouMockCounter++;
  const submittedAt = payload.submittedAt ? new Date(payload.submittedAt) : new Date();
  const stayStart = new Date(submittedAt.getTime() - 3 * 24 * 60 * 60 * 1000);
  const stayEnd = new Date(submittedAt.getTime() - 1 * 24 * 60 * 60 * 1000);
  const rating = payload.rating ?? 4.2;

  return {
    review_id: `TY-${timestamp}`,
    external_id: `trustyou-${timestamp}`,
    published_at: submittedAt.toISOString(),
    language: 'pt',
    stay_interval: {
      start: formatDateOnly(stayStart),
      end: formatDateOnly(stayEnd)
    },
    rating: {
      overall: rating,
      normalized_score: Math.round(Math.max(1, Math.min(5, rating)) * 20),
      traveler_type: 'business',
      subratings: {
        service: Math.max(1, Math.min(5, rating + 0.3)),
        breakfast: Math.max(1, Math.min(5, rating + 0.1)),
        wifi: Math.max(1, Math.min(5, rating - 0.8))
      }
    },
    title: payload.title ?? 'Novo feedback mockado',
    text: payload.reviewText,
    reviewer: {
      display_name: payload.reviewerName ?? 'Hóspede Mock',
      country: 'BR'
    },
    source: {
      name: 'Mock Channel',
      type: 'ota',
      review_url: `https://mock.trustyou/${timestamp}`
    },
    management_response: undefined,
    tags: payload.tags ?? ['mock']
  };
}

function createReclameAquiCaseFromPayload(payload: NewMockPayload): ReclameAquiCase {
  const timestamp = Date.now() + reclameAquiMockCounter++;
  const createdAt = payload.submittedAt ? new Date(payload.submittedAt) : new Date();
  return {
    id: timestamp,
    protocol: `HOS-${timestamp}`,
    status: 'pending',
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
    last_status_change: createdAt.toISOString(),
    occurred_at: formatDateOnly(new Date(createdAt.getTime() - 2 * 24 * 60 * 60 * 1000)),
    title: payload.title ?? 'Novo caso mockado',
    description: payload.reviewText,
    category: {
      id: 9999,
      name: 'Hotelaria e Turismo',
      subcategory: {
        id: 99991,
        name: 'Experiência do hóspede'
      }
    },
    consumer: {
      id: timestamp,
      name: payload.reviewerName ?? 'Consumidor Mock',
      nickname: (payload.reviewerName ?? 'Consumidor Mock').split(' ')[0] ?? 'Mock',
      city: 'São Paulo',
      state: 'SP',
      country: 'BR',
      portal_url: `https://www.reclameaqui.com.br/mock/${timestamp}`
    },
    company: {
      id: BASE_RECLAMEAQUI_CASES_RESPONSE.meta.company.id,
      name: BASE_RECLAMEAQUI_CASES_RESPONSE.meta.company.name,
      document: BASE_RECLAMEAQUI_CASES_RESPONSE.meta.company.id
    },
    evaluation: {
      solved: false,
      consumer_score: null,
      rating: payload.rating ?? null,
      answered_at: null
    },
    interactions: [
      {
        id: `msg-${timestamp}-1`,
        actor: 'consumer',
        created_at: createdAt.toISOString(),
        message: payload.reviewText
      }
    ],
    tags: payload.tags ?? ['mock'],
    links: {
      public_view: `https://www.reclameaqui.com.br/mock/caso/${timestamp}`
    }
  };
}

export function appendMockFeedback(payload: NewMockPayload): MockExternalFeedback {
  ensureRuntimeState();

  if (payload.provider === 'trustyou') {
    const review = createTrustYouReviewFromPayload(payload);
    runtimeTrustYouReviews.push(review);
    const external = mapTrustYouReviewToExternal(review);
    pushRecordToSnapshot('trustyou', external, `after:${review.review_id}`);
    return external;
  }

  const caseItem = createReclameAquiCaseFromPayload(payload);
  runtimeReclameAquiCases.push(caseItem);
  const external = mapReclameAquiCaseToExternal(caseItem);
  pushRecordToSnapshot('reclameaqui', external, `after:RA-${caseItem.id}`);
  return external;
}

export function getTrustYouMockResponse(): TrustYouReviewResponse {
  ensureRuntimeState();
  const base = BASE_TRUSTYOU_REVIEW_RESPONSE;
  const perPage = base.meta.pagination.per_page;
  const totalEntries = runtimeTrustYouReviews.length;
  return {
    meta: {
      ...base.meta,
      retrieved_at: new Date().toISOString(),
      pagination: {
        ...base.meta.pagination,
        total_entries: totalEntries,
        total_pages: Math.max(1, Math.ceil(totalEntries / perPage))
      }
    },
    data: JSON.parse(JSON.stringify(runtimeTrustYouReviews)) as TrustYouReview[]
  };
}

export function getReclameAquiMockResponse(): ReclameAquiCasesResponse {
  ensureRuntimeState();
  const base = BASE_RECLAMEAQUI_CASES_RESPONSE;
  const perPage = base.meta.pagination.per_page;
  const totalEntries = runtimeReclameAquiCases.length;
  return {
    meta: {
      ...base.meta,
      retrieved_at: new Date().toISOString(),
      pagination: {
        ...base.meta.pagination,
        total_entries: totalEntries,
        total_pages: Math.max(1, Math.ceil(totalEntries / perPage))
      }
    },
    data: JSON.parse(JSON.stringify(runtimeReclameAquiCases)) as ReclameAquiCase[]
  };
}

export function getMockExternalFeedbacks(): MockExternalFeedback[] {
  ensureRuntimeState();
  return buildProviderEntries().map(({ external }) => external);
}

export function getMockIngestionSnapshot(): MockIngestionSnapshot {
  ensureRuntimeState();
  return JSON.parse(JSON.stringify(runtimeSnapshot)) as MockIngestionSnapshot;
}

export function applyMockIngestionUpdate(result: MockIntegrationResult): MockIngestionSnapshot {
  ensureRuntimeState();
  const snapshot = JSON.parse(JSON.stringify(runtimeSnapshot)) as MockIngestionSnapshot;

  if (!result.metadata.analysisExecuted) {
    return snapshot;
  }

  const processedItems = result.items.filter((item) => !item.error);
  const processedAt = result.metadata.processedAt;
  const processedExternalIds = new Set(processedItems.map(item => item.external.externalId));

  snapshot.generatedAt = processedAt;

  for (const providerState of snapshot.providers) {
    const itemsForProvider = processedItems.filter(
      (item) => item.external.provider === providerState.provider
    );

    if (itemsForProvider.length === 0) {
      continue;
    }

    let processedDelta = 0;
    let resolvedErrored = 0;
    const queueCopy = providerState.queuePreview.map((record) => ({ ...record }));

    for (const item of itemsForProvider) {
      const index = queueCopy.findIndex((record) => record.externalId === item.external.externalId);

      if (index >= 0) {
        const existing = queueCopy[index];
        const wasErrored = existing.status === 'errored';
        const wasProcessed = existing.status === 'processed';

        if (!wasProcessed) {
          processedDelta += 1;
        }

        if (wasErrored) {
          resolvedErrored += 1;
        }

        queueCopy[index] = {
          ...existing,
          status: 'processed',
          processedAt,
          lastUpdateAt: processedAt,
          attemptCount: existing.attemptCount + 1,
          lastError: undefined,
          cursor: `after:${existing.externalId}`
        };
      } else {
        processedDelta += 1;

        queueCopy.unshift({
          id: `${providerState.provider}-ingestion-${item.external.externalId}`,
          externalId: item.external.externalId,
          provider: providerState.provider,
          status: 'processed',
          firstSeenAt: processedAt,
          lastUpdateAt: processedAt,
          processedAt,
          checksum: `sha256:${item.external.externalId}`,
          attemptCount: 1,
          priority: 'normal',
          cursor: `after:${item.external.externalId}`
        });
      }
    }

    providerState.queuePreview = queueCopy;

    const lastItem = itemsForProvider[itemsForProvider.length - 1];
    providerState.lastCursor = `after:${lastItem.external.externalId}`;
    providerState.lastSuccessfulSync = processedAt;

    const nextRun = new Date(new Date(processedAt).getTime() + 15 * 60 * 1000).toISOString();
    providerState.nextScheduledSync = nextRun;

    providerState.totals.processed += processedDelta;
    providerState.totals.queued = Math.max(providerState.totals.queued - processedDelta, 0);
    providerState.totals.errored = Math.max(providerState.totals.errored - resolvedErrored, 0);

    const outstanding = providerState.queuePreview
      .filter((record) => record.status === 'pending' || record.status === 'processing' || record.status === 'errored')
      .sort((a, b) => new Date(a.firstSeenAt).getTime() - new Date(b.firstSeenAt).getTime());

    if (outstanding.length > 0) {
      providerState.pendingWindowStart = outstanding[0].firstSeenAt;
      providerState.pendingWindowEnd = outstanding[outstanding.length - 1].firstSeenAt;
    } else {
      providerState.pendingWindowStart = processedAt;
      providerState.pendingWindowEnd = processedAt;
    }
  }

  runtimeSnapshot = JSON.parse(JSON.stringify(snapshot));
  return snapshot;
}

function normalizeExternalRating(rawScore?: number | null): number | undefined {
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) {
    return undefined;
  }

  if (rawScore <= 5) {
    return Math.min(5, Math.max(1, Math.round(rawScore)));
  }

  const scoreBasedRating = Math.round(rawScore / 20);
  if (scoreBasedRating <= 0) {
    return undefined;
  }

  return Math.min(5, Math.max(1, scoreBasedRating));
}

function mapRatingToSentiment(rating: number): 'positive' | 'neutral' | 'negative' {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

function mapTrustYouReviewToExternal(review: TrustYouReview): MockExternalFeedback {
  const hotel = BASE_TRUSTYOU_REVIEW_RESPONSE.meta.hotel;
  const stayDate = review.stay_interval.end || review.stay_interval.start || review.published_at;
  const language = review.language === 'pt' ? 'pt-BR' : review.language === 'en' ? 'en-US' : review.language;

  return {
    externalId: review.external_id,
    provider: 'trustyou',
    submittedAt: review.published_at,
    stayDate,
    score: review.rating.normalized_score,
    rating: review.rating.overall,
    title: review.title,
    reviewText: review.text,
    language,
    reviewerName: review.reviewer.display_name,
    reviewerProfileUrl: review.reviewer.profile_url,
    sourceName: review.source.name,
    hotel: {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      state: hotel.state,
      country: hotel.country
    },
    sourceUrl: review.source.review_url,
    tags: review.tags
  };
}

function mapReclameAquiCaseToExternal(caseItem: ReclameAquiCase): MockExternalFeedback {
  const metaCompany = BASE_RECLAMEAQUI_CASES_RESPONSE.meta.company;
  const stayDate = caseItem.occurred_at || caseItem.created_at;
  const score = typeof caseItem.evaluation.consumer_score === 'number' ? caseItem.evaluation.consumer_score : null;
  const normalizedRating = normalizeExternalRating(caseItem.evaluation.rating);

  return {
    externalId: String(caseItem.id),
    provider: 'reclameaqui',
    submittedAt: caseItem.created_at,
    stayDate,
    score: score ?? undefined,
    rating: normalizedRating,
    title: caseItem.title,
    reviewText: caseItem.description,
    language: 'pt-BR',
    reviewerName: caseItem.consumer.name,
    reviewerProfileUrl: caseItem.consumer.portal_url,
    sourceName: 'Reclame Aqui',
    hotel: {
      id: metaCompany.id,
      name: metaCompany.name,
      city: metaCompany.city,
      state: metaCompany.state,
      country: metaCompany.country
    },
    sourceUrl: caseItem.links?.public_view,
    tags: caseItem.tags
  };
}

function buildProviderEntries(): Array<{ external: MockExternalFeedback; providerPayload: Record<string, any> }> {
  const trustYouMeta = getTrustYouMockResponse().meta;
  const trustYouEntries = runtimeTrustYouReviews.map((review) => ({
    external: mapTrustYouReviewToExternal(review),
    providerPayload: {
      provider: 'trustyou',
      meta: trustYouMeta,
      review
    }
  }));

  const reclameMeta = getReclameAquiMockResponse().meta;
  const reclameAquiEntries = runtimeReclameAquiCases.map((caseItem) => ({
    external: mapReclameAquiCaseToExternal(caseItem),
    providerPayload: {
      provider: 'reclameaqui',
      meta: reclameMeta,
      case: caseItem
    }
  }));

  return [...trustYouEntries, ...reclameAquiEntries];
}

async function analyzeWithInternalPipeline(origin: string, text: string, apiKey?: string): Promise<LegacyFeedback> {
  const response = await fetch(`${origin}/api/analyze-feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({ texto: text, apiKey })
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(`Falha na análise interna: ${message}`);
  }

  return await response.json();
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error || data?.message || response.statusText;
  } catch (error) {
    return response.statusText;
  }
}

function resolveFinalRating(external: MockExternalFeedback, analysis?: LegacyFeedback): number {
  if (typeof analysis?.rating === 'number' && !Number.isNaN(analysis.rating)) {
    return Math.min(5, Math.max(1, Math.round(analysis.rating)));
  }

  const fromExternalRating = normalizeExternalRating(external.rating);
  if (typeof fromExternalRating === 'number') {
    return fromExternalRating;
  }

  const fromScore = normalizeExternalRating(external.score);
  if (typeof fromScore === 'number') {
    return fromScore;
  }

  return 3;
}

function buildFeedbackFromIntegration(external: MockExternalFeedback, analysis?: LegacyFeedback): Feedback {
  const normalizedRating = resolveFinalRating(external, analysis);
  const sentiment = mapRatingToSentiment(normalizedRating);
  const primaryProblemDetail = analysis?.allProblems?.find((problem) => problem.problem && problem.problem.trim() !== '')?.problem_detail
    ?? analysis?.allProblems?.[0]?.problem_detail;

  return {
    id: `${external.provider}-${external.externalId}`,
    date: external.submittedAt,
    comment: external.reviewText,
    rating: normalizedRating,
    sentiment,
    keyword: analysis?.keyword || 'Não identificado',
    sector: analysis?.sector || 'Não identificado',
    problem: analysis?.problem || 'EMPTY',
    problem_detail: primaryProblemDetail,
    hotel: external.hotel.name,
    hotelName: external.hotel.name,
    hotelId: external.hotel.id,
    source: external.sourceName || external.provider,
    language: external.language || 'pt-BR',
    score: external.score,
    url: external.sourceUrl,
    author: external.reviewerName,
    title: external.title,
    allProblems: analysis?.allProblems,
    has_suggestion: analysis?.has_suggestion,
    suggestion_type: analysis?.suggestion_type as Feedback['suggestion_type'],
    suggestion_summary: analysis?.suggestion_summary,
    compliments: analysis?.compliments,
    positive_details: analysis?.positive_details,
    reasoning: analysis?.reasoning,
    importId: 'mock-integration-test'
  };
}

export async function runMockIntegration(options: ProcessMockOptions): Promise<MockIntegrationResult> {
  const { origin, apiKey, skipAnalysis, ingestionSnapshot } = options;
  const errors: Array<{ externalId: string; message: string }> = [];
  const items: ProcessedMockFeedback[] = [];

  const processedLookup = new Map<ExternalFeedbackProvider, Set<string>>();
  if (ingestionSnapshot) {
    for (const providerState of ingestionSnapshot.providers) {
      const processedSet = new Set<string>();
      for (const record of providerState.queuePreview) {
        if (record.status === 'processed') {
          processedSet.add(record.externalId);
        }
      }
      processedLookup.set(providerState.provider, processedSet);
    }
  }

  for (const entry of buildProviderEntries()) {
    const { external, providerPayload } = entry;
    const processedSet = processedLookup.get(external.provider);
    if (processedSet?.has(external.externalId)) {
      continue;
    }
    let analysis: LegacyFeedback | undefined;
    let itemError: string | undefined;

    if (!skipAnalysis) {
      try {
        analysis = await analyzeWithInternalPipeline(origin, external.reviewText, apiKey);
      } catch (error: any) {
        itemError = error?.message || 'Erro desconhecido ao analisar feedback';
        if (itemError) {
          errors.push({ externalId: external.externalId, message: itemError });
        }
      }
    }

    const feedback = buildFeedbackFromIntegration(external, analysis);

    items.push({
      external,
      analysis,
      feedback,
      providerPayload,
      error: itemError
    });
  }

  return {
    metadata: {
      provider: 'mixed-mock',
      total: items.length,
      processedAt: new Date().toISOString(),
      analysisExecuted: !skipAnalysis
    },
    items,
    errors
  };
}

*/
export * from "./external-feedbacks";
