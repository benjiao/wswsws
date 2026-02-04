'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineType {
  id: string;
  name: string;
}

interface VaccineProduct {
  id: number;
  product_name: string;
  manufacturer: string | null;
  vaccine_type: string;
  vaccine_type_name?: string;
}

const fetchVaccineTypes = async (): Promise<VaccineType[]> => {
  const response = await fetch(`${API_URL}/vaccine-types/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchVaccineProduct = async (id: string): Promise<VaccineProduct> => {
  const response = await fetch(`${API_URL}/vaccine-products/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateVaccineProduct = async (id: string, values: { product_name: string; manufacturer?: string | null; vaccine_type: string }) => {
  const payload = {
    product_name: values.product_name,
    manufacturer: values.manufacturer ?? null,
    vaccine_type: values.vaccine_type,
  };
  const response = await fetch(`${API_URL}/vaccine-products/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

export default function EditVaccineProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['vaccine_product', productId],
    queryFn: () => fetchVaccineProduct(productId!),
    enabled: !!productId,
  });

  const { data: vaccineTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['vaccine_types_all'],
    queryFn: fetchVaccineTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (values: { product_name: string; manufacturer?: string | null; vaccine_type: string }) =>
      updateVaccineProduct(productId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_products'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine_products_all'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine_product', productId] });
      router.push('/vaccinations/vaccine-products');
    },
  });

  React.useEffect(() => {
    if (product) {
      form.setFieldsValue({
        product_name: product.product_name,
        manufacturer: product.manufacturer ?? undefined,
        vaccine_type: product.vaccine_type,
      });
    }
  }, [product, form]);

  const onFinish = (values: { product_name: string; manufacturer?: string | null; vaccine_type: string }) => {
    updateMutation.mutate(values);
  };

  if (!productId) {
    return (
      <Alert
        message="Invalid Product ID"
        description="The vaccine product ID is missing from the URL."
        type="error"
        showIcon
      />
    );
  }

  if (productLoading || typesLoading) return <Spin size="large" />;

  if (!product) {
    return (
      <Alert
        message="Vaccine product not found"
        description="The product you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Vaccine Product</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            product_name: product.product_name,
            manufacturer: product.manufacturer ?? undefined,
            vaccine_type: product.vaccine_type,
          }}
        >
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
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Product
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-products')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating vaccine product"
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
