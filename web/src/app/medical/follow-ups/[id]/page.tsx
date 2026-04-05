'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FollowUp {
  id: number;
  medical_record: number;
  follow_up_date: string;
  details: string;
  notes: string;
}

const fetchFollowUp = async (id: string): Promise<FollowUp> => {
  const response = await fetch(`${API_URL}/follow-ups/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateFollowUp = async (id: string, values: any) => {
  const response = await fetch(`${API_URL}/follow-ups/${id}/`, {
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

export default function EditFollowUpPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const followUpId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  if (!followUpId) {
    return (
      <Alert
        message="Invalid follow-up ID"
        description="No follow-up ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }

  const { data: followUp, isLoading: followUpLoading } = useQuery({
    queryKey: ['follow_up', followUpId],
    queryFn: () => fetchFollowUp(followUpId),
    enabled: !!followUpId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateFollowUp(followUpId, values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow_up', followUpId] });
      router.push(`/medical/records/${data.medical_record}`);
    },
  });

  React.useEffect(() => {
    if (followUp) {
      form.setFieldsValue({
        follow_up_date: followUp.follow_up_date,
        details: followUp.details,
        notes: followUp.notes,
      });
    }
  }, [followUp, form]);

  if (followUpLoading) return <Spin size="large" />;

  if (!followUp) {
    return (
      <Alert
        message="Follow-up not found"
        description="The follow-up you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Edit Follow-Up</h1>
        <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
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
          <Form.Item>
            <Space>
              <Button onClick={() => router.push(`/medical/records/${followUp.medical_record}`)}>
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
            message="Error updating follow-up"
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
