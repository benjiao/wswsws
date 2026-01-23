'use client';

import { Card, Descriptions } from 'antd';
import { APP_VERSION } from '@/utils/version';

const DebugPage = () => {
  const configs = [
    { label: 'NODE_ENV', value: process.env.NODE_ENV || 'unknown' },
    { label: 'NEXT_PUBLIC_API_URL', value: process.env.NEXT_PUBLIC_API_URL || 'not set' },
    { label: 'APP_VERSION', value: APP_VERSION },
  ];

  return (
    <div>
      <h1>Debug</h1>
      <Card>
        <Descriptions column={1} size="small">
          {configs.map((item) => (
            <Descriptions.Item key={item.label} label={item.label}>
              {item.value}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    </div>
  );
};

export default DebugPage;
