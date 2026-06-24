'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Space,
  Spin,
  Alert,
  Empty,
  Modal,
  Descriptions,
  Input,
  Tooltip,
} from 'antd';
import { PlusOutlined, StopOutlined, EditOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreatmentSchedule } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface PatientGroup {
  id: number;
  name: string;
  schedules: TreatmentSchedule[];
}

const fetchActiveSchedules = async (): Promise<TreatmentSchedule[]> => {
  const response = await fetch(
    `${API_URL}/treatment-schedules/?is_active=true&page_size=500`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : (data.results ?? []);
};

const deactivateSchedule = async (scheduleId: number): Promise<void> => {
  const response = await fetch(`${API_URL}/treatment-schedules/${scheduleId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ is_active: false }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${text}`);
  }
};

const MS_PER_DAY = 86_400_000;

function getConflictingIds(schedules: TreatmentSchedule[]): Set<number> {
  const conflicts = new Set<number>();

  const getRange = (s: TreatmentSchedule): { start: number; end: number } => {
    const start = new Date(s.start_time).getTime();
    const end =
      s.doses != null && s.frequency != null && s.frequency > 0
        ? start + (s.doses / s.frequency) * (s.interval ?? 1) * MS_PER_DAY
        : Infinity;
    return { start, end };
  };

  const byMedicine = new Map<string | number, TreatmentSchedule[]>();
  for (const s of schedules) {
    const key = s.medicine?.id ?? s.medicine_name;
    if (!byMedicine.has(key)) byMedicine.set(key, []);
    byMedicine.get(key)!.push(s);
  }

  for (const group of byMedicine.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = getRange(group[i]);
        const b = getRange(group[j]);
        if (a.start < b.end && b.start < a.end) {
          conflicts.add(group[i].id);
          conflicts.add(group[j].id);
        }
      }
    }
  }

  return conflicts;
}

function ScheduleCards({
  schedules,
  onDeactivate,
  isDeactivating,
  conflictIds,
}: {
  schedules: TreatmentSchedule[];
  onDeactivate: (schedule: TreatmentSchedule) => void;
  isDeactivating: boolean;
  conflictIds: Set<number>;
}) {
  const router = useRouter();

  return (
    <Space direction="vertical" size={8} style={{ width: '100%', padding: '8px 12px' }}>
      {schedules.map((schedule) => {
        const total = schedule.instances_count ?? 0;
        const isConflict = conflictIds.has(schedule.id);
        return (
          <Card
            key={schedule.id}
            size="small"
            styles={{ body: { padding: '8px 10px' } }}
            style={isConflict ? { borderColor: '#faad14' } : undefined}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Space direction="vertical" size={6} style={{ flex: 1, minWidth: 0 }}>
                <Space wrap size={6}>
                  <span style={{ fontWeight: 600 }}>{schedule.medicine_name || 'No medicine'}</span>
                  {isConflict && (
                    <Tooltip title="Duplicate medicine schedule — same medicine is active in an overlapping time range">
                      <WarningOutlined style={{ color: '#faad14' }} />
                    </Tooltip>
                  )}
                  {schedule.dosage && schedule.unit && (
                    <Tag>{schedule.dosage} {schedule.unit}</Tag>
                  )}
                  {schedule.interval_display && (
                    <Tag color={schedule.interval === 1 ? 'blue' : 'cyan'}>{schedule.interval_display}</Tag>
                  )}
                </Space>

                <Descriptions size="small" column={1} colon={false} style={{ fontSize: 12 }}>
                  <Descriptions.Item label={<span style={{ color: '#888' }}>Frequency</span>}>
                    {schedule.frequency != null ? `${schedule.frequency}×/day` : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ color: '#888' }}>Start</span>}>
                    {formatDateTime(schedule.start_time ?? null)}
                  </Descriptions.Item>
                  {total > 0 && (
                    <Descriptions.Item label={<span style={{ color: '#888' }}>Progress</span>}>
                      <Space size={4}>
                        <Tag color="green" title="Completed">{schedule.completed_count ?? 0}</Tag>
                        <Tag color="default" title="Pending">{schedule.pending_count ?? 0}</Tag>
                        <Tag color="red" title="Skipped">{schedule.skipped_count ?? 0}</Tag>
                      </Space>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Space>
              <Space direction="vertical" size={2}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  title="Edit"
                  onClick={() => router.push(`/treatments/schedules/${schedule.id}`)}
                />
                <Button
                  type="text"
                  danger
                  icon={<StopOutlined />}
                  size="small"
                  title="Deactivate"
                  loading={isDeactivating}
                  onClick={() => onDeactivate(schedule)}
                />
              </Space>
            </div>
          </Card>
        );
      })}
    </Space>
  );
}

export default function ActivePatientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ['active_treatment_schedules'],
    queryFn: fetchActiveSchedules,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_treatment_schedules'] });
    },
    onError: (err) => {
      Modal.error({
        title: 'Error deactivating schedule',
        content: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  const patientGroups = useMemo<PatientGroup[]>(() => {
    if (!schedules) return [];
    const map = new Map<number, PatientGroup>();
    for (const schedule of schedules) {
      const patientId =
        typeof schedule.patient === 'object' && schedule.patient !== null
          ? schedule.patient.id
          : typeof schedule.patient === 'number'
            ? schedule.patient
            : null;
      const patientName =
        typeof schedule.patient === 'object' && schedule.patient !== null
          ? (schedule.patient.name ?? schedule.patient_name)
          : schedule.patient_name;
      if (!patientId) continue;
      if (!map.has(patientId)) {
        map.set(patientId, { id: patientId, name: patientName ?? String(patientId), schedules: [] });
      }
      map.get(patientId)!.schedules.push(schedule);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patientGroups;
    return patientGroups.flatMap((group) => {
      const nameMatch = group.name.toLowerCase().includes(q);
      if (nameMatch) return [group];
      const matchingSchedules = group.schedules.filter((s) =>
        (s.medicine_name ?? '').toLowerCase().includes(q)
      );
      if (matchingSchedules.length === 0) return [];
      return [{ ...group, schedules: matchingSchedules }];
    });
  }, [patientGroups, search]);

  const handleDeactivate = (schedule: TreatmentSchedule) => {
    Modal.confirm({
      title: 'Deactivate Schedule',
      content: (
        <div>
          <p>Deactivate this treatment schedule?</p>
          <p><strong>Medicine:</strong> {schedule.medicine_name || 'N/A'}</p>
          <p>The schedule history will be preserved. You can reactivate it later from the schedule detail page.</p>
        </div>
      ),
      okText: 'Deactivate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deactivateMutation.mutate(schedule.id),
    });
  };

  if (isLoading) return <Spin size="large" />;

  if (error) {
    return (
      <Alert
        message="Error loading active treatment schedules"
        description={error instanceof Error ? error.message : 'Unknown error'}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Active Treatment Schedules</h1>
        <p style={{ color: '#888', marginTop: 4 }}>
          {patientGroups.length} patient{patientGroups.length !== 1 ? 's' : ''} with active schedules
        </p>
        <Input
          placeholder="Search by patient or medicine name"
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 400, marginTop: 12 }}
        />
      </div>

      {filteredGroups.length === 0 ? (
        <Empty description={search ? 'No results match your search' : 'No patients with active treatment schedules'} />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredGroups.map((group) => (
            <Col key={group.id} xs={24} sm={12} xl={6}>
              <Card
                title={
                  <Space>
                    <Link href={`/patients/${group.id}`} style={{ color: 'inherit', fontWeight: 600 }}>
                      {group.name}
                    </Link>
                    <Tag color="blue">{group.schedules.length} active</Tag>
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => router.push(`/treatments/schedules/new?patient=${group.id}`)}
                  >
                    Add Schedule
                  </Button>
                }
              >
                <ScheduleCards
                  schedules={group.schedules}
                  onDeactivate={handleDeactivate}
                  isDeactivating={deactivateMutation.isPending}
                  conflictIds={getConflictingIds(group.schedules)}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
