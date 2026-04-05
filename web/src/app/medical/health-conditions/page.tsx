'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal, Tag, Card } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface HealthCondition {
  id: number;
  medical_record: number;
  patient_name: string;
  type: string;
  details: string;
  notes: string;
  is_choronic: boolean;
  is_active: boolean;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
  total_pages: number;
  results: T[];
}

const fetchConditions = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string
): Promise<PaginatedResponse<HealthCondition>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search && search.trim()) params.append('search', search.trim());
  if (ordering) params.append('ordering', ordering);

  const response = await fetch(`${API_URL}/health-conditions/?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data.results && typeof data.count === 'number') return data;
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

export default function HealthConditionsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const ordering = useMemo(() => {
    if (!sortField) return undefined;
    const prefix = sortOrder === 'descend' ? '-' : '';
    const fieldMap: Record<string, string> = {
      patient_name: 'medical_record__patient__name',
      type: 'type',
      is_active: 'is_active',
    };
    const apiField = fieldMap[sortField] ?? sortField;
    return `${prefix}${apiField}`;
  }, [sortField, sortOrder]);

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['health_conditions', currentPage, pageSize, debouncedSearchText, ordering],
    queryFn: () => fetchConditions(currentPage, pageSize, debouncedSearchText || undefined, ordering),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/health-conditions/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health_conditions'] });
      Modal.success({ content: 'Health condition deleted successfully' });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting health condition',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (condition: HealthCondition) => {
    Modal.confirm({
      title: 'Delete Health Condition',
      content: (
        <div>
          <p>Are you sure you want to delete this health condition?</p>
          <p><strong>Patient:</strong> {condition.patient_name}</p>
          <p><strong>Type:</strong> {condition.type}</p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(condition.id),
    });
  };

  const conditions = (paginatedData?.results ?? []) as HealthCondition[];

  const columns: ColumnsType<HealthCondition> = useMemo(
    () => [
      {
        title: 'Patient',
        dataIndex: 'patient_name',
        key: 'patient_name',
        sorter: true,
        sortOrder: sortField === 'patient_name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        sorter: true,
        sortOrder: sortField === 'type' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Chronic',
        dataIndex: 'is_choronic',
        key: 'is_choronic',
        render: (v: boolean) => <Tag color={v ? 'purple' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
      },
      {
        title: 'Active',
        dataIndex: 'is_active',
        key: 'is_active',
        render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Active' : 'Inactive'}</Tag>,
      },
      {
        title: 'Record',
        dataIndex: 'medical_record',
        key: 'medical_record',
        render: (id: number) => (
          <span onClick={() => router.push(`/medical/records/${id}`)} style={{ cursor: 'pointer' }}>
            {id}
          </span>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'center',
        width: 100,
        render: (_: unknown, record: HealthCondition) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/medical/health-conditions/${record.id}`)}
              title="Edit"
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={deleteMutation.isPending}
              title="Delete"
            />
          </Space>
        ),
      },
    ],
    [sortField, sortOrder, router, deleteMutation.isPending]
  );

  if (isLoading) return <Spin size="large" />;
  if (error) return (
    <Alert
      message="Error fetching health conditions"
      description={error instanceof Error ? error.message : 'Unknown error'}
      type="error"
      showIcon
    />
  );

  return (
    <div>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Health Conditions</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/medical/health-conditions/new')}
          >
            Create Health Condition
          </Button>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search by patient, type, details, or notes..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 420 }}
          />
          <Table
            dataSource={conditions}
            columns={columns}
            rowKey="id"
            onChange={(
              _pagination: TablePaginationConfig,
              _filters: unknown,
              sorter: SorterResult<HealthCondition> | SorterResult<HealthCondition>[]
            ) => {
              const single = Array.isArray(sorter) ? sorter[0] : sorter;
              if (single?.field) {
                setSortField(single.field as string);
                setSortOrder(single.order ?? undefined);
                setCurrentPage(1);
              } else {
                setSortField(undefined);
                setSortOrder(undefined);
              }
            }}
            pagination={{
              current: currentPage,
              pageSize,
              total: paginatedData?.count ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} conditions`,
              onChange: (page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== undefined && newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              },
            }}
            bordered
          />
        </Space>
      </Card>
    </div>
  );
}
