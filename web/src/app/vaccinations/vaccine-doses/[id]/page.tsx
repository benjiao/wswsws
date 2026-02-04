'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter, useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CREATE_PREFIX = '__create__:';

interface Patient {
  id: number;
  name: string;
}

interface VaccineType {
  id: string;
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

interface VaccineProduct {
  id: number;
  product_name: string;
  manufacturer: string | null;
  vaccine_type: string;
}

interface VaccineDose {
  id: number;
  vaccine_type: string | { id: string; name: string };
  vaccine_type_name?: string;
  patient: number | { id: number; name: string };
  patient_name?: string;
  dose_date: string;
  expiration_date: string;
  clinic: number | null;
  veterinarian: number | null;
  vaccine_product: number | null;
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

const fetchVaccineDose = async (id: string): Promise<VaccineDose> => {
  const response = await fetch(`${API_URL}/vaccine-doses/${id}/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
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

const updateVaccineDose = async (id: string, values: any) => {
  const payload = {
    vaccine_type: values.vaccine_type,
    patient: values.patient,
    dose_date: values.dose_date,
    expiration_date: values.expiration_date,
    clinic: values.clinic ?? null,
    veterinarian: values.veterinarian ?? null,
    vaccine_product: values.vaccine_product ?? null,
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
  const [clinicSearch, setClinicSearch] = useState('');
  const [veterinarianSearch, setVeterinarianSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const selectedVaccineTypeId = Form.useWatch('vaccine_type', form);
  const formVaccineProductId = Form.useWatch('vaccine_product', form);

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

  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: fetchClinics,
  });

  const { data: veterinarians = [] } = useQuery({
    queryKey: ['veterinarians'],
    queryFn: fetchVeterinarians,
  });

  const { data: vaccineProducts = [] } = useQuery({
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
      base.push({ value: `${CREATE_PREFIX}${veterinarianSearch.trim()}` as number | string, label: `+ Add "${veterinarianSearch.trim()}"` });
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
    const currentProductId = formVaccineProductId ?? dose?.vaccine_product;
    const selectedProduct = currentProductId && vaccineProducts.find((p: VaccineProduct) => p.id === currentProductId);
    const base: { value: number | string; label: string }[] = matching.map((p: VaccineProduct) => ({
      value: p.id,
      label: p.manufacturer ? `${p.product_name} (${p.manufacturer})` : p.product_name,
    }));
    if (selectedProduct && !base.some((o) => o.value === selectedProduct.id)) {
      base.unshift({
        value: selectedProduct.id,
        label: selectedProduct.manufacturer ? `${selectedProduct.product_name} (${selectedProduct.manufacturer})` : selectedProduct.product_name,
      });
    }
    if (term && vaccineTypeId && !forType.some((p: VaccineProduct) => p.product_name.toLowerCase() === term)) {
      base.push({ value: `${CREATE_PREFIX}${productSearch.trim()}` as number | string, label: `+ Add "${productSearch.trim()}"` });
    }
    return base;
  }, [vaccineProducts, productSearch, selectedVaccineTypeId, dose?.vaccine_product, formVaccineProductId]);

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
        dose_date: dose.dose_date || undefined,
        expiration_date: dose.expiration_date || undefined,
        clinic: dose.clinic ?? undefined,
        veterinarian: dose.veterinarian ?? undefined,
        vaccine_product: dose.vaccine_product ?? undefined,
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
            dose_date: dose.dose_date,
            expiration_date: dose.expiration_date,
            clinic: dose.clinic ?? undefined,
            veterinarian: dose.veterinarian ?? undefined,
            vaccine_product: dose.vaccine_product ?? undefined,
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
            label="Expiration Date"
            rules={[{ required: true, message: 'Please select the expiration date' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
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

