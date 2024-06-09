import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor, Themes } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}
// TODO Add your configuration elements here for type-checking

// Define the ExtendedThemes interface by extending the existing Themes interface
export interface ExtendedThemes extends Themes {
  darkMode: boolean;
}

export interface VehicleCardConfig extends LovelaceCardConfig {
  type: string;
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

export type SensorDevice = {
  entity_id: string;
  original_name: string;
  device_id: string;
};

export type BinarySensorDevice = {
  entity_id: string;
  original_name: string;
  device_id: string;
};

// Update WarningEntities and TripEntities to use the new types
export type SensorDevices = { [key: string]: SensorDevice };
export type BinarySensors = { [key: string]: BinarySensorDevice };

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
  soc: { suffix: '_soc' },
  maxSoc: { suffix: '_max_soc' },
  chargingPower: { suffix: '_chargingPower' },
};
