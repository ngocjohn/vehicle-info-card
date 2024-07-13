/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import YAML from 'yaml';

// Custom card helpers
import { fireEvent, LovelaceCardEditor, LovelaceCardConfig } from 'custom-card-helpers';

// Local types
import { HomeAssistantExtended as HomeAssistant, VehicleCardConfig } from './types';
import { servicesCtrl } from './const/remote-control-keys';
import { cardTypes } from './const/data-keys';
import { CARD_VERSION } from './const';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: VehicleCardConfig;

  @state() private _helpers?: any;

  @property({ type: Boolean }) private isVehicleCardEditor = false;
  @property({ type: Boolean }) private isTripCardEditor = false;
  @property({ type: Boolean }) private isEcoCardEditor = false;
  @property({ type: Boolean }) private isTyreCardEditor = false;

  get isSubEditorOpen(): boolean {
    return this.isVehicleCardEditor || this.isTripCardEditor || this.isEcoCardEditor || this.isTyreCardEditor;
  }

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

  get _show_error_notify(): boolean {
    return this._config?.show_error_notify || false;
  }

  get _google_api_key(): string {
    return this._config?.google_api_key || '';
  }

  get _enable_services_control(): boolean {
    return this._config?.enable_services_control || false;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    return html`
      <div class="card-config">
        ${this._renderBaseConfig()} ${this._renderSubCardConfig('vehicle', this.isVehicleCardEditor)}
        ${this._renderSubCardConfig('trip', this.isTripCardEditor)}
        ${this._renderSubCardConfig('eco', this.isEcoCardEditor)}
        ${this._renderSubCardConfig('tyre', this.isTyreCardEditor)}
      </div>
    `;
  }

  private _renderBaseConfig(): TemplateResult {
    if (this.isSubEditorOpen) return html``;

    return html`
      <div class="base-config">
        ${this._renderFormSelectors()} ${this._renderCardEditorButtons()} ${this._renderMapPopupConfig()}
        ${this._renderImageConfig()} ${this._renderServicesConfig()} ${this._renderThemesConfig()}
        ${this._renderSwitches()}
        <div class="note">
          <p>version: ${CARD_VERSION}</p>
        </div>
      </div>
    `;
  }

  private _renderCardEditorButtons(): TemplateResult {
    const subcardBtns = html`
      <ha-alert alert-type="info">Select the card you want to configure.</ha-alert>
      <div class="cards-buttons">
        ${cardTypes.map(
          (card) => html`
            <ha-button
              @click=${() => {
                this[card.editor] = true;
                this._dispatchCardEvent(card.type);
              }}
              >${card.name}</ha-button
            >
          `,
        )}
      </div>
    `;
    return this.panelTemplate(
      'Buttons configuration',
      'Configure the subcards for individual buttons.',
      'mdi:view-dashboard',
      subcardBtns,
    );
  }

  private _renderSubCardConfig(cardType: string, isEditorOpen: boolean): TemplateResult {
    if (!isEditorOpen) return html``;

    return html`
      <div class="sub-card-config">
        <div class="sub-card-header">
          <ha-icon icon="mdi:arrow-left" @click=${() => this._handleBackClick()} style="cursor: pointer"></ha-icon>
          <h3>${this._getCardTitle(cardType)}</h3>
        </div>
        <ha-code-editor
          autofocus
          autocomplete-entities
          autocomplete-icons
          .value=${YAML.stringify(this._config?.[`${cardType}_card`] || [])}
          @blur=${(ev: CustomEvent) => this._handleCardConfigChange(ev, `${cardType}_card`)}
        ></ha-code-editor>
      </div>
    `;
  }

  private _handleBackClick(): void {
    this.isVehicleCardEditor = false;
    this.isTripCardEditor = false;
    this.isEcoCardEditor = false;
    this.isTyreCardEditor = false;
  }

  private _getCardTitle(cardType: string): string {
    return `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card Configuration`;
  }

  private _renderSwitches(): TemplateResult {
    const switches = html`
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
      <ha-formfield .label=${`Enable services control`}>
        <ha-switch
          .checked=${this._enable_services_control !== false}
          .configValue=${'enable_services_control'}
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
      <ha-formfield .label=${`Show error notification`}>
        <ha-switch
          .checked=${this._show_error_notify !== false}
          .configValue=${'show_error_notify'}
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
    `;

    return html` <div class="panel-container">
      <ha-expansion-panel
        .expanded=${false}
        .outlined=${true}
        .header=${'Show options'}
        .secondary=${`Show or hide the options in the card.`}
        leftChevron
      >
        <div class="right-icon" slot="icons">
          <ha-icon icon="mdi:toggle-switch"></ha-icon>
        </div>
        <div class="card-config">
          <div class="switches">${switches}</div>
        </div>
      </ha-expansion-panel>
    </div>`;
  }

  private _renderFormSelectors(): TemplateResult {
    // You can restrict on domain type
    // const entities = Object.keys(this.hass.states).filter((entity) => entity.startsWith('sensor'));

    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );

    const device_trackers = Object.keys(this.hass.states).filter((entity) => entity.startsWith('device_tracker'));

    return html`
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
        type="password"
        .value=${this._google_api_key}
        .configValue=${'google_api_key'}
        @input=${this._valueChanged}
      ></ha-textfield>
    `;
  }

  private _renderThemesConfig(): TemplateResult {
    if (!this.hass) return html``;
    const customThemes = Object.keys(this.hass.themes.themes);
    const themesOpts = ['Default', ...customThemes];

    const themesConfig = html`
      <ha-select
        label="Theme"
        .value=${this._config?.selected_theme?.theme || 'Default'}
        .configValue=${'theme'}
        @selected=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
      >
        ${themesOpts.map((theme) => html`<mwc-list-item value=${theme}>${theme}</mwc-list-item> `)}
      </ha-select>

      <ha-select
        label="Theme mode"
        .value=${this._config?.selected_theme?.mode || 'system'}
        .configValue=${'mode'}
        @selected=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
      >
        <mwc-list-item value="system">System</mwc-list-item>
        <mwc-list-item value="dark">Dark</mwc-list-item>
        <mwc-list-item value="light">Light</mwc-list-item>
      </ha-select>
    `;
    return this.panelTemplate('Themes configuration', 'Choose the theme for the card.', 'mdi:palette', themesConfig);
  }

  private _renderImageConfig(): TemplateResult {
    let images = '';

    if (this._config && Array.isArray(this._config.images)) {
      images = this._config.images.join('\n');
    } else if (this._config && typeof this._config.images === 'string') {
      images = this._config.images;
    }
    const imageCodeEditor = html`
      <ha-alert alert-type="info"
        >There is no need to add a '-' for each line. Each line will be treated as a separate URL
        automatically.</ha-alert
      >
      <ha-code-editor
        autofocus
        autocomplete-entities
        autocomplete-icons
        .hass=${this.hass}
        .value=${images}
        .configValue="${'images'}"
        @blur=${this._valueChanged}
      ></ha-code-editor>
    `;

    return this.panelTemplate('Images configuration', 'Add the URLs of the images.', 'mdi:image', imageCodeEditor);
  }

  private _renderMapPopupConfig(): TemplateResult {
    const mapConfig = html`
      <ha-textfield
        label="Hours to show"
        type="number"
        .value=${this._config?.map_popup_config?.hours_to_show || 0}
        .configValue=${'hours_to_show'}
        @input=${this._valueChanged}
      ></ha-textfield>
      <ha-textfield
        label="Default zoom"
        type="number"
        .value=${this._config?.map_popup_config?.default_zoom || 14}
        .configValue=${'default_zoom'}
        @input=${this._valueChanged}
      ></ha-textfield>
      <ha-select
        label="Theme mode"
        .value=${this._config?.map_popup_config?.theme_mode || 'auto'}
        .configValue=${'theme_mode'}
        @selected=${this._valueChanged}
        @closed=${(ev) => ev.stopPropagation()}
      >
        <mwc-list-item value="auto">Auto</mwc-list-item>
        <mwc-list-item value="dark">Dark</mwc-list-item>
        <mwc-list-item value="light">Light</mwc-list-item>
      </ha-select>
    `;
    return this.panelTemplate(
      'Map popup configuration',
      'Choose the configuration for the map popup.',
      'mdi:map-search',
      mapConfig,
    );
  }

  private _renderServicesConfig(): TemplateResult {
    const services = this._config?.services || {}; // Ensure services object exists and default to empty object if undefined

    const servicesConfig = html`
      <ha-alert alert-type="info">
        Choose which services you want to enable. If a service is disabled, it will not be shown in the card.
      </ha-alert>
      <div class="switches">
        ${Object.entries(servicesCtrl).map(
          ([key, { name }]) => html`
            <ha-formfield .label=${name}>
              <ha-switch
                .checked=${services[key] !== undefined ? services[key] : false}
                .configValue="${key}"
                @change=${this._servicesValueChanged}
              ></ha-switch>
            </ha-formfield>
          `,
        )}
      </div>
    `;
    return this.panelTemplate(
      'Services configuration',
      'Choose the services you want to enable.',
      'mdi:car-cog',
      servicesConfig,
    );
  }

  private panelTemplate(title: string, secondary: string, icon: string, content: TemplateResult): TemplateResult {
    return html`
      <div class="panel-container">
        <ha-expansion-panel .expanded=${false} .outlined=${true} .header=${title} .secondary=${secondary} leftChevron>
          <div class="right-icon" slot="icons">
            <ha-icon icon=${icon}></ha-icon>
          </div>
          <div class="card-config">${content}</div>
        </ha-expansion-panel>
      </div>
    `;
  }

  /* --------------------- ADDITIONAL HANDLERS AND METHODS -------------------- */

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private _handleCardConfigChange(ev: CustomEvent, configKey: keyof VehicleCardConfig): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target as HTMLInputElement;
    let newValue: LovelaceCardConfig[];

    try {
      newValue = YAML.parse(target.value); // Parse YAML content

      // If the parsed value is null or not an array, set it to an empty array
      if (!newValue || !Array.isArray(newValue)) {
        newValue = [];
      }
    } catch (e) {
      console.error(`Parsing error for ${configKey}:`, e);
      return;
    }

    this._config = {
      ...this._config,
      [configKey]: newValue,
    };

    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _servicesValueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (this[`${configValue}`] === target.checked) {
      return;
    }

    this._config = {
      ...this._config,
      services: {
        ...this._config.services,
        [configValue]: target.checked,
      },
    };

    fireEvent(this, 'config-changed', { config: this._config });
  }

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
      this._config = {
        ...this._config,
        images: newValue,
      };
    } else if (['hours_to_show', 'default_zoom'].includes(configValue)) {
      newValue = target.value === '' ? undefined : Number(target.value);
      if (!isNaN(newValue)) {
        this._config = {
          ...this._config,
          map_popup_config: {
            ...this._config.map_popup_config,
            [configValue]: newValue,
          },
        };
      }
    } else if (configValue === 'theme_mode') {
      newValue = target.value;
      this._config = {
        ...this._config,
        map_popup_config: {
          ...this._config.map_popup_config,
          [configValue]: newValue,
        },
      };
    } else if (['theme', 'mode'].includes(configValue)) {
      newValue = target.value;
      this._config = {
        ...this._config,
        selected_theme: {
          ...this._config.selected_theme,
          [configValue]: newValue,
        },
      };
    } else {
      newValue = target.checked !== undefined ? target.checked : target.value;
      this._config = {
        ...this._config,
        [configValue]: newValue,
      };
    }

    if (newValue && newValue.length === 0) {
      // Check for an empty array
      const tmpConfig = { ...this._config };
      delete tmpConfig[configValue];
      this._config = tmpConfig;
    }

    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _dispatchCardEvent(cardType: string): void {
    // Dispatch the custom event with the cardType name
    const detail = cardType;
    const ev = new CustomEvent('editor-event', { detail, bubbles: true, composed: true });
    this.dispatchEvent(ev);
    console.log('Test event dispatched:', detail);
  }

  static styles: CSSResultGroup = css`
    .card-config {
      width: 100%;
      margin-block: 0.5rem;
    }
    .panel-container {
      margin-top: 1rem;
    }

    .switches {
      margin: 0.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 1rem;
    }
    ha-select {
      --mdc-menu-max-height: 200px;
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

    ha-expansion-panel .container {
      padding: 0px 1rem !important;
    }

    h3 {
      color: var(--secondary-text-color);
      margin-block: 0;
    }

    .right-icon {
      padding-inline: 0.5rem;
    }

    .note {
      color: var(--secondary-text-color);
      text-align: start;
    }
    .cards-buttons {
      display: flex;
      justify-content: space-around;
    }

    .sub-card-header {
      display: flex;
      width: 100%;
      justify-content: space-between;
      padding: 0.5rem 0 1rem;
      align-items: center;
      border-bottom: 1px solid var(--divider-color);
    }

    .sub-card-config {
      margin-top: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
  }
}
