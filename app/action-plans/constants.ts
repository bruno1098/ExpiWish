import { ActionPlanStatus, ActionPlanType } from '@/lib/firestore-service';

const DEFAULT_STATUS: ActionPlanStatus = 'not_started';

type StatusMeta = {
  label: string;
  badgeClass: string;
  dotClass: string;
  boardAccent: string;
  gradient: string;
  chartColor: string;
};

export const ACTION_PLAN_STATUS_META: Record<ActionPlanStatus, StatusMeta> = {
  not_started: {
    label: 'A iniciar',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    dotClass: 'bg-slate-400',
    boardAccent: 'border-slate-200/80 bg-slate-50/80',
    gradient: 'from-slate-50 to-white',
    chartColor: '#94a3b8',
  },
  in_progress: {
    label: 'Em andamento',
    badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200',
    dotClass: 'bg-sky-500',
    boardAccent: 'border-sky-200/80 bg-sky-50/70',
    gradient: 'from-sky-50 to-white',
    chartColor: '#38bdf8',
  },
  completed: {
    label: 'Concluído',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    boardAccent: 'border-emerald-200/80 bg-emerald-50/70',
    gradient: 'from-emerald-50 to-white',
    chartColor: '#34d399',
  },
  delayed: {
    label: 'Atrasado',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
    dotClass: 'bg-rose-500',
    boardAccent: 'border-rose-200/80 bg-rose-50/70',
    gradient: 'from-rose-50 to-white',
    chartColor: '#fb7185',
  },
};

const FALLBACK_STATUS_META: StatusMeta = {
  label: 'Status indefinido',
  badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
  dotClass: 'bg-gray-400',
  boardAccent: 'border-gray-200/80 bg-gray-50/80',
  gradient: 'from-gray-50 to-white',
  chartColor: '#9ca3af',
};

export const normalizeActionPlanStatus = (status?: string | null): ActionPlanStatus => {
  if (!status) {
    return DEFAULT_STATUS;
  }
  return (ACTION_PLAN_STATUS_META as Record<string, StatusMeta>)[status]
    ? (status as ActionPlanStatus)
    : DEFAULT_STATUS;
};

export const getActionPlanStatusMeta = (status?: string | null): StatusMeta => {
  const normalized = normalizeActionPlanStatus(status ?? undefined);
  return ACTION_PLAN_STATUS_META[normalized] ?? FALLBACK_STATUS_META;
};

export const ACTION_PLAN_TYPE_META: Record<
  ActionPlanType,
  {
    label: string;
    description: string;
  }
> = {
  product: {
    label: 'Produto',
    description: 'Itens físicos, amenities e estrutura tangível.',
  },
  service: {
    label: 'Serviço',
    description: 'Atendimento, processos e experiência do hóspede.',
  },
};

export const ACTION_PLAN_STATUS_ORDER: ActionPlanStatus[] = [
  'not_started',
  'in_progress',
  'delayed',
  'completed',
];
