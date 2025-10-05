'use client';
import { Card, Flex, Progress, Typography, Alert, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const fetchLowStockMedicines = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/medicines/low_stock/`;
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url, 
    {
      headers: {
        'Accept': 'application/json',
      },
    });
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch sessions: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    return data;
};

export default function InventoryStatusCard() {
    const { data: data, isLoading, error } = useQuery({
        queryKey: ['fetch_low_stock_medicines'],
        queryFn: () => fetchLowStockMedicines(),
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
                    <span>Inventory Status</span>
                    <Link href={`${process.env.NEXT_PUBLIC_API_URL}/admin/inventory/medicine/`} style={{ fontSize: 14 }}>
                        View All
                    </Link>
                </Flex>
            }
        >

            {/* Show actual content */}
            {Array.isArray(data["Out of Stock"]) && data["Out of Stock"].length > 0 && (
                <>
                <Alert
                    type="error"
                    message={`Out of stock`}
                    description={
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {data["Out of Stock"].map(
                                (medicine: { name: string; pending_dosage_required: number; dosage_unit?: string }, idx: number) => (
                                    <li key={idx}>
                                        <div>
                                            <strong>{medicine.name}</strong>
                                        </div>
                                        <div>
                                            Pending Dosage: {medicine.pending_dosage_required}
                                            {medicine.dosage_unit ? ` ${medicine.dosage_unit}` : ''}
                                        </div>
                                    </li>
                                )
                            )}
                        </ul>
                    }
                />
                <div style={{ height: 16 }} />
                </>
            )}
            {Array.isArray(data["Low Stock"]) && data["Low Stock"].length > 0 && (
                <>
                    <Alert
                        type="warning"
                        message={`Low in stock`}
                        description={
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {data["Low Stock"].map(
                                    (medicine: { name: string; pending_dosage_required: number; dosage_unit?: string }, idx: number) => (
                                        <li key={idx}>
                                            <div>
                                                <strong>{medicine.name}</strong>
                                            </div>
                                            <div>
                                                Pending Dosage: {medicine.pending_dosage_required}
                                                {medicine.dosage_unit ? ` ${medicine.dosage_unit}` : ''}
                                            </div>
                                        </li>
                                    )
                                )}
                            </ul>
                        }
                    />
                    <div style={{ height: 16 }} />
                </>
            )}

            {(!data["Low Stock"] || data["Low Stock"].length === 0) && (!data["Out of Stock"] || data["Out of Stock"].length === 0) && (
                <Alert
                    type="success"
                    message="All medicines are sufficiently stocked."
                    showIcon
                />
            )}

        </Card>
    );
}