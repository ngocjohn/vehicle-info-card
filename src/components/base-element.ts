import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Car } from 'model/car';
import { Store } from 'model/store';
import { configHasDeprecatedProps, fireEvent, HomeAssistant, LocalizeFunc, SECTION, VehicleCardConfig } from 'types';

export function computeDarkMode(hass?: HomeAssistant): boolean {
  if (!hass) return false;
  return (hass.themes as any).darkMode as boolean;
}

export class BaseElement extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected store!: Store;
  @property({ attribute: false }) protected car!: Car;

  // protected _translate!: LocalizeFunc;
  protected section?: SECTION;

  constructor(section?: SECTION) {
    super();
    if (section) {
      this.section = section;
    }
  }

  public connectedCallback() {
    super.connectedCallback();

    // if (this.hasUpdated && this.store !== undefined) {
    //   console.log('%cBASE-ELEMENT:', 'color: #bada55;', this, this.hasUpdated);
    // }
  }

  get _translate(): LocalizeFunc {
    return this.store.translate;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  get hass(): HomeAssistant {
    return this._hass;
  }

  public _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  protected _openMoreInfo(entityId: string): void {
    fireEvent(this, 'hass-more-info', { entityId });
  }

  private _validateConfig(config: VehicleCardConfig) {
    return configHasDeprecatedProps(config);
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
