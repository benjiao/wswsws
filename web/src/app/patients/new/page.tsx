'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createPatient = async (values: any) => {
  const payload = {
    name: values.name,
    birth_date: values.birth_date || null,
    rescued_date: values.rescued_date || null,
    color: values.color || null,
    sex: values.sex || null,
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
      <h1>Create Patient</h1>
      <Card>
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
  );
}

