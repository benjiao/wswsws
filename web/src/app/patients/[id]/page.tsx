'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card, Checkbox } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
  birth_date: string | null;
  rescued_date: string | null;
  color: string | null;
  sex: number | null;
  sex_display: string;
  spay_neuter_status: boolean;
  spay_neuter_date: string | null;
  spay_neuter_clinic: string | null;
}

const fetchPatient = async (id: string): Promise<Patient> => {
  const response = await fetch(`${API_URL}/patients/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updatePatient = async (id: string, values: any) => {
  const payload = {
    name: values.name,
    birth_date: values.birth_date || null,
    rescued_date: values.rescued_date || null,
    color: values.color || null,
    sex: values.sex || null,
    spay_neuter_status: values.spay_neuter_status || false,
    spay_neuter_date: values.spay_neuter_date || null,
    spay_neuter_clinic: values.spay_neuter_clinic || null,
  };

  const response = await fetch(`${API_URL}/patients/${id}/`, {
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

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

    // Extract and validate patientId
  const patientId = React.useMemo(() => {
    if (!params?.id) return null;
    return typeof params.id === 'string' ? params.id : String(params.id);
  }, [params]);

  // Early return if no valid patientId
  if (!patientId) {
    return (
      <Alert
        message="Invalid patient ID"
        description="No patient ID provided in the URL."
        type="error"
        showIcon
      />
    );
  }
  
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatient(patientId),
    enabled: !!patientId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updatePatient(patientId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      router.push('/patients');
    },
  });

  // Set form values when patient data is loaded
  React.useEffect(() => {
    if (patient) {
      form.setFieldsValue({
        name: patient.name,
        birth_date: patient.birth_date || undefined,
        rescued_date: patient.rescued_date || undefined,
        color: patient.color || undefined,
        sex: patient.sex || undefined,
        spay_neuter_status: patient.spay_neuter_status || false,
        spay_neuter_date: patient.spay_neuter_date || undefined,
        spay_neuter_clinic: patient.spay_neuter_clinic || undefined,
      });
    }
  }, [patient, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (patientLoading) {
    return <Spin size="large" />;
  }

  if (!patient) {
    return (
      <Alert
        message="Patient not found"
        description="The patient you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Patient</h1>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Card 
            title="Basic Information" 
            size="small" 
            style={{ marginBottom: 16 }}
            type="inner"
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Patient name" />
            </Form.Item>

            <Form.Item
              name="color"
              label="Color"
            >
              <Input placeholder="Color" />
            </Form.Item>

            <Form.Item
              name="sex"
              label="Sex"
            >
              <Select placeholder="Select sex" allowClear>
                <Select.Option value={1}>Male</Select.Option>
                <Select.Option value={2}>Female</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="birth_date"
              label="Birth Date"
            >
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="rescued_date"
              label="Rescued Date"
              style={{ marginBottom: 0 }}
            >
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Card 
            title="Spay/Neuter Information" 
            size="small" 
            style={{ marginBottom: 24 }}
            type="inner"
          >
            <Form.Item
              name="spay_neuter_status"
              valuePropName="checked"
              style={{ marginBottom: 16 }}
            >
              <Checkbox>Spayed/Neutered</Checkbox>
            </Form.Item>

            <Form.Item
              name="spay_neuter_date"
              label="Spay/Neuter Date"
            >
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="spay_neuter_clinic"
              label="Clinic Name"
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="Clinic name" />
            </Form.Item>
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Update Patient
              </Button>
              <Button onClick={() => router.push('/patients')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating patient"
            description={updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
    </div>
  );
}





