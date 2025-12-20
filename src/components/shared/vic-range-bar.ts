import { LitElement, CSSResultGroup, html, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CarItemDisplay } from 'types';

@customElement('vic-range-bar')
export class VicRangeBar extends LitElement {
  @property({ attribute: false }) public levelInfo!: CarItemDisplay;
  @property({ attribute: false }) public rangeInfo!: CarItemDisplay;
  @property({ type: Boolean, reflect: true }) public electic = false;
  @property({ type: Boolean }) public charging = false;

  protected render(): TemplateResult {
    const levelState = parseInt(this.levelInfo.state as string, 10) || 0;
    return html`
      <div class="range-bar-container">
        <div class="item">
          <ha-icon icon=${this.levelInfo.icon}></ha-icon>
          <span>${this.levelInfo.display_state}</span>
        </div>
        <div class="bar-outer">
          <div class="bar-inner" ?charging=${this.charging} style="width: ${levelState}%;"></div>
        </div>
        <div class="item">
          <span>${this.rangeInfo.display_state}</span>
        </div>
      </div>
    `;
  }
  static get styles(): CSSResultGroup {
    return css`
      :host {
        --vic-bar-fuel-color: #4caf50;
        --vic-bar-animation-position: 20px 20px;
        --vic-bar-fuel-color-charging-light: #64b5f6;
        --vic-bar-border-radius: 4px;
        --vic-bar-height: 8px;
        --mdc-icon-size: 21px;
      }
      :host([electic]) {
        --vic-bar-fuel-color: #2196f3;
      }
      .range-bar-container {
        display: flex;
        align-items: center;
        width: 100%;
        gap: var(--vic-gutter-gap);
      }
      .item {
        display: flex;
        align-items: center;
        gap: 5px;
        width: max-content;
      }
      .item ha-icon {
        width: var(--mdc-icon-size);
        height: var(--mdc-icon-size);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
      }
      .bar-outer {
        flex: 1;
        height: var(--vic-bar-height);
        background-color: var(--divider-color);
        border-radius: var(--vic-bar-border-radius);
        overflow: hidden;
        border: none;
      }
      .bar-inner {
        height: 100%;
        background-color: var(--vic-bar-fuel-color);
        transition: width 0.3s ease-in-out;
      }

      .bar-inner[charging] {
        background: -webkit-linear-gradient(
          135deg,
          var(--vic-bar-fuel-color) 25%,
          var(--vic-bar-fuel-color-charging-light) 25%,
          var(--vic-bar-fuel-color-charging-light) 50%,
          var(--vic-bar-fuel-color) 50%,
          var(--vic-bar-fuel-color) 75%,
          var(--vic-bar-fuel-color-charging-light) 75%
        );
        width: 100%;
        height: 100%;
        line-height: 100%;
        border-radius: 4px;
        color: #fff;
        background-size: var(--vic-bar-animation-position);
        animation: bar-animation 3s linear infinite;
        -webkit-animation: bar-animation 3s linear infinite;
      }

      @keyframes bar-animation {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: var(--vic-bar-animation-position);
        }
      }
    `;
  }
}
