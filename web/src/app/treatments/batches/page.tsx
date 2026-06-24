'use client';

import { useQuery } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Card, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScheduleBatch } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PaginatedResponse<T> {
  count: number;
  results: T[];
  page_size: number;
  current_page: number;
  total_pages: number;
}

const fetchBatches = async (
  page: number,
  pageSize: number,
  search?: string,
): Promise<PaginatedResponse<ScheduleBatch>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ordering: '-created_at',
  });
  if (search) params.append('search', search);

  const response = await fetch(`${API_URL}/treatment-schedule-batches/?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BatchesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['schedule_batches', currentPage, pageSize, debouncedSearch],
    queryFn: () => fetchBatches(currentPage, pageSize, debouncedSearch),
    placeholderData: (prev) => prev,
  });

  const columns: ColumnsType<ScheduleBatch> = [
    {
      title: 'Batch',
      key: 'name',
      render: (_, record) => (
        <Link href={`/treatments/batches/${record.id}`}>
          {record.name || `Batch #${record.id}`}
        </Link>
      ),
    },
    {
      title: 'Schedules',
      dataIndex: 'schedules_count',
      key: 'schedules_count',
      width: 110,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (val: string) => formatDateTime(val),
    },
  ];

  return (
    <div>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Schedule Batches</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/treatments/schedules/batch-new')}
          >
            New Batch Schedule
          </Button>
        </Space>

        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by name…"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
        </Space>

        {isError && (
          <Alert
            message="Error loading batches"
            description={error instanceof Error ? error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={columns}
          dataSource={data?.results ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>
    </div>
  );
}
