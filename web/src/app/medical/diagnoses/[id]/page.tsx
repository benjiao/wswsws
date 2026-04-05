'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Spin, Alert, Card, AutoComplete } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Diagnosis {
  id: number;
  medical_record: number;
  type: string;
  details: string;
}

const fetchDiagnosis = async (id: string): Promise<Diagnosis> => {
  const response = await fetch(`${API_URL}/diagnoses/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchDiagnosisTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/diagnoses/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  const results = data.results ?? data;
  const types = Array.isArray(results)
    ? results.map((d: { type?: string }) => d.type).filter((type): type is string => Boolean(type))
    : [];
  return Array.from(new Set(types)).sort();
};

const updateDiagnosis = async (id: string, values: any) => {
  const response = await fetch(`${API_URL}/diagnoses/${id}/`, {
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

export default function EditDiagnosisPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const diagnosisId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  if (!diagnosisId) {
    return (
      <Alert
        message="Invalid diagnosis ID"
        description="No diagnosis ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }

  const { data: diagnosis, isLoading: diagnosisLoading } = useQuery({
    queryKey: ['diagnosis', diagnosisId],
    queryFn: () => fetchDiagnosis(diagnosisId),
    enabled: !!diagnosisId,
  });

  const { data: diagnosisTypes = [] } = useQuery({
    queryKey: ['diagnosis_types'],
    queryFn: fetchDiagnosisTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateDiagnosis(diagnosisId, values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });
      queryClient.invalidateQueries({ queryKey: ['diagnosis', diagnosisId] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  React.useEffect(() => {
    if (diagnosis) {
      form.setFieldsValue({
        type: diagnosis.type,
        details: diagnosis.details,
      });
    }
  }, [diagnosis, form]);

  if (diagnosisLoading) return <Spin size="large" />;

  if (!diagnosis) {
    return (
      <Alert
        message="Diagnosis not found"
        description="The diagnosis you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Diagnosis</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item
            name="type"
            label="Diagnosis Type"
            rules={[{ required: true, message: 'Please enter the diagnosis type' }]}
          >
            <AutoComplete
              options={diagnosisTypes.map((type) => ({ value: type }))}
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
              <Button onClick={() => router.push(`/medical/records/${diagnosis.medical_record}`)}>
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
            message="Error updating diagnosis"
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
