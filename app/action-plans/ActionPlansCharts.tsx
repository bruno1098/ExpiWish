"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ACTION_PLAN_STATUS_ORDER, getActionPlanStatusMeta } from './constants';
import { ActionPlanStatus } from '@/lib/firestore-service';

const DEPARTMENT_BAR_COLORS = [
  ['#a855f7', '#6366f1'],
  ['#ec4899', '#f97316'],
  ['#22d3ee', '#3b82f6'],
  ['#facc15', '#f97316'],
  ['#34d399', '#10b981'],
  ['#c084fc', '#8b5cf6'],
  ['#fb7185', '#f43f5e'],
  ['#38bdf8', '#2563eb'],
];

interface ActionPlansChartsProps {
  statusCounts: Record<ActionPlanStatus, number>;
  departmentCounts: Array<{ label: string; value: number }>;
}

export const ActionPlansCharts = ({ statusCounts, departmentCounts }: ActionPlansChartsProps) => {
  const statusData = ACTION_PLAN_STATUS_ORDER.map(status => {
    const meta = getActionPlanStatusMeta(status);
    return {
      status,
      label: meta.label,
      chartColor: meta.chartColor,
      value: statusCounts[status] ?? 0,
    };
  });

  const hasStatusData = statusData.some(item => item.value > 0);
  const hasDepartmentData = departmentCounts?.some(item => item.value > 0);
  const departmentGradients = departmentCounts.map((_, index) => {
    const [from, to] = DEPARTMENT_BAR_COLORS[index % DEPARTMENT_BAR_COLORS.length];
    return {
      id: `departmentGradient-${index}`,
      from,
      to,
    };
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por status</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="label" innerRadius={60} outerRadius={90}>
                  {statusData.map(entry => (
                    <Cell key={entry.status} fill={entry.chartColor} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departamentos mais acionados</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {hasDepartmentData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentCounts}>
                <defs>
                  {departmentGradients.map(({ id, from, to }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={from} stopOpacity={0.95} />
                      <stop offset="95%" stopColor={to} stopOpacity={0.75} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {departmentCounts.map((department, index) => (
                    <Cell key={department.label} fill={`url(#departmentGradient-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum plano registrado para gerar o gráfico.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
