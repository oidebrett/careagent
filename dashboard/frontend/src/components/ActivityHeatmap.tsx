import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { RoomActivityDataPoint } from '../utils/sensorData';

interface Props {
  data: RoomActivityDataPoint[];
  title?: string;
  height?: number;
}

// Custom tooltip component to enhance readability
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{data.room}</p>
        <p className="text-sm text-gray-600">Time: {data.hour}:00 - {data.hour+1}:00</p>
        <p className="text-sm text-gray-600">Activity: {data.activityCount} events</p>
        {data.anomalyCount > 0 && (
          <p className="text-sm text-red-500">Anomalies: {data.anomalyCount}</p>
        )}
      </div>
    );
  }
  return null;
};

// Format hour for x-axis
const formatHour = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
};

export const ActivityHeatmap: React.FC<Props> = ({ 
  data, 
  title = 'Room Activity Patterns', 
  height = 400 
}) => {
  // Handle empty data case
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <p className="text-gray-500">No activity data available</p>
        </div>
      </div>
    );
  }

  // Extract unique room values for the Y axis
  const uniqueRooms = Array.from(new Set(data.map(item => item.room)));
  
  // Calculate bubble size range based on activity count
  const maxActivity = Math.max(...data.map(item => item.activityCount)) || 1;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="hour" 
            name="Time" 
            type="number" 
            domain={[0, 23]}
            tickCount={12}
            tickFormatter={formatHour}
            label={{ value: 'Hour of Day', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            dataKey="room" 
            type="category" 
            name="Room"
            allowDuplicatedCategory={false}
            domain={uniqueRooms}
            width={80}
          />
          <ZAxis 
            dataKey="activityCount" 
            name="Activity" 
            range={[10, 60]} // Min and max bubble size
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Scatter 
            name="Room Activity" 
            data={data} 
            fill="#8884d8"
          >
            {data.map((entry, index) => {
              // Determine color based on anomaly ratio
              const anomalyRatio = entry.anomalyCount / (entry.activityCount || 1);
              let fillColor = '#4791db'; // Regular activity (blue)
              
              if (entry.anomalyCount > 0) {
                if (anomalyRatio > 0.5) {
                  fillColor = '#f44336'; // High anomaly ratio (red)
                } else {
                  fillColor = '#ff9800'; // Some anomalies (orange)
                }
              }
              
              return <Cell key={`cell-${index}`} fill={fillColor} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          <span className="text-gray-600">Normal Activity</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
          <span className="text-gray-600">Some Anomalies</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
          <span className="text-gray-600">High Anomaly Ratio</span>
        </div>
      </div>
    </div>
  );
};
