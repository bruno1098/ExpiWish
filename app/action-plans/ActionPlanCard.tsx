"use client";

import { memo } from 'react';
import { ActionPlan } from '@/lib/firestore-service';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ACTION_PLAN_TYPE_META, getActionPlanStatusMeta } from './constants';
import { cn, formatDateBR } from '@/lib/utils';
import { ChevronRight, MousePointerClick } from 'lucide-react';

interface ActionPlanCardProps {
  plan: ActionPlan;
  onClick?: (plan: ActionPlan) => void;
  compact?: boolean;
}

const ActionPlanCardComponent = ({ plan, onClick, compact = false }: ActionPlanCardProps) => {
  const statusMeta = getActionPlanStatusMeta(plan.status);
  const typeMeta = ACTION_PLAN_TYPE_META[plan.type];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(plan)}
      className={cn(
        'group relative flex flex-col gap-3 border transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        compact ? 'p-3' : 'p-5'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn('h-2 w-2 rounded-full', statusMeta.dotClass)} />
          <span className="text-foreground">{plan.problemLabel || 'Problema indefinido'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
          <div className="hidden items-center gap-1 text-xs font-semibold text-primary/80 transition-opacity group-hover:flex">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span>Ver detalhes</span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-3 text-sm text-muted-foreground',
          compact ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Departamento</p>
          <p className="text-foreground font-medium">{plan.departmentLabel || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Tipo</p>
          <p className="text-foreground font-medium">{typeMeta.label}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Gerente</p>
          <p className="text-foreground font-medium">{plan.managerName || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Início</p>
          <p className="text-foreground font-medium">{plan.startDate ? formatDateBR(plan.startDate) : 'Não definido'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Término</p>
          <p className="text-foreground font-medium">{plan.endDate ? formatDateBR(plan.endDate) : 'Não definido'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Quanto</p>
          <p className="text-foreground font-medium">{plan.budget || '—'}</p>
        </div>
      </div>

      {!compact && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {plan.description || 'Sem descrição cadastrada.'}
        </p>
      )}

      <div className="flex items-center justify-end text-xs text-muted-foreground">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Card>
  );
};

export const ActionPlanCard = memo(ActionPlanCardComponent);
