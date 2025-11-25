import { ActionPlanStatus, ActionPlanType } from '@/lib/firestore-service';

export interface ProblemOption {
  id: string;
  label: string;
  slug: string;
  department?: string;
}

export interface DepartmentOption {
  id: string;
  label: string;
}

export interface ActionPlanFormValues {
  problemId: string;
  problemLabel: string;
  type: ActionPlanType;
  departmentId: string;
  departmentLabel: string;
  managerName: string;
  budget: string;
  startDate: string | null;
  endDate: string | null;
  status: ActionPlanStatus;
  description: string;
}
