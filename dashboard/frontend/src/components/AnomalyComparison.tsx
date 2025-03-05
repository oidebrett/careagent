import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ReferenceLine, LabelList
} from 'recharts';
import { AnomalyComparisonData } from '../utils/sensorData';

interface Props {
  data: AnomalyComparisonData[];
  title?: string;
  height?: number;
}

// Get a readable name for the sensor type
const getSensorTypeName = (type: string): string => {
  switch (type) {
    case 'TemperatureMeasurement':
      return 'Temperature';
    case 'RelativeHumidityMeasurement':
      return 'Humidity';
    case 'OnOff':
      return 'On/Off State';
    case 'OccupancySensing':
      return 'Occupancy';
    default:
      return type;
  }
};

// Custom tooltip for better information display
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sensorType = label;
    const sensorName = getSensorTypeName(sensorType);
    
    // Get actual data including counts
    const sensorData = payload[0].payload;
    
    return (
      <div className="bg-white p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{sensorName}</p>
        <div className="mt-2">
          <p className="text-sm">
            <span className="font-medium text-blue-600">Normal readings:</span> {sensorData.normalCount} samples
          </p>
          <p className="text-sm">
            <span className="font-medium text-blue-600">Normal average:</span> {sensorData.normalAvg.toFixed(2)}
          </p>
        </div>
        <div className="mt-2">
          <p className="text-sm">
            <span className="font-medium text-red-600">Anomalous readings:</span> {sensorData.anomalousCount} samples
          </p>
          <p className="text-sm">
            <span className="font-medium text-red-600">Anomalous average:</span> {sensorData.anomalousAvg.toFixed(2)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const AnomalyComparison: React.FC<Props> = ({ 
  data, 
  title = 'Normal vs. Anomalous Readings', 
  height = 400 
}) => {
  // Handle empty data case
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <p className="text-gray-500">No comparison data available</p>
        </div>
      </div>
    );
  }
  
  // Format data for better display
  const formattedData = data.map(item => ({
    ...item,
    sensorName: getSensorTypeName(item.sensorType),
    // Calculate percentage difference
    percentDiff: item.normalAvg > 0 ? 
      ((item.anomalousAvg - item.normalAvg) / item.normalAvg * 100).toFixed(1) + '%' : 
      'N/A'
  }));
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
          barSize={36}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="sensorType" 
            tickFormatter={getSensorTypeName}
            interval={0}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine y={0} stroke="#000" />
          <Bar 
            dataKey="normalAvg" 
            name="Normal Reading Avg" 
            fill="#4791db"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="anomalousAvg" 
            name="Anomalous Reading Avg" 
            fill="#ff6b6b"
            radius={[4, 4, 0, 0]}
          >
            <LabelList 
              dataKey="percentDiff" 
              position="top" 
              style={{ fontSize: '12px', fill: '#666' }} 
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600">
        <p>This chart compares average readings between normal and anomalous situations for each sensor type.</p>
        <p className="mt-1">Percentages show the difference between anomalous and normal values.</p>
      </div>
    </div>
  );
};
