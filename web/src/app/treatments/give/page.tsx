'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Alert, Table, Tag } from 'antd';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { TreatmentInstance, TreatmentSession } from '@/types';

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'Not scheduled';
  
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  let dateLabel = '';
  if (isToday) {
    dateLabel = 'Today';
  } else if (isTomorrow) {
    dateLabel = 'Tomorrow';
  } else {
    dateLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
  
  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${dateLabel} at ${timeLabel}`;
};

// API fetcher function
const fetchTreatmentSession = async (sessionType: number): Promise<TreatmentSession> => {
  const response = await fetch(
    `${API_URL}/treatment-sessions/today/${sessionType}/`, 
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

// Reusable table component
const TreatmentTable = ({ data, loading, error }: { 
  data: TreatmentSession | undefined; 
  loading: boolean; 
  error: any; 
}) => {
  if (loading) return <Spin size="small" />;
  
  if (error) return (
    <Alert 
      message="Error loading sessions" 
      description={error.message} 
      type="error"
    />
  );

  return (
    <Table
      dataSource={data?.instances || []}
      rowKey="id"
      pagination={false}
      size="small" 
      style={{ marginBottom: '20px' }}
    >
      <Table.Column
        title="Schedule"
        dataIndex={['scheduled_time']}
        key="scheduled_time"
        render={(time: string) => formatDateTime(time)}
        responsive={['md']}
      />
      <Table.Column
        title="Task"
        dataIndex={['treatment_schedule', 'patient_name']}
        key="task"
        render={(_, record: TreatmentInstance) =>
          `${record.treatment_schedule.patient_name} - ${record.treatment_schedule.medicine_name} ${record.treatment_schedule.dosage} ${record.treatment_schedule.unit}`
        }
      />
      <Table.Column
        title="Status"
        dataIndex={['status']}
        key="status"
        render={(_, record: TreatmentInstance) =>
          <span>
            <Tag
              color={
                record.status === 1
                  ? 'default'
                  : record.status === 2
                  ? 'green'
                  : record.status === 3
                  ? 'orange'
                  : 'default'
              }
              key={record.status}
            >
              {record.status_display}
            </Tag>
          </span>
        }
      />
    </Table>
  );
};

export default function GiveTreatmentPage() {
  // Fetch morning sessions (sessionType = 1)
  const { 
    data: morningSession, 
    isLoading: morningLoading, 
    error: morningError
  } = useQuery({
    queryKey: ['treatment_sessions/today', 1],
    queryFn: () => fetchTreatmentSession(1),
  });

  // Fetch evening sessions (sessionType = 2)
  const { 
    data: eveningSession, 
    isLoading: eveningLoading, 
    error: eveningError
  } = useQuery({
    queryKey: ['treatment_sessions/today', 4],
    queryFn: () => fetchTreatmentSession(4),
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>Treatments</h1>

      <h3>Morning</h3>
      <TreatmentTable 
        data={morningSession} 
        loading={morningLoading} 
        error={morningError} 
      />


      <h3>Evening</h3>
      <TreatmentTable 
        data={eveningSession} 
        loading={eveningLoading} 
        error={eveningError} 
      />
    </div>
  );
}