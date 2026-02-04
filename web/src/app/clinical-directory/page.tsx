'use client';

import { Card, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

export default function ClinicalDirectoryPage() {
  const router = useRouter();

  return (
    <div>
      <h1>Clinical Directory</h1>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title="Clinics"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/clinical-directory/clinics/new')}
              >
                Add Clinic
              </Button>
              <Button onClick={() => router.push('/clinical-directory/clinics')}>
                View All
              </Button>
            </Space>
          }
        >
          <p>Manage clinics and their contact information.</p>
        </Card>

        <Card
          title="Veterinarians"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/clinical-directory/veterinarians/new')}
              >
                Add Veterinarian
              </Button>
              <Button onClick={() => router.push('/clinical-directory/veterinarians')}>
                View All
              </Button>
            </Space>
          }
        >
          <p>Manage veterinarians and their associated clinics.</p>
        </Card>
      </Space>
    </div>
  );
}
