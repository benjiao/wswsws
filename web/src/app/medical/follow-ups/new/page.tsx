'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Alert, Card, Spin } from 'antd';
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

const createFollowUp = async (values: any) => {
  const response = await fetch(`${API_URL}/follow-ups/`, {
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

export default function NewFollowUpPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['medical_records_all'],
    queryFn: fetchMedicalRecords,
  });

  const createMutation = useMutation({
    mutationFn: createFollowUp,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  const onFinish = (values: any) => createMutation.mutate(values);

  if (recordsLoading) return <Spin size="large" />;

  return (
    <div>
      <h1>Create Follow-Up</h1>
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
                label: `${r.patient_name ?? 'Patient'} • ${r.record_date ?? ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="follow_up_date"
            label="Follow-Up Date"
            rules={[{ required: true, message: 'Please select the date' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
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
              message="Error creating follow-up"
              description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Space>
            <Button onClick={() => router.push('/medical/follow-ups')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
