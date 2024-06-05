/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { VehicleCardConfig } from './types';
import { customElement, property, state } from 'lit/decorators';
import { formfieldDefinition } from '../elements/formfield';
import { selectDefinition } from '../elements/select';
import { switchDefinition } from '../elements/switch';
import { textfieldDefinition } from '../elements/textfield';
@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends ScopedRegistryHost(LitElement) implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: VehicleCardConfig;

  @state() private _helpers?: any;

  static elementDefinitions = {
    ...textfieldDefinition,
    ...selectDefinition,
    ...switchDefinition,
    ...formfieldDefinition,
  };

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

  get _google_api_key(): string {
    return this._config?.google_api_key || '';
  }

  get _show_background(): boolean {
    return this._config?.show_background || false;
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

    return html`
      <mwc-textfield
        label="Name (Optional)"
        .value=${this._name}
        .configValue=${'name'}
        @input=${this._valueChanged}
      ></mwc-textfield>
      <mwc-select
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
      </mwc-select>

      <mwc-select
        naturalMenuWidth
        fixedMenuPosition
        label="Device Tracker (Optional)"
        .configValue=${'device_tracker'}
        .value=${this._device_tracker}
        @selected=${this._valueChanged}
        @closed=${(ev) => ev.stopPropagation()}
      >
        ${device_trackers.map((entity) => {
          return html`<mwc-list-item .value=${entity}>${entity}</mwc-list-item>`;
        })}
      </mwc-select>
      <mwc-textfield
        label="Google API Key (Optional)"
        .value=${this._google_api_key}
        .configValue=${'google_api_key'}
        @input=${this._valueChanged}
      ></mwc-textfield>
      <div class="switches">
        <mwc-formfield .label=${`Show slides`}>
          <mwc-switch
            .checked=${this._show_slides !== false}
            .configValue=${'show_slides'}
            @change=${this._valueChanged}
          ></mwc-switch>
        </mwc-formfield>
        <mwc-formfield .label=${`Show map`}>
          <mwc-switch
            .checked=${this._show_map !== false}
            .configValue=${'show_map'}
            @change=${this._valueChanged}
          ></mwc-switch>
        </mwc-formfield>
        <mwc-formfield .label=${`Show buttons`}>
          <mwc-switch
            .checked=${this._show_buttons !== false}
            .configValue=${'show_buttons'}
            @change=${this._valueChanged}
          ></mwc-switch>
        </mwc-formfield>
        <mwc-formfield .label=${`Show background`}>
          <mwc-switch
            .checked=${this._show_background !== false}
            .configValue=${'show_background'}
            @change=${this._valueChanged}
          ></mwc-switch>
        </mwc-formfield>
      </div>
      <div class="note"><i>Note: For another card configuration, use code editor.</i></div>
    `;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === '') {
        const tmpConfig = { ...this._config };
        delete tmpConfig[target.configValue];
        this._config = tmpConfig;
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static styles: CSSResultGroup = css`
    .switches {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-block: 2rem;
    }
    mwc-select,
    mwc-textfield {
      margin-bottom: 16px;
      display: block;
    }
    mwc-formfield {
      padding-bottom: 8px;
    }
    mwc-switch {
      --mdc-theme-secondary: var(--switch-checked-color);
    }

    .select-with-text {
      display: flex;
      align-items: center;
    }
    .note {
      color: var(--secondary-text-color);
      text-align: -webkit-center;
    }
  `;
}
