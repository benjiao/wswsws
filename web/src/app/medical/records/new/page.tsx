'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';
import CreatableSelect from 'react-select/creatable';
import { SingleValue } from 'react-select';

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

interface SelectOption {
  value: number;
  label: string;
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

const createClinic = async (name: string): Promise<Clinic> => {
  const response = await fetch(`${API_URL}/clinics/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

const createVeterinarian = async (name: string): Promise<Veterinarian> => {
  const response = await fetch(`${API_URL}/veterinarians/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

const createPatient = async (name: string): Promise<Patient> => {
  const response = await fetch(`${API_URL}/patients/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
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
  const [selectedPatientOption, setSelectedPatientOption] = useState<SelectOption | null>(null);
  const [selectedClinicOption, setSelectedClinicOption] = useState<SelectOption | null>(null);
  const [selectedVeterinarianOption, setSelectedVeterinarianOption] = useState<SelectOption | null>(null);
  const now = new Date();
  const nowLocalDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

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

  const createClinicMutation = useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics_all'] });
    },
  });

  const createVeterinarianMutation = useMutation({
    mutationFn: createVeterinarian,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veterinarians_all'] });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients_all'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const patientOptions = useMemo<SelectOption[]>(
    () => patients?.map((p: Patient) => ({ value: p.id, label: p.name })) ?? [],
    [patients]
  );

  const clinicOptions = useMemo<SelectOption[]>(
    () => clinics?.map((c: Clinic) => ({ value: c.id, label: c.name })) ?? [],
    [clinics]
  );

  const veterinarianOptions = useMemo<SelectOption[]>(
    () => veterinarians?.map((v: Veterinarian) => ({ value: v.id, label: v.name })) ?? [],
    [veterinarians]
  );

  const onFinish = (values: any) => {
    createMutation.mutate({
      ...values,
      patient: selectedPatientOption?.value,
      clinic: selectedClinicOption?.value ?? null,
      veterinarian: selectedVeterinarianOption?.value ?? null,
    });
  };

  const handleCreatePatient = async (inputValue: string) => {
    const name = inputValue.trim();
    if (!name) return;
    try {
      const data = await createPatientMutation.mutateAsync(name);
      const option = { value: data.id, label: data.name };
      setSelectedPatientOption(option);
      form.setFieldValue('patient', option.value);
      form.validateFields(['patient']).catch(() => {
        // Validation state is rendered by Form.Item.
      });
    } catch {
      // Error is surfaced by mutation state below.
    }
  };

  const handleCreateClinic = async (inputValue: string) => {
    const name = inputValue.trim();
    if (!name) return;
    try {
      const data = await createClinicMutation.mutateAsync(name);
      setSelectedClinicOption({ value: data.id, label: data.name });
    } catch {
      // Error is surfaced by mutation state below.
    }
  };

  const handleCreateVeterinarian = async (inputValue: string) => {
    const name = inputValue.trim();
    if (!name) return;
    try {
      const data = await createVeterinarianMutation.mutateAsync(name);
      setSelectedVeterinarianOption({ value: data.id, label: data.name });
    } catch {
      // Error is surfaced by mutation state below.
    }
  };

  if (patientsLoading || clinicsLoading || veterinariansLoading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Create Medical Record</h1>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            record_date: nowLocalDate,
          }}
        >
          <Form.Item
            name="patient"
            rules={[{ required: true, message: 'Please select a patient' }]}
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Patient"
            required
            validateStatus={form.getFieldError('patient').length > 0 ? 'error' : undefined}
            help={form.getFieldError('patient')[0]}
          >
            <CreatableSelect
              isClearable
              placeholder="Select or create a patient"
              options={patientOptions}
              value={selectedPatientOption}
              onChange={(option: SingleValue<SelectOption>) => {
                setSelectedPatientOption(option);
                form.setFieldValue('patient', option?.value);
                form.validateFields(['patient']).catch(() => {
                  // Validation state is rendered by Form.Item.
                });
              }}
              onCreateOption={handleCreatePatient}
              isLoading={createPatientMutation.isPending}
            />
          </Form.Item>

          <Form.Item
            name="record_date"
            label="Record Date"
            rules={[{ required: true, message: 'Please select the date' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Clinic">
            <CreatableSelect
              isClearable
              placeholder="Select or create a clinic (optional)"
              options={clinicOptions}
              value={selectedClinicOption}
              onChange={(option: SingleValue<SelectOption>) => setSelectedClinicOption(option)}
              onCreateOption={handleCreateClinic}
              isLoading={createClinicMutation.isPending}
            />
          </Form.Item>

          <Form.Item label="Veterinarian">
            <CreatableSelect
              isClearable
              placeholder="Select or create a veterinarian (optional)"
              options={veterinarianOptions}
              value={selectedVeterinarianOption}
              onChange={(option: SingleValue<SelectOption>) => setSelectedVeterinarianOption(option)}
              onCreateOption={handleCreateVeterinarian}
              isLoading={createVeterinarianMutation.isPending}
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
          {(createPatientMutation.isError || createClinicMutation.isError || createVeterinarianMutation.isError) && (
            <Alert
              type="error"
              message="Error creating option"
              description={
                createPatientMutation.error instanceof Error
                  ? createPatientMutation.error.message
                  : createClinicMutation.error instanceof Error
                  ? createClinicMutation.error.message
                  : createVeterinarianMutation.error instanceof Error
                    ? createVeterinarianMutation.error.message
                    : 'Unknown error'
              }
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
    </div>
  );
}
