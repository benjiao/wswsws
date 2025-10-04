'use client';

import { Spin, Alert, List, Tag } from 'antd';
import type { TableProps } from 'antd';
import { PrepListItem } from '@/types';


const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PrepList({ data, loading, error }: { data: PrepListItem[] | undefined; loading: boolean; error: any; }) {
    // if (loading) return <Spin size="small" />;

    if (error) return (
        <Alert 
            message="Error loading treatments" 
            description={error.message} 
            type="error"
            showIcon
        />
    );

    return (
        <List
            itemLayout="horizontal"
            dataSource={data}
            size="small"
            bordered
            renderItem={item => (
                <List.Item>
                    {item.medicine_name} - {item.dosage} {item.unit} x {item.count}
                </List.Item>
            )}
        />
    );
}