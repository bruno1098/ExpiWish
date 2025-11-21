import { ActionPlanStatus, ActionPlanType } from "@/lib/firestore-service";

export const ACTION_PLAN_STATUS_META: Record<
  ActionPlanStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  not_started: {
    label: "A iniciar",
    badgeClass:
      "bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800",
    dotClass: "bg-slate-400",
  },
  in_progress: {
    label: "Em andamento",
    badgeClass:
      "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900",
    dotClass: "bg-amber-500",
  },
  completed: {
    label: "Concluído",
    badgeClass:
      "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-900",
    dotClass: "bg-emerald-500",
  },
  delayed: {
    label: "Atrasado",
    badgeClass:
      "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/30 dark:text-rose-100 dark:border-rose-900",
    dotClass: "bg-rose-500",
  },
};

export const ACTION_PLAN_TYPE_LABELS: Record<ActionPlanType, string> = {
  product: "Produto",
  service: "Serviço",
};

export const STATUS_FILTER_OPTIONS: Array<{
  value: "all" | ActionPlanStatus;
  label: string;
}> = [{ value: "all", label: "Todos" },
  ...Object.entries(ACTION_PLAN_STATUS_META).map(([value, meta]) => ({
    value: value as ActionPlanStatus,
    label: meta.label,
  }))
];

export const TYPE_FILTER_OPTIONS: Array<{ value: "all" | ActionPlanType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "product", label: ACTION_PLAN_TYPE_LABELS.product },
  { value: "service", label: ACTION_PLAN_TYPE_LABELS.service },
];
