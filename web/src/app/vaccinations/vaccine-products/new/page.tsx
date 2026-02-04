'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineType {
  id: string;
  name: string;
}

const fetchVaccineTypes = async (): Promise<VaccineType[]> => {
  const response = await fetch(`${API_URL}/vaccine-types/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const createVaccineProduct = async (values: { product_name: string; manufacturer?: string | null; vaccine_type: string }) => {
  const payload = {
    product_name: values.product_name,
    manufacturer: values.manufacturer ?? null,
    vaccine_type: values.vaccine_type,
  };
  const response = await fetch(`${API_URL}/vaccine-products/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

export default function NewVaccineProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: vaccineTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['vaccine_types_all'],
    queryFn: fetchVaccineTypes,
  });

  const createMutation = useMutation({
    mutationFn: createVaccineProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_products'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine_products_all'] });
      router.push('/vaccinations/vaccine-products');
    },
  });

  const onFinish = (values: { product_name: string; manufacturer?: string | null; vaccine_type: string }) => {
    createMutation.mutate(values);
  };

  if (typesLoading) return <Spin size="large" />;

  return (
    <div>
      <h1>Create Vaccine Product</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="product_name"
            label="Product Name"
            rules={[{ required: true, message: 'Please enter a product name' }]}
          >
            <Input placeholder="e.g. Purevax, Nobivac" />
          </Form.Item>

          <Form.Item
            name="vaccine_type"
            label="Vaccine Type"
            rules={[{ required: true, message: 'Please select a vaccine type' }]}
          >
            <Select
              placeholder="Select vaccine type"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={vaccineTypes?.map((vt: VaccineType) => ({ value: vt.id, label: vt.name })) ?? []}
            />
          </Form.Item>

          <Form.Item name="manufacturer" label="Manufacturer">
            <Input placeholder="e.g. Boehringer, Zoetis" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Product
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-products')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {createMutation.isError && (
          <Alert
            message="Error creating vaccine product"
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
