'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
}

interface VaccineType {
  id: string;
  name: string;
}

interface VaccineDose {
  id: number;
  vaccine_type: string | { id: string; name: string };
  vaccine_type_name?: string;
  patient: number | { id: number; name: string };
  patient_name?: string;
  dose_number: number;
  dose_date: string;
  expiration_date: string;
  clinic_name: string | null;
  product_name: string | null;
  manufacturer: string | null;
  notes: string | null;
}

const fetchPatients = async (): Promise<Patient[]> => {
  const response = await fetch(`${API_URL}/patients/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchVaccineTypes = async (): Promise<VaccineType[]> => {
  const response = await fetch(`${API_URL}/vaccine-types/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchVaccineDose = async (id: string): Promise<VaccineDose> => {
  const response = await fetch(`${API_URL}/vaccine-doses/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const updateVaccineDose = async (id: string, values: any) => {
  const payload = {
    vaccine_type: values.vaccine_type,
    patient: values.patient,
    dose_number: values.dose_number,
    dose_date: values.dose_date,
    expiration_date: values.expiration_date,
    clinic_name: values.clinic_name || null,
    product_name: values.product_name || null,
    manufacturer: values.manufacturer || null,
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/vaccine-doses/${id}/`, {
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

export default function EditVaccineDosePage() {
  const router = useRouter();
  const params = useParams();
  const doseId = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: dose, isLoading: doseLoading } = useQuery({
    queryKey: ['vaccine_dose', doseId],
    queryFn: () => fetchVaccineDose(doseId!),
    enabled: !!doseId,
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const { data: vaccineTypes, isLoading: vaccineTypesLoading } = useQuery({
    queryKey: ['vaccine_types_all'],
    queryFn: fetchVaccineTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateVaccineDose(doseId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_doses'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine_dose', doseId] });
      router.push('/vaccinations/vaccine-doses');
    },
  });

  React.useEffect(() => {
    if (dose && patients && vaccineTypes) {
      const patientId = typeof dose.patient === 'number' ? dose.patient : dose.patient?.id;
      const vaccineTypeId = typeof dose.vaccine_type === 'string' ? dose.vaccine_type : dose.vaccine_type?.id;

      form.setFieldsValue({
        patient: patientId || undefined,
        vaccine_type: vaccineTypeId || undefined,
        dose_number: dose.dose_number || undefined,
        dose_date: dose.dose_date || undefined,
        expiration_date: dose.expiration_date || undefined,
        clinic_name: dose.clinic_name || undefined,
        product_name: dose.product_name || undefined,
        manufacturer: dose.manufacturer || undefined,
        notes: dose.notes || undefined,
      });
    }
  }, [dose, patients, vaccineTypes, form]);

  const onFinish = (values: any) => {
    updateMutation.mutate(values);
  };

  if (!doseId) {
    return (
      <Alert
        message="Invalid Vaccine Dose ID"
        description="The vaccine dose ID is missing from the URL."
        type="error"
        showIcon
      />
    );
  }

  if (doseLoading || patientsLoading || vaccineTypesLoading) {
    return <Spin size="large" />;
  }

  if (!dose) {
    return (
      <Alert
        message="Vaccine dose not found"
        description="The vaccine dose you're looking for doesn't exist."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <h1>Edit Vaccine Dose</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={dose ? {
            patient: typeof dose.patient === 'number' ? dose.patient : dose.patient?.id,
            vaccine_type: typeof dose.vaccine_type === 'string' ? dose.vaccine_type : dose.vaccine_type?.id,
            dose_number: dose.dose_number,
            dose_date: dose.dose_date,
            expiration_date: dose.expiration_date,
            clinic_name: dose.clinic_name || undefined,
            product_name: dose.product_name || undefined,
            manufacturer: dose.manufacturer || undefined,
            notes: dose.notes || undefined,
          } : undefined}
        >
          <Form.Item
            name="patient"
            label="Patient"
            rules={[{ required: true, message: 'Please select a patient' }]}
          >
            <Select
              key={`patient-${patients?.length || 0}`}
              placeholder="Select a patient"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={patients?.map((p: Patient) => ({ value: p.id, label: p.name })) || []}
            />
          </Form.Item>

          <Form.Item
            name="vaccine_type"
            label="Vaccine Type"
            rules={[{ required: true, message: 'Please select a vaccine type' }]}
          >
            <Select
              key={`vaccine-type-${vaccineTypes?.length || 0}`}
              placeholder="Select a vaccine type"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={vaccineTypes?.map((vt: VaccineType) => ({ value: vt.id, label: vt.name })) || []}
            />
          </Form.Item>

          <Form.Item
            name="dose_number"
            label="Dose Number"
            rules={[{ required: true, message: 'Please enter the dose number' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Dose number" />
          </Form.Item>

          <Form.Item
            name="dose_date"
            label="Dose Date"
            rules={[{ required: true, message: 'Please select the dose date' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expiration_date"
            label="Expiration Date"
            rules={[{ required: true, message: 'Please select the expiration date' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="clinic_name"
            label="Clinic Name"
          >
            <Input placeholder="Clinic name" />
          </Form.Item>

          <Form.Item
            name="product_name"
            label="Product Name"
          >
            <Input placeholder="Product name" />
          </Form.Item>

          <Form.Item
            name="manufacturer"
            label="Manufacturer"
          >
            <Input placeholder="Manufacturer" />
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
                Update Dose
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-doses')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {updateMutation.isError && (
          <Alert
            message="Error updating vaccine dose"
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

