import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators';

import { HomeAssistantExtended as HomeAssistant, CardTypeConfig } from '../../types';

import editorcss from '../../css/editor.css';

@customElement('custom-card-editor')
export class CustomCardEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() card!: CardTypeConfig;
  @property({ type: Boolean }) isCardPreview: boolean = false;
  @property({ type: Boolean }) isCustomCard: boolean = false;
  @property({ type: Boolean }) isAddedCard: boolean = false;
  @property({ type: Object }) yamlConfig: any;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private _editorHeader(): TemplateResult {
    return html`<div class="sub-card-header">
      <ha-formfield style="${this.isAddedCard ? 'display: none;' : ''}" .label=${'Use custom card?'}>
        <ha-checkbox
          .checked=${this.isCustomCard}
          .disabled=${this.isAddedCard}
          .configValue=${this.card.config}
          .configBtnType=${'use_custom_cards'}
          @change=${(ev: Event) => this._dispatchEvent(ev, 'use_custom_cards')}
        ></ha-checkbox>
      </ha-formfield>
      <ha-button @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle-card-preview')}
        >${this.isCardPreview ? 'Close preview' : 'Preview'}</ha-button
      >
    </div>`;
  }

  private _cardEditor(): TemplateResult {
    return html`
      <ha-code-editor
        .autofocus=${true}
        .autocompleteEntities=${true}
        .autocompleteIcons=${true}
        .dir=${'ltr'}
        .mode=${'yaml'}
        .hass=${this.hass}
        .linewrap=${false}
        .value=${this.yamlConfig}
        .configValue=${this.card.config}
        @value-changed=${(ev: any) => this._cardEditorValueChanged(ev)}
      ></ha-code-editor>
    `;
  }

  render(): TemplateResult {
    const editorHeader = this._editorHeader();
    const cardEditor = this._cardEditor();

    return html` ${editorHeader} ${cardEditor} `;
  }

  private _cardEditorValueChanged(ev: any) {
    const target = ev.target;
    const value = target.value;
    const event = new CustomEvent('yaml-changed', {
      detail: {
        configKey: this.card.config,
        target: target,
        value: value,
      },
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(event);
  }

  private _dispatchEvent(ev: any, type: string) {
    const target = ev.target;
    const configValue = target?.configValue;
    const configBtnType = target?.configBtnType;
    const value = target.checked !== undefined ? target.checked : target.value;
    const eventDetail = {
      detail: {
        type: type,
        config: this.card.config,
        card: this.card,
        configValue: configValue,
        configBtnType: configBtnType,
        value: value,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('custom-card-editor-changed', eventDetail));
  }
}
