export const tripOverview = [
  { key: 'odometer' },
  { key: 'fuelLevel' },
  { key: 'rangeLiquid', name: 'Range' },
  { key: 'rangeElectric', name: 'Range' },
  { key: 'soc' },
  { key: 'maxSoc' },
];

export const tripFromReset = [
  { key: 'distanceReset' },
  { key: 'averageSpeedReset', icon: 'mdi:speedometer' },
  { key: 'liquidConsumptionReset', name: 'Consumption reset' },
  { key: 'electricConsumptionReset', name: 'Consumption reset' },
];

export const tripFromStart = [
  { key: 'distanceStart' },
  { key: 'averageSpeedStart', icon: 'mdi:speedometer-slow' },
  { key: 'liquidConsumptionStart', name: 'Consumption start' },
  { key: 'electricConsumptionStart', name: 'Consumption start' },
];

export const vehicleOverview = [
  { key: 'lockSensor', name: 'Lock status' },
  { key: 'windowsClosed' },
  { key: 'parkBrake' },
  { key: 'ignitionState' },
];

export const vehicleWarnings = [
  { key: 'lowCoolantLevel' },
  { key: 'lowBrakeFluid' },
  { key: 'lowWashWater' },
  { key: 'tirePressureWarning' },
  { key: 'engineLight' },
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
