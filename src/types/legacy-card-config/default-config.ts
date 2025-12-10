import { VehicleCardConfig } from 'types/config';

// Default configuration for the Vehicle Card.

export const defaultConfig: Partial<VehicleCardConfig> = {
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
    theme_mode: 'auto',
  },
  selected_theme: {
    theme: 'default',
    mode: 'auto',
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
