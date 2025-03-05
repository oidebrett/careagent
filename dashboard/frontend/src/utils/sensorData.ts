import { useState, useEffect, useCallback } from 'react';

// Define types for our sensor data
export interface SensorDetail {
  timestamp: number;
  datetime: string;
  room: string;
  nodeId: number;
  endpointId: number;
  attribute: Record<string, any>;
}

export interface Situation {
  situation_description: string;
  result: 'normal' | 'anomalous';
  start_timestamp: number;
  end_timestamp: number;
  details: string[];
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReviewStatus = 'pending' | 'reviewed' | 'dismissed' | 'escalated';

export interface AnomalyLog {
  id: string;
  timestamp: number;
  description: string;
  severityLevel: SeverityLevel;
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  relatedSensors: string[];
  roomLocation: string;
  detectionConfidence: number; // 0-100 percent
  situationId?: string; // Reference to the situation that generated this anomaly
}

export interface SensorDataItem {
  situation: Situation;
  estimate: 'normal' | 'anomalous';
  anomalyId?: string; // Reference to an anomaly log if this is anomalous
}

// Generate a unique ID
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Mock data loader function
export const useSensorData = () => {
  const [data, setData] = useState<SensorDataItem[]>([]);
  const [anomalyLogs, setAnomalyLogs] = useState<AnomalyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // In a real application, we would fetch this from an API
    // For now, we'll use a mock implementation
    const fetchData = async () => {
      try {
        // This is a placeholder - in a real app we would fetch from an API
        // In future iterations, we'll replace this with actual API calls
        const mockData: SensorDataItem[] = [
          {
            situation: {
              situation_description: "During this 6-hour period, various movements and sensor readings were recorded in the kitchen. There were multiple instances of occupancy detected, especially between 1:07 PM and 1:32 PM, with the space becoming unoccupied at times in between.",
              result: "normal",
              start_timestamp: 1740920170,
              end_timestamp: 1740925977,
              details: [
                '{"timestamp": 1740920170, "datetime": "Sun Mar 02 2025 12:56:10", "room": "kitchen", "nodeId": 6, "endpointId": 6, "attribute": {"RelativeHumidityMeasurement": {"MeasuredValue": 8614}}}',
                '{"timestamp": 1740920849, "datetime": "Sun Mar 02 2025 13:07:29", "room": "kitchen", "nodeId": 6, "endpointId": 3, "attribute": {"OccupancySensing": {"Occupancy": 1}}}',
                '{"timestamp": 1740925977, "datetime": "Sun Mar 02 2025 14:32:57", "room": "kitchen", "nodeId": 6, "endpointId": 6, "attribute": {"RelativeHumidityMeasurement": {"MeasuredValue": 5460}}}'
              ]
            },
            estimate: "normal"
          },
          {
            situation: {
              situation_description: "On March 3, 2025, at 7:33 AM, a log entry recorded a measurement in the kitchen indicating a relative humidity level of 5390. This observation details one instance of environmental monitoring in the kitchen area during the early morning hours.",
              result: "normal",
              start_timestamp: 1740987196,
              end_timestamp: 1740987196,
              details: [
                '{"timestamp": 1740987196, "datetime": "Mon Mar 03 2025 07:33:16", "room": "kitchen", "nodeId": 6, "endpointId": 6, "attribute": {"RelativeHumidityMeasurement": {"MeasuredValue": 5390}}}'
              ]
            },
            estimate: "anomalous",
            anomalyId: "anom-1"
          },
          {
            situation: {
              situation_description: "Unusual activity detected in the bathroom with rapid temperature changes over a short period. Temperature rose from 22°C to 28°C in under 15 minutes without corresponding humidity changes typical of shower use.",
              result: "anomalous",
              start_timestamp: 1740989196,
              end_timestamp: 1740990196,
              details: [
                '{"timestamp": 1740989196, "datetime": "Mon Mar 03 2025 08:06:36", "room": "bathroom", "nodeId": 3, "endpointId": 2, "attribute": {"TemperatureMeasurement": {"MeasuredValue": 2200}}}',
                '{"timestamp": 1740990196, "datetime": "Mon Mar 03 2025 08:23:16", "room": "bathroom", "nodeId": 3, "endpointId": 2, "attribute": {"TemperatureMeasurement": {"MeasuredValue": 2800}}}'
              ]
            },
            estimate: "anomalous",
            anomalyId: "anom-2"
          },
          {
            situation: {
              situation_description: "No movement detected in bedroom for extended period during normal waking hours (9AM-11AM). Resident typically shows movement patterns during these hours based on historical data.",
              result: "anomalous",
              start_timestamp: 1740991196,
              end_timestamp: 1740998396,
              details: [
                '{"timestamp": 1740991196, "datetime": "Mon Mar 03 2025 08:39:56", "room": "bedroom", "nodeId": 2, "endpointId": 1, "attribute": {"OccupancySensing": {"Occupancy": 1}}}',
                '{"timestamp": 1740998396, "datetime": "Mon Mar 03 2025 10:39:56", "room": "bedroom", "nodeId": 2, "endpointId": 1, "attribute": {"OccupancySensing": {"Occupancy": 1}}}'
              ]
            },
            estimate: "anomalous",
            anomalyId: "anom-3"
          },
          {
            situation: {
              situation_description: "Multiple door open/close events detected at the main entrance during nighttime hours (2:15AM-2:45AM), which is outside typical behavior patterns.",
              result: "anomalous",
              start_timestamp: 1740941700,
              end_timestamp: 1740943500,
              details: [
                '{"timestamp": 1740941700, "datetime": "Mon Mar 03 2025 02:15:00", "room": "entrance", "nodeId": 1, "endpointId": 4, "attribute": {"OnOff": {"OnOff": 1}}}',
                '{"timestamp": 1740942000, "datetime": "Mon Mar 03 2025 02:20:00", "room": "entrance", "nodeId": 1, "endpointId": 4, "attribute": {"OnOff": {"OnOff": 0}}}',
                '{"timestamp": 1740943000, "datetime": "Mon Mar 03 2025 02:36:40", "room": "entrance", "nodeId": 1, "endpointId": 4, "attribute": {"OnOff": {"OnOff": 1}}}',
                '{"timestamp": 1740943500, "datetime": "Mon Mar 03 2025 02:45:00", "room": "entrance", "nodeId": 1, "endpointId": 4, "attribute": {"OnOff": {"OnOff": 0}}}'
              ]
            },
            estimate: "anomalous",
            anomalyId: "anom-4"
          }
        ];
        
        // Create mock anomaly logs
        const mockAnomalyLogs: AnomalyLog[] = [
          {
            id: "anom-1",
            timestamp: 1740987196,
            description: "Unusual humidity level detected in kitchen - possibly indicating water leak or appliance malfunction",
            severityLevel: "low",
            reviewStatus: "pending",
            relatedSensors: ["Humidity"],
            roomLocation: "kitchen",
            detectionConfidence: 65,
            situationId: "sit-1"
          },
          {
            id: "anom-2",
            timestamp: 1740990196,
            description: "Rapid temperature rise in bathroom without corresponding humidity increase - unusual pattern that doesn't match normal shower or bath use",
            severityLevel: "medium",
            reviewStatus: "pending",
            relatedSensors: ["Temperature", "Humidity"],
            roomLocation: "bathroom",
            detectionConfidence: 78,
            situationId: "sit-2"
          },
          {
            id: "anom-3",
            timestamp: 1740998396,
            description: "Extended period without movement in bedroom during typical waking hours - potential indication of resident immobility or fall",
            severityLevel: "high",
            reviewStatus: "pending",
            relatedSensors: ["Motion", "Occupancy"],
            roomLocation: "bedroom",
            detectionConfidence: 82,
            situationId: "sit-3"
          },
          {
            id: "anom-4",
            timestamp: 1740943500,
            description: "Multiple door activations during nighttime hours - potential security concern or resident confusion",
            severityLevel: "critical",
            reviewStatus: "pending",
            relatedSensors: ["Door Sensor"],
            roomLocation: "entrance",
            detectionConfidence: 91,
            situationId: "sit-4"
          }
        ];
        
        setData(mockData);
        setAnomalyLogs(mockAnomalyLogs);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to update an anomaly's review status
  const updateAnomalyStatus = useCallback((anomalyId: string, status: ReviewStatus, notes?: string) => {
    setAnomalyLogs(prevLogs => 
      prevLogs.map(log => 
        log.id === anomalyId 
          ? { ...log, reviewStatus: status, reviewNotes: notes || log.reviewNotes }
          : log
      )
    );
  }, []);

  // Function to get all anomalies
  const getAnomalies = useCallback(() => {
    return anomalyLogs;
  }, [anomalyLogs]);

  // Function to get a specific anomaly by ID
  const getAnomalyById = useCallback((id: string) => {
    return anomalyLogs.find(anomaly => anomaly.id === id) || null;
  }, [anomalyLogs]);

  return { 
    data, 
    anomalyLogs,
    loading, 
    error,
    updateAnomalyStatus,
    getAnomalies,
    getAnomalyById
  };
};

// Helper functions for working with sensor data
export const parseSensorDetail = (detailString: string): SensorDetail => {
  return JSON.parse(detailString);
};

export const getLatestSensorReadings = (data: SensorDataItem[]): Record<string, SensorDetail> => {
  const latestReadings: Record<string, SensorDetail> = {};
  
  data.forEach(item => {
    item.situation.details.forEach(detailString => {
      const detail = parseSensorDetail(detailString);
      const sensorType = Object.keys(detail.attribute)[0];
      
      if (!latestReadings[sensorType] || latestReadings[sensorType].timestamp < detail.timestamp) {
        latestReadings[sensorType] = detail;
      }
    });
  });
  
  return latestReadings;
};

export const countAnomalies = (data: SensorDataItem[]): number => {
  return data.filter(item => item.estimate === 'anomalous').length;
};

export const countPendingAnomalies = (anomalyLogs: AnomalyLog[]): number => {
  return anomalyLogs.filter(log => log.reviewStatus === 'pending').length;
};

export const filterAnomaliesByStatus = (anomalyLogs: AnomalyLog[], status?: ReviewStatus): AnomalyLog[] => {
  if (!status) return anomalyLogs;
  return anomalyLogs.filter(log => log.reviewStatus === status);
};

export const filterAnomaliesBySeverity = (anomalyLogs: AnomalyLog[], severity?: SeverityLevel): AnomalyLog[] => {
  if (!severity) return anomalyLogs;
  return anomalyLogs.filter(log => log.severityLevel === severity);
};

export const getSeverityColor = (severity: SeverityLevel): string => {
  switch (severity) {
    case "low":
      return "text-amber-500 bg-amber-50 border-amber-200";
    case "medium":
      return "text-orange-500 bg-orange-50 border-orange-200";
    case "high":
      return "text-red-500 bg-red-50 border-red-200";
    case "critical":
      return "text-purple-600 bg-purple-50 border-purple-200";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200";
  }
};

export const getStatusColor = (status: ReviewStatus): string => {
  switch (status) {
    case "pending":
      return "text-blue-500 bg-blue-50 border-blue-200";
    case "reviewed":
      return "text-green-500 bg-green-50 border-green-200";
    case "dismissed":
      return "text-gray-500 bg-gray-50 border-gray-200";
    case "escalated":
      return "text-red-500 bg-red-50 border-red-200";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200";
  }
};

export const getRecentSituations = (data: SensorDataItem[], count: number = 5): SensorDataItem[] => {
  return [...data]
    .sort((a, b) => b.situation.end_timestamp - a.situation.end_timestamp)
    .slice(0, count);
};

// Extract all sensor types from the data
export const extractSensorTypes = (data: SensorDataItem[]): string[] => {
  const sensorTypes = new Set<string>();
  
  data.forEach(item => {
    item.situation.details.forEach(detailString => {
      const detail = parseSensorDetail(detailString);
      const sensorType = Object.keys(detail.attribute)[0];
      sensorTypes.add(sensorType);
    });
  });
  
  return Array.from(sensorTypes);
};

// Extract all rooms from the data
export const extractRooms = (data: SensorDataItem[]): string[] => {
  const rooms = new Set<string>();
  
  data.forEach(item => {
    item.situation.details.forEach(detailString => {
      const detail = parseSensorDetail(detailString);
      rooms.add(detail.room);
    });
  });
  
  return Array.from(rooms);
};

// Format sensor data for time-series charts
export interface TimeSeriesDataPoint {
  timestamp: number;
  datetime: string;
  value: number;
  room: string;
  isAnomalous: boolean;
}

export const getSensorTimeSeriesData = (
  data: SensorDataItem[], 
  sensorType: string,
  startTime?: number,
  endTime?: number,
  rooms?: string[]
): TimeSeriesDataPoint[] => {
  const timeSeriesData: TimeSeriesDataPoint[] = [];
  
  data.forEach(item => {
    const isAnomalous = item.estimate === 'anomalous';
    
    item.situation.details.forEach(detailString => {
      const detail = parseSensorDetail(detailString);
      const detailSensorType = Object.keys(detail.attribute)[0];
      
      // Skip if not the requested sensor type
      if (detailSensorType !== sensorType) return;
      
      // Skip if outside the time range
      if (startTime && detail.timestamp < startTime) return;
      if (endTime && detail.timestamp > endTime) return;
      
      // Skip if not in the requested rooms
      if (rooms && rooms.length > 0 && !rooms.includes(detail.room)) return;
      
      // Extract the actual value from the sensor reading
      const attributeValues = detail.attribute[detailSensorType];
      const value = attributeValues ? Object.values(attributeValues)[0] as number : 0;
      
      timeSeriesData.push({
        timestamp: detail.timestamp,
        datetime: detail.datetime,
        value: value,
        room: detail.room,
        isAnomalous
      });
    });
  });
  
  // Sort by timestamp
  return timeSeriesData.sort((a, b) => a.timestamp - b.timestamp);
};

// Format sensor data for room activity heatmap
export interface RoomActivityDataPoint {
  room: string;
  hour: number;
  activityCount: number;
  anomalyCount: number;
}

export const getRoomActivityData = (
  data: SensorDataItem[],
  startTime?: number,
  endTime?: number,
  rooms?: string[]
): RoomActivityDataPoint[] => {
  const activityMap: Record<string, Record<number, { total: number, anomalies: number }>> = {};
  const roomsList = rooms || extractRooms(data);
  
  // Initialize the activity map
  roomsList.forEach(room => {
    activityMap[room] = {};
    for (let hour = 0; hour < 24; hour++) {
      activityMap[room][hour] = { total: 0, anomalies: 0 };
    }
  });
  
  // Populate the activity map
  data.forEach(item => {
    const isAnomalous = item.estimate === 'anomalous';
    
    item.situation.details.forEach(detailString => {
      const detail = parseSensorDetail(detailString);
      
      // Skip if outside the time range
      if (startTime && detail.timestamp < startTime) return;
      if (endTime && detail.timestamp > endTime) return;
      
      // Skip if not in the requested rooms
      if (rooms && rooms.length > 0 && !rooms.includes(detail.room)) return;
      
      // Extract the hour from the timestamp
      const date = new Date(detail.timestamp * 1000);
      const hour = date.getHours();
      
      // Increment the activity count
      if (!activityMap[detail.room][hour]) {
        activityMap[detail.room][hour] = { total: 0, anomalies: 0 };
      }
      
      activityMap[detail.room][hour].total += 1;
      if (isAnomalous) {
        activityMap[detail.room][hour].anomalies += 1;
      }
    });
  });
  
  // Convert the map to an array of data points
  const activityData: RoomActivityDataPoint[] = [];
  
  Object.entries(activityMap).forEach(([room, hourData]) => {
    Object.entries(hourData).forEach(([hour, counts]) => {
      activityData.push({
        room,
        hour: parseInt(hour),
        activityCount: counts.total,
        anomalyCount: counts.anomalies
      });
    });
  });
  
  return activityData;
};

// Format sensor data for comparing normal vs anomalous readings
export interface AnomalyComparisonData {
  sensorType: string;
  normalAvg: number;
  anomalousAvg: number;
  normalCount: number;
  anomalousCount: number;
}

export const getAnomalyComparisonData = (
  data: SensorDataItem[],
  startTime?: number,
  endTime?: number
): AnomalyComparisonData[] => {
  const sensorTypes = extractSensorTypes(data);
  const comparisonData: Record<string, { normalSum: number, normalCount: number, anomalousSum: number, anomalousCount: number }> = {};
  
  // Initialize the comparison data
  sensorTypes.forEach(type => {
    comparisonData[type] = { normalSum: 0, normalCount: 0, anomalousSum: 0, anomalousCount: 0 };
  });
  
  // Populate the comparison data
  data.forEach(item => {
    const isAnomalous = item.estimate === 'anomalous';
    
    item.situation.details.forEach(detailString => {
      const detail = parseSensorDetail(detailString);
      
      // Skip if outside the time range
      if (startTime && detail.timestamp < startTime) return;
      if (endTime && detail.timestamp > endTime) return;
      
      const sensorType = Object.keys(detail.attribute)[0];
      const attributeValues = detail.attribute[sensorType];
      const value = attributeValues ? Object.values(attributeValues)[0] as number : 0;
      
      if (isAnomalous) {
        comparisonData[sensorType].anomalousSum += value;
        comparisonData[sensorType].anomalousCount += 1;
      } else {
        comparisonData[sensorType].normalSum += value;
        comparisonData[sensorType].normalCount += 1;
      }
    });
  });
  
  // Convert the map to an array of data points
  return sensorTypes.map(sensorType => {
    const sensorData = comparisonData[sensorType];
    return {
      sensorType,
      normalAvg: sensorData.normalCount > 0 ? sensorData.normalSum / sensorData.normalCount : 0,
      anomalousAvg: sensorData.anomalousCount > 0 ? sensorData.anomalousSum / sensorData.anomalousCount : 0,
      normalCount: sensorData.normalCount,
      anomalousCount: sensorData.anomalousCount
    };
  });
};