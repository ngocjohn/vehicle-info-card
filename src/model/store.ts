import { CarServices } from 'data/services/car-services';
import setupTranslation from 'localize/translate';
import { DefaultButtonConfig, ExtraConfigs } from 'types/card-config';

import { HomeAssistant, LocalizeFunc } from '../types';
import { VehicleCardConfig } from '../types/config';
import { VehicleInfoCard } from '../vehicle-info-card';
import { VehicleInfoCardEditor } from '../vehicle-info-card-editor';

export class Store {
  public _hass: HomeAssistant;
  public config: VehicleCardConfig;
  public card!: VehicleInfoCard;
  public editor?: VehicleInfoCardEditor;
  public translate: LocalizeFunc;
  public carServices?: CarServices;

  constructor(card: VehicleInfoCard | VehicleInfoCardEditor, config: VehicleCardConfig, hass: HomeAssistant) {
    this._hass = hass;
    this.config = config;
    this.translate = setupTranslation(this.userLang);
    if (card instanceof VehicleInfoCardEditor) {
      this.editor = card;
    } else if (card instanceof VehicleInfoCard) {
      this.card = card;
      this.carServices = new CarServices(this._hass, this.card, this.translate);
    } else {
      throw new Error('Invalid card type, expected VehicleInfoCard or VehicleInfoCardEditor');
    }
    console.log('%cSTORE:', 'color: #bada55;', 'Store initialized');
  }

  get userLang(): string {
    if (!this.config.selected_language || ['system', 'default'].includes(this.config.selected_language)) {
      return this._hass.language;
    }
    return this.config.selected_language;
  }

  public get layoutConfig(): ExtraConfigs {
    return this.config.extra_configs || {};
  }

  public get gridConfig() {
    const button_grid = this.layoutConfig?.button_grid || {};
    return {
      rows: button_grid?.rows_size ?? 2,
      columns: button_grid?.columns_size ?? 2,
      button_layout: button_grid?.button_layout ?? 'horizontal',
      swipe: button_grid?.use_swiper ?? false,
      transparent: button_grid?.transparent ?? false,
    };
  }

  public get _visibleButtons(): Record<string, DefaultButtonConfig> {
    let buttonOrder = this.card._buttonOrder || [];
    // Check if some buttons are hidden, update the button order accordingly
    const hiddenButtons = Array.from(this.card._buttonsData.entries())
      .filter(([, val]) => val.hide_button === true)
      .map(([key]) => key);
    buttonOrder = buttonOrder.filter((btnKey) => !hiddenButtons.includes(btnKey));
    return buttonOrder.reduce((acc, key) => {
      const buttonConfig = this.card._buttonsData.get(key);
      if (buttonConfig) {
        acc[key] = buttonConfig;
      }
      return acc;
    }, {} as Record<string, DefaultButtonConfig>);
  }
}
