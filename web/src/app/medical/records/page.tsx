'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal, Card } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MedicalRecord {
  id: number;
  record_date: string;
  patient: number | { id: number; name: string };
  patient_name: string;
  veterinarian: number | null;
  veterinarian_name_display: string | null;
  clinic: number | null;
  clinic_name_display: string | null;
  details: string;
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

const fetchMedicalRecords = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string
): Promise<PaginatedResponse<MedicalRecord>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  if (ordering) {
    params.append('ordering', ordering);
  }

  const response = await fetch(`${API_URL}/medical-records/?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (data.results && typeof data.count === 'number') {
    return data;
  }
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
    day: 'numeric',
  });
};

export default function MedicalRecordsPage() {
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
      patient_name: 'patient__name',
      record_date: 'record_date',
      clinic_name_display: 'clinic__name',
      veterinarian_name_display: 'veterinarian__name',
    };
    const apiField = fieldMap[sortField] ?? sortField;
    return `${prefix}${apiField}`;
  }, [sortField, sortOrder]);

  const {
    data: paginatedData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['medical_records', currentPage, pageSize, debouncedSearchText, ordering],
    queryFn: () => fetchMedicalRecords(currentPage, pageSize, debouncedSearchText || undefined, ordering),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/medical-records/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
      Modal.success({ content: 'Medical record deleted successfully' });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting medical record',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (record: MedicalRecord) => {
    Modal.confirm({
      title: 'Delete Medical Record',
      content: (
        <div>
          <p>Are you sure you want to delete this medical record?</p>
          <p><strong>Patient:</strong> {record.patient_name}</p>
          <p><strong>Date:</strong> {formatDate(record.record_date)}</p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const records = (paginatedData?.results ?? []) as MedicalRecord[];

  const columns: ColumnsType<MedicalRecord> = useMemo(
    () => [
      {
        title: 'Patient',
        dataIndex: 'patient_name',
        key: 'patient_name',
        sorter: true,
        sortOrder: sortField === 'patient_name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
        render: (name: string, record: MedicalRecord) => {
          if (record.id) {
            return (
              <span
                onClick={() => router.push(`/medical/records/${record.id}`)}
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
        title: 'Date',
        dataIndex: 'record_date',
        key: 'record_date',
        render: (value: string) => formatDate(value),
        sorter: true,
        sortOrder: sortField === 'record_date' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Clinic',
        dataIndex: 'clinic_name_display',
        key: 'clinic_name_display',
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Veterinarian',
        dataIndex: 'veterinarian_name_display',
        key: 'veterinarian_name_display',
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'center',
        width: 100,
        render: (_: unknown, record: MedicalRecord) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/medical/records/${record.id}`)}
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
      message="Error fetching medical records"
      description={error instanceof Error ? error.message : 'Unknown error'}
      type="error"
      showIcon
    />
  );

  return (
    <div>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Medical Records</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/medical/records/new')}
          >
            Create Medical Record
          </Button>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search by patient, clinic, veterinarian, or details..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 420 }}
          />
          <Table
            dataSource={records}
            columns={columns}
            rowKey="id"
            onChange={(
              _pagination: TablePaginationConfig,
              _filters: unknown,
              sorter: SorterResult<MedicalRecord> | SorterResult<MedicalRecord>[]
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
              showTotal: (total) => `Total ${total} records`,
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
