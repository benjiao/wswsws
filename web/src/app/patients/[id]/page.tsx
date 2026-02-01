'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card, Checkbox, Table, Tag, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { TreatmentSchedule } from '@/types';

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
  rescued_date: string | null;
  color: string | null;
  sex: number | null;
  sex_display: string;
  spay_neuter_status: boolean;
  spay_neuter_date: string | null;
  spay_neuter_clinic: string | null;
  group: PatientGroup | null;
}

const fetchPatientGroups = async (): Promise<PatientGroup[]> => {
  const response = await fetch(`${API_URL}/patient-groups/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchPatient = async (id: string): Promise<Patient> => {
  const response = await fetch(`${API_URL}/patients/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updatePatient = async (id: string, values: any) => {
  const payload = {
    name: values.name,
    birth_date: values.birth_date || null,
    rescued_date: values.rescued_date || null,
    color: values.color || null,
    sex: values.sex || null,
    spay_neuter_status: values.spay_neuter_status || false,
    spay_neuter_date: values.spay_neuter_date || null,
    spay_neuter_clinic: values.spay_neuter_clinic || null,
    group_id: values.group_id || null,
  };

  const response = await fetch(`${API_URL}/patients/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  return response.json();
};

type ScheduleActiveFilter = 'active' | 'inactive' | 'all';

const fetchTreatmentSchedules = async (
  patientId: string,
  activeFilter: ScheduleActiveFilter
): Promise<TreatmentSchedule[]> => {
  const params = new URLSearchParams({
    patient: patientId,
    page_size: '100',
  });
  if (activeFilter === 'active') params.set('active', 'true');
  if (activeFilter === 'inactive') params.set('active', 'false');
  const response = await fetch(`${API_URL}/treatment-schedules/?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data ?? [];
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [scheduleActiveFilter, setScheduleActiveFilter] = React.useState<ScheduleActiveFilter>('active');

  const { data: patientGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['patient_groups'],
    queryFn: fetchPatientGroups,
  });

    // Extract and validate patientId
  const patientId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  // Early return if no valid patientId
  if (!patientId) {
    return (
      <Alert
        message="Invalid patient ID"
        description="No patient ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }
  
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatient(patientId),
    enabled: !!patientId,
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['treatment_schedules', 'patient', patientId, scheduleActiveFilter],
    queryFn: () => fetchTreatmentSchedules(patientId, scheduleActiveFilter),
    enabled: !!patientId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updatePatient(patientId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      router.push('/patients');
    },
  });

  const toggleScheduleActiveMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) => {
      const response = await fetch(`${API_URL}/treatment-schedules/${scheduleId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
    },
  });

  // Set form values when patient data is loaded
  React.useEffect(() => {
    if (patient) {
      form.setFieldsValue({
        name: patient.name,
        birth_date: patient.birth_date || undefined,
        rescued_date: patient.rescued_date || undefined,
        color: patient.color || undefined,
        sex: patient.sex || undefined,
        spay_neuter_status: patient.spay_neuter_status || false,
        spay_neuter_date: patient.spay_neuter_date || undefined,
        spay_neuter_clinic: patient.spay_neuter_clinic || undefined,
        group_id: patient.group?.id || undefined,
      });
    }
  }, [patient, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (patientLoading) {
    return <Spin size="large" />;
  }

  if (!patient) {
    return (
      <Alert
        message="Patient not found"
        description="The patient you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  const scheduleColumns: ColumnsType<TreatmentSchedule> = [
    {
      title: 'Medicine',
      dataIndex: 'medicine_name',
      key: 'medicine_name',
      sorter: (a, b) => (a.medicine_name ?? '').localeCompare(b.medicine_name ?? ''),
      sortDirections: ['ascend', 'descend'],
      render: (_: any, record: TreatmentSchedule) => (
        <span>
          {record.medicine_name}
          {record.dosage && record.unit && (
            <>
              <br />
              <span style={{ color: '#888', fontSize: '90%' }}>
                {`${record.dosage} ${record.unit}`}
              </span>
            </>
          )}
        </span>
      ),
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      sorter: (a, b) => {
        const at = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
        return at - bt;
      },
      sortDirections: ['ascend', 'descend'],
      render: (date: string | null) => formatDateTime(date),
    },
    {
      title: 'End Time',
      dataIndex: 'last_instance',
      key: 'last_instance',
      sorter: (a, b) => {
        const at = a.last_instance ? new Date(a.last_instance).getTime() : 0;
        const bt = b.last_instance ? new Date(b.last_instance).getTime() : 0;
        return at - bt;
      },
      sortDirections: ['ascend', 'descend'],
      render: (date: string | null) => formatDateTime(date),
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      sorter: (a, b) => (a.frequency ?? 0) - (b.frequency ?? 0),
      sortDirections: ['ascend', 'descend'],
      align: 'center',
      render: (freq: number | null) => freq ?? 'N/A',
    },
    {
      title: 'Interval',
      dataIndex: 'interval_display',
      key: 'interval_display',
      sorter: (a, b) => (a.interval ?? 0) - (b.interval ?? 0),
      sortDirections: ['ascend', 'descend'],
      render: (interval: string, record: TreatmentSchedule) => (
        <Tag color={record.interval === 1 ? 'blue' : 'cyan'}>{interval || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Total Doses',
      dataIndex: 'doses',
      key: 'doses',
      sorter: (a, b) => (a.doses ?? 0) - (b.doses ?? 0),
      sortDirections: ['ascend', 'descend'],
      align: 'center',
      render: (doses: number | null) => doses ?? 'N/A',
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      sorter: (a, b) => (a.pending_count ?? 0) - (b.pending_count ?? 0),
      sortDirections: ['ascend', 'descend'],
      render: (_: any, record: TreatmentSchedule) => {
        const completed = record.completed_count ?? 0;
        const pending = record.pending_count ?? 0;
        const skipped = record.skipped_count ?? 0;
        const total = record.instances_count ?? 0;
        if (total === 0) return <span>No instances</span>;
        return (
          <Space size="small">
            <Tag color="green">{completed}</Tag>
            <Tag color="default">{pending}</Tag>
            <Tag color="red">{skipped}</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      sorter: (a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0),
      sortDirections: ['ascend', 'descend'],
      render: (isActive: boolean | undefined, record: TreatmentSchedule) => (
        <Switch
          checked={isActive !== undefined ? isActive : true}
          onChange={(checked) => {
            toggleScheduleActiveMutation.mutate({ scheduleId: record.id, isActive: checked });
          }}
          loading={toggleScheduleActiveMutation.isPending}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: any, record: TreatmentSchedule) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => router.push(`/treatments/schedules/${record.id}`)}
          title="Edit schedule"
        />
      ),
    },
  ];

  return (
    <div>
      <h1>Edit Patient</h1>

      <Card
        title="Treatment Schedules"
        size="small"
        type="inner"
        style={{ marginBottom: 24 }}
      >
        <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span>Status:</span>
            <Select
              value={scheduleActiveFilter}
              onChange={(v) => setScheduleActiveFilter(v)}
              options={[
                { value: 'active', label: 'Active only' },
                { value: 'inactive', label: 'Inactive only' },
                { value: 'all', label: 'All' },
              ]}
              style={{ width: 140 }}
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push(`/treatments/schedules/new?patient=${patientId}`)}
          >
            Add Schedule
          </Button>
        </Space>
        {schedulesLoading ? (
          <Spin size="small" />
        ) : schedules.length === 0 ? (
          <span style={{ color: '#888' }}>
            {scheduleActiveFilter === 'active' && 'No active treatment schedules.'}
            {scheduleActiveFilter === 'inactive' && 'No inactive treatment schedules.'}
            {scheduleActiveFilter === 'all' && 'No treatment schedules.'}
          </span>
        ) : (
          <Table
            dataSource={schedules}
            columns={scheduleColumns}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
          />
        )}
      </Card>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Card 
            title="Basic Information" 
            size="small" 
            style={{ marginBottom: 16 }}
            type="inner"
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Patient name" />
            </Form.Item>

            <Form.Item
              name="color"
              label="Color"
            >
              <Input placeholder="Color" />
            </Form.Item>

            <Form.Item
              name="sex"
              label="Sex"
            >
              <Select placeholder="Select sex" allowClear>
                <Select.Option value={1}>Male</Select.Option>
                <Select.Option value={2}>Female</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="birth_date"
              label="Birth Date"
            >
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="rescued_date"
              label="Rescued Date"
            >
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="group_id"
              label="Patient Group"
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Select a patient group"
                allowClear
                showSearch
                loading={groupsLoading}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={patientGroups?.map((g: PatientGroup) => ({ value: g.id, label: g.name }))}
              />
            </Form.Item>
          </Card>

          <Card 
            title="Spay/Neuter Information" 
            size="small" 
            style={{ marginBottom: 24 }}
            type="inner"
          >
            <Form.Item
              name="spay_neuter_status"
              valuePropName="checked"
              style={{ marginBottom: 16 }}
            >
              <Checkbox>Spayed/Neutered</Checkbox>
            </Form.Item>

            <Form.Item
              name="spay_neuter_date"
              label="Spay/Neuter Date"
            >
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="spay_neuter_clinic"
              label="Clinic Name"
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Clinic name" />
            </Form.Item>
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Patient
              </Button>
              <Button onClick={() => router.push('/patients')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating patient"
            description={updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
    </div>
  );
}





