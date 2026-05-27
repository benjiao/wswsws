'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { CalendarProps } from 'antd';
import { Alert, Calendar, Card, Flex, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  fetchCalendarHourSummary,
  getDayDotStatus,
} from '@/lib/treatmentCalendarSummary';
import '@/app/calendar/calendar.css';

export default function TreatmentsCalendarCard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Dayjs | null>(null);

  useEffect(() => {
    setCurrentMonth(dayjs());
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['treatment_calendar_hour_summary_v2', currentMonth?.format('YYYY-MM') ?? ''],
    queryFn: () => fetchCalendarHourSummary(currentMonth!),
    enabled: mounted && currentMonth !== null,
  });

  const hoursByDate = useMemo(() => data?.hours_by_date ?? {}, [data]);

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type !== 'date') return info.originNode;

    const dateKey = current.format('YYYY-MM-DD');
    const grouped = hoursByDate[dateKey] ?? [];
    const dotStatus = getDayDotStatus(grouped);

    return (
      <div className="treatments-calendar-day-dot">
        {dotStatus !== 'none' && (
          <span
            className={`treatments-calendar-day-dot__marker treatments-calendar-day-dot__marker--${dotStatus}`}
          />
        )}
      </div>
    );
  };

  if (isLoading && !data) {
    return (
      <Card title="Calendar">
        <Spin />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Calendar">
        <Alert
          type="error"
          message="Error loading calendar"
          description={error instanceof Error ? error.message : 'Unknown error'}
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Flex justify="space-between" align="center">
          <span>Calendar</span>
          <Link href="/calendar" style={{ fontSize: 14 }}>
            View All
          </Link>
        </Flex>
      }
      styles={{ body: { padding: 0 } }}
    >
      <div className="treatments-calendar treatments-calendar--mobile treatments-calendar--compact">
        {mounted && currentMonth ? (
          <Calendar
            fullscreen={false}
            value={currentMonth}
            onPanelChange={(value) => setCurrentMonth(value)}
            onSelect={(value) =>
              router.push(`/calendar/${value.format('YYYY-MM-DD')}`)
            }
            cellRender={cellRender}
          />
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Spin />
          </div>
        )}
      </div>
    </Card>
  );
}
