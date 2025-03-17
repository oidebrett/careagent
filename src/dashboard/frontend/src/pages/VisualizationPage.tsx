import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useSensorData, 
  extractSensorTypes, 
  extractRooms,
  getSensorTimeSeriesData,
  getRoomActivityData,
  getAnomalyComparisonData
} from '../utils/sensorData';
import { SensorTimeSeries } from 'components/SensorTimeSeries';
import { ActivityHeatmap } from 'components/ActivityHeatmap';
import { AnomalyComparison } from 'components/AnomalyComparison';

export default function VisualizationPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useSensorData();
  
  // Filter states
  const [selectedSensorType, setSelectedSensorType] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24h');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  
  // Extract available sensor types and rooms from data
  const sensorTypes = useMemo(() => data ? extractSensorTypes(data) : [], [data]);
  const rooms = useMemo(() => data ? extractRooms(data) : [], [data]);
  
  // Set default sensor type if not selected and options are available
  React.useEffect(() => {
    if (sensorTypes.length > 0 && !selectedSensorType) {
      setSelectedSensorType(sensorTypes[0]);
    }
  }, [sensorTypes, selectedSensorType]);
  
  // Calculate time range in seconds
  const timeRange = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    switch (selectedTimeRange) {
      case '24h':
        return { start: now - 86400, end: now };
      case '7d':
        return { start: now - 604800, end: now };
      case '30d':
        return { start: now - 2592000, end: now };
      default:
        return { start: now - 86400, end: now };
    }
  }, [selectedTimeRange]);
  
  // Prepare data for visualizations based on filters
  const timeSeriesData = useMemo(() => 
    data && selectedSensorType ? 
    getSensorTimeSeriesData(
      data, 
      selectedSensorType, 
      timeRange.start, 
      timeRange.end,
      selectedRooms.length > 0 ? selectedRooms : undefined
    ) : [], 
  [data, selectedSensorType, timeRange, selectedRooms]);
  
  const activityData = useMemo(() => 
    data ? 
    getRoomActivityData(
      data, 
      timeRange.start, 
      timeRange.end,
      selectedRooms.length > 0 ? selectedRooms : undefined
    ) : [], 
  [data, timeRange, selectedRooms]);
  
  const comparisonData = useMemo(() => 
    data ? 
    getAnomalyComparisonData(
      data, 
      timeRange.start, 
      timeRange.end
    ) : [], 
  [data, timeRange]);
  
  // Toggle room selection
  const toggleRoomSelection = (room: string) => {
    if (selectedRooms.includes(room)) {
      setSelectedRooms(selectedRooms.filter(r => r !== room));
    } else {
      setSelectedRooms([...selectedRooms, room]);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Care Agents</h1>
              <p className="text-sm text-gray-500">Sensor Data Visualization</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/')}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>Dashboard</span>
              </button>
              
              <button 
                onClick={() => navigate('/anomaly-page')}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Anomalies</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading sensor data...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>Error loading sensor data: {error.message}</p>
          </div>
        ) : (
          <>
            {/* Filters Section */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Visualization Filters</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Time Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Range
                  </label>
                  <select
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                
                {/* Sensor Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sensor Type
                  </label>
                  <select
                    value={selectedSensorType}
                    onChange={(e) => setSelectedSensorType(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {sensorTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Room Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rooms (Select multiple)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((room) => (
                      <button
                        key={room}
                        onClick={() => toggleRoomSelection(room)}
                        className={`px-3 py-1 text-sm rounded-full ${selectedRooms.includes(room) 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Time Series Chart */}
            <div className="mb-6">
              {selectedSensorType ? (
                <SensorTimeSeries 
                  data={timeSeriesData}
                  sensorType={selectedSensorType}
                  title={`Sensor Readings Over Time: ${selectedSensorType.replace(/([A-Z])/g, ' $1').trim()}`}
                  height={400}
                />
              ) : (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium mb-4">Sensor Readings Over Time</h3>
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-gray-500">Please select a sensor type</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Activity Heatmap and Anomaly Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ActivityHeatmap 
                data={activityData}
                title="Room Activity Patterns"
              />
              
              <AnomalyComparison 
                data={comparisonData}
                title="Normal vs. Anomalous Readings"
              />
            </div>
            
            {/* Data Insights Section */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Data Insights</h2>
              <p className="text-gray-600">
                The visualizations above show patterns in sensor data across different rooms and time periods. 
                Anomalous readings are highlighted to help identify potential issues or changes in behavior patterns.
              </p>
              
              <div className="mt-4 border-t pt-4">
                <h3 className="text-md font-medium mb-2">Tips for Interpretation:</h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  <li>Red highlights and dots indicate anomalous readings that may require attention</li>
                  <li>Activity patterns that deviate from the usual schedule may indicate changes in routine</li>
                  <li>Compare normal vs. anomalous readings to understand what triggered the anomaly detection</li>
                  <li>Use the room filter to focus on specific areas of concern</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Care Agents | Smart Home Monitoring for Elderly Care
          </p>
        </div>
      </footer>
    </div>
  );
}
