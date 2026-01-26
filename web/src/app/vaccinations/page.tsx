'use client';

import { Card, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VaccinationsPage() {
  const router = useRouter();

  return (
    <div>
      <h1>Vaccinations</h1>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title="Vaccine Types"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/vaccinations/vaccine-types/new')}
              >
                Create New Vaccine Type
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-types')}>
                View All
              </Button>
            </Space>
          }
        >
          <p>Manage vaccine types and their scheduling configurations.</p>
        </Card>

        <Card
          title="Vaccine Doses"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/vaccinations/vaccine-doses/new')}
              >
                Record New Dose
              </Button>
              <Button onClick={() => router.push('/vaccinations/vaccine-doses')}>
                View All
              </Button>
            </Space>
          }
        >
          <p>View and manage recorded vaccine doses for patients.</p>
        </Card>
      </Space>
    </div>
  );
}

