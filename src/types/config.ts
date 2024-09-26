// Cutom card helpers:
import { ActionConfig, LovelaceCardConfig, Themes, HomeAssistant, Theme } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

export interface ModeSpecificTheme {
  light: Partial<Theme>;
  dark: Partial<Theme>;
}

export interface ExtendedTheme extends Theme {
  modes?: ModeSpecificTheme;
}

export interface ExtendedThemes extends Themes {
  darkMode: boolean;
  themes: {
    [key: string]: ExtendedTheme;
  };
}

/**
 * HomeAssistantExtended extends the existing HomeAssistant interface with additional properties.
 */

export type HomeAssistantExtended = HomeAssistant & {
  themes: ExtendedThemes;
  formatEntityState: (stateObj: HassEntity) => string;
  formatAttributeName: (entityId: string, attribute: string) => string;
  formatEntityAttributeValue: (entityId: HassEntity, attribute: string) => string;
};
/**
 * Configuration interface for the Vehicle Card.
 */

export type THEME_MODE = 'auto' | 'light' | 'dark';

export type Services = {
  auxheat: boolean;
  charge: boolean;
  doorsLock: boolean;
  engine: boolean;
  preheat: boolean;
  sendRoute: boolean;
  sigPos: boolean;
  sunroof: boolean;
  windows: boolean;
};

export type MapPopupConfig = {
  hours_to_show: number;
  default_zoom: number;
  theme_mode: THEME_MODE;
};

export type ImageConfig = {
  url: string;
  title: string;
};

export type ThemesConfig = {
  theme: string;
  mode: THEME_MODE;
};

export type ButtonGridConfig = {
  use_swiper: boolean;
  rows_size: number;
};

export type ButtonActionConfig = {
  entity: string;
  tap_action: ActionConfig;
  hold_action: ActionConfig;
  double_tap_action: ActionConfig;
};

export type BaseButtonConfig = {
  enabled: boolean;
  hide?: boolean;
  primary: string;
  secondary?: string;
  icon: string;
  notify?: string;
  button_type: 'default' | 'action';
  button_action: ButtonActionConfig;
  entity?: string;
  attribute?: string;
};

export type AddedCards = {
  [key: string]: {
    button: BaseButtonConfig;
    cards: LovelaceCardConfig[];
  };
};

export type CustomCardsUse = {
  vehicle_card: boolean;
  trip_card: boolean;
  eco_card: boolean;
  tyre_card: boolean;
};

export interface CustomCards extends VehicleCardConfig {
  vehicle_card?: LovelaceCardConfig[];
  trip_card?: LovelaceCardConfig[];
  eco_card?: LovelaceCardConfig[];
  tyre_card?: LovelaceCardConfig[];
}

export interface CustomButtonsConfig extends VehicleCardConfig {
  eco_button?: BaseButtonConfig;
  trip_button?: BaseButtonConfig;
  vehicle_button?: BaseButtonConfig;
  tyre_button?: BaseButtonConfig;
}

export interface ShowOptionsConfig extends VehicleCardConfig {
  show_slides: boolean;
  show_map: boolean;
  show_buttons: boolean;
  show_background: boolean;
  enable_map_popup: boolean;
  enable_services_control: boolean;
  show_error_notify: boolean;
}

export type ExtraConfigs = {
  tire_background: string;
};

export interface VehicleCardConfig extends LovelaceCardConfig {
  type: string;
  entity: string;
  name?: string;
  device_tracker?: string;
  google_api_key?: string;
  selected_language?: string | null;
  model_name: string;
  images: ImageConfig[];
  services: Services;
  button_grid: ButtonGridConfig;
  map_popup_config: MapPopupConfig;
  selected_theme: ThemesConfig;
  use_custom_cards?: CustomCardsUse;
  added_cards: AddedCards;
  extra_configs: ExtraConfigs;
}

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

export type ButtonCardEntity = {
  key: string;
  default_name?: string;
  default_icon?: string;
  button: {
    button_action: ButtonActionConfig;
    icon: string;
    primary: string;
    secondary: string;
    attribute: string;
    entity: string;
    notify: string;
    hidden: boolean;
  };
  button_type: 'default' | 'action';
  card_type: 'default' | 'custom';
  custom_card: LovelaceCardConfig[];
  custom_button: boolean;
};

export type CustomButtonEntity = {
  enabled: boolean;
  hide: boolean;
  primary: string;
  secondary: string;
  icon: string;
  notify: boolean;
  button_type: 'default' | 'action';
  button_action: ButtonActionConfig;
  entity: string;
  attribute: string;
};

export type ExtendedButtonConfigItem = BaseButtonConfig & {
  isDefaultCard?: boolean;
  isHidden?: boolean;
  useCustomButton?: boolean;
};
