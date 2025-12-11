import { computeCardItems } from 'const/card-item';
import setupTranslation from 'localize/translate';

import { HomeAssistant, LocalizeFunc } from '../types';
import { VehicleCardConfig } from '../types/config';
import { VehicleInfoCard } from '../vehicle-info-card';
import { VehicleInfoCardEditor } from '../vehicle-info-card-editor';

export class Store {
  public config: VehicleCardConfig;
  public card!: VehicleInfoCard;
  public editor?: VehicleInfoCardEditor;
  public _hass?: HomeAssistant;
  public translate: LocalizeFunc;

  constructor(card: VehicleInfoCard | VehicleInfoCardEditor, config: VehicleCardConfig) {
    this.config = config;

    if (card instanceof VehicleInfoCardEditor) {
      this.editor = card;
      this._hass = card._hass;
    } else if (card instanceof VehicleInfoCard) {
      console.log('Initializing store with VehicleInfoCard');
      this.card = card;
      this._hass = card.hass;
    } else {
      throw new Error('Invalid card type, expected VehicleInfoCard or VehicleInfoCardEditor');
    }
    this.translate = setupTranslation(this.userLang);
    // console.log('Store initialized', this);
  }

  get userLang(): string {
    if (!this.config?.selected_language || this.config.selected_language === 'system') {
      return this._hass?.selectedLanguage || this._hass?.locale.language || 'en';
    }
    return this.config.selected_language;
  }

  get cardItems() {
    return computeCardItems(this.translate);
  }
}
