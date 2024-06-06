import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor, Themes } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}
// TODO Add your configuration elements here for type-checking

// Extend the existing Themes interface
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
  show_map_popup?: boolean;
  vehicle_card?: LovelaceCardConfig[];
  trip_card?: LovelaceCardConfig[];
  eco_card?: LovelaceCardConfig[];
  tyre_card?: LovelaceCardConfig[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

// Define WarningEntity and TripEntity types
export type WarningEntity = {
  entity_id: string;
  original_name: string;
};

export type TripEntity = {
  entity_id: string;
  original_name: string;
};

// Update WarningEntities and TripEntities to use the new types
export type WarningEntities = { [key: string]: WarningEntity };
export type TripEntities = { [key: string]: TripEntity };

export const warningEntityFilters: { [name in keyof Required<WarningEntities>]: { prefix: string; suffix: string } } = {
  lock: { prefix: 'lock.', suffix: '_lock' },
  parkBrake: { prefix: 'binary_sensor.', suffix: '_park_brake_status' },
  tire: { prefix: 'binary_sensor.', suffix: '_tire_warning' },
  lowBrakeFluid: { prefix: 'binary_sensor.', suffix: '_low_brake_fluid_warning' },
  lowCoolantLevel: { prefix: 'binary_sensor.', suffix: '_low_coolant_level_warning' },
  engineLight: { prefix: 'binary_sensor.', suffix: '_engine_light_warning' },
  lowWashWater: { prefix: 'binary_sensor.', suffix: '_low_wash_water_warning' },
  windowsClosed: { prefix: 'binary_sensor.', suffix: '_windows_closed' },
};

export const tripEntityFilters: { [name in keyof Required<TripEntities>]: { prefix: string; suffix: string } } = {
  averageSpeedReset: { prefix: 'sensor.', suffix: '_average_speed_reset' },
  averageSpeedStart: { prefix: 'sensor.', suffix: '_average_speed_start' },
  distanceReset: { prefix: 'sensor.', suffix: '_distance_reset' },
  distanceStart: { prefix: 'sensor.', suffix: '_distance_start' },
  liquidConsumptionReset: { prefix: 'sensor.', suffix: '_liquid_consumption_reset' },
  liquidConsumptionStart: { prefix: 'sensor.', suffix: '_liquid_consumption_start' },
  odometer: { prefix: 'sensor.', suffix: '_odometer' },
  rangeLiquid: { prefix: 'sensor.', suffix: '_range_liquid' },
  starterBatteryState: { prefix: 'sensor.', suffix: '_starter_battery_state' },
  fuelLevel: { prefix: 'sensor.', suffix: '_fuel_level' },
  ecoScoreAcceleraion: { prefix: 'sensor.', suffix: '_eco_score_acceleration' },
  ecoScoreBonusRange: { prefix: 'sensor.', suffix: '_eco_score_bonus_range' },
  ecoScoreConstant: { prefix: 'sensor.', suffix: '_eco_score_constant' },
  ecoScoreFreeWheel: { prefix: 'sensor.', suffix: '_eco_score_free_wheel' },
  ignitionState: { prefix: 'sensor.', suffix: '_ignition_state' },
  tirePressureFrontLeft: { prefix: 'sensor.', suffix: '_tire_pressure_front_left' },
  chargingPower: { prefix: 'sensor.', suffix: '_charging_power' },
  tirePressureFrontRight: { prefix: 'sensor.', suffix: '_tire_pressure_front_right' },
  tirePressureRearLeft: { prefix: 'sensor.', suffix: '_tire_pressure_rear_left' },
  tirePressureRearRight: { prefix: 'sensor.', suffix: '_tire_pressure_rear_right' },
  lock: { prefix: 'sensor.', suffix: '_lock' },
};
