'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Alert, Card, InputNumber } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createMedicine = async (values: any) => {
  const payload = {
    name: values.name,
    stock_status: values.stock_status ?? 2,
    color: values.color || null,
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/medicines/`, {
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

export default function NewMedicinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: createMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      router.push('/inventory/medicines');
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Create Medicine</h1>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            stock_status: 2,
            color: '#AFAFAF',
          }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a medicine name' }]}
          >
            <Input placeholder="Medicine name" />
          </Form.Item>

          <Form.Item
            name="stock_status"
            label="Stock Status"
            rules={[{ required: true, message: 'Please select stock status' }]}
          >
            <Select placeholder="Select stock status">
              <Select.Option value={0}>Out of Stock</Select.Option>
              <Select.Option value={1}>Low Stock</Select.Option>
              <Select.Option value={2}>In Stock</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="color"
            label="Color"
            help="Hex color code (e.g., #AFAFAF)"
          >
            <Input placeholder="#AFAFAF" maxLength={7} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={4} placeholder="Additional notes about this medicine" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Medicine
              </Button>
              <Button onClick={() => router.push('/inventory/medicines')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {createMutation.isError && (
          <Alert
            message="Error creating medicine"
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
