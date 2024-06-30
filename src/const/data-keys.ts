export const tripOverview = [
  { key: 'odometer', icon: 'mdi:counter' },
  { key: 'fuelLevel' },
  { key: 'adBlueLevel', icon: 'mdi:fuel' },
  { key: 'rangeLiquid', name: 'Range' },
  { key: 'rangeElectric', name: 'Range' },
  { key: 'soc' },
  { key: 'maxSoc' },
];

export const tripFromReset = [
  { key: 'distanceReset', name: 'Distance traveled' },
  { key: 'averageSpeedReset', icon: 'mdi:speedometer', name: 'Average speed' },
  { key: 'liquidConsumptionReset', name: 'Consumption reset' },
  { key: 'electricConsumptionReset', name: 'Consumption reset' },
];

export const tripFromStart = [
  { key: 'distanceStart', name: 'Distance traveled' },
  { key: 'averageSpeedStart', icon: 'mdi:speedometer-slow', name: 'Average speed' },
  { key: 'liquidConsumptionStart', name: 'Consumption start' },
  { key: 'electricConsumptionStart', name: 'Consumption start' },
];

export const vehicleOverview = [
  { key: 'lockSensor', name: 'Lock status' },
  { key: 'windowsClosed' },
  { key: 'doorStatusOverall' },
  { key: 'parkBrake' },
  { key: 'ignitionState' },
];

export const vehicleWarnings = [
  { key: 'starterBatteryState', name: 'Starter battery' },
  { key: 'lowCoolantLevel', name: 'Coolant', icon: 'mdi:car-coolant-level' },
  { key: 'lowBrakeFluid', name: 'Brake fluid', icon: 'mdi:car-brake-fluid-level' },
  { key: 'lowWashWater', name: 'Washer fluid' },
  { key: 'tirePressureWarning', name: 'Tire pressure' },
  { key: 'engineLight', name: 'Engine light' },
];

export const ecoScores = [
  { key: 'ecoScoreBonusRange', name: 'Bonus range' },
  { key: 'ecoScoreAcceleraion', name: 'Acceleration' },
  { key: 'ecoScoreConstant', name: 'Constant' },
  { key: 'ecoScoreFreeWheel', name: 'Free wheel' },
];

export const tyrePressures = [
  { key: 'tirePressureFrontLeft', name: 'Front left', icon: 'mdi:tire' },
  { key: 'tirePressureFrontRight', name: 'Front right', icon: 'mdi:tire' },
  { key: 'tirePressureRearLeft', name: 'Rear left', icon: 'mdi:tire' },
  { key: 'tirePressureRearRight', name: 'Rear right', icon: 'mdi:tire' },
];

export const tyreAttributes = [
  'tirePressureFrontRight',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
];

export const chargingOverview = [
  { key: 'chargingPower', name: 'Power', icon: 'mdi:flash' },
  { key: 'soc', name: 'Current state' },
  { key: 'maxSoc', name: 'Maximum' },
  { key: 'selectedProgram' },
];
