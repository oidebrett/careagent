import React, { useState, useMemo } from "react";
import { 
  AnomalyLog, 
  getSeverityColor, 
  extractRooms,
  SensorDataItem,
  parseSensorDetail 
} from "../utils/sensorData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/extensions/shadcn/components/select";

interface Props {
  anomaly: AnomalyLog;
  onUpdateStatus: (anomalyId: string, status: 'normal' | 'anomalous', notes?: string) => void;
  onClose?: () => void;
}

export function AnomalyDetail({ anomaly, onUpdateStatus, onClose }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<'normal' | 'anomalous'>(
    anomaly.reviewStatus === 'normal' || anomaly.reviewStatus === 'anomalous' 
      ? anomaly.reviewStatus 
      : 'anomalous'
  );
  const [notes, setNotes] = useState(anomaly.reviewNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log("Anomaly in Detail component:", {
    anomaly,
    situationDetails: anomaly.situation?.details,
  });

  // Extract rooms using the situation details
  const rooms = useMemo(() => {
    if (!anomaly.situation?.details) {
      console.log("No situation details found");
      return "Unknown Location";
    }

    try {
      // Parse each detail string to get room information
      const parsedDetails = anomaly.situation.details.map(detail => {
        const parsed = parseSensorDetail(detail);
        console.log("Parsed detail:", parsed);
        return parsed;
      });

      // Get unique rooms
      const uniqueRooms = new Set(parsedDetails.map(detail => detail.room));
      const roomList = Array.from(uniqueRooms);
      
      console.log("Found rooms:", roomList);
      
      return roomList.length > 0 ? roomList.join(", ") : "Unknown Location";
    } catch (error) {
      console.error("Error parsing room data:", error);
      return "Unknown Location";
    }
  }, [anomaly]);

  const date = new Date(anomaly.timestamp * 1000);
  const severityClass = getSeverityColor(anomaly.severityLevel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onUpdateStatus(anomaly.id, selectedStatus, notes);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-md">
      <div className="flex justify-between items-center border-b border-gray-200 p-4">
        <h2 className="text-lg font-medium">Anomaly Review</h2>
        {onClose && (
          <button 
            className="text-gray-500 hover:text-gray-700" 
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
      
      <div className="p-4">
        {/* Anomaly information */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-gray-900 text-lg">
              Anomaly in {rooms}
            </h3>
            <span className="text-sm text-gray-500">
              ID: {anomaly.id}
            </span>
          </div>
          
          <p className="mt-1 text-gray-600">
            Detected on {date.toLocaleDateString()} at {date.toLocaleTimeString()}
          </p>
          
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-gray-700">{anomaly.description}</p>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500 block">Severity Level</span>
              <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-sm font-medium ${severityClass}`}>
                {anomaly.severityLevel.charAt(0).toUpperCase() + anomaly.severityLevel.slice(1)}
              </span>
            </div>
            
            <div>
              <span className="text-sm text-gray-500 block">Detection Confidence</span>
              <div className="mt-1 flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${anomaly.detectionConfidence}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-700 ml-2">{Math.round(anomaly.detectionConfidence)}%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <span className="text-sm text-gray-500 block">Related Sensors</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {anomaly.relatedSensors.map((sensor, index) => (
                <span key={index} className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {sensor}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Review form */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4">
          <div className="mb-4">
            <label htmlFor="review-status" className="block text-sm font-medium text-gray-700 mb-1">
              Update Status
            </label>
            <Select 
              defaultValue={selectedStatus}
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as 'normal' | 'anomalous')}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedStatus === 'normal' ? 'Normal' : 'Anomalous'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="anomalous">Anomalous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="review-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Review Notes
            </label>
            <textarea
              id="review-notes"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder="Add notes about this anomaly..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex justify-end gap-3">
            {onClose && (
              <button
                type="button"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Anomaly"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
