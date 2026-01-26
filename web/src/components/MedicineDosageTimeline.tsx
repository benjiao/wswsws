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

  const today = getUserLocalDate(); // Returns YYYY-MM-DD format string

  // Calculate start date (1 month before today)
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  const start_date = startDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Calculate end date (2 months after today)
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 1);
  const end_date = endDate.toISOString().slice(0, 10); // YYYY-MM-DD format
  
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

  // Generate all dates from start_date to end_date
  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().slice(0, 10));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const allDatesInRange = generateDateRange(start_date, end_date);

  if (treatmentSessions && treatmentSessions.medicines) {
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

    // Build the final list using all dates in the range
    dailyDosageList = allDatesInRange.map((date: string) => {
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
  } else {
    // If no data, still generate the date range with empty entries
    const medicineNames: string[] = [];
    dailyDosageList = allDatesInRange.map((date: string) => {
      const entry: DailyDosage = { date, actualData: false };
      medicineNames.forEach((name: string) => {
        entry[name] = 0;
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