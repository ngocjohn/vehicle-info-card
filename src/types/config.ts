import { pick } from 'es-toolkit/compat';
import { convertButtonToNewFormat, migrateDefaultButtonConfig } from 'utils/editor/migrate_button_card';

import { LovelaceCardConfig } from '../types';
import {
  AdditionalCustomButtonCard,
  DefaultButtonCard,
  DefaultButtonConfig,
  updateButtonOrderItems,
} from './card-config/button-card';
import { ImageConfig } from './card-config/images-config';
import { ButtonGridLayoutConfig, ExtraConfigs, reorderSections } from './card-config/layout-config';
import { MapPopupConfig, MiniMapConfig } from './card-config/mini-map';
import { convertServicesConfig, Services, ServicesConfig } from './card-config/services-config';
import { AddedCards, BaseButtonConfig } from './legacy-card-config/legacy-button-config';

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
  hasNotButtonOrder?: boolean;
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
  legacyCheck.hasNotButtonOrder =
    !config.extra_configs || !config.extra_configs.button_grid || !config.extra_configs.button_grid.button_order;

  const needMigration = Object.values(legacyCheck).some((value) => value === true);

  if (needMigration) {
    console.log('%cCONFIG:', 'color: #bada55;', 'Deprecated config properties found:', legacyCheck);
    return legacyCheck;
  }

  return needMigration;
};

export const updateDeprecatedConfig = (config: VehicleCardConfig): VehicleCardConfig => {
  const legacyCheck = configHasDeprecatedProps(config);
  const newConfig = { ...config };

  if (legacyCheck && typeof legacyCheck === 'object') {
    let changes = {};

    // Migrate legacy default button cards
    if (legacyCheck.hasLegacyDefaultButton) {
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
      changes['default_buttons'] = newConfig.default_buttons;
    }
    // Migrate legacy added custom button cards
    if (legacyCheck.hasLegacyCustomButton) {
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
      changes['custom_buttons'] = newConfig.custom_buttons;
    }
    // Migrate legacy map configs
    if (legacyCheck.hasLegacyMapConfig) {
      const miniMapConfig: MiniMapConfig = {};
      // Migrate properties from extra_configs
      if (newConfig.extra_configs) {
        const depKeys = pick(newConfig.extra_configs, DEPREACTED_MAP_IN_EXTRA_CONFIGS);
        Object.entries(depKeys).forEach(([key, value]) => {
          const switchKey =
            key === 'show_address' ? 'hide_map_address' : key === 'mini_map_height' ? 'map_height' : key;
          (miniMapConfig as any)[switchKey] = value;
          delete (newConfig.extra_configs as any)[key];
        });
      }

      const configKeys = pick(config, DEPREACTED_MAP_CONFIG_PROPS);

      Object.entries(configKeys).forEach(([key, value]) => {
        if (key === 'map_popup_config') {
          Object.entries(value).forEach(([pKey, pValue]) => {
            miniMapConfig[pKey as any] = pValue;
          });
        } else {
          (miniMapConfig as any)[key] = value;
        }
        delete (newConfig as any)[key];
      });

      newConfig!.mini_map = miniMapConfig;
      changes['mini_map'] = newConfig.mini_map;
    }
    // Migrate legacy show section properties
    if (legacyCheck.hasLegacyShowSectionProps) {
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
          const sectionName = prop.replace('show_', '').replace('slides', 'images').replace('map', 'mini_map');
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
      changes['button_grid'] = newConfig.extra_configs.button_grid;
    }
    // Migrate legacy selected theme config
    if (legacyCheck.hasLegacySelectedThemeConfig) {
      const legacySelectedThemeConfig = newConfig.selected_theme;
      newConfig.extra_configs!.theme_config = {
        ...legacySelectedThemeConfig,
      };
      delete newConfig.selected_theme;
      changes['theme_config'] = newConfig.extra_configs?.theme_config;
    }
    // Migrate legacy services config
    if (legacyCheck.hasLegacyServicesConfig) {
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
      changes['services_config'] = newConfig.extra_configs.services_config;
    }
    if (legacyCheck.hasNotButtonOrder) {
      let buttonOrder: string[] = [];
      // Start with existing buttons in default_buttons
      buttonOrder = buttonOrder.concat(Object.keys(newConfig.default_buttons || {}));
      // Then add custom buttons that are not hidden
      if (newConfig.custom_buttons) {
        const customButtonKeys = Object.keys(newConfig.custom_buttons).filter(
          (key) => newConfig.custom_buttons?.[key].hide_button !== true
        );
        buttonOrder = buttonOrder.concat(customButtonKeys);
      }
      if (!newConfig.extra_configs) {
        newConfig.extra_configs = {};
      }
      if (!newConfig.extra_configs.button_grid) {
        newConfig.extra_configs.button_grid = {};
      }
      newConfig.extra_configs.button_grid.button_order = buttonOrder;

      changes['button_order'] = newConfig.extra_configs.button_grid.button_order;
    }
    console.log('%cCONFIG:', 'color: #bada55;', 'Configuration updated with changes:', changes);
  }

  const currentOrder = newConfig.extra_configs?.button_grid?.button_order || [];
  const updatedButtonOrder = updateButtonOrderItems(
    currentOrder,
    newConfig.default_buttons || {},
    newConfig.custom_buttons || {}
  );
  if (JSON.stringify(currentOrder) !== JSON.stringify(updatedButtonOrder)) {
    console.log('%cCONFIG:', 'color: #bada55;', 'update button order', { from: currentOrder, to: updatedButtonOrder });
    newConfig.extra_configs!.button_grid!.button_order = updatedButtonOrder;
  }
  return newConfig;
};
