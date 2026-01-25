'use client';
import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { getUserLocalDate } from '../utils/DateUtils';
import { useQuery } from '@tanstack/react-query';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type MedicineData = {
  date: string;
  actualData: boolean;
  [medicineName: string]: string | number | boolean;
};

type MedicineDosageTimelineProps = {
  loading?: boolean;
  error?: any;
  refetch?: () => void;
};

// Updated API fetcher function to accept date
const fetchMedicineDailyDosageStats = async (start_date:string , end_date:string) => {
  const response = await fetch(
    `${API_URL}/medicines/all_medicines_daily_stats/?start_date=${start_date}&end_date=${end_date}`, 
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

const MedicineDosageTimeline: React.FC<MedicineDosageTimelineProps> = ({
  loading,
  error,
  refetch,
}) => {

  const today = getUserLocalDate();
  // Get local time as a string
  const localTimeString = today.toLocaleString();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

  // Calculate start and end date for the query (last 30 days)
  const start_date = new Date(new Date(today).getTime() - oneMonthMs).toISOString().slice(0, 10); // YYYY-MM-DD
  const end_date = new Date(new Date(today).getTime() + 2 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 2 months from today in YYYY-MM-DD format
  
  const { 
    data: treatmentSessions, 
    isLoading: treatmentSessionsLoading, 
    error: treatmentSessionsError,
    refetch: refetchTreatmentSessions 
  } = useQuery({
    queryKey: ['all_medicines_daily_stats', start_date, end_date],
    queryFn: () => fetchMedicineDailyDosageStats(start_date, end_date),
  });

  type DailyDosage = {
    date: string;
    actualData: boolean;
    [medicineName: string]: number | string | boolean;
  };

  let dailyDosageList: DailyDosage[] = [];
  let colorMap: { [medicineName: string]: string } = {};

  if (treatmentSessions && treatmentSessions.medicines) {
    // Assuming treatmentSessions.medicines is an array of medicine objects
    // Each medicine object has a 'daily_breakdown' array with { date, total_dosage }
    // Collect all unique dates
    const allDates = Array.from(
      new Set(treatmentSessions.medicines
        .flatMap((medicine: any) => (medicine.daily_breakdown || []).map((stat: any) => stat.date as string))
      )
    ).sort() as string[];

    // Build a map of medicine names
    const medicineNames = treatmentSessions.medicines.map((medicine: any) => medicine.medicine_name);

    // Build a date -> medicine -> instance count map
    const dateMedicineInstanceCountMap: { [date: string]: { [medicineName: string]: number } } = {};
    treatmentSessions.medicines.forEach((medicine: any) => {
      (medicine.daily_breakdown || []).forEach((stat: any) => {
        if (!dateMedicineInstanceCountMap[stat.date]) {
          dateMedicineInstanceCountMap[stat.date] = {};
        }
        dateMedicineInstanceCountMap[stat.date][medicine.medicine_name] = stat.instance_count || 0;
      });
    });

    treatmentSessions.medicines.forEach((medicine: any) => {
      colorMap[medicine.medicine_name] = medicine.color || '#4F8A8B';
    });

    // Build the final list
    dailyDosageList = allDates.map((date: string) => {
      const entry: DailyDosage = { date, actualData: false };
      medicineNames.forEach((name: string) => {
      if (
        dateMedicineInstanceCountMap[date] &&
        typeof dateMedicineInstanceCountMap[date][name] === 'number'
      ) {
        entry[name] = dateMedicineInstanceCountMap[date][name];
        entry.actualData = true;
      } else {
        entry[name] = 0;
      }
      });
      return entry;
    });
  }


  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get medicine names from color map
  const medicineNames = Object.keys(colorMap);

  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate vertical offset for YAxis label centering
  const chartHeight = isMobile ? 200 : 400;
  const labelOffset = chartHeight / 2 - 20; // Center vertically, adjust for label height
  const labelHorizontalOffset = isMobile ? 0: -12; // Move label further to the left (negative = left)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart
          data={dailyDosageList}
          margin={{ top: isMobile ? 30 : 40, right: 0, bottom: 5, left: isMobile ? -20: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={12}
            interval={
              typeof window !== 'undefined'
              ? isMobile
                ? Math.ceil(dailyDosageList.length / 4)
                : Math.ceil(dailyDosageList.length / 20)
              : 0
            }
          />

          <YAxis
            label={{ 
              value: 'Treatments', 
              angle: -90, 
              position: 'outsideLeft',
              offset: labelOffset,
              dx: labelHorizontalOffset,
              style: { textAnchor: 'middle' }
            }}
            fontSize={12}
            tickCount={isMobile ? 3 : 10}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) {
                return null;
              }
              // Filter out items with zero count
              const filteredPayload = payload.filter((item: any) => {
                const value = item.value;
                return typeof value === 'number' && value > 0;
              });
              
              if (filteredPayload.length === 0) {
                return null;
              }
              
              return (
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                    {formatDate(payload[0].payload.date)}
                  </p>
                  {filteredPayload.map((entry: any, index: number) => (
                    <p key={index} style={{ margin: '4px 0', color: entry.color }}>
                      <span style={{ marginRight: '8px' }}>{entry.name}:</span>
                      <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {/* Reference line for today */}
          <ReferenceLine
            x={today}
            stroke="#ff6b6b"
            strokeDasharray="5 5"
            label={{ value: "Today", position: "top", fontSize: 12 }}
          />

          {/* Areas for each medicine */}
          {medicineNames.map((medicineName) => (
            <Area
              key={medicineName}
              type="monotone"
              dataKey={medicineName}
              stackId="1"
              stroke={colorMap[medicineName]}
              fill={colorMap[medicineName]}
              fillOpacity={0.1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MedicineDosageTimeline;