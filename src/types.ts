import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor, Themes } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}
/**
 * ExtendedThemes extends the existing Themes interface with additional properties.
 */
export interface ExtendedThemes extends Themes {
  darkMode: boolean;
}

/**
 * Configuration interface for the Vehicle Card.
 */
export interface VehicleCardConfig extends LovelaceCardConfig {
  name?: string;
  entity?: string;
  device_tracker?: string;
  google_api_key?: string;
  images?: string | string[];
  show_slides?: boolean;
  show_map?: boolean;
  show_buttons?: boolean;
  show_background?: boolean;
  enable_map_popup?: boolean;
  vehicle_card?: LovelaceCardConfig[];
  trip_card?: LovelaceCardConfig[];
  eco_card?: LovelaceCardConfig[];
  tyre_card?: LovelaceCardConfig[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export const defaultConfig: Partial<VehicleCardConfig> = {
  name: 'Mercedes Benz',
  entity: '',
  device_tracker: '',
  google_api_key: '',
  show_slides: false,
  show_map: false,
  show_buttons: true,
  show_background: true,
  enable_map_popup: false,
  images: [],
  trip_card: [],
  vehicle_card: [],
  eco_card: [],
  tyre_card: [],
};

export interface SensorDevice {
  entity_id: string;
  original_name: string;
  device_id: string;
}

export interface BinarySensorDevice {
  entity_id: string;
  original_name: string;
  device_id: string;
}

export interface SensorDevices {
  [key: string]: SensorDevice;
}

export interface BinarySensors {
  [key: string]: BinarySensorDevice;
}

/**
 * Filters for binary sensors.
 */
export const binarySensorsFilters: {
  [name in keyof Partial<BinarySensors>]: { prefix?: string; suffix: string };
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
  [name in keyof Partial<SensorDevices>]: { prefix?: string; suffix: string };
} = {
  lock: { prefix: 'sensor.', suffix: '_lock' },
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
  maxSoc: { suffix: '_max_soc' },
  soc: { suffix: '_soc' },
  chargingPower: { suffix: '_chargingPower' },
};
