"use client";

import { memo } from "react";
import { CalendarDays, Clock3, Building2, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateBR } from "@/lib/utils";
import { ActionPlan } from "@/lib/firestore-service";
import {
  ACTION_PLAN_STATUS_META,
  ACTION_PLAN_TYPE_LABELS,
} from "../constants";

interface ActionPlanCardProps {
  plan: ActionPlan;
  onSelect?: (plan: ActionPlan) => void;
  highlight?: boolean;
  showHotelBadge?: boolean;
}

const ActionPlanCardComponent = ({
  plan,
  onSelect,
  highlight = false,
  showHotelBadge = false,
}: ActionPlanCardProps) => {
  const statusMeta = ACTION_PLAN_STATUS_META[plan.status];
  const start = plan.startDate ? formatDateBR(plan.startDate) : "Sem início";
  const end = plan.endDate ? formatDateBR(plan.endDate) : "Sem término";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(plan)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(plan);
        }
      }}
      className={cn(
        "p-5 transition-all duration-200 border shadow-sm hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        highlight && "ring-2 ring-violet-400 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("px-3 py-1 text-xs font-medium", statusMeta.badgeClass)}
            >
              <span
                className={cn(
                  "mr-2 inline-block h-2 w-2 rounded-full",
                  statusMeta.dotClass,
                )}
              />
              {statusMeta.label}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {ACTION_PLAN_TYPE_LABELS[plan.type]}
            </Badge>
            {showHotelBadge && (
              <Badge variant="outline" className="text-xs">
                <Building2 className="mr-1 h-3 w-3" />
                {plan.hotelName || plan.hotelSlug}
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {plan.problemLabel}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {plan.description || "Sem descrição cadastrada."}
          </p>
        </div>
        <ArrowUpRight className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Departamento</p>
            <p className="font-medium">{plan.departmentLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Início</p>
            <p className="font-medium">{start}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Término</p>
            <p className="font-medium">{end}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>
          Criado por {plan.createdBy?.name || plan.createdBy?.email || "Usuário"}
        </span>
        <span>Atualizado em {formatDateBR(plan.updatedAt)}</span>
      </div>
    </Card>
  );
};

export const ActionPlanCard = memo(ActionPlanCardComponent);
