// Define a type for sensor types to maintain type safety
export type SensorType = 
  | 'RelativeHumidityMeasurement'
  | 'TemperatureMeasurement'
  | 'OccupancySensing'
  | 'OnOff'
  | 'FlowMeasurement'
  | 'EthernetNetworkDiagnostics'
  | 'GeneralDiagnostics'
  | 'SoftwareDiagnostics'
  | string; // Allow for future sensor types

// Map sensor types to their corresponding icons
export const sensorIcons: Record<string, string> = {
  // Environmental sensors
  RelativeHumidityMeasurement: '💧', // Water droplet for humidity
  TemperatureMeasurement: '🌡️',     // Thermometer for temperature
  FlowMeasurement: '🌊',            // Water wave for flow

  // State sensors
  OnOff: '⚡',                      // Lightning bolt for power state
  OccupancySensing: '👤',          // Person silhouette for occupancy

  // Diagnostic sensors
  EthernetNetworkDiagnostics: '🌐', // Globe for network
  GeneralDiagnostics: '⚙️',         // Gear for general diagnostics
  SoftwareDiagnostics: '💻',        // Laptop for software

  // Add more sensor types and icons here as needed
};

// Default icon for unknown sensor types
export const DEFAULT_SENSOR_ICON = '📊';

/**
 * Get the icon for a given sensor type
 * @param sensorType The type of the sensor
 * @returns The corresponding icon or the default icon if not found
 */
export const getSensorIcon = (sensorType: SensorType): string => {
  return sensorIcons[sensorType] || DEFAULT_SENSOR_ICON;
};