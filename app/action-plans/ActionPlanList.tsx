"use client";

import { useMemo } from 'react';
import { ActionPlan } from '@/lib/firestore-service';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { ActionPlanCard } from './ActionPlanCard';
import { Skeleton } from '@/components/ui/skeleton';
import { MousePointerClick, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ACTION_PLAN_STATUS_META, ACTION_PLAN_STATUS_ORDER } from './constants';

interface ActionPlanListProps {
  plans: ActionPlan[];
  onSelect?: (plan: ActionPlan) => void;
  isLoading?: boolean;
}

export const ActionPlanList = ({ plans, onSelect, isLoading = false }: ActionPlanListProps) => {
  const [query, setQuery] = useState('');

  const filteredPlans = useMemo(() => {
    if (!query.trim()) {
      return plans;
    }
    const normalized = query.trim().toLowerCase();
    return plans.filter(plan => {
      return (
        plan.problemLabel.toLowerCase().includes(normalized) ||
        plan.description.toLowerCase().includes(normalized) ||
        plan.departmentLabel.toLowerCase().includes(normalized) ||
        (plan.managerName ?? '').toLowerCase().includes(normalized) ||
        (plan.budget ?? '').toLowerCase().includes(normalized)
      );
    });
  }, [plans, query]);

  const statusSummary = useMemo(() => {
    return plans.reduce((acc, plan) => {
      acc[plan.status] = (acc[plan.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [plans]);

  return (
    <div className="relative z-10 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por problema, departamento ou palavra-chave"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {ACTION_PLAN_STATUS_ORDER.map(status => {
          const meta = ACTION_PLAN_STATUS_META[status];
          return (
            <Badge key={status} variant="secondary" className="bg-muted text-foreground">
              {meta.label}: {statusSummary[status] ?? 0}
            </Badge>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredPlans.length} plano(s) exibido(s) de {plans.length} no total.
        </span>
        <span>
          Clique em um cartão para abrir os detalhes completos.
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <MousePointerClick className="h-4 w-4 text-primary" />
        <div className="flex flex-col gap-0.5 text-left">
          <span className="font-medium text-foreground">Cards interativos</span>
          <span>
            Passe o mouse e clique para abrir o resumo detalhado do plano antes da edição.
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(id => (
            <Skeleton key={id} className="h-[130px] w-full" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum plano encontrado.
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-3">
          <div className="space-y-3">
            {filteredPlans.map(plan => (
              <ActionPlanCard key={plan.id} plan={plan} onClick={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
