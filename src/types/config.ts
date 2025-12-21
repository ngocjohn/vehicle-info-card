import { convertButtonToNewFormat, migrateDefaultButtonConfig } from 'utils/editor/migrate_button_card';

import { LovelaceCardConfig } from '../types';
import { AdditionalCustomButtonCard, DefaultButtonCard, DefaultButtonConfig } from './card-config/button-card';
import { ButtonGridLayoutConfig, ExtraConfigs, reorderSections } from './card-config/layout-config';
import { MapPopupConfig, MiniMapConfig } from './card-config/mini-map';
import { convertServicesConfig, Services, ServicesConfig } from './card-config/services-config';
import { AddedCards, BaseButtonConfig } from './legacy-card-config/legacy-button-config';

/**
 * Configuration interface for the Vehicle Card.
 */

export type ImageConfig = {
  url: string;
  title: string;
};

export interface VehicleCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  selected_language?: string;
  model_name?: string;
  images?: ImageConfig[];
  mini_map?: MiniMapConfig;
  default_buttons?: DefaultButtonCard;
  custom_buttons?: AdditionalCustomButtonCard;
  extra_configs?: ExtraConfigs;
  /**
   * @deprecated use `mini_map` instead
   */
  map_popup_config?: MapPopupConfig;
  /**
   * @deprecated use `mini_map.device_tracker` instead
   */
  device_tracker?: string;
  /**
   * @deprecated use `mini_map.google_api_key` instead
   */
  google_api_key?: string;
  /**
   * @deprecated use `added_custom_buttons` instead
   */
  added_cards?: AddedCards;
  /**
   * @deprecated is replaced by `default_buttons card[card_type=custom]`
   */
  use_custom_cards?: {
    vehicle_card?: boolean;
    trip_card?: boolean;
    eco_card?: boolean;
    tyre_card?: boolean;
  };
  /**
   * @deprecated Use `default_buttons.vehicle_card` instead
   */
  vehicle_card?: LovelaceCardConfig[];
  /**
   * @deprecated Use `default_buttons.trip_card` instead
   */
  trip_card?: LovelaceCardConfig[];
  /**
   * @deprecated Use `default_buttons.eco_card` instead
   */
  eco_card?: LovelaceCardConfig[];
  /**
   * @deprecated Use `default_buttons.tyre_card` instead
   */
  tyre_card?: LovelaceCardConfig[];
  /**
   * @deprecated Use `default_buttons.eco_card` instead
   */
  eco_button?: BaseButtonConfig;
  /**
   * @deprecated Use `default_buttons.trip_card` instead
   */
  trip_button?: BaseButtonConfig;
  /**
   * @deprecated Use `default_buttons.vehicle_card` instead
   */
  vehicle_button?: BaseButtonConfig;
  /**
   * @deprecated Use `default_buttons.tyre_card` instead
   */
  tyre_button?: BaseButtonConfig;
  /**
   * @deprecated Use `extra_configs.theme_config` instead
   */
  selected_theme?: {
    theme?: string;
    mode?: 'auto' | 'light' | 'dark';
  };
  /**
   * @deprecated is replaced by extra_configs.section_order
   */
  show_slides?: boolean;
  /**
   * @deprecated is replaced by extra_configs.section_order
   */
  show_map?: boolean;
  /**
   * @deprecated is replaced by extra_configs.section_order
   */
  show_buttons?: boolean;
  /**
   * @deprecated is replaced by extra_configs.section_order
   */
  show_header_info?: boolean;

  /**
   * @deprecated use `extra_configs.hide_background` instead
   */
  show_background?: boolean;
  /**
   * @deprecated use `extra_configs.button_grid` instead
   */
  button_grid?: ButtonGridLayoutConfig;
  /**
   * @deprecated use `mini_map.enable_popup` instead
   */
  enable_map_popup?: boolean;
  /**
   * @deprecated use `services_config.enabled` instead
   */
  enable_services_control?: boolean;
  /**
   * @deprecated use `extra_configs.services_config` instead
   */
  services?: Services;
  /**
   * @deprecated is replaced in button card configs
   */
  show_error_notify?: boolean;
}

const DEPRECATED_BUTTON_CARD_PROPS = [
  'eco_button',
  'trip_button',
  'vehicle_button',
  'tyre_button',
  'eco_card',
  'trip_card',
  'vehicle_card',
  'tyre_card',
  'use_custom_cards',
] as const;
const DEPREACTED_MAP_CONFIG_PROPS = [
  'map_popup_config',
  'device_tracker',
  'google_api_key',
  'enable_map_popup',
] as const;
const DEPREACTED_MAP_IN_EXTRA_CONFIGS = ['maptiler_api_key', 'mini_map_height', 'show_address'] as const;

const INVALID_SHOW_SECTION_PROPS = ['show_slides', 'show_map', 'show_buttons', 'show_header_info'] as const;
const INVALID_SHOW_ELEMENT_PROPS = ['show_background', 'show_error_notify'] as const;
const INVALID_SERVICE_PROPS = ['enable_services_control', 'services'] as const;

type DeprecatedConfig = {
  hasLegacyDefaultButton?: boolean;
  hasLegacyCustomButton?: boolean;
  hasLegacyMapConfig?: boolean;
  hasLegacyShowSectionProps?: boolean;
  hasLegacyButtonGridConfig?: boolean;
  hasLegacySelectedThemeConfig?: boolean;
  hasLegacyServicesConfig?: boolean;
};

export const configHasDeprecatedProps = (config: VehicleCardConfig): boolean | DeprecatedConfig => {
  // Check for deprecated properties
  const legacyCheck: DeprecatedConfig = {};

  legacyCheck.hasLegacyDefaultButton = DEPRECATED_BUTTON_CARD_PROPS.some((prop) => prop in config);

  legacyCheck.hasLegacyCustomButton = config.added_cards !== undefined;

  const legacyMapPropInConfig = DEPREACTED_MAP_CONFIG_PROPS.some((prop) => prop in config);
  const legacyMapInExtraConfigs = DEPREACTED_MAP_IN_EXTRA_CONFIGS.some((prop) => prop in config.extra_configs!);

  legacyCheck.hasLegacyMapConfig = Boolean(legacyMapPropInConfig || legacyMapInExtraConfigs);

  legacyCheck.hasLegacyShowSectionProps =
    INVALID_SHOW_SECTION_PROPS.some((prop) => prop in config) ||
    INVALID_SHOW_ELEMENT_PROPS.some((prop) => prop in config);

  legacyCheck.hasLegacyButtonGridConfig = config.button_grid !== undefined;
  legacyCheck.hasLegacySelectedThemeConfig = config.selected_theme !== undefined;
  legacyCheck.hasLegacyServicesConfig = INVALID_SERVICE_PROPS.some((prop) => prop in config);

  if (Object.values(legacyCheck).some((value) => value === true)) {
    console.log('%cCONFIG:', 'color: #bada55;', 'Deprecated config properties found:', legacyCheck);

    return legacyCheck;
  }
  return false;
};

export const updateDeprecatedConfig = (config: VehicleCardConfig): VehicleCardConfig => {
  const legacyCheck = configHasDeprecatedProps(config);
  if (!legacyCheck) {
    console.log('No deprecated config properties found.');
    return config;
  }

  const newConfig = { ...config };
  // Migrate legacy button configs
  if (legacyCheck && typeof legacyCheck === 'object') {
    // Migrate legacy default button cards
    if (legacyCheck.hasLegacyDefaultButton) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy default button config');

      const updatedDefaultButtons: DefaultButtonCard = {};
      for (const cardButtonType of ['trip', 'vehicle', 'eco', 'tyre'] as const) {
        const buttonKey = `${cardButtonType}_button`;
        const cardKey = `${cardButtonType}_card`;
        const legacyButtonConfig = config[buttonKey] as BaseButtonConfig | undefined;
        const legacyCardConfig = config[cardKey] as LovelaceCardConfig[] | undefined;
        const useCustomCards = config.use_custom_cards?.[cardKey];
        const useCustomButton = legacyButtonConfig?.enabled;
        if (legacyButtonConfig || legacyCardConfig) {
          const updatedButtonConfig: DefaultButtonConfig = migrateDefaultButtonConfig({
            button: legacyButtonConfig,
            cards: legacyCardConfig,
            use_custom_cards: useCustomCards,
            use_custom_button: useCustomButton,
          });
          updatedDefaultButtons[cardKey] = updatedButtonConfig;
        }
      }
      newConfig.default_buttons = {
        ...newConfig.default_buttons,
        ...updatedDefaultButtons,
      };
      // Remove deprecated properties
      DEPRECATED_BUTTON_CARD_PROPS.forEach((prop) => {
        if (prop in newConfig) {
          delete (newConfig as any)[prop];
        }
      });
    }
    // Migrate legacy added custom button cards
    if (legacyCheck.hasLegacyCustomButton) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy added custom button card config');
      const addedCustomButtons: AdditionalCustomButtonCard = {};
      if (config.added_cards) {
        Object.entries(config.added_cards).forEach(([key, value]) => {
          const convertedButtonConfig = convertButtonToNewFormat(value);
          addedCustomButtons[key] = convertedButtonConfig;
        });
      }
      newConfig.custom_buttons = {
        ...newConfig.custom_buttons,
        ...addedCustomButtons,
      };
      // Remove deprecated property
      delete newConfig.added_cards;
    }
    // Migrate legacy map configs
    if (legacyCheck.hasLegacyMapConfig) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy map config');

      const miniMapConfig: MiniMapConfig = {};
      // Migrate properties from main config
      DEPREACTED_MAP_IN_EXTRA_CONFIGS.forEach((prop) => {
        if (newConfig.extra_configs && prop in newConfig.extra_configs) {
          if (prop === 'mini_map_height') {
            miniMapConfig.map_height = newConfig.extra_configs.mini_map_height;
          } else if (prop === 'show_address') {
            miniMapConfig.hide_map_address = newConfig.extra_configs.show_address;
          } else {
            (miniMapConfig as any)[prop] = (newConfig.extra_configs as any)[prop];
          }
          delete (newConfig.extra_configs as any)[prop];
        }
      });
      DEPREACTED_MAP_CONFIG_PROPS.forEach((prop) => {
        if (prop in newConfig) {
          if (prop === 'map_popup_config') {
            const popupConfig = { ...config.map_popup_config };
            Object.entries(popupConfig).forEach(([key, value]) => {
              miniMapConfig[key as any] = value;
            });
          } else {
            (miniMapConfig as any)[prop] = (newConfig as any)[prop];
          }
          delete (newConfig as any)[prop];
        }
      });
      newConfig.mini_map = {
        ...newConfig.mini_map,
        ...miniMapConfig,
      };
    }
    // Migrate legacy show section properties
    if (legacyCheck.hasLegacyShowSectionProps) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy show section properties');
      if (!newConfig.extra_configs) {
        newConfig.extra_configs = {};
      }
      INVALID_SHOW_ELEMENT_PROPS.forEach((prop) => {
        if (prop in newConfig) {
          if (prop === 'show_background') {
            newConfig.extra_configs!.hide_background = !(newConfig as any)[prop];
          }
          delete (newConfig as any)[prop];
        }
      });

      const hidden: string[] = [];
      INVALID_SHOW_SECTION_PROPS.forEach((prop) => {
        if (prop in newConfig) {
          const show = (newConfig as any)[prop];
          const sectionName = prop.replace('show_', '').replace('slides', 'images');
          if (show === false) {
            hidden.push(sectionName);
          }
          delete (newConfig as any)[prop];
        }
      });
      const currentOrder = newConfig.extra_configs?.section_order || [];
      const updatedOrder = reorderSections(hidden, currentOrder);
      newConfig.extra_configs!.section_order = updatedOrder;
    }

    // Migrate legacy button grid config
    if (legacyCheck.hasLegacyButtonGridConfig) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy button grid config');
      const legacyButtonGridConfig = newConfig.button_grid;
      ['button_layout', 'transparent'].forEach((prop) => {
        if (prop in legacyButtonGridConfig!) {
          delete (legacyButtonGridConfig as any)[prop];
        }
      });
      if (!newConfig.extra_configs) {
        newConfig.extra_configs = {};
      }
      newConfig.extra_configs.button_grid = {
        ...newConfig.extra_configs.button_grid,
        ...legacyButtonGridConfig,
      };
      delete newConfig.button_grid;
    }
    // Migrate legacy selected theme config
    if (legacyCheck.hasLegacySelectedThemeConfig) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy selected theme config');
      const legacySelectedThemeConfig = newConfig.selected_theme;
      newConfig.extra_configs!.theme_config = {
        ...legacySelectedThemeConfig,
      };
      delete newConfig.selected_theme;
    }
    // Migrate legacy services config
    if (legacyCheck.hasLegacyServicesConfig) {
      console.log('%cCONFIG:', 'color: #bada55;', 'Migrating legacy services config');
      if (!newConfig.extra_configs) {
        newConfig.extra_configs = {};
      }
      const updatedServicesConfig: ServicesConfig = {};
      if ('enable_services_control' in newConfig) {
        updatedServicesConfig.enabled = (newConfig as any).enable_services_control;
        delete (newConfig as any).enable_services_control;
      }
      if ('services' in newConfig) {
        const oldServicesConfig = (newConfig as any).services as Services;
        updatedServicesConfig.items = convertServicesConfig(oldServicesConfig);
        delete (newConfig as any).services;
      }
      newConfig.extra_configs.services_config = {
        ...newConfig.extra_configs.services_config,
        ...updatedServicesConfig,
      };
    }
  }
  return newConfig;
};
