'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, Space, Tag, Switch, Button } from 'antd';
import type { TableProps } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TreatmentSchedule } from '@/types';

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export interface PatientSchedulesTableProps {
  data: TreatmentSchedule[];
  loading?: boolean;
  /** When set, sort is synced to URL as sort_${sectionKey} and order_${sectionKey} */
  sectionKey?: string;
  onToggleActive?: (scheduleId: number, isActive: boolean) => void;
  onEditSchedule?: (scheduleId: number) => void;
  isToggling?: boolean;
}

export default function PatientSchedulesTable({
  data,
  loading = false,
  sectionKey,
  onToggleActive,
  onEditSchedule,
  isToggling = false,
}: PatientSchedulesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const handleTableChange: TableProps<TreatmentSchedule>['onChange'] = (pagination, filters, sorter: any) => {
    if (!sectionKey) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    const order = sorter?.order;
    const rawField = sorter?.columnKey ?? sorter?.field;
    const fieldStr =
      rawField == null
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

  const sortCompare = (a: TreatmentSchedule, b: TreatmentSchedule, field: string): number => {
    switch (field) {
      case 'medicine_name':
        return (a.medicine_name ?? '').localeCompare(b.medicine_name ?? '');
      case 'start_time': {
        const at = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
        return at - bt;
      }
      case 'last_instance': {
        const at = a.last_instance ? new Date(a.last_instance).getTime() : 0;
        const bt = b.last_instance ? new Date(b.last_instance).getTime() : 0;
        return at - bt;
      }
      case 'frequency':
        return (a.frequency ?? 0) - (b.frequency ?? 0);
      case 'interval_display':
        return (a.interval ?? 0) - (b.interval ?? 0);
      case 'doses':
        return (a.doses ?? 0) - (b.doses ?? 0);
      case 'status':
        return (a.pending_count ?? 0) - (b.pending_count ?? 0);
      case 'is_active':
        return (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
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

  const columns: TableProps<TreatmentSchedule>['columns'] = [
    {
      title: 'Medicine',
      dataIndex: 'medicine_name',
      key: 'medicine_name',
      sorter: (a, b) => (a.medicine_name ?? '').localeCompare(b.medicine_name ?? ''),
      sortOrder: sectionKey && sortField === 'medicine_name' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (_: any, record: TreatmentSchedule) => (
        <span>
          {record.medicine_name}
          {record.dosage && record.unit && (
            <>
              <br />
              <span style={{ color: '#888', fontSize: '90%' }}>
                {`${record.dosage} ${record.unit}`}
              </span>
            </>
          )}
        </span>
      ),
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      sorter: (a, b) => {
        const at = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
        return at - bt;
      },
      sortOrder: sectionKey && sortField === 'start_time' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (date: string | null) => formatDateTime(date),
    },
    {
      title: 'End Time',
      dataIndex: 'last_instance',
      key: 'last_instance',
      sorter: (a, b) => {
        const at = a.last_instance ? new Date(a.last_instance).getTime() : 0;
        const bt = b.last_instance ? new Date(b.last_instance).getTime() : 0;
        return at - bt;
      },
      sortOrder: sectionKey && sortField === 'last_instance' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (date: string | null) => formatDateTime(date),
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      sorter: (a, b) => (a.frequency ?? 0) - (b.frequency ?? 0),
      sortOrder: sectionKey && sortField === 'frequency' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      align: 'center',
      render: (freq: number | null) => freq ?? 'N/A',
    },
    {
      title: 'Interval',
      dataIndex: 'interval_display',
      key: 'interval_display',
      sorter: (a, b) => (a.interval ?? 0) - (b.interval ?? 0),
      sortOrder: sectionKey && sortField === 'interval_display' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (interval: string, record: TreatmentSchedule) => (
        <Tag color={record.interval === 1 ? 'blue' : 'cyan'}>{interval || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Total Doses',
      dataIndex: 'doses',
      key: 'doses',
      sorter: (a, b) => (a.doses ?? 0) - (b.doses ?? 0),
      sortOrder: sectionKey && sortField === 'doses' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      align: 'center',
      render: (doses: number | null) => doses ?? 'N/A',
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      sorter: (a, b) => (a.pending_count ?? 0) - (b.pending_count ?? 0),
      sortOrder: sectionKey && sortField === 'status' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (_: any, record: TreatmentSchedule) => {
        const completed = record.completed_count ?? 0;
        const pending = record.pending_count ?? 0;
        const skipped = record.skipped_count ?? 0;
        const total = record.instances_count ?? 0;
        if (total === 0) return <span>No instances</span>;
        return (
          <Space size="small">
            <Tag color="green">{completed}</Tag>
            <Tag color="default">{pending}</Tag>
            <Tag color="red">{skipped}</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      sorter: (a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0),
      sortOrder: sectionKey && sortField === 'is_active' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (isActive: boolean | undefined, record: TreatmentSchedule) =>
        onToggleActive ? (
          <Switch
            checked={isActive !== undefined ? isActive : true}
            onChange={(checked) => onToggleActive(record.id, checked)}
            loading={isToggling}
          />
        ) : (
          (isActive !== undefined ? isActive : true) ? 'Yes' : 'No'
        ),
    },
    ...(onEditSchedule
      ? [
          {
            title: '',
            key: 'actions',
            width: 48,
            render: (_: any, record: TreatmentSchedule) => (
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEditSchedule(record.id)}
                title="Edit schedule"
              />
            ),
          },
        ]
      : []),
  ] as TableProps<TreatmentSchedule>['columns'];

  return (
    <Table<TreatmentSchedule>
      dataSource={sectionKey ? sortedData : data}
      columns={columns}
      rowKey="id"
      pagination={false}
      size="small"
      bordered
      loading={loading}
      onChange={sectionKey ? handleTableChange : undefined}
    />
  );
}
