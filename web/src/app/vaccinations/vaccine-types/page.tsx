'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Button, Modal, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineType {
  id: string;
  name: string;
  species: string;
  interval_days: number | null;
  grace_days: number;
  is_required: boolean;
  notes: string | null;
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

const fetchVaccineTypes = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string
): Promise<PaginatedResponse<VaccineType>> => {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
  if (search?.trim()) params.append('search', search.trim());
  if (ordering) params.append('ordering', ordering);

  const response = await fetch(`${API_URL}/vaccine-types/?${params.toString()}`, {
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

export default function VaccineTypesPage() {
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
      species: 'species',
      interval_days: 'interval_days',
      is_required: 'is_required',
    };
    return `${prefix}${fieldMap[sortField] ?? sortField}`;
  }, [sortField, sortOrder]);

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['vaccine_types', currentPage, pageSize, debouncedSearchText, ordering],
    queryFn: () => fetchVaccineTypes(currentPage, pageSize, debouncedSearchText || undefined, ordering),
    placeholderData: (prev) => prev,
  });

  const vaccineTypes = (paginatedData?.results ?? []) as VaccineType[];

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<VaccineType> | SorterResult<VaccineType>[]
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
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/vaccine-types/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_types'] });
      Modal.success({ content: 'Vaccine type deleted successfully' });
    },
    onError: (err) => {
      Modal.error({
        title: 'Error deleting vaccine type',
        content: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (vaccineType: VaccineType) => {
    Modal.confirm({
      title: 'Delete Vaccine Type',
      content: `Are you sure you want to delete "${vaccineType.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(vaccineType.id),
    });
  };

  const columns: ColumnsType<VaccineType> = useMemo(
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
        title: 'Species',
        dataIndex: 'species',
        key: 'species',
        sorter: true,
        sortOrder: sortField === 'species' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Interval Days',
        dataIndex: 'interval_days',
        key: 'interval_days',
        render: (days: number | null) => days ?? 'N/A',
      },
      {
        title: 'Required',
        dataIndex: 'is_required',
        key: 'is_required',
        align: 'center',
        render: (required: boolean) => (
          <Tag color={required ? 'red' : 'default'}>{required ? 'Yes' : 'No'}</Tag>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 100,
        render: (_: unknown, record: VaccineType) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/vaccinations/vaccine-types/${record.id}`)}
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
        message="Error fetching vaccine types"
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
          <h1 style={{ margin: 0 }}>Vaccine Types</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/vaccinations/vaccine-types/new')}
          >
            Create New Vaccine Type
          </Button>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search by name or notes..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
          <Table
            dataSource={vaccineTypes}
            columns={columns}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total: paginatedData?.count ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} vaccine types`,
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
