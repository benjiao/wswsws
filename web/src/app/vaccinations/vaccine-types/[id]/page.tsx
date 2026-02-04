'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Switch, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface VaccineType {
  id: string;
  name: string;
  species: string;
  interval_days: number | null;
  grace_days: number;
  is_required: boolean;
  notes: string | null;
}

const fetchVaccineType = async (id: string): Promise<VaccineType> => {
  const response = await fetch(`${API_URL}/vaccine-types/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateVaccineType = async (id: string, values: any) => {
  const payload = {
    name: values.name,
    species: values.species || 'cat',
    interval_days: values.interval_days || null,
    grace_days: values.grace_days || 0,
    is_required: values.is_required !== undefined ? values.is_required : true,
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/vaccine-types/${id}/`, {
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

export default function EditVaccineTypePage() {
  const router = useRouter();
  const params = useParams();
  const vaccineTypeId = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: vaccineType, isLoading: vaccineTypeLoading } = useQuery({
    queryKey: ['vaccine_type', vaccineTypeId],
    queryFn: () => fetchVaccineType(vaccineTypeId!),
    enabled: !!vaccineTypeId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateVaccineType(vaccineTypeId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_types'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine_type', vaccineTypeId] });
      router.push('/vaccinations/vaccine-types');
    },
  });

  React.useEffect(() => {
    if (vaccineType) {
      form.setFieldsValue({
        name: vaccineType.name,
        species: vaccineType.species,
        interval_days: vaccineType.interval_days || undefined,
        grace_days: vaccineType.grace_days,
        is_required: vaccineType.is_required,
        notes: vaccineType.notes || undefined,
      });
    }
  }, [vaccineType, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (!vaccineTypeId) {
    return (
      <Alert
        message="Invalid Vaccine Type ID"
        description="The vaccine type ID is missing from the URL."
        type="error"
        showIcon
      />
    );
  }

  if (vaccineTypeLoading) {
    return <Spin size="large" />;
  }

  if (!vaccineType) {
    return (
      <Alert
        message="Vaccine Type not found"
        description="The vaccine type you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Vaccine Type</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={vaccineType ? {
            name: vaccineType.name,
            species: vaccineType.species,
            interval_days: vaccineType.interval_days || undefined,
            grace_days: vaccineType.grace_days,
            is_required: vaccineType.is_required,
            notes: vaccineType.notes || undefined,
          } : undefined}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Vaccine type name" />
          </Form.Item>

          <Form.Item
            name="species"
            label="Species"
            rules={[{ required: true, message: 'Please select a species' }]}
          >
            <Select placeholder="Select species">
              <Select.Option value="cat">Cat</Select.Option>
              <Select.Option value="dog">Dog</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="interval_days"
            label="Interval Days"
            tooltip="Number of days between doses (e.g., 365 for annual booster)"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Interval in days" />
          </Form.Item>

          <Form.Item
            name="grace_days"
            label="Grace Days"
            tooltip="Allow 'due soon' buffer in days"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Grace days" />
          </Form.Item>

          <Form.Item
            name="is_required"
            label="Required"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={4} placeholder="Additional notes" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Vaccine Type
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-types')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating vaccine type"
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

