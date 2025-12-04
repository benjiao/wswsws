'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { TreatmentSchedule } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
}

interface Medicine {
  id: number;
  name: string;
}

const fetchPatients = async (): Promise<Patient[]> => {
  const response = await fetch(`${API_URL}/patients/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results || data;
};

const fetchMedicines = async (): Promise<Medicine[]> => {
  const response = await fetch(`${API_URL}/medicines/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results || data;
};

const fetchSchedule = async (id: string): Promise<TreatmentSchedule> => {
  const response = await fetch(`${API_URL}/treatment-schedules/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateTreatmentSchedule = async (id: string, values: any) => {
  const payload = {
    patient: values.patient,
    medicine: values.medicine || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    frequency: values.frequency || null,
    interval: values.interval || null,
    dosage: values.dosage ? String(values.dosage) : null,
    unit: values.unit || 'mL',
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/treatment-schedules/${id}/`, {
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

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['treatment_schedule', scheduleId],
    queryFn: () => fetchSchedule(scheduleId!),
    enabled: !!scheduleId,
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const { data: medicines, isLoading: medicinesLoading } = useQuery({
    queryKey: ['medicines'],
    queryFn: fetchMedicines,
  });

  if (!scheduleId) {
    return (
      <Alert
        message="Invalid Schedule ID"
        description="The schedule ID is missing from the URL."
        type="error"
        showIcon
      />
    );
  }

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateTreatmentSchedule(scheduleId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['treatment_schedule', scheduleId] });
      router.push('/treatments/schedules');
    },
  });

  // Set form values when schedule data and options are loaded
  React.useEffect(() => {
    if (schedule && patients && Array.isArray(patients) && patients.length > 0 && medicines && Array.isArray(medicines)) {
      form.setFieldsValue({
        patient: schedule.patient?.id || undefined,
        medicine: schedule.medicine?.id || undefined,
        start_date: schedule.start_date || undefined,
        end_date: schedule.end_date || undefined,
        frequency: schedule.frequency || undefined,
        interval: schedule.interval || undefined,
        dosage: schedule.dosage ? parseFloat(schedule.dosage) : undefined,
        unit: schedule.unit || 'mL',
        notes: schedule.notes || undefined,
      });
    }
  }, [schedule, patients, medicines, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (scheduleLoading || patientsLoading || medicinesLoading) {
    return <Spin size="large" />;
  }

  if (!schedule) {
    return (
      <Alert
        message="Schedule not found"
        description="The treatment schedule you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Treatment Schedule</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={
            schedule && patients && medicines
              ? {
                  patient: schedule.patient?.id || undefined,
                  medicine: schedule.medicine?.id || undefined,
                  start_date: schedule.start_date || undefined,
                  end_date: schedule.end_date || undefined,
                  frequency: schedule.frequency || undefined,
                  interval: schedule.interval || undefined,
                  dosage: schedule.dosage ? parseFloat(schedule.dosage) : undefined,
                  unit: schedule.unit || 'mL',
                  notes: schedule.notes || undefined,
                }
              : undefined
          }
        >
          <Form.Item
            name="patient"
            label="Patient"
            rules={[{ required: true, message: 'Please select a patient' }]}
          >
            <Select
              key={`patient-${schedule?.patient}-${patients?.length || 0}`}
              placeholder="Select a patient"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={patients?.map((p: Patient) => ({ value: p.id, label: p.name })) || []}
            />
          </Form.Item>

          <Form.Item
            name="medicine"
            label="Medicine"
          >
            <Select
              key={`medicine-${schedule?.medicine}-${medicines?.length || 0}`}
              placeholder="Select a medicine"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={medicines?.map((m: Medicine) => ({ value: m.id, label: m.name })) || []}
            />
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Start Date"
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="end_date"
            label="End Date"
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="frequency"
            label="Frequency"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Frequency" />
          </Form.Item>

          <Form.Item
            name="interval"
            label="Interval"
          >
            <Select placeholder="Select interval" allowClear>
              <Select.Option value={1}>DAILY</Select.Option>
              <Select.Option value={2}>EVERY OTHER DAY</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dosage"
            label="Dosage"
          >
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Dosage" />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Unit"
          >
            <Input placeholder="Unit (e.g., mL)" />
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
                Update Schedule
              </Button>
              <Button onClick={() => router.push('/treatments/schedules')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating schedule"
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

