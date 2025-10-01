'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Alert, Table, Tag } from 'antd';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { TreatmentInstance, TreatmentSchedule } from '@/types';

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
const fetchTreatmentInstances = async (): Promise<TreatmentInstance[]> => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const response = await fetch(
      `${API_URL}/treatment-instances/?scheduled_time__date=${dateStr}&ordering=scheduled_time,treatment_schedule__patient__name`, 
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
    return data.results || data;
};

export default function TreatmentInstancesPage() {
  const { 
    data: treatmentInstances, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['treatment_instances'],
    queryFn: fetchTreatmentInstances,
  });

  if (isLoading) return <Spin size="large" />;
  
  if (error) return (
    <Alert 
      message="Error fetching treatment instances" 
      description={error.message} 
      type="error" 
      showIcon 
    />
  );

  return (
    <div style={{ padding: '20px' }}>
    <h1>Treatments</h1>

    {treatmentInstances && treatmentInstances.length > 0 && (() => {
      const pendingCount = treatmentInstances.filter((ti: any) => ti.status === 1).length;
      const totalCount = treatmentInstances.length;
      const percent = Math.round(((totalCount - pendingCount) / totalCount) * 100);

      return (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>
              {totalCount - pendingCount} / {totalCount} treatments completed
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
        </Card>
      );
    })()}

    <Table
        dataSource={treatmentInstances}
        rowKey="id"
        pagination={false}
        size="small" 
        style={{ marginBottom: '10px' }}
    >
        <Table.Column
            title="Schedule"
            dataIndex={['scheduled_time']}
            key="patient"
            render={(time: string) => formatDateTime(time)}
            responsive={['md']}
        />
        <Table.Column
            title="Task"
            dataIndex={['treatment_schedule', 'patient_name']}
            key="patient"
            render={(_, record: TreatmentInstance) =>
                `${record.treatment_schedule.patient_name} - ${record.treatment_schedule.medicine_name} ${record.treatment_schedule.dosage} ${record.treatment_schedule.unit}`
            }
        />
        <Table.Column
            title="Status"
            dataIndex={['status']}
            key="dosage"
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
    </div>
  );
}