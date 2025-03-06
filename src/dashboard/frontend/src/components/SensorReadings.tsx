import React from "react";
import { SensorDetail } from "../utils/sensorData";

interface Props {
  readings: Record<string, SensorDetail>;
  title?: string;
}

export function SensorReadings({ readings, title = "Latest Sensor Readings" }: Props) {
  const formatSensorValue = (detail: SensorDetail) => {
    const attributeType = Object.keys(detail.attribute)[0];
    const attributeValues = detail.attribute[attributeType];
    
    switch (attributeType) {
      case "RelativeHumidityMeasurement":
        return `${(attributeValues.MeasuredValue / 100).toFixed(2)}%`;
      case "TemperatureMeasurement":
        return `${(attributeValues.MeasuredValue / 100).toFixed(2)}°C`;
      case "OccupancySensing":
        return attributeValues.Occupancy ? "Occupied" : "Unoccupied";
      case "OnOff":
        return attributeValues.OnOff ? "On" : "Off";
      case "FlowMeasurement":
        return `${attributeValues.MeasuredValue} ml/min`;
      default:
        return JSON.stringify(attributeValues);
    }
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case "RelativeHumidityMeasurement":
        return "💧";
      case "TemperatureMeasurement":
        return "🌡️";
      case "OccupancySensing":
        return "👤";
      case "OnOff":
        return "🔌";
      case "FlowMeasurement":
        return "🚰";
      default:
        return "📊";
    }
  };
  
  const getSensorLabel = (type: string) => {
    switch (type) {
      case "RelativeHumidityMeasurement":
        return "Humidity";
      case "TemperatureMeasurement":
        return "Temperature";
      case "OccupancySensing":
        return "Occupancy";
      case "OnOff":
        return "Power Status";
      case "FlowMeasurement":
        return "Water Flow";
      default:
        return type;
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      
      {Object.keys(readings).length === 0 ? (
        <div className="p-4">
          <p className="text-gray-500">No sensor readings available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(readings).map(([type, detail]) => {
            const date = new Date(detail.timestamp * 1000);
            return (
              <div key={type} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center">
                  <span className="mr-2 text-xl">{getSensorIcon(type)}</span>
                  <h3 className="font-medium">{getSensorLabel(type)}</h3>
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {formatSensorValue(detail)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {detail.room} · {date.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
