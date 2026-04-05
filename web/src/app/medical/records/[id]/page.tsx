'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Space, Spin, Alert, Card, Tabs, message, Checkbox, Table, AutoComplete } from 'antd';
import { useRouter, useParams } from 'next/navigation';

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
  record_datetime: string;
  patient: number | { id: number; name: string };
  patient_name?: string;
  veterinarian: number | null;
  clinic: number | null;
  details: string;
}

interface Diagnosis {
  id: number;
  medical_record: number;
  type: string;
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
  follow_up_datetime: string;
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

const fetchMedicalRecord = async (id: string): Promise<MedicalRecord> => {
  const response = await fetch(`${API_URL}/medical-records/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchDiagnoses = async (recordId: string): Promise<Diagnosis[]> => {
  const response = await fetch(`${API_URL}/diagnoses/?medical_record=${recordId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const fetchDiagnosisTypes = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/diagnoses/?page_size=200`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  const results = data.results ?? data;
  const types = Array.isArray(results) ? results.map((d: Diagnosis) => d.type).filter(Boolean) : [];
  return Array.from(new Set(types)).sort();
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
  const types = Array.isArray(results) ? results.map((c: HealthCondition) => c.type).filter(Boolean) : [];
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
  const types = Array.isArray(results) ? results.map((t: TestResult) => t.type).filter(Boolean) : [];
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

const createDiagnosis = async (values: any) => {
  const response = await fetch(`${API_URL}/diagnoses/`, {
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
  const [diagnosisForm] = Form.useForm();
  const [conditionForm] = Form.useForm();
  const [testResultForm] = Form.useForm();
  const [followUpForm] = Form.useForm();

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

  const { data: diagnoses = [], isLoading: diagnosesLoading } = useQuery({
    queryKey: ['diagnoses', recordId],
    queryFn: () => fetchDiagnoses(recordId!),
    enabled: !!recordId,
  });

  const { data: diagnosisTypes = [] } = useQuery({
    queryKey: ['diagnosis_types'],
    queryFn: fetchDiagnosisTypes,
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

  const createDiagnosisMutation = useMutation({
    mutationFn: createDiagnosis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnoses', recordId] });
      diagnosisForm.resetFields();
      message.success('Diagnosis added');
    },
  });

  const createConditionMutation = useMutation({
    mutationFn: createHealthCondition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health_conditions', recordId] });
      conditionForm.resetFields();
      message.success('Health condition added');
    },
  });

  const createTestResultMutation = useMutation({
    mutationFn: createTestResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_results', recordId] });
      testResultForm.resetFields();
      message.success('Test result added');
    },
  });

  const createFollowUpMutation = useMutation({
    mutationFn: createFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups', recordId] });
      followUpForm.resetFields();
      message.success('Follow-up added');
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
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Medical Record</h1>
        <Button onClick={() => router.push('/medical/records')}>Back to Medical Records</Button>
      </Space>
      <Card style={{ marginBottom: 16 }}>
        <Form
          form={recordForm}
          layout="vertical"
          initialValues={{
            patient: typeof record?.patient === 'object' ? record?.patient?.id : record?.patient,
            record_datetime: record?.record_datetime,
            clinic: record?.clinic ?? undefined,
            veterinarian: record?.veterinarian ?? undefined,
            details: record?.details,
            notes: record?.notes,
          }}
          onFinish={(values) => updateMutation.mutate(values)}
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
            name="record_datetime"
            label="Record Date/Time"
            rules={[{ required: true, message: 'Please select the date/time' }]}
            getValueFromEvent={(e) => (e?.target?.value ? `${e.target.value}:00Z` : undefined)}
            getValueProps={(value) => ({
              value: value ? String(value).replace('Z', '').slice(0, 16) : undefined,
            })}
          >
            <Input type="datetime-local" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="clinic" label="Clinic">
            <Select
              placeholder="Select a clinic (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={clinics?.map((c: Clinic) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <Form.Item name="veterinarian" label="Veterinarian">
            <Select
              placeholder="Select a veterinarian (optional)"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={veterinarians?.map((v: Veterinarian) => ({ value: v.id, label: v.name }))}
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

          <Space>
            <Button htmlType="button" onClick={() => router.push('/medical/records')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Save
            </Button>
          </Space>
        </Form>
      </Card>

      <Tabs
        items={[
          {
            key: 'treatments',
            label: 'Treatments',
            children: (
              <Card>
                <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div />
                  <Button
                    type="primary"
                    onClick={() => {
                      const patientId = typeof record?.patient === 'object' ? record?.patient?.id : record?.patient;
                      const params = new URLSearchParams();
                      if (recordId) params.set('medical_record', recordId);
                      if (patientId) params.set('patient', String(patientId));
                      router.push(`/treatments/schedules/new?${params.toString()}`);
                    }}
                  >
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
                        render: (_: unknown, row: TreatmentSchedule) => (
                          <Button type="link" onClick={() => router.push(`/treatments/schedules/${row.id}`)}>
                            View
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'diagnoses',
            label: 'Diagnoses',
            children: (
              <Card>
                <Form
                  form={diagnosisForm}
                  layout="vertical"
                  onFinish={(values) => createDiagnosisMutation.mutate({
                    ...values,
                    medical_record: recordId,
                  })}
                >
                  <Form.Item
                    name="type"
                    label="Diagnosis Type"
                    rules={[{ required: true, message: 'Please enter the diagnosis type' }]}
                  >
                    <AutoComplete
                      options={diagnosisTypes.map((type) => ({ value: type }))}
                      filterOption={(inputValue, option) =>
                        (option?.value ?? '').toString().toLowerCase().includes(inputValue.toLowerCase())
                      }
                    >
                      <Input />
                    </AutoComplete>
                  </Form.Item>
                  <Form.Item
                    name="details"
                    label="Details"
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={createDiagnosisMutation.isPending}>
                      Add Diagnosis
                    </Button>
                  </Space>
                </Form>
                <div style={{ marginTop: 16 }}>
                  {(diagnosesLoading || createDiagnosisMutation.isPending) && <Spin />}
                  {!diagnosesLoading && diagnoses.length === 0 && <div>No diagnoses yet.</div>}
                  {diagnoses.length > 0 && (
                    <Table
                      dataSource={diagnoses}
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
                      ]}
                    />
                  )}
                </div>
              </Card>
            ),
          },
          {
            key: 'conditions',
            label: 'Health Conditions',
            children: (
              <Card>
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
                  <Form.Item
                    name="details"
                    label="Details"
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item name="is_choronic" valuePropName="checked">
                    <Checkbox>Chronic</Checkbox>
                  </Form.Item>
                  <Form.Item name="is_active" valuePropName="checked" initialValue={true}>
                    <Checkbox>Active</Checkbox>
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={createConditionMutation.isPending}>
                      Add Health Condition
                    </Button>
                  </Space>
                </Form>
                <div style={{ marginTop: 16 }}>
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
                      ]}
                    />
                  )}
                </div>
              </Card>
            ),
          },
          {
            key: 'tests',
            label: 'Test Results',
            children: (
              <Card>
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
                  <Form.Item
                    name="details"
                    label="Details"
                  >
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
                    <Button type="primary" htmlType="submit" loading={createTestResultMutation.isPending}>
                      Add Test Result
                    </Button>
                  </Space>
                </Form>
                <div style={{ marginTop: 16 }}>
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
                      ]}
                    />
                  )}
                </div>
              </Card>
            ),
          },
          {
            key: 'followups',
            label: 'Follow-Ups',
            children: (
              <Card>
                <Form
                  form={followUpForm}
                  layout="vertical"
                  onFinish={(values) => createFollowUpMutation.mutate({
                    ...values,
                    medical_record: recordId,
                  })}
                >
                  <Form.Item
                    name="follow_up_datetime"
                    label="Follow-Up Date/Time"
                    rules={[{ required: true, message: 'Please select a follow-up date/time' }]}
                    getValueFromEvent={(e) => (e?.target?.value ? `${e.target.value}:00Z` : undefined)}
                    getValueProps={(value) => ({
                      value: value ? String(value).replace('Z', '').slice(0, 16) : undefined,
                    })}
                  >
                    <Input type="datetime-local" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="details"
                    label="Details"
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={createFollowUpMutation.isPending}>
                      Add Follow-Up
                    </Button>
                  </Space>
                </Form>
                <div style={{ marginTop: 16 }}>
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
                          dataIndex: 'follow_up_datetime',
                          key: 'follow_up_datetime',
                          render: (v: string) => new Date(v).toLocaleString(),
                        },
                        {
                          title: 'Details',
                          dataIndex: 'details',
                          key: 'details',
                          render: (v: string | null) => v || '—',
                        },
                      ]}
                    />
                  )}
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
