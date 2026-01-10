'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Select, Button, Modal, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
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

const fetchTreatmentSchedules = async (
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    search?: string;
    interval?: string;
    active?: string;
  },
  ordering?: string
): Promise<PaginatedResponse<TreatmentSchedule>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  // Add search parameter
  if (filters?.search) {
    params.append('search', filters.search);
  }

  // Add filter parameters
  if (filters?.interval) {
    params.append('interval', filters.interval);
  }
  if (filters?.active) {
    if (filters.active === 'active') {
      params.append('active', 'true');
    } else if (filters.active === 'inactive') {
      params.append('active', 'false');
    }
  }

  // Add ordering parameter
  if (ordering) {
    params.append('ordering', ordering);
  }

  const response = await fetch(`${API_URL}/treatment-schedules/?${params.toString()}`, {
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
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [intervalFilter, setIntervalFilter] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<string | undefined>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined);
  const queryClient = useQueryClient();

  // Debounce search text - update debouncedSearchText after user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Build ordering string from sort field and order
  const ordering = useMemo(() => {
    if (!sortField) return undefined;
    const prefix = sortOrder === 'descend' ? '-' : '';
    // Map frontend field names to API field names
    const fieldMap: Record<string, string> = {
      'patient_name': 'patient__name',
      'medicine_name': 'medicine__name',
      'start_time': 'start_time',
      'frequency': 'frequency',
      'doses': 'doses',
      'interval': 'interval',
      'dosage': 'dosage',
      'is_active': 'is_active',
      'pending_count': 'pending_count', // Note: This might need special handling
    };
    const apiField = fieldMap[sortField] || sortField;
    return `${prefix}${apiField}`;
  }, [sortField, sortOrder]);

  const { 
    data: paginatedData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: [
      'treatment_schedules', 
      currentPage, 
      pageSize, 
      debouncedSearchText, 
      intervalFilter, 
      activeFilter,
      ordering
    ],
    queryFn: () => fetchTreatmentSchedules(
      currentPage, 
      pageSize,
      {
        search: debouncedSearchText || undefined,
        interval: intervalFilter,
        active: activeFilter,
      },
      ordering
    ),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data to prevent flash
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    staleTime: 0, // Data is immediately stale but we use placeholderData
  });

  const schedules = (paginatedData?.results || []) as TreatmentSchedule[];

  // Handle table change (sorting, pagination)
  const handleTableChange = (
    pagination: any,
    filters: any,
    sorter: any
  ) => {
    if (pagination) {
      if (pagination.current !== undefined) {
        setCurrentPage(pagination.current);
      }
      if (pagination.pageSize !== undefined) {
        setPageSize(pagination.pageSize);
      }
    }
    
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };


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


  const columns: ColumnsType<TreatmentSchedule> = [
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Medicine',
      dataIndex: 'medicine_name',
      key: 'medicine_name',
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      width: 150,
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (date: string | null) => formatDateTime(date),
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend' as const,
      width: 180,
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (freq: number | null) => freq ?? 'N/A',
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      width: 100,
      align: 'center',
    },
    {
      title: 'Total Doses',
      dataIndex: 'doses',
      key: 'doses',
      render: (doses: number | null) => doses ?? 'N/A',
      sorter: true,
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
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      width: 130,
    },
    {
      title: 'Dosage',
      dataIndex: 'dosage',
      key: 'dosage',
      render: (dosage: string | null, record: TreatmentSchedule) => 
        dosage ? `${dosage} ${record.unit || ''}` : 'N/A',
      sorter: true,
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
      // Note: pending_count sorting would require annotation in API
      sorter: false, // Disable sorting for this column as it's a computed field
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
      sorter: true,
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

  // Only show loading spinner on initial load, not during debounced search
  const isInitialLoading = isLoading && !paginatedData;
  
  if (isInitialLoading) return <Spin size="large" />;
  
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
            onChange={(value) => {
              setIntervalFilter(value);
              setCurrentPage(1);
            }}
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
              setCurrentPage(1);
            }}
            style={{ width: 150 }}
          >
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
          </Select>
        </Space>
        <Table
          dataSource={schedules}
          columns={columns}
          rowKey="id"
          onChange={handleTableChange}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: paginatedData?.count || 0,
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
