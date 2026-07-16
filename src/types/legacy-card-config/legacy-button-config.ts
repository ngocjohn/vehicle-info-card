import { ActionsSharedConfig } from 'types/actions-config';
import { LovelaceCardConfig } from 'types/ha-frontend';

export type BaseButtonConfig = {
  enabled: boolean;
  hide?: boolean;
  primary: string;
  secondary?: string;
  icon: string;
  notify?: string;
  button_type: 'default' | 'action';
  button_action: ActionsSharedConfig;
  entity?: string;
  attribute?: string;
  color_template?: string;
  icon_template?: string;
  picture_template?: string;
  state_color?: boolean;
  notify_icon?: string;
  notify_color?: string;
};

export type AddedCards = {
  [key: string]: {
    button: BaseButtonConfig;
    cards: LovelaceCardConfig[];
  };
};

export type ButtonCardEntity = {
  key: string;
  default_name?: string;
  default_icon?: string;
  button: {
    button_action: ActionsSharedConfig;
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
    state_color: boolean;
    notify_icon: string;
    notify_color: string;
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
  button_action: ActionsSharedConfig;
  entity: string;
  attribute?: string;
  color?: string;
};

export type ExtendedButtonConfigItem = BaseButtonConfig & {
  isDefaultCard?: boolean;
  isHidden?: boolean;
  useCustomButton?: boolean;
};
