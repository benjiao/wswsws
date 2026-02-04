'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Space, Spin, Alert, Button, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineDose {
  id: number;
  vaccine_type: string | { id: string; name: string };
  vaccine_type_name: string;
  patient: number | { id: number; name: string };
  patient_name: string;
  dose_number: number;
  dose_date: string;
  expiration_date: string;
  clinic: number | null;
  clinic_name_display: string | null;
  veterinarian: number | null;
  veterinarian_name_display: string | null;
  notes: string | null;
}

const fetchVaccineDoses = async (): Promise<VaccineDose[]> => {
  const response = await fetch(`${API_URL}/vaccine-doses/`, {
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

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function VaccineDosesPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const queryClient = useQueryClient();

  const {
    data: vaccineDoses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vaccine_doses'],
    queryFn: fetchVaccineDoses,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/vaccine-doses/${id}/`, {
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
      queryClient.invalidateQueries({ queryKey: ['vaccine_doses'] });
      Modal.success({
        content: 'Vaccine dose deleted successfully',
      });
    },
    onError: (error) => {
      Modal.error({
        title: 'Error deleting vaccine dose',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const filteredVaccineDoses = useMemo(() => {
    if (!vaccineDoses) return [];
    if (!searchText) return vaccineDoses;

    const lowerSearchText = searchText.toLowerCase();
    return vaccineDoses.filter((dose: VaccineDose) =>
      dose.patient_name.toLowerCase().includes(lowerSearchText) ||
      dose.vaccine_type_name.toLowerCase().includes(lowerSearchText) ||
      (dose.clinic_name_display && dose.clinic_name_display.toLowerCase().includes(lowerSearchText)) ||
      (dose.veterinarian_name_display && dose.veterinarian_name_display.toLowerCase().includes(lowerSearchText)) ||
      (dose.notes && dose.notes.toLowerCase().includes(lowerSearchText))
    );
  }, [vaccineDoses, searchText]);

  const handleDelete = (vaccineDose: VaccineDose) => {
    Modal.confirm({
      title: 'Delete Vaccine Dose',
      content: (
        <div>
          <p>Are you sure you want to delete this vaccine dose?</p>
          <p><strong>Patient:</strong> {vaccineDose.patient_name}</p>
          <p><strong>Vaccine:</strong> {vaccineDose.vaccine_type_name}</p>
          <p><strong>Dose Date:</strong> {formatDate(vaccineDose.dose_date)}</p>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMutation.mutate(vaccineDose.id);
      },
    });
  };

  const columns: ColumnsType<VaccineDose> = [
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      sorter: (a, b) => a.patient_name.localeCompare(b.patient_name),
      sortDirections: ['ascend', 'descend'],
      render: (name: string, record: VaccineDose) => {
        const patientId = typeof record.patient === 'object' ? record.patient?.id : record.patient;
        if (patientId) {
          return (
            <span
              onClick={() => router.push(`/patients/${patientId}`)}
              style={{ cursor: 'pointer' }}
            >
              {name}
            </span>
          );
        }
        return name;
      },
    },
    {
      title: 'Vaccine',
      dataIndex: 'vaccine_type_name',
      key: 'vaccine_type_name',
      sorter: (a, b) => a.vaccine_type_name.localeCompare(b.vaccine_type_name),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Dose #',
      dataIndex: 'dose_number',
      key: 'dose_number',
      align: 'center',
      sorter: (a, b) => a.dose_number - b.dose_number,
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Dose Date',
      dataIndex: 'dose_date',
      key: 'dose_date',
      render: (date: string) => formatDate(date),
      sorter: (a, b) => new Date(a.dose_date).getTime() - new Date(b.dose_date).getTime(),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Expiration',
      dataIndex: 'expiration_date',
      key: 'expiration_date',
      render: (date: string) => formatDate(date),
      sorter: (a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime(),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Clinic',
      dataIndex: 'clinic_name_display',
      key: 'clinic',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Veterinarian',
      dataIndex: 'veterinarian_name_display',
      key: 'veterinarian',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_: any, record: VaccineDose) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/vaccinations/vaccine-doses/${record.id}`)}
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
      message="Error fetching vaccine doses"
      description={error instanceof Error ? error.message : 'Unknown error'}
      type="error"
      showIcon
    />
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Vaccine Doses</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/vaccinations/vaccine-doses/new')}
        >
          Record New Dose
        </Button>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Input
          placeholder="Search by patient, vaccine, clinic, veterinarian, or notes..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ maxWidth: 400 }}
        />
        <Table
          dataSource={filteredVaccineDoses}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} vaccine doses`,
          }}
          bordered
        />
      </Space>
    </div>
  );
}

