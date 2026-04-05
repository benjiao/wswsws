'use client';

import { useState, useEffect, useMemo } from 'react';
import { Spin, Alert, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { TreatmentInstance } from '@/types';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';


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
  /** When set, sort is synced to URL as sort_${sectionKey} and order_${sectionKey} */
  sectionKey?: string;
}

export default function TreatmentInstancesByPatientTable({ data, loading, error, refetch, sectionKey }: TreatmentInstancesByPatientTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loadingInstanceId, setLoadingInstanceId] = useState<number | null>(null);

    const normalizeSortField = (param: string | null): string | undefined => {
      if (!param) return undefined;
      const parts = param.split(',');
      return parts[parts.length - 1]?.trim() || undefined;
    };
    const sortParam = sectionKey ? searchParams?.get(`sort_${sectionKey}`) : null;
    const orderParam = sectionKey ? searchParams?.get(`order_${sectionKey}`) : null;
    const [sortField, setSortField] = useState<string | undefined>(() =>
      sectionKey && sortParam ? normalizeSortField(sortParam) : undefined
    );
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(() =>
      sectionKey && orderParam ? (orderParam === 'desc' ? 'descend' : 'ascend') : undefined
    );

    useEffect(() => {
      if (!sectionKey) return;
      const s = searchParams?.get(`sort_${sectionKey}`);
      const o = searchParams?.get(`order_${sectionKey}`);
      setSortField(normalizeSortField(s ?? null) ?? undefined);
      setSortOrder(o === 'desc' ? 'descend' : o === 'asc' ? 'ascend' : undefined);
    }, [sectionKey, searchParams]);

    const handleTableChange: TableProps<TreatmentInstance>['onChange'] = (pagination, filters, sorter: any) => {
      if (!sectionKey) return;
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      const order = sorter?.order;
      const rawField = sorter?.columnKey ?? sorter?.field;
      const fieldStr = rawField == null
        ? undefined
        : Array.isArray(rawField)
          ? String(rawField[rawField.length - 1])
          : String(rawField);
      if (fieldStr && order) {
        setSortField(fieldStr);
        setSortOrder(order);
        params.set(`sort_${sectionKey}`, fieldStr);
        params.set(`order_${sectionKey}`, order === 'descend' ? 'desc' : 'asc');
      } else {
        setSortField(undefined);
        setSortOrder(undefined);
        params.delete(`sort_${sectionKey}`);
        params.delete(`order_${sectionKey}`);
      }
      const qs = params.toString();
      const base = pathname ?? '';
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
    };

    const sortCompare = (a: TreatmentInstance, b: TreatmentInstance, field: string): number => {
      switch (field) {
        case 'scheduled_time':
          return (a.scheduled_time ? new Date(a.scheduled_time).getTime() : Infinity) -
            (b.scheduled_time ? new Date(b.scheduled_time).getTime() : Infinity);
        case 'patient_name':
          return (a.treatment_schedule?.patient_name || '').localeCompare(b.treatment_schedule?.patient_name || '');
        case 'medicine_name':
          return (a.treatment_schedule?.medicine_name || '').localeCompare(b.treatment_schedule?.medicine_name || '');
        case 'last_instance': {
          const aTime = a.treatment_schedule?.last_instance ? new Date(a.treatment_schedule.last_instance).getTime() : 0;
          const bTime = b.treatment_schedule?.last_instance ? new Date(b.treatment_schedule.last_instance).getTime() : 0;
          return aTime - bTime;
        }
        case 'status':
          return (a.status ?? 0) - (b.status ?? 0);
        default:
          return 0;
      }
    };

    const sortedData = useMemo(() => {
      const list = data ?? [];
      if (!sectionKey || !sortField || !sortOrder) return list;
      return [...list].sort((a, b) => {
        const cmp = sortCompare(a, b, sortField);
        return sortOrder === 'descend' ? -cmp : cmp;
      });
    }, [data, sectionKey, sortField, sortOrder]);

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
            sortOrder: sectionKey && sortField === 'scheduled_time' ? sortOrder : undefined,
            sortDirections: ['ascend', 'descend'],
            defaultSortOrder: 'ascend',
        },
        {
            title: 'Patient',
            dataIndex: ['treatment_schedule', 'patient_name'],
            key: 'patient_name',
            sorter: (a: TreatmentInstance, b: TreatmentInstance) =>
                (a.treatment_schedule?.patient_name || '').localeCompare(b.treatment_schedule?.patient_name || ''),
            sortOrder: sectionKey && sortField === 'patient_name' ? sortOrder : undefined,
            sortDirections: ['ascend', 'descend'],
            render: (_: any, record: TreatmentInstance) => {
                const patient = record.treatment_schedule?.patient;
                const patientId = typeof patient === 'object' && patient !== null
                    ? (patient as { id?: number }).id
                    : typeof patient === 'number'
                    ? patient
                    : undefined;
                const name = record.treatment_schedule?.patient_name ?? '';
                if (patientId) {
                    return (
                        <span
                            onClick={() => router.push(`/patients/${patientId}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            {name}
                        </span>
                    );
                }
                return name;
            },
        },
        {
            title: 'Medicine',
            dataIndex: ['treatment_schedule', 'medicine_name'],
            key: 'medicine_name',
            sorter: (a: TreatmentInstance, b: TreatmentInstance) =>
                (a.treatment_schedule?.medicine_name || '').localeCompare(b.treatment_schedule?.medicine_name || ''),
            sortOrder: sectionKey && sortField === 'medicine_name' ? sortOrder : undefined,
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
                        {record.treatment_schedule.dosage && record.treatment_schedule.unit && (
                            <>
                                <br />
                                <span style={{ color: '#888', fontSize: '90%' }}>
                                    {`${record.treatment_schedule.dosage} ${record.treatment_schedule.unit}`}
                                </span>
                            </>
                        )}
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
            sortOrder: sectionKey && sortField === 'last_instance' ? sortOrder : undefined,
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
            sortOrder: sectionKey && sortField === 'status' ? sortOrder : undefined,
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
            dataSource={sectionKey ? sortedData : (data ?? [])}
            rowKey="id"
            pagination={false}
            size="small" 
            bordered
            columns={columns}
            onChange={sectionKey ? handleTableChange : undefined}
        >
        </Table>
    );
}