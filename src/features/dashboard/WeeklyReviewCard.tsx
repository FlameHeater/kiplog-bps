import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { weekRangeContaining } from '@/lib/reporting/report-period';
import { formatIndonesianDate, getWeekday, todayString } from '@/lib/date/date-utils';
import type { Activity } from '@/types';

interface WeeklyReviewCardProps {
  activities: Activity[];
}

// FR-REV-05/06 — only rendered Fri–Sun (weekday 5,6,0) local time.
export function WeeklyReviewCard({ activities }: WeeklyReviewCardProps) {
  const today = todayString();
  const weekday = getWeekday(today);
  if (weekday !== 5 && weekday !== 6 && weekday !== 0) return null;

  const { start, end } = weekRangeContaining(today);
  const weekActivities = activities.filter((a) => a.date >= start && a.date <= end && a.status !== 'archived');
  const linked = weekActivities.filter((a) => a.evidenceLink).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Mingguan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {formatIndonesianDate(start)} – {formatIndonesianDate(end)}
        </p>
        <p className="text-sm">
          {weekActivities.length} kegiatan tercatat · {linked} dari {weekActivities.length} bertautan
        </p>
        <a href="#/laporan?period=mingguan">
          <Button size="sm" variant="outline">
            Buat Laporan Mingguan
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
