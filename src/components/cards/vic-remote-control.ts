/* eslint-disable @typescript-eslint/no-explicit-any */
import { mdiClose } from '@mdi/js';
import { HomeAssistant, fireEvent, forwardHaptic } from 'custom-card-helpers';
import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import { ControlServiceData, tempSelectOptions } from '../../const/remote-control-keys';
import styles from '../../css/remote-control.css';
import mainstyle from '../../css/styles.css';
import { cloneDeep, convertToMinutes } from '../../utils';
import { VehicleCard } from '../../vehicle-info-card';

const enum PRECOND {
  TIME = 'time',
  ZONE_TEMP = 'zone_temp',
}

@customElement('remote-control')
export class RemoteControl extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) card!: VehicleCard;
  @property({ attribute: false }) private selectedServices!: { [key: string]: { name: string; icon: string } };

  @state() private subcardType: string | null = null;
  @state() private serviceData: Record<string, any> = {};
  @state() private _precondState: string = PRECOND.TIME;

  protected firstUpdated(): void {
    this.initializeServiceData();
  }

  private initializeServiceData() {
    this.serviceData = cloneDeep(ControlServiceData(this.card.userLang));
  }

  private resetConfig(): void {
    this.serviceData = cloneDeep(ControlServiceData(this.card.userLang));
    this.requestUpdate(); // Trigger re-render to update UI after reset
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

  private get precondSeatConfig() {
    return this.serviceData.precondSeatConfig;
  }

  static get styles(): CSSResultGroup {
    return [styles, mainstyle];
  }

  protected render(): TemplateResult {
    if (Object.keys(this.selectedServices).length === 0) return html`<hui-warning>No service selected.</hui-warning>`;
    const title = !this.subcardType
      ? this.card.localize('card.common.titleRemoteControl')
      : this.selectedServices[this.subcardType].name;

    return html`
      <div class="data-header">
        <ha-icon-button
          .label=${'Close'}
          .path=${mdiClose}
          class="click-shrink"
          @click=${() => this.card.toggleCard('close')}
        >
        </ha-icon-button
        >${title}
      </div>
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
    const handleClick = (type: string) => {
      if (type === 'sigPos') {
        this.callService('sigpos_start');
      } else {
        this._handleSubCardClick(type);
      }
    };

    return html`${Object.keys(this.selectedServices).map((type) => {
      const activeClass = this.subcardType === type;
      const { name, icon } = this.selectedServices[type];
      return html`
        <div @click=${() => handleClick(type)} class="control-btn-rounded click-shrink" ?active=${activeClass}>
          <ha-icon icon=${icon}></ha-icon>
          <span>${name}</span>
        </div>
      `;
    })}`;
  }

  private _renderToast(): TemplateResult {
    const toastMsg = this.card.localize('card.common.toastCommandSent');
    return html`
      <div id="toast">
        <ha-alert alert-type="success">${toastMsg} </ha-alert>
      </div>
    `;
  }

  /* ---------------------------- TEMPLATE RENDERS ---------------------------- */

  private _renderServiceBtn(serviceKey: string, serviceItem: any): TemplateResult {
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

    const formElements = Object.entries(data).map(([key, value]) => {
      const { label, value: inputValue, placeholder } = value as { label: string; value: string; placeholder: string };
      return html`
        <div class="items-row">
          <div>${label}</div>
          <div class="items-control">
            <ha-textfield
              .value=${String(inputValue)}
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
    const { preheatConfig, precondSeatConfig } = this;
    const service = preheatConfig.service;
    const precondService = precondSeatConfig.service;

    const precondOptions = [
      { value: PRECOND.TIME, label: 'Time' },
      { value: PRECOND.ZONE_TEMP, label: 'Zones & Temperatures' },
    ];

    const precondHeaderSelect = html`
      <ha-control-select
        .value=${this._precondState}
        .options=${precondOptions}
        @value-changed=${(e: CustomEvent) => {
          this._precondState = e.detail.value;
        }}
      ></ha-control-select>
    `;

    const preheatDepartureTimeEL = this._renderDepartureTime();
    const precondZoneTemp = this._renderPrecondZoneTemp();

    const serviceBtns = html` <div class="head-sub-row">
      ${this._precondState === PRECOND.TIME
        ? html` ${Object.entries(service).map(([key, data]) => {
            return this._renderServiceBtn(key, data);
          })}`
        : html` ${Object.entries(precondService).map(([key, data]) => {
            return this._renderServiceBtn(key, data);
          })}`}
    </div>`;

    return html`
      <div class="sub-row">
        ${precondHeaderSelect} ${this._precondState === PRECOND.TIME ? preheatDepartureTimeEL : precondZoneTemp}
        ${this._renderResetBtn()}
      </div>
      ${serviceBtns}
    `;
  }

  private _renderPrecondZoneTemp(): TemplateResult {
    const { precondSeatConfig } = this;
    const seatOptions = precondSeatConfig.data.precondSeat;
    const tempOptions = precondSeatConfig.data.temperature;

    const precondEid = this.card.vehicleEntities.precondStatus?.entity_id;
    const rawPrecondState = this.hass.states[precondEid]?.state === 'on' ? true : false;
    const precondState = this.card.getStateDisplay(precondEid);

    const precondZoneTemp = Object.entries(seatOptions).map(([key, seatValue]) => {
      const { label: seatLabel, value: seatInputValue } = seatValue as { label: string; value: boolean };
      const tempValue = tempOptions[key]; // Match temperature control by key
      const tempInputValue = tempValue?.value || '';

      return html`
        <div class="items-row">
          <!-- Seat Controls -->
          <div>${seatLabel}</div>
          <ha-switch
            .checked=${seatInputValue}
            .configValue=${key}
            @change=${(e: Event) => this._handleSeatChange(e)}
          ></ha-switch>

          <!-- Temperature Controls -->
          <ha-select
            .label=${'Temperature'}
            .value=${String(tempInputValue)}
            .configValue=${key}
            @selected=${this._handleTempSelect}
            @closed=${(ev: Event) => ev.stopPropagation()}
            fixedMenuPosition
            clearAble
          >
            ${tempSelectOptions.map(({ value, label }) => {
              return html`<mwc-list-item value=${value}>${label}</mwc-list-item>`;
            })}
          </ha-select>
        </div>
      `;
    });
    const preheatStatus = html`<div class="items-row">
      <div>${this.card.localize('card.serviceData.labelPreclimateStatus')}</div>
      <div>
        <ha-switch .checked=${rawPrecondState} @change=${(e: Event) => this._handlePreclimateSwitch(e)}></ha-switch>
        ${precondState}
      </div>
    </div>`;
    return html` ${preheatStatus} ${precondZoneTemp}`;
  }

  private _renderDepartureTime(): TemplateResult {
    const { preheatConfig } = this;
    const time = preheatConfig.data.time;

    return html`
      <div class="items-row">
        <div>${preheatConfig.data.departure_time.label}</div>
        <div>
          <ha-textfield
            type="number"
            inputmode="numeric"
            .value=${time.hour}
            .label=${'hh'}
            .configValue=${'hour'}
            maxlength="2"
            min="0"
            max=${String(23)}
            @input="${this.handlePreheatTimeChange}"
          >
          </ha-textfield>
          <ha-textfield
            type="number"
            inputmode="numeric"
            .value=${time.minute}
            .label=${'mm'}
            .configValue=${'minute'}
            maxlength="2"
            min="0"
            max=${String(59)}
            @input="${this.handlePreheatTimeChange}"
          >
          </ha-textfield>
        </div>
      </div>
    `;
  }

  private _handleSeatChange(e: any): void {
    e.stopPropagation();
    const target = e.target;
    const configValue = e.target.configValue;
    const value = target.checked;
    this.precondSeatConfig.data.precondSeat[configValue].value = value;

    console.log(this.precondSeatConfig.data.precondSeat);
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private _handlePreclimateSwitch(e: any): void {
    e.stopPropagation();
    const target = e.target;
    const value = target.checked;
    this.callService(value ? 'preheat_start' : 'preheat_stop');
  }

  private _handleTempSelect(e: any): void {
    e.stopPropagation();
    const target = e.target;
    const configValue = target.configValue;
    const value = target.value;
    this.precondSeatConfig.data.temperature[configValue].value = value;
    console.log(this.precondSeatConfig.data.temperature);
    this.requestUpdate(); // Trigger re-render to update UI after change
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

    const selectChargeProgram = html`
      <div class="items-row">
        <div class="item-label">${data.program_select.label}</div>
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
        <div class="item-label">${maxSoc.label}</div>
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
    const timeSelectOptions = auxheatConfig.data.time_selection_options;
    const service = auxheatConfig.service;

    const timeSelectEl = html`
      <div class="items-row">
        <div>${auxheatConfig.data.selection_time.label}</div>
        <ha-select
          .label=${auxheatConfig.data.selection_time.label}
          .value=${auxheatConfig.data.time_selection}
          .configValue=${'time_selection'}
          @selected=${this.handleAuxheatChange}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${Object.keys(timeSelectOptions).map((key) => {
            return html`<ha-list-item value=${key}>${timeSelectOptions[key]}</ha-list-item>`;
          })}
        </ha-select>
      </div>
    `;

    const timeInputEl = Object.keys(timeItems).map((key) => {
      const { label, hour, minute } = timeItems[key];
      return html`
        <div class="items-row">
          <div>${label}</div>
          <div>
            <ha-textfield
              type="number"
              inputmode="numeric"
              .value=${hour}
              .label=${'hh'}
              .configValue=${'hour'}
              maxlength="2"
              min="0"
              max=${String(23)}
              .item=${key}
              @input=${this.handleAuxheatChange}
            >
            </ha-textfield>
            <ha-textfield
              type="number"
              inputmode="numeric"
              .value=${minute}
              .label=${'mm'}
              .configValue=${'minute'}
              maxlength="2"
              min="0"
              max=${String(59)}
              .item=${key}
              @input=${this.handleAuxheatChange}
            >
            </ha-textfield>
          </div>
        </div>
      `;
    });

    return html`
      <div class="sub-row">${timeSelectEl}${timeInputEl}</div>
      ${this._renderResetBtn()}
      <div class="head-sub-row">
        ${Object.entries(service).map(([key, data]) => {
          return this._renderServiceBtn(key, data);
        })}
      </div>
    `;
  }

  private _renderLockControl(): TemplateResult {
    const lockEntity = this.card.vehicleEntities.lock?.entity_id;
    const lockState = this.hass.states[lockEntity]?.state;
    const localize = (key: string) => this.card.localize(key);
    const config = {
      locked: {
        icon: 'mdi:lock',
        stateDisplay: localize('card.serviceData.labelUnlockCar'),
        command: 'doors_unlock',
        bgColor: 'var(--state-lock-locked-color)',
      },
      unlocked: {
        icon: 'mdi:lock-open',
        stateDisplay: localize('card.serviceData.labelLockCar'),
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
          <ha-icon icon="mdi:information"></ha-icon><span>${localize('card.serviceData.labelMoreInfo')}</span>
        </div>
      </div>
    `;
  }

  private _renderWindowsControl(): TemplateResult {
    const { windowsConfig } = this;
    const positionItems = windowsConfig.data.positions;
    const service = windowsConfig.service;

    const moveEl = Object.entries(positionItems).map(([key, value]) => {
      const { label, value: inputValue } = value as { label: string; value: number };
      return html`
        <div class="items-row">
          <div class="item-label">${label}</div>
          <ha-control-number-buttons
            .min=${0}
            .max=${100}
            .step=${10}
            .value=${inputValue}
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
    console.log('Saving config change for:', service);
    switch (service) {
      case 'preheat_start_departure_time':
        const data = {
          time: convertToMinutes(this.preheatConfig.data.time.hour, this.preheatConfig.data.time.minute),
        };
        this.callService(service, data);
        break;

      case 'auxheat_configure':
        const { items, time_selection } = this.auxheatConfig.data;
        const times: Record<string, number> = Object.entries(items).reduce((acc, [key, value]) => {
          const { hour, minute } = value as { hour: string; minute: string };
          acc[key] = convertToMinutes(hour, minute);
          return acc;
        }, {} as Record<string, number>);

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
        const dataWindows = Object.entries(this.windowsConfig.data.positions).reduce((acc, [key, value]) => {
          const { value: inputValue } = value as { value: number };
          acc[key] = inputValue;
          return acc;
        }, {} as Record<string, number>);

        this.callService(service, dataWindows);
        break;

      case 'send_route':
        const dataRoute = Object.entries(this.sendRouteConfig.data).reduce((acc, [key, value]) => {
          const { value: inputValue } = value as { value: string };
          acc[key] = inputValue;
          return acc;
        }, {} as Record<string, string>);
        this.callService(service, dataRoute);
        break;

      case 'temperature_configure':
        const dataTemp = Object.entries(this.precondSeatConfig.data.temperature).reduce((acc, [key, value]) => {
          const { value: inputValue } = value as { value: string };
          if (inputValue === '' || inputValue === null || inputValue === undefined) return acc;
          acc[key] = inputValue;
          return acc;
        }, {} as Record<string, string>);
        this.callService(service, dataTemp);
        break;

      case 'preconditioning_configure_seats':
        const dataSeats = Object.entries(this.precondSeatConfig.data.precondSeat).reduce((acc, [key, value]) => {
          const { value: inputValue } = value as { value: boolean };
          acc[key] = inputValue;
          return acc;
        }, {} as Record<string, boolean>);
        this.callService(service, dataSeats);
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

  private handlePreheatTimeChange(e: any): void {
    const target = e.target;
    const value = target.value;
    const configValue = target.configValue;
    const time = this.preheatConfig.data.time;
    console.log('change:', configValue, value);
    time[configValue] = value;

    console.log('data:', this.preheatConfig.data.time);
    this.requestUpdate(); // Trigger re-render to update UI after change
  }

  private handleAuxheatChange(e: any): void {
    e.stopPropagation();
    const target = e.target;
    const configValue = target.configValue;
    const item = target.item;
    const newValue = target.value;
    const data = this.auxheatConfig.data;

    console.log('change:', configValue, newValue);
    if (configValue === 'time_selection') {
      data.time_selection = newValue;
    } else {
      const timeItem = data.items[item];
      timeItem[configValue] = newValue;
    }
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
        '.control-btn-rounded:not([active])'
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
            { once: true }
          );
        }
      });
    }, 0);
  }

  private lockMoreInfo(): void {
    const lockEntity = this.card.vehicleEntities.lock?.entity_id;
    fireEvent(this, 'hass-more-info', {
      entityId: lockEntity,
    });
  }

  async callService(service: string, data?: any): Promise<void> {
    forwardHaptic('success');
    try {
      await this.hass.callService('mbapi2020', service, {
        vin: this.card.carVinNumber,
        ...data,
      });
    } finally {
      console.log('call-service:', service, data);

      this.launchToast();
    }
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

declare global {
  interface HTMLElementTagNameMap {
    'remote-control': RemoteControl;
  }
}
