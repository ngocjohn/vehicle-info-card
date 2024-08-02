import { localize } from '../localize/localize';

export interface CardItem {
  key: string;
  name: string;
  icon?: string;
  apexProp?: string;
}

const createShowOpts = (nameKey: string, lang: string, configKey: string) => ({
  label: localize(nameKey, lang),
  configKey,
});

export const editorShowOpts = (lang: string) => [
  createShowOpts('editor.showOpts.show_slides', lang, 'show_slides'),
  createShowOpts('editor.showOpts.show_buttons', lang, 'show_buttons'),
  createShowOpts('editor.showOpts.show_map', lang, 'show_map'),
  createShowOpts('editor.showOpts.show_background', lang, 'show_background'),
  createShowOpts('editor.showOpts.enable_map_popup', lang, 'enable_map_popup'),
  createShowOpts('editor.showOpts.enable_services_control', lang, 'enable_services_control'),
  createShowOpts('editor.showOpts.show_error_notify', lang, 'show_error_notify'),
];

const createCard = (type: string, nameKey: string, icon: string, config: string, editor: string, lang: string) => ({
  type,
  name: localize(nameKey, lang),
  icon,
  config,
  editor,
});

const createItem = (key: string, nameKey: string, lang: string, icon?: string, apexProp?: string): CardItem => ({
  key,
  name: localize(nameKey, lang),
  ...(icon ? { icon } : {}),
  ...(apexProp ? { apexProp } : {}),
});

export const cardTypes = (lang: string) => [
  createCard('tripCards', 'cardType.tripCards', 'mdi:map-marker-path', 'trip_card', 'isTripCardEditor', lang),
  createCard('vehicleCards', 'cardType.vehicleCards', 'mdi:car-info', 'vehicle_card', 'isVehicleCardEditor', lang),
  createCard('ecoCards', 'cardType.ecoCards', 'mdi:leaf', 'eco_card', 'isEcoCardEditor', lang),
  createCard('tyreCards', 'cardType.tyreCards', 'mdi:tire', 'tyre_card', 'isTyreCardEditor', lang),
];

export const tripOverview = (lang: string): CardItem[] => [
  createItem('odometer', 'tripCard.odometer', lang, 'mdi:counter'),
  createItem('fuelLevel', 'tripCard.fuelLevel', lang),
  createItem('adBlueLevel', 'tripCard.adBlueLevel', lang, 'mdi:fuel'),
  createItem('rangeLiquid', 'tripCard.rangeLiquid', lang),
  createItem('rangeElectric', 'tripCard.rangeElectric', lang),
  createItem('soc', 'tripCard.soc', lang),
  createItem('maxSoc', 'tripCard.maxSoc', lang),
];

export const tripFromReset = (lang: string): CardItem[] => [
  createItem('distanceReset', 'tripCard.distanceReset', lang),
  createItem('drivenTimeReset', 'tripCard.drivenTimeReset', lang, 'mdi:clock'),
  createItem('averageSpeedReset', 'tripCard.averageSpeedReset', lang, 'mdi:speedometer'),
  createItem('liquidConsumptionReset', 'tripCard.liquidConsumptionReset', lang),
  createItem('electricConsumptionReset', 'tripCard.electricConsumptionReset', lang),
];

export const tripFromStart = (lang: string): CardItem[] => [
  createItem('distanceStart', 'tripCard.distanceStart', lang),
  createItem('drivenTimeStart', 'tripCard.drivenTimeStart', lang, 'mdi:clock'),
  createItem('averageSpeedStart', 'tripCard.averageSpeedStart', lang, 'mdi:speedometer-slow'),
  createItem('liquidConsumptionStart', 'tripCard.liquidConsumptionStart', lang),
  createItem('electricConsumptionStart', 'tripCard.electricConsumptionStart', lang),
];

export const vehicleOverview = (lang: string): CardItem[] => [
  createItem('lockSensor', 'vehicleCard.lockSensor', lang),
  createItem('windowsClosed', 'vehicleCard.windowsClosed', lang),
  createItem('doorStatusOverall', 'vehicleCard.doorStatusOverall', lang, 'mdi:car-door-lock'),
  createItem('parkBrake', 'vehicleCard.parkBrake', lang),
  createItem('ignitionState', 'vehicleCard.ignitionState', lang),
];

export const vehicleWarnings = (lang: string): CardItem[] => [
  createItem('starterBatteryState', 'vehicleCard.starterBatteryState', lang),
  createItem('lowCoolantLevel', 'vehicleCard.lowCoolantLevel', lang, 'mdi:car-coolant-level'),
  createItem('lowBrakeFluid', 'vehicleCard.lowBrakeFluid', lang, 'mdi:car-brake-fluid-level'),
  createItem('lowWashWater', 'vehicleCard.lowWashWater', lang),
  createItem('tirePressureWarning', 'vehicleCard.tirePressureWarning', lang),
  createItem('engineLight', 'vehicleCard.engineLight', lang),
];

export const ecoScores = (lang: string): CardItem[] => [
  createItem('ecoScoreBonusRange', 'ecoCard.ecoScoreBonusRange', lang, undefined, 'bonusRange'),
  createItem('ecoScoreAcceleraion', 'ecoCard.ecoScoreAcceleraion', lang, undefined, 'acceleration'),
  createItem('ecoScoreConstant', 'ecoCard.ecoScoreConstant', lang, undefined, 'constant'),
  createItem('ecoScoreFreeWheel', 'ecoCard.ecoScoreFreeWheel', lang, undefined, 'freeWheel'),
];

export const tyrePressures = (lang: string): CardItem[] => [
  createItem('tirePressureFrontLeft', 'tyreCard.tirePressureFrontLeft', lang, 'mdi:tire'),
  createItem('tirePressureFrontRight', 'tyreCard.tirePressureFrontRight', lang, 'mdi:tire'),
  createItem('tirePressureRearLeft', 'tyreCard.tirePressureRearLeft', lang, 'mdi:tire'),
  createItem('tirePressureRearRight', 'tyreCard.tirePressureRearRight', lang, 'mdi:tire'),
];

export const tyreAttributes = [
  'tirePressureFrontRight',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
];

export const chargingOverview = (lang: string): CardItem[] => [
  createItem('chargingPower', 'chargingOverview.chargingPower', lang, 'mdi:flash'),
  createItem('soc', 'chargingOverview.soc', lang),
  createItem('maxSoc', 'chargingOverview.maxSoc', lang),
  createItem('selectedProgram', 'chargingOverview.selectedProgram', lang, 'mdi:ev-station'),
];
