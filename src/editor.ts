/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { VehicleCardConfig } from './types';
import { customElement, property, state } from 'lit/decorators';
import yaml from 'js-yaml';
import { CARD_VERSION } from './const';
@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: VehicleCardConfig;

  @state() private _helpers?: any;

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = config;
    if (!this._config.entity) {
      this._config.entity = this.getCarEntity();
      this._config.name = await this.getDeviceModelName();
      fireEvent(this, 'config-changed', { config: this._config });
    }

    this.loadCardHelpers();
  }

  private getCarEntity(): string {
    if (!this.hass) return '';
    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );
    return entities[0] || '';
  }

  private async getDeviceModelName(): Promise<string> {
    if (!this._config?.entity) return '';

    const carEntityId = this._config.entity;

    // Fetch all entities
    const allEntities = await this.hass.callWS<{ entity_id: string; device_id: string }[]>({
      type: 'config/entity_registry/list',
    });
    // Find the car entity
    const carEntity = allEntities.find((entity) => entity.entity_id === carEntityId);
    if (!carEntity) return '';
    console.log('Car Entity:', carEntity);
    const deviceId = carEntity.device_id;
    if (!deviceId) return '';

    // Fetch all devices
    const allDevices = await this.hass.callWS<{ id: string; name: string; model: string }[]>({
      type: 'config/device_registry/list',
    });
    // Find the device by ID
    const device = allDevices.find((device) => device.id === deviceId);
    if (!device) return '';
    console.log('Device:', device);
    return device.model || '';
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _device_tracker(): string {
    return this._config?.device_tracker || '';
  }

  get _show_slides(): boolean {
    return this._config?.show_slides || false;
  }

  get _show_map(): boolean {
    return this._config?.show_map || false;
  }

  get _show_buttons(): boolean {
    return this._config?.show_buttons || false;
  }

  get _show_background(): boolean {
    return this._config?.show_background || false;
  }

  get _enable_map_popup(): boolean {
    return this._config?.enable_map_popup || false;
  }

  get _google_api_key(): string {
    return this._config?.google_api_key || '';
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    // You can restrict on domain type
    // const entities = Object.keys(this.hass.states).filter((entity) => entity.startsWith('sensor'));

    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );

    const device_trackers = Object.keys(this.hass.states).filter((entity) => entity.startsWith('device_tracker'));

    let images = '';

    if (this._config && Array.isArray(this._config.images)) {
      images = this._config.images.join('\n');
    } else if (this._config && typeof this._config.images === 'string') {
      images = this._config.images;
    }

    return html`
      <div class="card-config">
        <ha-textfield
          label="Name (Optional)"
          .value=${this._name}
          .configValue=${'name'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Entity (Required)"
          .configValue=${'entity'}
          .value=${this._entity}
          @selected=${this._valueChanged}
          @closed=${(ev) => ev.stopPropagation()}
        >
          ${entities.map((entity) => {
            return html`<mwc-list-item .value=${entity}>${entity}</mwc-list-item>`;
          })}
        </ha-select>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Device Tracker (Optional)"
          .configValue=${'device_tracker'}
          .value=${this._device_tracker}
          @selected=${this._valueChanged}
          @closed=${(ev) => ev.stopPropagation()}
        >
          <mwc-list-item value=""></mwc-list-item>
          ${device_trackers.map((entity) => {
            return html`<mwc-list-item .value=${entity}>${entity}</mwc-list-item>`;
          })}
        </ha-select>
        <ha-textfield
          label="Google API Key (Optional)"
          .value=${this._google_api_key}
          .configValue=${'google_api_key'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-expansion-panel .open=${false} .outlined=${true}>
        <h3 slot="header">
          <ha-icon icon="mdi:code-array"></ha-icon>
          Images Configuration
        </h3>
        <div class="code-editor">
          <ha-alert alert-type="info">There is no need to add a '-' for each line. Each line will be treated as a separate URL automatically.</ha-alert>
          <ha-code-editor
          autofocus
          autocomplete-entities
          autocomplete-icons
          .hass=${this.hass}
          .value=${images}
          .configValue="${'images'}"
          @blur=${this._valueChanged}
        ></ha-code-editor>
        </div>
        </ha-expansion-panel>
          <div class="switches">
            <ha-formfield .label=${`Show slides`}>
              <ha-switch
                .disabled=${!this._config?.images || this._config?.images.length === 0}
                .checked=${this._show_slides !== false}
                .configValue=${'show_slides'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>

            <ha-formfield .label=${`Show buttons`}>
              <ha-switch
                .checked=${this._show_buttons !== false}
                .configValue=${'show_buttons'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>

            <ha-formfield .label=${`Show map`}>
              <ha-switch
                .checked=${this._show_map !== false}
                .configValue=${'show_map'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
            <ha-formfield .label=${`Show background`}>
              <ha-switch
                .checked=${this._show_background !== false}
                .configValue=${'show_background'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
            <ha-formfield .label=${`Enable map popup`}>
              <ha-switch
                .disabled=${this._show_map === false || this._show_map === undefined || !this._config?.device_tracker}
                .checked=${this._enable_map_popup !== false}
                .configValue=${'enable_map_popup'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          </div>
          <div class="note">
            <p>version: ${CARD_VERSION}</p>
            <i>Note: For another card configuration, use code editor.</i>
          </div>
        </div>
      </div>
    `;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  // private _valueChanged(ev): void {
  //   if (!this._config || !this.hass) {
  //     return;
  //   }
  //   const target = ev.target;
  //   if (this[`_${target.configValue}`] === target.value) {
  //     return;
  //   }
  //   if (target.configValue) {
  //     if (target.value === '') {
  //       const tmpConfig = { ...this._config };
  //       delete tmpConfig[target.configValue];
  //       this._config = tmpConfig;
  //     } else {
  //       this._config = {
  //         ...this._config,
  //         [target.configValue]: target.checked !== undefined ? target.checked : target.value,
  //       };
  //     }
  //   }
  //   fireEvent(this, 'config-changed', { config: this._config });
  // }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (this[`_${configValue}`] === target.value) {
      return;
    }

    let newValue: any;
    if (configValue === 'images') {
      newValue = target.value
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line); // Remove empty lines
    } else {
      newValue = target.checked !== undefined ? target.checked : target.value;
    }

    if (newValue.length === 0) {
      // Check for an empty array
      const tmpConfig = { ...this._config };
      delete tmpConfig[configValue];
      this._config = tmpConfig;
    } else {
      this._config = {
        ...this._config,
        [configValue]: newValue,
      };
    }

    fireEvent(this, 'config-changed', { config: this._config });
  }

  static styles: CSSResultGroup = css`
    .card-config {
      width: 100%;
    }
    .switches {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-block: 2rem;
    }
    ha-select,
    ha-textfield {
      margin-bottom: 16px;
      display: block;
      width: 100%;
    }
    ha-formfield {
      padding-bottom: 8px;
      width: 100%;
    }
    ha-switch {
      --mdc-theme-secondary: var(--switch-checked-color);
    }

    h3 {
      color: var(--secondary-text-color);
    }

    .note {
      color: var(--secondary-text-color);
      text-align: start;
    }
  `;
}
