import { ActionConfig, LovelaceCardConfig } from '../ha-frontend';

export const ButtonType = ['default', 'action'] as const;
export const CardType = ['default', 'custom'] as const;
export const PrimaryInfo = ['name', 'state', 'primary-template'] as const;
export const IconType = ['icon', 'entity-picture', 'icon-template'] as const;

export type BUTTON_TYPE = (typeof ButtonType)[number];
export type CARD_TYPE = (typeof CardType)[number];
export type PRIMARY_INFO = (typeof PrimaryInfo)[number];
export type ICON_TYPE = (typeof IconType)[number];

export type BUTTON_LAYOUT = 'horizontal' | 'vertical';
export interface ButtonShowConfig {
  show_primary?: boolean;
  show_secondary?: boolean;
  show_icon?: boolean;
  primary_info?: PRIMARY_INFO;
  icon_type?: ICON_TYPE;
  state_color?: boolean;
  include_state_template?: boolean;
  layout?: BUTTON_LAYOUT;
  transparent?: boolean;
  secondary_multiline?: boolean;
  state_content?: string[];
}

export interface ButtonEntityBehavior {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface ButtonNotifyBadgeConfig {
  notify?: string;
  notify_color?: string;
  notify_icon?: string;
  notify_text?: string;
}

export interface ButtonTemplatesConfig {
  state_template?: string;
  icon_template?: string;
  color_template?: string;
  primary_template?: string;
}

/**
 * Base Button Card Item Configuration
 */
export interface BaseButtonCardItem {
  name?: string;
  entity?: string;
  icon?: string;
  color?: string;
  hide_button?: boolean;
  button_type?: BUTTON_TYPE;
  cards?: LovelaceCardConfig[];
}

/**
 * ButtonCardConfig Interface
 * This interface defines the structure of the button card configuration
 */

export type BaseButtonCardItemConfig = BaseButtonCardItem &
  ButtonShowConfig &
  ButtonEntityBehavior &
  ButtonNotifyBadgeConfig &
  ButtonTemplatesConfig;

export interface DefaultButtonConfig extends BaseButtonCardItemConfig {
  card_type?: CARD_TYPE;
  custom_button?: boolean;
}

export interface DefaultButtonCard {
  vehicle_card?: DefaultButtonConfig;
  trip_card?: DefaultButtonConfig;
  eco_card?: DefaultButtonConfig;
  tyre_card?: DefaultButtonConfig;
}

export interface AdditionalCustomButtonCard {
  [key: string]: BaseButtonCardItemConfig;
}

export const BUTTON_CARD_TEMPLATE_KEYS = [
  'primary_template',
  'state_template',
  'icon_template',
  'color_template',
  'notify',
  'notify_color',
  'notify_icon',
  'notify_text',
] as const;

export type BUTTON_CARD_TEMPLATE_KEY = (typeof BUTTON_CARD_TEMPLATE_KEYS)[number];

export const BUTTON_SHOW_CONFIG_KEYS = [
  'show_primary',
  'show_secondary',
  'show_icon',
  'primary_info',
  'icon_type',
  'state_color',
  'include_state_template',
  'layout',
  'transparent',
  'secondary_multiline',
  'state_content',
] as const;

export type ButtonShowConfigKey = (typeof BUTTON_SHOW_CONFIG_KEYS)[number];
