'use client';

import { Card, Space, Button } from 'antd';
import { useRouter } from 'next/navigation';
import { PlusOutlined } from '@ant-design/icons';

export default function MedicalPage() {
  const router = useRouter();

  return (
    <div>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="Medical Records">
          <Space direction="vertical">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/medical/records/new')}>
              Create Medical Record
            </Button>
            <Button onClick={() => router.push('/medical/records')}>View Medical Records</Button>
          </Space>
        </Card>
        <Card title="Diagnoses">
          <Space direction="vertical">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/medical/diagnoses/new')}>
              Create Diagnosis
            </Button>
            <Button onClick={() => router.push('/medical/diagnoses')}>View Diagnoses</Button>
          </Space>
        </Card>
        <Card title="Health Conditions">
          <Space direction="vertical">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/medical/health-conditions/new')}>
              Create Health Condition
            </Button>
            <Button onClick={() => router.push('/medical/health-conditions')}>View Health Conditions</Button>
          </Space>
        </Card>
        <Card title="Test Results">
          <Space direction="vertical">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/medical/test-results/new')}>
              Create Test Result
            </Button>
            <Button onClick={() => router.push('/medical/test-results')}>View Test Results</Button>
          </Space>
        </Card>
        <Card title="Follow-Ups">
          <Space direction="vertical">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/medical/follow-ups/new')}>
              Create Follow-Up
            </Button>
            <Button onClick={() => router.push('/medical/follow-ups')}>View Follow-Ups</Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
