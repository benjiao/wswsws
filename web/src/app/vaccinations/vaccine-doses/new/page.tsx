'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card, Checkbox, message } from 'antd';
import { useRouter } from 'next/navigation';
import { getUserLocalDate } from '@/utils/DateUtils';

const CREATE_PREFIX = '__create__:';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
}

interface VaccineType {
  id: string;
  name: string;
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

interface Clinic {
  id: number;
  name: string;
}

interface Veterinarian {
  id: number;
  name: string;
  clinic: number | null;
}

interface VaccineProduct {
  id: number;
  product_name: string;
  manufacturer: string | null;
  vaccine_type: string;
}

const fetchClinics = async (): Promise<Clinic[]> => {
  const response = await fetch(`${API_URL}/clinics/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchVeterinarians = async (): Promise<Veterinarian[]> => {
  const response = await fetch(`${API_URL}/veterinarians/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchVaccineProducts = async (): Promise<VaccineProduct[]> => {
  const response = await fetch(`${API_URL}/vaccine-products/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const createClinic = async (name: string): Promise<Clinic> => {
  const response = await fetch(`${API_URL}/clinics/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const createVeterinarian = async (name: string): Promise<Veterinarian> => {
  const response = await fetch(`${API_URL}/veterinarians/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const createVaccineProduct = async (product_name: string, vaccine_type: string, manufacturer?: string | null): Promise<VaccineProduct> => {
  const response = await fetch(`${API_URL}/vaccine-products/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ product_name, vaccine_type, manufacturer: manufacturer ?? null }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const createVaccineDose = async (values: any) => {
  const payload = {
    vaccine_type: values.vaccine_type,
    patient: values.patient,
    dose_date: values.dose_date,
    expiration_date: values.expiration_date || null,
    clinic: values.clinic ?? null,
    veterinarian: values.veterinarian ?? null,
    vaccine_product: values.vaccine_product ?? null,
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
  const [createAnother, setCreateAnother] = useState(false);
  const [clinicSearch, setClinicSearch] = useState('');
  const [veterinarianSearch, setVeterinarianSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const { data: vaccineTypes, isLoading: vaccineTypesLoading } = useQuery({
    queryKey: ['vaccine_types_all'],
    queryFn: fetchVaccineTypes,
  });

  const { data: clinics = [], isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics'],
    queryFn: fetchClinics,
  });

  const { data: veterinarians = [], isLoading: veterinariansLoading } = useQuery({
    queryKey: ['veterinarians'],
    queryFn: fetchVeterinarians,
  });

  const { data: vaccineProducts = [], isLoading: vaccineProductsLoading } = useQuery({
    queryKey: ['vaccine_products_all'],
    queryFn: fetchVaccineProducts,
  });

  const createClinicMutation = useMutation({
    mutationFn: createClinic,
    onSuccess: (data) => {
      queryClient.setQueryData<Clinic[]>(['clinics'], (old) => (old ? [...old, data] : [data]));
    },
  });

  const createVeterinarianMutation = useMutation({
    mutationFn: createVeterinarian,
    onSuccess: (data) => {
      queryClient.setQueryData<Veterinarian[]>(['veterinarians'], (old) => (old ? [...old, data] : [data]));
    },
  });

  const createProductMutation = useMutation({
    mutationFn: ({ product_name, vaccine_type, manufacturer }: { product_name: string; vaccine_type: string; manufacturer?: string | null }) =>
      createVaccineProduct(product_name, vaccine_type, manufacturer),
    onSuccess: (data) => {
      queryClient.setQueryData<VaccineProduct[]>(['vaccine_products_all'], (old) => (old ? [...old, data] : [data]));
    },
  });

  const selectedVaccineTypeId = Form.useWatch('vaccine_type', form);

  const clinicOptions = useMemo((): { value: number | string; label: string }[] => {
    const term = clinicSearch.trim().toLowerCase();
    const matching = term
      ? clinics.filter((c: Clinic) => c.name.toLowerCase().includes(term))
      : clinics;
    const base: { value: number | string; label: string }[] = matching.map((c: Clinic) => ({ value: c.id, label: c.name }));
    if (term && !clinics.some((c: Clinic) => c.name.toLowerCase() === term)) {
      base.push({ value: `${CREATE_PREFIX}${clinicSearch.trim()}`, label: `+ Add "${clinicSearch.trim()}"` });
    }
    return base;
  }, [clinics, clinicSearch]);

  const veterinarianOptions = useMemo((): { value: number | string; label: string }[] => {
    const term = veterinarianSearch.trim().toLowerCase();
    const matching = term
      ? veterinarians.filter((v: Veterinarian) => v.name.toLowerCase().includes(term))
      : veterinarians;
    const base: { value: number | string; label: string }[] = matching.map((v: Veterinarian) => ({ value: v.id, label: v.name }));
    if (term && !veterinarians.some((v: Veterinarian) => v.name.toLowerCase() === term)) {
      base.push({ value: `${CREATE_PREFIX}${veterinarianSearch.trim()}`, label: `+ Add "${veterinarianSearch.trim()}"` });
    }
    return base;
  }, [veterinarians, veterinarianSearch]);

  const productOptions = useMemo((): { value: number | string; label: string }[] => {
    const vaccineTypeId = selectedVaccineTypeId;
    const term = productSearch.trim().toLowerCase();
    const forType = vaccineTypeId
      ? vaccineProducts.filter((p: VaccineProduct) => p.vaccine_type === vaccineTypeId)
      : vaccineProducts;
    const matching = term
      ? forType.filter((p: VaccineProduct) =>
          p.product_name.toLowerCase().includes(term) ||
          (p.manufacturer && p.manufacturer.toLowerCase().includes(term))
        )
      : forType;
    const base: { value: number | string; label: string }[] = matching.map((p: VaccineProduct) => ({
      value: p.id,
      label: p.manufacturer ? `${p.product_name} (${p.manufacturer})` : p.product_name,
    }));
    if (term && vaccineTypeId && !forType.some((p: VaccineProduct) => p.product_name.toLowerCase() === term)) {
      base.push({ value: `${CREATE_PREFIX}${productSearch.trim()}`, label: `+ Add "${productSearch.trim()}"` });
    }
    return base;
  }, [vaccineProducts, productSearch, selectedVaccineTypeId]);

  const createMutation = useMutation({
    mutationFn: createVaccineDose,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_doses'] });
      if (createAnother) {
        form.resetFields(['patient']);
        form.setFieldsValue({
          vaccine_type: variables.vaccine_type ?? undefined,
          dose_date: variables.dose_date ?? undefined,
          expiration_date: variables.expiration_date ?? undefined,
          clinic: variables.clinic ?? undefined,
          veterinarian: variables.veterinarian ?? undefined,
          vaccine_product: variables.vaccine_product ?? undefined,
          notes: variables.notes ?? undefined,
        });
        message.success('Dose recorded. You can now record another dose for a different patient (dosage information kept).', 3);
      } else {
        router.push('/vaccinations/vaccine-doses');
      }
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  if (patientsLoading || vaccineTypesLoading || clinicsLoading || veterinariansLoading || vaccineProductsLoading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Record Vaccine Dose</h1>
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

          <Form.Item name="vaccine_product" label="Product">
            <Select
              placeholder="Select or type to add a product (optional; select vaccine type first)"
              allowClear
              showSearch
              filterOption={false}
              options={productOptions}
              onSearch={setProductSearch}
              onSelect={(value: number | string) => {
                const s = String(value);
                if (s.startsWith(CREATE_PREFIX)) {
                  const productName = s.slice(CREATE_PREFIX.length);
                  const vaccineTypeId = form.getFieldValue('vaccine_type');
                  if (!vaccineTypeId) return;
                  createProductMutation.mutate(
                    { product_name: productName, vaccine_type: vaccineTypeId },
                    {
                      onSuccess: (data) => {
                        form.setFieldsValue({ vaccine_product: data.id });
                        setProductSearch('');
                      },
                    }
                  );
                }
              }}
              loading={createProductMutation.isPending}
              notFoundContent={null}
            />
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
            label="Expiration Date (Override)"
            tooltip="Leave blank to auto-compute from vaccine type interval"
          >
            <Input type="date" style={{ width: '100%' }} placeholder="Auto if blank" />
          </Form.Item>

          <Form.Item name="clinic" label="Clinic">
            <Select
              placeholder="Select or type to add a clinic (optional)"
              allowClear
              showSearch
              filterOption={false}
              options={clinicOptions}
              onSearch={setClinicSearch}
              onSelect={(value: number | string) => {
                const s = String(value);
                if (s.startsWith(CREATE_PREFIX)) {
                  const name = s.slice(CREATE_PREFIX.length);
                  createClinicMutation.mutate(name, {
                    onSuccess: (data) => {
                      form.setFieldsValue({ clinic: data.id });
                      setClinicSearch('');
                    },
                  });
                }
              }}
              loading={createClinicMutation.isPending}
              notFoundContent={null}
            />
          </Form.Item>

          <Form.Item name="veterinarian" label="Veterinarian">
            <Select
              placeholder="Select or type to add a veterinarian (optional)"
              allowClear
              showSearch
              filterOption={false}
              options={veterinarianOptions}
              onSearch={setVeterinarianSearch}
              onSelect={(value: number | string) => {
                const s = String(value);
                if (s.startsWith(CREATE_PREFIX)) {
                  const name = s.slice(CREATE_PREFIX.length);
                  createVeterinarianMutation.mutate(name, {
                    onSuccess: (data) => {
                      form.setFieldsValue({ veterinarian: data.id });
                      setVeterinarianSearch('');
                    },
                  });
                }
              }}
              loading={createVeterinarianMutation.isPending}
              notFoundContent={null}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={4} placeholder="Additional notes" />
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Checkbox
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
              >
                Create another vaccine for a different patient (keep dosage information)
              </Checkbox>
              <Space>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                  Record Dose
                </Button>
                <Button onClick={() => router.push('/vaccinations/vaccine-doses')}>
                  Cancel
                </Button>
              </Space>
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
    </div>
  );
}

