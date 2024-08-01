import { LitElement, html, TemplateResult, css, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent, forwardHaptic } from 'custom-card-helpers';
import { ServicesConfig } from '../types';

import { cloneDeep, convertToMinutes } from '../utils/helpers';
import * as Srvc from '../const/remote-control-keys';

import styles from '../css/remote-control.css';
import mainstyle from '../css/styles.css';
import { localize } from '../localize/localize';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('remote-control')
export class RemoteControl extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Object }) servicesConfig?: ServicesConfig;
  @property({ type: String }) carVin!: string;
  @property({ type: String }) carLockEntity!: string;

  @state() private subcardType: string | null = null;
  @state() private serviceData = cloneDeep(Srvc.serviceData);

  private isAnyServiceEnabled(): boolean {
    if (!this.servicesConfig) return false;
    return Object.values(this.servicesConfig).some((service) => service);
  }

  private get auxheatConfig() {
    return this.serviceData.auxheatConfig;
  }

  private get windowsConfig() {
    return this.serviceData.windowsConfig;
  }

  private get preheatConfig() {
    return this.serviceData.preheatConfig;
  }

  private get engineConfig() {
    return this.serviceData.engineConfig;
  }

  private get chargeConfig() {
    return this.serviceData.batteryChargeConfig;
  }

  private get sendRouteConfig() {
    return this.serviceData.sendRouteConfig;
  }

  private get sunroofConfig() {
    return this.serviceData.sunroofConfigData;
  }

  static get styles(): CSSResultGroup {
    return [styles, mainstyle];
  }

  protected render(): TemplateResult {
    if (!this.isAnyServiceEnabled()) return html`<hui-warning>No service selected.</hui-warning>`;

    return html`
      <div class="service-control">
        <div class="head-row">${this._renderControlBtn()}</div>
        ${this._renderSubCard()}
      </div>
      ${this._renderToast()}
    `;
  }

  private _renderSubCard(): TemplateResult | void {
    if (!this.subcardType) return;

    const subCardMap = {
      doorsLock: this._renderLockControl(),
      windows: this._renderWindowsControl(),
      auxheat: this._renderAuxHeatControl(),
      charge: this._renderChargeControl(),
      engine: this._renderEngineControl(),
      preheat: this._renderPreheatControl(),
      sendRoute: this._renderSendRouteControl(),
      sunroof: this._renderSunroofControl(),
    };

    const subCard = subCardMap[this.subcardType];

    if (!subCard) return;
    return html`<div class="sub-card-wrapper fade-in">${subCard}</div>`;
  }

  private _renderControlBtn(): TemplateResult {
    const activeServices = Object.entries(this.servicesConfig ?? {})
      .filter(([_, isActive]) => isActive === true)
      .map(([type, _]) => type as keyof ServicesConfig);

    const handleClick = (type: string) => {
      if (type === 'sigPos') {
        this.callService('sigpos_start');
      } else {
        this._handleSubCardClick(type);
      }
    };

    const controlBtns = activeServices.map((type) => {
      const { name, icon } = Srvc.servicesCtrl[type]; // Get name and icon from servicesCtrl
      const activeClass = this.subcardType === type ? 'active' : '';
      return html`
        <div @click=${() => handleClick(type)} class="control-btn-rounded ${activeClass} click-shrink">
          <ha-icon icon=${icon}></ha-icon>
          <span>${name}</span>
        </div>
      `;
    });

    return html`${controlBtns}`;
  }

  private _renderToast(): TemplateResult {
    const toastMsg = localize('common.toastCommandSent');
    return html`
      <div id="toast">
        <ha-alert alert-type="success">${toastMsg} </ha-alert>
      </div>
    `;
  }

  /* ---------------------------- TEMPLATE RENDERS ---------------------------- */

  private _renderServiceBtn(serviceKey: string, serviceItem): TemplateResult {
    const { command, icon, label } = serviceItem;
    const handleClick = serviceKey.includes('DATA_')
      ? () => this.saveConfigChange(command)
      : () => this.callService(command);
    return html`
      <div class="control-btn-sm click-shrink" @click=${handleClick}>
        <ha-icon icon=${icon}></ha-icon><span>${label}</span>
      </div>
    `;
  }

  private _renderResetBtn(): TemplateResult {
    return html` <div class="control-btn-sm click-shrink" @click=${() => this.resetConfig()}>
      <ha-icon icon="mdi:restore"></ha-icon><span>RESET</span>
    </div>`;
  }

  /* ----------------------------- SUBCARD RENDERS ---------------------------- */

  private _renderSunroofControl(): TemplateResult {
    const { sunroofConfig } = this;
    const service = sunroofConfig.service;

    return html`
      <div class="head-sub-row">
        ${Object.entries(service).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  private _renderSendRouteControl(): TemplateResult {
    const { sendRouteConfig } = this;
    const data = sendRouteConfig.data;

    const formElements = Object.entries(data).map(([key, { label, value, placeholder }]) => {
      return html`
        <div class="items-row">
          <div>${label}</div>
          <div class="items-control">
            <ha-textfield
              .value=${String(value)}
              .placeholder=${placeholder}
              @input=${(e) => this.handleSendRouteChange(key, e)}
            ></ha-textfield>
          </div>
        </div>
      `;
    });

    return html`
      <div class="sub-row">${formElements}</div>

      <div class="head-sub-row">
        ${this._renderResetBtn()}
        ${Object.entries(sendRouteConfig.service).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  private _renderPreheatControl(): TemplateResult {
    const { preheatConfig } = this;
    const time = preheatConfig.data.time;
    const service = preheatConfig.service;
    const labelDepartureTime = localize('serviceData.labelDepartureTime');
    const preheatDepartureTimeEL = html`
      <div class="items-row">
        <div>${labelDepartureTime}</div>
        <div class="time-input-wrap">
          <ha-textfield
            type="number"
            inputmode="numeric"
            .value=${time.hour}
            .label=${'hh'}
            .configValue=${'_hours'}
            maxlength="2"
            min="0"
            max=${String(23)}
            @change=${(e: Event) => this.handlePreheatTimeChange(e)}
          >
          </ha-textfield>
          <ha-textfield
            type="number"
            inputmode="numeric"
            .value=${time.minute}
            .label=${'mm'}
            .configValue=${'_mins'}
            maxlength="2"
            min="0"
            max=${String(59)}
            @change=${(e: Event) => this.handlePreheatTimeChange(e)}
          >
          </ha-textfield>
        </div>
      </div>
    `;

    return html`
      <div class="sub-row">${preheatDepartureTimeEL}</div>
      ${this._renderResetBtn()}
      <div class="head-sub-row preheat">
        ${Object.entries(service).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  private _renderEngineControl(): TemplateResult {
    return html`
      <div class="head-sub-row">
        ${Object.entries(this.engineConfig.service).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  private _renderChargeControl(): TemplateResult {
    const { chargeConfig } = this;
    const data = chargeConfig.data;
    const selectedProgram = data.selected_program;
    const programOptions = data.program_options;
    const maxSoc = data.max_soc;

    const services = chargeConfig.service;
    const labelChargeProgram = localize('serviceData.labelChargeProgram');
    const labelMaxSoc = localize('serviceData.labelMaxStateOfCharge');
    const selectChargeProgram = html`
      <div class="items-row">
        <div>${labelChargeProgram}</div>
        <ha-select
          .value=${String(selectedProgram)}
          @change=${(e: Event) => this.handleChargeProgramChange('selected_program', e)}
        >
          ${Object.entries(programOptions).map(([value, label]) => {
            return html`<mwc-list-item value=${value}>${label}</mwc-list-item>`;
          })}
        </ha-select>
      </div>
    `;

    const maxSocConfig = html`
      <div class="items-row">
        <div>${maxSoc.label}</div>
        <ha-control-number-buttons
          .min=${50}
          .max=${100}
          .step=${10}
          .value=${maxSoc.value}
          @value-changed=${(e: Event) => this.handleChargeProgramChange('max_soc', e)}
        ></ha-control-number-buttons>

        </ha-select>
      </div>
    `;

    return html`
      <div class="sub-row">${selectChargeProgram}${maxSocConfig}</div>
      ${this._renderResetBtn()}
      <div class="head-sub-row">
        ${Object.entries(services).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  private _renderAuxHeatControl(): TemplateResult {
    const { auxheatConfig } = this;
    const timeItems = auxheatConfig.data.items;
    const selectedTimeSelection = auxheatConfig.data.time_selection;
    const timeSelectOptions = auxheatConfig.data.time_selection_options;

    const service = auxheatConfig.service;
    const titleTimeSelection = localize('serviceData.labelTimeSelection');
    const timeSelectEl = html`
      <div class="items-row">
        <div>${titleTimeSelection}</div>
        <ha-select
          .value=${String(selectedTimeSelection)}
          @change=${(e: Event) => this.handleAuxheatChange('time_selection', '', e)}
        >
          ${Object.entries(timeSelectOptions).map(([value, label]) => {
            return html`<mwc-list-item value=${value}>${label}</mwc-list-item>`;
          })}
        </ha-select>
      </div>
    `;

    const serviceBtns = Object.entries(service).map(([key, data]) => {
      return this._renderServiceBtn(key, data);
    });

    const timeInput = Object.entries(timeItems).map(([item, { label, hour, minute }]) => {
      return html`
        <div class="items-row">
          <div>${label}</div>
          <div class="time-input-wrap">
            <ha-textfield
              type="number"
              inputmode="numeric"
              .value=${hour}
              .label=${'hh'}
              .configValue=${`_hours`}
              maxlength="2"
              min="0"
              max=${String(23)}
              @change=${(e: Event) => this.handleAuxheatChange('hours', item, e)}
            >
            </ha-textfield>
            <ha-textfield
              type="number"
              inputmode="numeric"
              .value=${minute}
              .label=${'mm'}
              .configValue=${'_mins'}
              maxlength="2"
              min="0"
              max=${String(59)}
              @change=${(e: Event) => this.handleAuxheatChange('mins', item, e)}
            >
            </ha-textfield>
          </div>
        </div>
      `;
    });

    return html`
      <div class="sub-row">${timeSelectEl}${timeInput}</div>
      ${this._renderResetBtn()}
      <div class="head-sub-row">${serviceBtns}</div>
    `;
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

  private _renderWindowsControl(): TemplateResult {
    const { windowsConfig } = this;
    const positionItems = windowsConfig.data.positions;
    const service = windowsConfig.service;

    const moveEl = Object.entries(positionItems).map(([key, { label, value }]) => {
      return html`
        <div class="items-row">
          <div>${label}</div>
          <ha-control-number-buttons
            .min=${0}
            .max=${100}
            .step=${10}
            .value=${value}
            @value-changed=${(e) => this.handleWindowsChange(key, e)}
          ></ha-control-number-buttons>
        </div>
      `;
    });

    return html`
      <div class="sub-row">${moveEl}</div>
      ${this._renderResetBtn()}

      <div class="head-sub-row">
        ${Object.entries(service).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  /* ----------------------------- HANDLER METHODS ---------------------------- */

  private saveConfigChange(service: string): void {
    switch (service) {
      case 'preheat_start_departure_time':
        const data = {
          time: convertToMinutes(this.preheatConfig.data.time.hour, this.preheatConfig.data.time.minute),
        };
        this.callService(service, data);
        break;

      case 'auxheat_configure':
        const { items, time_selection } = this.auxheatConfig.data;
        const times: Record<string, number> = Object.entries(items).reduce((acc, [key, { hour, minute }]) => {
          acc[key] = convertToMinutes(hour, minute);
          return acc;
        }, {});

        const dataAux = {
          time_selection,
          ...times,
        };
        this.callService(service, dataAux);
        break;

      case 'battery_max_soc_configure':
        const dataCharge = {
          charge_program: this.chargeConfig.data.selected_program,
          max_soc: this.chargeConfig.data.max_soc.value,
        };
        this.callService(service, dataCharge);
        break;
      case 'charge_program_configure':
        const dataProgram = {
          charge_program: this.chargeConfig.data.selected_program,
        };
        this.callService(service, dataProgram);
        break;

      case 'windows_move':
        const dataWindows = Object.entries(this.windowsConfig.data.positions).reduce((acc, [key, { value }]) => {
          acc[key] = value;
          return acc;
        }, {});

        this.callService(service, dataWindows);
        break;

      case 'send_route':
        const dataRoute = Object.entries(this.sendRouteConfig.data).reduce((acc, [key, { value }]) => {
          acc[key] = value;
          return acc;
        }, {});
        this.callService(service, dataRoute);
        break;

      default:
        break;
    }
  }

  private handleSendRouteChange(key: string, e: Event): void {
    const value = (e.target as HTMLInputElement).value;

    this.sendRouteConfig.data[key].value = value;
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private handleChargeProgramChange(type: string, e: Event): void {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    if (type === 'max_soc') {
      this.chargeConfig.data[type].value = parseInt(value, 10);
    } else {
      this.chargeConfig.data[type] = parseInt(value, 10);
    }

    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private handlePreheatTimeChange(e): void {
    const target = e.target;
    const value = target.value;
    const configValue = target.configValue;
    const time = this.preheatConfig.data.time;
    let newValue: any;
    if (configValue === '_hours') {
      newValue = parseInt(value, 10);
      time.hour = newValue;
    } else if (configValue === '_mins') {
      newValue = parseInt(value, 10);
      time.minute = newValue;
    }

    console.log('data:', this.preheatConfig.data.time);
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private handleAuxheatChange(type: string, item: string, e): void {
    const target = e.target;
    const value = target.value;
    const configValue = target.configValue;
    const data = this.auxheatConfig.data;
    let newValue: any;

    if (type === 'time_selection') {
      data.time_selection = parseInt(value, 10);
    } else if (configValue === '_hours') {
      newValue = parseInt(value, 10);
      data.items[item].hour = newValue;
    } else if (configValue === '_mins') {
      newValue = parseInt(value, 10);
      data.items[item].minute = newValue;
    }

    console.log('data:', data.items[item]);
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private handleWindowsChange(key: string, e: CustomEvent): void {
    this.windowsConfig.data.positions[key].value = e.detail.value;
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private _handleSubCardClick(type: string): void {
    forwardHaptic('light');
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

  private resetConfig(): void {
    this.serviceData = cloneDeep(Srvc.serviceData);
    this.requestUpdate(); // Trigger re-render to update UI after reset
  }

  private lockMoreInfo(): void {
    fireEvent(this, 'hass-more-info', {
      entityId: this.carLockEntity,
    });
  }

  private callService(service: string, data?: any): void {
    forwardHaptic('success');
    this.hass.callService('mbapi2020', service, {
      vin: this.carVin,
      ...data,
    });
    console.log('call-service:', service, data);
    this.launchToast();
  }

  private launchToast(): void {
    const toast = this.shadowRoot?.getElementById('toast') as HTMLElement;
    if (!toast) return;

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}
