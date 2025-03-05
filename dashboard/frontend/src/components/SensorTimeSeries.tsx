import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Brush, ReferenceLine
} from 'recharts';
import { TimeSeriesDataPoint } from '../utils/sensorData';

interface Props {
  data: TimeSeriesDataPoint[];
  sensorType: string;
  title?: string;
  height?: number;
  showBrush?: boolean;
}

// Helper function to format timestamp to readable date/time
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Helper function to determine the unit label based on sensor type
const getSensorUnitLabel = (sensorType: string): string => {
  switch (sensorType) {
    case 'TemperatureMeasurement':
      return 'Temperature (°C × 100)';
    case 'RelativeHumidityMeasurement':
      return 'Humidity (%)';
    case 'OnOff':
      return 'State (On/Off)';
    case 'OccupancySensing':
      return 'Occupancy';
    default:
      return 'Value';
  }
};

export const SensorTimeSeries: React.FC<Props> = ({ 
  data, 
  sensorType, 
  title, 
  height = 300,
  showBrush = true
}) => {
  // Find min and max values for better axis scaling
  const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 100;
  const valueRange = maxValue - minValue || 1; // Prevent division by zero
  
  // Create reference lines for anomalous data points
  const anomalyReferences = data
    .filter(point => point.isAnomalous)
    .map((point, index) => (
      <ReferenceLine 
        key={`anomaly-${index}`}
        x={point.timestamp} 
        stroke="#ff6b6b" 
        strokeDasharray="3 3" 
      />
    ));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTimestamp}
            minTickGap={50}
          />
          <YAxis 
            domain={[minValue - valueRange * 0.1, maxValue + valueRange * 0.1]}
            label={{ 
              value: getSensorUnitLabel(sensorType), 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip 
            labelFormatter={(timestamp) => formatTimestamp(timestamp as number)}
            formatter={(value, name) => {
              if (name === 'value') {
                return [value, getSensorUnitLabel(sensorType).split(' ')[0]];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#4792dc" 
            strokeWidth={2}
            dot={(props) => {
              // Access the full data point safely
              const dataPoint = props?.payload;
              return dataPoint?.isAnomalous ? 
                <circle cx={props.cx} cy={props.cy} r={4} fill="#ff6b6b" stroke="#ff6b6b" /> : 
                <circle cx={props.cx} cy={props.cy} r={3} fill="#4792dc" stroke="#4792dc" />;
            }}
            activeDot={{ r: 6 }}
            name={getSensorUnitLabel(sensorType).split(' ')[0]}
          />
          {anomalyReferences}
          {showBrush && (
            <Brush 
              dataKey="timestamp" 
              height={30} 
              stroke="#8884d8"
              tickFormatter={formatTimestamp}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
