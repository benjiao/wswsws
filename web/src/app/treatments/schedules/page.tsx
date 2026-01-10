'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Select, Button, Modal, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreatmentSchedule } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
  total_pages: number;
  results: T[];
}

const fetchTreatmentSchedules = async (page: number = 1, pageSize: number = 20, activeFilter?: string): Promise<PaginatedResponse<TreatmentSchedule>> => {
  let url = `${API_URL}/treatment-schedules/?page=${page}&page_size=${pageSize}`;
  if (activeFilter === 'active') {
    url += '&active=true';
  } else if (activeFilter === 'inactive') {
    url += '&active=false';
  }
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  // Handle both paginated and non-paginated responses for backward compatibility
  if (data.results && typeof data.count === 'number') {
    return data;
  }
  // If not paginated, wrap it
  return {
    count: Array.isArray(data) ? data.length : 0,
    next: null,
    previous: null,
    page_size: pageSize,
    current_page: 1,
    total_pages: 1,
    results: Array.isArray(data) ? data : [],
  };
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

// Helper function to check if schedule has pending instances (for display purposes)
const hasPendingInstances = (schedule: TreatmentSchedule): boolean => {
  const pending = schedule.pending_count ?? 0;
  return pending > 0;
};

export default function SchedulesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [intervalFilter, setIntervalFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<string | undefined>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();

  const { 
    data: paginatedData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['treatment_schedules', currentPage, pageSize, activeFilter],
    queryFn: () => fetchTreatmentSchedules(currentPage, pageSize, activeFilter),
  });

  const schedules = paginatedData?.results || [];


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

  // Mutation to toggle is_active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) => {
      const response = await fetch(`${API_URL}/treatment-schedules/${scheduleId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error updating schedule',
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

    return filtered;
  }, [schedules, searchText, intervalFilter, activeFilter]);

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
      title: 'Completed/Pending/Skipped',
      key: 'status',
      render: (_: any, record: TreatmentSchedule) => {
        const completed = record.completed_count ?? 0;
        const pending = record.pending_count ?? 0;
        const skipped = record.skipped_count ?? 0;
        const total = record.instances_count ?? 0;
        
        if (total === 0) {
          return <span>No instances</span>;
        }
        
        return (
          <Space size="small">
            <Tag color="green">{completed} Completed</Tag>
            <Tag color="default">{pending} Pending</Tag>
            <Tag color="red">{skipped} Skipped</Tag>
          </Space>
        );
      },
      sorter: (a, b) => {
        const aPending = a.pending_count ?? 0;
        const bPending = b.pending_count ?? 0;
        return aPending - bPending;
      },
      sortDirections: ['ascend', 'descend'],
      width: 250,
      align: 'center',
    },
    {
      title: 'Is Active',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      align: 'center',
      render: (isActive: boolean | undefined, record: TreatmentSchedule) => (
        <Switch
          checked={isActive !== undefined ? isActive : true}
          onChange={(checked) => {
            toggleActiveMutation.mutate({ scheduleId: record.id, isActive: checked });
          }}
          loading={toggleActiveMutation.isPending}
        />
      ),
      sorter: (a, b) => {
        const aActive = a.is_active !== undefined ? (a.is_active ? 1 : 0) : 1;
        const bActive = b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1;
        return aActive - bActive;
      },
      sortDirections: ['ascend', 'descend'],
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
            placeholder="Filter by Active Status"
            allowClear
            value={activeFilter}
            onChange={(value) => {
              setActiveFilter(value);
              setCurrentPage(1); // Reset to first page when filter changes
            }}
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
            current: currentPage,
            pageSize: pageSize,
            total: paginatedData?.count || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} schedules`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (current, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
          bordered
          scroll={{ x: 1200 }}
        />
      </Space>
    </div>
  );
}
