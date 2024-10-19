/* eslint-disable @typescript-eslint/no-explicit-any */

import { LitElement, html, TemplateResult, CSSResultGroup, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { VehicleCardEditor } from '../../editor';
import { CardTypeConfig } from '../../types';

import editorcss from '../../css/editor.css';

@customElement('custom-card-editor')
export class CustomCardEditor extends LitElement {
  @property({ type: Object }) editor!: VehicleCardEditor;

  @property() card!: CardTypeConfig;
  @property({ type: Boolean }) isCardPreview: boolean = false;
  @property({ type: Boolean }) isCustomCard: boolean = false;
  @property({ type: Boolean }) isAddedCard: boolean = false;
  @property({ type: String }) yamlConfig!: string;
  @property({ type: Object }) cardConfig!: any;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private _editorHeader(): TemplateResult {
    const localizeKey = (label: string): string => {
      return this.editor.localize(`editor.buttonConfig.${label}`);
    };
    return html`<div class="sub-card-header">
      <ha-formfield style="${this.isAddedCard ? 'display: none;' : ''}" .label=${localizeKey('useCustomCard')}>
        <ha-checkbox
          .checked=${this.isCustomCard}
          .disabled=${this.isAddedCard}
          .configValue=${this.card.config}
          .configBtnType=${'use_custom_cards'}
          @change=${(ev: Event) => this._dispatchEvent(ev, 'use_custom_cards')}
        ></ha-checkbox>
      </ha-formfield>
    </div>`;
  }

  private _cardEditor(): TemplateResult {
    return html`
      <ha-yaml-editor
        class="card-editor"
        .hass=${this.editor.hass}
        .defaultValue=${this.cardConfig}
        .readOnly=${false}
        .copyClipboard=${true}
        .hasExtraActions=${true}
        @value-changed=${(ev: CustomEvent) => this._cardEditorValueChanged(ev)}
      >
        <ha-button
          slot="extra-actions"
          style="display: inline-block; float: inline-end;"
          @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle_preview_card')}
        >
          ${this.isCardPreview
            ? this.editor.localize('editor.buttonConfig.hidePreview')
            : this.editor.localize('editor.buttonConfig.preview')}
        </ha-button>
      </ha-yaml-editor>
    `;
  }

  render(): TemplateResult {
    const editorHeader = this._editorHeader();
    const cardEditor = this._cardEditor();

    return html` ${editorHeader} ${cardEditor} `;
  }

  private _cardEditorValueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const { value, isValid } = ev.detail;
    if (!isValid) {
      return;
    }

    const event = new CustomEvent('yaml-changed', {
      detail: {
        configKey: this.card.config,
        value,
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
    console.log('dispatched event', type, configValue, configBtnType, value, eventDetail);
  }
}
