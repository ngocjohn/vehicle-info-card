import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Store } from 'model/store';
import { HomeAssistant, SECTION } from 'types';

export function computeDarkMode(hass?: HomeAssistant): boolean {
  if (!hass) return false;
  return (hass.themes as any).darkMode as boolean;
}

export class BaseElement extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected _store!: Store;

  protected section?: SECTION;

  connectedCallback(): void {
    super.connectedCallback();
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
  }
  constructor(section?: SECTION) {
    super();
    if (section) {
      this.section = section;
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._store && !this._store._hass) {
      this._store._hass = hass;
    }
  }

  get hass(): HomeAssistant {
    return this._hass;
  }

  public _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --vic-gutter-gap: 8px;
        --vic-card-padding: 12px;
        --vic-icon-size: 36px;
        --vic-icon-border-radius: 18px;
        --vic-icon-shape-color: rgba(var(--rgb-primary-text-color), 0.05);
        --vic-icon-bg-opacity: 0.2;
      }
      *,
      *:before,
      *:after {
        box-sizing: border-box;
      }
    `;
  }
}
