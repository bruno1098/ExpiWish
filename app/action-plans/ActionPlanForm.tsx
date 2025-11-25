"use client";

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActionPlanStatus, ActionPlanType } from '@/lib/firestore-service';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ACTION_PLAN_STATUS_META, ACTION_PLAN_STATUS_ORDER, ACTION_PLAN_TYPE_META } from './constants';
import { ActionPlanFormValues, DepartmentOption, ProblemOption } from './types';
import { Input } from '@/components/ui/input';

const schema = z.object({
  problemId: z.string().min(1, 'Selecione um problema'),
  problemLabel: z.string().min(1, 'Selecione um problema'),
  type: z.enum(['product', 'service']),
  departmentId: z.string().min(1, 'Selecione um departamento'),
  departmentLabel: z.string().min(1, 'Selecione um departamento'),
  managerName: z
    .string()
    .max(120, 'Use no máximo 120 caracteres')
    .optional()
    .or(z.literal('')),
  budget: z
    .string()
    .max(60, 'Use no máximo 60 caracteres')
    .optional()
    .or(z.literal('')),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'delayed']),
  description: z.string().min(8, 'Descreva a ação proposta com pelo menos 8 caracteres'),
});

const DEFAULT_VALUES: ActionPlanFormValues = {
  problemId: '',
  problemLabel: '',
  type: 'service',
  departmentId: '',
  departmentLabel: '',
  managerName: '',
  budget: '',
  startDate: null,
  endDate: null,
  status: 'not_started',
  description: '',
};

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const formatBudgetDisplay = (value?: string | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numeric = Number(digits) / 100;
  return BRL_FORMATTER.format(numeric);
};

interface ActionPlanFormProps {
  mode: 'create' | 'edit';
  problems: ProblemOption[];
  departments: DepartmentOption[];
  defaultValues?: Partial<ActionPlanFormValues>;
  selectedProblem?: ProblemOption | null;
  isSubmitting?: boolean;
  onSubmit: (values: ActionPlanFormValues) => void | Promise<void>;
  onCancel?: () => void;
}

export const ActionPlanForm = ({
  mode,
  problems,
  departments,
  defaultValues,
  selectedProblem,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: ActionPlanFormProps) => {
  const resolvedDefaults = useMemo(() => {
    const merged = { ...DEFAULT_VALUES, ...defaultValues } as ActionPlanFormValues;
    if (merged.budget) {
      merged.budget = formatBudgetDisplay(merged.budget);
    }
    return merged;
  }, [defaultValues]);

  const form = useForm<ActionPlanFormValues>({
    defaultValues: resolvedDefaults,
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (selectedProblem && mode === 'create') {
      form.setValue('problemId', selectedProblem.id);
      form.setValue('problemLabel', selectedProblem.label);
    }
  }, [mode, selectedProblem, form]);

  useEffect(() => {
    if (defaultValues) {
      Object.entries(defaultValues).forEach(([key, value]) => {
        if (key === 'budget') {
          form.setValue('budget', formatBudgetDisplay(value as string) as never);
        } else {
          form.setValue(key as keyof ActionPlanFormValues, value as never);
        }
      });
    }
  }, [defaultValues, form]);

  const handleProblemChange = (problemId: string) => {
    const selected = problems.find(item => item.id === problemId);
    form.setValue('problemId', problemId);
    form.setValue('problemLabel', selected?.label ?? '');
  };

  const handleDepartmentChange = (departmentId: string) => {
    const selected = departments.find(item => item.id === departmentId);
    form.setValue('departmentId', departmentId);
    form.setValue('departmentLabel', selected?.label ?? '');
  };

  const handleSubmit = (values: ActionPlanFormValues) => {
    onSubmit({
      ...values,
      budget: formatBudgetDisplay(values.budget) || '',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="problemId"
            render={() => (
              <FormItem>
                <FormLabel>Problema</FormLabel>
                <Select
                  value={form.watch('problemId')}
                  onValueChange={value => handleProblemChange(value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um problema" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-64">
                    {problems.map(problem => (
                      <SelectItem key={problem.id} value={problem.id}>
                        {problem.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(ACTION_PLAN_TYPE_META) as ActionPlanType[]).map(type => (
                      <SelectItem key={type} value={type}>
                        {ACTION_PLAN_TYPE_META[type].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ACTION_PLAN_TYPE_META[field.value]?.description}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departmentId"
            render={() => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <Select
                  value={form.watch('departmentId')}
                  onValueChange={value => handleDepartmentChange(value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um departamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-64">
                    {departments.map(department => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTION_PLAN_STATUS_ORDER.map(status => (
                      <SelectItem key={status} value={status}>
                        {ACTION_PLAN_STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="managerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gerente responsável</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quanto (orçamento)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    onChange={event => {
                      const formatted = formatBudgetDisplay(event.target.value);
                      field.onChange(formatted);
                    }}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Digite apenas números e veja o valor formatado automaticamente em BRL.</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Início previsto</FormLabel>
                <DatePicker
                  date={field.value ? new Date(field.value) : null}
                  onChange={date => field.onChange(date ? date.toISOString() : null)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Término previsto</FormLabel>
                <DatePicker
                  date={field.value ? new Date(field.value) : null}
                  onChange={date => field.onChange(date ? date.toISOString() : null)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ação proposta</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalhe a ação, responsáveis, entregáveis e próximos passos."
                  className="min-h-[140px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {mode === 'create' ? 'Cadastrar plano' : 'Salvar alterações'}
          </Button>
          {mode === 'edit' && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};
