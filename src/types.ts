import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor, Themes } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
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

export interface AdditionalFormatMethods {
  formatEntityState: (stateObj: HassEntity) => string;
  formatAttributeName: (entityId: string, attribute: string) => string;
  formatEntityAttributeValue: (entityId: string, attribute: string) => string;
}

/**
 * Configuration interface for the Vehicle Card.
 */
export interface VehicleCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  entity?: string;
  device_tracker?: string;
  google_api_key?: string;
  images?: string[];
  show_slides?: boolean;
  show_map?: boolean;
  show_buttons?: boolean;
  show_background?: boolean;
  enable_map_popup?: boolean;
  enable_services_control?: boolean;
  services?: ServicesConfig;
  map_popup_config?: MapPopupConfig;
  vehicle_card?: LovelaceCardConfig[];
  trip_card?: LovelaceCardConfig[];
  eco_card?: LovelaceCardConfig[];
  tyre_card?: LovelaceCardConfig[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface MapPopupConfig {
  hours_to_show?: number;
  default_zoom?: number;
  theme_mode?: 'dark' | 'light' | 'auto';
}

export interface ServicesConfig {
  auxheat?: boolean;
  charge?: boolean;
  doorsLock?: boolean;
  engine?: boolean;
  preheat?: boolean;
  sendRoute?: boolean;
  sigPos?: boolean;
  sunroof?: boolean;
  windows?: boolean;
}

export const defaultConfig: Partial<VehicleCardConfig> = {
  type: 'custom:vehicle-info-card',
  name: 'Mercedes Benz',
  entity: '',
  show_slides: false,
  show_map: false,
  show_buttons: true,
  show_background: true,
  enable_map_popup: false,
  enable_services_control: false,
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
};

export interface VehicleEntities {
  [key: string]: VehicleEntity;
}

export interface VehicleEntity {
  entity_id: string;
  original_name: string;
  device_id?: string;
  unique_id?: string;
  translation_key?: string;
}

export interface EntityConfig {
  key: string;
  name?: string;
  icon?: string;
  unit?: string;
  state?: string;
  active?: boolean;
}

export interface EcoData {
  bonusRange: number;
  acceleration: number;
  constant: number;
  freeWheel: number;
}
