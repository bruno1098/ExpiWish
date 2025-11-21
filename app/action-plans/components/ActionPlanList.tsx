"use client";

import { useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ActionPlan, ActionPlanStatus, ActionPlanType } from "@/lib/firestore-service";
import { ActionPlanCard } from "./ActionPlanCard";
import {
  ACTION_PLAN_TYPE_LABELS,
  STATUS_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  ACTION_PLAN_STATUS_META,
} from "../constants";

interface ActionPlanListFilters {
  search: string;
  status: "all" | ActionPlanStatus;
  type: "all" | ActionPlanType;
  hotel: string;
}

interface ActionPlanListProps {
  plans: ActionPlan[];
  loading?: boolean;
  onSelectPlan?: (plan: ActionPlan) => void;
  filters: ActionPlanListFilters;
  onFiltersChange: (filters: Partial<ActionPlanListFilters>) => void;
  showHotelFilter?: boolean;
  availableHotels?: Array<{ value: string; label: string }>;
}

export const ActionPlanList = ({
  plans,
  loading,
  onSelectPlan,
  filters,
  onFiltersChange,
  showHotelFilter = false,
  availableHotels = [],
}: ActionPlanListProps) => {
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch = filters.search
        ? [
            plan.problemLabel,
            plan.departmentLabel,
            plan.description,
            plan.hotelName,
          ]
            .filter(Boolean)
            .some((field) =>
              field!.toLowerCase().includes(filters.search.toLowerCase()),
            )
        : true;

      const matchesStatus =
        filters.status === "all" ? true : plan.status === filters.status;

      const matchesType =
        filters.type === "all" ? true : plan.type === filters.type;

      const matchesHotel =
        !showHotelFilter || filters.hotel === "all"
          ? true
          : plan.hotelSlug === filters.hotel;

      return matchesSearch && matchesStatus && matchesType && matchesHotel;
    });
  }, [filters.hotel, filters.search, filters.status, filters.type, plans, showHotelFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por problema, departamento ou descrição"
            className="pl-9"
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ search: event.target.value })
            }
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(value: ActionPlanStatus | "all") =>
            onFiltersChange({ status: value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.type}
          onValueChange={(value: ActionPlanType | "all") =>
            onFiltersChange({ type: value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showHotelFilter && (
          <Select
            value={filters.hotel}
            onValueChange={(value) => onFiltersChange({ hotel: value })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Hotel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os hotéis</SelectItem>
              {availableHotels.map((hotel) => (
                <SelectItem key={hotel.value} value={hotel.value}>
                  {hotel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Nenhum plano encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlans.map((plan) => (
            <ActionPlanCard
              key={plan.id}
              plan={plan}
              onSelect={onSelectPlan}
              showHotelBadge={showHotelFilter}
            />
          ))}
        </div>
      )}

      {filteredPlans.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {Object.entries(ACTION_PLAN_STATUS_META).map(([status, meta]) => {
            const count = filteredPlans.filter(
              (plan) => plan.status === status,
            ).length;
            return (
              <Badge key={status} variant="outline" className="flex items-center gap-2">
                <span
                  className={`${meta.dotClass} inline-block h-2 w-2 rounded-full`}
                />
                {meta.label}: {count}
              </Badge>
            );
          })}
          <Badge variant="secondary" className="flex items-center gap-2">
            Total: {filteredPlans.length}
          </Badge>
        </div>
      )}
    </div>
  );
};
