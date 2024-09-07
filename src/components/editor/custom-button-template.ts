import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators';
import { isString } from 'es-toolkit';

import { ExtendedButtonConfigItem, CardTypeConfig } from '../../types';

import editorcss from '../../css/editor.css';

@customElement('custom-button-template')
export class CustomButtonTemplate extends LitElement {
  @property({ type: Object }) editor!: any;
  @property() button!: ExtendedButtonConfigItem;
  @property() card!: CardTypeConfig;
  @property({ type: Boolean }) isButtonPreview: boolean = false;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private get cardButton(): string {
    return this.card.button;
  }

  private localizeKey = (label: string): string => {
    return this.editor.localize(`editor.buttonConfig.${label}`);
  };

  private _editorHeader(): TemplateResult {
    const isDefaultCard = this.button.isDefaultCard;
    const localizeKey = this.localizeKey;

    const checkboxConfigs = [
      ...(isDefaultCard
        ? [{ label: localizeKey('useCustomButton'), value: this.button.enabled, configValue: 'enabled' }]
        : []),
      { label: localizeKey('hideButton'), value: this.button.hide, configValue: 'hide' },
    ];

    return html`<div class="sub-card-header">
      ${checkboxConfigs.map(
        (config) => html`
          <ha-formfield .label=${config.label}>
            <ha-checkbox
              .checked=${config.value}
              .configValue=${config.configValue}
              .configBtnType=${this.card.button}
              @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
            ></ha-checkbox>
          </ha-formfield>
        `
      )}
      ${!this.button.isHidden
        ? html`
            <ha-button @click=${() => this.editor._toggleShowButton(this.card)}>${localizeKey('showButton')}</ha-button>
          `
        : ''}
      <ha-button @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle-preview-button')}
        >${!this.isButtonPreview ? localizeKey('preview') : localizeKey('hidePreview')}</ha-button
      >
    </div>`;
  }

  private _buttonTitleIconForms(): TemplateResult {
    const { primary, icon } = this.button;
    const button = this.card.button;

    const primaryInput = html`
      <ha-textfield
        .label=${'Button Title'}
        .value=${primary}
        .configValue=${'primary'}
        .configBtnType=${button}
        @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-textfield>
    `;

    const iconSelector = html`
      <ha-icon-picker
        .label=${'Icon'}
        .value=${icon}
        .configValue=${'icon'}
        .configBtnType=${button}
        @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-icon-picker>
    `;

    return html`${primaryInput}${iconSelector}`;
  }

  private _templateUI(label: string, value: string, configValue: string, helper: string): TemplateResult {
    const button = this.card.button;

    return html`
      <div class="template-ui">
        <p>${label}</p>
        <ha-code-editor
          .mode=${'jinja2'}
          .dir=${'ltr'}
          .value=${value}
          .configValue=${configValue}
          .configBtnType=${button}
          @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
          .linewrap=${false}
          .autofocus=${true}
          .autocompleteEntities=${true}
          .autocompleteIcons=${true}
        ></ha-code-editor>
        <ha-input-helper-text>${helper}</ha-input-helper-text>
      </div>
    `;
  }

  render(): TemplateResult {
    const localizeKey = this.localizeKey;
    const { notify, secondary } = this.button;
    const editorHeader = this._editorHeader();
    const buttonTitleIconForms = this._buttonTitleIconForms();
    const secondaryUI = this._templateUI(
      localizeKey('secondaryInfo'),
      secondary,
      'secondary',
      localizeKey('secondaryInfoHelper')
    );
    const notifyUI = this._templateUI(localizeKey('notifyInfo'), notify, 'notify', localizeKey('notifyInfoHelper'));

    return html`${editorHeader}
      <div class="card-button-cfg">${buttonTitleIconForms}</div>
      ${secondaryUI}${notifyUI}`;
  }

  private _dispatchEvent(ev: any, type: string) {
    const target = ev.target;
    const configValue = target?.configValue;
    const configBtnType = target?.configBtnType;
    const newValue = target.checked !== undefined ? target.checked : target.value;
    const value = isString(newValue) ? newValue.trim() : newValue;
    const eventDetail = {
      detail: {
        type: type,
        config: this.card.config,
        card: this.card,
        button: this.cardButton,
        configValue: configValue,
        configBtnType: configBtnType,
        value: value,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('custom-button-changed', eventDetail));
  }
}
