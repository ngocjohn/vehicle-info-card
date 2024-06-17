import { version } from '../package.json';

export const CARD_VERSION = version;

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

/**
 * Filters for binary sensors.
 */
export const binarySensorsFilters: {
  [key: string]: { prefix?: string; suffix: string };
} = {
  lock: { prefix: 'lock', suffix: '_lock' },
  parkBrake: { suffix: '_parkbrakestatus' },
  liquidRangeCritical: { suffix: '_liquidrangecritical' },
  lowBrakeFluid: { suffix: '_warningbrakefluid' },
  lowWashWater: { suffix: '_warningwashwater' },
  lowCoolantLevel: { suffix: '_warningcoolantlevellow' },
  engineLight: { suffix: '_warningenginelight' },
  windowsClosed: { suffix: '_windowstatusoverall' },
  tirePressureWarning: { suffix: '_tirewarninglamp' },
  remoteStartActive: { suffix: '_remotestartactive' },
  engineState: { suffix: '_enginestate' },
  chargeFlapACStatus: { suffix: '_chargeflapacstatus' },
};

/**
 * Filters for sensor devices.
 */
export const sensorDeviceFilters: {
  [key: string]: { prefix?: string; suffix: string };
} = {
  lockSensor: { prefix: 'sensor.', suffix: '_lock' },
  averageSpeedReset: { suffix: '_averagespeedreset' },
  averageSpeedStart: { suffix: '_averagespeedstart' },
  distanceReset: { suffix: '_distancereset' },
  distanceStart: { suffix: '_distancestart' },
  liquidConsumptionReset: { suffix: '_liquidconsumptionreset' },
  liquidConsumptionStart: { suffix: '_liquidconsumptionstart' },
  electricConsumptionReset: { suffix: '_electricconsumptionreset' },
  electricConsumptionStart: { suffix: '_electricconsumptionstart' },
  odometer: { suffix: '_odometer' },
  rangeLiquid: { suffix: '_rangeliquid' },
  rangeElectric: { suffix: '_rangeelectrickm' },
  fuelLevel: { suffix: '_tanklevelpercent' },
  adBlueLevel: { suffix: '_tankleveladblue' },
  ecoScoreTotal: { suffix: '_ecoscoretotal' },
  ecoScoreFreeWheel: { suffix: '_ecoscorefreewhl' },
  ecoScoreBonusRange: { suffix: '_ecoscorebonusrange' },
  ecoScoreConstant: { suffix: '_ecoscoreconst' },
  ecoScoreAcceleraion: { suffix: '_ecoscoreaccel' },
  starterBatteryState: { suffix: '_starterbatterystate' },
  ignitionState: { suffix: '_ignitionstate' },
  tirePressureRearLeft: { suffix: '_tirepressurerearleft' },
  tirePressureRearRight: { suffix: '_tirepressurerearright' },
  tirePressureFrontLeft: { suffix: '_tirepressurefrontleft' },
  tirePressureFrontRight: { suffix: '_tirepressurefrontright' },
  maxSoc: { prefix: 'sensor.', suffix: '_max_state_of_charge' },
  soc: { prefix: 'sensor.', suffix: 'soc' },
  chargingPower: { suffix: '_chargingpowerkw' },
};

export const combinedFilters = { ...binarySensorsFilters, ...sensorDeviceFilters };
