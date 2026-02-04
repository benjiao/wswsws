'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Button, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
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

const fetchVaccineTypes = async (): Promise<VaccineType[]> => {
  const response = await fetch(`${API_URL}/vaccine-types/`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.results || data;
};

export default function VaccineTypesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const queryClient = useQueryClient();

  const {
    data: vaccineTypes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vaccine_types'],
    queryFn: fetchVaccineTypes,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/vaccine-types/${id}/`, {
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
      queryClient.invalidateQueries({ queryKey: ['vaccine_types'] });
      Modal.success({
        content: 'Vaccine type deleted successfully',
      });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting vaccine type',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const filteredVaccineTypes = useMemo(() => {
    if (!vaccineTypes) return [];
    if (!searchText) return vaccineTypes;

    const lowerSearchText = searchText.toLowerCase();
    return vaccineTypes.filter((vt: VaccineType) =>
      vt.name.toLowerCase().includes(lowerSearchText) ||
      (vt.notes && vt.notes.toLowerCase().includes(lowerSearchText))
    );
  }, [vaccineTypes, searchText]);

  const handleDelete = (vaccineType: VaccineType) => {
    Modal.confirm({
      title: 'Delete Vaccine Type',
      content: `Are you sure you want to delete "${vaccineType.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMutation.mutate(vaccineType.id);
      },
    });
  };

  const columns: ColumnsType<VaccineType> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Species',
      dataIndex: 'species',
      key: 'species',
      sorter: (a, b) => a.species.localeCompare(b.species),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Interval Days',
      dataIndex: 'interval_days',
      key: 'interval_days',
      render: (days: number | null) => days || 'N/A',
    },
    {
      title: 'Required',
      dataIndex: 'is_required',
      key: 'is_required',
      align: 'center',
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'default'}>
          {required ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_: any, record: VaccineType) => (
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
  ];

  if (isLoading) return <Spin size="large" />;

  if (error) return (
    <Alert
      message="Error fetching vaccine types"
      description={error instanceof Error ? error.message : 'Unknown error'}
      type="error"
      showIcon
    />
  );

  return (
    <div>
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
          dataSource={filteredVaccineTypes}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} vaccine types`,
          }}
          bordered
        />
      </Space>
    </div>
  );
}

