'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Space, Spin, Alert, Card, Button, Tag, Descriptions, Modal, message, Typography } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ScheduleBatch, TreatmentSchedule } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchBatch = async (id: string): Promise<ScheduleBatch> => {
  const response = await fetch(`${API_URL}/treatment-schedule-batches/${id}/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchBatchSchedules = async (batchId: string): Promise<TreatmentSchedule[]> => {
  const response = await fetch(
    `${API_URL}/treatment-schedules/?batch=${batchId}&page_size=200`,
    { headers: { Accept: 'application/json' } },
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.results ?? data;
};

const patchBatchName = async (id: string, name: string): Promise<ScheduleBatch> => {
  const response = await fetch(`${API_URL}/treatment-schedule-batches/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: name.trim() || null }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const deleteSchedule = async (scheduleId: number): Promise<void> => {
  const response = await fetch(`${API_URL}/treatment-schedules/${scheduleId}/`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
};

const deleteBatch = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/treatment-schedule-batches/${id}/`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = typeof params.id === 'string' ? params.id : String(params.id);

  const [pendingDelete, setPendingDelete] = useState<TreatmentSchedule | null>(null);
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const renameMutation = useMutation({
    mutationFn: (name: string) => patchBatchName(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_batch', id] });
      queryClient.invalidateQueries({ queryKey: ['schedule_batches'] });
      message.success('Batch name updated.');
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : 'Failed to update name.');
    },
  });

  const {
    data: batch,
    isLoading: batchLoading,
    isError: batchError,
    error: batchErr,
  } = useQuery({
    queryKey: ['schedule_batch', id],
    queryFn: () => fetchBatch(id),
  });

  const {
    data: schedules,
    isLoading: schedulesLoading,
  } = useQuery({
    queryKey: ['schedule_batch_schedules', id],
    queryFn: () => fetchBatchSchedules(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_batch_schedules', id] });
      queryClient.invalidateQueries({ queryKey: ['schedule_batch', id] });
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
      message.success('Schedule removed.');
      setPendingDelete(null);
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : 'Failed to delete schedule.');
      setPendingDelete(null);
    },
  });

  const handleDeleteBatch = async () => {
    setIsDeletingBatch(true);
    try {
      const toDelete = schedules ?? [];
      await Promise.allSettled(toDelete.map((s) => deleteSchedule(s.id)));
      await deleteBatch(id);
      queryClient.invalidateQueries({ queryKey: ['schedule_batches'] });
      queryClient.invalidateQueries({ queryKey: ['treatment_schedules'] });
      message.success('Batch and all its schedules deleted.');
      router.push('/treatments/batches');
    } catch {
      message.error('Failed to delete batch.');
      setIsDeletingBatch(false);
      setDeleteBatchOpen(false);
    }
  };

  const columns: ColumnsType<TreatmentSchedule> = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_, record) => (
        <Link href={`/patients/${typeof record.patient === 'object' ? record.patient.id : record.patient}`}>
          {record.patient_name}
        </Link>
      ),
    },
    {
      title: 'Medicine',
      key: 'medicine',
      render: (_, record) => {
        if (!record.medicine_name) return <span style={{ color: '#aaa' }}>—</span>;
        const dosage = record.dosage ? ` ${record.dosage}${record.unit}` : '';
        return `${record.medicine_name}${dosage}`;
      },
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (val: string | null) => formatDateTime(val),
    },
    {
      title: 'Status',
      key: 'is_active',
      width: 90,
      render: (_, record) =>
        record.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/treatments/schedules/${record.id}`)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setPendingDelete(record)}
          />
        </Space>
      ),
    },
  ];

  if (batchLoading) return <Spin size="large" />;

  if (batchError) {
    return (
      <Alert
        message="Error loading batch"
        description={batchErr instanceof Error ? batchErr.message : 'Unknown error'}
        type="error"
        showIcon
      />
    );
  }

  const scheduleCount = schedules?.length ?? batch?.schedules_count ?? 0;

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button onClick={() => router.push('/treatments/batches')}>← Back to Batches</Button>
        <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteBatchOpen(true)}>
          Delete Batch
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Typography.Title
          level={2}
          style={{ margin: '0 0 16px 0' }}
          editable={{
            tooltip: 'Click to rename',
            text: batch?.name ?? '',
            onChange: (val) => renameMutation.mutate(val),
          }}
        >
          {batch?.name || `Batch #${id}`}
        </Typography.Title>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Created">{formatDateTime(batch?.created_at ?? '')}</Descriptions.Item>
          <Descriptions.Item label="Schedules">{batch?.schedules_count ?? 0}</Descriptions.Item>
          {batch?.notes && (
            <Descriptions.Item label="Notes" span={2}>{batch.notes}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Schedules in this Batch">
        <Table
          columns={columns}
          dataSource={schedules ?? []}
          rowKey="id"
          loading={schedulesLoading}
          pagination={false}
        />
      </Card>

      {/* Delete single schedule */}
      <Modal
        title="Delete Schedule"
        open={!!pendingDelete}
        onOk={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
        okText="Delete"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
        cancelButtonProps={{ disabled: deleteMutation.isPending }}
      >
        {pendingDelete && (
          <p>
            Delete the schedule for <strong>{pendingDelete.patient_name}</strong>
            {pendingDelete.medicine_name ? ` (${pendingDelete.medicine_name})` : ''}?
            This will also remove all associated treatment instances and cannot be undone.
          </p>
        )}
      </Modal>

      {/* Delete entire batch */}
      <Modal
        title="Delete Batch"
        open={deleteBatchOpen}
        onOk={handleDeleteBatch}
        onCancel={() => setDeleteBatchOpen(false)}
        okText="Delete Batch"
        okButtonProps={{ danger: true, loading: isDeletingBatch }}
        cancelButtonProps={{ disabled: isDeletingBatch }}
      >
        <p>
          Delete <strong>{batch?.name || `Batch #${id}`}</strong> and all{' '}
          <strong>{scheduleCount} schedule{scheduleCount !== 1 ? 's' : ''}</strong> in it?
          This will also remove all associated treatment instances and cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
