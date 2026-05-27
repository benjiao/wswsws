'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Flex, Progress, Space, Spin, Typography } from 'antd';
import TreatmentInstancesByPatientTable from '@/components/TreatmentInstancesByPatientTable';
import { TreatmentInstance } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface DayGroup {
  hour: string;
  count: number;
  instances: TreatmentInstance[];
}

interface DayGroupedResponse {
  date: string;
  total_count: number;
  groups: DayGroup[];
}

const fetchDayGrouped = async (date: string): Promise<DayGroupedResponse> => {
  const response = await fetch(`${API_URL}/treatment-instances/day-grouped/?date=${date}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const formatDateForDisplay = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function TreatmentsCalendarDayPage() {
  const router = useRouter();
  const params = useParams();
  const date = params?.date as string | undefined;

  const isDateValid = useMemo(() => {
    if (!date) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }, [date]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['treatment_day_grouped', date],
    queryFn: () => fetchDayGrouped(date!),
    enabled: !!date && isDateValid,
  });

  const dayInstances = useMemo(() => data?.groups.flatMap((g) => g.instances) ?? [], [data]);
  const dayTotal = dayInstances.length;
  const dayCompleted = dayInstances.filter((instance) => instance.status === 2).length;
  const dayPercent = dayTotal > 0 ? Math.floor((dayCompleted / dayTotal) * 100) : 0;

  if (!date || !isDateValid) {
    return <Alert type="error" message="Invalid date" description="Use YYYY-MM-DD in the URL." showIcon />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0 }}>Day Schedule</h1>
            <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0 0' }}>
              {formatDateForDisplay(date)}
            </Typography.Paragraph>
          </div>
          <Button onClick={() => router.push('/treatments/calendar')}>Back to Calendar</Button>
        </Space>
      </Card>

      <Card>
        {isLoading ? (
          <Spin />
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <strong>
                {dayCompleted} / {dayTotal} treatments completed
              </strong>
            </div>
            <Flex gap="small" vertical>
              <Progress percent={dayPercent} />
            </Flex>
          </>
        )}
      </Card>

      {error && (
        <Alert
          type="error"
          message="Error loading day schedule"
          description={error instanceof Error ? error.message : 'Unknown error'}
          showIcon
        />
      )}

      {!isLoading && !error && data && data.groups.length === 0 && (
        <Card>
          <Alert
            type="info"
            message="No scheduled treatments"
            description="There are no scheduled treatments for this day."
            showIcon
          />
        </Card>
      )}

      {!isLoading &&
        !error &&
        data &&
        data.groups.map((group) => (
          <Card key={group.hour}>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{group.hour}</h2>
              <Typography.Text type="secondary">{group.count} scheduled</Typography.Text>
            </Space>
            <TreatmentInstancesByPatientTable
              data={group.instances}
              loading={false}
              error={null}
              refetch={refetch}
              sectionKey={`calendar_${date}_${group.hour.replace(':', '')}`}
              hideScheduleAndLastDose
            />
          </Card>
        ))}
    </Space>
  );
}
