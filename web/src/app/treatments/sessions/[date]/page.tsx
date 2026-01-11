'use client';
import TreatmentInstanceTable from '@/components/TreatmentInstanceTable';
import PrepList from '@/components/PrepList';
import MedicinePrepTable from '@/components/MedicinePrepTable';

import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Alert, Flex, Progress, Breadcrumb, Select, Space} from 'antd';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { TreatmentSession } from '@/types';

interface PatientGroup {
  id: number;
  name: string;
  description?: string;
}

// Fetch patient groups
const fetchPatientGroups = async (): Promise<PatientGroup[]> => {
  const response = await fetch(`${API_URL}/patient-groups/all/`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Updated API fetcher function to accept date and optional group filter
const fetchTreatmentSessionsByDate = async (date: string, groupId?: number | null): Promise<TreatmentSession[]> => {
  let url = `${API_URL}/treatment-sessions/by-date/${date}/`;
  if (groupId) {
    url += `?group=${groupId}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export default function TreatmentSessionsByDatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { date } = params as { date: string | undefined };
  
  // Initialize selectedGroupId from URL query parameter
  const groupParam = searchParams?.get('group');
  const initialGroupId = groupParam ? parseInt(groupParam, 10) : undefined;
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(initialGroupId);

  // Handle the case where params might be null
  if (!params) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert message="Invalid route parameters" type="error" />
      </div>
    );
  }
  // Validate date parameter
  if (!date) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert message="Date parameter is required" type="error" />
      </div>
    );
  }

  // Handler to update both state and URL when group filter changes
  const handleGroupChange = (value: number | undefined) => {
    setSelectedGroupId(value);
    
    // Update URL query parameter
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value !== undefined) {
      params.set('group', value.toString());
    } else {
      params.delete('group');
    }
    const newSearch = params.toString();
    const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  const { data: patientGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['patient_groups'],
    queryFn: fetchPatientGroups,
  });

  const { 
    data: treatmentSessions, 
    isLoading: treatmentSessionsLoading, 
    error: treatmentSessionsError,
    refetch: refetchTreatmentSessions 
  } = useQuery({
    queryKey: ['treatment_sessions', date, selectedGroupId],
    queryFn: () => fetchTreatmentSessionsByDate(date, selectedGroupId),
  });
  
  // Format date for display
  const formatDateForDisplay = (dateStr: string) => {
    if (dateStr === 'today') return 'Today';
    if (dateStr === 'tomorrow') return 'Tomorrow';
    if (dateStr === 'yesterday') return 'Yesterday';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{formatDateForDisplay(date)}</h1>
        <Select
          placeholder="Filter by Patient Group"
          allowClear
          value={selectedGroupId}
          onChange={handleGroupChange}
          loading={groupsLoading}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          style={{ width: 200 }}
          options={patientGroups?.map((g: PatientGroup) => ({ value: g.id, label: g.name })) || []}
        />
      </Space>

      <Card style={{ marginBottom: 24 }}>
        {treatmentSessions ? (
          (() => {

            const completed = treatmentSessions.reduce(
              (sum, session) => sum + (session.completed_count ?? 0), 0
            );
            const total = treatmentSessions.reduce(
              (sum, session) => sum + (session.instances_count ?? 0), 0
            );

            const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;

            return (
              <>
                <div style={{ marginBottom: 8 }}>
                  <strong>
                    {completed} / {total} treatments completed
                  </strong>
                </div>
                <div>
                    <Flex gap="small" vertical>
                      <Progress percent={percent} />
                    </Flex>
                </div>
              </>
            );
          })()
        ) : (
          <Spin />
        )}
      </Card>

      {treatmentSessions && treatmentSessions.map(session => (
        (session.instances_count ?? 0) > 0 && (
          <div key={session.id} style={{ marginBottom: 24 }}>
            <h3>{session.session_type_display}</h3>

                <div style={{ marginBottom: '1em' }}>
                  <MedicinePrepTable
                  data={session?.prep_list ?? []}
                  loading={treatmentSessionsLoading}
                  error={treatmentSessionsError}
                  refetch={refetchTreatmentSessions}
                  />
                </div>
              <TreatmentInstanceTable 
                data={session?.instances ?? []}
                loading={treatmentSessionsLoading} 
                error={treatmentSessionsError}
                refetch={refetchTreatmentSessions}
              />

          </div>
        )
      ))}
    </>
  );
}