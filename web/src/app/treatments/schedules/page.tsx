'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Select, Button, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreatmentSchedule } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchTreatmentSchedules = async (): Promise<TreatmentSchedule[]> => {
  const response = await fetch(`${API_URL}/treatment-schedules/`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.results || data;
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isActive = (schedule: TreatmentSchedule): boolean => {
  // A schedule is active if it has non-completed instances (pending instances)
  // Active means there's still work to be done (pending instances)
  const pending = schedule.pending_count ?? 0;
  return pending > 0;
};

export default function SchedulesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [intervalFilter, setIntervalFilter] = useState<string | undefined>(undefined);
  const [unitFilter, setUnitFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<string | undefined>('active');
  const queryClient = useQueryClient();

  const { 
    data: schedules, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['treatment_schedules'],
    queryFn: fetchTreatmentSchedules,
  });


  // Mutation to delete treatment schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await fetch(`${API_URL}/treatment-schedules/${scheduleId}/`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
      Modal.success({
        content: 'Treatment schedule deleted successfully',
      });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting schedule',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });


  const handleDeleteSchedule = (schedule: TreatmentSchedule) => {
    Modal.confirm({
      title: 'Delete Treatment Schedule',
      content: (
        <div>
          <p>Are you sure you want to delete this treatment schedule?</p>
          <p><strong>Patient:</strong> {schedule.patient_name}</p>
          {schedule.medicine_name && <p><strong>Medicine:</strong> {schedule.medicine_name}</p>}
          <p style={{ color: 'red', marginTop: 16 }}>
            <strong>Warning:</strong> This action cannot be undone and will also delete all associated treatment instances.
          </p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteScheduleMutation.mutate(schedule.id);
      },
    });
  };

  // Filter schedules based on search text and filters
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];

    let filtered = schedules;

    // Search filter
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      filtered = filtered.filter((schedule: TreatmentSchedule) => 
        schedule.patient_name.toLowerCase().includes(lowerSearchText) ||
        schedule.medicine_name.toLowerCase().includes(lowerSearchText) ||
        (schedule.notes && schedule.notes.toLowerCase().includes(lowerSearchText))
      );
    }

    // Interval filter
    if (intervalFilter) {
      filtered = filtered.filter((schedule: TreatmentSchedule) => 
        schedule.interval === parseInt(intervalFilter)
      );
    }

    // Unit filter
    if (unitFilter) {
      filtered = filtered.filter((schedule: TreatmentSchedule) => 
        schedule.unit === unitFilter
      );
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter((schedule: TreatmentSchedule) => isActive(schedule));
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((schedule: TreatmentSchedule) => !isActive(schedule));
    }

    return filtered;
  }, [schedules, searchText, intervalFilter, unitFilter, activeFilter]);

  // Get unique units for filter
  const uniqueUnits = useMemo(() => {
    if (!schedules) return [];
    const units = new Set(schedules.map((s: TreatmentSchedule) => s.unit).filter(Boolean));
    return Array.from(units).sort();
  }, [schedules]);

  const columns: ColumnsType<TreatmentSchedule> = [
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      sorter: (a, b) => a.patient_name.localeCompare(b.patient_name),
      sortDirections: ['ascend', 'descend'],
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Medicine',
      dataIndex: 'medicine_name',
      key: 'medicine_name',
      sorter: (a, b) => a.medicine_name.localeCompare(b.medicine_name),
      sortDirections: ['ascend', 'descend'],
      width: 150,
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (date: string | null) => formatDateTime(date),
      sorter: (a, b) => {
        if (!a.start_time && !b.start_time) return 0;
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      },
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
      width: 180,
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (freq: number | null) => freq ?? 'N/A',
      sorter: (a, b) => (a.frequency ?? 0) - (b.frequency ?? 0),
      sortDirections: ['ascend', 'descend'],
      width: 100,
      align: 'center',
    },
    {
      title: 'Total Doses',
      dataIndex: 'doses',
      key: 'doses',
      render: (doses: number | null) => doses ?? 'N/A',
      sorter: (a, b) => (a.doses ?? 0) - (b.doses ?? 0),
      sortDirections: ['ascend', 'descend'],
      width: 100,
      align: 'center',
    },
    {
      title: 'Interval',
      dataIndex: 'interval_display',
      key: 'interval_display',
      render: (interval: string, record: TreatmentSchedule) => (
        <Tag color={record.interval === 1 ? 'blue' : 'cyan'}>
          {interval || 'N/A'}
        </Tag>
      ),
      sorter: (a, b) => (a.interval ?? 0) - (b.interval ?? 0),
      sortDirections: ['ascend', 'descend'],
      width: 130,
    },
    {
      title: 'Dosage',
      dataIndex: 'dosage',
      key: 'dosage',
      render: (dosage: string | null, record: TreatmentSchedule) => 
        dosage ? `${dosage} ${record.unit || ''}` : 'N/A',
      sorter: (a, b) => {
        const aDosage = a.dosage ? parseFloat(a.dosage) : 0;
        const bDosage = b.dosage ? parseFloat(b.dosage) : 0;
        return aDosage - bDosage;
      },
      sortDirections: ['ascend', 'descend'],
      width: 120,
    },
    {
      title: 'Instances',
      key: 'instances',
      render: (_: any, record: TreatmentSchedule) => {
        const pending = record.pending_count ?? 0;
        const completed = record.completed_count ?? 0;
        const total = record.instances_count ?? 0;
        return total > 0 ? (
          <span title={`${pending} pending, ${completed} completed out of ${total} total instances`}>
            {total-pending} / {total}
          </span>
        ) : 'N/A';
      },
      sorter: (a, b) => {
        const aPending = a.pending_count ?? 0;
        const bPending = b.pending_count ?? 0;
        return aPending - bPending;
      },
      sortDirections: ['ascend', 'descend'],
      width: 100,
      align: 'center' as const,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: TreatmentSchedule) => {
        const active = isActive(record);
        const pending = record.pending_count ?? 0;
        
        return (
          <Tag color={active ? 'green' : 'default'}>
            {active ? `Active (${pending} pending)` : 'Inactive'}
          </Tag>
        );
      },
      sorter: (a, b) => {
        const aPending = a.pending_count ?? 0;
        const bPending = b.pending_count ?? 0;
        return aPending - bPending;
      },
      sortDirections: ['ascend', 'descend'],
      width: 150,
      align: 'center',
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_: any, record: TreatmentSchedule) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/treatments/schedules/${record.id}`)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSchedule(record)}
            loading={deleteScheduleMutation.isPending}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  if (isLoading) return <Spin size="large" />;
  
  if (error) return (
    <Alert 
      message="Error fetching treatment schedules" 
      description={error instanceof Error ? error.message : 'Unknown error'} 
      type="error" 
      showIcon 
    />
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Treatment Schedules</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/treatments/schedules/new')}
        >
          Create New Schedule
        </Button>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Input
            placeholder="Search by patient, medicine, or notes..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by Interval"
            allowClear
            value={intervalFilter}
            onChange={setIntervalFilter}
            style={{ width: 180 }}
          >
            <Select.Option value="1">DAILY</Select.Option>
            <Select.Option value="2">EVERY OTHER DAY</Select.Option>
          </Select>
          <Select
            placeholder="Filter by Unit"
            allowClear
            value={unitFilter}
            onChange={setUnitFilter}
            style={{ width: 150 }}
          >
            {uniqueUnits.map(unit => (
              <Select.Option key={unit} value={unit}>{unit}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Filter by Status"
            allowClear
            value={activeFilter}
            onChange={setActiveFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
          </Select>
        </Space>
        <Table
          dataSource={filteredSchedules}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} schedules`,
          }}
          bordered
          scroll={{ x: 1200 }}
        />
      </Space>
    </div>
  );
}
