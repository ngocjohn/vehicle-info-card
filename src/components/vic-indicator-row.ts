import { CardIndicatorKey, ChargingOverviewKey, INDICATOR_SECTIONS, IndicatorBaseKey } from 'data/indicator-items';
import { isEmpty, pick } from 'es-toolkit/compat';
import { html, TemplateResult, css, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './shared/vic-indicator-badge';
import './shared/vic-range-bar';
import { classMap } from 'lit/directives/class-map.js';
import { CarItemDisplay, HomeAssistant, SECTION } from 'types';

import { BaseElement } from './base-element';

@customElement('vic-indicator-row')
export class VicIndicatorRow extends BaseElement {
  constructor() {
    super(SECTION.HEADER_INFO);
  }
  @state() private subItemsActive: boolean = false;
  @state() private _connected: boolean = false;
  @state() private _baseIndicators?: Record<IndicatorBaseKey, CarItemDisplay>;
  @state() private _chargingOverview?: Record<ChargingOverviewKey, CarItemDisplay>;
  @state() private _noServices: boolean = false;

  public connectedCallback(): void {
    super.connectedCallback();
    window.VicIndicatorRow = this;
    this._connected = true;
  }
  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.VicIndicatorRow = undefined;
    this._connected = false;
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_connected') && this._connected) {
      if (isEmpty(this._baseIndicators)) {
        this._baseIndicators = this.car._getIndicatorSectionItems(INDICATOR_SECTIONS.BASE_INDICATORS);
      }
    }

    if (_changedProperties.has('subItemsActive')) {
      const isActive = this.subItemsActive;
      if (isActive && isEmpty(this._chargingOverview)) {
        this._chargingOverview = this.car._getIndicatorSectionItems(INDICATOR_SECTIONS.CHARGING_OVERVIEW);
      } else if (!isActive && !isEmpty(this._chargingOverview)) {
        this._chargingOverview = undefined;
      }
    }
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    const oldHass = changedProperties.get('_hass') as HomeAssistant | undefined;
    if ((this._baseIndicators || this._chargingOverview) && oldHass) {
      let changedItems: (string | undefined)[] = [];
      for (const item of Object.values({ ...this._baseIndicators, ...this._chargingOverview })) {
        const oldState = oldHass.states[item.entity_id!];
        const newState = this.hass.states[item.entity_id!];
        if (oldState !== newState) {
          changedItems.push(item.key || item.entity_id);
        }
      }
      if (changedItems.length > 0) {
        return this._updateIndicatorItems(changedItems);
      }
    }
    return true;
  }

  private _updateIndicatorItems(changedItems: (string | undefined)[]): boolean {
    let hasUpdated = false;
    changedItems.forEach((changedKey) => {
      if (!changedKey) return;
      if (this._baseIndicators && changedKey in this._baseIndicators) {
        hasUpdated = true;
        this._baseIndicators[changedKey as CardIndicatorKey] = this.car._getEntityConfigByKey(changedKey as any);
      }
      if (this._chargingOverview && changedKey in this._chargingOverview) {
        hasUpdated = true;
        this._chargingOverview[changedKey as CardIndicatorKey] = this.car._getEntityConfigByKey(changedKey as any);
      }
    });
    return hasUpdated;
  }

  protected render(): TemplateResult {
    const baseData = this._baseIndicators!;
    // const baseData = pick(this._baseIndicators!, ['lockSensor', 'parkBrake']);
    const isCarCharging = this.car._isCarCharging;
    const isNoServices = this._noServices;
    return html`
      <div class=${classMap({ 'indicator-row': true, 'more-items': Boolean(isCarCharging || !isNoServices) })}>
        ${Object.values(baseData).map((item) => {
          const { icon, display_state, key } = item;
          const buttonType = ['titleServices', 'stateCharging'].includes(key!) ? 'button' : undefined;
          const isHidden = (key) => {
            if (isNoServices && key === 'titleServices') {
              return true;
            }
            if (!isCarCharging && key === 'stateCharging') {
              return true;
            }
            return false;
          };
          return html`
            <vic-indicator-badge
              type=${buttonType}
              .key=${key}
              @click=${this._handleBadgeClick}
              .active=${this.subItemsActive && key === 'stateCharging'}
              .hidden=${isHidden(key)}
            >
              <ha-icon slot="icon" .icon=${icon}></ha-icon>
              ${display_state}
            </vic-indicator-badge>
          `;
        })}
      </div>
      <div class="indi-group-item" ?active=${this.subItemsActive}>${this._renderSubItems()}</div>
      <div class="combined-range-bars" ?colapsed=${this.subItemsActive}>${this._renderRangeInfoBars()}</div>
    `;
  }

  private _renderSubItems(): TemplateResult {
    if (!this.subItemsActive || isEmpty(this._chargingOverview)) {
      return html``;
    }
    const chargingData = this._chargingOverview;
    // const chargingData = this._chargingData;
    return html`
      ${Object.values(chargingData).map((item) => {
        const { icon, name, display_state, entity_id } = item;
        const stateObj = this.hass?.states[entity_id!];
        return html`
          <vic-indicator-badge .label=${name} @click=${() => this._openMoreInfo(entity_id!)}>
            <ha-state-icon slot="icon" .hass=${this.hass} .stateObj=${stateObj} .icon=${icon}></ha-state-icon>
            ${display_state}
          </vic-indicator-badge>
        `;
      })}
    `;
  }

  private _renderRangeInfoBars(): TemplateResult {
    const rangeInfoConfig = this.car._getIndicatorSectionItems(INDICATOR_SECTIONS.RANGE_INFO);
    if (isEmpty(rangeInfoConfig)) {
      return html``;
    }
    const liquidConfig = pick(rangeInfoConfig, ['fuelLevel', 'rangeLiquid']);
    const electricConfig = pick(rangeInfoConfig, ['soc', 'rangeElectric']);
    const renderBars = (): TemplateResult[] => {
      const bars: TemplateResult[] = [];
      if (!isEmpty(liquidConfig)) {
        bars.push(html`
          <vic-range-bar .levelInfo=${liquidConfig.fuelLevel} .rangeInfo=${liquidConfig.rangeLiquid}></vic-range-bar>
        `);
      }
      if (!isEmpty(electricConfig)) {
        bars.push(html`
          <vic-range-bar
            .levelInfo=${electricConfig.soc}
            .rangeInfo=${electricConfig.rangeElectric}
            .electic=${true}
            .charging=${this.car._isCarCharging}
          ></vic-range-bar>
        `);
      }
      return bars;
    };
    return html`${renderBars()}`;
  }

  private _handleBadgeClick(ev: Event): void {
    ev.stopPropagation();
    const badge = ev.currentTarget as HTMLElement;
    const key = badge?.['key'];
    if (key === 'stateCharging') {
      this.subItemsActive = !this.subItemsActive;
    } else if (key === 'titleServices') {
      console.log('Title Services clicked');
      // Handle title services click action here
    } else {
      const item = this._baseIndicators?.[key as CardIndicatorKey] || this._chargingOverview?.[key as CardIndicatorKey];
      if (item?.entity_id) {
        this._openMoreInfo(item.entity_id);
      }
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      .indicator-row {
        position: relative;
        display: flex;
        height: -moz-fit-content;
        height: fit-content;
        gap: var(--vic-gutter-gap);
        justify-content: space-evenly;
      }
      .indicator-row.more-items {
        justify-content: space-around;
      }
      .indi-group-item {
        overflow: hidden;
        justify-content: space-between;
        max-height: 0;
        opacity: 0;
        display: flex;
        flex-wrap: wrap;
        transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
      }

      .indi-group-item[active] {
        transition: max-height 0.3s ease-out, margin-top 0.3s ease-out;
        margin-top: var(--vic-gutter-gap);
        max-height: 100px;
        justify-content: space-between;
        opacity: 1;
      }
      .combined-range-bars {
        gap: var(--vic-gutter-gap);
        margin-top: var(--vic-gutter-gap);
        width: 100%;
        display: grid;
        width: 100%;
        height: 100%;
        grid-template-columns: repeat(auto-fit, minmax(calc((100% - 16px) / 2), 1fr));
      }
      .combined-range-bars[colapsed] {
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        margin: 0 !important;
        transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
      }
      .combined-range-bars:not([colapsed]) {
        max-height: 200px;
        opacity: 1;
        transition: max-height 0.3s ease-out, margin-top 0.3s ease-out, opacity 0.3s ease-out;
      }
    `;
  }
}
