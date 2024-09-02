/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import YAML from 'yaml';
import Sortable from 'sortablejs';

// Custom card helpers
import { fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

// Local types
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleCardConfig,
  VehicleImage,
  ShowOptions,
  Services,
  CardTypeConfig,
  ButtonConfigItem,
} from './types';

import { servicesCtrl } from './const/remote-control-keys';
import { cardTypes } from './const/data-keys';
import { editorShowOpts } from './const/data-keys';
import { CARD_VERSION } from './const/const';
import { languageOptions, localize } from './localize/localize';
import { uploadImage, handleFirstUpdated, deepMerge, defaultConfig } from './utils/ha-helpers';
import { loadHaComponents } from './utils/loader';
import { compareVersions } from './utils/helpers';

import editorcss from './css/editor.css';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: VehicleCardConfig;
  @state() private _activeSubcardType: string | null = null;
  @state() private _btnPreview: boolean = false;
  @state() private _cardPreview: boolean = false;
  @state() private _yamlConfig: { [key: string]: any } = {};
  @state() private _customBtns: { [key: string]: ButtonConfigItem } = {};
  @state() private _newImageUrl: string = '';
  @state() private _selectedLanguage: string = 'system';

  @state() private _latestRelease: string = '';
  private _sortable: Sortable | null = null;
  private _selectedItems: Set<string> = new Set();

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    if (process.env.ROLLUP_WATCH === 'true') {
      window.BenzEditor = this;
    }
  }

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = deepMerge(defaultConfig, config);
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    await handleFirstUpdated(this, changedProperties);
    for (const cardType of this.baseCardTypes) {
      if (this._config[cardType.config] && Array.isArray(this._config[cardType.config])) {
        const yamlString = YAML.stringify(this._config[cardType.config]);
        this._yamlConfig[cardType.config] = yamlString;
      }
      if (this._config[cardType.button] && typeof this._config[cardType.button] === 'object') {
        this._customBtns[cardType.button] = this._config[cardType.button];
      }
    }
  }

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this._selectedLanguage, search, replace);
  };

  private _getServicesConfigValue<K extends keyof Services>(key: K): boolean {
    return this._config?.services[key] || false;
  }

  private _getConfigShowValue<K extends keyof ShowOptions>(key: K): boolean {
    return this._config?.[key] || false;
  }

  private get baseCardTypes() {
    return cardTypes(this._selectedLanguage);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }
    const root = document.querySelector('body > home-assistant')?.shadowRoot;
    const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
    const previewElement = dialog?.querySelector('ha-dialog > div.content > div.element-preview') as HTMLElement;
    // Change the default preview element to be sticky
    if (previewElement && previewElement.style.position !== 'sticky') {
      previewElement.style.position = 'sticky';
      previewElement.style.top = '0';
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
        ${this._renderShowOptions()} ${this._renderVersionInfo()}
      </div>
    `;
  }

  private _renderVersionInfo(): TemplateResult {
    return html`
      <div class="version">
        <span>
          ${CARD_VERSION === this._latestRelease
            ? html`version: ${CARD_VERSION}`
            : html`version: ${CARD_VERSION} -> <span class="update">${this._latestRelease}</span>`}
        </span>
      </div>
      ${this._renderUpdateToast()}
    `;
  }

  private _renderCustomSubCardUI(): TemplateResult {
    const selectedCard = this.baseCardTypes.filter((card) => card.type === this._activeSubcardType);

    return html`${selectedCard.map((card) => this._renderSubCardConfig(card))}`;
  }

  private _renderSubCardConfig(card: CardTypeConfig): TemplateResult {
    const { name, icon } = card;

    const subCardHeader = html`
      <div class="sub-card-header">
        <ha-icon
          icon="mdi:arrow-left"
          @click=${() => {
            this._closeSubCardEditor(card);
          }}
          style="cursor: pointer"
        ></ha-icon>
        <div class="sub-card-title">
          <h3>${name}</h3>
          <ha-icon icon=${icon}></ha-icon>
        </div>
      </div>
    `;

    const buttonTemplate = this._renderCustomButtonTemplate(card);
    const editorWrapper = this._renderCustomCardEditor(card);

    return html` <div class="sub-card-config">${subCardHeader}${buttonTemplate} ${editorWrapper}</div> `;
  }

  private _renderCustomCardEditor(card: CardTypeConfig): TemplateResult {
    const useCustomCard = this._config?.use_custom_cards?.[card.config] === true;

    const useCustomRadioBtn = html`
      <div class="sub-card-header">
        <ha-formfield .label=${'Use custom card?'}>
          <ha-checkbox
            .checked=${useCustomCard}
            .configValue=${card.config}
            .configBtnType=${'use_custom_cards'}
            @change=${this._customBtnChanged}
          ></ha-checkbox>
        </ha-formfield>

        ${!this._cardPreview
          ? html`<ha-button
              @click=${() => {
                this._setCardPreview(card.config);
              }}
              >Preview</ha-button
            >`
          : html`<ha-button
              @click=${() => {
                this._closeCardPreview(card.config);
                console.log('Closing card preview', card.config);
              }}
              >Close Preview</ha-button
            >`}
      </div>
    `;

    const cardCodeEditor = html`
      <ha-code-editor
        .autofocus=${true}
        .autocompleteEntities=${true}
        .autocompleteIcons=${true}
        .dir=${'ltr'}
        .mode=${'yaml'}
        .hass=${this.hass}
        .linewrap=${false}
        .value=${this._yamlConfig[card.config] || ''}
        .configValue=${card.config}
        @value-changed=${(ev: any) => this._customCardChange(ev)}
      ></ha-code-editor>
    `;

    const cardCodeEditorWrapper = html` <div class="card-code-editor">${useCustomRadioBtn} ${cardCodeEditor}</div> `;

    return this.panelTemplate('customCardConfig', 'customCardConfig', 'mdi:code-json', cardCodeEditorWrapper);
  }

  private _renderCustomButtonTemplate(card: CardTypeConfig): TemplateResult {
    const { button, type } = card;

    const primaryCfgValue = this._customBtns[button].primary;
    const secondaryCfgValue = this._customBtns[button].secondary;
    const notifyCfgValue = this._customBtns[button].notify;
    const iconCfgValue = this._customBtns[button].icon;
    const useDefault = this._config[button]?.enabled;

    const useDefaultRadioBtn = html`
      <div class="sub-card-header">
        <ha-formfield .label=${'Use custom button?'}>
          <ha-checkbox
            .checked=${this._config[button]?.enabled}
            .configValue=${'enabled'}
            .configBtnType=${button}
            @change=${this._customBtnChanged}
          ></ha-checkbox>
        </ha-formfield>
        <ha-button
          @click=${() => {
            this._dispatchCardEvent(`btn_${type}`);
            this._closePreview();
          }}
          >Show Button</ha-button
        >
        ${!this._btnPreview
          ? html`<ha-button
              @click=${() => {
                this._setBtnPreview(button);
              }}
              >Preview</ha-button
            >`
          : html`<ha-button
              @click=${() => {
                this._closePreview();
              }}
              >Close Preview</ha-button
            >`}
      </div>
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
          .linewrap=${false}
          .autofocus=${false}
          .autocompleteEntities=${true}
        ></ha-code-editor>
        <ha-input-helper-text>${helper}</ha-input-helper-text>
      </div>
    `;
    const secondaryTemplateEditor = templateUI(
      'Secondary information',
      secondaryCfgValue,
      'secondary',
      'Use Jinja2 template to display secondary information'
    );

    const notifyTemplate = templateUI(
      'Notify config',
      notifyCfgValue,
      'notify',
      `The result must return 'True' boolean to show the notification`
    );

    const content = html`
      ${useDefaultRadioBtn}
      <div class="card-button-cfg">${primaryInfo} ${iconSelector}</div>
      ${secondaryTemplateEditor} ${notifyTemplate}
    `;
    return this.panelTemplate('customButtonConfig', 'customButtonConfig', 'mdi:button-cursor', content, false);
  }

  private _renderCardEditorButtons(): TemplateResult {
    const localInfo = this.localize('editor.common.infoButton');
    const subcardBtns = html`
      <ha-alert alert-type="info">${localInfo}</ha-alert>
      <div class="cards-buttons">
        ${this.baseCardTypes.map(
          (card) => html`
            <ha-button @click=${() => (this._activeSubcardType = card.type)}>
              <ha-icon icon=${card.icon}></ha-icon> ${card.name}</ha-button
            >
          `
        )}
      </div>
    `;
    return this.panelTemplate('buttonConfig', 'buttonConfig', 'mdi:view-dashboard', subcardBtns);
  }

  private _renderShowOptions(): TemplateResult {
    let showOptions = editorShowOpts(this._selectedLanguage);
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
          `
        )}
      </div>
    `;

    return this.panelTemplate('showConfig', 'showConfig', 'mdi:toggle-switch', switches);
  }

  private _renderNameEntityForm(): TemplateResult {
    // Filter entities as per your requirement
    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car')
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
        .configValue=${'name'}
        @value-changed=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
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
    const langOpts = [
      { key: 'system', name: 'System', nativeName: 'System' },
      ...languageOptions.sort((a, b) => a.name.localeCompare(b.name)),
    ];
    const themeMode = [
      { key: 'auto', name: 'Auto' },
      { key: 'dark', name: 'Dark' },
      { key: 'light', name: 'Light' },
    ];

    const themesConfig = html`
      <div class="switches">
        <ha-select
          .label=${'Language'}
          .value=${this._config.selected_language}
          .configValue=${'selected_language'}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${langOpts.map(
            (lang) =>
              html`<mwc-list-item value=${lang.key}>${lang.nativeName ? lang.nativeName : lang.name}</mwc-list-item> `
          )}
        </ha-select>

        <ha-theme-picker
          .hass=${this.hass}
          .value=${this._config.selected_theme.theme}
          .configValue=${'theme'}
          .includeDefault=${true}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
          .required=${true}
        ></ha-theme-picker>

        <ha-select
          label="Theme mode"
          .value=${this._config.selected_theme.mode}
          .configValue=${'mode'}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${themeMode.map((mode) => html`<mwc-list-item value=${mode.key}>${mode.name}</mwc-list-item>`)}
        </ha-select>
      </div>
    `;
    return this.panelTemplate('themeLangConfig', 'themeLangConfig', 'mdi:palette', themesConfig);
  }

  private _renderImageConfig(): TemplateResult {
    const localize = this.localize;
    const configImages = this._config.images as VehicleImage[];
    const imagesActions = {
      selectAll: {
        label: localize('editor.imagesConfig.selectAll'),
        action: this._selectAll,
      },
      deselectAll: {
        label: localize('editor.imagesConfig.deselectAll'),
        action: this._deselectAll,
      },
      deleteSelected: {
        label: localize('editor.imagesConfig.deleteSelected'),
        action: this._deleteSelectedItems,
      },
    };

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
          </div>`
      )}
    </div>`;
    const showIndexDeleteBtn =
      this._config.images && this._config.images.length > 0
        ? html`
            <div class="custom-background-wrapper">
              ${Object.keys(imagesActions).map(
                (key) => html` <ha-button @click=${imagesActions[key].action}>${imagesActions[key].label}</ha-button> `
              )}
            </div>
            <div class="custom-background-wrapper">
              <ha-formfield .label=${'Show Image Index'}>
                <ha-checkbox
                  .checked=${this._config?.show_image_index !== false}
                  .configValue=${'show_image_index'}
                  @change=${this._valueChanged}
                ></ha-checkbox>
              </ha-formfield>
            </div>
          `
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

  private _renderMapPopupConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoMap');
    const enableMapPopupSwtich = editorShowOpts(this._selectedLanguage).find(
      (option) => option.configKey === 'enable_map_popup'
    );

    const themeMode = [
      { key: 'auto', name: 'Auto' },
      { key: 'dark', name: 'Dark' },
      { key: 'light', name: 'Light' },
    ];
    const mapPopupConfig = html`
      <ha-alert alert-type="info">${infoAlert}</ha-alert>
      <div class="switches">
        <ha-textfield
          label="Hours to show"
          .min=${0}
          .value=${this._config.map_popup_config.hours_to_show}
          .configValue=${'hours_to_show'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
          .label=${'Default Zoom'}
          .min=${0}
          .value=${this._config.map_popup_config.default_zoom}
          .configValue=${'default_zoom'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-select
          .label=${'Theme mode'}
          .value=${this._config.map_popup_config.theme_mode}
          .configValue=${'theme_mode'}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${themeMode.map((mode) => html`<mwc-list-item value=${mode.key}>${mode.name}</mwc-list-item>`)}
        </ha-select>
      </div>
    `;

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
      ${mapPopupConfig}
    `;

    return this.panelTemplate('mapConfig', 'mapConfig', 'mdi:map-search', mapConfig);
  }

  private _renderServicesConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoServices');
    const servicesConfig = html`
      <ha-alert alert-type="info"> ${infoAlert} </ha-alert>

      <div class="switches">
        ${Object.entries(servicesCtrl(this._selectedLanguage)).map(
          ([key, { name }]) => html`
            <ha-formfield .label=${name}>
              <ha-checkbox
                .checked=${this._getServicesConfigValue(key as keyof Services)}
                .configValue="${key}"
                @change=${this._servicesValueChanged}
              ></ha-checkbox>
            </ha-formfield>
          `
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
    expanded: boolean = false
  ): TemplateResult {
    const localTitle = this.localize(`editor.${titleKey}.title`);
    const localDesc = this.localize(`editor.${descKey}.desc`);

    return html`
      <div class="panel-container">
        <ha-expansion-panel
          id="${titleKey}"
          .outlined=${true}
          .header=${localTitle}
          .secondary=${localDesc}
          .expanded=${expanded}
          @expanded-changed=${(e: Event) => this._handlePanelExpandedChanged(e, titleKey)}
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

  private _handleSortEnd(evt: any) {
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    // console.log('Images before reorder:', this._config.images);
    // console.log(`Reordering images: moving from index ${oldIndex} to ${newIndex}`);

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

  private _handlePanelExpandedChanged(e: Event, titleKey: string): void {
    const panel = e.target as HTMLElement;
    if (titleKey === 'imagesConfig' && (panel as any).expanded) {
      console.log('Images panel expanded');
      this.initSortable();
    }
    // if (titleKey === 'customCardConfig' && (panel as any).expanded) {
    //   this._dispatchCardEvent(this._activeSubcardType as string);
    //   console.log('Custom card panel expanded', this._activeSubcardType);
    // }
  }

  private initSortable() {
    const el = this.shadowRoot?.getElementById('images-list');
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

  private _toggleSelection(event: Event, imageUrl: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this._selectedItems.add(imageUrl);
    } else {
      this._selectedItems.delete(imageUrl);
    }
    // console.log('Selected items:', this._selectedItems);
  }
  private _selectAll(): void {
    const checkboxes = this.shadowRoot?.querySelectorAll('.images-list ha-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
    });

    this._selectedItems.clear(); // Clear existing selections
    this._config.images.forEach((image: { url: string }) => this._selectedItems.add(image.url));

    // Optionally, update the UI or perform any additional actions
    this.requestUpdate();
  }

  private _deselectAll(): void {
    const checkboxes = this.shadowRoot?.querySelectorAll('.images-list ha-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    this._selectedItems.clear(); // Clear all selections

    // Optionally, update the UI or perform any additional actions
    this.requestUpdate();
  }

  private _deleteSelectedItems(): void {
    if (this._selectedItems.size === 0) {
      return;
    }

    const remainingImages = this._config.images.filter((image) => !this._selectedItems.has(image.url));

    this._config = { ...this._config, images: remainingImages };
    // Clear the selected items
    this._selectedItems.clear();
    // Trigger any additional change handlers
    this.configChanged();
  }

  private toggleAddButton(ev: Event): void {
    ev.stopPropagation();
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
    ev.stopPropagation();
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
    ev.stopPropagation();

    const target = ev.target;
    const configValue = target.configValue;
    const details = target.configBtnType;

    const value = target?.checked !== undefined ? target.checked : target.value;

    if (this._config.btn_preview && this._btnPreview) {
      this._config = {
        ...this._config,
        btn_preview: {
          ...this._config.btn_preview,
          [configValue]: value,
        },
      };
      this.configChanged();
    }

    const updates: Partial<VehicleCardConfig> = {};
    updates[details] = { ...this._config[details], [configValue]: value };
    this._config = {
      ...this._config,
      ...updates,
    };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _customCardChange(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const value = target.value;
    const configKey = target.configValue;
    let parsedYaml: any[];
    try {
      parsedYaml = YAML.parse(value); // Parse YAML content
    } catch (e) {
      console.error(`Parsing error for ${configKey}:`, e);
      return;
    }

    if (this._config.card_preview && this._cardPreview) {
      this._config = {
        ...this._config,
        card_preview: parsedYaml,
      };
      this.configChanged();
    }

    const updates: Partial<VehicleCardConfig> = {};
    updates[configKey] = parsedYaml;
    this._config = {
      ...this._config,
      ...updates,
    };
    this.configChanged();
  }

  private _servicesValueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    let newValue: any = target.checked;
    const updates: Partial<VehicleCardConfig> = {};

    if (this._config.services[configValue] === target.checked) {
      return;
    }

    newValue = target.checked;
    updates.services = {
      ...this._config.services,
      [configValue]: newValue,
    };

    this._config = {
      ...this._config,
      ...updates,
    };

    console.log('Services config changed:', configValue, newValue);

    this.configChanged();
  }

  private _showValueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (this._config[configValue] === target.checked) {
      return;
    }

    this._config = {
      ...this._config,
      [configValue]: target.checked,
    };
    this.configChanged();
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    let newValue: any = target.value;

    const updates: Partial<VehicleCardConfig> = {};

    if (configValue in this._config.map_popup_config) {
      const key = configValue as keyof typeof this._config.map_popup_config;
      if (this._config.map_popup_config[key] === newValue) {
        return;
      }
      updates.map_popup_config = {
        ...this._config.map_popup_config,
        [key]: parseInt(newValue) || newValue,
      };
      console.log('Map popup config changed:', key, newValue);
    } else if (configValue in this._config.selected_theme) {
      const key = configValue as keyof VehicleCardConfig['selected_theme'];
      if (this._config.selected_theme[key] === newValue) {
        return;
      }
      updates.selected_theme = {
        ...this._config.selected_theme,
        [key]: newValue,
      };
      console.log('Selected theme changed:', key, newValue);
    } else if (configValue === 'selected_language') {
      if (this._config.selected_language === 'system' && newValue === 'system') {
        return;
      }

      newValue === 'system' ? (this._selectedLanguage = this.hass.language) : (this._selectedLanguage = newValue);
      updates.selected_language = newValue;
    } else {
      newValue = target.checked !== undefined ? target.checked : ev.detail.value;
      updates[configValue] = newValue;
    }

    if (Object.keys(updates).length > 0) {
      this._config = {
        ...this._config,
        ...updates,
      };
      this.configChanged();
    }
  }

  private configChanged() {
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _setCardPreview(cardType: string): void {
    const cardConfig = this._yamlConfig[cardType];
    let parsedYaml: any[];
    try {
      parsedYaml = YAML.parse(cardConfig); // Parse YAML content
    } catch (e) {
      console.error(`Parsing error for ${cardType}:`, e);
      return;
    }
    if (this._config) {
      this._config = {
        ...this._config,
        card_preview: parsedYaml,
      };
    }
    this.configChanged();
    this._cardPreview = true;
    setTimeout(() => {
      this._dispatchCardEvent('show_card_preview');
    }, 100);
  }

  private _closeCardPreview(cardType: string): void {
    const cardConfig = this._config.card_preview;
    const yamlString = YAML.stringify(cardConfig);

    this._yamlConfig[cardType] = yamlString;

    this._config = {
      ...this._config,
      [cardType]: cardConfig,
      card_preview: null,
    };
    this.configChanged();
    this._cardPreview = false;
    setTimeout(() => {
      this._dispatchCardEvent('close_card_preview');
    }, 100);
  }

  private _setBtnPreview(button: string): void {
    const btnType = this._customBtns[button];
    if (this._config) {
      this._config = {
        ...this._config,
        btn_preview: {
          ...btnType,
        },
      };
    }
    this.configChanged();
    this._btnPreview = true;
    setTimeout(() => {
      this._dispatchCardEvent('toggle_preview');
    }, 100);
  }

  private _closePreview(): void {
    this._config = {
      ...this._config,
      btn_preview: null,
    };
    this.configChanged();
    this._btnPreview = false;
    setTimeout(() => {
      this._dispatchCardEvent('close_preview');
    }, 100);
  }

  private _toggleShowCard(card: CardTypeConfig): void {
    this.updateComplete.then(() => {
      this._dispatchCardEvent(`toggle_card_${card.type}`);
    });
  }

  private _closeSubCardEditor(card: CardTypeConfig): void {
    this._activeSubcardType = null;
    this._btnPreview ? this._closePreview() : this._cardPreview ? this._closeCardPreview(card.config) : null;
    console.log('Closing sub-card editor:', card.name, card.config);
  }
  private _dispatchCardEvent(cardType: string): void {
    // Dispatch the custom event with the cardType name
    const detail = cardType;
    const ev = new CustomEvent('editor-event', { detail, bubbles: true, composed: true });
    this.dispatchEvent(ev);
    console.log('Dispatched custom event:', cardType);
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
