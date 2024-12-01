import { version, repository } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const CARD_UPADE_SENSOR = 'update.vehicle_info_card_update';
export const REPOSITORY = repository.repo;

export const PREVIEW_CONFIG_TYPES = ['btn_preview', 'card_preview', 'tire_preview'];

/**
 * Filters for binary sensors.
 */
const binarySensorsFilters: {
  [key: string]: { prefix?: string; suffix: string };
} = {
  lock: { prefix: 'lock', suffix: '_lock' },
  parkBrake: { suffix: '_parkbrakestatus' },
  liquidRangeCritical: { suffix: '_liquidrangecritical' },
  lowBrakeFluid: { suffix: '_warningbrakefluid' },
  lowWashWater: { suffix: '_warningwashwater' },
  lowCoolantLevel: { suffix: '_warningcoolantlevellow' },
  windowsClosed: { suffix: '_windowstatusoverall' },
  tirePressureWarning: { suffix: '_tirewarninglamp' },
  remoteStartActive: { suffix: '_remotestartactive' },
  engineState: { suffix: '_enginestate' },
  chargeFlapACStatus: { suffix: '_chargeflapacstatus' },
};

/**
 * Filters for sensor devices.
 */
const sensorDeviceFilters: {
  [key: string]: { prefix?: string; suffix: string };
} = {
  adBlueLevel: { suffix: '_tankleveladblue' },
  averageSpeedReset: { suffix: '_averagespeedreset' },
  averageSpeedStart: { suffix: '_averagespeedstart' },
  chargeFlapDCStatus: { suffix: '_chargeflapdcstatus' },
  chargingPower: { suffix: '_chargingpowerkw' },
  distanceReset: { suffix: '_distancereset' },
  distanceStart: { suffix: '_distancestart' },
  distanceZEReset: { suffix: '_distancezereset' },
  distanceZEStart: { suffix: '_distancezestart' },
  ecoScoreAcceleraion: { suffix: '_ecoscoreaccel' },
  ecoScoreBonusRange: { suffix: '_ecoscorebonusrange' },
  ecoScoreConstant: { suffix: '_ecoscoreconst' },
  ecoScoreFreeWheel: { suffix: '_ecoscorefreewhl' },
  ecoScoreTotal: { suffix: '_ecoscoretotal' },
  electricConsumptionReset: { suffix: '_electricconsumptionreset' },
  electricConsumptionStart: { suffix: '_electricconsumptionstart' },
  fuelLevel: { suffix: '_tanklevelpercent' },
  ignitionState: { suffix: '_ignitionstate' },
  liquidConsumptionReset: { suffix: '_liquidconsumptionreset' },
  liquidConsumptionStart: { suffix: '_liquidconsumptionstart' },
  lockSensor: { prefix: 'sensor.', suffix: '_lock' },
  maxSoc: { prefix: 'sensor.', suffix: '_max_state_of_charge' },
  odometer: { suffix: '_odometer' },
  precondStatus: { suffix: '_preclimatestatus' },
  rangeElectric: { suffix: '_rangeelectrickm' },
  rangeLiquid: { suffix: '_rangeliquid' },
  soc: { prefix: 'sensor.', suffix: 'soc' },
  starterBatteryState: { suffix: '_starterbatterystate' },
  sunroofStatus: { suffix: '_sunroofstatus' },
  tirePressureFrontLeft: { suffix: '_tirepressurefrontleft' },
  tirePressureFrontRight: { suffix: '_tirepressurefrontright' },
  tirePressureRearLeft: { suffix: '_tirepressurerearleft' },
  tirePressureRearRight: { suffix: '_tirepressurerearright' },
};

export const combinedFilters = { ...binarySensorsFilters, ...sensorDeviceFilters };
