"use client";

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionPlan, ActionPlanStatus } from '@/lib/firestore-service';
import { formatDateBR } from '@/lib/utils';
import { ACTION_PLAN_STATUS_ORDER, getActionPlanStatusMeta, normalizeActionPlanStatus } from './constants';
import { cn } from '@/lib/utils';

interface ActionPlanBoardProps {
  plans: ActionPlan[];
  onStatusChange: (planId: string, status: ActionPlanStatus) => void;
  onSelect?: (plan: ActionPlan) => void;
}

const BoardPlanCard = ({ plan, highlight = false }: { plan: ActionPlan; highlight?: boolean }) => {
  const statusMeta = getActionPlanStatusMeta(plan.status);

  return (
    <Card
      className={cn(
        'flex flex-col gap-2 border bg-white p-3 shadow-sm transition dark:bg-slate-900',
        highlight && 'ring-2 ring-primary'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-foreground">{plan.problemLabel}</p>
        <Badge className="bg-muted text-xs text-muted-foreground" variant="outline">
          {statusMeta.label}
        </Badge>
      </div>
    <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span>Depto: {plan.departmentLabel || '—'}</span>
      <span>Gerente: {plan.managerName || '—'}</span>
      <span>Quanto: {plan.budget || '—'}</span>
      <span>Início: {plan.startDate ? formatDateBR(plan.startDate) : '—'}</span>
      <span>Término: {plan.endDate ? formatDateBR(plan.endDate) : '—'}</span>
    </div>
    </Card>
  );
};

const SortableBoardPlanCard = ({ plan }: { plan: ActionPlan }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
    data: { plan },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <BoardPlanCard plan={plan} highlight={isDragging} />
    </div>
  );
};

interface StatusColumnProps {
  status: ActionPlanStatus;
  plans: ActionPlan[];
  onSelect?: (plan: ActionPlan) => void;
}

const StatusColumn = ({ status, plans, onSelect }: StatusColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const statusMeta = getActionPlanStatusMeta(status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[260px] flex-col rounded-2xl border p-4 transition',
        statusMeta.boardAccent,
        isOver && 'ring-2 ring-primary/40'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-foreground">{statusMeta.label}</p>
          <p className="text-xs text-muted-foreground">{plans.length} planos</p>
        </div>
        <Badge variant="outline">{plans.length}</Badge>
      </div>
      <SortableContext items={plans.map(plan => plan.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-3 space-y-3">
          {plans.map(plan => (
            <div key={plan.id} onClick={() => onSelect?.(plan)}>
              <SortableBoardPlanCard plan={plan} />
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const ActionPlanBoard = ({ plans, onStatusChange, onSelect }: ActionPlanBoardProps) => {
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const groupedPlans = useMemo(() => {
    const base: Record<ActionPlanStatus, ActionPlan[]> = {
      not_started: [],
      in_progress: [],
      completed: [],
      delayed: [],
    };
    plans.forEach(plan => {
      const normalizedStatus = normalizeActionPlanStatus(plan.status);
      base[normalizedStatus] = [...(base[normalizedStatus] ?? []), plan];
    });
    return base;
  }, [plans]);

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlan(event.active.data.current?.plan ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlan(null);

    if (!over) return;

    const draggedPlan = active.data.current?.plan as ActionPlan | undefined;
    const containerId = (over.data.current as any)?.sortable?.containerId as ActionPlanStatus | undefined;
    const overId = over.id as ActionPlanStatus;
    const nextStatus = containerId || overId;

    if (!draggedPlan || !nextStatus || draggedPlan.status === nextStatus) {
      return;
    }

    onStatusChange(draggedPlan.id, nextStatus);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ACTION_PLAN_STATUS_ORDER.map(status => (
          <StatusColumn key={status} status={status} plans={groupedPlans[status]} onSelect={onSelect} />
        ))}
      </div>
      <DragOverlay>{activePlan ? <BoardPlanCard plan={activePlan} highlight /> : null}</DragOverlay>
    </DndContext>
  );
};
