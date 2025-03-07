import React from "react";
import { SensorDetail } from "../utils/sensorData";
import { getSensorIcon } from "../utils/sensorIcons";

interface Props {
  readings: Record<string, SensorDetail>;
  title?: string;
}

export function SensorReadings({ readings, title = "Latest Sensor Readings" }: Props) {
  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    return String(value);
  };

  const formatSensorValue = (detail: SensorDetail) => {
    return Object.entries(detail.attribute)
      .map(([_, value]) => formatValue(value))
      .join(', ');
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white h-full flex flex-col">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      
      {Object.keys(readings).length === 0 ? (
        <div className="p-4">
          <p className="text-gray-500">No sensor readings available</p>
        </div>
      ) : (
        <div className="p-4 flex-1 flex flex-col">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.entries(readings).map(([type, detail]) => {
              const date = new Date(detail.timestamp * 1000);
              return (
                <div key={type} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate" title={type}>
                        {type}
                      </h3>
                      <div className="mt-1">
                        <div className="text-sm text-gray-700 break-words">
                          {formatSensorValue(detail)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {detail.room} · {date.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="text-xl ml-2 flex-shrink-0">{getSensorIcon(type)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
