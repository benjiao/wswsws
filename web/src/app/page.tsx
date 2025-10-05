'use client';
import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import MedicineDosageTimeline from '@/components/MedicineDosageTimeline';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export default function FrontPage() {
  const today = new Date();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

  const startDateObj = new Date(today.getTime() - oneMonthMs);
  const endDateObj = new Date(today.getTime() + oneMonthMs);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const start_date = formatDate(startDateObj);
  const end_date = formatDate(endDateObj);

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
  let medicineColorMap: { [medicineName: string]: string } = {};

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
      medicineColorMap[medicine.medicine_name] = medicine.color || '#4F8A8B';
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

  return (
    <div>
      <h1>Dashboard</h1>
      <MedicineDosageTimeline
        dailyDosageList={dailyDosageList}
        colorMap={medicineColorMap} />
    </div>
  );
}