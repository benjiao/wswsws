'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, InputNumber, Switch, Button, Space, Spin, Alert, Card } from 'antd';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createVaccineType = async (values: any) => {
  const payload = {
    name: values.name,
    species: values.species || 'cat',
    schedule_mode: values.schedule_mode || 'interval',
    interval_days: values.interval_days || null,
    grace_days: values.grace_days || 0,
    series_doses: values.series_doses || null,
    series_min_age_days: values.series_min_age_days || null,
    series_gap_days: values.series_gap_days || null,
    booster_interval_days: values.booster_interval_days || null,
    is_required: values.is_required !== undefined ? values.is_required : true,
    notes: values.notes || null,
  };

  const response = await fetch(`${API_URL}/vaccine-types/`, {
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

export default function NewVaccineTypePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: createVaccineType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine_types'] });
      router.push('/vaccinations/vaccine-types');
    },
  });

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  return (
    <div>
      <h1>Create Vaccine Type</h1>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            species: 'cat',
            schedule_mode: 'interval',
            grace_days: 0,
            is_required: true,
          }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Vaccine type name (e.g., FVRCP, Rabies, FeLV)" />
          </Form.Item>

          <Form.Item
            name="species"
            label="Species"
            rules={[{ required: true, message: 'Please select a species' }]}
          >
            <Select placeholder="Select species">
              <Select.Option value="cat">Cat</Select.Option>
              <Select.Option value="dog">Dog</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="schedule_mode"
            label="Schedule Mode"
            rules={[{ required: true, message: 'Please select a schedule mode' }]}
          >
            <Select placeholder="Select schedule mode">
              <Select.Option value="interval">Interval</Select.Option>
              <Select.Option value="series">Series</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="interval_days"
            label="Interval Days"
            tooltip="Number of days between doses (e.g., 365 for annual booster)"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Interval in days" />
          </Form.Item>

          <Form.Item
            name="grace_days"
            label="Grace Days"
            tooltip="Allow 'due soon' buffer in days"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Grace days" />
          </Form.Item>

          <Form.Item
            name="series_doses"
            label="Series Doses"
            tooltip="Number of doses in the series (e.g., 3)"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Number of doses" />
          </Form.Item>

          <Form.Item
            name="series_min_age_days"
            label="Series Minimum Age (Days)"
            tooltip="Earliest start age in days"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Minimum age in days" />
          </Form.Item>

          <Form.Item
            name="series_gap_days"
            label="Series Gap Days"
            tooltip="Days between series doses (e.g., 21-28 days)"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Gap between doses" />
          </Form.Item>

          <Form.Item
            name="booster_interval_days"
            label="Booster Interval Days"
            tooltip="Days between boosters after series complete"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Booster interval" />
          </Form.Item>

          <Form.Item
            name="is_required"
            label="Required"
            valuePropName="checked"
          >
            <Switch />
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
                Create Vaccine Type
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-types')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {createMutation.isError && (
          <Alert
            message="Error creating vaccine type"
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

