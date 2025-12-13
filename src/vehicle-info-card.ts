import { isEmpty } from 'es-toolkit/compat';
import { html, CSSResultGroup, TemplateResult, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Car } from 'model/car';
import { _getCarEntity } from 'utils';
import { isCardInEditPreview, isCardInPickerPreview } from 'utils/helpers-dom';
import { getCarEntities } from 'utils/lovelace/car-entities';

import { BaseElement, computeDarkMode } from './components';
import { VEHICLE_INFO_CARD_NEW_EDITOR_NAME, VEHICLE_INFO_CARD_NEW_NAME } from './const/const';
import { imagesVars } from './css/shared-styles';
import { Store } from './model/store';
import {
  CarEntities,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardEditor,
  updateDeprecatedConfig,
  VehicleCardConfig,
} from './types';
@customElement(VEHICLE_INFO_CARD_NEW_NAME)
export class VehicleInfoCard extends BaseElement implements LovelaceCard {
  constructor() {
    super();
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.VicCard = this;
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.VicCard = undefined;
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @state() private _config!: VehicleCardConfig;
  @state() _carEntities: CarEntities = {};
  @state() private _loadedData: boolean = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./vehicle-info-card-editor');
    return document.createElement(VEHICLE_INFO_CARD_NEW_EDITOR_NAME) as LovelaceCardEditor;
  }

  public static getStubConfig(hass: HomeAssistant): VehicleCardConfig {
    const entity = _getCarEntity(hass);
    return {
      type: `custom:${VEHICLE_INFO_CARD_NEW_NAME}`,
      entity,
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  get hass(): HomeAssistant {
    return this._hass;
  }

  get isCardInPreview(): boolean {
    return isCardInEditPreview(this);
  }
  get isInCardPicker(): boolean {
    return isCardInPickerPreview(this);
  }

  public setConfig(config: VehicleCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    if (!config.entity) {
      throw new Error('Entity is required in the configuration');
    }
    const newConfig = JSON.parse(JSON.stringify(config));
    this._config = {
      ...updateDeprecatedConfig(newConfig),
    };
    if (this.store != null) {
      console.log('Updating store config');
      this.store.config = this._config;
    }
  }

  protected async willUpdate(_changedProperties: PropertyValues): Promise<void> {
    if (_changedProperties.has('_config') && this._config.entity != null && this._hass) {
      if (isEmpty(this._carEntities)) {
        console.log('Loading car entities for the first time');
        this._carEntities = await getCarEntities(this._hass.entities[this._config.entity], this._hass);
        console.log('Car entities updated');
        this._loadedData = true;
      }
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('_hass') && this._hass) {
      const currentDarkMode = computeDarkMode(changedProps.get('_hass'));
      const newDarkMode = computeDarkMode(this._hass);
      if (currentDarkMode != newDarkMode) {
        this.toggleAttribute('dark-mode', newDarkMode);
        console.log('Dark mode changed:', newDarkMode);
      }
    }
  }

  protected render(): TemplateResult | void {
    if (!this._hass) {
      return html``;
    }
    this._createStore();
    return html`
      <ha-card class="__background">
        <header><h1>${this._config?.name || 'Vehicle Info Card'}</h1></header>
        <main id="main-wrapper">
          <span>${this._config.entity}</span>
        </main>
      </ha-card>
    `;
  }

  private _createStore() {
    if (!this.store) {
      this.store = new Store(this, this._config, this.hass);
      this.car = new Car(this.store);
    }
  }

  public getCardSize(): number {
    return 3;
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      imagesVars.cardBackground,
      css`
        ha-card {
          position: relative;
          overflow: hidden;
          display: block;
          width: 100%;
          height: 100%;
          max-width: 500px !important;
          padding: var(--vic-card-padding);
          background-color: var(--ha-card-background, var(--card-background-color));
        }
        ha-card.__background::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          max-height: 250px;
          top: 0;
          left: 50%;
          transform: translate(-50%);
          padding: var(--vic-card-padding);
          background-image: var(--vic-card-bg-image);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.1;
          z-index: 0;
          mask-image: linear-gradient(transparent 0%, black 40%, black 70%, transparent 100%);
        }
        header h1 {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: serif !important;
          font-size: var(--ha-card-header-font-size, 24px);
          /* letter-spacing: -0.012em; */
          line-height: 2rem;
          font-weight: 400;
          display: block;
          margin: 0;
          text-align: center;
          /* padding-bottom: 0.67em; */
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-vehicle-card': VehicleInfoCard;
  }
}
