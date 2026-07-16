import { LitElement, CSSResultGroup, css } from 'lit';
import { property } from 'lit/decorators.js';

import { Store } from '../model/store';
import { HomeAssistant } from '../types';
import { ConfigArea } from '../types';

export class BaseEditor extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected _store!: Store;

  protected _editorArea?: ConfigArea;

  constructor(editorArea?: ConfigArea) {
    super();
    if (editorArea) {
      this._editorArea = editorArea;
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --vic-gutter-gap: 8px;
        --vic-card-padding: 12px;
        --vic-icon-size: 36px;
        --vic-icon-border-radius: 50%;
        --vic-icon-shape-color: rgba(var(--rgb-primary-text-color), 0.05);
      }
      *,
      *:before,
      *:after {
        box-sizing: border-box;
      }
    `;
  }
}
