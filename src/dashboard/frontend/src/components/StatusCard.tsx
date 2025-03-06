import React from "react";

interface Props {
  title: string;
  value: string | number;
  description?: string;
  type?: "default" | "warning" | "critical" | "success";
  icon?: React.ReactNode;
}

export function StatusCard({ title, value, description, type = "default", icon }: Props) {
  const getBackground = () => {
    switch (type) {
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "critical":
        return "bg-red-50 border-red-200";
      case "success":
        return "bg-green-50 border-green-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  const getValueColor = () => {
    switch (type) {
      case "warning":
        return "text-amber-700";
      case "critical":
        return "text-red-700";
      case "success":
        return "text-green-700";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${getBackground()}`}
    >
      <div className="flex justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className={`mt-2 text-3xl font-bold ${getValueColor()}`}>
        {value}
      </div>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}