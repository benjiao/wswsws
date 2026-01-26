'use client';
import { Card, Flex, Progress, Typography, Alert, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getUserLocalDate } from '@/utils/DateUtils';

const fetchTodaysSessions = async () => {
    // Use "today" as the parameter and in_care=true to filter for active schedules and patients in care
    const url = `${process.env.NEXT_PUBLIC_API_URL}/treatment-sessions/by-date/today/?in_care=true`;
    const response = await fetch(url, 
    {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch sessions: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
};

export default function TodaysSessionsCard() {
    const { data: sessions, isLoading, error } = useQuery({
        queryKey: ['todays_sessions'],
        queryFn: fetchTodaysSessions,
    });

    if (isLoading) return (
        <Card title="Today's Sessions">
            <Spin />
        </Card>
    );

    if (error) return (
        <Card title="Today's Sessions">
            <Alert 
                message="Error loading sessions" 
                description={error.message} 
                type="error" 
            />
        </Card>
    );

    return (
        <Card
            title={
                <Flex justify="space-between" align="center">
                    <span>Today's Sessions</span>
                    <Link href="/treatments/sessions/today" style={{ fontSize: 14 }}>
                        View All
                    </Link>
                </Flex>
            }
        >

            {/* Show actual content */}
            {sessions && Array.isArray(sessions) && sessions.length > 0 ? (
                <>
                    {sessions.map((session: any) => (
                        session.instances_count !== 0 && (
                            <div key={session.id} style={{ marginBottom: 16 }}>
                                <Flex justify="space-between" align="center">
                                  <Typography.Text>
                                    {session.session_type_display || 'Session'}
                                  </Typography.Text>
                                  <Typography.Text>
                                    {session.completed_count}/{session.instances_count} completed
                                  </Typography.Text>
                                </Flex>
                                <Progress
                                    percent={session.instances_count > 0 ? Math.round((session.completed_count / session.instances_count) * 100) : 0}
                                    status={session.completed_count === session.instances_count ? 'success' : 'active'}
                                />
                            </div>
                        )
                    ))}
                </>
            ) : (
                <div>No sessions found for today</div>
            )}
        </Card>
    );
}