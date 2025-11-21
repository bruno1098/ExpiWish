"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { getDynamicLists } from "@/lib/dynamic-lists-service";
import { ActionPlanForm, ActionPlanFormValues } from "./components/ActionPlanForm";
import { ActionPlanList } from "./components/ActionPlanList";
import {
  createActionPlan,
  updateActionPlan,
  listenActionPlans,
  ActionPlanStatus,
  ActionPlanType,
  normalizeHotelName,
  ActionPlan,
} from "@/lib/firestore-service";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function ActionPlansPageContent() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const problemFromDashboard = searchParams?.get("problem") ?? null;
  const departmentFromDashboard = searchParams?.get("department") ?? null;

  const [problems, setProblems] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all" as "all" | ActionPlanStatus,
    type: "all" as "all" | ActionPlanType,
    hotel: "all",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadLists = async () => {
      try {
        const lists = await getDynamicLists();
        if (mounted) {
          setProblems(lists.problems);
          setDepartments(lists.departments);
        }
      } catch (error) {
        console.error("Erro ao carregar listas dinâmicas", error);
        toast({
          title: "Não foi possível carregar os problemas",
          description: "Verifique sua conexão e tente novamente.",
          variant: "destructive",
        });
      }
    };
    loadLists();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!userData) return;

    setIsLoadingPlans(true);
    const unsubscribe = listenActionPlans(
      userData.role === "admin"
        ? {}
        : {
            hotelId: userData.hotelId,
            hotelName: userData.hotelName,
            hotelSlug: normalizeHotelName(userData.hotelName || userData.hotelId),
          },
      (nextPlans) => {
        setPlans(nextPlans);
        setIsLoadingPlans(false);
      },
      () => {
        toast({
          title: "Erro ao sincronizar planos",
          description: "Atualize a página ou tente novamente mais tarde.",
          variant: "destructive",
        });
        setIsLoadingPlans(false);
      },
    );

    return () => unsubscribe?.();
  }, [toast, userData]);

  const availableHotels = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((plan) => {
      if (plan.hotelSlug) {
        map.set(plan.hotelSlug, plan.hotelName || plan.hotelSlug);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [plans]);

  const stats = useMemo(() => {
    const statusCounts: Record<ActionPlanStatus, number> = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
    };
    plans.forEach((plan) => {
      statusCounts[plan.status] += 1;
    });
    return {
      total: plans.length,
      statusCounts,
      delayed: statusCounts.delayed,
      inProgress: statusCounts.in_progress,
      completed: statusCounts.completed,
    };
  }, [plans]);

  const handleFiltersChange = (partial: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectPlan = (plan: ActionPlan) => {
    setSelectedPlan(plan);
    setEditModalOpen(true);
  };

  const handleCreate = useCallback(
    async (values: ActionPlanFormValues) => {
      if (!userData) return;
      setFormSubmitting(true);
      try {
        await createActionPlan({
          hotelId: userData.hotelId,
          hotelName: userData.hotelName,
          hotelSlug: normalizeHotelName(userData.hotelName || userData.hotelId),
          problemId: slugify(values.problemLabel),
          problemLabel: values.problemLabel,
          type: values.type,
          departmentId: slugify(values.departmentLabel),
          departmentLabel: values.departmentLabel,
          startDate: values.startDate?.toISOString() ?? null,
          endDate: values.endDate?.toISOString() ?? null,
          status: values.status,
          description: values.description,
          createdBy: {
            uid: userData.uid,
            name: userData.name,
            email: userData.email,
          },
        });
        toast({
          title: "Plano criado",
          description: "O plano de ação foi registrado com sucesso.",
        });
      } catch (error) {
        console.error("Erro ao criar plano", error);
        toast({
          title: "Erro ao criar plano",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setFormSubmitting(false);
      }
    },
    [toast, userData],
  );

  const handleUpdate = useCallback(
    async (values: ActionPlanFormValues) => {
      if (!selectedPlan) return;
      setFormSubmitting(true);
      try {
        await updateActionPlan(selectedPlan.hotelSlug, selectedPlan.id, {
          problemId: slugify(values.problemLabel),
          problemLabel: values.problemLabel,
          type: values.type,
          departmentId: slugify(values.departmentLabel),
          departmentLabel: values.departmentLabel,
          startDate: values.startDate?.toISOString() ?? null,
          endDate: values.endDate?.toISOString() ?? null,
          status: values.status,
          description: values.description,
          updatedBy: {
            uid: userData?.uid || "",
            name: userData?.name,
            email: userData?.email,
          },
        });
        toast({
          title: "Plano atualizado",
          description: "Alterações salvas com sucesso.",
        });
        setEditModalOpen(false);
        setSelectedPlan(null);
      } catch (error) {
        console.error("Erro ao atualizar plano", error);
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível salvar as alterações.",
          variant: "destructive",
        });
      } finally {
        setFormSubmitting(false);
      }
    },
    [selectedPlan, toast, userData?.email, userData?.name, userData?.uid],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
            Planos de Ação
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Atualização automática
          </Badge>
          {problemFromDashboard && (
            <Badge variant="secondary" className="text-xs">
              Problema pré-selecionado do dashboard
            </Badge>
          )}
        </div>
        <CardDescription>
          Crie e acompanhe planos de ação vinculados aos problemas identificados nos
          painéis analíticos.
        </CardDescription>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de planos</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Distribuídos entre todos os status
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-500" /> Em andamento
            </CardDescription>
            <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Planos que já estão em execução
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              <AlertTriangle className="mr-1 inline h-4 w-4 text-rose-500" /> Atrasados
            </CardDescription>
            <CardTitle className="text-3xl">{stats.delayed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Requerem atenção imediata
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              <Lightbulb className="mr-1 inline h-4 w-4 text-amber-500" /> Concluídos
            </CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Impactos positivos já entregues
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Novo plano de ação</CardTitle>
              <CardDescription>
                Selecione um problema dos gráficos do dashboard e registre a ação corretiva.
              </CardDescription>
            </div>
            {problemFromDashboard && (
              <Badge variant="outline" className="text-xs">
                Baseado em: {problemFromDashboard}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ActionPlanForm
            mode="create"
            problems={problems}
            departments={departments}
            defaultProblem={problemFromDashboard}
            defaultDepartment={departmentFromDashboard}
            onSubmit={handleCreate}
            submitting={formSubmitting && !editModalOpen}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Planos cadastrados</CardTitle>
              <CardDescription>Filtros dinâmicos atualizam os cartões em tempo real.</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {plans.length} planos monitorados
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ActionPlanList
            plans={plans}
            loading={isLoadingPlans}
            onSelectPlan={handleSelectPlan}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showHotelFilter={userData?.role === "admin"}
            availableHotels={availableHotels}
          />
        </CardContent>
      </Card>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar plano de ação</DialogTitle>
            <DialogDescription>
              Atualize o status ou ajuste os prazos conforme a execução do plano.
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <ActionPlanForm
              mode="edit"
              problems={problems}
              departments={departments}
              initialValues={selectedPlan}
              onSubmit={handleUpdate}
              submitting={formSubmitting}
              onCancel={() => {
                setEditModalOpen(false);
                setSelectedPlan(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
