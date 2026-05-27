'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { BadgeProps, CalendarProps } from 'antd';
import { Alert, Badge, Calendar, Card, Grid, Spin, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  fetchCalendarHourSummary,
  getDayDotStatus,
} from '@/lib/treatmentCalendarSummary';
import './calendar.css';

interface NoticeItem {
  key: string;
  type: BadgeProps['status'];
  content: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Dayjs | null>(null);
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.md === true;
  const isMobile = screens.md === false;

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

  const getDayNoticeList = useCallback(
    (value: Dayjs): NoticeItem[] => {
      const dateKey = value.format('YYYY-MM-DD');
      const grouped = hoursByDate[dateKey] ?? [];
      return grouped.map((item) => ({
        key: `${dateKey}-${item.hour}`,
        type: item.pending === 0 ? 'success' : 'default',
        content: `${item.hour} - ${item.count}`,
      }));
    },
    [hoursByDate]
  );

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type !== 'date') return info.originNode;

    const dateKey = current.format('YYYY-MM-DD');
    const grouped = hoursByDate[dateKey] ?? [];

    if (isMobile) {
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
    }

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

  const calendarNode =
    mounted && currentMonth ? (
      <Calendar
        fullscreen={isDesktop}
        value={currentMonth}
        onPanelChange={(value) => setCurrentMonth(value)}
        onSelect={(value) => router.push(`/calendar/${value.format('YYYY-MM-DD')}`)}
        cellRender={cellRender}
      />
    ) : (
      <Spin size="large" />
    );

  return (
    <Card>
      <h1 style={{ margin: 0 }}>Calendar</h1>
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
      <div
        className={
          isDesktop
            ? 'treatments-calendar treatments-calendar--desktop'
            : 'treatments-calendar treatments-calendar--mobile'
        }
      >
        {isDesktop ? (
          calendarNode
        ) : (
          <Card styles={{ body: { padding: 0 } }}>{calendarNode}</Card>
        )}
      </div>
    </Card>
  );
}
