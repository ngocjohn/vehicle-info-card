import { version, repository } from '../../package.json';
import { VehicleCardConfig } from '../types';

export const CARD_VERSION = `v${version}`;
export const REPOSITORY = repository.repo;
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
  rangeElectric: { suffix: '_rangeelectrickm' },
  rangeLiquid: { suffix: '_rangeliquid' },
  soc: { prefix: 'sensor.', suffix: 'soc' },
  starterBatteryState: { suffix: '_starterbatterystate' },
  tirePressureFrontLeft: { suffix: '_tirepressurefrontleft' },
  tirePressureFrontRight: { suffix: '_tirepressurefrontright' },
  tirePressureRearLeft: { suffix: '_tirepressurerearleft' },
  tirePressureRearRight: { suffix: '_tirepressurerearright' },
  sunroofStatus: { suffix: '_sunroofstatus' },
};

export const combinedFilters = { ...binarySensorsFilters, ...sensorDeviceFilters };

// Default configuration for the Vehicle Card.

export const defaultConfig: Partial<VehicleCardConfig> = {
  type: 'custom:vehicle-info-card',
  name: 'Mercedes Vehicle Card',
  entity: '',
  model_name: '',
  selected_language: 'system',
  show_slides: false,
  show_map: false,
  show_buttons: true,
  show_background: true,
  enable_map_popup: false,
  enable_services_control: false,
  show_error_notify: false,
  device_tracker: '',
  map_popup_config: {
    hours_to_show: 0,
    default_zoom: 14,
    theme_mode: 'auto',
  },
  selected_theme: {
    theme: 'default',
    mode: 'auto',
  },
  extra_configs: {
    tire_background: '',
  },
  button_grid: {
    use_swiper: false,
    rows_size: 2,
  },
  services: {
    auxheat: false,
    charge: false,
    doorsLock: false,
    engine: false,
    preheat: false,
    sendRoute: false,
    sigPos: false,
    sunroof: false,
    windows: false,
  },
  eco_button: {
    enabled: false,
  },
  trip_button: {
    enabled: false,
  },
  vehicle_button: {
    enabled: false,
  },
  tyre_button: {
    enabled: false,
  },
  use_custom_cards: {
    vehicle_card: true,
    trip_card: true,
    eco_card: true,
    tyre_card: true,
  },
};
