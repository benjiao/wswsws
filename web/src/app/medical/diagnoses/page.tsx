'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Diagnosis {
  id: number;
  medical_record: number;
  patient_name: string;
  type: string;
  details: string;
  notes: string;
  created_at: string;
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

const fetchDiagnoses = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string
): Promise<PaginatedResponse<Diagnosis>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search && search.trim()) params.append('search', search.trim());
  if (ordering) params.append('ordering', ordering);

  const response = await fetch(`${API_URL}/diagnoses/?${params.toString()}`, {
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

export default function DiagnosesPage() {
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
      created_at: 'created_at',
    };
    const apiField = fieldMap[sortField] ?? sortField;
    return `${prefix}${apiField}`;
  }, [sortField, sortOrder]);

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['diagnoses', currentPage, pageSize, debouncedSearchText, ordering],
    queryFn: () => fetchDiagnoses(currentPage, pageSize, debouncedSearchText || undefined, ordering),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/diagnoses/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });
      Modal.success({ content: 'Diagnosis deleted successfully' });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting diagnosis',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (diagnosis: Diagnosis) => {
    Modal.confirm({
      title: 'Delete Diagnosis',
      content: (
        <div>
          <p>Are you sure you want to delete this diagnosis?</p>
          <p><strong>Patient:</strong> {diagnosis.patient_name}</p>
          <p><strong>Type:</strong> {diagnosis.type}</p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(diagnosis.id),
    });
  };

  const diagnoses = (paginatedData?.results ?? []) as Diagnosis[];

  const columns: ColumnsType<Diagnosis> = useMemo(
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
        title: 'Record',
        dataIndex: 'medical_record',
        key: 'medical_record',
        render: (id: number) => (
          <span
            onClick={() => router.push(`/medical/records/${id}`)}
            style={{ cursor: 'pointer' }}
          >
            {id}
          </span>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'center',
        width: 100,
        render: (_: unknown, record: Diagnosis) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/medical/diagnoses/${record.id}`)}
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
      message="Error fetching diagnoses"
      description={error instanceof Error ? error.message : 'Unknown error'}
      type="error"
      showIcon
    />
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Diagnoses</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/medical/diagnoses/new')}
        >
          Create Diagnosis
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
          dataSource={diagnoses}
          columns={columns}
          rowKey="id"
          onChange={(
            _pagination: TablePaginationConfig,
            _filters: unknown,
            sorter: SorterResult<Diagnosis> | SorterResult<Diagnosis>[]
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
            showTotal: (total) => `Total ${total} diagnoses`,
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
    </div>
  );
}
