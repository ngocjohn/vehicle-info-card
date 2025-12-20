import { convertButtonToNewFormat } from 'utils/editor/migrate_button_card';

import { LovelaceCardConfig } from '../types';
import { AdditionalCustomButtonCard, DefaultButtonCard } from './card-config/button-card';
import { ButtonGridLayoutConfig, ExtraConfigs } from './card-config/layout-config';
import { MapPopupConfig, MiniMapConfig } from './card-config/mini-map';
import { Services } from './card-config/services-config';
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
  added_custom_buttons?: AdditionalCustomButtonCard;
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

type DeprecatedConfig = {
  legacyDefaultButtonCard?: boolean;
  legacyAddedCustomButtonCard?: boolean;
  legacyMapConfig?: boolean;
};

export const configHasDeprecatedProps = (config: VehicleCardConfig): boolean | DeprecatedConfig => {
  // Check for deprecated properties

  const legacyDefaultButtonCard = DEPRECATED_BUTTON_CARD_PROPS.some((prop) => prop in config);
  const legacyMapPropInConfig = DEPREACTED_MAP_CONFIG_PROPS.some((prop) => prop in config);
  const legacyMapInExtraConfigs = DEPREACTED_MAP_IN_EXTRA_CONFIGS.some((prop) => prop in config.extra_configs!);
  const legacyMapConfig = Boolean(legacyMapPropInConfig || legacyMapInExtraConfigs);
  const needMigration = Boolean(legacyDefaultButtonCard || legacyMapConfig);
  if (needMigration) {
    console.log('Config needs migration:', {
      legacyDefaultButtonCard,
      legacyMapConfig,
    });
    return {
      legacyDefaultButtonCard,
      legacyMapConfig,
    };
  }
  return needMigration;
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
    if (legacyCheck.legacyDefaultButtonCard) {
      console.log('Migrating legacy button card config');
      const updatedDefaultButtons: DefaultButtonCard = {};
      for (const cardButtonType of ['vehicle', 'trip', 'eco', 'tyre'] as const) {
        const buttonKey = `${cardButtonType}_button` as keyof VehicleCardConfig;
        const cardKey = `${cardButtonType}_card` as keyof VehicleCardConfig;
        const legacyButtonConfig = config[buttonKey] as BaseButtonConfig | undefined;
        const legacyCardConfig = config[cardKey] as LovelaceCardConfig[] | undefined;
        const useCustomCards = config.use_custom_cards?.[`${cardButtonType}_card`];
        if (legacyButtonConfig || legacyCardConfig) {
          const updatedButtonConfig = convertButtonToNewFormat({
            button: legacyButtonConfig,
            cards: legacyCardConfig,
            use_custom_cards: useCustomCards,
          });
          updatedDefaultButtons[`${cardButtonType}_card`] = updatedButtonConfig;
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
    if (legacyCheck.legacyMapConfig) {
      console.log('Migrating legacy map config to mini_map');
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
  }
  return newConfig;
};
