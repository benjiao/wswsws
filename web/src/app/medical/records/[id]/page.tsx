'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card, message, Checkbox, Table, AutoComplete, Modal } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
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

interface MedicalRecord {
  id: number;
  record_date: string;
  patient: number | { id: number; name: string };
  patient_name?: string;
  veterinarian: number | null;
  clinic: number | null;
  details: string;
}

interface HealthCondition {
  id: number;
  medical_record: number;
  type: string;
  details: string;
  is_choronic: boolean;
  is_active: boolean;
}

interface TestResult {
  id: number;
  medical_record: number;
  health_condition: number | null;
  type: string;
  details: string;
}

interface FollowUp {
  id: number;
  medical_record: number;
  follow_up_date: string;
  details: string;
}

interface TreatmentSchedule {
  id: number;
  medicine_name: string;
  dosage: string | null;
  unit: string;
  interval_display?: string;
  start_time: string | null;
  is_active?: boolean;
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

const fetchMedicalRecord = async (id: string): Promise<MedicalRecord> => {
  const response = await fetch(`${API_URL}/medical-records/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchHealthConditions = async (recordId: string): Promise<HealthCondition[]> => {
  const response = await fetch(`${API_URL}/health-conditions/?medical_record=${recordId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchConditionTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/health-conditions/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  const results = data.results ?? data;
  const types = Array.isArray(results)
    ? results.map((c: HealthCondition) => c.type).filter((type): type is string => Boolean(type))
    : [];
  return Array.from(new Set(types)).sort();
};

const fetchTestResults = async (recordId: string): Promise<TestResult[]> => {
  const response = await fetch(`${API_URL}/test-results/?medical_record=${recordId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchTestResultTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/test-results/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  const results = data.results ?? data;
  const types = Array.isArray(results)
    ? results.map((t: TestResult) => t.type).filter((type): type is string => Boolean(type))
    : [];
  return Array.from(new Set(types)).sort();
};

const fetchFollowUps = async (recordId: string): Promise<FollowUp[]> => {
  const response = await fetch(`${API_URL}/follow-ups/?medical_record=${recordId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const deleteHealthCondition = async (id: number) => {
  const response = await fetch(`${API_URL}/health-conditions/${id}/`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
};

const deleteTestResult = async (id: number) => {
  const response = await fetch(`${API_URL}/test-results/${id}/`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
};

const deleteFollowUp = async (id: number) => {
  const response = await fetch(`${API_URL}/follow-ups/${id}/`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
};

const deleteTreatmentSchedule = async (id: number) => {
  const response = await fetch(`${API_URL}/treatment-schedules/${id}/`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
};

const fetchTreatmentSchedules = async (recordId: string): Promise<TreatmentSchedule[]> => {
  const response = await fetch(`${API_URL}/treatment-schedules/?medical_record=${recordId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const updateMedicalRecord = async (id: string, values: any) => {
  const response = await fetch(`${API_URL}/medical-records/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

const createHealthCondition = async (values: any) => {
  const response = await fetch(`${API_URL}/health-conditions/`, {
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

const createTestResult = async (values: any) => {
  const response = await fetch(`${API_URL}/test-results/`, {
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

const createFollowUp = async (values: any) => {
  const response = await fetch(`${API_URL}/follow-ups/`, {
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

export default function MedicalRecordDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const [recordForm] = Form.useForm();
  const [conditionForm] = Form.useForm();
  const [testResultForm] = Form.useForm();
  const [followUpForm] = Form.useForm();
  const [selectedPatientOption, setSelectedPatientOption] = useState<SelectOption | null>(null);
  const [selectedClinicOption, setSelectedClinicOption] = useState<SelectOption | null>(null);
  const [selectedVeterinarianOption, setSelectedVeterinarianOption] = useState<SelectOption | null>(null);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ['medical_record', recordId],
    queryFn: () => fetchMedicalRecord(recordId!),
    enabled: !!recordId,
  });

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

  const { data: healthConditions = [], isLoading: conditionsLoading } = useQuery({
    queryKey: ['health_conditions', recordId],
    queryFn: () => fetchHealthConditions(recordId!),
    enabled: !!recordId,
  });

  const { data: conditionTypes = [] } = useQuery({
    queryKey: ['condition_types'],
    queryFn: fetchConditionTypes,
  });

  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['test_results', recordId],
    queryFn: () => fetchTestResults(recordId!),
    enabled: !!recordId,
  });

  const { data: testResultTypes = [] } = useQuery({
    queryKey: ['test_result_types'],
    queryFn: fetchTestResultTypes,
  });

  const { data: followUps = [], isLoading: followUpsLoading } = useQuery({
    queryKey: ['follow_ups', recordId],
    queryFn: () => fetchFollowUps(recordId!),
    enabled: !!recordId,
  });

  const { data: treatmentSchedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['treatment_schedules_by_record', recordId],
    queryFn: () => fetchTreatmentSchedules(recordId!),
    enabled: !!recordId,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateMedicalRecord(recordId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_record', recordId] });
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
      message.success('Medical record updated');
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

  useEffect(() => {
    if (!record) return;
    const currentPatientId =
      typeof record.patient === 'object' ? record.patient.id : record.patient;
    const currentPatient = patients?.find((p: Patient) => p.id === currentPatientId);
    setSelectedPatientOption(
      currentPatient ? { value: currentPatient.id, label: currentPatient.name } : null
    );
    recordForm.setFieldValue('patient', currentPatientId ?? undefined);
    const currentClinic = clinics?.find((c: Clinic) => c.id === record.clinic);
    setSelectedClinicOption(
      currentClinic ? { value: currentClinic.id, label: currentClinic.name } : null
    );
    const currentVeterinarian = veterinarians?.find((v: Veterinarian) => v.id === record.veterinarian);
    setSelectedVeterinarianOption(
      currentVeterinarian ? { value: currentVeterinarian.id, label: currentVeterinarian.name } : null
    );
  }, [record, patients, clinics, veterinarians, recordForm]);

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

  const handleCreatePatient = async (inputValue: string) => {
    const name = inputValue.trim();
    if (!name) return;
    try {
      const data = await createPatientMutation.mutateAsync(name);
      const option = { value: data.id, label: data.name };
      setSelectedPatientOption(option);
      recordForm.setFieldValue('patient', option.value);
      recordForm.validateFields(['patient']).catch(() => {
        // Validation state is rendered by Form.Item.
      });
    } catch {
      // Error is surfaced by mutation state below.
    }
  };

  const createConditionMutation = useMutation({
    mutationFn: createHealthCondition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health_conditions', recordId] });
      conditionForm.resetFields();
      setIsConditionModalOpen(false);
      message.success('Health condition added');
    },
  });

  const createTestResultMutation = useMutation({
    mutationFn: createTestResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_results', recordId] });
      testResultForm.resetFields();
      setIsTestResultModalOpen(false);
      message.success('Test result added');
    },
  });

  const createFollowUpMutation = useMutation({
    mutationFn: createFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups', recordId] });
      followUpForm.resetFields();
      setIsFollowUpModalOpen(false);
      message.success('Follow-up added');
    },
  });

  const deleteConditionMutation = useMutation({
    mutationFn: deleteHealthCondition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health_conditions', recordId] });
      message.success('Health condition deleted');
    },
  });

  const deleteTestResultMutation = useMutation({
    mutationFn: deleteTestResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_results', recordId] });
      message.success('Test result deleted');
    },
  });

  const deleteFollowUpMutation = useMutation({
    mutationFn: deleteFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups', recordId] });
      message.success('Follow-up deleted');
    },
  });

  const deleteTreatmentScheduleMutation = useMutation({
    mutationFn: deleteTreatmentSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules_by_record', recordId] });
      message.success('Treatment schedule deleted');
    },
  });

  if (!recordId) {
    return (
      <Alert message="Invalid medical record ID" type="error" />
    );
  }

  if (recordLoading || patientsLoading || clinicsLoading || veterinariansLoading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      <Card style={{ marginBottom: 16, maxWidth: 720 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Medical Record</h1>
          <Button onClick={() => router.push('/medical/records')}>Back to Medical Records</Button>
        </Space>
        <Form
          form={recordForm}
          layout="vertical"
          initialValues={{
            patient: typeof record?.patient === 'object' ? record?.patient?.id : record?.patient,
            record_date: record?.record_date,
            details: record?.details,
          }}
          onFinish={(values) =>
            updateMutation.mutate({
              ...values,
              patient: selectedPatientOption?.value,
              clinic: selectedClinicOption?.value ?? null,
              veterinarian: selectedVeterinarianOption?.value ?? null,
            })
          }
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
            validateStatus={recordForm.getFieldError('patient').length > 0 ? 'error' : undefined}
            help={recordForm.getFieldError('patient')[0]}
          >
            <CreatableSelect
              isClearable
              placeholder="Select or create a patient"
              options={patientOptions}
              value={selectedPatientOption}
              onChange={(option: SingleValue<SelectOption>) => {
                setSelectedPatientOption(option);
                recordForm.setFieldValue('patient', option?.value);
                recordForm.validateFields(['patient']).catch(() => {
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

          {updateMutation.isError && (
            <Alert
              type="error"
              message="Error updating medical record"
              description={updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
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
            <Button htmlType="button" onClick={() => router.push('/medical/records')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Save
            </Button>
          </Space>
        </Form>
      </Card>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>

        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Health Conditions</h2>
            <Button type="primary" onClick={() => setIsConditionModalOpen(true)}>
              Add Health Condition
            </Button>
          </Space>
          {(conditionsLoading || createConditionMutation.isPending) && <Spin />}
          {!conditionsLoading && healthConditions.length === 0 && <div>No health conditions yet.</div>}
          {healthConditions.length > 0 && (
            <Table
              dataSource={healthConditions}
              rowKey="id"
              pagination={false}
              columns={[
                { title: 'Type', dataIndex: 'type', key: 'type' },
                {
                  title: 'Details',
                  dataIndex: 'details',
                  key: 'details',
                  render: (v: string | null) => v || '—',
                },
                {
                  title: 'Chronic',
                  dataIndex: 'is_choronic',
                  key: 'is_choronic',
                  render: (v: boolean) => (v ? 'Yes' : 'No'),
                },
                {
                  title: 'Active',
                  dataIndex: 'is_active',
                  key: 'is_active',
                  render: (v: boolean) => (v ? 'Yes' : 'No'),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'center',
                  width: 100,
                  render: (_: unknown, row: HealthCondition) => (
                    <Space>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/medical/health-conditions/${row.id}`)}
                        title="Edit"
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Health Condition',
                            content: 'Are you sure you want to delete this health condition?',
                            okText: 'Yes, Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            onOk: () => deleteConditionMutation.mutate(row.id),
                          });
                        }}
                        loading={deleteConditionMutation.isPending}
                        title="Delete"
                      />
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>

        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Test Results</h2>
            <Button type="primary" onClick={() => setIsTestResultModalOpen(true)}>
              Add Test Result
            </Button>
          </Space>
          {(testResultsLoading || createTestResultMutation.isPending) && <Spin />}
          {!testResultsLoading && testResults.length === 0 && <div>No test results yet.</div>}
          {testResults.length > 0 && (
            <Table
              dataSource={testResults}
              rowKey="id"
              pagination={false}
              columns={[
                { title: 'Type', dataIndex: 'type', key: 'type' },
                {
                  title: 'Related Condition',
                  dataIndex: 'health_condition',
                  key: 'health_condition',
                  render: (v: number | null) => {
                    if (!v) return '—';
                    const condition = healthConditions.find((c) => c.id === v);
                    return condition?.type ?? String(v);
                  },
                },
                {
                  title: 'Details',
                  dataIndex: 'details',
                  key: 'details',
                  render: (v: string | null) => v || '—',
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'center',
                  width: 100,
                  render: (_: unknown, row: TestResult) => (
                    <Space>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/medical/test-results/${row.id}`)}
                        title="Edit"
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Test Result',
                            content: 'Are you sure you want to delete this test result?',
                            okText: 'Yes, Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            onOk: () => deleteTestResultMutation.mutate(row.id),
                          });
                        }}
                        loading={deleteTestResultMutation.isPending}
                        title="Delete"
                      />
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>

        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Treatments</h2>
            <Button type="primary" onClick={() => setIsTreatmentModalOpen(true)}>
              Add Treatment Schedule
            </Button>
          </Space>
          {schedulesLoading && <Spin />}
          {!schedulesLoading && treatmentSchedules.length === 0 && <div>No treatment schedules yet.</div>}
          {treatmentSchedules.length > 0 && (
            <Table
              dataSource={treatmentSchedules}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Medicine',
                  dataIndex: 'medicine_name',
                  key: 'medicine_name',
                  render: (v: string | null) => v || '—',
                },
                {
                  title: 'Dosage',
                  key: 'dosage',
                  render: (_: unknown, row: TreatmentSchedule) =>
                    row.dosage ? `${row.dosage} ${row.unit}` : '—',
                },
                {
                  title: 'Interval',
                  dataIndex: 'interval_display',
                  key: 'interval_display',
                  render: (v: string | null) => v || '—',
                },
                {
                  title: 'Start Time',
                  dataIndex: 'start_time',
                  key: 'start_time',
                  render: (v: string | null) => formatDateTime(v),
                },
                {
                  title: 'Active',
                  dataIndex: 'is_active',
                  key: 'is_active',
                  render: (v: boolean | undefined) => (v ? 'Yes' : 'No'),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'center',
                  width: 100,
                  render: (_: unknown, row: TreatmentSchedule) => (
                    <Space>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() =>
                          router.push(`/treatments/schedules/${row.id}?medical_record=${recordId}`)
                        }
                        title="Edit"
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Treatment Schedule',
                            content: 'Are you sure you want to delete this treatment schedule?',
                            okText: 'Yes, Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            onOk: () => deleteTreatmentScheduleMutation.mutate(row.id),
                          });
                        }}
                        loading={deleteTreatmentScheduleMutation.isPending}
                        title="Delete"
                      />
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Follow-Ups</h2>
            <Button type="primary" onClick={() => setIsFollowUpModalOpen(true)}>
              Add Follow-Up
            </Button>
          </Space>
          {(followUpsLoading || createFollowUpMutation.isPending) && <Spin />}
          {!followUpsLoading && followUps.length === 0 && <div>No follow-ups yet.</div>}
          {followUps.length > 0 && (
            <Table
              dataSource={followUps}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Follow-Up Date',
                  dataIndex: 'follow_up_date',
                  key: 'follow_up_date',
                  render: (v: string) => formatDate(v),
                },
                {
                  title: 'Details',
                  dataIndex: 'details',
                  key: 'details',
                  render: (v: string | null) => v || '—',
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'center',
                  width: 100,
                  render: (_: unknown, row: FollowUp) => (
                    <Space>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/medical/follow-ups/${row.id}`)}
                        title="Edit"
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Delete Follow-Up',
                            content: 'Are you sure you want to delete this follow-up?',
                            okText: 'Yes, Delete',
                            okType: 'danger',
                            cancelText: 'Cancel',
                            onOk: () => deleteFollowUpMutation.mutate(row.id),
                          });
                        }}
                        loading={deleteFollowUpMutation.isPending}
                        title="Delete"
                      />
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </Space>

      <Modal
        title="Add Treatment Schedule"
        open={isTreatmentModalOpen}
        onCancel={() => setIsTreatmentModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <p style={{ marginBottom: 16 }}>
          Create a treatment schedule for this medical record in the schedule form.
        </p>
        <Space>
          <Button onClick={() => setIsTreatmentModalOpen(false)}>Cancel</Button>
          <Button
            type="primary"
            onClick={() => {
              const patientId = typeof record?.patient === 'object' ? record?.patient?.id : record?.patient;
              const params = new URLSearchParams();
              if (recordId) params.set('medical_record', recordId);
              if (patientId) params.set('patient', String(patientId));
              setIsTreatmentModalOpen(false);
              router.push(`/treatments/schedules/new?${params.toString()}`);
            }}
          >
            Continue
          </Button>
        </Space>
      </Modal>

      <Modal
        title="Add Health Condition"
        open={isConditionModalOpen}
        onCancel={() => setIsConditionModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={conditionForm}
          layout="vertical"
          onFinish={(values) => createConditionMutation.mutate({
            ...values,
            medical_record: recordId,
          })}
        >
          <Form.Item
            name="type"
            label="Condition Type"
            rules={[{ required: true, message: 'Please enter the condition type' }]}
          >
            <AutoComplete
              options={conditionTypes.map((type) => ({ value: type }))}
              filterOption={(inputValue, option) =>
                (option?.value ?? '').toString().toLowerCase().includes(inputValue.toLowerCase())
              }
            >
              <Input />
            </AutoComplete>
          </Form.Item>
          <Form.Item name="details" label="Details">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_choronic" valuePropName="checked">
            <Checkbox>Chronic</Checkbox>
          </Form.Item>
          <Form.Item name="is_active" valuePropName="checked" initialValue={true}>
            <Checkbox>Active</Checkbox>
          </Form.Item>
          <Space>
            <Button onClick={() => setIsConditionModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createConditionMutation.isPending}>
              Add Health Condition
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Add Test Result"
        open={isTestResultModalOpen}
        onCancel={() => setIsTestResultModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={testResultForm}
          layout="vertical"
          onFinish={(values) => createTestResultMutation.mutate({
            ...values,
            medical_record: recordId,
          })}
        >
          <Form.Item
            name="type"
            label="Test Type"
            rules={[{ required: true, message: 'Please enter the test type' }]}
          >
            <AutoComplete
              options={testResultTypes.map((type) => ({ value: type }))}
              filterOption={(inputValue, option) =>
                (option?.value ?? '').toString().toLowerCase().includes(inputValue.toLowerCase())
              }
            >
              <Input />
            </AutoComplete>
          </Form.Item>
          <Form.Item name="details" label="Details">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="health_condition" label="Related Condition">
            <Select
              placeholder="Select a related condition (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={healthConditions.map((c) => ({ value: c.id, label: c.type }))}
            />
          </Form.Item>
          <Space>
            <Button onClick={() => setIsTestResultModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createTestResultMutation.isPending}>
              Add Test Result
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Add Follow-Up"
        open={isFollowUpModalOpen}
        onCancel={() => setIsFollowUpModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={followUpForm}
          layout="vertical"
          onFinish={(values) => createFollowUpMutation.mutate({
            ...values,
            medical_record: recordId,
          })}
        >
          <Form.Item
            name="follow_up_date"
            label="Follow-Up Date"
            rules={[{ required: true, message: 'Please select a follow-up date' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="details" label="Details">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button onClick={() => setIsFollowUpModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createFollowUpMutation.isPending}>
              Add Follow-Up
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
