'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Alert, Card, Spin, AutoComplete } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MedicalRecord {
  id: number;
  patient_name?: string;
  record_datetime?: string;
}

interface HealthCondition {
  id: number;
  medical_record: number;
  type: string;
}

const fetchMedicalRecords = async (): Promise<MedicalRecord[]> => {
  const response = await fetch(`${API_URL}/medical-records/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchHealthConditions = async (): Promise<HealthCondition[]> => {
  const response = await fetch(`${API_URL}/health-conditions/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchTestResultTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/test-results/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  const results = data.results ?? data;
  const types = Array.isArray(results)
    ? results.map((t: { type?: string }) => t.type).filter((type): type is string => Boolean(type))
    : [];
  return Array.from(new Set(types)).sort();
};

const createTestResult = async (values: any) => {
  const response = await fetch(`${API_URL}/test-results/`, {
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

export default function NewTestResultPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['medical_records_all'],
    queryFn: fetchMedicalRecords,
  });

  const { data: conditions = [], isLoading: conditionsLoading } = useQuery({
    queryKey: ['health_conditions_all'],
    queryFn: fetchHealthConditions,
  });

  const { data: testResultTypes = [] } = useQuery({
    queryKey: ['test_result_types'],
    queryFn: fetchTestResultTypes,
  });

  const createMutation = useMutation({
    mutationFn: createTestResult,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test_results'] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  const onFinish = (values: any) => createMutation.mutate(values);

  if (recordsLoading || conditionsLoading) return <Spin size="large" />;

  return (
    <div>
      <h1>Create Test Result</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
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
                label: `${r.patient_name ?? 'Patient'} • ${r.record_datetime ?? ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="health_condition" label="Related Condition">
            <Select
              placeholder="Select a related condition (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={conditions.map((c) => ({
                value: c.id,
                label: c.type,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="Test Type"
            rules={[{ required: true, message: 'Please enter the test type' }]}
          >
            <AutoComplete
              options={testResultTypes.map((type) => ({ value: type }))}
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
          {createMutation.isError && (
            <Alert
              type="error"
              message="Error creating test result"
              description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Space>
            <Button onClick={() => router.push('/medical/test-results')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
