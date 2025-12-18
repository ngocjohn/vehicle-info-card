import { LitElement, CSSResultGroup, html, TemplateResult, nothing, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

@customElement('vic-indicator-badge')
export class VicIndicatorBadge extends LitElement {
  @property({ type: String, reflect: true }) public type: 'entity' | 'button' = 'entity';
  @property() public label?: string;
  @property({ type: Boolean, reflect: true }) public active = false;
  @property({ type: Boolean, reflect: true }) public hidden = false;

  protected render(): TemplateResult {
    const label = this.label;
    return html`
      <div class="badge" role=${ifDefined(this.type === 'button' ? 'button' : undefined)}>
        <ha-ripple .disabled=${this.type !== 'button'}></ha-ripple>
        <slot name="icon"></slot>
        <span class="info">
          <span class="content"><slot></slot></span>
          ${label ? html`<span class="label">${label}</span>` : nothing}
        </span>
        ${this.type === 'button'
          ? html`<ha-icon slot="icon" class="toggle-icon" icon="mdi:chevron-down"></ha-icon>`
          : nothing}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-block;
        --badge-color: var(--secondary-text-color);
        -webkit-tap-highlight-color: transparent;
        --mdc-icon-size: var(--badge-icon-size, 21px);
      }
      .badge {
        position: relative;
        display: flex;
        align-items: center;
        width: max-content;
        height: 100%;
        justify-content: space-between;
        line-height: 100%;
      }
      [role='button'] {
        cursor: pointer;
      }
      [role='button']:focus {
        outline: none;
      }
      :host([type='button']) [role='button']:hover *,
      :host([type='button']) [role='button']:hover ::slotted([slot='icon']) {
        color: var(--primary-color) !important;
      }
      .info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-inline-start: initial;
        text-align: center;
      }
      .label {
        font-size: calc(12px * 1);
        font-style: normal;
        color: var(--secondary-text-color);
        overflow: hidden;
        white-space: nowrap;
      }
      .content {
        font-size: calc(14px * 1);
        font-style: normal;
        font-weight: 500;
        color: var(--primary-text-color);
        text-align: start;
        overflow: hidden;
        white-space: nowrap;
        letter-spacing: 0.5px;
      }

      :host([active]) .content,
      :host([active]) .toggle-icon,
      :host([active]) ::slotted([slot='icon']) {
        color: var(--primary-color);
      }

      ::slotted([slot='icon']) {
        color: var(--badge-color);
        line-height: 24px;
        margin-left: auto;
        margin-right: 4px;
        height: 100%;
        display: flex;
      }
      .toggle-icon {
        width: 21px;
        height: auto;
        color: var(--secondary-text-color);
        transition: transform 0.3s ease-in-out;
        /* margin-left: -4px; */
        margin-inline-end: -4px;
        display: flex;
        align-content: center;
        align-items: center;
        /* padding: 0; */
        justify-content: center;
      }

      :host([active]) .toggle-icon {
        transform: rotate(180deg);
        transition: transform 0.3s ease;
      }
    `;
  }
}
