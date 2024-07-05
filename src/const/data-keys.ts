export const cardTypes = [
  {
    type: 'tripCards',
    name: 'Trip data',
    icon: 'mdi:map-marker-path',
    config: 'trip_card',
  },
  {
    type: 'vehicleCards',
    name: 'Vehicle status',
    icon: 'mdi:car-info',
    config: 'vehicle_card',
  },
  {
    type: 'ecoCards',
    name: 'Eco display',
    icon: 'mdi:leaf',
    config: 'eco_card',
  },
  {
    type: 'tyreCards',
    name: 'Tyre pressure',
    icon: 'mdi:tire',
    config: 'tyre_card',
  },
];

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
  { key: 'drivenTimeReset' },
  { key: 'averageSpeedReset', icon: 'mdi:speedometer', name: 'Average speed' },
  { key: 'liquidConsumptionReset', name: 'Consumption reset' },
  { key: 'electricConsumptionReset', name: 'Consumption reset' },
];

export const tripFromStart = [
  { key: 'distanceStart', name: 'Distance traveled' },
  { key: 'drivenTimeStart' },
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
  { key: 'ecoScoreBonusRange', name: 'Bonus range', apexProp: 'bonusRange' },
  { key: 'ecoScoreAcceleraion', name: 'Acceleration', apexProp: 'acceleration' },
  { key: 'ecoScoreConstant', name: 'Constant', apexProp: 'constant' },
  { key: 'ecoScoreFreeWheel', name: 'Free wheel', apexProp: 'freeWheel' },
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
