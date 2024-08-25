/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
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
import { uploadImage, handleFirstUpdated } from './utils/ha-helpers';
import { loadHaComponents } from './utils/loader';
import { compareVersions } from './utils/helpers';
import editorcss from './css/editor.css';

import Sortable from 'sortablejs';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: VehicleCardConfig;
  @state() private _activeSubcardType: string | null = null;
  @state() private _newImageUrl: string = '';

  @state() private _latestRelease: string = '';
  public _system_language = this.hass?.language;
  public _sortable: Sortable | null = null;
  private _selectedItems: Set<string> = new Set();

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    if (process.env.ROLLUP_WATCH === 'true') {
      window.BenzEditor = this;
    }
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
      return true;
    }

    console.log('Config is invalid');
    return false;
  }

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = this._validateConfig(config) ? config : this.convertToNewConfig(config);
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    await handleFirstUpdated(this, changedProperties);
    const el = this.shadowRoot!.getElementById('images-list');
    if (el) {
      this._sortable = new Sortable(el, {
        handle: '.handle',
        animation: 150,
        ghostClass: 'ghost',
        onEnd: (evt) => {
          this._handleSortEnd(evt);
        },
      });
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
  }

  private _handleSortEnd(evt: any) {
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    console.log('Images before reorder:', this._config.images);
    console.log(`Reordering images: moving from index ${oldIndex} to ${newIndex}`);

    if (oldIndex !== newIndex) {
      this._reorderImages(oldIndex, newIndex);
    }
  }

  private _reorderImages(oldIndex: number, newIndex: number) {
    const configImages = this._config.images!.concat();
    const movedItem = configImages.splice(oldIndex, 1)[0];
    configImages.splice(newIndex, 0, movedItem);
    this._config = { ...this._config, images: configImages };
    this.configChanged();
  }

  private get selectedLanguage(): string {
    return this._config.selected_language || 'en';
  }

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this.selectedLanguage, search, replace);
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
        ${this._renderSwitches()} ${this._renderVersionInfo()}
      </div>
    `;
  }

  private _renderVersionInfo(): TemplateResult {
    return html`
        <div class="version">
          <span
            >${
              CARD_VERSION === this._latestRelease
                ? html`version: ${CARD_VERSION}`
                : html`version: ${CARD_VERSION} -> <span class="update">${this._latestRelease}</span>`
            }</span
          >
        </div>
        ${this._renderUpdateToast()}
      </div>
    `;
  }

  private _renderCustomSubCardUI(): TemplateResult {
    const selectedCard = this.baseCardTypes.filter((card) => card.type === this._activeSubcardType);

    return html`${selectedCard.map((card) => this._renderSubCardConfig(card))}`;
  }

  private _renderSubCardConfig(card: CardTypeConfig): TemplateResult {
    const { config, name, icon } = card;

    const subCardHeader = html`
      <div class="sub-card-header">
        <ha-icon
          icon="mdi:arrow-left"
          @click=${() => (this._activeSubcardType = null)}
          style="cursor: pointer"
        ></ha-icon>
        <div class="sub-card-title">
          <h3>${name}</h3>
          <ha-icon icon=${icon}></ha-icon>
        </div>
      </div>
    `;

    const editorWrapper = this.panelTemplate(
      'customCardConfig',
      'customCardConfig',
      'mdi:code-json',
      html` <ha-code-editor
        autofocus
        autocomplete-entities
        autocomplete-icons
        .value=${YAML.stringify(this._config?.[config] || [])}
        @blur=${(ev: CustomEvent) => this._handleCardConfigChange(ev, config)}
      ></ha-code-editor>`,
    );

    const buttonTemplate = this._renderCustomButtonTemplate(card);

    return html` <div class="sub-card-config">${subCardHeader}${buttonTemplate} ${editorWrapper}</div> `;
  }

  private _renderCustomButtonTemplate(card: CardTypeConfig): TemplateResult {
    const { button } = card;
    const primaryCfgValue = this._config[button]?.primary || '';
    const secondaryCfgValue = this._config[button]?.secondary || '';
    const notifyCfgValue = this._config[button]?.notify || '';
    const iconCfgValue = this._config[button]?.icon || '';

    const useDefault = this._config[button]?.enabled === true;

    const useDefaultRadioBtn = html`
      <ha-formfield .label=${'Use custom'}>
        <ha-checkbox
          .checked=${this._config[button]?.enabled !== false}
          .configValue=${'enabled'}
          .configBtnType=${button}
          @change=${this._customBtnChanged}
        ></ha-checkbox>
      </ha-formfield>
    `;

    const primaryInfo = html`
      <ha-textfield
        .disabled=${!useDefault}
        .label=${'Button Title'}
        .value=${primaryCfgValue}
        .configValue=${'primary'}
        .configBtnType=${button}
        @change=${this._customBtnChanged}
      ></ha-textfield>
    `;

    const iconSelector = html`
      <ha-icon-picker
        .disabled=${!useDefault}
        .hass=${this.hass}
        .label=${'Icon'}
        .value=${iconCfgValue}
        .configValue=${'icon'}
        .configBtnType=${button}
        @value-changed=${this._customBtnChanged}
      ></ha-icon-picker>
    `;

    const templateUI = (label: string, value: string, configValue: string, helper: string) => html`
      <div class="template-ui">
        <p>${label}</p>
        <ha-code-editor
          mode="jinja2"
          .hass=${this.hass}
          .value=${value}
          .configValue=${configValue}
          .configBtnType=${button}
          .readOnly=${!useDefault}
          @value-changed=${this._customBtnChanged}
          dir="ltr"
          .linewrap=${true}
          .autocompleteEntities=${true}
        ></ha-code-editor>
        <ha-input-helper-text>${helper}</ha-input-helper-text>
      </div>
    `;
    const secondaryTemplateEditor = templateUI(
      'Secondary information',
      secondaryCfgValue,
      'secondary',
      'Use Jinja2 template to display secondary information',
    );

    const notifyTemplate = templateUI(
      'Notify config',
      notifyCfgValue,
      'notify',
      `The result must return 'True' boolean to show the notification`,
    );

    return this.panelTemplate(
      'customButtonConfig',
      'customButtonConfig',
      'mdi:button-cursor',
      html` ${useDefaultRadioBtn}
        <div class="card-button-cfg">${primaryInfo} ${iconSelector}</div>
        ${secondaryTemplateEditor} ${notifyTemplate}`,
      true,
    );
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
                // this._dispatchCardEvent(card.type);
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
              <ha-checkbox
                .checked=${this._getConfigShowValue(option.configKey) !== false}
                .configValue=${option.configKey}
                @change=${this._showValueChanged}
              ></ha-checkbox>
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

  private _renderThemesConfig(): TemplateResult {
    if (!this.hass) return html``;
    const langOpts = [
      { key: 'system', name: 'System', nativeName: 'System' },
      ...languageOptions.sort((a, b) => a.name.localeCompare(b.name)),
    ];
    const themesConfig = html`
      <ha-select
        .label=${this.hass.localize('ui.panel.profile.language.dropdown_label') || 'Language'}
        .value=${this.selectedLanguage}
        .configValue=${'selected_language'}
        @selected=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
      >
        ${langOpts.map(
          (lang) =>
            html`<mwc-list-item value=${lang.key}>${lang.nativeName ? lang.nativeName : lang.name}</mwc-list-item> `,
        )}
      </ha-select>

      <ha-theme-picker
        .hass=${this.hass}
        .value=${this._config?.selected_theme?.theme}
        .configValue=${'theme'}
        .includeDefault=${true}
        @value-changed=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
        .required=${false}
      ></ha-theme-picker>

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
    const configImages = this._config.images as VehicleImage[];

    const imageList = html`<div class="images-list" id="images-list">
      ${repeat(
        configImages,
        (image) => image.url,
        (image, index) =>
          html`<div class="custom-background-wrapper" data-url="${image.url}">
            <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
            <ha-textfield
              class="image-input"
              .label=${'IMAGE #' + (index + 1)}
              .configValue=${'images'}
              .value=${image.title}
              @input=${(event: Event) => this._handleImageInputChange(event, index)}
            ></ha-textfield>
            <ha-checkbox
              .checked=${false}
              @change=${(event: Event) => this._toggleSelection(event, image.url)}
            ></ha-checkbox>
          </div>`,
      )}
    </div>`;
    const showIndexDeleteBtn =
      this._config.images && this._config.images.length > 0
        ? html` <div class="custom-background-wrapper">
            <ha-formfield .label=${'Show Image Index'}>
              <ha-checkbox
                .checked=${this._config?.show_image_index !== false}
                .configValue=${'show_image_index'}
                @change=${this._valueChanged}
              ></ha-checkbox>
            </ha-formfield>
            <ha-button @click=${this._deleteSelectedItems}>Delete Selected</ha-button>
          </div>`
        : '';

    const urlInput = html`
      <div class="custom-background-wrapper">
        <ha-button @click=${() => this.shadowRoot?.getElementById('file-upload-new')?.click()}>
          Upload Image
        </ha-button>

        <input
          type="file"
          id="file-upload-new"
          class="file-input"
          @change=${this._handleFilePicked.bind(this)}
          accept="image/*"
          multiple
        />
        <ha-textfield
          .label=${'Add URL'}
          .configValue=${'new_image_url'}
          .value=${this._newImageUrl}
          @input=${this.toggleAddButton}
        ></ha-textfield>
        <div class="new-url-btn">
          <ha-icon icon="mdi:plus" @click=${this._addNewImageUrl}></ha-icon>
        </div>
      </div>
    `;

    const content = html`${imageList}${showIndexDeleteBtn} ${urlInput} ${this._renderToast()}`;

    return this.panelTemplate('imagesConfig', 'imagesConfig', 'mdi:image', content);
  }

  private _toggleSelection(event: Event, imageUrl: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this._selectedItems.add(imageUrl);
    } else {
      this._selectedItems.delete(imageUrl);
    }
    console.log('Selected items:', this._selectedItems);
  }

  private _deleteSelectedItems(): void {
    if (this._selectedItems.size === 0) {
      return;
    }

    const remainingImages = this._config.images.filter((image) => !this._selectedItems.has(image.url));

    console.log('Remaining images after deletion:', remainingImages);

    // Update the config with the remaining images
    this._config = { ...this._config, images: remainingImages };

    // Clear the selected items
    this._selectedItems.clear();

    // Trigger any additional change handlers
    this.configChanged();
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
          <ha-checkbox
            .checked=${this._getConfigShowValue(enableMapPopupSwtich?.configKey as keyof ShowOptions) !== false}
            .configValue=${enableMapPopupSwtich?.configKey}
            @change=${this._showValueChanged}
          ></ha-checkbox>
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
              <ha-checkbox
                .checked=${this._getServicesConfigValue(key as keyof Services) !== false}
                .configValue="${key}"
                @change=${this._servicesValueChanged}
              ></ha-checkbox>
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
        <ha-alert alert-type="warning" dismissable @alert-dismissed-clicked=${this._handleAlertDismissed('toast')}>
          >${toastMsg}
        </ha-alert>
      </div>
    `;
  }

  private _renderUpdateToast(): TemplateResult {
    const versionResult = compareVersions(CARD_VERSION, this._latestRelease);
    if (versionResult === 0) {
      return html``;
    }

    const content = {
      '-1': {
        title: 'New version available',
        icon: '🎉',
      },
      1: {
        title: 'You are using a beta version',
        icon: '🚨',
      },
    };

    return html`
      <div id="toast-update">
        <ha-alert
          alert-type="info"
          title="${content[versionResult].title}"
          dismissable="true"
          @alert-dismissed-clicked=${() => this._handleToastUpdateDismissed()}
        >
          <span class="alert-icon" slot="icon">${content[versionResult].icon}</span>
          <span class="content">Latest: ${this._latestRelease}</span>
        </ha-alert>
      </div>
    `;
  }

  private panelTemplate(
    titleKey: string,
    descKey: string,
    icon: string,
    content: TemplateResult,
    expanded: boolean = false,
  ): TemplateResult {
    const localTitle = this.localize(`editor.${titleKey}.title`);
    const localDesc = this.localize(`editor.${descKey}.desc`);

    return html`
      <div class="panel-container">
        <ha-expansion-panel .outlined=${true} .header=${localTitle} .secondary=${localDesc} .expanded=${expanded}>
          <div class="right-icon" slot="icons">
            <ha-icon icon=${icon}></ha-icon>
          </div>
          <div class="card-config">${content}</div>
        </ha-expansion-panel>
      </div>
    `;
  }

  /* --------------------- ADDITIONAL HANDLERS AND METHODS -------------------- */
  private toggleAddButton(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    const addButton = target.parentElement?.querySelector('.new-url-btn') as HTMLElement;
    if (!addButton) return;
    if (target.value && target.value.length > 0) {
      this._newImageUrl = target.value;
      addButton.classList.add('show');
    } else {
      addButton.classList.remove('show');
    }
  }

  private _addNewImageUrl(): void {
    if (!this._newImageUrl || !this._config) return;
    const images = [...this._config.images];
    images.push({ url: this._newImageUrl, title: this._newImageUrl });
    this._config = { ...this._config, images };
    this._newImageUrl = '';
    this.configChanged();
  }

  private _handleImageInputChange(ev: Event, index?: number): void {
    const input = ev.target as HTMLInputElement;
    const url = input.value;

    if (!url || !this._config) return;

    const images = [...this._config.images];

    if (index !== undefined) {
      // Update existing image
      images[index] = { ...images[index], url, title: url };
    } else {
      // Add new image
      images.push({ url, title: url });
      input.value = '';
    }

    this._config = { ...this._config, images };
    console.log(index !== undefined ? 'Image changed:' : 'New image added:', url);
    this.configChanged();
  }

  private async _handleFilePicked(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      console.log('No files selected.');
      return;
    }

    const files = Array.from(input.files); // Convert FileList to Array for easier iteration

    for (const file of files) {
      try {
        const imageUrl = await uploadImage(this.hass, file);
        if (!imageUrl) continue;

        const imageName = file.name.toUpperCase();
        this._addImage(imageUrl, imageName);
      } catch (error) {
        console.error('Error uploading image:', error);
        this.launchToast('toast');
      }
    }
  }

  private _addImage(url: string, title: string): void {
    console.log('Image added:', url);
    if (this._config) {
      const images = [...this._config.images];
      images.push({ url, title });
      this._config = { ...this._config, images };
      this.configChanged();
    }
  }

  private launchToast(id: string): void {
    const toast = this.shadowRoot?.getElementById(id) as HTMLElement;
    if (!toast) return;

    toast.classList.add('show');
  }

  private _handleAlertDismissed(id: string): void {
    const toast = this.shadowRoot?.getElementById(id) as HTMLElement;
    if (toast) {
      toast.classList.remove('show');
    }
  }

  private _handleToastUpdateDismissed(): void {
    const toast = this.shadowRoot?.getElementById('toast-update') as HTMLElement;
    if (toast) {
      toast.classList.add('hidden');
    }
  }
  private _customBtnChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;
    const details = target.configBtnType;

    const value = target?.checked !== undefined ? target.checked : ev.detail.value;

    const updates: Partial<VehicleCardConfig> = {};
    updates[details] = { ...this._config[details], [configValue]: value };
    this._config = {
      ...this._config,
      ...updates,
    };

    fireEvent(this, 'config-changed', { config: this._config });
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
    } else if (configValue === 'selected_language') {
      newValue = target.value === 'system' ? this.hass.language : target.value;
      this._config = {
        ...this._config,
        [configValue]: newValue,
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
  interface Window {
    BenzEditor: VehicleCardEditor;
  }

  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
  }
}
