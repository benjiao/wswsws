'use client';

import { Card, Statistic, Alert, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';

const fetchVaccinationCoverage = async () => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/vaccine-doses/coverage/`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch vaccination coverage: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export default function VaccinationCoverageCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vaccination_coverage'],
    queryFn: fetchVaccinationCoverage,
  });

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Error loading vaccination coverage"
          description={error instanceof Error ? error.message : 'Unknown error'}
          type="error"
        />
      </Card>
    );
  }

  return (
    <Card>
      <Statistic
        title="Vaccination Coverage"
        value={data?.percentage ?? 0}
        precision={2}
        valueStyle={{ color: '#3f8600' }}
        suffix="%"
      />
    </Card>
  );
}
