import { VehicleCardConfig } from '../types';

export type VehicleDefaultConfig = {
  type: 'custom:vehicle-info-card';
  name: string;
  entity: string;
  model_name: string;
  selected_language: 'system' | 'en' | 'fr' | 'de'; // example of language options, can be extended
  show_slides: boolean;
  show_map: boolean;
  show_buttons: boolean;
  show_background: boolean;
  enable_map_popup: boolean;
  enable_services_control: boolean;
  show_error_notify: boolean;
  device_tracker: string;
  map_popup_config: {
    hours_to_show: number;
    default_zoom: number;
    theme_mode: 'auto' | 'dark' | 'light'; // Assuming theme options
  };
  selected_theme: {
    theme: 'default' | 'dark' | 'light'; // Assuming these themes are available
    mode: 'auto' | 'manual';
  };
  extra_configs: {
    tire_background: string;
  };
  button_grid: {
    use_swiper: boolean;
    rows_size: number;
  };
  services: {
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
  eco_button: {
    enabled: boolean;
  };
  trip_button: {
    enabled: boolean;
  };
  vehicle_button: {
    enabled: boolean;
  };
  tyre_button: {
    enabled: boolean;
  };
  use_custom_cards: {
    vehicle_card: boolean;
    trip_card: boolean;
    eco_card: boolean;
    tyre_card: boolean;
  };
};

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

export interface EcoData {
  bonusRange: number;
  acceleration: number;
  constant: number;
  freeWheel: number;
}
