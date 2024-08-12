/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import YAML from 'yaml';

// Custom card helpers
import { fireEvent, LovelaceCardEditor, LovelaceCardConfig } from 'custom-card-helpers';

// Local types
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleCardConfig,
  VehicleImagesList,
  VehicleImage,
  ShowOptions,
  Services,
  CardTypeConfig,
} from './types';
import { servicesCtrl } from './const/remote-control-keys';
import { cardTypes } from './const/data-keys';
import { editorShowOpts } from './const/data-keys';
import { CARD_VERSION } from './const/const';
import { languageOptions, localize } from './localize/localize';
import { getModelName } from './utils/get-device-entities';
import { loadHaComponents } from './utils/loader';
import editorcss from './css/editor.css';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: VehicleCardConfig;
  @state() private selectedLanguage!: string;
  @state() private _activeSubcardType: string | null = null;

  @state() private _images: VehicleImage[] = [];

  private _system_language = localStorage.getItem('selectedLanguage');

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
  }

  private convertToNewConfig(oldConfig: VehicleCardConfig): VehicleImagesList {
    console.log('converting old config to new config');
    const newImages: VehicleImage[] = (oldConfig.images || []).map((url: string) => ({
      url,
      title: url,
    }));

    return {
      ...oldConfig,
      images: newImages,
    };
  }

  private _validateConfig(config: VehicleCardConfig): boolean {
    if (Array.isArray(config.images) && config.images.length > 0 && typeof config.images[0] === 'object') {
      console.log('Config is valid');
      return true;
    } else {
      console.log('Config is invalid');
      return false;
    }
  }

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = this._validateConfig(config) ? config : this.convertToNewConfig(config);
    this._images = this._config.images;
    this.selectedLanguage = this._config.selected_language || localStorage.getItem('selectedLanguage') || 'en';
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    if (!this._config.entity) {
      console.log('Entity not found, fetching...');
      this._config.entity = this.getCarEntity();
    }
    if (!this._config.model_name) {
      const modelName = await getModelName(this.hass, this._config);
      this._config = { ...this._config, model_name: modelName };
      this.configChanged();
    }
  }

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this.selectedLanguage, search, replace);
  };

  private getCarEntity = (): string => {
    if (!this.hass) return '';
    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );
    return entities[0] || '';
  };

  private _getServicesConfigValue<K extends keyof Services>(key: K): boolean {
    return this._config?.services[key] || false;
  }

  private _getConfigShowValue<K extends keyof ShowOptions>(key: K): boolean {
    return this._config?.[key] || false;
  }

  private get baseCardTypes() {
    return cardTypes(this.selectedLanguage);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }
    return html`
      <div class="card-config">
        ${!this._activeSubcardType ? this._renderBaseConfig() : this._renderCustomSubCardUI()}
      </div>
    `;
  }

  private _renderBaseConfig(): TemplateResult {
    return html`
      <div class="base-config">
        ${this._renderNameEntityForm()} ${this._renderCardEditorButtons()} ${this._renderMapPopupConfig()}
        ${this._renderImageConfig()} ${this._renderServicesConfig()} ${this._renderThemesConfig()}
        ${this._renderSwitches()}
        <div class="note">
          <p>version: ${CARD_VERSION}</p>
        </div>
      </div>
    `;
  }

  private _renderCustomSubCardUI(): TemplateResult {
    const selectedCard = this.baseCardTypes.filter((card) => card.type === this._activeSubcardType);

    return html`${selectedCard.map((card) => this._renderSubCardConfig(card))}`;
  }

  private _renderSubCardConfig(card: CardTypeConfig): TemplateResult {
    const { config, name, icon } = card;
    return html`
      <div class="sub-card-config">
        <div class="sub-card-header">
          <ha-icon
            icon="mdi:arrow-left"
            @click=${() => (this._activeSubcardType = null)}
            style="cursor: pointer"
          ></ha-icon>
          <div>
            <h3>${name}</h3>
            <ha-icon icon=${icon}></ha-icon>
          </div>
        </div>
        <ha-code-editor
          autofocus
          autocomplete-entities
          autocomplete-icons
          .value=${YAML.stringify(this._config?.[config] || [])}
          @blur=${(ev: CustomEvent) => this._handleCardConfigChange(ev, config)}
        ></ha-code-editor>
      </div>
    `;
  }

  private _renderCardEditorButtons(): TemplateResult {
    const localInfo = this.localize('editor.common.infoButton');
    const subcardBtns = html`
      <ha-alert alert-type="info">${localInfo}</ha-alert>
      <div class="cards-buttons">
        ${this.baseCardTypes.map(
          (card) => html`
            <ha-button
              @click=${() => {
                this._dispatchCardEvent(card.type);
                this._activeSubcardType = card.type;
              }}
              >${card.name}</ha-button
            >
          `,
        )}
      </div>
    `;
    return this.panelTemplate('buttonConfig', 'buttonConfig', 'mdi:view-dashboard', subcardBtns);
  }

  private _renderSwitches(): TemplateResult {
    let showOptions = editorShowOpts(this.selectedLanguage);
    // Filter out the enable_map_popup option

    showOptions = showOptions.filter((option) => option.configKey !== 'enable_map_popup');

    const switches = html`
      <div class="switches">
        ${showOptions.map(
          (option) => html`
            <ha-formfield .label=${option.label}>
              <ha-switch
                .checked=${this._getConfigShowValue(option.configKey) !== false}
                .configValue=${option.configKey}
                @change=${this._showValueChanged}
              ></ha-switch>
            </ha-formfield>
          `,
        )}
      </div>
    `;

    return this.panelTemplate('showConfig', 'showConfig', 'mdi:toggle-switch', switches);
  }

  private _renderNameEntityForm(): TemplateResult {
    // Filter entities as per your requirement
    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car'),
    );
    const modelName = this._config.model_name;

    // Define options for the combo-box
    const options = [{ value: modelName, label: modelName }];

    // The combo-box for entering a custom name or selecting the model name
    const nameComboBox = html`
      <ha-combo-box
        item-value-path="value"
        item-label-path="label"
        .hass=${this.hass}
        .label=${'Select or Enter Name'}
        .items=${options}
        .allowCustomValue=${true}
        .value=${this._config.name}
        @value-changed=${this._onCustomNameInput}
      ></ha-combo-box>
    `;

    return html`
      ${nameComboBox}
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config?.entity}
        .required=${true}
        .configValue=${'entity'}
        @value-changed=${this._valueChanged}
        allow-custom-entity
        .includeEntities=${entities}
      ></ha-entity-picker>
    `;
  }

  private _onCustomNameInput(event: CustomEvent) {
    const newValue = event.detail.value;
    // Update the config.name with the custom name entered by the user
    this._config = {
      ...this._config,
      name: newValue,
    };

    // Trigger a re-render if needed
    this.configChanged();
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
        .value=${this.selectedLanguage}
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
        ${this._config.images.map((image, index) => {
          return html`<div class="custom-background-wrapper">
            <ha-textfield
              class="image-input"
              .label=${'IMAGE #' + (index + 1)}
              .configValue=${'images'}
              .value=${image.title}
              @input=${(event: Event) => this._handleImageChange(event, index)}
            ></ha-textfield>
            <div class="file-upload">
              <ha-icon icon="mdi:delete" @click=${() => this._removeImage(index)}></ha-icon>
            </div>
          </div>`;
        })}

        <div class="custom-background-wrapper">
          <ha-textfield
            .label=${'Add URL or Upload'}
            .configValue=${'new_image_url'}
            @change=${(event: Event) => this._handleNewImageUrl(event)}
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

  private _renderMapPopupConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoMap');
    const enableMapPopupSwtich = editorShowOpts(this.selectedLanguage).find(
      (option) => option.configKey === 'enable_map_popup',
    );

    const mapConfig = html`
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config?.device_tracker}
        .required=${false}
        .configValue=${'device_tracker'}
        @value-changed=${this._valueChanged}
        allow-custom-entity
        .includeDomains=${['device_tracker']}
        .label=${'Device Tracker (Optional)'}
      ></ha-entity-picker>
      <div class="flex-col">
        <ha-textfield
          style="flex: 1 1 30%;"
          label="Google API Key (Optional)"
          type="password"
          .value=${this._config?.google_api_key}
          .configValue=${'google_api_key'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-formfield style="flex: 1;" .label=${enableMapPopupSwtich?.label}>
          <ha-switch
            .checked=${this._getConfigShowValue(enableMapPopupSwtich?.configKey as keyof ShowOptions) !== false}
            .configValue=${enableMapPopupSwtich?.configKey}
            @change=${this._showValueChanged}
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
        @closed=${(ev: Event) => ev.stopPropagation()}
      >
        <mwc-list-item value="auto">Auto</mwc-list-item>
        <mwc-list-item value="dark">Dark</mwc-list-item>
        <mwc-list-item value="light">Light</mwc-list-item>
      </ha-select>
    `;
    return this.panelTemplate('mapConfig', 'mapConfig', 'mdi:map-search', mapConfig);
  }

  private _renderServicesConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoServices');

    const servicesConfig = html`
      <ha-alert alert-type="info"> ${infoAlert} </ha-alert>

      <div class="switches">
        ${Object.entries(servicesCtrl(this.selectedLanguage)).map(
          ([key, { name }]) => html`
            <ha-formfield .label=${name}>
              <ha-switch
                .checked=${this._getServicesConfigValue(key as keyof Services) !== false}
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

  private _renderToast(): TemplateResult {
    const toastMsg = this.localize('card.common.toastImageError');
    return html`
      <div id="toast">
        <ha-alert alert-type="warning" dismissable @alert-dismissed-clicked=${this._handleAlertDismissed}
          >${toastMsg}
        </ha-alert>
      </div>
    `;
  }

  private panelTemplate(titleKey: string, descKey: string, icon: string, content: TemplateResult): TemplateResult {
    const localTitle = this.localize(`editor.${titleKey}.title`);
    const localDesc = this.localize(`editor.${descKey}.desc`);

    return html`
      <div class="panel-container">
        <ha-expansion-panel .outlined=${true} .header=${localTitle} .secondary=${localDesc}>
          <div class="right-icon" slot="icons">
            <ha-icon icon=${icon}></ha-icon>
          </div>
          <div class="card-config">${content}</div>
        </ha-expansion-panel>
      </div>
    `;
  }

  /* --------------------- ADDITIONAL HANDLERS AND METHODS -------------------- */

  private _handleNewImageUrl(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.value) {
      return;
    }
    if (this._config) {
      const images = [...this._config.images]; // Create a copy of the array
      images.push({ url: input.value, title: input.value });
      input.value = '';
      this._config = { ...this._config, images };
      console.log('New image added:', images[images.length - 1].url);
      this.configChanged();
    }
  }

  private _handleImageChange(ev: Event, index: number): void {
    const input = ev.target as HTMLInputElement;
    if (this._config) {
      const images = [...this._config.images]; // Create a copy of the array
      images[index] = { ...images[index], url: input.value, title: input.value };
      this._config = { ...this._config, images };
      console.log('Image changed:', images[index].url);
      this.configChanged();
    }
  }

  private async _handleFilePicked(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      console.log('No files selected.');
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
        console.error('Failed to upload image, response status:', response.status);
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageId = data.id;
      const imageName = data.name ? data.name.toUpperCase() : 'UNKNOWN';

      if (!imageId) {
        console.error('Image ID is missing in the response');
        throw new Error('Image ID is missing in the response');
      }

      const imageUrl = `/api/image/serve/${imageId}/original`;
      // console.log('Uploaded image URL:', imageUrl, 'Image name:', imageName);

      if (this._config) {
        const images = [...this._images]; // Create a copy of the array
        images.push({ url: imageUrl, title: imageName });
        this._images = images;
        this._config = { ...this._config, images };
        this.configChanged();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      this.launchToast();
    }
  }

  private _removeImage(index: number): void {
    if (this._config) {
      const backgroundImages = [...this._images]; // Create a copy of the array
      backgroundImages.splice(index, 1);
      this._config = { ...this._config, images: backgroundImages };
      this.configChanged();
      this.requestUpdate();
    }
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

    this.configChanged();
  }

  private _servicesValueChanged(ev: any): void {
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

    this.configChanged();
  }

  private _showValueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (this[`${configValue}`] === target.checked) {
      return;
    }

    (this._config = {
      ...this._config,
      [configValue]: target.checked,
    }),
      this.configChanged();
  }
  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (this[`${configValue}`] === target.value) {
      return;
    }

    let newValue: any;
    if (['hours_to_show', 'default_zoom'].includes(configValue)) {
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
    this.configChanged();
  }

  private configChanged() {
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
