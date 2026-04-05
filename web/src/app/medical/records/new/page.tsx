'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
}

interface Clinic {
  id: number;
  name: string;
}

interface Veterinarian {
  id: number;
  name: string;
  clinic: number | null;
}

const fetchPatients = async (): Promise<Patient[]> => {
  const response = await fetch(`${API_URL}/patients/all/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchClinics = async (): Promise<Clinic[]> => {
  const response = await fetch(`${API_URL}/clinics/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchVeterinarians = async (): Promise<Veterinarian[]> => {
  const response = await fetch(`${API_URL}/veterinarians/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const createMedicalRecord = async (values: any) => {
  const response = await fetch(`${API_URL}/medical-records/`, {
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

export default function NewMedicalRecordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const now = new Date();
  const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients_all'],
    queryFn: fetchPatients,
  });

  const { data: clinics, isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics_all'],
    queryFn: fetchClinics,
  });

  const { data: veterinarians, isLoading: veterinariansLoading } = useQuery({
    queryKey: ['veterinarians_all'],
    queryFn: fetchVeterinarians,
  });

  const createMutation = useMutation({
    mutationFn: createMedicalRecord,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
      router.push(`/medical/records/${data.id}`);
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  if (patientsLoading || clinicsLoading || veterinariansLoading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      <h1>Create Medical Record</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            record_datetime: `${nowLocal}:00Z`,
          }}
        >
          <Form.Item
            name="patient"
            label="Patient"
            rules={[{ required: true, message: 'Please select a patient' }]}
          >
            <Select
              placeholder="Select a patient"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={patients?.map((p: Patient) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>

          <Form.Item
            name="record_datetime"
            label="Record Date/Time"
            rules={[{ required: true, message: 'Please select the date/time' }]}
            getValueFromEvent={(e) => (e?.target?.value ? `${e.target.value}:00Z` : undefined)}
            getValueProps={(value) => ({
              value: value ? String(value).replace('Z', '').slice(0, 16) : undefined,
            })}
          >
            <Input type="datetime-local" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="clinic" label="Clinic">
            <Select
              placeholder="Select a clinic (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={clinics?.map((c: Clinic) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <Form.Item name="veterinarian" label="Veterinarian">
            <Select
              placeholder="Select a veterinarian (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={veterinarians?.map((v: Veterinarian) => ({ value: v.id, label: v.name }))}
            />
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
              message="Error creating medical record"
              description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Space>
            <Button onClick={() => router.push('/medical/records')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
