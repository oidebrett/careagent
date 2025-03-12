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
  situation: {
    situation_description: string;
    result: string;
    start_timestamp: number;
    end_timestamp: number;
    details: string[];
  };
  relatedSensors: string[];
  roomLocation: string;
  detectionConfidence: number; // 0-100 percent
  situationId?: string; // Reference to the situation that generated this anomaly
  estimate: 'normal' | 'anomalous';  // Add this field
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

const extractRoomFromDetails = (details: string[]): string => {
  if (details.length === 0) return '';
  try {
    const firstDetail = JSON.parse(details[0]);
    return firstDetail.room || '';
  } catch {
    return '';
  }
};

export const useSensorData = () => {
  const [data, setData] = useState<SensorDataItem[]>([]);
  const [anomalyLogs, setAnomalyLogs] = useState<AnomalyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/sensor-data');
      if (!response.ok) throw new Error('Failed to fetch sensor data');
      
      const memoryData = await response.json();
      
      // Transform memory data into SensorDataItem format
      const transformedData: SensorDataItem[] = memoryData.map((item: any) => ({
        situation: {
          situation_description: item.situation.situation_description,
          result: item.situation.result,
          start_timestamp: item.situation.start_timestamp,
          end_timestamp: item.situation.end_timestamp,
          details: item.situation.details
        },
        estimate: item.estimate,  // Use the estimate field directly from the data
        anomalyId: item.estimate === 'anomalous' ? generateId() : undefined
      }));

      // Create anomaly logs only for situations marked as anomalous in the estimate field
      const newAnomalyLogs: AnomalyLog[] = transformedData
        .filter(item => item.estimate === 'anomalous')
        .map(item => ({
          id: item.anomalyId!,
          timestamp: item.situation.end_timestamp,
          description: item.situation.situation_description,
          severityLevel: 'medium',
          reviewStatus: 'pending',
          relatedSensors: [],
          roomLocation: extractRoomFromDetails(item.situation.details),  // Add helper function to extract room
          detectionConfidence: 75,
          situationId: generateId(),
          estimate: item.estimate  // Make sure to include the estimate field
        }));

      setData(transformedData);
      setAnomalyLogs(newAnomalyLogs);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setLoading(false);
    }
  }, []);

  const updateAnomalyStatus = useCallback(async (anomalyId: string, status: 'normal' | 'anomalous', notes?: string) => {
    try {
      // Find the index of the situation in the data array
      const situationIndex = data.findIndex(item => item.anomalyId === anomalyId);
      if (situationIndex === -1) throw new Error('Situation not found');

      // Update the backend
      const response = await fetch(`/api/sensor-data/${situationIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index: situationIndex,
          estimate: status
        })
      });

      if (!response.ok) throw new Error('Failed to update situation');

      // Immediately reload the data after update
      await loadData();

    } catch (error) {
      console.error('Error updating anomaly status:', error);
      throw error;
    }
  }, [data, loadData]);

  useEffect(() => {
    loadData();
    
    const intervalId = setInterval(loadData, 10000);
    return () => clearInterval(intervalId);
  }, [loadData]);

  return { 
    data, 
    anomalyLogs,
    loading, 
    error,
    updateAnomalyStatus,
    loadData  // Export loadData in case we need to trigger refresh elsewhere
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

export function filterAnomaliesByStatus(anomalies: AnomalyLog[], status?: 'normal' | 'anomalous'): AnomalyLog[] {
  if (!status) return anomalies;
  return anomalies.filter(anomaly => anomaly.estimate === status);
}

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
