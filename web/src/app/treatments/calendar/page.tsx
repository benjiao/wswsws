'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { BadgeProps, CalendarProps } from 'antd';
import { Alert, Badge, Calendar, Card, Grid, Spin, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './calendar.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface HourCount {
  hour: string;
  count: number;
}

interface CalendarSummaryResponse {
  hours_by_date: Record<string, HourCount[]>;
}

interface NoticeItem {
  key: string;
  type: BadgeProps['status'];
  content: string;
}

const fetchCalendarHourSummary = async (monthValue: Dayjs): Promise<CalendarSummaryResponse> => {
  const startDate = monthValue.startOf('month').format('YYYY-MM-DD');
  const endDate = monthValue.endOf('month').format('YYYY-MM-DD');
  const response = await fetch(
    `${API_URL}/treatment-instances/calendar-hour-summary/?start_date=${startDate}&end_date=${endDate}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export default function TreatmentsCalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  const { data, isLoading, error } = useQuery({
    queryKey: ['treatment_calendar_hour_summary', currentMonth.format('YYYY-MM')],
    queryFn: () => fetchCalendarHourSummary(currentMonth),
  });

  const hoursByDate = useMemo(() => data?.hours_by_date ?? {}, [data]);

  const getDayNoticeList = useCallback(
    (value: Dayjs): NoticeItem[] => {
      const dateKey = value.format('YYYY-MM-DD');
      const grouped = hoursByDate[dateKey] ?? [];
      return grouped.map((item) => ({
        key: `${dateKey}-${item.hour}`,
        type: 'default',
        content: `${item.hour} - ${item.count}`,
      }));
    },
    [hoursByDate]
  );

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type !== 'date') return info.originNode;

    const listData = getDayNoticeList(current);
    return (
      <ul className="treatments-calendar-events">
        {listData.map((item) => (
          <li key={item.key}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <h1 style={{ margin: 0 }}>Treatments Calendar</h1>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        {isMobile
          ? 'Tap a day to view the full schedule.'
          : 'Each day lists scheduled treatments grouped by hour.'}
      </Typography.Paragraph>
      {isLoading && <Spin size="large" />}
      {error && (
        <Alert
          type="error"
          message="Error loading calendar"
          description={error instanceof Error ? error.message : 'Unknown error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <div className="treatments-calendar">
        <Calendar
          fullscreen={isMobile}
          value={currentMonth}
          onPanelChange={(value) => setCurrentMonth(value)}
          onSelect={(value) => router.push(`/treatments/calendar/${value.format('YYYY-MM-DD')}`)}
          cellRender={cellRender}
        />
      </div>
    </Card>
  );
}
