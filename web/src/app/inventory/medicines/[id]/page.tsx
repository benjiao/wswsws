'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Medicine {
  id: number;
  name: string;
  stock_status: number;
  stock_status_display: string;
  color?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

const fetchMedicine = async (id: string): Promise<Medicine> => {
  const response = await fetch(`${API_URL}/medicines/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateMedicine = async (id: string, values: any) => {
  const payload = {
    name: values.name,
    stock_status: values.stock_status,
    color: values.color || null,
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/medicines/${id}/`, {
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

export default function EditMedicinePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Extract and validate medicineId
  const medicineId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  // Early return if no valid medicineId
  if (!medicineId) {
    return (
      <Alert
        message="Invalid medicine ID"
        description="No medicine ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }

  const { data: medicine, isLoading: medicineLoading } = useQuery({
    queryKey: ['medicine', medicineId],
    queryFn: () => fetchMedicine(medicineId),
    enabled: !!medicineId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateMedicine(medicineId, values),
    onSuccess: () => {
      // Invalidate all medicines queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['medicines'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['medicine', medicineId] });
      // Refetch medicines list immediately
      queryClient.refetchQueries({ queryKey: ['medicines'], exact: false });
      router.push('/inventory/medicines');
    },
  });

  // Set form values when medicine data is loaded
  React.useEffect(() => {
    if (medicine) {
      form.setFieldsValue({
        name: medicine.name,
        stock_status: medicine.stock_status,
        color: medicine.color || undefined,
        notes: medicine.notes || undefined,
      });
    }
  }, [medicine, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (medicineLoading) {
    return <Spin size="large" />;
  }

  if (!medicine) {
    return (
      <Alert
        message="Medicine not found"
        description="The medicine you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Edit Medicine</h1>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
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
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Medicine
              </Button>
              <Button onClick={() => router.push('/inventory/medicines')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating medicine"
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
