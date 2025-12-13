export const CAR_ENTITY_KEYS = [
  'lock',
  'parkBrake',
  'liquidRangeCritical',
  'lowBrakeFluid',
  'lowWashWater',
  'lowCoolantLevel',
  'windowsClosed',
  'tirePressureWarning',
  'remoteStartActive',
  'engineState',
  'chargeFlapACStatus',
  'adBlueLevel',
  'averageSpeedReset',
  'averageSpeedStart',
  'chargeFlapDCStatus',
  'chargingPower',
  'distanceReset',
  'distanceStart',
  'distanceZEReset',
  'distanceZEStart',
  'ecoScoreAcceleration',
  'ecoScoreBonusRange',
  'ecoScoreConstant',
  'ecoScoreFreeWheel',
  'ecoScoreTotal',
  'electricConsumptionReset',
  'electricConsumptionStart',
  'fuelLevel',
  'ignitionState',
  'liquidConsumptionReset',
  'liquidConsumptionStart',
  'lockSensor',
  'maxSoc',
  'odometer',
  'precondStatus',
  'rangeElectric',
  'rangeLiquid',
  'soc',
  'starterBatteryState',
  'sunroofStatus',
  'tirePressureFrontLeft',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
] as const;

export type CarEntityKey = (typeof CAR_ENTITY_KEYS)[number];

type CarEntityFilter = {
  [key in CarEntityKey]?: { prefix?: string; suffix: string };
};
/**
 * Filters for binary sensors.
 */
const binarySensorsFilters = {
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
const sensorDeviceFilters = {
  adBlueLevel: { suffix: '_tankleveladblue' },
  averageSpeedReset: { suffix: '_averagespeedreset' },
  averageSpeedStart: { suffix: '_averagespeedstart' },
  chargeFlapDCStatus: { suffix: '_chargeflapdcstatus' },
  chargingPower: { suffix: '_chargingpowerkw' },
  distanceReset: { suffix: '_distancereset' },
  distanceStart: { suffix: '_distancestart' },
  distanceZEReset: { suffix: '_distancezereset' },
  distanceZEStart: { suffix: '_distancezestart' },
  ecoScoreAcceleration: { suffix: '_ecoscoreaccel' },
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

export const combinedFilters = { ...binarySensorsFilters, ...sensorDeviceFilters } as CarEntityFilter;
