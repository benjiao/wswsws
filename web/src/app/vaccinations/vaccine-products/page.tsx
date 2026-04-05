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

interface VaccineProduct {
  id: number;
  product_name: string;
  manufacturer: string | null;
  vaccine_type: string;
  vaccine_type_name?: string;
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

const fetchVaccineProducts = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  ordering?: string
): Promise<PaginatedResponse<VaccineProduct>> => {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
  if (search?.trim()) params.append('search', search.trim());
  if (ordering) params.append('ordering', ordering);

  const response = await fetch(`${API_URL}/vaccine-products/?${params.toString()}`, {
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

export default function VaccineProductsPage() {
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
      product_name: 'product_name',
      manufacturer: 'manufacturer',
      vaccine_type_name: 'vaccine_type__name',
    };
    return `${prefix}${fieldMap[sortField] ?? sortField}`;
  }, [sortField, sortOrder]);

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['vaccine_products', currentPage, pageSize, debouncedSearchText, ordering],
    queryFn: () => fetchVaccineProducts(currentPage, pageSize, debouncedSearchText || undefined, ordering),
    placeholderData: (prev) => prev,
  });

  const vaccineProducts = (paginatedData?.results ?? []) as VaccineProduct[];

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<VaccineProduct> | SorterResult<VaccineProduct>[]
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
      const response = await fetch(`${API_URL}/vaccine-products/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_products'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine_products_all'] });
      Modal.success({ content: 'Vaccine product deleted successfully' });
    },
    onError: (err) => {
      Modal.error({
        title: 'Error deleting vaccine product',
        content: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  const handleDelete = (record: VaccineProduct) => {
    Modal.confirm({
      title: 'Delete Vaccine Product',
      content: `Are you sure you want to delete "${record.product_name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const columns: ColumnsType<VaccineProduct> = useMemo(
    () => [
      {
        title: 'Product Name',
        dataIndex: 'product_name',
        key: 'product_name',
        sorter: true,
        sortOrder: sortField === 'product_name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Manufacturer',
        dataIndex: 'manufacturer',
        key: 'manufacturer',
        render: (v: string | null) => v || '—',
        sorter: true,
        sortOrder: sortField === 'manufacturer' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Vaccine Type',
        dataIndex: 'vaccine_type_name',
        key: 'vaccine_type_name',
        render: (_: unknown, record: VaccineProduct) => record.vaccine_type_name ?? '—',
        sorter: true,
        sortOrder: sortField === 'vaccine_type_name' ? sortOrder : undefined,
        sortDirections: ['ascend', 'descend'],
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 100,
        render: (_: unknown, record: VaccineProduct) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/vaccinations/vaccine-products/${record.id}`)}
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
        message="Error fetching vaccine products"
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
          <h1 style={{ margin: 0 }}>Vaccine Products</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/vaccinations/vaccine-products/new')}
          >
            Create New Product
          </Button>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search by product name, manufacturer, or vaccine type..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
          <Table
            dataSource={vaccineProducts}
            columns={columns}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total: paginatedData?.count ?? 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} products`,
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
