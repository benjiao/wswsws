import type { Dayjs } from 'dayjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface HourCount {
  hour: string;
  count: number;
  pending: number;
}

export interface CalendarSummaryResponse {
  hours_by_date: Record<string, HourCount[]>;
}

export type DayDotStatus = 'none' | 'pending' | 'complete';

export function getDayDotStatus(grouped: HourCount[]): DayDotStatus {
  if (grouped.length === 0) return 'none';
  const totalPending = grouped.reduce((sum, item) => sum + item.pending, 0);
  return totalPending === 0 ? 'complete' : 'pending';
}

export async function fetchCalendarHourSummary(
  monthValue: Dayjs
): Promise<CalendarSummaryResponse> {
  const startDate = monthValue.startOf('month').format('YYYY-MM-DD');
  const endDate = monthValue.endOf('month').format('YYYY-MM-DD');
  const response = await fetch(
    `${API_URL}/treatment-instances/calendar-hour-summary/?start_date=${startDate}&end_date=${endDate}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
