'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

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

const fetchClinics = async (): Promise<Clinic[]> => {
  const response = await fetch(`${API_URL}/clinics/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchVeterinarian = async (id: string): Promise<Veterinarian> => {
  const response = await fetch(`${API_URL}/veterinarians/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateVeterinarian = async (id: string, values: Record<string, unknown>) => {
  const payload = {
    name: values.name,
    clinic: values.clinic ?? null,
    phone: values.phone || null,
    email: values.email || null,
    notes: values.notes || null,
  };
  const response = await fetch(`${API_URL}/veterinarians/${id}/`, {
    method: 'PATCH',
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

export default function EditVeterinarianPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: clinics = [], isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics'],
    queryFn: fetchClinics,
  });

  const { data: veterinarian, isLoading: vetLoading } = useQuery({
    queryKey: ['veterinarian', id],
    queryFn: () => fetchVeterinarian(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => updateVeterinarian(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veterinarians'] });
      queryClient.invalidateQueries({ queryKey: ['veterinarian', id] });
      router.push('/clinical-directory/veterinarians');
    },
  });

  React.useEffect(() => {
    if (veterinarian) {
      form.setFieldsValue({
        name: veterinarian.name,
        clinic: veterinarian.clinic ?? undefined,
        phone: veterinarian.phone ?? undefined,
        email: veterinarian.email ?? undefined,
        notes: veterinarian.notes ?? undefined,
      });
    }
  }, [veterinarian, form]);

  const onFinish = (values: Record<string, unknown>) => {
    updateMutation.mutate(values);
  };

  if (!id) {
    return (
      <Alert
        message="Invalid veterinarian ID"
        description="The veterinarian ID is missing from the URL."
        type="error"
        showIcon
      />
    );
  }

  if (vetLoading || clinicsLoading) return <Spin size="large" />;

  if (!veterinarian) {
    return (
      <Alert
        message="Veterinarian not found"
        description="The veterinarian you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Edit Veterinarian</h1>
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
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Veterinarian
              </Button>
              <Button onClick={() => router.push('/clinical-directory/veterinarians')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
        {updateMutation.isError && (
          <Alert
            message="Error updating veterinarian"
            description={updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
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
