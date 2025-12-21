import setupTranslation from 'localize/translate';
import { BaseButtonCardItemConfig, ExtraConfigs } from 'types/card-config';

import { FrontendLocaleData, HomeAssistant, LocalizeFunc } from '../types';
import { VehicleCardConfig } from '../types/config';
import { VehicleInfoCard } from '../vehicle-info-card';
import { VehicleInfoCardEditor } from '../vehicle-info-card-editor';

export class Store {
  public _hass: HomeAssistant;
  public config: VehicleCardConfig;
  public card!: VehicleInfoCard;
  public editor?: VehicleInfoCardEditor;
  public translate: LocalizeFunc;

  constructor(card: VehicleInfoCard | VehicleInfoCardEditor, config: VehicleCardConfig, hass: HomeAssistant) {
    this._hass = hass;
    this.config = config;

    if (card instanceof VehicleInfoCardEditor) {
      this.editor = card;
    } else if (card instanceof VehicleInfoCard) {
      this.card = card;
    } else {
      throw new Error('Invalid card type, expected VehicleInfoCard or VehicleInfoCardEditor');
    }
    this.translate = setupTranslation(this.userLang);
    console.log('%cSTORE:', 'color: #bada55;', 'Store initialized');
  }

  get userLang(): string {
    if (!this.config?.selected_language || ['system', 'default'].includes(this.config.selected_language)) {
      return this._hass?.selectedLanguage || this._hass?.locale.language || 'en';
    }
    return this.config.selected_language;
  }

  get _userLocale(): FrontendLocaleData {
    const locale = { ...this._hass.locale };
    locale.language = this.userLang;
    return locale;
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
  public getButtonItemsArray(): BaseButtonCardItemConfig[] {
    return Object.entries({
      ...(this.config?.default_buttons || {}),
      ...(this.config?.custom_buttons || {}),
    }).map(([, value]) => value);
  }
}
