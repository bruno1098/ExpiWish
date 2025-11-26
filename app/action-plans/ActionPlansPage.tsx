"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ActionPlan,
  ActionPlanStatus,
  createActionPlan,
  fetchActionPlans,
  getAllAnalyses,
  listAllHotels,
  updateActionPlan,
  ActionPlanActor,
} from '@/lib/firestore-service';
import { Problem, Department } from '@/lib/taxonomy-types';
import { loadDepartments, loadProblems } from '@/lib/taxonomy-service';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { ActionPlanBoard } from './ActionPlanBoard';
import { ActionPlanForm } from './ActionPlanForm';
import { ActionPlanList } from './ActionPlanList';
import { ActionPlansCharts } from './ActionPlansCharts';
import { ActionPlanFormValues, DepartmentOption, ProblemOption } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { cn, formatDateBR, processProblemDistribution } from '@/lib/utils';
import { ACTION_PLAN_STATUS_META, ACTION_PLAN_TYPE_META } from './constants';

const extractDepartmentFromProblemLabel = (label?: string) => {
  if (!label) return null;
  const match = label.match(/^[^\-\n]+/);
  if (!match) return null;
  const department = match[0].trim();
  return department || null;
};

interface HotelOption {
  docId: string;
  hotelName: string;
}

interface TopProblemItem {
  label: string;
  value: number;
}

const mapProblems = (data: Problem[]): ProblemOption[] =>
  data
    .filter(problem => problem.status === 'active')
    .map(problem => ({
      id: problem.id,
      label: problem.label,
      slug: problem.slug,
      department: problem.applicable_departments?.[0],
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const mapDepartments = (data: Department[]): DepartmentOption[] =>
  data
    .filter(department => department.active)
    .map(department => ({
      id: department.id,
      label: department.label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const emptyStatusCount: Record<ActionPlanStatus, number> = {
  not_started: 0,
  in_progress: 0,
  completed: 0,
  delayed: 0,
};

export const ActionPlansPage = () => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [problems, setProblems] = useState<ProblemOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [topProblems, setTopProblems] = useState<TopProblemItem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<ProblemOption | null>(null);
  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement | null>(null);

  const resolvedHotel = useMemo(() => {
    if (userData?.role === 'admin') {
      if (selectedHotelId) {
        return hotelOptions.find(hotel => hotel.docId === selectedHotelId) ?? null;
      }
      return hotelOptions[0] ?? null;
    }

    if (userData?.hotelId) {
      return {
        docId: userData.hotelId,
        hotelName: userData.hotelName || 'Hotel',
      };
    }

    return null;
  }, [hotelOptions, selectedHotelId, userData]);

  const statusCounts = useMemo(() => {
    return plans.reduce((acc, plan) => {
      acc[plan.status] = (acc[plan.status] ?? 0) + 1;
      return acc;
    }, { ...emptyStatusCount });
  }, [plans]);

  const departmentChartData = useMemo(() => {
    const counts = new Map<string, number>();
    plans.forEach(plan => {
      if (!plan.departmentLabel) return;
      counts.set(plan.departmentLabel, (counts.get(plan.departmentLabel) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [plans]);

  const problemDepartmentMap = useMemo(() => {
    const map = new Map<string, string>();
    const departmentById = new Map(departments.map(department => [department.id, department.label]));

    problems.forEach(problem => {
      if (!problem.label) return;
      const departmentLabel =
        (problem.department && departmentById.get(problem.department)) ||
        extractDepartmentFromProblemLabel(problem.label) ||
        'Não mapeado';
      map.set(problem.label, departmentLabel);
    });

    return map;
  }, [departments, problems]);

  const departmentDistribution = useMemo(() => {
    if (!topProblems.length) return [] as Array<{ department: string; count: number; percentage: number }>;
    const counts = new Map<string, number>();
    topProblems.forEach(problem => {
      const department =
        problemDepartmentMap.get(problem.label) ?? extractDepartmentFromProblemLabel(problem.label) ?? 'Não mapeado';
      counts.set(department, (counts.get(department) ?? 0) + (problem.value ?? 0));
    });
    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(counts.entries())
      .map(([department, count]) => ({
        department,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [problemDepartmentMap, topProblems]);

  const totalTopOccurrences = useMemo(
    () => topProblems.reduce((sum, item) => sum + (item.value ?? 0), 0),
    [topProblems]
  );

  useEffect(() => {
    if (!userData || userData.role !== 'admin') return;
    listAllHotels()
      .then(result => {
        setHotelOptions(result);
        if (!selectedHotelId && result.length > 0) {
          setSelectedHotelId(result[0].docId);
        }
      })
      .catch(() => {
        toast({
          title: 'Erro ao carregar hotéis',
          description: 'Verifique sua conexão e tente novamente.',
          variant: 'destructive',
        });
      });
  }, [selectedHotelId, toast, userData]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTaxonomy(true);
    Promise.all([loadProblems(), loadDepartments()])
      .then(([problemData, departmentData]) => {
        if (!isMounted) return;
        setProblems(mapProblems(problemData));
        setDepartments(mapDepartments(departmentData));
      })
      .catch(() => {
        toast({
          title: 'Erro ao carregar taxonomia',
          description: 'Recarregue a página para tentar novamente.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (isMounted) setIsLoadingTaxonomy(false);
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const fetchPlans = useCallback(async () => {
    if (!resolvedHotel) return;
    setIsLoadingPlans(true);
    try {
      const response = await fetchActionPlans({
        hotelId: resolvedHotel.docId,
        hotelSlug: resolvedHotel.docId,
        hotelName: resolvedHotel.hotelName,
      });
      setPlans(response);
    } catch (error) {
      toast({
        title: 'Erro ao carregar planos',
        description: 'Não foi possível carregar os planos de ação.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPlans(false);
    }
  }, [resolvedHotel, toast]);

  const fetchTopProblems = useCallback(async () => {
    if (!resolvedHotel) return;
    setIsLoadingSignals(true);
    try {
      const analyses = await getAllAnalyses(resolvedHotel.docId, false);
      const safeAnalyses = Array.isArray(analyses) ? analyses : [];
      const allFeedbacks = safeAnalyses.reduce((acc: any[], analysis: any) => {
        if (!analysis || !Array.isArray(analysis.data)) {
          return acc;
        }
        const validFeedbacks = analysis.data.filter((feedback: any) => feedback && feedback.deleted !== true);
        return acc.concat(validFeedbacks);
      }, [] as any[]);

      const distribution = processProblemDistribution(allFeedbacks).slice(0, 10);
      setTopProblems(distribution);
    } catch (error) {
      console.error('Erro ao calcular problemas mais frequentes', error);
      setTopProblems([]);
    } finally {
      setIsLoadingSignals(false);
    }
  }, [resolvedHotel]);

  useEffect(() => {
    fetchPlans();
    fetchTopProblems();
  }, [fetchPlans, fetchTopProblems]);

  useEffect(() => {
    if (!searchParams) return;
    const slug = searchParams.get('problem');
    if (!slug || problems.length === 0) return;
    const found = problems.find(problem => problem.slug === slug || problem.id === slug || problem.label === slug);
    if (found) {
      setSelectedProblem(found);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [problems, searchParams]);

  const actor: ActionPlanActor | null = userData
    ? {
        uid: userData.uid,
        name: (userData as any)?.name ?? userData.email,
        email: userData.email,
      }
    : null;

  const handleCreatePlan = async (values: ActionPlanFormValues) => {
    if (!resolvedHotel || !actor) return;
    setIsSubmitting(true);
    try {
      const managerName = values.managerName?.trim() ? values.managerName.trim() : null;
      const budget = values.budget?.trim() ? values.budget.trim() : null;
      const plan = await createActionPlan({
        hotelId: resolvedHotel.docId,
        hotelName: resolvedHotel.hotelName,
        hotelSlug: resolvedHotel.docId,
        problemId: values.problemId,
        problemLabel: values.problemLabel,
        type: values.type,
        departmentId: values.departmentId,
        departmentLabel: values.departmentLabel,
        managerName,
        budget,
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status,
        description: values.description,
        createdBy: actor,
      });
      setPlans(prev => [plan, ...prev]);
      setFormResetKey(prev => prev + 1);
      toast({ title: 'Plano criado com sucesso', description: 'Continue acompanhando no quadro.' });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível criar o plano. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlan = async (values: ActionPlanFormValues) => {
    if (!resolvedHotel || !editingPlan || !actor) return;
    setIsSubmitting(true);
    try {
      const managerName = values.managerName?.trim() ? values.managerName.trim() : null;
      const budget = values.budget?.trim() ? values.budget.trim() : null;
      const updated = await updateActionPlan(resolvedHotel.docId, editingPlan.id, {
        problemId: values.problemId,
        problemLabel: values.problemLabel,
        type: values.type,
        departmentId: values.departmentId,
        departmentLabel: values.departmentLabel,
        managerName,
        budget,
        status: values.status,
        description: values.description,
        startDate: values.startDate,
        endDate: values.endDate,
        updatedBy: actor,
      });
      if (updated) {
        setPlans(prev => prev.map(plan => (plan.id === updated.id ? updated : plan)));
        toast({ title: 'Plano atualizado', description: 'Alterações salvas com sucesso.' });
      }
      setDrawerOpen(false);
      setEditingPlan(null);
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o plano.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (planId: string, status: ActionPlanStatus) => {
    if (!resolvedHotel || !actor) return;
    setIsStatusChanging(true);
    const previous = plans.find(plan => plan.id === planId);
    if (!previous) return;

    setPlans(prev => prev.map(plan => (plan.id === planId ? { ...plan, status } : plan)));
    try {
      const updated = await updateActionPlan(resolvedHotel.docId, planId, { status, updatedBy: actor });
      if (updated) {
        setPlans(prev => prev.map(plan => (plan.id === updated.id ? updated : plan)));
      }
    } catch (error) {
      setPlans(prev => prev.map(plan => (plan.id === planId ? previous : plan)));
      toast({
        title: 'Erro ao mover plano',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleSelectPlan = (plan: ActionPlan) => {
    setEditingPlan(plan);
    setDrawerOpen(true);
  };

  const handleTopProblemClick = (label: string) => {
    const found = problems.find(problem => problem.label === label);
    if (found) {
      setSelectedProblem(found);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      toast({
        title: 'Problema não encontrado',
        description: 'Atualize a lista de taxonomy para prosseguir.',
        variant: 'destructive',
      });
    }
  };

  if (!resolvedHotel) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Defina um hotel para continuar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Associe o usuário a um hotel ou selecione um hotel válido para acessar os planos de ação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Planos de ação inteligentes</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Action Plans</h1>
          <p className="text-muted-foreground">
            Centralize planos estratégicos conectados à taxonomia oficial e acompanhe execuções com gráficos, lista e quadro kanban.
          </p>
        </div>
        {userData?.role === 'admin' && (
          <div className="w-full max-w-sm">
            <Select value={resolvedHotel.docId} onValueChange={value => setSelectedHotelId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um hotel" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {hotelOptions.map(hotel => (
                  <SelectItem key={hotel.docId} value={hotel.docId}>
                    {hotel.hotelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]" ref={formRef} id="action-plan-form">
        <Card>
          <CardHeader>
            <CardTitle>Criar novo plano</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTaxonomy ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <ActionPlanForm
                key={formResetKey}
                mode="create"
                problems={problems}
                departments={departments}
                selectedProblem={selectedProblem}
                isSubmitting={isSubmitting}
                onSubmit={handleCreatePlan}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> TOP 10 problemas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSignals ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(item => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : topProblems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há problemas suficientes para montar o ranking deste hotel.
              </p>
            ) : (
              <>
                <ScrollArea className="h-[360px] pr-4">
                  <div className="space-y-3">
                    {topProblems.map((problem, index) => (
                      <div
                        key={problem.label}
                        className="flex items-center justify-between rounded-xl border bg-muted/20 p-3"
                      >
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">#{index + 1}</p>
                          <p className="font-medium text-sm text-foreground">{problem.label}</p>
                          <p className="text-xs text-muted-foreground">{problem.value} ocorrências</p>
                        </div>
                        <Button
                          variant="link"
                          className="text-primary"
                          onClick={() => handleTopProblemClick(problem.label)}
                        >
                          Criar plano
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="mt-2 text-xs text-muted-foreground">
                  Role a lista para conferir os 10 problemas e clique para pré-preencher o formulário.
                </p>
                {departmentDistribution.length > 0 && (
                  <div className="mt-6 border-t pt-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Ocorrências por departamento</h4>
                      <span className="text-xs text-muted-foreground">{totalTopOccurrences} registros</span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {departmentDistribution.map(({ department, count, percentage }) => (
                        <div key={department}>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span>{department}</span>
                            <span>{count} ocorrências</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ActionPlansCharts statusCounts={statusCounts} departmentCounts={departmentChartData} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-foreground">Quadro tipo Trello</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" /> Em tempo real
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => { fetchPlans(); fetchTopProblems(); }} disabled={isLoadingPlans}>
            <RefreshCw className={cn('h-4 w-4', isLoadingPlans && 'animate-spin')} />
            Atualizar
          </Button>
          {isStatusChanging && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <ActionPlanBoard plans={plans} onStatusChange={handleStatusChange} onSelect={handleSelectPlan} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lista detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionPlanList plans={plans} onSelect={handleSelectPlan} isLoading={isLoadingPlans} />
        </CardContent>
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[92vh] max-h-[92vh] sm:mx-auto sm:max-w-5xl">
          <div className="flex h-full flex-col">
            <DrawerHeader className="sm:mx-auto sm:max-w-4xl">
              <DrawerTitle>Editar plano de ação</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4 pb-10 sm:mx-auto sm:max-w-4xl">
            {editingPlan ? (
              <div className="space-y-6">
                <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano selecionado</p>
                      <h3 className="text-lg font-semibold text-foreground">{editingPlan.problemLabel}</h3>
                      <p className="text-sm text-muted-foreground">{editingPlan.departmentLabel || 'Departamento não definido'}</p>
                    </div>
                    <Badge className={ACTION_PLAN_STATUS_META[editingPlan.status].badgeClass}>
                      {ACTION_PLAN_STATUS_META[editingPlan.status].label}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Tipo</p>
                      <p className="text-sm font-semibold text-foreground">
                        {ACTION_PLAN_TYPE_META[editingPlan.type].label}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Gerente</p>
                      <p className="text-sm font-semibold text-foreground">{editingPlan.managerName || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Quanto</p>
                      <p className="text-sm font-semibold text-foreground">{editingPlan.budget || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Início</p>
                      <p className="text-sm font-semibold text-foreground">
                        {editingPlan.startDate ? formatDateBR(editingPlan.startDate) : 'Não definido'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Término</p>
                      <p className="text-sm font-semibold text-foreground">
                        {editingPlan.endDate ? formatDateBR(editingPlan.endDate) : 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-background/70 p-3 text-sm text-muted-foreground">
                    {editingPlan.description || 'Sem descrição cadastrada.'}
                  </div>
                </div>

                <ActionPlanForm
                  mode="edit"
                  problems={problems}
                  departments={departments}
                  defaultValues={{
                    problemId: editingPlan.problemId,
                    problemLabel: editingPlan.problemLabel,
                    type: editingPlan.type,
                    departmentId: editingPlan.departmentId,
                    departmentLabel: editingPlan.departmentLabel,
                    managerName: editingPlan.managerName ?? '',
                    budget: editingPlan.budget ?? '',
                    startDate: editingPlan.startDate,
                    endDate: editingPlan.endDate,
                    status: editingPlan.status,
                    description: editingPlan.description,
                  }}
                  isSubmitting={isSubmitting}
                  onSubmit={handleUpdatePlan}
                  onCancel={() => setDrawerOpen(false)}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um plano para editar.</p>
            )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
};
