'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Tag, Button, Modal, Select } from 'antd';
import type { TableProps, ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PatientGroup {
  id: number;
  name: string;
  description?: string;
}

interface Patient {
  id: number;
  name: string;
  birth_date: string | null;
  color: string | null;
  sex: number | null;
  sex_display: string;
  spay_neuter_status: boolean;
  active_treatment_schedules_count: number;
  group_id?: number | null;
  group_name?: string | null;
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

const fetchPatients = async (
  page: number = 1, 
  pageSize: number = 20,
  filters?: {
    search?: string;
    color?: string;
    sex?: string;
    spayNeuter?: string;
    activeTreatments?: string;
    group?: string;
  },
  ordering?: string
): Promise<PaginatedResponse<Patient>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  // Add search parameter
  if (filters?.search) {
    params.append('search', filters.search);
  }

  // Add filter parameters
  if (filters?.color) {
    params.append('color', filters.color);
  }
  if (filters?.sex) {
    params.append('sex', filters.sex);
  }
  if (filters?.spayNeuter) {
    if (filters.spayNeuter === 'yes') {
      params.append('spay_neuter_status', 'true');
    } else if (filters.spayNeuter === 'no') {
      params.append('spay_neuter_status', 'false');
    }
  }
  if (filters?.activeTreatments) {
    params.append('active_treatments', filters.activeTreatments);
  }
  if (filters?.group) {
    params.append('group', filters.group);
  }

  // Add ordering parameter
  if (ordering) {
    params.append('ordering', ordering);
  }

  const response = await fetch(`${API_URL}/patients/?${params.toString()}`, {
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

const fetchPatientGroups = async (): Promise<PatientGroup[]> => {
  const response = await fetch(`${API_URL}/patient-groups/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
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
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [colorFilter, setColorFilter] = useState<string | undefined>(undefined);
  const [sexFilter, setSexFilter] = useState<string | undefined>(undefined);
  const [spayNeuterFilter, setSpayNeuterFilter] = useState<string | undefined>(undefined);
  const [activeTreatmentsFilter, setActiveTreatmentsFilter] = useState<string | undefined>(undefined);
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined);
  const queryClient = useQueryClient();

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
      'color': 'color',
      'sex_display': 'sex',
      'birth_date': 'birth_date',
      'spay_neuter_status': 'spay_neuter_status',
      'active_treatment_schedules_count': 'active_count',
      'group': 'group__name',
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
      'patients', 
      currentPage, 
      pageSize, 
      debouncedSearchText, 
      colorFilter, 
      sexFilter, 
      spayNeuterFilter, 
      activeTreatmentsFilter, 
      groupFilter,
      ordering
    ],
    queryFn: () => fetchPatients(
      currentPage, 
      pageSize,
      {
        search: debouncedSearchText || undefined,
        color: colorFilter,
        sex: sexFilter,
        spayNeuter: spayNeuterFilter,
        activeTreatments: activeTreatmentsFilter,
        group: groupFilter,
      },
      ordering
    ),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data to prevent flash
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    staleTime: 0, // Data is immediately stale but we use placeholderData
  });

  const { data: patientGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['patient_groups'],
    queryFn: fetchPatientGroups,
  });

  const patients = (paginatedData?.results || []) as Patient[];

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
    } else {
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

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

  // Mutation to update patient group
  const updatePatientGroupMutation = useMutation({
    mutationFn: async ({ patientId, groupId }: { patientId: number; groupId: number | null }) => {
      const response = await fetch(`${API_URL}/patients/${patientId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ group_id: groupId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error updating patient group',
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

  // Get unique colors for filter dropdown (from all patients, not just current page)
  // Note: This would ideally come from a separate API endpoint, but for now we'll fetch all
  const { data: allPatients } = useQuery({
    queryKey: ['patients_all_for_colors'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/patients/all/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const uniqueColors = useMemo(() => {
    if (!allPatients) return [];
    const colors = new Set(allPatients.map((p: Patient) => p.color).filter(Boolean));
    return Array.from(colors).sort();
  }, [allPatients]);

  const columns: ColumnsType<Patient> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color: string | null) => color || 'N/A',
      sorter: true,
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Sex',
      dataIndex: 'sex_display',
      key: 'sex_display',
      render: (sex: string) => sex || 'N/A',
      sorter: true,
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Birth Date',
      dataIndex: 'birth_date',
      key: 'birth_date',
      render: (date: string | null) => formatDate(date),
      sorter: true,
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Spay/Neuter',
      dataIndex: 'spay_neuter_status',
      key: 'spay_neuter_status',
      align: 'center',
      sorter: true,
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
      sorter: true,
      sortDirections: ['ascend', 'descend'],
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Group',
      dataIndex: 'group_id',
      key: 'group',
      width: 180,
      render: (groupId: number | null | undefined, record: Patient) => (
        <Select
          value={groupId ?? undefined}
          placeholder="Select group"
          allowClear
          showSearch
          loading={groupsLoading}
          style={{ width: '100%' }}
          onChange={(value) => {
            updatePatientGroupMutation.mutate({ patientId: record.id, groupId: value ?? null });
          }}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={patientGroups?.map((g: PatientGroup) => ({ value: g.id, label: g.name })) || []}
        />
      ),
      sorter: true,
      sortDirections: ['ascend', 'descend'],
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

  // Only show loading spinner on initial load, not during debounced search
  const isInitialLoading = isLoading && !paginatedData;
  
  if (isInitialLoading) return <Spin size="large" />;
  
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
            onChange={(value) => {
              setColorFilter(value);
              setCurrentPage(1);
            }}
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
            onChange={(value) => {
              setSexFilter(value);
              setCurrentPage(1);
            }}
            style={{ width: 130 }}
          >
            <Select.Option value="1">Male</Select.Option>
            <Select.Option value="2">Female</Select.Option>
          </Select>
          <Select
            placeholder="Spay/Neuter Status"
            allowClear
            value={spayNeuterFilter}
            onChange={(value) => {
              setSpayNeuterFilter(value);
              setCurrentPage(1);
            }}
            style={{ width: 160 }}
          >
            <Select.Option value="yes">Spayed/Neutered</Select.Option>
            <Select.Option value="no">Not Spayed/Neutered</Select.Option>
          </Select>
          <Select
            placeholder="Active Treatments"
            allowClear
            value={activeTreatmentsFilter}
            onChange={(value) => {
              setActiveTreatmentsFilter(value);
              setCurrentPage(1);
            }}
            style={{ width: 160 }}
          >
            <Select.Option value="yes">Has Active Treatments</Select.Option>
            <Select.Option value="no">No Active Treatments</Select.Option>
          </Select>
          <Select
            placeholder="Filter by Group"
            allowClear
            value={groupFilter}
            onChange={(value) => {
              setGroupFilter(value);
              setCurrentPage(1);
            }}
            loading={groupsLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: 180 }}
            options={patientGroups?.map((g: PatientGroup) => ({ value: String(g.id), label: g.name })) || []}
          />
        </Space>
        <Table
          dataSource={patients}
          columns={columns}
          rowKey="id"
          onChange={handleTableChange}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: paginatedData?.count || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} patients`,
          }}
          bordered
        />
      </Space>
    </div>
  );
}
