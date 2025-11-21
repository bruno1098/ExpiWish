"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  ACTION_PLAN_STATUS_META,
  ACTION_PLAN_TYPE_LABELS,
} from "../constants";
import {
  ActionPlan,
  ActionPlanStatus,
  ActionPlanType,
} from "@/lib/firestore-service";

const formSchema = z
  .object({
    problemLabel: z.string().min(1, "Selecione um problema"),
    type: z.enum(["product", "service"] as [ActionPlanType, ActionPlanType]),
    departmentLabel: z.string().min(1, "Selecione um departamento"),
    startDate: z.date().nullable(),
    endDate: z.date().nullable(),
    status: z.enum(
      ["not_started", "in_progress", "completed", "delayed"] as [
        ActionPlanStatus,
        ActionPlanStatus,
        ActionPlanStatus,
        ActionPlanStatus,
      ],
    ),
    description: z
      .string()
      .min(5, "Descreva a ação proposta")
      .max(400, "Use até 400 caracteres"),
  })
  .refine(
    (data) => !!data.startDate,
    { message: "Informe uma data de início", path: ["startDate"] },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "Término deve ser igual ou após o início",
      path: ["endDate"],
    },
  );

export type ActionPlanFormValues = z.infer<typeof formSchema>;

interface ActionPlanFormProps {
  mode: "create" | "edit";
  problems: string[];
  departments: string[];
  initialValues?: Partial<ActionPlan>;
  defaultProblem?: string | null;
  defaultDepartment?: string | null;
  submitting?: boolean;
  onSubmit: (values: ActionPlanFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const emptyOptionMessage = (entity: string) => `Nenhum ${entity} cadastrado.`;

export const ActionPlanForm = ({
  mode,
  problems,
  departments,
  initialValues,
  defaultProblem,
  defaultDepartment,
  submitting,
  onSubmit,
  onCancel,
}: ActionPlanFormProps) => {
  const defaultValues: ActionPlanFormValues = useMemo(
    () => ({
      problemLabel:
        initialValues?.problemLabel || defaultProblem || problems[0] || "",
      type: initialValues?.type || "service",
      departmentLabel:
        initialValues?.departmentLabel || defaultDepartment || departments[0] || "",
      startDate: initialValues?.startDate
        ? new Date(initialValues.startDate)
        : null,
      endDate: initialValues?.endDate ? new Date(initialValues.endDate) : null,
      status: initialValues?.status || "not_started",
      description: initialValues?.description || "",
    }),
    [
      defaultDepartment,
      defaultProblem,
      departments,
      initialValues?.departmentLabel,
      initialValues?.description,
      initialValues?.endDate,
      initialValues?.problemLabel,
      initialValues?.startDate,
      initialValues?.status,
      initialValues?.type,
      problems,
    ],
  );

  const form = useForm<ActionPlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = async (values: ActionPlanFormValues) => {
    await onSubmit(values);
  };

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Problema</Label>
          <Select
            value={form.watch("problemLabel") || undefined}
            onValueChange={(value) => form.setValue("problemLabel", value, { shouldValidate: true })}
            disabled={problems.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={emptyOptionMessage("problema")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {problems.map((problem) => (
                <SelectItem key={problem} value={problem}>
                  {problem}
                </SelectItem>
              ))}
              {problems.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyOptionMessage("problema")}
                </div>
              )}
            </SelectContent>
          </Select>
          {form.formState.errors.problemLabel && (
            <p className="text-xs text-red-500">
              {form.formState.errors.problemLabel.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={form.watch("type")}
            onValueChange={(value: ActionPlanType) => form.setValue("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_PLAN_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Departamento responsável</Label>
          <Select
            value={form.watch("departmentLabel") || undefined}
            onValueChange={(value) =>
              form.setValue("departmentLabel", value, { shouldValidate: true })
            }
            disabled={departments.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={emptyOptionMessage("departamento")}/>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
              {departments.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyOptionMessage("departamento")}
                </div>
              )}
            </SelectContent>
          </Select>
          {form.formState.errors.departmentLabel && (
            <p className="text-xs text-red-500">
              {form.formState.errors.departmentLabel.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value: ActionPlanStatus) => form.setValue("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_PLAN_STATUS_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Início</Label>
          <DatePicker
            date={form.watch("startDate")}
            onChange={(date) => form.setValue("startDate", date, { shouldValidate: true })}
          />
          {form.formState.errors.startDate && (
            <p className="text-xs text-red-500">
              {form.formState.errors.startDate.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Término</Label>
          <DatePicker
            date={form.watch("endDate")}
            onChange={(date) => form.setValue("endDate", date, { shouldValidate: true })}
          />
          {form.formState.errors.endDate && (
            <p className="text-xs text-red-500">
              {form.formState.errors.endDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ação proposta</Label>
        <Textarea
          rows={4}
          maxLength={400}
          placeholder="Descreva o plano de ação para resolver o problema selecionado."
          {...form.register("description")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{form.formState.errors.description?.message ?? ""}</span>
          <span>{form.watch("description").length}/400</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="md:w-auto"
            onClick={() => onCancel()}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" className="md:w-auto" disabled={submitting}>
          {submitting
            ? "Salvando..."
            : mode === "create"
              ? "Criar plano de ação"
              : "Atualizar plano"}
        </Button>
      </div>
    </form>
  );
};
