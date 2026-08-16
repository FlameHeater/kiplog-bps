import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Activity, PerformancePlan } from '@/types';

interface RkDistributionChartProps {
  activities: Activity[];
  planById: Map<string, PerformancePlan>;
}

// FR-DSH-07 — bar chart of activity count per Rencana Kinerja, current month scope.
export function RkDistributionChart({ activities, planById }: RkDistributionChartProps) {
  const counts = new Map<string, { name: string; color: string; count: number }>();
  for (const activity of activities) {
    if (!activity.performancePlanId) continue;
    const plan = planById.get(activity.performancePlanId);
    if (!plan) continue;
    const existing = counts.get(plan.id);
    if (existing) existing.count += 1;
    else counts.set(plan.id, { name: plan.displayName ?? plan.name, color: plan.color, count: 1 });
  }

  const data = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((d) => ({ ...d, name: d.name.length > 24 ? `${d.name.slice(0, 24)}…` : d.name }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada kegiatan bulan ini.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => [`${value} kegiatan`, '']} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
