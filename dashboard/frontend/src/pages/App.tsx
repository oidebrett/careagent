import React, { startTransition } from "react";
import { useSensorData, getRecentSituations, getLatestSensorReadings, countAnomalies, countPendingAnomalies } from "../utils/sensorData";
import { StatusCard } from "components/StatusCard";
import { SituationList } from "components/SituationList";
import { SensorReadings } from "components/SensorReadings";
import { AnomalyList } from "components/AnomalyList";
import { useNavigate } from "react-router-dom";
import { useTransitionNavigate } from "../components/TransitionLink";

export default function App() {
  const navigate = useNavigate();
  const transitionNavigate = useTransitionNavigate();
  const { data, anomalyLogs, loading, error } = useSensorData();
  const recentSituations = getRecentSituations(data, 5);
  const latestReadings = getLatestSensorReadings(data);
  const anomalyCount = countAnomalies(data);
  const pendingAnomalies = countPendingAnomalies(anomalyLogs);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Guardian Pulse</h1>
              <p className="text-sm text-gray-500">Smart home monitoring for elderly care</p>
            </div>
            {/* Placeholder for user menu/settings button */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => transitionNavigate('/anomaly-page')}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Anomalies</span>
                {pendingAnomalies > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {pendingAnomalies}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => transitionNavigate('/visualization-page')}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Visualizations</span>
              </button>
              
              <button className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Dashboard Overview</h2>
            
            {/* Status Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatusCard 
                title="Anomalies Detected" 
                value={anomalyCount}
                description="In the last 24 hours"
                type={anomalyCount > 0 ? "critical" : "success"}
              />
              
              <StatusCard 
                title="Sensors Active" 
                value={Object.keys(latestReadings).length}
                description="All sensors operational"
                type="success"
              />
              
              <StatusCard 
                title="Last Check" 
                value={data.length > 0 
                  ? new Date(Math.max(...data.map(i => i.situation.end_timestamp * 1000))).toLocaleTimeString() 
                  : "N/A"}
                description="System is monitoring"
              />
              
              <StatusCard 
                title="Situation Status" 
                value={anomalyCount > 0 ? "Attention Required" : "All Clear"}
                type={anomalyCount > 0 ? "warning" : "success"}
              />
            </div>
            
            {/* Main content area */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Sensor readings section - 2 columns on large screens */}
              <div className="lg:col-span-2">
                <SensorReadings readings={latestReadings} />
              </div>
              
              {/* Recent situations section - 1 column */}
              <div>
                <SituationList 
                  situations={recentSituations}
                  title="Recent Situations"
                />
              </div>
            </div>
            
            {/* Anomaly preview section */}
            <div className="mt-6">
              <AnomalyList 
                anomalies={anomalyLogs.filter(log => log.reviewStatus === 'pending').slice(0, 3)}
                onSelectAnomaly={() => transitionNavigate('/anomaly-page')}
                title="Recent Anomalies"
                showFilters={false}
                compact={true}
              />
              
              {anomalyLogs.filter(log => log.reviewStatus === 'pending').length > 3 && (
                <div className="mt-3 text-center">
                  <button 
                    onClick={() => transitionNavigate('/anomaly-page')}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View all anomalies
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Guardian Pulse | Smart Home Monitoring for Elderly Care
          </p>
        </div>
      </footer>
    </div>
  );
}