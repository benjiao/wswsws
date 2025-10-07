'use client';
import { Card, Statistic, Space, Typography, Alert, Spin, Row, Col } from 'antd';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';


const fetchMedicineAdherence = async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/treatment-instances/medicine_adherence/${params.toString() ? `?${params.toString()}` : ''}`;
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

export default function MedicineAdherenceCard() {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1)
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
  
    const { data: medicineAdherenceData, isLoading, error } = useQuery({
        queryKey: ['medicine_adherence', formattedStartDate, formattedEndDate],
        queryFn: () => fetchMedicineAdherence(formattedStartDate, formattedEndDate),
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

    const yesterdayDate = new Date(formattedEndDate);
    yesterdayDate.setDate(yesterdayDate.getDate());
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const dayBeforeYesterdayDate = new Date(formattedEndDate);
    dayBeforeYesterdayDate.setDate(dayBeforeYesterdayDate.getDate() - 1);
    const dayBeforeYesterday = dayBeforeYesterdayDate.toISOString().split('T')[0];

    const adherenceYesterday = medicineAdherenceData.daily_adherence[yesterday]?.adherence ?? 0;
    const adherenceDayBeforeYesterday = medicineAdherenceData.daily_adherence[dayBeforeYesterday]?.adherence ?? 0;
    const adherenceYesterdayIncreased = adherenceYesterday > adherenceDayBeforeYesterday;

    return (
        <Card title="Medicine Adherence">
            <Row>
                <Col span={12}>
                    <Statistic
                        title="Yesterday"
                        precision={0}
                        valueStyle={{ color: adherenceYesterdayIncreased ? '#3f8600' : 'black' }}
                        value={medicineAdherenceData?.daily_adherence ? medicineAdherenceData.daily_adherence[yesterday].adherence : 0}
                        suffix="%"
                    />
                </Col>
                <Col span={12}>
                <Statistic
                    title="Last 7 days"
                    precision={0}
                    value={medicineAdherenceData?.adherence}
                    suffix="%"
                />
                </Col>
            </Row>
        </Card>
    );
}