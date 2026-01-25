'use client';

import { Card, Descriptions, Spin } from 'antd';
import { APP_VERSION } from '@/utils/version';
import { useRuntimeConfig } from '@/hooks/useRuntimeConfig';

const DebugPage = () => {
  const { config, isLoading } = useRuntimeConfig();
  
  const configs = [
    { label: 'NODE_ENV (build-time)', value: process.env.NODE_ENV || 'unknown' },
    { label: 'DEPLOYMENT_ENV (runtime)', value: config?.deploymentEnv || 'loading...' },
    { label: 'Is Development (runtime)', value: config?.isDevelopment ? 'true' : 'false' },
    { label: 'NEXT_PUBLIC_API_URL (build-time)', value: process.env.NEXT_PUBLIC_API_URL || 'not set' },
    { label: 'API_URL (runtime)', value: config?.apiUrl || 'loading...' },
    { label: 'APP_VERSION', value: APP_VERSION },
  ];

  return (
    <div>
      <h1>Debug</h1>
      <Card>
        {isLoading ? (
          <Spin tip="Loading runtime config..." />
        ) : (
          <Descriptions column={1} size="small">
            {configs.map((item) => (
              <Descriptions.Item key={item.label} label={item.label}>
                {item.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Card>
    </div>
  );
};

export default DebugPage;
