import { LitElement, html, TemplateResult, css, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent, LovelaceCardConfig } from 'custom-card-helpers';
import { ServicesConfig } from '../types';
import * as Srvc from '../const/remote-control-keys';
import styles from '../css/remote-control.css';
import mainstyle from '../css/styles.css';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('remote-control')
export class RemoteControl extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Object }) servicesConfig?: ServicesConfig;
  @property({ type: String }) carVin!: string;
  @property({ type: String }) carLockEntity!: string;
  @property({ type: Boolean }) darkMode!: boolean;

  @state() private subcardType: string | null = null;

  private windowPositions = Srvc.windowPositions;
  private auxheatConfig = Srvc.auxheatConfig;

  static get styles(): CSSResultGroup {
    return [styles, mainstyle];
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('darkMode')) {
      this.updateCSSVariables();
    }
  }

  private updateCSSVariables(): void {
    if (this.darkMode) {
      this.style.setProperty('--remote-control-btn-color', '#292929');
    } else {
      this.style.setProperty('--remote-control-btn-color', '#eeeeee');
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="service-control">
        <div class="head-row">${this._renderControlBtn()}</div>
        ${this._renderSubCard()}
      </div>
    `;
  }

  private _renderSubCard(): TemplateResult | void {
    if (!this.subcardType) return;

    const subCardMap = {
      doorsLock: this._renderLockControl(),
      windows: this._renderWindowsMove(),
      auxheat: this._renderAuxHeatControl(),
    };

    const subCard = subCardMap[this.subcardType];

    if (!subCard) return;
    return html`<div class="sub-card-wrapper fade-in">${subCard}</div>`;
  }

  private _renderControlBtn(): TemplateResult {
    const activeServices = Object.entries(this.servicesConfig ?? {})
      .filter(([_, isActive]) => isActive === true)
      .map(([type, _]) => type as keyof ServicesConfig);

    const controlBtns = activeServices.map((type) => {
      const { name, icon } = Srvc.servicesCtrl[type]; // Get name and icon from servicesCtrl
      const activeClass = this.subcardType === type ? 'active' : '';
      return html`
        <div @click=${() => this._handleSubCardClick(type)} class="control-btn-rounded ${activeClass} click-shrink ">
          <ha-icon icon=${icon}></ha-icon>
          <span>${name}</span>
        </div>
      `;
    });

    return html`${controlBtns}`;
  }

  /* ----------------------------- SUBCARD RENDERS ---------------------------- */

  private _renderAuxHeatControl(): TemplateResult {
    const timeItems = {
      time_1: 'Time 1',
      time_2: 'Time 2',
      time_3: 'Time 3',
    };

    const timeElements = Object.entries(timeItems).map(([item, label]) => {
      return html`
        <div class="items-row">
          <div>${label}</div>
          <div class="items-control">
            <div class="time-form">
              <input
                type="number"
                min="0"
                max="1439"
                step="1"
                .value=${this.auxheatConfig[item]}
                @change=${(e) => this.auxHeatTimeChange(item, e)}
              />
              <span>min</span>
            </div>
          </div>
        </div>
      `;
    });

    const timeSelectEl = html`
      <div class="items-row">
        <div>Time Selection</div>
        <ha-select
          .value=${this.auxheatConfig.time_selection}
          @change=${(e) => this.auxHeatTimeChange('time_selection', e)}
        >
          <mwc-list-item value="0">No select</mwc-list-item>
          <mwc-list-item value="1">Time 1</mwc-list-item>
          <mwc-list-item value="2">Time 2</mwc-list-item>
          <mwc-list-item value="3">Time 3</mwc-list-item>
        </ha-select>
      </div>
    `;

    timeElements.unshift(timeSelectEl);

    return html`
      <div class="sub-row">${timeElements}</div>
      <div class="head-sub-row">
        <div class="control-btn-sm click-shrink" @click=${() => this.callService('auxheat_start')}>
          <ha-icon icon="mdi:radiator"></ha-icon> <span>START</span>
        </div>
        <div class="control-btn-sm click-shrink" @click=${this.auxheatConfigureCall}>
          <ha-icon icon="mdi:cog"></ha-icon> <span>SAVE CONFIG </span>
        </div>
        <div class="control-btn-sm click-shrink" @click=${() => this.callService('auxheat_stop')}>
          <ha-icon icon="mdi:radiator-off"></ha-icon> <span>STOP</span>
        </div>
      </div>
    `;
  }

  private auxheatConfigureCall(): void {
    const data = {
      time_selection: this.auxheatConfig.time_selection,
      time_1: this.auxheatConfig.time_1,
      time_2: this.auxheatConfig.time_2,
      time_3: this.auxheatConfig.time_3,
    };

    console.log(data);
    // this.callService('auxheat_configure', data);
  }
  private auxHeatTimeChange(item: string, e: Event | number): void {
    const value = typeof e === 'number' ? e : (e.target as HTMLInputElement).value;
    this.auxheatConfig = {
      ...this.auxheatConfig,
      [item]: value,
    };
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private _renderLockControl(): TemplateResult {
    const lockState = this.hass.states[this.carLockEntity].state;
    const config = {
      locked: {
        icon: 'mdi:lock',
        stateDisplay: 'UNLOCK CAR',
        command: 'doors_unlock',
        bgColor: 'var(--state-lock-locked-color)',
      },
      unlocked: {
        icon: 'mdi:lock-open',
        stateDisplay: 'LOCK CAR',
        command: 'doors_lock',
        bgColor: 'var(--state-lock-unlocked-color)',
      },
      unlocking: {
        icon: 'mdi:lock-clock',
        stateDisplay: lockState,
        command: '',
        bgColor: 'var(--state-lock-unlocking-color)',
      },
    };

    const { icon, stateDisplay, command, bgColor } = config[lockState];

    return html`
      <div class="head-sub-row">
        <div
          class="control-btn-sm click-shrink"
          style="background-color: ${bgColor};"
          @click=${() => this.callService(command)}
        >
          <ha-icon icon=${icon}></ha-icon><span>${stateDisplay}</span>
        </div>
        <div class="control-btn-sm click-shrink" @click=${this.lockMoreInfo}>
          <ha-icon icon="mdi:information"></ha-icon><span>MORE INFO</span>
        </div>
      </div>
    `;
  }

  private _renderWindowsMove(): TemplateResult {
    const moveItems = {
      FRONT_LEFT: 'Front Left',
      FRONT_RIGHT: 'Front Right',
      REAR_LEFT: 'Rear Left',
      REAR_RIGHT: 'Rear Right',
    };

    const moveEl = Object.entries(moveItems).map(([item, label]) => {
      return html`
        <div class="items-row">
          <div>${label}</div>
          <div class="items-control">
            <ha-control-number-buttons
              .min=${0}
              .max=${100}
              .step=${10}
              .value=${this.windowPositions[item]}
              @value-changed=${(e) => this.windowPositionChange(item, e.detail.value - this.windowPositions[item])}
            ></ha-control-number-buttons>
          </div>
        </div>
      `;
    });

    return html`
      <div class="sub-row">${moveEl}</div>
      <div class="control-btn-sm reset click-shrink" @click=${this.resetWindowPositions}>
        <ha-icon icon="mdi:restore"></ha-icon><span>RESET</span>
      </div>
      <div class="head-sub-row">
        <div class="control-btn-sm click-shrink" @click=${() => this.callService('windows_open')}>
          <ha-icon icon="mdi:arrow-up-bold"></ha-icon><span>OPEN</span>
        </div>
        <div class="control-btn-sm click-shrink" @click=${this.moveWindows}>
          <ha-icon icon="mdi:swap-vertical-bold"></ha-icon><span>MOVE</span>
        </div>
        <div class="control-btn-sm click-shrink" @click=${() => this.callService('windows_close')}>
          <ha-icon icon="mdi:arrow-down-bold"></ha-icon><span>CLOSE</span>
        </div>
      </div>
    `;
  }

  /* ----------------------------- HANDLER METHODS ---------------------------- */

  private _handleSubCardClick(type: string): void {
    this.subcardType = this.subcardType === type ? null : type;

    setTimeout(() => {
      const gridBtn = this.shadowRoot?.querySelectorAll(
        '.control-btn-rounded:not(.active).click-shrink',
      ) as NodeListOf<HTMLDivElement>;

      gridBtn?.forEach((btn) => {
        btn.classList.remove('fade-in', 'fade-out', 'hidden');
        if (this.subcardType === null) {
          btn.classList.add('fade-in');
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('fade-out');
          btn.addEventListener(
            'animationend',
            () => {
              btn.classList.add('hidden');
            },
            { once: true },
          );
        }
      });
    }, 0);
  }

  private windowPositionChange(item: string, value: number): void {
    this.windowPositions[item] += value;
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private resetWindowPositions(): void {
    this.windowPositions = {
      FRONT_LEFT: 0,
      FRONT_RIGHT: 0,
      REAR_LEFT: 0,
      REAR_RIGHT: 0,
    };
    this.requestUpdate(); // Trigger re-render to update UI after reset
  }

  private moveWindows(): void {
    const data = {
      front_left: this.windowPositions['FRONT_LEFT'],
      front_right: this.windowPositions['FRONT_RIGHT'],
      rear_left: this.windowPositions['REAR_LEFT'],
      rear_right: this.windowPositions['REAR_RIGHT'],
    };

    this.callService('windows_move', data);
  }

  private lockMoreInfo(): void {
    fireEvent(this, 'hass-more-info', {
      entityId: this.carLockEntity,
    });
  }

  private callService(service: string, data?: any): void {
    this.hass.callService('mbapi2020', service, {
      vin: this.carVin,
      ...data,
    });
  }
}
