import { localize } from '../localize/localize';

const createCard = (type: string, nameKey: string, icon: string, config: string, editor: string) => ({
  type,
  name: localize(nameKey),
  icon,
  config,
  editor,
});

const createItem = (key: string, nameKey: string, icon?: string, apexProp?: string) => ({
  key,
  name: localize(nameKey),
  ...(icon ? { icon } : {}),
  ...(apexProp ? { apexProp } : {}),
});

export const cardTypes = [
  createCard('tripCards', 'cardType.tripCards', 'mdi:map-marker-path', 'trip_card', 'isTripCardEditor'),
  createCard('vehicleCards', 'cardType.vehicleCards', 'mdi:car-info', 'vehicle_card', 'isVehicleCardEditor'),
  createCard('ecoCards', 'cardType.ecoCards', 'mdi:leaf', 'eco_card', 'isEcoCardEditor'),
  createCard('tyreCards', 'cardType.tyreCards', 'mdi:tire', 'tyre_card', 'isTyreCardEditor'),
];

export const tripOverview = [
  createItem('odometer', 'tripCard.odometer', 'mdi:counter'),
  createItem('fuelLevel', 'tripCard.fuelLevel'),
  createItem('adBlueLevel', 'tripCard.adBlueLevel', 'mdi:fuel'),
  createItem('rangeLiquid', 'tripCard.rangeLiquid'),
  createItem('rangeElectric', 'tripCard.rangeElectric'),
  createItem('soc', 'tripCard.soc'),
  createItem('maxSoc', 'tripCard.maxSoc'),
];

export const tripFromReset = [
  createItem('distanceReset', 'tripCard.distanceReset'),
  createItem('drivenTimeReset', 'tripCard.drivenTimeReset', 'mdi:clock'),
  createItem('averageSpeedReset', 'tripCard.averageSpeedReset', 'mdi:speedometer'),
  createItem('liquidConsumptionReset', 'tripCard.liquidConsumptionReset'),
  createItem('electricConsumptionReset', 'tripCard.electricConsumptionReset'),
];

export const tripFromStart = [
  createItem('distanceStart', 'tripCard.distanceStart'),
  createItem('drivenTimeStart', 'tripCard.drivenTimeStart', 'mdi:clock'),
  createItem('averageSpeedStart', 'tripCard.averageSpeedStart', 'mdi:speedometer-slow'),
  createItem('liquidConsumptionStart', 'tripCard.liquidConsumptionStart'),
  createItem('electricConsumptionStart', 'tripCard.electricConsumptionStart'),
];

export const vehicleOverview = [
  createItem('lockSensor', 'vehicleCard.lockSensor'),
  createItem('windowsClosed', 'vehicleCard.windowsClosed'),
  createItem('doorStatusOverall', 'vehicleCard.doorStatusOverall', 'mdi:car-door-lock'),
  createItem('parkBrake', 'vehicleCard.parkBrake'),
  createItem('ignitionState', 'vehicleCard.ignitionState'),
];

export const vehicleWarnings = [
  createItem('starterBatteryState', 'vehicleCard.starterBatteryState'),
  createItem('lowCoolantLevel', 'vehicleCard.lowCoolantLevel', 'mdi:car-coolant-level'),
  createItem('lowBrakeFluid', 'vehicleCard.lowBrakeFluid', 'mdi:car-brake-fluid-level'),
  createItem('lowWashWater', 'vehicleCard.lowWashWater'),
  createItem('tirePressureWarning', 'vehicleCard.tirePressureWarning'),
  createItem('engineLight', 'vehicleCard.engineLight'),
];

export const ecoScores = [
  createItem('ecoScoreBonusRange', 'ecoCard.ecoScoreBonusRange', undefined, 'bonusRange'),
  createItem('ecoScoreAcceleraion', 'ecoCard.ecoScoreAcceleraion', undefined, 'acceleration'),
  createItem('ecoScoreConstant', 'ecoCard.ecoScoreConstant', undefined, 'constant'),
  createItem('ecoScoreFreeWheel', 'ecoCard.ecoScoreFreeWheel', undefined, 'freeWheel'),
];

export const tyrePressures = [
  createItem('tirePressureFrontLeft', 'tyreCard.tirePressureFrontLeft', 'mdi:tire'),
  createItem('tirePressureFrontRight', 'tyreCard.tirePressureFrontRight', 'mdi:tire'),
  createItem('tirePressureRearLeft', 'tyreCard.tirePressureRearLeft', 'mdi:tire'),
  createItem('tirePressureRearRight', 'tyreCard.tirePressureRearRight', 'mdi:tire'),
];

export const tyreAttributes = [
  'tirePressureFrontRight',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
];

export const chargingOverview = [
  createItem('chargingPower', 'chargingOverview.chargingPower', 'mdi:flash'),
  createItem('soc', 'chargingOverview.soc'),
  createItem('maxSoc', 'chargingOverview.maxSoc'),
  createItem('selectedProgram', 'chargingOverview.selectedProgram', 'mdi:ev-station'),
];
