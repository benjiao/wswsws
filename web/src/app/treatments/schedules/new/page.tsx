'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Button, Space, Spin, Alert, Card, Switch, Checkbox, message } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

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
  record_datetime?: string;
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

const createTreatmentSchedule = async (values: any) => {
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

  const response = await fetch(`${API_URL}/treatment-schedules/`, {
    method: 'POST',
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

export default function NewSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [createAnother, setCreateAnother] = useState(false);
  const [createAnotherForRecord, setCreateAnotherForRecord] = useState(false);
  const patientIdFromUrl = searchParams?.get('patient');
  const medicalRecordIdFromUrl = searchParams?.get('medical_record');

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  // Pre-fill patient when opening from patient page (e.g. ?patient=123)
  useEffect(() => {
    if (patientIdFromUrl && patients?.length && form) {
      const id = parseInt(patientIdFromUrl, 10);
      if (!isNaN(id) && patients.some((p: Patient) => p.id === id)) {
        form.setFieldValue('patient', id);
      }
    }
  }, [patientIdFromUrl, patients, form]);

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

  useEffect(() => {
    if (!medicalRecordIdFromUrl || !medicalRecords.length) return;
    const recordId = Number(medicalRecordIdFromUrl);
    if (Number.isNaN(recordId)) return;
    const record = medicalRecords.find((r) => r.id === recordId);
    if (!record) return;
    form.setFieldValue('medical_record', record.id);
    const recordPatientId = typeof record.patient === 'object' ? record.patient?.id : record.patient;
    if (recordPatientId) {
      form.setFieldValue('patient', recordPatientId);
    }
  }, [medicalRecordIdFromUrl, medicalRecords, form]);

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

  const createMutation = useMutation({
    mutationFn: createTreatmentSchedule,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
      
      if (createAnother || createAnotherForRecord) {
        // Keep dosage information and optionally keep patient/medical record
        const dosageFields = {
          medicine: variables.medicine || undefined,
          dosage: variables.dosage || undefined,
          unit: variables.unit || 'mL',
          start_time: variables.start_time || undefined,
          frequency: variables.frequency || undefined,
          doses: variables.doses || undefined,
          interval: variables.interval || undefined,
          notes: variables.notes || undefined,
          is_active: variables.is_active !== undefined ? variables.is_active : true,
          medical_record: variables.medical_record || undefined,
          health_condition: variables.health_condition || undefined,
        };

        if (createAnotherForRecord) {
          form.resetFields(['start_time']);
          form.setFieldsValue({
            ...dosageFields,
            patient: variables.patient || undefined,
            medical_record: variables.medical_record || undefined,
          });
          message.success(
            'Schedule created successfully. You can now create another schedule for the same medical record and patient.',
            3
          );
        } else {
          form.resetFields(['patient', 'start_time']);
          form.setFieldsValue(dosageFields);
          message.success(
            'Schedule created successfully. You can now create another schedule with the same dosage information.',
            3
          );
        }
      } else if (patientIdFromUrl) {
        router.push(`/patients/${patientIdFromUrl}`);
      } else {
        router.push('/treatments/schedules');
      }
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  // Helper function to get default start time with minutes set to 00
  const getDefaultStartTime = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = '18';
    // Minutes always set to 00
    const minutes = '00';
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (patientsLoading || medicinesLoading || recordsLoading || conditionsLoading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      <h1>Create Treatment Schedule</h1>
      <div style={{ maxWidth: 720 }}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              unit: 'mL',
              start_time: getDefaultStartTime(),
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
            name="medicine"
            label="Medicine"
          >
            <Select
              placeholder="Select a medicine"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={medicines?.map((m: Medicine) => ({ value: m.id, label: m.name }))}
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
                label: `${r.patient_name ?? 'Patient'} • ${r.record_datetime ?? ''}`,
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
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Checkbox
                checked={createAnother}
                onChange={(e) => {
                  setCreateAnother(e.target.checked);
                  if (e.target.checked) setCreateAnotherForRecord(false);
                }}
              >
                Create another schedule for a different patient (keep dosage information)
              </Checkbox>
              <Checkbox
                checked={createAnotherForRecord}
                onChange={(e) => {
                  setCreateAnotherForRecord(e.target.checked);
                  if (e.target.checked) setCreateAnother(false);
                }}
              >
                Create another schedule for the same medical record and patient
              </Checkbox>
              <Space>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                  Create Schedule
                </Button>
                <Button onClick={() => router.push('/treatments/schedules')}>
                  Cancel
                </Button>
                {selectedMedicalRecordId && (
                  <Button onClick={() => router.push(`/medical/records/${selectedMedicalRecordId}`)}>
                    Back to Medical Record
                  </Button>
                )}
              </Space>
            </Space>
          </Form.Item>
          </Form>

          {createMutation.isError && (
            <Alert
              message="Error creating schedule"
              description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
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

