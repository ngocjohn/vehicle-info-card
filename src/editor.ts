/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';
import YAML from 'yaml';

// Custom card helpers
import { fireEvent, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';

// Local types
import { HomeAssistantExtended as HomeAssistant, VehicleCardConfig, CardTypeConfig, ButtonConfigItem } from './types';

import { servicesCtrl } from './const/remote-control-keys';
import { cardTypes, editorShowOpts } from './const/data-keys';
import { CARD_VERSION } from './const/const';
import { languageOptions, localize } from './localize/localize';
import { handleFirstUpdated, defaultConfig, deepMerge } from './utils/ha-helpers';
import { loadHaComponents } from './utils/loader';
import { compareVersions } from './utils/helpers';
import editorcss from './css/editor.css';

import './components/editor/custom-card-editor';
import './components/editor/custom-button-template';
import './components/editor/panel-images';

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() private _config!: VehicleCardConfig;
  @property() private _btnPreview: boolean = false;
  @property() private _cardPreview: boolean = false;
  @property() private baseCardTypes: CardTypeConfig[] = [];

  @state() private _activeSubcardType: string | null = null;
  @state() private _confirmDeleteType: string | null = null;
  @state() private _yamlConfig: { [key: string]: any } = {};
  @state() private _customBtns: { [key: string]: ButtonConfigItem } = {};
  @state() private _newCardTypeName: string = '';
  @state() private _newCardTypeIcon: string = '';
  @state() private _selectedLanguage: string = 'system';
  @state() private _latestRelease: string = '';

  @query('panel-images') private _panelImages!: any;

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
      this.configChanged();
    }
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    await handleFirstUpdated(this, changedProperties);

    this.baseCardTypes = this.getBaseCardTypes();
    this._convertDefaultCardConfigs();
    this._convertAddedCardConfigs();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this._btnPreview && !this._cardPreview) {
      this._cleanConfig();
    }
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

  private _debouncedCustomBtnChanged = debounce(this.configChanged.bind(this), 500);

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this._selectedLanguage, search, replace);
  };

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
        ${this._renderNameEntityForm()} ${this._renderCardButtonPanel()} ${this._renderMapPopupConfig()}
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
    const selectedCard = this.baseCardTypes.filter((card) => card.type === this._activeSubcardType).map((card) => card);

    return this._renderSubCardConfig(selectedCard[0]);
  }

  private _renderSubCardConfig(card: CardTypeConfig): TemplateResult {
    const { name, icon } = card;
    const baseCard = this.baseCardTypes;

    const cardTabsRow = baseCard
      .filter((c) => c.type !== card.type)
      .map((c) => {
        return html`
          <div class="card-tab" title="${c.name}" @click=${() => (this._activeSubcardType = c.type)}>
            <ha-icon title="${c.name}" icon=${c.icon}></ha-icon>
          </div>
        `;
      });

    const subCardHeader = html`
      <div class="sub-card-header">
        <ha-icon icon="mdi:arrow-left" @click=${() => this._closeSubCardEditor(card)} style="cursor: pointer"></ha-icon>
        <div class="card-tab active">
          <ha-button>${name}</ha-button>
          <ha-icon icon=${icon}></ha-icon>
        </div>
        ${cardTabsRow}
      </div>
    `;

    const buttonTemplate = this._renderCustomButtonTemplate(card);
    const editorWrapper = this._renderCustomCardEditor(card);

    const content = html` <div class="sub-card-config">${subCardHeader} ${buttonTemplate} ${editorWrapper}</div> `;

    return content;
  }

  private _renderCustomCardEditor(card: CardTypeConfig): TemplateResult {
    const useCustomCard = this._config?.use_custom_cards?.[card.config];
    const isAddedCard = this._config?.added_cards?.hasOwnProperty(card.type);

    const cardCodeEditorWrapper = html`
      <div class="card-code-editor">
        <custom-card-editor
          .card=${card}
          .hass=${this.hass}
          .isCardPreview=${this._cardPreview}
          .isCustomCard=${useCustomCard}
          .isAddedCard=${isAddedCard}
          .yamlConfig=${this._yamlConfig[card.config] || ''}
          @custom-card-editor-changed=${(ev: any) => this._handleCustomCardEditorChange(ev)}
          @yaml-changed=${(ev: any) => this._customCardChange(ev)}
        ></custom-card-editor>
      </div>
    `;

    return this.panelTemplate('customCardConfig', 'customCardConfig', 'mdi:code-json', cardCodeEditorWrapper);
  }

  private _renderCustomButtonTemplate(card: CardTypeConfig): TemplateResult {
    const button = card.button;
    const buttonConfig = this._customBtns[button];
    const useDefault = this._config[button]?.enabled
      ? this._config[button]?.enabled
      : this._config.added_cards?.[card.type]?.button?.hide;
    const isAddedCard = this._config.added_cards?.hasOwnProperty(card.type);
    const isHidden = this._config.added_cards[card.type]?.button.hide;

    const content = html`
      <custom-button-template
        .hass=${this.hass}
        .button=${buttonConfig}
        .card=${card}
        .useDefault=${useDefault}
        .isAddedCard=${isAddedCard}
        .isHidden=${isHidden}
        .isButtonPreview=${this._btnPreview}
        @custom-button-changed=${(ev: any) => this._customBtnHandler(ev)}
      ></custom-button-template>
    `;
    return this.panelTemplate('customButtonConfig', 'customButtonConfig', 'mdi:button-cursor', content, false);
  }

  private _renderCardButtonPanel(): TemplateResult {
    const localInfo = this.localize('editor.common.infoButton');

    const isAddedCard = (cardType: string) => this._config.added_cards?.hasOwnProperty(cardType);
    const isHidden = (cardType: string) => this._config.added_cards?.[cardType]?.button.hide;

    const buttonItemRow = this.baseCardTypes.map((card) => {
      const hiddenClass = isHidden(card.type) ? 'disabled' : '';
      const addedCard = isAddedCard(card.type);
      const eyeIcon = isHidden(card.type) ? 'mdi:eye' : 'mdi:eye-off';
      const { icon, name, type, config } = card;
      return html`
        <div class="card-type-item">
          <div class="card-type-row ${hiddenClass}">
            <div class="card-type-icon">
              <div class="icon-background">
                <ha-icon icon=${icon} @click=${() => (this._activeSubcardType = type)}></ha-icon>
              </div>
            </div>
            <div class="card-type-content">
              <span class="secondary">Config name: ${config}</span>
              <div class="primary">${name}</div>
            </div>
          </div>
          <div class="card-type-actions">
            <div class="action-icon" @click=${() => (this._activeSubcardType = type)}>
              <ha-icon icon="mdi:pencil"></ha-icon>
            </div>
            ${addedCard
              ? html`
                  <div class="action-icon" @click=${this._hideCustomButton(type)}>
                    <ha-icon icon=${eyeIcon}></ha-icon>
                  </div>
                  <div class="action-icon" @click=${() => (this._confirmDeleteType = type)}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </div>
                `
              : nothing}
          </div>
          ${this._confirmDeleteType === type
            ? html` <div class="confirm-delete">
                <span>Are you sure you want to delete this card?</span>
                <ha-button @click=${this._removeCustomCard(type)}>Yes</ha-button>
                <ha-button @click=${() => (this._confirmDeleteType = null)}>No</ha-button>
              </div>`
            : nothing}
        </div>
      `;
    });

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
                .checked=${this._config[option.configKey]}
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
    return this.panelTemplate(
      'imagesConfig',
      'imagesConfig',
      'mdi:image',
      html`<panel-images .editor=${this} .config=${this._config}></panel-images>`
    );
  }

  private _renderMapPopupConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoMap');
    const mapPopUp = editorShowOpts(this._selectedLanguage).find((option) => option.configKey === 'enable_map_popup');

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
        <ha-formfield style="flex: 1;" .label=${mapPopUp?.label}>
          <ha-checkbox
            .checked=${this._config[mapPopUp!.configKey]}
            .configValue=${mapPopUp?.configKey}
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

  /* ----------------------------- EVENT HANDLERS ----------------------------- */
  private _handleCustomCardEditorChange(ev: any): void {
    const { type, config } = ev.detail;

    switch (type) {
      case 'use_custom_cards':
        this._customBtnChanged(ev);
        break;
      case 'toggle-card-preview':
        this._toggleCardPreview(config);
        break;

      default:
        return;
    }
    // console.log('Custom card editor changed', type, config);
  }

  private _customBtnHandler(ev: any): void {
    const details = ev.detail;
    const { type, button, card } = details;

    switch (type) {
      case 'toggle-preview-button':
        this._toggleBtnPreview(button);
        break;
      case 'toggle-show-button':
        this._toggleShowButton(card);
        break;
      default:
        this._customBtnChanged(ev);
    }

    // console.log('Custom button handler', type, details.configValue, details.value);
  }

  /* ----------------------- CUSTOM BUTTON ITEMS ACTIONS ---------------------- */

  private _hideCustomButton(cardType: string) {
    return () => {
      const newAddedCards = { ...this._config.added_cards };
      newAddedCards[cardType].button.hide = !newAddedCards[cardType].button.hide;
      this._config = { ...this._config, added_cards: newAddedCards };
      this.configChanged();
      this.baseCardTypes = this.getBaseCardTypes();
      this._convertAddedCardConfigs();
    };
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

  private _handlePanelExpandedChanged(e: Event, titleKey: string): void {
    const panel = e.target as HTMLElement;
    if (titleKey === 'imagesConfig' && (panel as any).expanded) {
      this._panelImages.initSortable();
    }

    // if (titleKey === 'customCardConfig' && (panel as any).expanded) {
    //   this._dispatchCardEvent(this._activeSubcardType as string);
    //   console.log('Custom card panel expanded', this._activeSubcardType);
    // }
  }

  /* ----------------------------- IMAGES HANDLERS ---------------------------- */

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
    const { configValue, configBtnType, value } = ev.detail;

    const updates: Partial<VehicleCardConfig> = {};
    if (this._btnPreview && this._config.btn_preview) {
      this._config = {
        ...this._config,
        btn_preview: {
          ...this._config.btn_preview,
          [configValue]: value,
        },
      };
    }

    if (this._config.added_cards?.hasOwnProperty(configBtnType)) {
      this._config = {
        ...this._config,
        added_cards: {
          ...this._config.added_cards,
          [configBtnType]: {
            ...this._config.added_cards[configBtnType],
            button: {
              ...this._config.added_cards[configBtnType].button,
              [configValue]: value,
            },
          },
        },
      };
    } else {
      updates[configBtnType] = { ...this._config[configBtnType], [configValue]: value };
      this._config = {
        ...this._config,
        ...updates,
      };
    }
    this._debouncedCustomBtnChanged();
  }

  private _customCardChange(ev: any): void {
    ev.stopPropagation();
    const { configKey, value } = ev.detail;
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
    if (this._config.added_cards?.hasOwnProperty(configKey)) {
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

  public configChanged() {
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _toggleCardPreview(cardType: string): void {
    if (this._btnPreview) {
      this._dispatchCardEvent('close_preview');
      this._btnPreview = false;
    }
    if (this._cardPreview) {
      // console.log('Closing card preview:', cardType);
      // Close card preview logic
      if (this._config) {
        this._config = {
          ...this._config,
          card_preview: null,
        };
      }

      this._cardPreview = false;
      this.configChanged();

      if (this._config.added_cards?.hasOwnProperty(cardType)) {
        this._convertAddedCardConfigs();
      } else {
        this._convertDefaultCardConfigs();
      }

      setTimeout(() => {
        this._dispatchCardEvent('close_card_preview');
      }, 50);
    } else {
      // console.log('Setting card preview:', cardType);
      // Set card preview logic
      let cardConfig: LovelaceCardConfig[];
      if (this._config.added_cards?.hasOwnProperty(cardType)) {
        cardConfig = this._config.added_cards[cardType].cards;
      } else {
        cardConfig = this._config[cardType];
      }

      if (!cardConfig || cardConfig.length === 0) {
        console.log(`No card config found for ${cardType}`);
        this.launchToast('customCardConfig', 'No card config found' + `: ${cardType}`);
        return;
      }

      if (this._config) {
        this._config = {
          ...this._config,
          card_preview: cardConfig,
        };
      }

      this._cardPreview = true;
      this.configChanged();

      setTimeout(() => {
        this._dispatchCardEvent('show_card_preview');
      }, 50);
    }
  }

  private _toggleShowButton(card: CardTypeConfig): void {
    if (this._btnPreview) {
      this._toggleBtnPreview(card.button);
      this._btnPreview = false;
      setTimeout(() => {
        this._dispatchCardEvent(`btn_${card.type}`);
      }, 50);
    } else {
      this._dispatchCardEvent(`btn_${card.type}`);
    }
  }

  private _toggleBtnPreview(button: string): void {
    if (this._cardPreview) {
      this._dispatchCardEvent('close_card_preview');
      this._cardPreview = false;
    }
    if (this._btnPreview) {
      console.log('Closing button preview:', button);
      if (this._config) {
        this._config = {
          ...this._config,
          btn_preview: null,
        };
      }

      this._btnPreview = false;
      this.configChanged();
      if (this._config.added_cards?.hasOwnProperty(button)) {
        this._convertAddedCardConfigs();
      } else {
        this._convertDefaultCardConfigs();
      }
      setTimeout(() => {
        this._dispatchCardEvent('close_preview');
      }, 50);
    } else {
      // Set preview button config
      console.log('Setting button preview:', button);
      let btnConfig: ButtonConfigItem;
      if (this._config.added_cards?.hasOwnProperty(button)) {
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
        this._dispatchCardEvent('show_button_preview');
      }, 50);
    }
  }

  private _closeSubCardEditor(card: CardTypeConfig): void {
    const resetState = () => {
      this._activeSubcardType = null;
      this.baseCardTypes = this.getBaseCardTypes();
      this._cardPreview = false;
      this._btnPreview = false;
    };

    if (!this._activeSubcardType) {
      if (this._cardPreview) {
        this._toggleCardPreview(card.type);
      } else if (this._btnPreview) {
        this._toggleBtnPreview(card.button);
      }
      this.updateComplete.then(resetState);
    } else if (this._activeSubcardType === card.type && (!this._cardPreview || !this._btnPreview)) {
      this._activeSubcardType = null;
      this.updateComplete.then(() => {
        this._convertAddedCardConfigs();
        this._convertDefaultCardConfigs();
        resetState();
      });
    }

    this.updateComplete.then(() => {
      this._toggleConfigPanel();
    });
  }

  private _toggleConfigPanel(): void {
    const panel = this.shadowRoot?.querySelector('#buttonConfig') as any;
    if (panel) {
      panel.expanded = true;
    }
  }

  private _dispatchCardEvent(action: string): void {
    // Dispatch the custom event with the cardType name
    const detail = action;
    const ev = new CustomEvent('editor-event', { detail, bubbles: true, composed: true });
    this.dispatchEvent(ev);
    // console.log('Dispatched custom event:', action);
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
