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


const TreatmentTable = ({ data, loading, error, refetch }: { 
  data: TreatmentSession | undefined; 
  loading: boolean; 
  error: any;
  refetch: () => void;
}) => {
  
  const updateTreatmentStatus = async (instanceId: number, newStatus: number) => {
    try {
      const response = await fetch(`${API_URL}/treatment-instances/${instanceId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedData = await response.json();      
      // You might want to refetch the data here or update the local state
      refetch(); // if you pass refetch function as prop
      
    } catch (error) {
      console.error('Failed to update treatment:', error);
      // Handle error (show notification, etc.)
    }
  };

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
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none', // Safari
                MozUserSelect: 'none', // Firefox
                msUserSelect: 'none' // IE/Edge
              }}
              onClick={() => {
                const newStatus = record.status === 1 ? 2 : record.status === 2 ? 3 : 1;
                updateTreatmentStatus(record.id, newStatus);
              }}
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
    error: morningError,
    refetch: refetchMorning 
  } = useQuery({
    queryKey: ['treatment_sessions/today', 1],
    queryFn: () => fetchTreatmentSession(1),
  });

  // Fetch evening sessions (sessionType = 2)
  const { 
    data: eveningSession, 
    isLoading: eveningLoading, 
    error: eveningError,
    refetch: refetchEvening
  } = useQuery({
    queryKey: ['treatment_sessions/today', 4],
    queryFn: () => fetchTreatmentSession(4),
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>Treatments</h1>

      <Card style={{ marginBottom: 24 }}>
        {morningSession && eveningSession ? (
          (() => {
            const allInstances = [
              ...(morningSession.instances || []),
              ...(eveningSession.instances || [])
            ];
            const total = allInstances.length;
            const completed = allInstances.filter(i => i.status === 2).length;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

            return (
              <>
                <div style={{ marginBottom: 8 }}>
                  <strong>
                    {completed} / {total} treatments completed
                  </strong>
                </div>
                <div>
                  <Spin spinning={false}>
                    <div style={{ width: '100%' }}>
                      <div style={{ marginBottom: 4 }}>
                        <span>Progress</span>
                      </div>
                      <div style={{ width: '100%' }}>
                        <div
                          style={{
                            background: '#f0f0f0',
                            borderRadius: 4,
                            height: 16,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              background: '#52c41a',
                              width: `${percent}%`,
                              height: '100%',
                              transition: 'width 0.3s',
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: 0,
                              transform: 'translateX(-50%)',
                              fontSize: 12,
                              color: '#222',
                            }}
                          >
                            {percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Spin>
                </div>
              </>
            );
          })()
        ) : (
          <Spin />
        )}
      </Card>

      <h3>Morning</h3>
      <TreatmentTable 
        data={morningSession} 
        loading={morningLoading} 
        error={morningError}
        refetch={refetchMorning}
      />


      <h3>Evening</h3>
      <TreatmentTable 
        data={eveningSession} 
        loading={eveningLoading} 
        error={eveningError} 
        refetch={refetchEvening}
      />
    </div>
  );
}