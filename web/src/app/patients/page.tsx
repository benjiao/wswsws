'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Button, Modal, Select } from 'antd';
import type { TableProps, ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
  birth_date: string | null;
  color: string | null;
  sex: number | null;
  sex_display: string;
  spay_neuter_status: boolean;
  active_treatment_schedules_count: number;
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

const fetchPatients = async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Patient>> => {
  const response = await fetch(`${API_URL}/patients/?page=${page}&page_size=${pageSize}`, {
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

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function PatientsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [colorFilter, setColorFilter] = useState<string | undefined>(undefined);
  const [sexFilter, setSexFilter] = useState<string | undefined>(undefined);
  const [spayNeuterFilter, setSpayNeuterFilter] = useState<string | undefined>(undefined);
  const [activeTreatmentsFilter, setActiveTreatmentsFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();

  const { 
    data: paginatedData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['patients', currentPage, pageSize],
    queryFn: () => fetchPatients(currentPage, pageSize),
  });

  const patients = paginatedData?.results || [];

  // Mutation to delete patient
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await fetch(`${API_URL}/patients/${patientId}/`, {
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
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      Modal.success({
        content: 'Patient deleted successfully',
      });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting patient',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleDeletePatient = (patient: Patient) => {
    Modal.confirm({
      title: 'Delete Patient',
      content: (
        <div>
          <p>Are you sure you want to delete this patient?</p>
          <p><strong>Name:</strong> {patient.name}</p>
          {patient.active_treatment_schedules_count > 0 && (
            <p style={{ color: 'orange', marginTop: 16 }}>
              <strong>Note:</strong> This patient has {patient.active_treatment_schedules_count} active treatment schedule(s).
            </p>
          )}
          <p style={{ color: 'red', marginTop: 16 }}>
            <strong>Warning:</strong> This action cannot be undone and will also delete all associated treatment schedules and instances.
          </p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deletePatientMutation.mutate(patient.id);
      },
    });
  };

  // Filter patients based on search text and filters
  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    let filtered = patients;

    // Search filter
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      filtered = filtered.filter((patient: Patient) => 
        patient.name.toLowerCase().includes(lowerSearchText) ||
        (patient.color && patient.color.toLowerCase().includes(lowerSearchText))
      );
    }

    // Color filter
    if (colorFilter) {
      filtered = filtered.filter((patient: Patient) => patient.color === colorFilter);
    }

    // Sex filter
    if (sexFilter) {
      filtered = filtered.filter((patient: Patient) => 
        patient.sex === parseInt(sexFilter)
      );
    }

    // Spay/Neuter filter
    if (spayNeuterFilter === 'yes') {
      filtered = filtered.filter((patient: Patient) => patient.spay_neuter_status === true);
    } else if (spayNeuterFilter === 'no') {
      filtered = filtered.filter((patient: Patient) => patient.spay_neuter_status === false);
    }

    // Active treatments filter
    if (activeTreatmentsFilter === 'yes') {
      filtered = filtered.filter((patient: Patient) => patient.active_treatment_schedules_count > 0);
    } else if (activeTreatmentsFilter === 'no') {
      filtered = filtered.filter((patient: Patient) => patient.active_treatment_schedules_count === 0);
    }

    return filtered;
  }, [patients, searchText, colorFilter, sexFilter, spayNeuterFilter, activeTreatmentsFilter]);

  // Get unique colors for filter
  const uniqueColors = useMemo(() => {
    if (!patients) return [];
    const colors = new Set(patients.map((p: Patient) => p.color).filter(Boolean));
    return Array.from(colors).sort();
  }, [patients]);

  const columns: ColumnsType<Patient> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color: string | null) => color || 'N/A',
      sorter: (a, b) => (a.color || '').localeCompare(b.color || ''),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Sex',
      dataIndex: 'sex_display',
      key: 'sex_display',
      render: (sex: string) => sex || 'N/A',
      sorter: (a, b) => (a.sex_display || '').localeCompare(b.sex_display || ''),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Birth Date',
      dataIndex: 'birth_date',
      key: 'birth_date',
      render: (date: string | null) => formatDate(date),
      sorter: (a, b) => {
        if (!a.birth_date && !b.birth_date) return 0;
        if (!a.birth_date) return 1;
        if (!b.birth_date) return -1;
        return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Spay/Neuter',
      dataIndex: 'spay_neuter_status',
      key: 'spay_neuter_status',
      align: 'center',
      sorter: (a, b) => Number(a.spay_neuter_status) - Number(b.spay_neuter_status),
      sortDirections: ['ascend', 'descend'],
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'orange'}>
          {status ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Active Treatments',
      dataIndex: 'active_treatment_schedules_count',
      key: 'active_treatment_schedules_count',
      align: 'center',
      sorter: (a, b) => a.active_treatment_schedules_count - b.active_treatment_schedules_count,
      sortDirections: ['ascend', 'descend'],
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_: any, record: Patient) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/patients/${record.id}`)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePatient(record)}
            loading={deletePatientMutation.isPending}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  if (isLoading) return <Spin size="large" />;
  
  if (error) return (
    <Alert 
      message="Error fetching patients" 
      description={error instanceof Error ? error.message : 'Unknown error'} 
      type="error" 
      showIcon 
    />
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Patients</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/patients/new')}
        >
          Create New Patient
        </Button>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Input
            placeholder="Search by name or color..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by Color"
            allowClear
            value={colorFilter}
            onChange={setColorFilter}
            style={{ width: 150 }}
          >
            {uniqueColors.map(color => (
              <Select.Option key={color} value={color}>{color}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Filter by Sex"
            allowClear
            value={sexFilter}
            onChange={setSexFilter}
            style={{ width: 130 }}
          >
            <Select.Option value="1">Male</Select.Option>
            <Select.Option value="2">Female</Select.Option>
          </Select>
          <Select
            placeholder="Spay/Neuter Status"
            allowClear
            value={spayNeuterFilter}
            onChange={setSpayNeuterFilter}
            style={{ width: 160 }}
          >
            <Select.Option value="yes">Spayed/Neutered</Select.Option>
            <Select.Option value="no">Not Spayed/Neutered</Select.Option>
          </Select>
          <Select
            placeholder="Active Treatments"
            allowClear
            value={activeTreatmentsFilter}
            onChange={setActiveTreatmentsFilter}
            style={{ width: 160 }}
          >
            <Select.Option value="yes">Has Active Treatments</Select.Option>
            <Select.Option value="no">No Active Treatments</Select.Option>
          </Select>
        </Space>
        <Table
          dataSource={filteredPatients}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: paginatedData?.count || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} patients`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (current, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
          bordered
        />
      </Space>
    </div>
  );
}
