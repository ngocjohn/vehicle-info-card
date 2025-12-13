import { hasTemplate } from 'types';
import type { DefaultButtonConfig } from 'types/card-config';
import { LovelaceCardConfig } from 'types/ha-frontend/lovelace/lovelace';
import { BaseButtonConfig } from 'types/legacy-card-config/legacy-button-config';

type LegacyButtonCardConfig = {
  button?: BaseButtonConfig;
  cards?: LovelaceCardConfig[];
  use_custom_cards?: boolean;
};

export const convertButtonToNewFormat = (legacyConfig: LegacyButtonCardConfig): DefaultButtonConfig => {
  const newConfig: Partial<DefaultButtonConfig> = {
    show_icon: true,
    show_primary: true,
    show_secondary: true,
  };
  if (legacyConfig.button && typeof legacyConfig.button === 'object') {
    const button = { ...legacyConfig.button };
    newConfig.use_custom_button = button.enabled ?? false;
    newConfig.hide_button = button.hide ?? false;
    newConfig.button_type = button.button_type ?? 'default';
    if (button.primary) {
      newConfig.name = button.primary;
    }
    if (button.color_template) {
      if (hasTemplate(button.color_template)) {
        newConfig.color_template = button.color_template;
        delete newConfig?.color;
      } else {
        newConfig.color = button.color_template;
        delete newConfig?.color_template;
      }
    }
    if (button.picture_template) {
      if (hasTemplate(button.picture_template)) {
        newConfig.icon_template = button.picture_template;
        newConfig.icon_type = 'icon-template';
      }
    }
    if (button.icon) {
      newConfig.icon = button.icon;
    }
    if (button.secondary) {
      if (hasTemplate(button.secondary)) {
        newConfig.state_template = button.secondary;
        newConfig.include_state_template = true;
      }
    }
    if (button.attribute) {
      newConfig.state_content = [button.attribute];
    }
    ['notify', 'notify_color', 'notify_icon'].forEach((prop) => {
      if (prop in button && button[prop as keyof typeof button]) {
        (newConfig as any)[prop] = button[prop as keyof typeof button];
      }
    });
    if (button.state_color) {
      newConfig.state_color = button.state_color;
    }
    if (button.entity) {
      newConfig.entity = button.entity;
    }
    if ('button_action' in button && button.button_action) {
      for (const action of ['tap_action', 'hold_action', 'double_tap_action'] as const) {
        if (action in button.button_action && button.button_action[action]) {
          (newConfig as any)[action] = button.button_action[action];
        }
      }
    }
  }
  if (legacyConfig.cards && Array.isArray(legacyConfig.cards)) {
    newConfig.cards = legacyConfig.cards;
  }
  if (typeof legacyConfig.use_custom_cards === 'boolean') {
    newConfig.use_custom_cards = legacyConfig.use_custom_cards;
  }

  // Remove undefined values or empty objects
  Object.keys(newConfig).forEach((key) => {
    const value = (newConfig as any)[key];
    if (value === undefined || (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
      delete (newConfig as any)[key];
    }
  });
  return newConfig as DefaultButtonConfig;
};
