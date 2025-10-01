'use client';
import TreatmentTable from '@/components/TreatmentTable';

import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Alert, Table, Tag } from 'antd';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { TreatmentInstance, TreatmentSession } from '@/types';

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
  const date = typeof params.date === 'string' ? params.date : Array.isArray(params.date) ? params.date[0] : null;

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
    <div style={{ padding: '20px' }}>
      <h1>{formatDateForDisplay(date)}</h1>

      <Card style={{ marginBottom: 24 }}>
        {morningSession && eveningSession ? (
          (() => {
            const allInstances = [
              ...(morningSession.instances || []),
              ...(eveningSession.instances || [])
            ];
            const total = allInstances.length;
            const completed = allInstances.filter(i => i.status === 2).length;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

            return (
              <>
                <div style={{ marginBottom: 8 }}>
                  <strong>
                    {completed} / {total} treatments completed
                  </strong>
                </div>
                <div>
                  <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: 4 }}>
                      <span>Progress</span>
                    </div>
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          background: '#f0f0f0',
                          borderRadius: 4,
                          height: 16,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            background: '#52c41a',
                            width: `${percent}%`,
                            height: '100%',
                            transition: 'width 0.3s',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            transform: 'translateX(-50%)',
                            fontSize: 12,
                            color: '#222',
                          }}
                        >
                          {percent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <Spin />
        )}
      </Card>

      <h3>Morning</h3>
      <TreatmentTable 
        data={morningSession} 
        loading={morningLoading} 
        error={morningError}
        refetch={refetchMorning}
      />

      <h3>Evening</h3>
      <TreatmentTable 
        data={eveningSession} 
        loading={eveningLoading} 
        error={eveningError} 
        refetch={refetchEvening}
      />
    </div>
  );
}