import type { FC } from "react";
import { useState } from "react";
import { useSensorData, countPendingAnomalies } from "../utils/sensorData";
import { AnomalyList } from "components/AnomalyList";
import { AnomalyDetail } from "components/AnomalyDetail";
import { AnomalyLog as AnomalyLogType, ReviewStatus } from "../utils/sensorData";
import { useNavigate } from "react-router-dom";

const AnomalyPage: FC = () => {
  const navigate = useNavigate();
  const { data, anomalyLogs, loading, error, updateAnomalyStatus } = useSensorData();
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyLogType | null>(null);

  const handleSelectAnomaly = (anomaly: AnomalyLogType) => {
    setSelectedAnomaly(anomaly);
  };

  const handleUpdateStatus = async (anomalyId: string, status: 'normal' | 'anomalous', notes?: string) => {
    await updateAnomalyStatus(anomalyId, status, notes);
    setSelectedAnomaly(null);
  };

  const handleCloseDetail = () => {
    setSelectedAnomaly(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Guardian Pulse</h1>
              <p className="text-sm text-gray-500">Review and manage detected anomalies</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/')}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </button>
              
              <button 
                onClick={() => navigate('/visualization-page')}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Visualizations</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading data...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>Error loading data: {error.message}</p>
          </div>
        ) : (
          <>
            {selectedAnomaly ? (
              <div className="grid grid-cols-1 gap-6">
                <AnomalyDetail 
                  anomaly={selectedAnomaly} 
                  onUpdateStatus={handleUpdateStatus}
                  onClose={handleCloseDetail}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <AnomalyList 
                  anomalies={anomalyLogs}
                  onSelectAnomaly={handleSelectAnomaly}
                  showBackToDashboard={false}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AnomalyPage;
