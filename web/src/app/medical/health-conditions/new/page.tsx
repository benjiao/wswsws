'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Alert, Card, Spin, Checkbox, AutoComplete } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MedicalRecord {
  id: number;
  patient_name?: string;
  record_date?: string;
}

const fetchMedicalRecords = async (): Promise<MedicalRecord[]> => {
  const response = await fetch(`${API_URL}/medical-records/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
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

const createHealthCondition = async (values: any) => {
  const response = await fetch(`${API_URL}/health-conditions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

export default function NewHealthConditionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['medical_records_all'],
    queryFn: fetchMedicalRecords,
  });

  const { data: conditionTypes = [] } = useQuery({
    queryKey: ['condition_types'],
    queryFn: fetchConditionTypes,
  });

  const createMutation = useMutation({
    mutationFn: createHealthCondition,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['health_conditions'] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  const onFinish = (values: any) => createMutation.mutate(values);

  if (recordsLoading) return <Spin size="large" />;

  return (
    <div>
      <h1>Create Health Condition</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ is_active: true }}>
          <Form.Item
            name="medical_record"
            label="Medical Record"
            rules={[{ required: true, message: 'Please select a medical record' }]}
          >
            <Select
              placeholder="Select a medical record"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={records.map((r) => ({
                value: r.id,
                label: `${r.patient_name ?? 'Patient'} • ${r.record_date ?? ''}`,
              }))}
            />
          </Form.Item>
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

          {createMutation.isError && (
            <Alert
              type="error"
              message="Error creating health condition"
              description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Space>
            <Button onClick={() => router.push('/medical/health-conditions')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
