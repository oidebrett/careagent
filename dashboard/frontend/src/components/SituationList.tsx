import React from "react";
import { SensorDataItem } from "../utils/sensorData";

interface Props {
  situations: SensorDataItem[];
  title?: string;
  emptyMessage?: string;
}

export function SituationList({
  situations,
  title = "Recent Situations",
  emptyMessage = "No situations to display",
}: Props) {
  if (!situations.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-medium">{title}</h2>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <ul className="divide-y divide-gray-200">
        {situations.map((item, index) => {
          const situation = item.situation;
          const startDate = new Date(situation.start_timestamp * 1000);
          const isAnomalous = item.estimate === "anomalous";
          
          return (
            <li key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-start">
                <div
                  className={`mr-3 mt-1 h-3 w-3 flex-shrink-0 rounded-full ${isAnomalous ? "bg-red-500" : "bg-green-500"}`}
                ></div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {isAnomalous ? "Anomalous Activity" : "Normal Activity"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {startDate.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {situation.situation_description}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isAnomalous ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                    >
                      {isAnomalous ? "Requires attention" : "All clear"}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
