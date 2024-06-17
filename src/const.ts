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

export const lockAttrMapping = {
  decklidstatus: { name: 'Deck lid', state: { false: 'closed', true: 'open' } },
  doorstatusfrontleft: { name: 'Door front left', state: { false: 'closed', true: 'open' } },
  doorstatusfrontright: { name: 'Door front right', state: { false: 'closed', true: 'open' } },
  doorstatusrearleft: { name: 'Door rear left', state: { false: 'closed', true: 'open' } },
  doorstatusrearright: { name: 'Door rear right', state: { false: 'closed', true: 'open' } },
  doorlockstatusfrontleft: { name: 'Door lock front left', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusfrontright: { name: 'Door lock front right', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusrearleft: { name: 'Door lock rear left', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusrearright: { name: 'Door lock rear right', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusgas: { name: 'Gas lock', state: { false: 'locked', true: 'unlocked' } },
  enginehoodstatus: { name: 'Engine hood', state: { false: 'closed', true: 'open' } },
  doorstatusoverall: {
    name: 'Door status overall',
    state: {
      '0': 'open',
      '1': 'closed',
      '2': 'not existing',
      '3': 'unknown',
    },
  },
  sunroofstatus: {
    name: 'Sunroof status',
    state: {
      '0': 'closed',
      '1': 'open',
      '2': 'lifting open',
      '3': 'running',
      '4': 'anti-booming position',
      '5': 'sliding intermediate',
      '6': 'lifting intermediate',
      '7': 'opening',
      '8': 'closing',
      '9': 'anti-booming lifting',
      '10': 'intermediate position',
      '11': 'opening lifting',
      '12': 'closing lifting',
    },
  },
};

export const lockStateMapping = {
  '0': 'Unlocked',
  '1': 'Locked int',
  '2': 'Locked',
  '3': 'Partly unlocked',
  '4': 'Unknown',
};

export const selectedProgramMapping = {
  '0': 'Standard',
  '1': 'Unknown',
  '2': 'Home',
  '3': 'Work',
};

export const windowsStateMapping = {
  windowstatusrearleft: { name: 'Window rear left', state: { 2: 'closed', 0: 'open' } },
  windowstatusrearright: { name: 'Window rear right', state: { 2: 'closed', 0: 'open' } },
  windowstatusfrontleft: { name: 'Window front left', state: { 2: 'closed', 0: 'open' } },
  windowstatusfrontright: { name: 'Window front right', state: { 2: 'closed', 0: 'open' } },
  windowstatusrearleftblind: { name: 'Window rear left blind', state: { 2: 'closed', 0: 'open' } },
  windowstatusrearrightblind: { name: 'Window rear right blind', state: { 2: 'closed', 0: 'open' } },
  windowstatusfrontleftblind: { name: 'Window front left blind', state: { 2: 'closed', 0: 'open' } },
  windowstatusfrontrightblind: { name: 'Window front right blind', state: { 2: 'closed', 0: 'open' } },
};

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
