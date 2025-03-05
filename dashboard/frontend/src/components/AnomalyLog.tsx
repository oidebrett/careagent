import React from "react";
import { AnomalyLog as AnomalyLogType, getSeverityColor, getStatusColor } from "../utils/sensorData";

interface Props {
  anomaly: AnomalyLogType;
  onSelect?: (anomaly: AnomalyLogType) => void;
  compact?: boolean;
}

export function AnomalyLog({ anomaly, onSelect, compact = false }: Props) {
  const date = new Date(anomaly.timestamp * 1000);
  
  const severityColorClass = getSeverityColor(anomaly.severityLevel);
  const statusColorClass = getStatusColor(anomaly.reviewStatus);

  const handleClick = () => {
    if (onSelect) {
      onSelect(anomaly);
    }
  };

  const getSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div 
      className={`rounded-lg border p-4 mb-4 ${compact ? 'hover:bg-gray-50' : 'border-gray-200 bg-white shadow-sm'}`}
      onClick={handleClick}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${anomaly.severityLevel === 'critical' ? 'animate-pulse' : ''}`} 
            style={{ backgroundColor: 
              anomaly.severityLevel === 'low' ? '#F59E0B' : 
              anomaly.severityLevel === 'medium' ? '#F97316' : 
              anomaly.severityLevel === 'high' ? '#EF4444' : 
              '#8B5CF6' // critical
            }} 
          />
          <h3 className="font-medium text-gray-900">
            {compact ? `Anomaly in ${anomaly.roomLocation}` : `Anomaly detected in ${anomaly.roomLocation}`}
          </h3>
        </div>
        <span className="text-sm text-gray-500">
          {date.toLocaleString()}
        </span>
      </div>
      
      <p className={`mt-2 text-gray-700 ${compact ? 'line-clamp-1' : ''}`}>
        {anomaly.description}
      </p>
      
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${severityColorClass}`}>
          {getSeverityLabel(anomaly.severityLevel)} Severity
        </span>
        
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColorClass}`}>
          {getStatusLabel(anomaly.reviewStatus)}
        </span>
        
        {!compact && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
            {Math.round(anomaly.detectionConfidence)}% Confidence
          </span>
        )}
        
        {anomaly.relatedSensors.map((sensor, index) => (
          <span key={index} className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
            {sensor}
          </span>
        ))}
      </div>
      
      {!compact && anomaly.reviewNotes && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <h4 className="text-sm font-medium text-gray-700">Review Notes</h4>
          <p className="mt-1 text-sm text-gray-600">{anomaly.reviewNotes}</p>
        </div>
      )}
      
      {!compact && onSelect && (
        <div className="mt-4 text-right">
          <button 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(anomaly);
            }}
          >
            Review Anomaly →
          </button>
        </div>
      )}
    </div>
  );
}