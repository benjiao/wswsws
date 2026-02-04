'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Alert, Card, Spin } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Clinic {
  id: number;
  name: string;
}

const fetchClinics = async (): Promise<Clinic[]> => {
  const response = await fetch(`${API_URL}/clinics/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const createVeterinarian = async (values: Record<string, unknown>) => {
  const payload = {
    name: values.name,
    clinic: values.clinic ?? null,
    phone: values.phone || null,
    email: values.email || null,
    notes: values.notes || null,
  };
  const response = await fetch(`${API_URL}/veterinarians/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

export default function NewVeterinarianPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: clinics = [], isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics'],
    queryFn: fetchClinics,
  });

  const createMutation = useMutation({
    mutationFn: createVeterinarian,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veterinarians'] });
      router.push('/clinical-directory/veterinarians');
    },
  });

  const onFinish = (values: Record<string, unknown>) => {
    createMutation.mutate(values);
  };

  if (clinicsLoading) return <Spin size="large" />;

  return (
    <div>
      <h1>Add Veterinarian</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter the veterinarian name' }]}
          >
            <Input placeholder="Veterinarian name" />
          </Form.Item>
          <Form.Item name="clinic" label="Clinic">
            <Select
              placeholder="Select clinic (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={clinics.map((c: Clinic) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Phone number" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="Email" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={4} placeholder="Notes" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Veterinarian
              </Button>
              <Button onClick={() => router.push('/clinical-directory/veterinarians')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
        {createMutation.isError && (
          <Alert
            message="Error creating veterinarian"
            description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
}
