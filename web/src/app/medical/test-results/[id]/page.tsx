'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Spin, Alert, Card, Select, AutoComplete } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface TestResult {
  id: number;
  medical_record: number;
  health_condition: number | null;
  type: string;
  details: string;
}

interface HealthCondition {
  id: number;
  type: string;
}

const fetchTestResult = async (id: string): Promise<TestResult> => {
  const response = await fetch(`${API_URL}/test-results/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
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

const updateTestResult = async (id: string, values: any) => {
  const response = await fetch(`${API_URL}/test-results/${id}/`, {
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

export default function EditTestResultPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const testResultId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  if (!testResultId) {
    return (
      <Alert
        message="Invalid test result ID"
        description="No test result ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }

  const { data: testResult, isLoading: testResultLoading } = useQuery({
    queryKey: ['test_result', testResultId],
    queryFn: () => fetchTestResult(testResultId),
    enabled: !!testResultId,
  });

  const { data: conditions = [], isLoading: conditionsLoading } = useQuery({
    queryKey: ['health_conditions_all'],
    queryFn: fetchHealthConditions,
  });

  const { data: testResultTypes = [] } = useQuery({
    queryKey: ['test_result_types'],
    queryFn: fetchTestResultTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateTestResult(testResultId, values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test_results'] });
      queryClient.invalidateQueries({ queryKey: ['test_result', testResultId] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  React.useEffect(() => {
    if (testResult) {
      form.setFieldsValue({
        type: testResult.type,
        details: testResult.details,
        health_condition: testResult.health_condition ?? undefined,
      });
    }
  }, [testResult, form]);

  if (testResultLoading || conditionsLoading) return <Spin size="large" />;

  if (!testResult) {
    return (
      <Alert
        message="Test result not found"
        description="The test result you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Edit Test Result</h1>
        <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item name="health_condition" label="Related Condition">
            <Select
              placeholder="Select a related condition (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={conditions.map((c) => ({ value: c.id, label: c.type }))}
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
          <Form.Item>
            <Space>
              <Button onClick={() => router.push(`/medical/records/${testResult.medical_record}`)}>
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
            message="Error updating test result"
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
