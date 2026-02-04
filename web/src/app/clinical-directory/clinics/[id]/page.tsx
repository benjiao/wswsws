'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Clinic {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const fetchClinic = async (id: string): Promise<Clinic> => {
  const response = await fetch(`${API_URL}/clinics/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateClinic = async (id: string, values: Record<string, unknown>) => {
  const payload = {
    name: values.name,
    address: values.address || null,
    phone: values.phone || null,
    email: values.email || null,
    notes: values.notes || null,
  };
  const response = await fetch(`${API_URL}/clinics/${id}/`, {
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

export default function EditClinicPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => fetchClinic(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => updateClinic(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
      queryClient.invalidateQueries({ queryKey: ['clinic', id] });
      router.push('/clinical-directory/clinics');
    },
  });

  React.useEffect(() => {
    if (clinic) {
      form.setFieldsValue({
        name: clinic.name,
        address: clinic.address ?? undefined,
        phone: clinic.phone ?? undefined,
        email: clinic.email ?? undefined,
        notes: clinic.notes ?? undefined,
      });
    }
  }, [clinic, form]);

  const onFinish = (values: Record<string, unknown>) => {
    updateMutation.mutate(values);
  };

  if (!id) {
    return (
      <Alert
        message="Invalid clinic ID"
        description="The clinic ID is missing from the URL."
        type="error"
        showIcon
      />
    );
  }

  if (isLoading) return <Spin size="large" />;

  if (!clinic) {
    return (
      <Alert
        message="Clinic not found"
        description="The clinic you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Clinic</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter the clinic name' }]}
          >
            <Input placeholder="Clinic name" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Address" />
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
                Update Clinic
              </Button>
              <Button onClick={() => router.push('/clinical-directory/clinics')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
        {updateMutation.isError && (
          <Alert
            message="Error updating clinic"
            description={updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
}
