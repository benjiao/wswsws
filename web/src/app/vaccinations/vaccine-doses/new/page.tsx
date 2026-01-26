'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';
import { getUserLocalDate } from '@/utils/DateUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
}

interface VaccineType {
  id: string;
  name: string;
  schedule_mode: string;
  interval_days: number | null;
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

const createVaccineDose = async (values: any) => {
  const payload = {
    vaccine_type: values.vaccine_type,
    patient: values.patient,
    dose_number: values.dose_number || null,
    dose_date: values.dose_date,
    clinic_name: values.clinic_name || null,
    product_name: values.product_name || null,
    manufacturer: values.manufacturer || null,
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/vaccine-doses/`, {
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

export default function NewVaccineDosePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const { data: vaccineTypes, isLoading: vaccineTypesLoading } = useQuery({
    queryKey: ['vaccine_types_all'],
    queryFn: fetchVaccineTypes,
  });


  const createMutation = useMutation({
    mutationFn: createVaccineDose,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_doses'] });
      router.push('/vaccinations/vaccine-doses');
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  if (patientsLoading || vaccineTypesLoading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      <h1>Record Vaccine Dose</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            dose_date: getUserLocalDate(),
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
            name="vaccine_type"
            label="Vaccine Type"
            rules={[{ required: true, message: 'Please select a vaccine type' }]}
          >
            <Select
              placeholder="Select a vaccine type"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={vaccineTypes?.map((vt: VaccineType) => ({ value: vt.id, label: vt.name }))}
            />
          </Form.Item>

          <Form.Item
            name="dose_number"
            label="Dose Number (Override)"
            tooltip="Leave blank to auto-compute"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Auto-compute if blank" />
          </Form.Item>

          <Form.Item
            name="dose_date"
            label="Dose Date"
            rules={[{ required: true, message: 'Please select the dose date' }]}
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
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Record Dose
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-doses')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {createMutation.isError && (
          <Alert
            message="Error recording vaccine dose"
            description={createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
}

