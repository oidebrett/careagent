import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnomalyLog as AnomalyLogComponent } from "./AnomalyLog";
import { 
  AnomalyLog as AnomalyLogType, 
  SeverityLevel, 
  ReviewStatus, 
  filterAnomaliesByStatus,
  filterAnomaliesBySeverity
} from "../utils/sensorData";

interface Props {
  anomalies: AnomalyLogType[];
  onSelectAnomaly?: (anomaly: AnomalyLogType) => void;
  title?: string;
  compact?: boolean;
  showFilters?: boolean;
  showBackToDashboard?: boolean;
}

export function AnomalyList({ 
  anomalies, 
  onSelectAnomaly, 
  title = "Anomalies", 
  compact = false,
  showFilters = true,
  showBackToDashboard = true
}: Props) {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | undefined>();
  const [statusFilter, setStatusFilter] = useState<'normal' | 'anomalous' | undefined>();

  // Apply filters
  let filteredAnomalies = [...anomalies];
  filteredAnomalies = filterAnomaliesBySeverity(filteredAnomalies, severityFilter);

  // Filter by estimate (normal/anomalous)
  if (statusFilter) {
    filteredAnomalies = filterAnomaliesByStatus(filteredAnomalies, statusFilter);
  }

  // Sort by timestamp (newest first)
  filteredAnomalies.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAnomalies.length} {filteredAnomalies.length === 1 ? 'anomaly' : 'anomalies'} detected
            </p>
          </div>
          {showBackToDashboard && (
            <button
              onClick={() => navigate('/')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
      
      {showFilters && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <div>
              <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                id="severity-filter"
                className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={severityFilter || ''}
                onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel || undefined)}
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                className="rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || undefined)}
              >
                <option value="">All Statuses</option>
                <option value="normal">Normal</option>
                <option value="anomalous">Anomalous</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {filteredAnomalies.length === 0 ? (
        <div className="p-4 text-gray-500 text-center">
          No anomalies found matching the current filters.
        </div>
      ) : (
        <div className={compact ? "divide-y divide-gray-200" : "p-4"}>
          {filteredAnomalies.map((anomaly) => (
            <div key={anomaly.id} className={compact ? "p-4" : undefined}>
              <AnomalyLogComponent 
                anomaly={anomaly} 
                onSelect={onSelectAnomaly}
                compact={compact}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


