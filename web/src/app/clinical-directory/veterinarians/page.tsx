'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Clinic {
  id: number;
  name: string;
}

interface Veterinarian {
  id: number;
  name: string;
  clinic: number | null;
  clinic_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const fetchVeterinarians = async (): Promise<Veterinarian[]> => {
  const response = await fetch(`${API_URL}/veterinarians/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

export default function VeterinariansPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const queryClient = useQueryClient();

  const { data: veterinarians, isLoading, error } = useQuery({
    queryKey: ['veterinarians'],
    queryFn: fetchVeterinarians,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/veterinarians/${id}/`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veterinarians'] });
      Modal.success({ content: 'Veterinarian deleted successfully' });
    },
    onError: (err) => {
      Modal.error({
        title: 'Error deleting veterinarian',
        content: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  const filteredVeterinarians = useMemo(() => {
    if (!veterinarians) return [];
    if (!searchText.trim()) return veterinarians;
    const lower = searchText.toLowerCase();
    return veterinarians.filter(
      (v: Veterinarian) =>
        v.name.toLowerCase().includes(lower) ||
        (v.clinic_name && v.clinic_name.toLowerCase().includes(lower)) ||
        (v.phone && v.phone.toLowerCase().includes(lower)) ||
        (v.email && v.email.toLowerCase().includes(lower)) ||
        (v.notes && v.notes.toLowerCase().includes(lower))
    );
  }, [veterinarians, searchText]);

  const handleDelete = (vet: Veterinarian) => {
    Modal.confirm({
      title: 'Delete Veterinarian',
      content: `Are you sure you want to delete "${vet.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(vet.id),
    });
  };

  const columns: ColumnsType<Veterinarian> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Clinic',
      dataIndex: 'clinic_name',
      key: 'clinic',
      render: (v: string | null) => v || '—',
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
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_: unknown, record: Veterinarian) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/clinical-directory/veterinarians/${record.id}`)}
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
        message="Error fetching veterinarians"
        description={error instanceof Error ? error.message : 'Unknown error'}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Veterinarians</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/clinical-directory/veterinarians/new')}
        >
          Add Veterinarian
        </Button>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Input
          placeholder="Search by name, clinic, phone, email, notes..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ maxWidth: 400 }}
        />
        <Table
          dataSource={filteredVeterinarians}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} veterinarians`,
          }}
          bordered
        />
      </Space>
    </div>
  );
}
