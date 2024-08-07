/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import YAML from 'yaml';

// Custom card helpers
import { fireEvent, LovelaceCardEditor, LovelaceCardConfig } from 'custom-card-helpers';

// Local types
import { HomeAssistantExtended as HomeAssistant, ServicesConfig, VehicleCardConfig } from './types';
import { servicesCtrl } from './const/remote-control-keys';
import { cardTypes } from './const/data-keys';
import { editorShowOpts } from './const/data-keys';
import { CARD_VERSION } from './const';
import { languageOptions, localize } from './utils/localize';
import { getModelName } from './utils/get-device-entities';
import editorcss from './css/editor.css';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: VehicleCardConfig;

  @state() private _helpers?: any;

  @property({ type: Boolean }) private isVehicleCardEditor = false;
  @property({ type: Boolean }) private isTripCardEditor = false;
  @property({ type: Boolean }) private isEcoCardEditor = false;
  @property({ type: Boolean }) private isTyreCardEditor = false;
  @property({ type: Array }) imageNames: string[] = [];

  private _system_language = localStorage.getItem('selectedLanguage');

  get isSubEditorOpen(): boolean {
    return this.isVehicleCardEditor || this.isTripCardEditor || this.isEcoCardEditor || this.isTyreCardEditor;
  }

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = config;
    if (!this._config.entity) {
      this._config.entity = this.getCarEntity();
      this._config.name = await getModelName(this.hass, this._config);
      fireEvent(this, 'config-changed', { config: this._config });
    }

    this.loadCardHelpers();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) {
      return false;
    }

    if (changedProps.has('imageNames')) {
      this.imageNames = this._config.images || [];
      return true;
    }

    return true;
  }
  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this._selected_language || this._system_language || 'en', search, replace);
  };

  private getCarEntity(): string {
    if (!this.hass) return '';
    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );
    return entities[0] || '';
  }

  private get _name(): string {
    return this._config?.name || '';
  }

  private get _entity(): string {
    return this._config?.entity || '';
  }

  private get _device_tracker(): string {
    return this._config?.device_tracker || '';
  }

  private get _show_slides(): boolean {
    return this._config?.show_slides || false;
  }

  private get _show_map(): boolean {
    return this._config?.show_map || false;
  }

  private get _show_buttons(): boolean {
    return this._config?.show_buttons || false;
  }

  private get _show_background(): boolean {
    return this._config?.show_background || false;
  }

  private get _enable_map_popup(): boolean {
    return this._config?.enable_map_popup || false;
  }

  private get _show_error_notify(): boolean {
    return this._config?.show_error_notify || false;
  }

  private get _google_api_key(): string {
    return this._config?.google_api_key || '';
  }

  private get _enable_services_control(): boolean {
    return this._config?.enable_services_control || false;
  }

  private get _selected_language(): string | null {
    return this._config?.selected_language || null;
  }

  private get _images(): string[] {
    return this._config?.images || [];
  }

  private get _lang(): string {
    return this._config?.lang || this._system_language || 'en';
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
    const baseCardTypes = cardTypes(this._lang);
    const localInfo = this.localize('editor.common.infoButton');
    const subcardBtns = html`
      <ha-alert alert-type="info">${localInfo}</ha-alert>
      <div class="cards-buttons">
        ${baseCardTypes.map(
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
    return this.panelTemplate('buttonConfig', 'buttonConfig', 'mdi:view-dashboard', subcardBtns);
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
    for (const card of ['Vehicle', 'Trip', 'Eco', 'Tyre']) {
      this[`is${card}CardEditor`] = false;
    }
  }

  private _getCardTitle(cardType: string): string {
    return `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card Configuration`;
  }

  private _renderSwitches(): TemplateResult {
    const lang = this._selected_language || this._system_language || 'en';
    let showOptions = editorShowOpts(lang);
    // Filter out the enable_map_popup option
    showOptions = showOptions.filter((option) => option.configKey !== 'enable_map_popup');

    const switches = html`
      <div class="switches">
        ${showOptions.map(
          (option) => html`
            <ha-formfield .label=${option.label}>
              <ha-switch
                .disabled=${this._getSwitchDisabledState(option.configKey)}
                .checked=${this[`_${option.configKey}`] !== false}
                .configValue=${option.configKey}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          `,
        )}
      </div>
    `;

    return this.panelTemplate('showConfig', 'showConfig', 'mdi:toggle-switch', switches);
  }

  private _getSwitchDisabledState(configKey: string): boolean {
    if (configKey === 'show_slides') {
      return !this._config?.images || this._config?.images.length === 0;
    }
    if (configKey === 'enable_map_popup') {
      return this._show_map === false || this._show_map === undefined || !this._config?.device_tracker;
    }
    return false;
  }

  private _renderFormSelectors(): TemplateResult {
    // You can restrict on domain type
    // const entities = Object.keys(this.hass.states).filter((entity) => entity.startsWith('sensor'));

    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );

    return html`
      <ha-textfield
        label="Name (Optional)"
        .value=${this._name}
        .configValue=${'name'}
        @input=${this._valueChanged}
      ></ha-textfield>
      <ha-select
        fixedMenuPosition
        label="Entity (Required)"
        .configValue=${'entity'}
        .value=${this._entity}
        @selected=${this._valueChanged}
        @closed=${(ev) => ev.stopPropagation()}
      >
        ${entities.map((entity) => {
          const friendlyName = this.hass.states[entity].attributes.friendly_name;
          const displayName = `${friendlyName ? `${friendlyName} (${entity})` : entity} `;
          return html`<mwc-list-item .value=${entity}> ${displayName}</mwc-list-item>`;
        })}
      </ha-select>
    `;
  }

  private _renderThemesConfig(): TemplateResult {
    if (!this.hass) return html``;
    const customThemes = Object.keys(this.hass.themes.themes);
    const themesOpts = ['Default', ...customThemes];
    const sysLang = this._system_language || 'en';
    const langOpts = [
      { key: sysLang, name: 'System' },
      ...languageOptions.sort((a, b) => a.name.localeCompare(b.name)),
    ];
    const themesConfig = html`
      <ha-select
        label="Language"
        .value=${this._selected_language || ''}
        .configValue=${'selected_language'}
        @selected=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
      >
        ${langOpts.map((lang) => html`<mwc-list-item value=${lang.key}>${lang.name}</mwc-list-item> `)}
      </ha-select>
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
    return this.panelTemplate('themeLangConfig', 'themeLangConfig', 'mdi:palette', themesConfig);
  }

  private _renderImageConfig(): TemplateResult {
    const textFormInput = html`<div class="image-config">
        ${this._images.map(
          (image, index) => html`
            <div class="custom-background-wrapper">
              <ha-textfield
                class="image-input"
                .label=${'IMAGE #' + (index + 1)}
                .configValue=${'images'}
                .value=${this.imageNames[index] ?? image}
                @input=${(event: Event) => this._handleImageChange(event, index)}
              ></ha-textfield>
              <div class="file-upload">
                <ha-icon icon="mdi:delete" @click=${() => this._removeImage(index)}></ha-icon>
              </div>
            </div>
          `,
        )}

        <div class="custom-background-wrapper">
          <ha-textfield
            .label=${'Add URL or Upload'}
            .configValue=${'new_image_url'}
            @change=${this._handleNewImageUrl.bind(this)}
            @keydown=${this._handleNewImageUrl.bind(this)}
          ></ha-textfield>
          <div class="file-upload"><ha-icon icon="mdi:plus" @click=${() => this._handleNewImageUrl}></ha-icon></div>
          <label for="file-upload-new" class="file-upload">
            <ha-icon icon="mdi:upload"></ha-icon>
            <input
              type="file"
              id="file-upload-new"
              class="file-input"
              @change=${this._handleFilePicked.bind(this)}
              accept="image/*"
            />
          </label>
        </div>
      </div>
      ${this._renderToast()}`;

    return this.panelTemplate('imagesConfig', 'imagesConfig', 'mdi:image', textFormInput);
  }

  private _handleNewImageUrl(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (ev instanceof KeyboardEvent && ev.key !== 'Enter') {
      return;
    }
    if (input.value) {
      if (this._config) {
        const backgroundImages = [...this._images]; // Create a copy of the array
        backgroundImages.push(input.value);
        const imageNames = [...this.imageNames]; // Create a copy of the array
        imageNames.push(input.value); // Add the URL as the image name
        input.value = ''; // Clear the input after adding the URL
        this._config = { ...this._config, images: backgroundImages };
        this.imageNames = imageNames;

        fireEvent(this, 'config-changed', { config: this._config });
        this.requestUpdate();
      }
    }
  }

  private _handleImageChange(ev: Event, index: number): void {
    if (!this._config || !this._config.images) return;
    const input = ev.target as HTMLInputElement;
    const backgroundImages = [...this._images]; // Create a copy of the array
    const imageNames = [...this.imageNames]; // Create a copy of the array
    backgroundImages[index] = input.value;
    imageNames[index] = input.value;
    this._config = { ...this._config, images: backgroundImages };
    this.imageNames = imageNames;
    console.log('Changed image:', this._images, this.imageNames);
    fireEvent(this, 'config-changed', { config: this._config });
    this.requestUpdate();
  }

  private async _handleFilePicked(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/image/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${this.hass.auth.data.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageId = data.id;
      const imageName = data.name.toUpperCase();

      if (!imageId) {
        throw new Error('Image ID is missing in the response');
      }

      const imageUrl = `/api/image/serve/${imageId}/original`;

      if (this._config) {
        const backgroundImages = [...this._images]; // Create a copy of the array
        const imageNames = [...this.imageNames]; // Create a copy of the array
        backgroundImages.push(imageUrl);
        imageNames.push(imageName);
        this._config = { ...this._config, images: backgroundImages };
        this.imageNames = imageNames;
        fireEvent(this, 'config-changed', { config: this._config });
        this.requestUpdate();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      this.launchToast();
    }
  }

  private _removeImage(index: number): void {
    if (this._config) {
      const backgroundImages = [...this._images]; // Create a copy of the array
      const imageNames = [...this.imageNames]; // Create a copy of the array
      backgroundImages.splice(index, 1);
      imageNames.splice(index, 1); // Remove the corresponding image name
      this._config = { ...this._config, images: backgroundImages };
      this.imageNames = imageNames;
      fireEvent(this, 'config-changed', { config: this._config });
      this.requestUpdate();
    }
  }

  private _renderMapPopupConfig(): TemplateResult {
    const device_trackers = Object.keys(this.hass.states).filter((entity) => entity.startsWith('device_tracker'));
    const infoAlert = this.localize('editor.common.infoMap');
    const lang = this._selected_language || this._system_language || 'en';
    const enableMapPopupSwtich = editorShowOpts(lang).find((option) => option.configKey === 'enable_map_popup');

    const mapConfig = html`
      <ha-select
        naturalMenuWidth
        fixedMenuPosition
        label="Device Tracker (Optional)"
        .configValue=${'device_tracker'}
        .value=${this._device_tracker}
        @selected=${this._valueChanged}
        @closed=${(ev) => ev.stopPropagation()}
      >
        <mwc-list-item value="">None</mwc-list-item>
        ${device_trackers.map((entity) => {
          const friendlyName = this.hass.states[entity].attributes.friendly_name;
          const displayName = `${friendlyName ? `${friendlyName} (${entity})` : entity} `;
          return html`<mwc-list-item .value=${entity}> ${displayName}</mwc-list-item>`;
        })}
      </ha-select>
      <div class="flex-col">
        <ha-textfield
          style="flex: 2;"
          label="Google API Key (Optional)"
          type="password"
          .value=${this._google_api_key}
          .configValue=${'google_api_key'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-formfield style="flex: 1;" .label=${enableMapPopupSwtich?.label}>
          <ha-switch
            .checked=${this._enable_map_popup}
            .configValue=${'enable_map_popup'}
            @change=${this._valueChanged}
          ></ha-switch>
        </ha-formfield>
      </div>
      <ha-alert alert-type="info">${infoAlert}</ha-alert>
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
    return this.panelTemplate('mapConfig', 'mapConfig', 'mdi:map-search', mapConfig);
  }

  private _renderServicesConfig(): TemplateResult {
    const servicesItems = this._config?.services || {}; // Ensure services object exists and default to empty object if undefined
    const infoAlert = this.localize('editor.common.infoServices');
    const lang = this._selected_language || this._system_language || 'en';
    const handleCheckAll = (check: boolean) => {
      if (!this._config) return;
      const lang = this._selected_language || this._system_language || 'en';
      const updatedServices: ServicesConfig = Object.keys(servicesCtrl(lang)).reduce((acc, key) => {
        acc[key] = check;
        return acc;
      }, {} as ServicesConfig);
      this._config = { ...this._config, services: updatedServices };
    };
    const radioBtns = html` <div class="flex-col">
      <ha-formfield .label=${this.localize('editor.common.checkAll')}>
        <ha-radio name="check-toggle" @change=${() => handleCheckAll(true)}></ha-radio>
      </ha-formfield>
      <ha-formfield .label=${this.localize('editor.common.uncheckAll')}>
        <ha-radio name="check-toggle" @change=${() => handleCheckAll(false)}></ha-radio>
      </ha-formfield>
    </div>`;

    const servicesConfig = html`
      <ha-alert alert-type="info"> ${infoAlert} </ha-alert>

      <div class="switches">
        ${Object.entries(servicesCtrl(lang)).map(
          ([key, { name }]) => html`
            <ha-formfield .label=${name}>
              <ha-switch
                .checked=${servicesItems[key] !== undefined ? servicesItems[key] : false}
                .configValue="${key}"
                @change=${this._servicesValueChanged}
              ></ha-switch>
            </ha-formfield>
          `,
        )}
      </div>
    `;
    return this.panelTemplate('servicesConfig', 'servicesConfig', 'mdi:car-cog', servicesConfig);
  }

  private panelTemplate(titleKey: string, descKey: string, icon: string, content: TemplateResult): TemplateResult {
    const localTitle = this.localize(`editor.${titleKey}.title`);
    const localDesc = this.localize(`editor.${descKey}.desc`);

    return html`
      <div class="panel-container">
        <ha-expansion-panel
          .expanded=${false}
          .outlined=${true}
          .header=${localTitle}
          .secondary=${localDesc}
          leftChevron
        >
          <div class="right-icon" slot="icons">
            <ha-icon icon=${icon}></ha-icon>
          </div>
          <div class="card-config">${content}</div>
        </ha-expansion-panel>
      </div>
    `;
  }

  /* --------------------- ADDITIONAL HANDLERS AND METHODS -------------------- */

  private _renderToast(): TemplateResult {
    const toastMsg = this.localize('common.toastImageError');
    return html`
      <div id="toast">
        <ha-alert alert-type="warning" dismissable @alert-dismissed-clicked=${this._handleAlertDismissed}
          >${toastMsg}
        </ha-alert>
      </div>
    `;
  }

  private launchToast(): void {
    const toast = this.shadowRoot?.getElementById('toast') as HTMLElement;
    if (!toast) return;

    toast.classList.add('show');
  }

  private _handleAlertDismissed(): void {
    const toast = this.shadowRoot?.getElementById('toast') as HTMLElement;
    if (toast) {
      toast.classList.remove('show');
    }
  }

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
  static get styles(): CSSResultGroup {
    return editorcss;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
  }
}
