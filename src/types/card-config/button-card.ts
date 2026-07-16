import { ButtonInfo } from 'data';

import { ActionConfig, LovelaceCardConfig } from '../ha-frontend';

export const DEFAULT_CARD_KEYS = ['trip_card', 'vehicle_card', 'eco_card', 'tyre_card'] as const;
export type DefaultCardKey = (typeof DEFAULT_CARD_KEYS)[number];

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

export interface ButtonIconBehavior {
  icon_tap_action?: ActionConfig;
  icon_hold_action?: ActionConfig;
  icon_double_tap_action?: ActionConfig;
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
  ButtonIconBehavior &
  ButtonNotifyBadgeConfig &
  ButtonTemplatesConfig;

export interface AdditionalCustomButtonCard {
  [key: string]: BaseButtonCardItemConfig;
}

export interface DefaultButtonConfig extends BaseButtonCardItemConfig {
  use_custom_button?: boolean;
  use_custom_cards?: boolean;
  default_button_config?: ButtonInfo;
}

export interface DefaultButtonCard {
  vehicle_card?: DefaultButtonConfig;
  trip_card?: DefaultButtonConfig;
  eco_card?: DefaultButtonConfig;
  tyre_card?: DefaultButtonConfig;
}
export type IButtonMap = Map<string, DefaultButtonConfig>;

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
export type ButtonCardTemplateKey = (typeof BUTTON_CARD_TEMPLATE_KEYS)[number];

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

export function updateButtonOrderItems(
  buttonOrder: string[],
  defaultButtons: DefaultButtonCard,
  customButtons: AdditionalCustomButtonCard
): string[] {
  const updatedOrder = [...buttonOrder];

  let missingButtons: string[] = [];
  // Check for hidden buttons
  const hidden = Object.entries({ ...defaultButtons, ...customButtons })
    .filter(([, val]) => val.hide_button === true)
    .map(([key]) => key);

  const defaultButtonNotInConfig = DEFAULT_CARD_KEYS.filter(
    (key) => !(key in defaultButtons) && !hidden.includes(key) && !updatedOrder.includes(key)
  );
  missingButtons = missingButtons.concat(defaultButtonNotInConfig);

  const customButtonNotInConfig = Object.keys(customButtons).filter(
    (key) => !updatedOrder.includes(key) && !hidden.includes(key)
  );
  missingButtons = missingButtons.concat(customButtonNotInConfig);
  updatedOrder.push(...missingButtons);

  return updatedOrder;
}
