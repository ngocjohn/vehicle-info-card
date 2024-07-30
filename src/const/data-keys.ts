import { localize } from '../localize/localize';

export const cardTypes = [
  {
    type: 'tripCards',
    name: localize('cardType.tripCards'),
    icon: 'mdi:map-marker-path',
    config: 'trip_card',
    editor: 'isTripCardEditor',
  },
  {
    type: 'vehicleCards',
    name: localize('cardType.vehicleCards'),
    icon: 'mdi:car-info',
    config: 'vehicle_card',
    editor: 'isVehicleCardEditor',
  },
  {
    type: 'ecoCards',
    name: localize('cardType.ecoCards'),
    icon: 'mdi:leaf',
    config: 'eco_card',
    editor: 'isEcoCardEditor',
  },
  {
    type: 'tyreCards',
    name: localize('cardType.tyreCards'),
    icon: 'mdi:tire',
    config: 'tyre_card',
    editor: 'isTyreCardEditor',
  },
];

export const tripOverview = [
  { key: 'odometer', name: localize('tripCard.odometer'), icon: 'mdi:counter' },
  { key: 'fuelLevel', name: localize('tripCard.fuelLevel') },
  { key: 'adBlueLevel', icon: 'mdi:fuel', name: localize('tripCard.adBlueLevel') },
  { key: 'rangeLiquid', name: localize('tripCard.rangeLiquid') },
  { key: 'rangeElectric', name: localize('tripCard.rangeElectric') },
  { key: 'soc', name: localize('tripCard.soc') },
  { key: 'maxSoc', name: localize('tripCard.maxSoc') },
];

export const tripFromReset = [
  { key: 'distanceReset', name: localize('tripCard.distanceReset') },
  { key: 'drivenTimeReset', name: localize('tripCard.drivenTimeReset'), icon: 'mdi:clock' },
  { key: 'averageSpeedReset', icon: 'mdi:speedometer', name: localize('tripCard.averageSpeedReset') },
  { key: 'liquidConsumptionReset', name: localize('tripCard.liquidConsumptionReset') },
  { key: 'electricConsumptionReset', name: localize('tripCard.electricConsumptionReset') },
];

export const tripFromStart = [
  { key: 'distanceStart', name: localize('tripCard.distanceStart') },
  { key: 'drivenTimeStart', name: localize('tripCard.drivenTimeStart'), icon: 'mdi:clock' },
  { key: 'averageSpeedStart', icon: 'mdi:speedometer-slow', name: localize('tripCard.averageSpeedStart') },
  { key: 'liquidConsumptionStart', name: localize('tripCard.liquidConsumptionStart') },
  { key: 'electricConsumptionStart', name: localize('tripCard.electricConsumptionStart') },
];

export const vehicleOverview = [
  { key: 'lockSensor', name: localize('vehicleCard.lockSensor') },
  { key: 'windowsClosed', name: localize('vehicleCard.windowsClosed') },
  { key: 'doorStatusOverall', name: localize('vehicleCard.doorStatusOverall') },
  { key: 'parkBrake', name: localize('vehicleCard.parkBrake') },
  { key: 'ignitionState', name: localize('vehicleCard.ignitionState') },
];

export const vehicleWarnings = [
  { key: 'starterBatteryState', name: localize('vehicleCard.starterBatteryState') },
  { key: 'lowCoolantLevel', icon: 'mdi:car-coolant-level', name: localize('vehicleCard.lowCoolantLevel') },
  { key: 'lowBrakeFluid', icon: 'mdi:car-brake-fluid-level', name: localize('vehicleCard.lowBrakeFluid') },
  { key: 'lowWashWater', name: localize('vehicleCard.lowWashWater') },
  { key: 'tirePressureWarning', name: localize('vehicleCard.tirePressureWarning') },
  { key: 'engineLight', name: localize('vehicleCard.engineLight') },
];

export const ecoScores = [
  { key: 'ecoScoreBonusRange', name: localize('ecoCard.ecoScoreBonusRange'), apexProp: 'bonusRange' },
  { key: 'ecoScoreAcceleraion', apexProp: 'acceleration', name: localize('ecoCard.ecoScoreAcceleraion') },
  { key: 'ecoScoreConstant', apexProp: 'constant', name: localize('ecoCard.ecoScoreConstant') },
  { key: 'ecoScoreFreeWheel', apexProp: 'freeWheel', name: localize('ecoCard.ecoScoreFreeWheel') },
];

export const tyrePressures = [
  { key: 'tirePressureFrontLeft', icon: 'mdi:tire', name: localize('tyreCard.tirePressureFrontLeft') },
  { key: 'tirePressureFrontRight', icon: 'mdi:tire', name: localize('tyreCard.tirePressureFrontRight') },
  { key: 'tirePressureRearLeft', icon: 'mdi:tire', name: localize('tyreCard.tirePressureRearLeft') },
  { key: 'tirePressureRearRight', icon: 'mdi:tire', name: localize('tyreCard.tirePressureRearRight') },
];

export const tyreAttributes = [
  'tirePressureFrontRight',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
];

export const chargingOverview = [
  { key: 'chargingPower', icon: 'mdi:flash', name: localize('chargingOverview.chargingPower') },
  { key: 'soc', name: localize('chargingOverview.soc') },
  { key: 'maxSoc', name: localize('chargingOverview.maxSoc') },
  { key: 'selectedProgram', name: localize('chargingOverview.selectedProgram') },
];
