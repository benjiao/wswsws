'use client';

import { Spin, Alert, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { TreatmentInstance } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

interface TreatmentTableProps {
  data: TreatmentInstance[] | undefined;
  loading: boolean;
  error: any;
  refetch: () => void;
}

export default function TreatmentTable({ data, loading, error, refetch }: TreatmentTableProps) {

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
            refetch();
            
        } catch (error) {
            console.error('Failed to update treatment:', error);
        }
    };

    const columns: TableProps<TreatmentInstance>['columns'] = [
        {
            title: 'Schedule',
            dataIndex: 'scheduled_time',
            key: 'scheduled_time',
            render: (time: string) => formatDateTime(time),
            responsive: ['md'],
            width: 180,
        },
        {
            title: 'Task',
            key: 'task',
            render: (_: any, record: TreatmentInstance) => (
                <span
                    style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                >
                    {`${record.treatment_schedule.patient_name} - ${record.treatment_schedule.medicine_name} ${record.treatment_schedule.dosage} ${record.treatment_schedule.unit}`}
                </span>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 90,
            render: (_: any, record: TreatmentInstance) => (
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
                    style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    onClick={() => {
                        const newStatus = (record.status % 3) + 1;
                        updateTreatmentStatus(record.id, newStatus);
                    }}
                >
                    {record.status_display}
                </Tag>
            ),
        },
    ];

    if (loading) return <Spin size="small" />;

    if (error) return (
        <Alert 
            message="Error loading treatments" 
            description={error.message} 
            type="error"
            showIcon
        />
    );

    return (
        <Table
            dataSource={data || []}
            rowKey="id"
            pagination={false}
            size="small" 
            bordered
            style={{ marginBottom: '20px' }}
            columns={columns}
        >
        </Table>
    );
}