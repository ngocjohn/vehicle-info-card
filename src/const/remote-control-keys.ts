import { localize } from '../localize/localize';

const createItem = (nameKey: string, icon: string, lang: string) => ({
  name: localize(`card.${nameKey}`, lang),
  icon,
});

const createService = (command: string, icon: string, nameKey: string, lang: string) => ({
  command,
  icon,
  label: localize(`card.${nameKey}`, lang),
});

export const servicesCtrl = (lang: string) => ({
  auxheat: createItem('servicesCtrl.auxheat', 'mdi:radiator', lang),
  charge: createItem('servicesCtrl.charge', 'mdi:ev-station', lang),
  doorsLock: createItem('servicesCtrl.doorsLock', 'mdi:key-chain', lang),
  engine: createItem('servicesCtrl.engine', 'mdi:engine', lang),
  preheat: createItem('servicesCtrl.preheat', 'mdi:car-seat-heater', lang),
  sendRoute: createItem('servicesCtrl.sendRoute', 'mdi:map-marker-path', lang),
  sigPos: createItem('servicesCtrl.sigPos', 'mdi:bugle', lang),
  sunroof: createItem('servicesCtrl.sunroof', 'mdi:window-open', lang),
  windows: createItem('servicesCtrl.windows', 'mdi:car-door', lang),
});

export const serviceData = (lang: string) => ({
  auxheatConfig: {
    service: {
      START: createService('auxheat_start', 'mdi:radiator', 'serviceData.labelStart', lang),
      STOP: createService('auxheat_stop', 'mdi:radiator-off', 'serviceData.labelStop', lang),
      DATA_CONFIGURE: createService('auxheat_configure', 'mdi:cog', 'serviceData.labelSave', lang),
    },
    data: {
      time_selection: 0, // Store the selected value here
      time_selection_options: {
        0: localize('card.serviceData.labelNoSelection', lang),
        1: localize('card.serviceData.labelTime1', lang),
        2: localize('card.serviceData.labelTime2', lang),
        3: localize('card.serviceData.labelTime3', lang),
      },
      items: {
        time_1: { label: localize('card.serviceData.labelTime1', lang), value: 0, hour: '00', minute: '00' },
        time_2: { label: localize('card.serviceData.labelTime2', lang), value: 0, hour: '00', minute: '00' },
        time_3: { label: localize('card.serviceData.labelTime3', lang), value: 0, hour: '00', minute: '00' },
      },
      selection_time: { label: localize('card.serviceData.labelTimeSelection', lang) },
    },
  },

  windowsConfig: {
    service: {
      OPEN: createService('windows_open', 'mdi:arrow-down-bold', 'serviceData.labelOpen', lang),
      CLOSE: createService('windows_close', 'mdi:arrow-up-bold', 'serviceData.labelClose', lang),
      DATA_MOVE: createService('windows_move', 'mdi:swap-vertical-bold', 'serviceData.labelMove', lang),
    },
    data: {
      positions: {
        front_left: { label: localize('card.serviceData.labelWindowFrontLeft', lang), value: 0 },
        front_right: { label: localize('card.serviceData.labelWindowFrontRight', lang), value: 0 },
        rear_left: { label: localize('card.serviceData.labelWindowRearLeft', lang), value: 0 },
        rear_right: { label: localize('card.serviceData.labelWindowRearRight', lang), value: 0 },
      },
    },
  },

  preheatConfig: {
    service: {
      DATA_START_DEP_TIME: createService('preheat_start_departure_time', 'mdi:cog', 'serviceData.labelStartTime', lang),
      STOP_DEP_TIME: createService('preheat_stop_departure_time', 'mdi:cog', 'serviceData.labelStopTime', lang),
      START: createService('preheat_start', 'mdi:car-seat-heater', 'serviceData.labelStart', lang),
      STOP: createService('preheat_stop', 'mdi:car-seat', 'serviceData.labelStop', lang),
    },
    data: {
      time: { label: localize('card.serviceData.labelDepartureTime', lang), value: 0, hour: '00', minute: '00' },
      departure_time: { label: localize('card.serviceData.labelDepartureTime', lang) },
    },
  },

  engineConfig: {
    service: {
      START: createService('engine_start', 'mdi:engine-start', 'serviceData.labelStart', lang),
      STOP: createService('engine_stop', 'mdi:engine-off', 'serviceData.labelStop', lang),
    },
  },

  batteryChargeConfig: {
    service: {
      DATA_MAX_SOC_CONFIGURE: createService(
        'battery_max_soc_configure',
        'mdi:battery-charging-high',
        'serviceData.labelSetMaxSoc',
        lang
      ),
      DATA_CHARGE_PROGRAM: createService(
        'charge_program_configure',
        'mdi:ev-station',
        'serviceData.labelSetProgram',
        lang
      ),
    },
    data: {
      selected_program: 0, // Store the selected value here
      program_options: {
        0: 'DEFAULT',
        2: 'HOME',
        3: 'WORK',
      },
      max_soc: { label: localize('card.serviceData.labelMaxStateOfCharge', lang), value: 50 },
      program_select: { label: localize('card.serviceData.labelChargeProgram', lang) },
    },
  },

  sendRouteConfig: {
    service: {
      DATA_SEND_ROUTE: createService('send_route', 'mdi:map-marker', 'serviceData.labelSend', lang),
    },
    data: {
      title: { label: localize('card.serviceData.labelTitle', lang), value: '', placeholder: 'Brandenburger Tor' },
      latitude: { label: localize('card.serviceData.labelLatitude', lang), value: '', placeholder: '52.5163' },
      longitude: { label: localize('card.serviceData.labelLongitude', lang), value: '', placeholder: '13.3777' },
      city: { label: localize('card.serviceData.labelCity', lang), value: '', placeholder: 'Berlin' },
      postcode: { label: localize('card.serviceData.labelPostCode', lang), value: '', placeholder: '10117' },
      street: { label: localize('card.serviceData.labelStreet', lang), value: '', placeholder: 'Pariser Platz' },
    },
  },

  sunroofConfigData: {
    service: {
      OPEN: createService('sunroof_open', 'mdi:window-open', 'serviceData.labelOpen', lang),
      CLOSE: createService('sunroof_close', 'mdi:window-closed', 'serviceData.labelClose', lang),
      TILT: createService('sunroof_tilt', 'mdi:window-shutter', 'serviceData.labelTilt', lang),
    },
  },

  precondSeatConfig: {
    service: {
      DATA_SEAT_CONFIGURE: createService(
        'preconditioning_configure_seats',
        'mdi:car-seat',
        'serviceData.labelSeatConfig',
        lang
      ),
      DATA_TEMP_CONFIGURE: createService(
        'temperature_configure',
        'mdi:thermometer',
        'serviceData.labelSetTempZone',
        lang
      ),
    },
    data: {
      precondSeat: {
        front_left: { label: localize('card.serviceData.labelWindowFrontLeft', lang), value: false },
        front_right: { label: localize('card.serviceData.labelWindowFrontRight', lang), value: false },
        rear_left: { label: localize('card.serviceData.labelWindowRearLeft', lang), value: false },
        rear_right: { label: localize('card.serviceData.labelWindowRearRight', lang), value: false },
      },
      temperature: {
        front_left: { label: localize('card.serviceData.labelWindowFrontLeft', lang) },
        front_right: { label: localize('card.serviceData.labelWindowFrontRight', lang) },
        rear_left: { label: localize('card.serviceData.labelWindowRearLeft', lang) },
        rear_right: { label: localize('card.serviceData.labelWindowRearRight', lang) },
      },
    },
  },
});
