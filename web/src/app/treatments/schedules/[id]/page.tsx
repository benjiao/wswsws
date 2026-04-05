'use client';

import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Button, Space, Spin, Alert, Card, Switch } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { TreatmentSchedule, TreatmentInstance } from '@/types';
import TreatmentInstancesBySchedule from '@/components/TreatmentInstancesBySchedule';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
}

interface Medicine {
  id: number;
  name: string;
}

interface MedicalRecord {
  id: number;
  patient: number | { id: number; name: string };
  patient_name?: string;
  record_date?: string;
}

interface HealthCondition {
  id: number;
  medical_record: number;
  type: string;
}

const fetchPatients = async (): Promise<Patient[]> => {
  const response = await fetch(`${API_URL}/patients/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchMedicines = async (): Promise<Medicine[]> => {
  const response = await fetch(`${API_URL}/medicines/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

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

const fetchSchedule = async (id: string): Promise<TreatmentSchedule> => {
  const response = await fetch(`${API_URL}/treatment-schedules/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchScheduleInstances = async (id: string): Promise<TreatmentInstance[]> => {
  const response = await fetch(`${API_URL}/treatment-schedules/${id}/instances/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

// Helper function to convert ISO datetime to datetime-local format
const convertToDateTimeLocal = (isoString: string | undefined): string | undefined => {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return undefined;
  }
};

const updateTreatmentSchedule = async (id: string, values: any) => {
  // Convert datetime-local format to ISO string for API
  let start_time = null;
  if (values.start_time) {
    // datetime-local returns format "YYYY-MM-DDTHH:mm"
    // Convert to ISO string with timezone
    const date = new Date(values.start_time);
    if (!isNaN(date.getTime())) {
      start_time = date.toISOString();
    }
  }

  const payload = {
    patient: values.patient,
    medicine: values.medicine || null,
    start_time: start_time,
    frequency: values.frequency || null,
    doses: values.doses || null,
    interval: values.interval || null,
    dosage: values.dosage ? String(values.dosage) : null,
    unit: values.unit || 'mL',
    notes: values.notes || null,
    is_active: values.is_active !== undefined ? values.is_active : true,
    medical_record: values.medical_record || null,
    health_condition: values.health_condition || null,
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

  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['medical_records_all'],
    queryFn: fetchMedicalRecords,
  });

  const { data: healthConditions = [], isLoading: conditionsLoading } = useQuery({
    queryKey: ['health_conditions_all'],
    queryFn: fetchHealthConditions,
  });

  const selectedMedicalRecordId = Form.useWatch('medical_record', form);
  const selectedPatientId = Form.useWatch('patient', form);

  const filteredMedicalRecords = useMemo(() => {
    if (!selectedPatientId) return medicalRecords;
    return medicalRecords.filter((r) => {
      const patientId = typeof r.patient === 'object' ? r.patient?.id : r.patient;
      return patientId === selectedPatientId;
    });
  }, [medicalRecords, selectedPatientId]);

  const filteredHealthConditions = useMemo(() => {
    if (!selectedMedicalRecordId) return healthConditions;
    return healthConditions.filter((c) => c.medical_record === selectedMedicalRecordId);
  }, [healthConditions, selectedMedicalRecordId]);

  const { 
    data: instances, 
    isLoading: instancesLoading, 
    error: instancesError,
    refetch: refetchInstances 
  } = useQuery({
    queryKey: ['treatment_schedule_instances', scheduleId],
    queryFn: () => fetchScheduleInstances(scheduleId!),
    enabled: !!scheduleId,
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
      queryClient.invalidateQueries({ queryKey: ['treatment_schedule_instances', scheduleId] });
      router.push('/treatments/schedules');
    },
  });

  // Set form values when schedule data and options are loaded
  React.useEffect(() => {
    if (schedule && patients && Array.isArray(patients) && patients.length > 0 && medicines && Array.isArray(medicines)) {
      form.setFieldsValue({
        patient: schedule.patient?.id || undefined,
        medicine: schedule.medicine?.id || undefined,
        start_time: convertToDateTimeLocal(schedule.start_time),
        frequency: schedule.frequency || undefined,
        doses: schedule.doses || undefined,
        interval: schedule.interval || undefined,
        dosage: schedule.dosage ? parseFloat(schedule.dosage) : undefined,
        unit: schedule.unit || 'mL',
        notes: schedule.notes || undefined,
        medical_record: schedule.medical_record || undefined,
        health_condition: schedule.health_condition || undefined,
      });
    }
  }, [schedule, patients, medicines, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (scheduleLoading || patientsLoading || medicinesLoading || recordsLoading || conditionsLoading) {
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
      {instances && instances.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <h2>Treatment Instances</h2>
          <TreatmentInstancesBySchedule
            data={instances}
            loading={instancesLoading}
            error={instancesError}
            refetch={refetchInstances}
          />
        </Card>
      )}

      {instances && instances.length === 0 && !instancesLoading && (
        <Card style={{ marginBottom: 24 }}>
          <Alert
            message="No instances found"
            description="This schedule doesn't have any treatment instances yet. Generate instances using the generate instances action."
            type="info"
            showIcon
          />
        </Card>
      )}
      <Card>
        <h2>Details</h2>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={
            schedule && patients && medicines
              ? {
                  patient: schedule.patient?.id || undefined,
                  medicine: schedule.medicine?.id || undefined,
                  start_time: convertToDateTimeLocal(schedule.start_time),
                  frequency: schedule.frequency || undefined,
                  doses: schedule.doses || undefined,
                  interval: schedule.interval || undefined,
                  dosage: schedule.dosage ? parseFloat(schedule.dosage) : undefined,
                  unit: schedule.unit || 'mL',
                  notes: schedule.notes || undefined,
                  is_active: schedule.is_active !== undefined ? schedule.is_active : true,
                  medical_record: schedule.medical_record || undefined,
                  health_condition: schedule.health_condition || undefined,
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

          <Form.Item name="medical_record" label="Medical Record">
            <Select
              placeholder="Select a medical record (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={filteredMedicalRecords.map((r) => ({
                value: r.id,
                label: `${r.patient_name ?? 'Patient'} • ${r.record_date ?? ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="health_condition" label="Health Condition">
            <Select
              placeholder="Select a health condition (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={filteredHealthConditions.map((c) => ({ value: c.id, label: c.type }))}
            />
          </Form.Item>

          <Form.Item
            name="start_time"
            label="Start Time"
            rules={[{ required: true, message: 'Please select a start time' }]}
          >
            <Input type="datetime-local" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="frequency"
            label="Frequency (doses per day)"
            rules={[{ required: true, message: 'Please enter frequency' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Frequency" />
          </Form.Item>

          <Form.Item
            name="doses"
            label="Total Doses"
            rules={[{ required: true, message: 'Please enter total number of doses' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Total doses required" />
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

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
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

