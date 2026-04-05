'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PatientGroup {
  id: number;
  name: string;
  description?: string;
}

const fetchPatientGroups = async (): Promise<PatientGroup[]> => {
  const response = await fetch(`${API_URL}/patient-groups/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const createPatient = async (values: any) => {
  const payload = {
    name: values.name,
    birth_date: values.birth_date || null,
    rescued_date: values.rescued_date || null,
    color: values.color || null,
    sex: values.sex || null,
    group_id: values.group_id || null,
  };

  const response = await fetch(`${API_URL}/patients/`, {
    method: 'POST',
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

export default function NewPatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: patientGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['patient_groups'],
    queryFn: fetchPatientGroups,
  });

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      router.push('/patients');
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Create Patient</h1>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Patient name" />
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
            name="group_id"
            label="Patient Group"
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

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Patient
              </Button>
              <Button onClick={() => router.push('/patients')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {createMutation.isError && (
          <Alert
            message="Error creating patient"
            description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
      </div>
    </div>
  );
}





