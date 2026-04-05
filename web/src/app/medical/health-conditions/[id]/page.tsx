'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Spin, Alert, Card, Checkbox, AutoComplete } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface HealthCondition {
  id: number;
  medical_record: number;
  type: string;
  details: string;
  is_choronic: boolean;
  is_active: boolean;
}

const fetchHealthCondition = async (id: string): Promise<HealthCondition> => {
  const response = await fetch(`${API_URL}/health-conditions/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchConditionTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/health-conditions/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  const results = data.results ?? data;
  const types = Array.isArray(results)
    ? results.map((c: { type?: string }) => c.type).filter((type): type is string => Boolean(type))
    : [];
  return Array.from(new Set(types)).sort();
};

const updateHealthCondition = async (id: string, values: any) => {
  const response = await fetch(`${API_URL}/health-conditions/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

export default function EditHealthConditionPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const conditionId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  if (!conditionId) {
    return (
      <Alert
        message="Invalid health condition ID"
        description="No health condition ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }

  const { data: condition, isLoading: conditionLoading } = useQuery({
    queryKey: ['health_condition', conditionId],
    queryFn: () => fetchHealthCondition(conditionId),
    enabled: !!conditionId,
  });

  const { data: conditionTypes = [] } = useQuery({
    queryKey: ['condition_types'],
    queryFn: fetchConditionTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateHealthCondition(conditionId, values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['health_conditions'] });
      queryClient.invalidateQueries({ queryKey: ['health_condition', conditionId] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  React.useEffect(() => {
    if (condition) {
      form.setFieldsValue({
        type: condition.type,
        details: condition.details,
        is_choronic: condition.is_choronic,
        is_active: condition.is_active,
      });
    }
  }, [condition, form]);

  if (conditionLoading) return <Spin size="large" />;

  if (!condition) {
    return (
      <Alert
        message="Health condition not found"
        description="The health condition you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Edit Health Condition</h1>
        <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item
            name="type"
            label="Condition Type"
            rules={[{ required: true, message: 'Please enter the condition type' }]}
          >
            <AutoComplete
              options={conditionTypes.map((type) => ({ value: type }))}
              filterOption={(inputValue, option) =>
                (option?.value ?? '').toString().toLowerCase().includes(inputValue.toLowerCase())
              }
            >
              <Input />
            </AutoComplete>
          </Form.Item>
          <Form.Item
            name="details"
            label="Details"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="is_choronic" valuePropName="checked">
            <Checkbox>Chronic</Checkbox>
          </Form.Item>
          <Form.Item name="is_active" valuePropName="checked">
            <Checkbox>Active</Checkbox>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => router.push(`/medical/records/${condition.medical_record}`)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Save
              </Button>
            </Space>
          </Form.Item>
        </Form>
        {updateMutation.isError && (
          <Alert
            message="Error updating health condition"
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
