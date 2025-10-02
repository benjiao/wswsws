'use client';
import TreatmentInstanceTable from '@/components/TreatmentInstanceTable';
import PrepList from '@/components/PrepList';

import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Alert, Flex, Progress, Breadcrumb} from 'antd';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { TreatmentSession } from '@/types';

// Updated API fetcher function to accept date
const fetchTreatmentSession = async (date: string, sessionType: number): Promise<TreatmentSession> => {
  const response = await fetch(
    `${API_URL}/treatment-sessions/${date}/${sessionType}/`, 
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

export default function TreatmentSessionPage() {
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

  // Fetch morning sessions with date parameter
  const { 
    data: morningSession, 
    isLoading: morningLoading, 
    error: morningError,
    refetch: refetchMorning 
  } = useQuery({
    queryKey: ['treatment_sessions', date, 1],
    queryFn: () => fetchTreatmentSession(date, 1),
  });

  // Fetch evening sessions with date parameter
  const { 
    data: eveningSession, 
    isLoading: eveningLoading, 
    error: eveningError,
    refetch: refetchEvening
  } = useQuery({
    queryKey: ['treatment_sessions', date, 4],
    queryFn: () => fetchTreatmentSession(date, 4),
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
      <div style={{ padding: '20px' }}>
        <Breadcrumb items={[
          {
            title: <a href="/"><span role="img" aria-label="home">🏠</span></a>,
          },
          {
            title: <a href="/treatments">Treatments</a>,
          },
          {
            title: "Today's session",
          },
        ]} />

        <h1>{formatDateForDisplay(date)}</h1>

        <Card style={{ marginBottom: 24 }}>
          {morningSession && eveningSession ? (
            (() => {
              const allInstances = [
                ...(morningSession.instances || []),
                ...(eveningSession.instances || [])
              ];
              const total = allInstances.length;
              const completed = allInstances.filter(i => i.status === 2 || i.status === 3).length;
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

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

        <h3>Morning</h3>

        <div style={{ marginBottom: '1em' }}>
          <PrepList
            data={morningSession?.prep_list ?? []}
            loading={morningLoading}
            error={morningError} />
        </div>

        <TreatmentInstanceTable 
          data={morningSession?.instances ?? []}
          loading={morningLoading} 
          error={morningError}
          refetch={refetchMorning}
        />

        <h3>Evening</h3>
        <div style={{ marginBottom: 16 }}>
          <PrepList
            data={eveningSession?.prep_list ?? []}
            loading={eveningLoading}
            error={eveningError} />
        </div>
        <TreatmentInstanceTable 
          data={eveningSession?.instances ?? []} 
          loading={eveningLoading} 
          error={eveningError} 
          refetch={refetchEvening}
        />
      </div>
    </>
  );
}