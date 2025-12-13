import setupTranslation from 'localize/translate';

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
    if (!this.config?.selected_language || this.config.selected_language === 'system') {
      return this._hass?.selectedLanguage || this._hass?.locale.language || 'en';
    }
    return this.config.selected_language;
  }
}
