'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineProduct {
  id: number;
  product_name: string;
  manufacturer: string | null;
  vaccine_type: string;
  vaccine_type_name?: string;
}

const fetchVaccineProducts = async (): Promise<VaccineProduct[]> => {
  const response = await fetch(`${API_URL}/vaccine-products/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

export default function VaccineProductsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const queryClient = useQueryClient();

  const { data: vaccineProducts, isLoading, error } = useQuery({
    queryKey: ['vaccine_products'],
    queryFn: fetchVaccineProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/vaccine-products/${id}/`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
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

  const filteredProducts = useMemo(() => {
    if (!vaccineProducts) return [];
    if (!searchText) return vaccineProducts;
    const lower = searchText.toLowerCase();
    return vaccineProducts.filter(
      (p: VaccineProduct) =>
        p.product_name.toLowerCase().includes(lower) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(lower)) ||
        (p.vaccine_type_name && p.vaccine_type_name.toLowerCase().includes(lower))
    );
  }, [vaccineProducts, searchText]);

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

  const columns: ColumnsType<VaccineProduct> = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      key: 'product_name',
      sorter: (a, b) => a.product_name.localeCompare(b.product_name),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      render: (v: string | null) => v || '—',
      sorter: (a, b) => (a.manufacturer || '').localeCompare(b.manufacturer || ''),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Vaccine Type',
      dataIndex: 'vaccine_type_name',
      key: 'vaccine_type_name',
      render: (_, record) => record.vaccine_type_name ?? '—',
      sorter: (a, b) => (a.vaccine_type_name || '').localeCompare(b.vaccine_type_name || ''),
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
  ];

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
          dataSource={filteredProducts}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} products`,
          }}
          bordered
        />
      </Space>
    </div>
  );
}
