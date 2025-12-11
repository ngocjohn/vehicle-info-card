import { html, CSSResultGroup, TemplateResult, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getCarEntity } from 'utils';
import { getCarEntities } from 'utils/lovelace/car-entities';

import { BaseElement } from './components';
import { VEHICLE_INFO_CARD_NEW_EDITOR_NAME, VEHICLE_INFO_CARD_NEW_NAME } from './const/const';
import { Store } from './model/store';
import { CarEntities, HomeAssistant, LovelaceCard, LovelaceCardEditor, VehicleCardConfig } from './types';

@customElement(VEHICLE_INFO_CARD_NEW_NAME)
export class VehicleInfoCard extends BaseElement implements LovelaceCard {
  constructor() {
    super();
    window.VicCard = this;
  }
  @property({ attribute: false }) public _hass!: HomeAssistant;

  @state() private _config!: VehicleCardConfig;
  @state() _carEntities?: CarEntities;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./vehicle-info-card-editor');
    return document.createElement(VEHICLE_INFO_CARD_NEW_EDITOR_NAME) as LovelaceCardEditor;
  }
  public static async getStubConfig(hass: HomeAssistant): Promise<VehicleCardConfig> {
    const entity = getCarEntity(hass);
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

  connectedCallback() {
    super.connectedCallback();
    console.log('Vehicle Info Card connected');
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  public setConfig(config: VehicleCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    if (!config.entity) {
      throw new Error('Entity is required in the configuration');
    }

    this._config = { ...config };
    if (this._store != null) {
      console.log('Updating store config');
      this._store.config = this._config;
    } else {
      this._createStore();
    }
  }

  protected async willUpdate(_changedProperties: PropertyValues): Promise<void> {
    if (_changedProperties.has('_config') && this._config.entity != null) {
      if (this._hass) {
        if (!this._carEntities || Object.keys(this._carEntities).length === 0) {
          this._carEntities = await getCarEntities(this._hass.entities[this._config.entity], this._hass);
          console.log('Car entities updated');
        }
      }
    }
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._config || !this._config.entity) {
      return this._showWarning('Entity not configured');
    }
    this._createStore();
    return html`
      <ha-card>
        <header><h1>${this._config?.name || 'Vehicle Info Card'}</h1></header>
        <main id="main-wrapper">
          <span>${this._config.entity}</span>
        </main>
      </ha-card>
    `;
  }

  private _createStore(): void {
    if (!this._hass) {
      console.warn('Hass object is not set yet. Cannot create store.');
      return;
    }

    if (!this._store) {
      this._store = new Store(this, this._config);
      this._store._hass = this._hass;
    }
  }

  public getCardSize(): number {
    return 3;
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        ha-card {
          position: relative;
          overflow: hidden;
          display: block;
          width: 100%;
          height: 100%;
          max-width: 500px !important;
          padding: var(--vic-card-padding);
          background-color: var(--card-background-color);
        }
        header h1 {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: serif !important;
          font-size: var(--ha-card-header-font-size, 24px);
          /* letter-spacing: -0.012em; */
          line-height: 2rem;
          display: block;
          margin-top: 0px;
          margin-bottom: 0px;
          font-weight: 400;
          text-align: center;
          padding-bottom: 0.67em;
        }
      `,
    ];
  }
}
