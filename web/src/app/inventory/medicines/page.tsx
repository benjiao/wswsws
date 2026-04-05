'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Button, Modal, Select, Grid, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const { useBreakpoint } = Grid;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Medicine {
  id: number;
  name: string;
  stock_status: number;
  stock_status_display: string;
  color?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
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

const fetchMedicines = async (
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    search?: string;
    stockStatus?: string;
  },
  ordering?: string
): Promise<PaginatedResponse<Medicine>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  // Add search parameter
  if (filters?.search) {
    params.append('search', filters.search);
  }

  // Add filter parameters
  if (filters?.stockStatus) {
    params.append('stock_status', filters.stockStatus);
  }

  // Add ordering parameter
  if (ordering) {
    params.append('ordering', ordering);
  }

  const response = await fetch(`${API_URL}/medicines/?${params.toString()}`, {
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

export default function MedicinesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(() => searchParams?.get('sort') ?? undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(() => {
    const o = searchParams?.get('order');
    return o === 'desc' ? 'descend' : o === 'asc' ? 'ascend' : undefined;
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = searchParams?.get('sort');
    const o = searchParams?.get('order');
    setSortField(s ?? undefined);
    setSortOrder(o === 'desc' ? 'descend' : o === 'asc' ? 'ascend' : undefined);
  }, [searchParams]);

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
      'name': 'name',
      'stock_status': 'stock_status',
      'stock_status_display': 'stock_status',
      'created_at': 'created_at',
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
      'medicines', 
      currentPage, 
      pageSize, 
      debouncedSearchText, 
      stockStatusFilter,
      ordering
    ],
    queryFn: () => fetchMedicines(
      currentPage, 
      pageSize,
      {
        search: debouncedSearchText || undefined,
        stockStatus: stockStatusFilter,
      },
      ordering
    ),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch when component mounts if data is stale
    staleTime: 0, // Data is immediately stale, so it will refetch on mount
  });

  const medicines = (paginatedData?.results || []) as Medicine[];

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
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('sort', sorter.field);
      params.set('order', sorter.order === 'descend' ? 'desc' : 'asc');
      router.replace(`${pathname ?? ''}?${params.toString()}`, { scroll: false });
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('sort');
      params.delete('order');
      const qs = params.toString();
      const base = pathname ?? '';
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
    }
  };

  // Mutation to delete medicine
  const deleteMedicineMutation = useMutation({
    mutationFn: async (medicineId: number) => {
      const response = await fetch(`${API_URL}/medicines/${medicineId}/`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      Modal.success({
        content: 'Medicine deleted successfully',
      });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting medicine',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleDeleteMedicine = (medicine: Medicine) => {
    Modal.confirm({
      title: 'Delete Medicine',
      content: (
        <div>
          <p>Are you sure you want to delete this medicine?</p>
          <p><strong>Name:</strong> {medicine.name}</p>
          <p style={{ color: 'red', marginTop: 16 }}>
            <strong>Warning:</strong> This action cannot be undone and may affect treatment schedules.
          </p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMedicineMutation.mutate(medicine.id);
      },
    });
  };

  const getStockStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'red'; // Out of Stock
      case 1: return 'orange'; // Low Stock
      case 2: return 'green'; // In Stock
      default: return 'default';
    }
  };

  const columns: ColumnsType<Medicine> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortField === 'name' ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Stock Status',
      dataIndex: 'stock_status_display',
      key: 'stock_status',
      sorter: true,
      sortOrder: (sortField === 'stock_status' || sortField === 'stock_status_display') ? sortOrder : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (status: string, record: Medicine) => (
        <Tag color={getStockStatusColor(record.stock_status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color: string | null) => {
        if (!color) return 'N/A';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              style={{ 
                width: 20, 
                height: 20, 
                backgroundColor: color, 
                border: '1px solid #d9d9d9',
                borderRadius: 4
              }} 
            />
            <span>{color}</span>
          </div>
        );
      },
      responsive: ['md'],
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string | null) => notes || 'N/A',
      ellipsis: true,
      responsive: ['md'],
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_: any, record: Medicine) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/inventory/medicines/${record.id}`)}
            title="Edit"
            size={isMobile ? 'small' : 'middle'}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteMedicine(record)}
            loading={deleteMedicineMutation.isPending}
            title="Delete"
            size={isMobile ? 'small' : 'middle'}
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
      message="Error fetching medicines" 
      description={error instanceof Error ? error.message : 'Unknown error'} 
      type="error" 
      showIcon 
    />
  );

  return (
    <div>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Medicines</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/inventory/medicines/new')}
          >
            Create New Medicine
          </Button>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Input
              placeholder="Search by name..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 300 }}
            />
            <Select
              placeholder="Filter by Stock Status"
              allowClear
              value={stockStatusFilter}
              onChange={(value) => {
                setStockStatusFilter(value);
                setCurrentPage(1);
              }}
              style={{ width: 180 }}
            >
              <Select.Option value="0">Out of Stock</Select.Option>
              <Select.Option value="1">Low Stock</Select.Option>
              <Select.Option value="2">In Stock</Select.Option>
            </Select>
          </Space>
          <Table
            dataSource={medicines}
            columns={columns}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: paginatedData?.count || 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} medicines`,
            }}
            bordered
          />
        </Space>
      </Card>
    </div>
  );
}
