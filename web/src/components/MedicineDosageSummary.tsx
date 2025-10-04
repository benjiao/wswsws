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

type MedicineData = {
  date: string;
  actualData: boolean;
  [medicineName: string]: string | number | boolean;
};

// Sample data structure for multiple medicines with projections
const sampleData: MedicineData[] = [
  // Historical data (actual consumption)
  { date: '2025-09-28', actualData: true, 'Immunol': 250, 'Supreme Pro Plus': 400, 'LC-Vit': 1000 },
  { date: '2025-09-29', actualData: true, 'Immunol': 500, 'Supreme Pro Plus': 200, 'LC-Vit': 1000 },
  { date: '2025-09-30', actualData: true, 'Immunol': 250, 'Supreme Pro Plus': 600, 'LC-Vit': 1000 },
  { date: '2025-10-01', actualData: true, 'Immunol': 500, 'Supreme Pro Plus': 400, 'LC-Vit': 2000 },
  { date: '2025-10-02', actualData: true, 'Immunol': 250, 'Supreme Pro Plus': 200, 'LC-Vit': 1000 },
  { date: '2025-10-03', actualData: true, 'Immunol': 500, 'Supreme Pro Plus': 400, 'LC-Vit': 1000 },
  { date: '2025-10-04', actualData: true, 'Immunol': 250, 'Supreme Pro Plus': 600, 'LC-Vit': 2000 },

  // Today (boundary)
  { date: '2025-10-05', actualData: false, 'Immunol': 500, 'Supreme Pro Plus': 400, 'LC-Vit': 1000 },

  // Future projections
  { date: '2025-10-06', actualData: false, 'Immunol': 500, 'Supreme Pro Plus': 400, 'LC-Vit': 1000 },
  { date: '2025-10-07', actualData: false, 'Immunol': 250, 'Supreme Pro Plus': 200, 'LC-Vit': 1000 },
  { date: '2025-10-08', actualData: false, 'Immunol': 500, 'Supreme Pro Plus': 400, 'LC-Vit': 2000 },
  { date: '2025-10-09', actualData: false, 'Immunol': 250, 'Supreme Pro Plus': 600, 'LC-Vit': 1000 },
  { date: '2025-10-10', actualData: false, 'Immunol': 500, 'Supreme Pro Plus': 400, 'LC-Vit': 1000 },
  { date: '2025-10-11', actualData: false, 'Immunol': 250, 'Supreme Pro Plus': 200, 'LC-Vit': 2000 },
];

// Medicine configurations with colors
const medicineConfig = [
  { name: 'Immunol', color: '#8884d8', unit: 'mL' },
  { name: 'Supreme Pro Plus', color: '#82ca9d', unit: 'mL' },
  { name: 'LC-Vit', color: '#ffc658', unit: 'mL' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isProjection = payload[0]?.payload?.actualData === false;
    
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{`Date: ${label}`}</p>
        <p className="text-sm text-gray-600 mb-2">
          {isProjection ? '📊 Projected' : '✅ Actual'}
        </p>
        {payload.map((entry: any, index: number) => {
          const config = medicineConfig.find(m => m.name === entry.dataKey);
          return (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value} ${config?.unit || 'mg'}`}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

type MedicineDosageSummaryProps = {
  data: MedicineData[];
  loading?: boolean;
  error?: any;
  refetch?: () => void;
};

const MedicineDosageSummary: React.FC<MedicineDosageSummaryProps> = ({ data, loading, error, refetch }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Daily Medicine Scheduled Dosage
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            fontSize={12}
          />
          
          <YAxis 
            label={{ value: 'Dosage (mL)', angle: -90, position: 'insideLeft' }}
            fontSize={12}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Reference line for today */}
          <ReferenceLine 
            x={today} 
            stroke="#ff6b6b" 
            strokeDasharray="5 5" 
            label={{ value: "Today", position: "top" }}
          />

          {/* Areas for each medicine */}
          {medicineConfig.map((medicine, index) => (
            <Area
              key={medicine.name}
              type="monotone"
              dataKey={medicine.name}
              stackId="1"
              stroke={medicine.color}
              fill={medicine.color}
              fillOpacity={0.6}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MedicineDosageSummary;