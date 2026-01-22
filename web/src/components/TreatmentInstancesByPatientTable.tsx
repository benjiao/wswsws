'use client';

import { useState } from 'react';
import { Spin, Alert, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { TreatmentInstance } from '@/types';
import { useRouter } from 'next/navigation';


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

const formatDate = (dateString: string) => {
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
  
  return dateLabel;
};


interface TreatmentInstancesByPatientTableProps {
  data: TreatmentInstance[] | undefined;
  loading: boolean;
  error: any;
  refetch: () => void;
}

export default function TreatmentInstancesByPatientTable({ data, loading, error, refetch }: TreatmentInstancesByPatientTableProps) {
    const router = useRouter();
    const [loadingInstanceId, setLoadingInstanceId] = useState<number | null>(null);

    const updateTreatmentStatus = async (instanceId: number, newStatus: number) => {
        setLoadingInstanceId(instanceId);
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
        } finally {
            setLoadingInstanceId(null);
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
            sorter: (a: TreatmentInstance, b: TreatmentInstance) =>
                (a.scheduled_time ? new Date(a.scheduled_time).getTime() : Infinity) -
                (b.scheduled_time ? new Date(b.scheduled_time).getTime() : Infinity),
            sortDirections: ['ascend', 'descend'],
            defaultSortOrder: 'ascend',
        },
        {
            title: 'Patient',
            dataIndex: ['treatment_schedule', 'patient_name'],
            key: 'patient_name',
            sorter: (a: TreatmentInstance, b: TreatmentInstance) =>
                (a.treatment_schedule?.patient_name || '').localeCompare(b.treatment_schedule?.patient_name || ''),
            sortDirections: ['ascend', 'descend'],
            render: (_: any, record: TreatmentInstance) => record.treatment_schedule.patient_name,
        },
        {
            title: 'Medicine',
            dataIndex: ['treatment_schedule', 'medicine_name'],
            key: 'medicine_name',
            sorter: (a: TreatmentInstance, b: TreatmentInstance) =>
                (a.treatment_schedule?.medicine_name || '').localeCompare(b.treatment_schedule?.medicine_name || ''),
            sortDirections: ['ascend', 'descend'],
            render:  (_: any, record: TreatmentInstance) => {
                const scheduleId = record.treatment_schedule?.id;
                return (
                    <span
                        onClick={() => {
                            if (scheduleId) {
                                router.push(`/treatments/schedules/${scheduleId}`);
                            }
                        }}
                        style={{
                            cursor: scheduleId ? 'pointer' : 'default',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            WebkitTapHighlightColor: 'transparent',
                            display: 'inline-block',
                            whiteSpace: 'pre-line',
                        }}
                    >
                        {record.treatment_schedule.medicine_name}

                        <br />
                        <span style={{ color: '#888', fontSize: '90%' }}>
                            {`${record.treatment_schedule.dosage} ${record.treatment_schedule.unit}`}
                        </span>
                    </span>
                );
            },
        },
        {
            title: 'Last Dose',
            dataIndex: ['treatment_schedule', 'last_instance'],
            key: 'last_instance',
            render: (lastInstance: string | null | undefined, record: TreatmentInstance) => {
                if (!lastInstance) return 'N/A';
                return formatDateTime(lastInstance);
            },
            responsive: ['md'],
            width: 180,
            sorter: (a: TreatmentInstance, b: TreatmentInstance) => {
                const aTime = a.treatment_schedule?.last_instance ? new Date(a.treatment_schedule.last_instance).getTime() : 0;
                const bTime = b.treatment_schedule?.last_instance ? new Date(b.treatment_schedule.last_instance).getTime() : 0;
                return aTime - bTime;
            },
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 90,
            minWidth: 90,
            align: 'center',
            sorter: (a: TreatmentInstance, b: TreatmentInstance) =>
                (a.status ?? 0) - (b.status ?? 0),
            sortDirections: ['ascend', 'descend'],
            render: (_: any, record: TreatmentInstance) => {
                const isLoading = loadingInstanceId === record.id;
                return (
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
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            WebkitTapHighlightColor: 'transparent',
                            opacity: isLoading ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                        }}
                        onClick={() => {
                            if (!isLoading) {
                                const newStatus = (record.status % 3) + 1;
                                updateTreatmentStatus(record.id, newStatus);
                            }
                        }}
                    >
                        {isLoading ? (
                            <Spin size="small" style={{ marginRight: 4 }} />
                        ) : null}
                        {record.status_display}
                    </Tag>
                );
            },
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