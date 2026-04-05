'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Clinic {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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

const fetchClinics = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string
): Promise<PaginatedResponse<Clinic>> => {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
  if (search?.trim()) params.append('search', search.trim());
  if (ordering) params.append('ordering', ordering);

  const response = await fetch(`${API_URL}/clinics/?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data.results != null && typeof data.count === 'number') return data;
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

export default function ClinicsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const ordering = useMemo(() => {
    if (!sortField) return undefined;
    const prefix = sortOrder === 'descend' ? '-' : '';
    const fieldMap: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      email: 'email',
      address: 'address',
    };
    return `${prefix}${fieldMap[sortField] ?? sortField}`;
  }, [sortField, sortOrder]);

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['clinics', currentPage, pageSize, debouncedSearchText, ordering],
    queryFn: () => fetchClinics(currentPage, pageSize, debouncedSearchText || undefined, ordering),
    placeholderData: (prev) => prev,
  });

  const clinics = (paginatedData?.results ?? []) as Clinic[];

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<Clinic> | SorterResult<Clinic>[]
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
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/clinics/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
      Modal.success({ content: 'Clinic deleted successfully' });
    },
    onError: (err) => {
      Modal.error({
        title: 'Error deleting clinic',
        content: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (clinic: Clinic) => {
    Modal.confirm({
      title: 'Delete Clinic',
      content: `Are you sure you want to delete "${clinic.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(clinic.id),
    });
  };

  const columns: ColumnsType<Clinic> = useMemo(
    () => [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        sortOrder: sortField === 'name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Phone',
        dataIndex: 'phone',
        key: 'phone',
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        ellipsis: true,
        render: (v: string | null) => v || '—',
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 100,
        render: (_: unknown, record: Clinic) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/clinical-directory/clinics/${record.id}`)}
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
    [sortField, sortOrder, router]
  );

  if (isLoading) return <Spin size="large" />;
  if (error) {
    return (
      <Alert
        message="Error fetching clinics"
        description={error instanceof Error ? error.message : 'Unknown error'}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Clinics</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/clinical-directory/clinics/new')}
          >
            Add Clinic
          </Button>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search by name, address, phone, email, notes..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
          <Table
            dataSource={clinics}
            columns={columns}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total: paginatedData?.count ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} clinics`,
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
