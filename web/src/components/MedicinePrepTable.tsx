'use client';

import { Spin, Alert, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { PrepListItem } from '@/types';


const API_URL = process.env.NEXT_PUBLIC_API_URL;

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'Not scheduled';
  
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  let dateLabel = '';
  if (isToday) {
    dateLabel = 'Today';
  } else if (isTomorrow) {
    dateLabel = 'Tomorrow';
  } else {
    dateLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
  
  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${dateLabel} at ${timeLabel}`;
};

interface MedicinePrepTableProps {
  data: PrepListItem[] | undefined;
  loading: boolean;
  error: any;
  refetch: () => void;
}

export default function MedicinePrepTable({ data, loading, error, refetch }: MedicinePrepTableProps) {

    const columns: TableProps<PrepListItem>['columns'] = [
        {
            title: 'Medicine',
            key: 'medicine',
            width: 220,
            render: (_: any, record: PrepListItem) => (
                <span>
                    {record.medicine_name}
                    {record.dosage && record.unit ? ` ${record.dosage} ${record.unit}` : ''}
                </span>
            ),
        },
        {
            title: 'Pending',
            dataIndex: 'pending_count',
            key: 'pending_count',
            width: 90,
            render: (pending_count: number) => <span>{pending_count}</span>,
        },
        {
            title: 'Given',
            dataIndex: 'given_count',
            key: 'given_count',
            width: 90,
            render: (given_count: number) => <span>{given_count}</span>,
        },
        {
            title: 'Skipped',
            dataIndex: 'skipped_count',
            key: 'skipped_count',
            width: 90,
            render: (skipped_count: number) => <span>{skipped_count}</span>,
        }
    ];

    if (loading) return <Spin size="small" />;

    if (error) return (
        <Alert 
            message="Error loading treatments" 
            description={error.message} 
            type="error"
            showIcon
        />
    );

    return (
        <Table<PrepListItem>
            dataSource={data || []}
            rowKey={(record) => `${record.medicine_id}-${record.dosage ?? ''}-${record.unit ?? ''}`}
            pagination={false}
            size="small" 
            bordered
            style={{ marginBottom: '20px' }}
            columns={columns}
        >
        </Table>
    );
}