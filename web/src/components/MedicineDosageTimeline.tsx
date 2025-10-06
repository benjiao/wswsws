'use client';
import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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

    // Build a date -> medicine -> dosage map
    const dateMedicineDosageMap: { [date: string]: { [medicineName: string]: number } } = {};
    treatmentSessions.medicines.forEach((medicine: any) => {
      (medicine.daily_breakdown || []).forEach((stat: any) => {
        if (!dateMedicineDosageMap[stat.date]) {
          dateMedicineDosageMap[stat.date] = {};
        }
        dateMedicineDosageMap[stat.date][medicine.medicine_name] = stat.total_dosage_scheduled;
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
        dateMedicineDosageMap[date] &&
        typeof dateMedicineDosageMap[date][name] === 'number'
      ) {
        entry[name] = dateMedicineDosageMap[date][name];
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

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={dailyDosageList}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={12}
            interval={window.innerWidth < 600 ? Math.ceil(dailyDosageList.length / 4) : Math.ceil(dailyDosageList.length / 20)}
          />

          <YAxis
            label={{ value: 'Dosage (mL)', angle: -90, position: 'insideLeft' }}
            fontSize={12}

          />
          <Tooltip />
          <Legend />

          {/* Reference line for today */}
          <ReferenceLine
            x={today}
            stroke="#ff6b6b"
            strokeDasharray="5 5"
            label={{ value: "Today", position: "top" }}
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