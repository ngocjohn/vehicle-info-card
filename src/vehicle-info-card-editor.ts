import { html, CSSResultGroup, TemplateResult, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { BaseEditor } from './card-editor/base-editor';
import { VEHICLE_INFO_CARD_NEW_EDITOR_NAME, VEHICLE_INFO_CARD_NEW_NAME } from './const/const';
import { Store } from './model/store';
import {
  ConfigArea,
  configHasDeprecatedProps,
  HomeAssistant,
  LovelaceCardEditor,
  LovelaceConfig,
  updateDeprecatedConfig,
  VehicleCardConfig,
} from './types';
import { fireEvent } from './types';
import { registerCustomCard } from './utils/custom-card-register';

@customElement(VEHICLE_INFO_CARD_NEW_EDITOR_NAME)
export class VehicleInfoCardEditor extends BaseEditor implements LovelaceCardEditor {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @state() private _config?: VehicleCardConfig;
  @state() private _area: ConfigArea = ConfigArea.GENERAL;

  constructor() {
    super(ConfigArea.GENERAL);
    window.VicEditor = this;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  get hass(): HomeAssistant {
    return this._hass;
  }

  connectedCallback(): void {
    super.connectedCallback();
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
  }
  public setConfig(config: VehicleCardConfig): void {
    if (configHasDeprecatedProps(config)) {
      const updatedConfig = updateDeprecatedConfig(config);
      console.log('%cVEHICLE-INFO-CARD-EDITOR:', 'color: #bada55;', ' Updated deprecated config:', updatedConfig);
      fireEvent(this, 'config-changed', { config: updatedConfig });
      return;
    } else {
      this._config = config;
    }
    if (this._store != undefined) {
      this._store.config = config;
    } else {
      this._createStore();
    }
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._config) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <div class="card-config">
        <p>Vehicle Info Card Editor</p>
        <p>Entity: ${this._config.entity || 'Not set'}</p>
      </div>
    `;
  }

  private _createStore(): void {
    this._store = new Store(this, this._config!, this._hass);

    super.requestUpdate();
  }
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .card-config {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: var(--vic-gutter-gap);
        }
      `,
    ];
  }
}

registerCustomCard({
  type: VEHICLE_INFO_CARD_NEW_NAME,
  name: 'Vehicle Info Card',
  description: 'A custom card to display vehicle information.',
});
