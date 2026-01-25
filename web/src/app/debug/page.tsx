'use client';

import { Card, Descriptions, Spin } from 'antd';
import { APP_VERSION } from '@/utils/version';
import { env } from 'next-runtime-env';

const DebugPage = () => {
  const NEXT_PUBLIC_DEPLOYMENT_ENV = env('NEXT_PUBLIC_DEPLOYMENT_ENV');
  const configs = [
    { label: 'NODE_ENV (build-time)', value: process.env.NODE_ENV || 'unknown' },
    { label: 'NEXT_PUBLIC_API_URL (build-time)', value: process.env.NEXT_PUBLIC_API_URL || 'not set' },
    { label: 'APP_VERSION', value: APP_VERSION },
    { label: 'NEXT_PUBLIC_DEPLOYMENT_ENV (runtime)', value: NEXT_PUBLIC_DEPLOYMENT_ENV || 'unknown' },
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
