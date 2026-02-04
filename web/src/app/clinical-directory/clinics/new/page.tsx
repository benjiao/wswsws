'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createClinic = async (values: Record<string, unknown>) => {
  const payload = {
    name: values.name,
    address: values.address || null,
    phone: values.phone || null,
    email: values.email || null,
    notes: values.notes || null,
  };
  const response = await fetch(`${API_URL}/clinics/`, {
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

export default function NewClinicPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
      router.push('/clinical-directory/clinics');
    },
  });

  const onFinish = (values: Record<string, unknown>) => {
    createMutation.mutate(values);
  };

  return (
    <div>
      <h1>Add Clinic</h1>
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
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Clinic
              </Button>
              <Button onClick={() => router.push('/clinical-directory/clinics')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
        {createMutation.isError && (
          <Alert
            message="Error creating clinic"
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
