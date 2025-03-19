// Cutom card helpers:
import { ActionConfig } from 'custom-card-helpers';

import { LovelaceCardConfig } from './ha-frontend/lovelace/lovelace';

/**
 * Configuration interface for the Vehicle Card.
 */

enum THEME_MODE {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

export enum SECTION {
  HEADER_INFO = 'header_info',
  IMAGES_SLIDER = 'images_slider',
  MINI_MAP = 'mini_map',
  BUTTONS = 'buttons',
}

export const SECTION_DEFAULT_ORDER = [SECTION.HEADER_INFO, SECTION.IMAGES_SLIDER, SECTION.MINI_MAP, SECTION.BUTTONS];

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

type MapPopupConfig = {
  hours_to_show: number;
  default_zoom: number;
  theme_mode: THEME_MODE;
  path_color?: string;
};

export type ImageConfig = {
  url: string;
  title: string;
};

type ThemesConfig = {
  theme: string;
  mode: THEME_MODE;
};

type ButtonGridConfig = {
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
  color_template?: string;
  icon_template?: string;
  picture_template?: string;
};

export type AddedCards = {
  [key: string]: {
    button: BaseButtonConfig;
    cards: LovelaceCardConfig[];
  };
};

type CustomCardsUse = {
  vehicle_card: boolean;
  trip_card: boolean;
  eco_card: boolean;
  tyre_card: boolean;
};

type ExtraConfigs = {
  tire_card_custom: {
    background: string;
    horizontal: boolean;
    image_size: number;
    value_size: number;
    top: number;
    left: number;
  };
  images_swipe: {
    max_height: number;
    max_width: number;
    autoplay: boolean;
    loop: boolean;
    delay: number;
    speed: number;
    effect: 'slide' | 'fade' | 'coverflow';
  };
  section_order?: string[];
  mini_map_height?: number;
  show_address?: boolean;
  maptiler_api_key?: string;
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
  vehicle_card?: LovelaceCardConfig[];
  trip_card?: LovelaceCardConfig[];
  eco_card?: LovelaceCardConfig[];
  tyre_card?: LovelaceCardConfig[];
  eco_button?: BaseButtonConfig;
  trip_button?: BaseButtonConfig;
  vehicle_button?: BaseButtonConfig;
  tyre_button?: BaseButtonConfig;
  added_cards: AddedCards;
  extra_configs: ExtraConfigs;
  show_slides: boolean;
  show_map: boolean;
  show_buttons: boolean;
  show_background: boolean;
  enable_map_popup: boolean;
  enable_services_control: boolean;
  show_error_notify: boolean;
  show_header_info: boolean;
}

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
    color_template: string;
    icon_template: string;
    picture_template: string;
  };
  button_type: 'default' | 'action';
  card_type: 'default' | 'custom';
  custom_card: LovelaceCardConfig[];
  custom_button: boolean;
};

export type CustomButtonEntity = {
  enabled: boolean;
  hide?: boolean;
  primary: string;
  secondary?: string;
  icon: string;
  notify?: boolean;
  button_type: 'default' | 'action';
  button_action: ButtonActionConfig;
  entity: string;
  attribute?: string;
  color?: string;
};

export type ExtendedButtonConfigItem = BaseButtonConfig & {
  isDefaultCard?: boolean;
  isHidden?: boolean;
  useCustomButton?: boolean;
};

// Default configuration for the Vehicle Card.

export const defaultConfig = {
  type: 'custom:vehicle-info-card',
  name: 'Mercedes Vehicle Card',
  entity: '',
  model_name: '',
  selected_language: 'system',
  show_slides: false,
  show_map: false,
  show_buttons: true,
  show_header_info: true,
  show_background: true,
  enable_map_popup: false,
  enable_services_control: false,
  show_error_notify: false,
  device_tracker: '',
  map_popup_config: {
    hours_to_show: 0,
    default_zoom: 14,
    theme_mode: THEME_MODE.Auto,
  },
  selected_theme: {
    theme: 'default',
    mode: THEME_MODE.Auto,
  },
  extra_configs: {
    tire_card_custom: {
      background: '',
      horizontal: false,
      image_size: 100,
      value_size: 100,
      top: 50,
      left: 50,
    },
    images_swipe: {
      max_height: 150,
      max_width: 450,
      autoplay: false,
      loop: true,
      delay: 5000,
      speed: 500,
      effect: 'slide' as 'slide',
    },
    mini_map_height: 150,
    show_address: true,
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
  use_custom_cards: {
    vehicle_card: false,
    trip_card: false,
    eco_card: false,
    tyre_card: false,
  },
};
