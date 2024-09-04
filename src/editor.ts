/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat';
import YAML from 'yaml';
import Sortable from 'sortablejs';

// Custom card helpers
import { fireEvent, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';
import { debounce, isString } from 'es-toolkit';

// Local types
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleCardConfig,
  VehicleImage,
  ShowOptions,
  CardTypeConfig,
  ButtonConfigItem,
} from './types';

import { servicesCtrl } from './const/remote-control-keys';
import { cardTypes } from './const/data-keys';
import { editorShowOpts } from './const/data-keys';
import { CARD_VERSION } from './const/const';
import { languageOptions, localize } from './localize/localize';
import { uploadImage, handleFirstUpdated, defaultConfig, deepMerge } from './utils/ha-helpers';
import { loadHaComponents } from './utils/loader';
import { compareVersions } from './utils/helpers';
import editorcss from './css/editor.css';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() private _config!: VehicleCardConfig;
  @property() private _btnPreview: boolean = false;
  @property() private _cardPreview: boolean = false;
  @property() private baseCardTypes: CardTypeConfig[] = [];

  @state() private _activeSubcardType: string | null = null;
  @state() private _yamlConfig: { [key: string]: any } = {};
  @state() private _customBtns: { [key: string]: ButtonConfigItem } = {};
  @state() private _newImageUrl: string = '';
  @state() private _newCardTypeName: string = '';
  @state() private _newCardTypeIcon: string = '';
  @state() private _selectedLanguage: string = 'system';
  @state() private _latestRelease: string = '';
  _sortable: Sortable | null = null;
  private _selectedItems: Set<string> = new Set();

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = deepMerge(defaultConfig, config);
  }

  connectedCallback() {
    console.log('Connected callback');
    super.connectedCallback();
    void loadHaComponents();
    if (process.env.ROLLUP_WATCH === 'true') {
      window.BenzEditor = this;
    }
    this._cleanConfig();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  private _cleanConfig(): void {
    if (['btn_preview', 'card_preview'].some((key) => this._config[key])) {
      console.log('Cleaning config of preview keys');
      this._config = { ...this._config, btn_preview: null, card_preview: null };
    }
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    await handleFirstUpdated(this, changedProperties);

    this.baseCardTypes = this.getBaseCardTypes();
    this._convertDefaultCardConfigs();
    this._convertAddedCardConfigs();
  }

  private _convertDefaultCardConfigs(): void {
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

  private _convertAddedCardConfigs(): void {
    if (this._config.added_cards && Object.keys(this._config.added_cards).length > 0) {
      Object.keys(this._config.added_cards).forEach((key) => {
        const yamlString = YAML.stringify(this._config.added_cards[key].cards);
        const button = this._config.added_cards[key].button;
        this._yamlConfig[key] = yamlString;
        this._customBtns[key] = button;
      });
    }
  }

  private _debouncedCustomBtnChanged = debounce(this.configChanged.bind(this), 700);

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this._selectedLanguage, search, replace);
  };

  private _getConfigShowValue<K extends keyof ShowOptions>(key: K): boolean {
    return this._config?.[key] || false;
  }

  private getBaseCardTypes() {
    const baseCardTypes = cardTypes(this._selectedLanguage);
    if (this._config.added_cards && Object.keys(this._config.added_cards).length > 0) {
      Object.keys(this._config.added_cards).map((key) => {
        const card = this._config.added_cards[key];
        if (card.button) {
          baseCardTypes.push({
            type: key,
            name: card.button.primary,
            icon: card.button.icon,
            config: key,
            button: key,
          });
        }
      });
    }

    return baseCardTypes;
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
        <ha-icon icon="mdi:arrow-left" @click=${() => this._closeSubCardEditor(card)} style="cursor: pointer"></ha-icon>
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
    const useCustomCard = this._config?.use_custom_cards?.[card.config];
    const isAddedCard = this._config.added_cards.hasOwnProperty(card.type);

    const useCustomRadioBtn = html`
      <div class="sub-card-header">
        <ha-formfield .label=${'Use custom card?'}>
          <ha-checkbox
            .checked=${useCustomCard}
            .disabled=${isAddedCard}
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
    const { button } = card;
    const primaryCfgValue = this._customBtns[button].primary;
    const secondaryCfgValue = this._customBtns[button].secondary;
    const notifyCfgValue = this._customBtns[button].notify;
    const iconCfgValue = this._customBtns[button].icon;
    const useDefault = this._config[button]?.enabled
      ? this._config[button]?.enabled
      : this._config.added_cards[card.type]?.button.enabled;
    const isAddedCard = this._config.added_cards.hasOwnProperty(card.type);
    const useDefaultRadioBtn = html`
      <div class="sub-card-header">
        <ha-formfield .label=${'Use custom button?'}>
          <ha-checkbox
            .checked=${useDefault}
            .disabled=${isAddedCard}
            .configValue=${'enabled'}
            .configBtnType=${button}
            @change=${this._customBtnChanged}
          ></ha-checkbox>
        </ha-formfield>
        <ha-button @click=${() => this._toggleShowButton(card)}>Show Button</ha-button>
        ${!this._btnPreview
          ? html`<ha-button
              @click=${() => {
                this._setBtnPreview(button);
              }}
              >${this.hass.localize('ui.panel.config.integrations.config_flow.preview') || 'Preview'}</ha-button
            >`
          : html`<ha-button
              @click=${() => {
                this._closeBtnPreview(button);
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
          .mode=${'jinja2'}
          .hass=${this.hass}
          .dir=${'ltr'}
          .value=${value}
          .configValue=${configValue}
          .configBtnType=${button}
          .readOnly=${!useDefault}
          @value-changed=${this._customBtnChanged}
          .linewrap=${false}
          .autofocus=${true}
          .autocompleteEntities=${true}
          .autocompleteIcons=${true}
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
    const buttonItemRow = this.baseCardTypes.map(
      (card) =>
        html` <div class="card-type-item">
          <div class="card-type-icon">
            <div class="icon-background">
              <ha-icon icon=${card.icon} @click=${() => (this._activeSubcardType = card.type)}></ha-icon>
            </div>
          </div>
          <div class="card-type-content">
            <span class="secondary">Config name: ${card.config}</span>
            <div class="primary">${card.name}</div>
          </div>
          <div class="card-type-actions">
            <div class="action-icon" @click=${() => (this._activeSubcardType = card.type)}>
              <ha-icon icon="mdi:pencil"></ha-icon>
            </div>
            ${this._config.added_cards?.hasOwnProperty(card.type)
              ? html`<div class="action-icon" @click=${this._removeCustomCard(card.type)}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </div>`
              : nothing}
          </div>
        </div>`
    );

    const addNewCardForm = html`
      <div class="card-type-item">
          <div class="card-type-content">
            <ha-icon-picker
              .hass=${this.hass}
              .label=${'Icon'}
              .value=${'mdi:emoticon'}
              .configValue=${'newCardTypeIcon'}
              @value-changed=${this._handleCardTypeInput}
            ></ha-icon-picker>
          </div>
          <div class="card-type-content">
            <ha-textfield style="margin-bottom: 0;"
              .label=${'Enter name for the card'}
              .configValue=${'newCardTypeName'}
              .value=${this._newCardTypeName}
              .toastId=${'buttonConfig'}
              .errorMsg=${'Please enter a name for the card'}
              @change=${this._handleCardTypeInput}
            ></ha-textfield>
          </div>
          <div class="card-type-actions">
            <div class="action-icon" @click=${this._addNewCard}>
              <ha-icon icon="mdi:plus"></ha-icon>
            </div>
          </div>
        </div>
      </div>
    `;

    const content = html`<ha-alert alert-type="info">${localInfo}</ha-alert>${buttonItemRow} ${addNewCardForm}`;
    return this.panelTemplate('buttonConfig', 'buttonConfig', 'mdi:view-dashboard', content);
  }

  private _removeCustomCard(cardType: string) {
    return () => {
      const newAddedCards = { ...this._config.added_cards };
      delete newAddedCards[cardType];
      this._config = { ...this._config, added_cards: newAddedCards };
      this.configChanged();
      this.baseCardTypes = this.getBaseCardTypes();
      this._convertAddedCardConfigs();
    };
  }

  private _handleCardTypeInput(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.value;
    this[`_${configValue}`] = value;
  }

  private _addNewCard(): void {
    const primary = this._newCardTypeName;
    const icon = this._newCardTypeIcon ? this._newCardTypeIcon : 'mdi:emoticon';
    if (primary) {
      const formattedCardType = primary.trim().replace(/ /g, '_').toLowerCase();
      if (
        this._config.added_cards?.hasOwnProperty(formattedCardType) ||
        this._config.use_custom_cards?.hasOwnProperty(formattedCardType)
      ) {
        const toastId = 'buttonConfig';
        const errorMsg = this.localize('card.common.toastCardAlreadyExists') + `: ${formattedCardType}`;
        this.launchToast(toastId, errorMsg);
        return;
      }
      this._config.added_cards = {
        ...this._config.added_cards,
        [formattedCardType]: {
          cards: [],
          button: {
            enabled: true,
            primary: primary,
            secondary: '',
            icon: icon,
            notify: '',
          },
        },
      };
      this.configChanged();
      this.baseCardTypes = this.getBaseCardTypes();
      this._convertAddedCardConfigs();
    }
    this._newCardTypeName = '';
    this._newCardTypeIcon = '';
    this.requestUpdate();
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
    const errorMsg = localize('card.common.toastImageError');
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
          ${this.hass.localize('ui.components.selectors.image.upload')}
        </ha-button>

        <input
          type="file"
          id="file-upload-new"
          class="file-input"
          .errorMsg=${errorMsg}
          .toastId="${`imagesConfig`}"
          @change=${this._handleFilePicked.bind(this)}
          accept="image/*"
          multiple
        />
        <ha-textfield
          .label=${this.hass.localize('ui.components.selectors.image.url')}
          .configValue=${'new_image_url'}
          .value=${this._newImageUrl}
          @input=${this.toggleAddButton}
        ></ha-textfield>
        <div class="new-url-btn">
          <ha-icon icon="mdi:plus" @click=${this._addNewImageUrl}></ha-icon>
        </div>
      </div>
    `;

    const content = html`${imageList}${showIndexDeleteBtn} ${urlInput}`;

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

    // Get the current selected services based on the config
    const selectedServices = Object.entries(this._config.services)
      .filter(([, value]) => value === true)
      .map(([key]) => key);

    const selectorItems = this.getServicesOptions();
    const servicesSelector = html`
      <ha-alert alert-type="info">${infoAlert}</ha-alert>
      <div class="selector-row">
        <ha-selector
          .hass=${this.hass}
          .label=${'Select Services'}
          .selector=${selectorItems.selector}
          .value=${selectedServices}
          .configValue=${'selected_services'}
          @value-changed=${this._servicesValueChanged}
        ></ha-selector>
      </div>
    `;
    return this.panelTemplate('servicesConfig', 'servicesConfig', 'mdi:car-cog', servicesSelector);
  }

  private _renderToast(idToast: string): TemplateResult {
    const toastId = `toast_${idToast}`;
    return html`
      <div id="${toastId}" class="toast">
        <ha-alert alert-type="warning" dismissable @alert-dismissed-clicked=${() => this._handleAlertDismissed(toastId)}
          >Default alert message
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
          ${this._renderToast(titleKey)}
        </ha-expansion-panel>
      </div>
    `;
  }

  /* --------------------- ADDITIONAL HANDLERS AND METHODS -------------------- */

  private _servicesValueChanged(ev: CustomEvent): void {
    const selectedServices = ev.detail.value;
    const updatedServices = { ...this._config.services };

    // Set each service to true or false based on the selection
    Object.keys(updatedServices).forEach((service) => {
      updatedServices[service] = selectedServices.includes(service);
    });

    // Update the config with the new services state
    this._config = {
      ...this._config,
      services: updatedServices,
    };

    this.configChanged();
  }

  private getServicesOptions() {
    const serviceOptions = Object.entries(servicesCtrl(this._selectedLanguage)).map(([key, { name }]) => ({
      value: key,
      label: name,
    }));

    return {
      selector: {
        select: {
          multiple: true,
          custom_value: false,
          options: serviceOptions,
        },
      },
    };
  }

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

  private async _handleFilePicked(ev: any): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const errorMsg = ev.target.errorMsg;
    const toastId = ev.target.toastId;

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
        this.launchToast(toastId, errorMsg);
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

  private launchToast(id: string, msg: string = ''): void {
    const toast = this.shadowRoot?.getElementById(`toast_${id}`) as HTMLElement;
    const haAlert = toast?.querySelector('ha-alert') as HTMLElement;
    if (!toast) return;
    haAlert.innerHTML = msg || 'Default alert message';
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
    // Access the custom event's details
    const target = ev.target;
    const configValue = target.configValue;
    const details = target.configBtnType;
    console.log('Custom button changed:', details, configValue);
    const newValue = target.checked !== undefined ? target.checked : target.value;
    const value = isString(newValue) ? newValue.trim() : newValue;
    const updates: Partial<VehicleCardConfig> = {};
    if (this._config.btn_preview && this._btnPreview) {
      this._config = {
        ...this._config,
        btn_preview: {
          ...this._config.btn_preview,
          [configValue]: value,
        },
      };
    }

    if (this._config.added_cards.hasOwnProperty(details)) {
      this._config = {
        ...this._config,
        added_cards: {
          ...this._config.added_cards,
          [details]: {
            ...this._config.added_cards[details],
            button: {
              ...this._config.added_cards[details].button,
              [configValue]: value,
            },
          },
        },
      };
    } else {
      updates[details] = { ...this._config[details], [configValue]: value };
      this._config = {
        ...this._config,
        ...updates,
      };
    }
    this._debouncedCustomBtnChanged();
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
      return;
    }

    if (this._config.card_preview && this._cardPreview) {
      this._config = {
        ...this._config,
        card_preview: parsedYaml,
      };
    }
    if (this._config.added_cards.hasOwnProperty(configKey)) {
      this._config = {
        ...this._config,
        added_cards: {
          ...this._config.added_cards,
          [configKey]: {
            ...this._config.added_cards[configKey],
            cards: parsedYaml, // Ensure 'cards' remains an array of objects
          },
        },
      };
    } else {
      this._config = {
        ...this._config,
        [configKey]: parsedYaml,
      };
    }

    this._debouncedCustomBtnChanged();
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
    let cardConfig: LovelaceCardConfig[];
    if (this._config.added_cards.hasOwnProperty(cardType)) {
      cardConfig = this._config.added_cards[cardType].cards;
    } else {
      cardConfig = this._config[cardType];
    }
    if (!cardConfig) {
      console.log(`No card config found for ${cardType}`);
      return;
    }
    if (this._config) {
      this._config = {
        ...this._config,
        card_preview: cardConfig,
      };
    }
    this.configChanged();
    this._cardPreview = true;
    setTimeout(() => {
      this._dispatchCardEvent('show_card_preview');
    }, 100);
  }

  private _closeCardPreview(cardConfig: string): void {
    if (this._config) {
      this._config = {
        ...this._config,
        card_preview: null,
      };
    }

    this._cardPreview = false;
    this.configChanged();
    if (this._config.added_cards.hasOwnProperty(cardConfig)) {
      this._convertAddedCardConfigs();
    } else {
      this._convertDefaultCardConfigs();
    }
    setTimeout(() => {
      this._dispatchCardEvent('close_card_preview');
    }, 100);
  }

  private _setBtnPreview(button: string): void {
    console.log('Button:', button);
    let btnConfig: ButtonConfigItem;
    if (this._config.added_cards.hasOwnProperty(button)) {
      btnConfig = this._config.added_cards[button].button;
    } else {
      btnConfig = this._config[button];
    }

    if (this._config) {
      this._config = {
        ...this._config,
        btn_preview: {
          ...btnConfig,
        },
      };
    }

    this.configChanged();
    this._btnPreview = true;
    setTimeout(() => {
      this._dispatchCardEvent('toggle_preview');
    }, 100);
  }

  private _closeBtnPreview(button: string): void {
    if (this._config) {
      this._config = {
        ...this._config,
        btn_preview: null,
      };
    }

    this.configChanged();
    this._btnPreview = false;
    if (this._config.added_cards.hasOwnProperty(button)) {
      this._convertAddedCardConfigs();
    } else {
      this._convertDefaultCardConfigs();
    }

    setTimeout(() => {
      this._dispatchCardEvent('close_preview');
    }, 100);
  }

  private _toggleShowButton(card: CardTypeConfig): void {
    if (this._btnPreview) {
      this._closeBtnPreview(card.button);
      setTimeout(() => {
        this._dispatchCardEvent(`btn_${card.type}`);
      }, 100);
    } else {
      this._dispatchCardEvent(`btn_${card.type}`);
    }
  }

  private _closeSubCardEditor(card: CardTypeConfig): void {
    if (this._cardPreview) {
      this._closeCardPreview(card.type);
    }
    if (this._btnPreview) {
      this._closeBtnPreview(card.button);
    }
    if (this._activeSubcardType === card.type) {
      this._activeSubcardType = null;
      this.updateComplete.then(() => {
        this._convertAddedCardConfigs();
        this._convertDefaultCardConfigs();
        this.baseCardTypes = this.getBaseCardTypes();
      });
    }
  }

  private _dispatchCardEvent(action: string): void {
    // Dispatch the custom event with the cardType name
    const detail = action;
    const ev = new CustomEvent('editor-event', { detail, bubbles: true, composed: true });
    this.dispatchEvent(ev);
    // console.log('Dispatched custom event:', cardType);
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
