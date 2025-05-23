import { mdiPlus, mdiCodeBraces, mdiListBoxOutline, mdiDelete, mdiContentCut, mdiContentCopy } from '@mdi/js';
// Custom card helpers
import deepClone from 'deep-clone-simple';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import 'nvn-tabs';

import styles from '../../css/editor.css';
import { VehicleCardEditor } from '../../editor';
// Local types
import { HomeAssistant, VehicleCardConfig, CardTypeConfig } from '../../types';
import { fireEvent, HASSDomEvent } from '../../types/ha-frontend/fire-event';
import { LovelaceCardConfig, LovelaceConfig } from '../../types/ha-frontend/lovelace/lovelace';

export interface GUIModeChangedEvent {
  guiMode: boolean;
  guiModeAvailable: boolean;
}

@customElement('custom-card-ui-editor')
export class CustomCardUIEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ type: Object }) editor!: VehicleCardEditor;
  @property({ type: Object }) _config!: VehicleCardConfig;
  @property({ type: Object }) cardType!: CardTypeConfig;
  @property({ type: Boolean }) isCardPreview: boolean = false;
  @property({ type: Boolean }) isCustomCard: boolean = false;
  @property({ type: Boolean }) isAddedCard: boolean = false;

  @state() cards: LovelaceCardConfig[] = [];
  protected _clipboard?: LovelaceCardConfig;
  @state() protected _selectedCard = 0;
  @state() protected _GUImode = true;
  @state() protected _guiModeAvailable? = true;
  @state() private _initialized = false;

  @query('hui-card-element-editor')
  protected _cardEditorEl?: any;

  public static get styles(): CSSResultGroup {
    return [
      styles,
      css`
        .toolbar {
          display: flex;
        }

        #card-options {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }

        #editor-container {
          padding-inline: 4px;
          margin-top: 1rem;
        }

        #card-picker {
          display: block;
          max-height: 600px;
          overflow-x: hidden;
        }

        .gui-mode-button {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
      `,
    ];
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cardEditorEl?.removeEventListener('config-changed', this._handleConfigChanged);
    this._cardEditorEl?.removeEventListener('GUImode-changed', this._handleGUIModeChanged);
  }

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  private _renderCardHeader(): TemplateResult {
    const localizeKey = this.localizeKey;
    return html` <div class="sub-card-header">
      <ha-formfield style="${this.isAddedCard ? 'display: none;' : ''}" .label=${localizeKey('useCustomCard')}>
        <ha-checkbox
          .checked=${this.isCustomCard}
          .disabled=${this.isAddedCard}
          @change=${(ev: Event) => this._handleUseCustomCard(ev)}
        ></ha-checkbox>
      </ha-formfield>
      <ha-button
        style="display: inline-block; float: inline-end;"
        @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle_preview_card')}
      >
        ${this.isCardPreview ? localizeKey('hidePreview') : localizeKey('preview')}
      </ha-button>
    </div>`;
  }

  protected render(): TemplateResult {
    if (!this.editor || !this._config || !this.cardType || !this.hass) {
      return html``;
    }

    this.cards = this.isAddedCard
      ? this._config.added_cards[this.cardType.config].cards || []
      : this._config[this.cardType.config] || [];

    const selected = this._selectedCard!;
    const cardsLength = this.cards.length;
    const isGuiMode = !this._cardEditorEl || this._GUImode;

    const header = this._renderCardHeader();

    const toolBar = html`
      <div class="toolbar">
        <nvn-tab-bar>
          ${this.cards.map(
            (_card, i) =>
              html`<nvn-tab
                ?active=${selected === i}
                .name=${i + 1}
                @click=${() => (this._selectedCard = i)}
                style="flex: 0 !important;"
              ></nvn-tab>`
          )}
        </nvn-tab-bar>
        <nvn-tab id="add-card" ?active=${selected === cardsLength} @click=${this._handleAddCard} .narrow=${true}>
          <ha-svg-icon .path="${mdiPlus}" slot="icon"></ha-svg-icon>
        </nvn-tab>
      </div>
    `;
    return html`
      <div class="card-config">
        ${header} ${toolBar}
        <div id="editor-container">
          ${selected < cardsLength
            ? html`
                <div id="card-options">
                  <ha-icon-button
                    class="gui-mode-button"
                    @click=${this._toggleMode}
                    .disabled=${!this._guiModeAvailable}
                    .path=${isGuiMode ? mdiCodeBraces : mdiListBoxOutline}
                  ></ha-icon-button>
                  <ha-icon-button-arrow-prev
                    .disabled=${selected === 0}
                    .label=${'Move before'}
                    @click=${this._handleMove}
                    .move=${-1}
                  ></ha-icon-button-arrow-prev>

                  <ha-icon-button-arrow-next
                    .label=${'Move after'}
                    .disabled=${selected === cardsLength - 1}
                    @click=${this._handleMove}
                    .move=${1}
                  ></ha-icon-button-arrow-next>
                  <ha-icon-button
                    .label=${'Copy'}
                    .path=${mdiContentCopy}
                    @click=${this._handleCopyCard}
                  ></ha-icon-button>

                  <ha-icon-button .label=${'Cut'} .path=${mdiContentCut} @click=${this._handleCutCard}></ha-icon-button>
                  <ha-icon-button
                    .label=${'Delete'}
                    .path=${mdiDelete}
                    @click=${this._handleDeleteCard}
                  ></ha-icon-button>
                </div>
                <hui-card-element-editor
                  .hass=${this.hass}
                  .value=${this.cards[selected]}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._handleConfigChanged}
                  @GUImode-changed=${this._handleGUIModeChanged}
                ></hui-card-element-editor>
              `
            : html`
                <div id="card-picker">
                  <hui-card-picker
                    .hass=${this.hass}
                    .lovelace=${this.lovelace}
                    ._clipboard=${this._clipboard}
                    ._height=${500}
                    @config-changed=${this._handleCardPicked}
                  >
                  </hui-card-picker>
                </div>
              `}
        </div>
      </div>
    `;
  }

  private localizeKey = (label: string): string => {
    return this.editor.localize(`editor.buttonConfig.${label}`);
  };

  protected _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  protected _handleUseCustomCard(ev: any): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const target = ev.target;
    const cardTypeCard = this.cardType.config;
    const configValue = 'use_custom_cards';

    const config = {
      ...this._config,
      [configValue]: {
        ...this._config[configValue],
        [cardTypeCard]: target.checked,
      },
    };
    fireEvent(this, 'config-changed', { config });
  }

  protected _handleSelectedCard(ev: any): void {
    ev.stopPropagation();
    if (ev.target.id === 'add-card') {
      this._selectedCard = this.cards!.length;
      return;
    } else {
      this._setMode(true);
      this._guiModeAvailable = true;
      this._selectedCard = parseInt(ev.detail.selected, 10);
    }
  }

  protected _handleAddCard(ev: Event): void {
    ev.stopImmediatePropagation();
    this._selectedCard = this.cards!.length;
    this._setMode(true);
    this._guiModeAvailable = true;
    return;
  }

  protected _setMode(value: boolean): void {
    this._GUImode = value;
    if (this._cardEditorEl) {
      this._cardEditorEl!.GUImode = value;
    }
  }
  protected _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  protected _handleConfigChanged(ev: HASSDomEvent<any>): void {
    ev.stopPropagation();

    if (!this._initialized) {
      // Prevent handling config changes during initial render
      this._initialized = true;
      return;
    }

    if (!this._config) {
      return;
    }

    const cardType = this.cardType.config;
    const cardConfig = [...this.cards];
    cardConfig[this._selectedCard] = ev.detail.config;
    const cards = cardConfig;

    if (this._config.card_preview && this.isCardPreview) {
      this._config = { ...this._config, card_preview: cards };
    }

    if (this.isAddedCard) {
      this._handleAddedCard(cards);
    } else {
      this._config = { ...this._config, [cardType]: cards };
    }

    this._guiModeAvailable = ev.detail.guiModeAvailable;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _handleCardPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const config = ev.detail.config;
    const cards = [...(this.cards || []), config];
    if (this._config.card_preview && this.isCardPreview) {
      this._config = { ...this._config, card_preview: cards };
    }

    if (this.isAddedCard) {
      this._handleAddedCard(cards);
    } else {
      this._config = { ...this._config, [this.cardType.config]: cards };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected _handleMove(ev: Event) {
    if (!this._config) {
      return;
    }
    const move = (ev.currentTarget as any).move;
    const source = this._selectedCard;
    const target = source + move;
    const cards = [...(this.cards || [])];
    const card = cards.splice(this._selectedCard, 1)[0];
    cards.splice(target, 0, card);
    if (this._config.card_preview && this.isCardPreview) {
      this._config = { ...this._config, card_preview: cards };
    }

    if (this.isAddedCard) {
      this._handleAddedCard(cards);
    } else {
      this._config = { ...this._config, [this.cardType.config]: cards };
    }
    this._selectedCard = target;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _handleDeleteCard(ev) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const cards = [...this.cards];
    cards.splice(this._selectedCard, 1);
    if (this._config.card_preview && this.isCardPreview) {
      this._config = { ...this._config, card_preview: cards };
    }
    if (this.isAddedCard) {
      this._handleAddedCard(cards);
    } else {
      this._config = {
        ...this._config,
        [this.cardType.config]: cards,
      };
    }
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    console.log('Card deleted', cards);
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _handleCopyCard(ev): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const card = deepClone(this.cards[this._selectedCard]);
    console.log('Card copied', card);
    this._clipboard = card;
  }

  private _handleCutCard(ev): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }

    this._handleCopyCard(ev);
    this._handleDeleteCard(ev);
  }

  private _handleAddedCard(cards: LovelaceCardConfig[]): void {
    if (!this._config) {
      return;
    }
    this._config = {
      ...this._config,
      added_cards: {
        ...this._config.added_cards,
        [this.cardType.config]: {
          ...this._config.added_cards[this.cardType.config],
          cards: cards,
        },
      },
    };
  }

  private _dispatchEvent(ev, type: string) {
    ev.stopPropagation();
    const eventDetail = {
      detail: {
        type: type,
        config: this.cardType.config,
        card: this.cardType,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('custom-card-editor-changed', eventDetail));
    // console.log('dispatched event', type, eventDetail);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-card-ui-editor': CustomCardUIEditor;
  }
}
