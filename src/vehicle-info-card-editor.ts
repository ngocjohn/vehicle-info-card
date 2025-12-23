import { html, CSSResultGroup, css, nothing } from 'lit';
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
  constructor() {
    super(ConfigArea.GENERAL);
    window.VicEditor = this;
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @state() private _config?: VehicleCardConfig;
  @state() private _area: ConfigArea = ConfigArea.GENERAL;

  @state() private _legacyConfig?: VehicleCardConfig;

  public setConfig(config: VehicleCardConfig): void {
    if (configHasDeprecatedProps(config)) {
      this._legacyConfig = { ...config };
      this._legacyConfig!.type = 'custom:vehicle-info-card';
    } else {
      delete this._legacyConfig;
    }
    this._config = updateDeprecatedConfig(JSON.parse(JSON.stringify(config)));
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

  protected render() {
    if (!this._hass || !this._config) {
      return nothing;
    }
    this._createStore();

    return html`
      ${this._legacyConfig
        ? html`<ha-alert alert-type="info" .title=${'Card updated!'}>
            <div>Your configuration has been updated to the latest version.</div>
            <div class="actions" slot="action">
              <ha-button appearance="plain" size="small" @click=${() => this._revertToLegacyConfig()}>Revert</ha-button>
              <ha-button size="small" @click=${() => this._migrate()}>Accept</ha-button>
            </div>
          </ha-alert>`
        : nothing}
      <div class="card-config">
        <div>
          <p>Vehicle Info Card Editor</p>
          <p>Entity: ${this._config.entity || 'Not set'}</p>
        </div>
      </div>
    `;
  }

  private _revertToLegacyConfig = () => {
    if (!this._legacyConfig) return;
    fireEvent(this, 'config-changed', { config: this._legacyConfig });
  };

  private _migrate = () => {
    this._legacyConfig = undefined;
  };

  private _createStore(): void {
    if (!this._store) {
      this._store = new Store(this, this._config!, this._hass);

      // super.requestUpdate();
    }
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
        ha-alert {
          margin-bottom: 16px;
          display: block;
        }
        ha-alert a {
          color: var(--primary-color);
        }
        ha-alert .actions {
          display: flex;
          width: 100%;
          flex: 1;
          align-items: flex-end;
          flex-direction: row;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
          border-radius: 8px;
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
