'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Button, Space, Spin, Card, Switch, message, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Patient {
  id: number;
  name: string;
  group_id: number | null;
  group_name: string | null;
}

interface PatientGroup {
  id: number;
  name: string;
}

interface Medicine {
  id: number;
  name: string;
}

const fetchPatients = async (): Promise<Patient[]> => {
  const response = await fetch(`${API_URL}/patients/all/?status__is_in_care=true`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchPatientGroups = async (): Promise<PatientGroup[]> => {
  const response = await fetch(`${API_URL}/patient-groups/all/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchMedicines = async (): Promise<Medicine[]> => {
  const response = await fetch(`${API_URL}/medicines/all/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const createScheduleBatch = async (name: string | null, notes: string | null) => {
  const response = await fetch(`${API_URL}/treatment-schedule-batches/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: name || null, notes: notes || null }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json() as Promise<{ id: number }>;
};

const createTreatmentSchedule = async (values: Record<string, unknown>, patientId: number, batchId: number) => {
  let start_time = null;
  if (values.start_time) {
    const date = new Date(values.start_time as string);
    if (!isNaN(date.getTime())) {
      start_time = date.toISOString();
    }
  }

  const payload = {
    patient: patientId,
    medicine: values.medicine || null,
    start_time,
    frequency: values.frequency || null,
    doses: values.doses || null,
    interval: values.interval || null,
    dosage: values.dosage ? String(values.dosage) : null,
    unit: values.unit || 'mL',
    notes: values.notes || null,
    is_active: values.is_active !== undefined ? values.is_active : true,
    batch: batchId,
  };

  const response = await fetch(`${API_URL}/treatment-schedules/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  return response.json();
};

const getDefaultStartTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T18:00`;
};

export default function BatchNewSchedulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const { data: patientGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['patient_groups'],
    queryFn: fetchPatientGroups,
  });

  const { data: medicines, isLoading: medicinesLoading } = useQuery({
    queryKey: ['medicines'],
    queryFn: fetchMedicines,
  });

  const patientSelectOptions = useMemo(() => {
    if (!patients) return [];
    return patients.map((p) => ({
      value: p.id,
      label: p.group_name ? `${p.name} (${p.group_name})` : p.name,
    }));
  }, [patients]);

  const handleGroupChange = (groupIds: number[]) => {
    setSelectedGroupIds(groupIds);
    if (groupIds.length === 0) {
      setSelectedPatientIds([]);
    } else {
      const groupSet = new Set(groupIds);
      const ids = (patients ?? [])
        .filter((p) => p.group_id !== null && groupSet.has(p.group_id))
        .map((p) => p.id);
      setSelectedPatientIds(ids);
    }
  };

  const onFinish = async (values: Record<string, unknown>) => {
    if (selectedPatientIds.length === 0) {
      message.error('Please select at least one patient.');
      return;
    }

    setIsSubmitting(true);

    let batchId: number;
    try {
      const batch = await createScheduleBatch(
        values.batch_name as string | null,
        null,
      );
      batchId = batch.id;
    } catch (err) {
      message.error('Failed to create batch record.');
      setIsSubmitting(false);
      return;
    }

    setSubmitProgress({ done: 0, total: selectedPatientIds.length });

    const results = await Promise.allSettled(
      selectedPatientIds.map(async (patientId) => {
        const result = await createTreatmentSchedule(values, patientId, batchId);
        setSubmitProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : null);
        return result;
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    setIsSubmitting(false);
    setSubmitProgress(null);

    queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
    queryClient.invalidateQueries({ queryKey: ['schedule_batches'] });

    if (failed === 0) {
      message.success(`${succeeded} schedule${succeeded !== 1 ? 's' : ''} created successfully.`);
    } else {
      message.warning(`${succeeded} succeeded, ${failed} failed.`);
    }

    router.push(`/treatments/batches/${batchId}`);
  };

  if (patientsLoading || groupsLoading || medicinesLoading) {
    return <Spin size="large" />;
  }

  const submitLabel = submitProgress
    ? `Creating schedules… (${submitProgress.done}/${submitProgress.total})`
    : `Create Schedules for ${selectedPatientIds.length} Patient${selectedPatientIds.length !== 1 ? 's' : ''}`;

  return (
    <div>
      <div style={{ maxWidth: 720 }}>
        <Card>
          <h1 style={{ margin: '0 0 24px 0' }}>Batch Create Treatment Schedules</h1>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ unit: 'mL', start_time: getDefaultStartTime(), is_active: true }}
          >
            <Form.Item name="batch_name" label="Batch Name">
              <Input placeholder="Optional name for this batch (e.g. Post-surgery round)" />
            </Form.Item>

            {/* ── Patient selection ── */}
            <Card
              size="small"
              style={{ marginBottom: 24, background: '#fafafa' }}
              title="Patient Selection"
            >
              <Form.Item label="Filter by Group">
                <Select
                  mode="multiple"
                  placeholder="Select one or more groups to pre-populate patients"
                  allowClear
                  showSearch
                  value={selectedGroupIds}
                  onChange={handleGroupChange}
                  filterOption={(input, option) =>
                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={(patientGroups ?? []).map((g) => ({ value: g.id, label: g.name }))}
                  maxTagCount="responsive"
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>Patients</span>
                    {selectedPatientIds.length > 0 && (
                      <Tag color="blue">{selectedPatientIds.length} selected</Tag>
                    )}
                  </Space>
                }
                required
              >
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder="Select one or more patients"
                  value={selectedPatientIds}
                  onChange={setSelectedPatientIds}
                  filterOption={(input, option) =>
                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={patientSelectOptions}
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                />
              </Form.Item>
            </Card>

            {/* ── Schedule fields ── */}
            <Form.Item name="medicine" label="Medicine">
              <Select
                placeholder="Select a medicine (optional)"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={(medicines ?? []).map((m) => ({ value: m.id, label: m.name }))}
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

            <Form.Item name="interval" label="Interval">
              <Select placeholder="Select interval" allowClear>
                <Select.Option value={1}>DAILY</Select.Option>
                <Select.Option value={2}>EVERY OTHER DAY</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="dosage" label="Dosage">
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Dosage" />
            </Form.Item>

            <Form.Item name="unit" label="Unit">
              <Input placeholder="Unit (e.g., mL)" />
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={4} placeholder="Additional notes" />
            </Form.Item>

            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={selectedPatientIds.length === 0}
                >
                  {submitLabel}
                </Button>
                <Button onClick={() => router.push('/treatments/schedules')}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
