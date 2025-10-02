'use client';
import TreatmentInstanceTable from '@/components/TreatmentInstanceTable';
import PrepList from '@/components/PrepList';

import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Alert, Flex, Progress, Breadcrumb} from 'antd';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { TreatmentSession } from '@/types';

// Updated API fetcher function to accept date
const fetchTreatmentSessionsByDate = async (date: string): Promise<TreatmentSession[]> => {
  const response = await fetch(
    `${API_URL}/treatment-sessions/by-date/${date}/`, 
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export default function TreatmentSessionsByDatePage() {
  const params = useParams();
  const { date } = params as { date: string | undefined };

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

  const { 
    data: treatmentSessions, 
    isLoading: treatmentSessionsLoading, 
    error: treatmentSessionsError,
    refetch: refetchTreatmentSessions 
  } = useQuery({
    queryKey: ['treatment_sessions', date, 1],
    queryFn: () => fetchTreatmentSessionsByDate(date),
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
      <h1>{formatDateForDisplay(date)}</h1>

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
                <PrepList
                  data={session?.prep_list ?? []}
                  loading={treatmentSessionsLoading}
                  error={treatmentSessionsError} />
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