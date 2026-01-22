'use client';
import { Card, Statistic, Alert, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';

const fetchSpayNeuterStats = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/patients/spay_neuter_stats/`;
    const response = await fetch(url, 
    {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch spay/neuter stats: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
};

export default function SpayNeuterStatusCard() {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['spay_neuter_stats'],
        queryFn: fetchSpayNeuterStats,
    });

    if (isLoading) return (
        <Card>
            <Spin />
        </Card>
    );

    if (error) return (
        <Card>
            <Alert 
                message="Error loading spay/neuter status" 
                description={error.message} 
                type="error" 
            />
        </Card>
    );

    return (
        <Card>
            <Statistic
                title="Spay/Neuter Status"
                value={stats?.percentage ?? 0}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
                suffix="%"
            />
        </Card>
    );
}
