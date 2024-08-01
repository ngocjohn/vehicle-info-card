import { localize } from '../localize/localize';

const createItem = (nameKey: string, icon: string) => ({
  name: localize(nameKey),
  icon,
});

const createService = (command: string, icon: string, label: string) => ({
  command,
  icon,
  label: localize(label),
});

export const servicesCtrl = {
  auxheat: createItem('servicesCtrl.auxheat', 'mdi:radiator'),
  charge: createItem('servicesCtrl.charge', 'mdi:ev-station'),
  doorsLock: createItem('servicesCtrl.doorsLock', 'mdi:key-chain'),
  engine: createItem('servicesCtrl.engine', 'mdi:engine'),
  preheat: createItem('servicesCtrl.preheat', 'mdi:car-seat-heater'),
  sendRoute: createItem('servicesCtrl.sendRoute', 'mdi:map-marker-path'),
  sigPos: createItem('servicesCtrl.sigPos', 'mdi:bugle'),
  sunroof: createItem('servicesCtrl.sunroof', 'mdi:window-open'),
  windows: createItem('servicesCtrl.windows', 'mdi:car-door'),
};

export const serviceData = {
  auxheatConfig: {
    service: {
      START: createService('auxheat_start', 'mdi:radiator', 'serviceData.labelStart'),
      STOP: createService('auxheat_stop', 'mdi:radiator-off', 'serviceData.labelStop'),
      DATA_CONFIGURE: createService('auxheat_configure', 'mdi:cog', 'serviceData.labelSave'),
    },
    data: {
      time_selection: 0, // Store the selected value here
      time_selection_options: {
        0: localize('serviceData.labelNoSelection'),
        1: localize('serviceData.labelTime1'),
        2: localize('serviceData.labelTime2'),
        3: localize('serviceData.labelTime3'),
      },
      items: {
        time_1: { label: localize('serviceData.labelTime1'), value: 0, hour: '00', minute: '00' },
        time_2: { label: localize('serviceData.labelTime2'), value: 0, hour: '00', minute: '00' },
        time_3: { label: localize('serviceData.labelTime3'), value: 0, hour: '00', minute: '00' },
      },
    },
  },

  windowsConfig: {
    service: {
      OPEN: createService('windows_open', 'mdi:arrow-up-bold', 'serviceData.labelOpen'),
      CLOSE: createService('windows_close', 'mdi:arrow-down-bold', 'serviceData.labelClose'),
      DATA_MOVE: createService('windows_move', 'mdi:swap-vertical-bold', 'serviceData.labelMove'),
    },
    data: {
      positions: {
        front_left: { label: localize('serviceData.labelWindowFrontLeft'), value: 0 },
        front_right: { label: localize('serviceData.labelWindowFrontRight'), value: 0 },
        rear_left: { label: localize('serviceData.labelWindowRearLeft'), value: 0 },
        rear_right: { label: localize('serviceData.labelWindowRearRight'), value: 0 },
      },
    },
  },

  preheatConfig: {
    service: {
      DATA_START_DEP_TIME: createService('preheat_start_departure_time', 'mdi:cog', 'serviceData.labelStartTime'),
      STOP_DEP_TIME: createService('preheat_stop_departure_time', 'mdi:cog', 'serviceData.labelStopTime'),
      START: createService('preheat_start', 'mdi:car-seat-heater', 'serviceData.labelStart'),
      STOP: createService('preheat_stop', 'mdi:car-seat', 'serviceData.labelStop'),
    },
    data: {
      time: { label: localize('serviceData.labelDepartureTime'), value: 0, hour: '00', minute: '00' },
    },
  },

  engineConfig: {
    service: {
      START: createService('engine_start', 'mdi:engine-start', 'serviceData.labelStart'),
      STOP: createService('engine_stop', 'mdi:engine-off', 'serviceData.labelStop'),
    },
  },

  batteryChargeConfig: {
    service: {
      DATA_MAX_SOC_CONFIGURE: createService(
        'battery_max_soc_configure',
        'mdi:battery-charging-high',
        'serviceData.labelSetMaxSoc',
      ),
      DATA_CHARGE_PROGRAM: createService('charge_program_configure', 'mdi:ev-station', 'serviceData.labelSetProgram'),
    },
    data: {
      selected_program: 0, // Store the selected value here
      program_options: {
        0: 'DEFAULT',
        2: 'HOME',
        3: 'WORK',
      },
      max_soc: { label: localize('serviceData.labelMaxStateOfCharge'), value: 50 },
    },
  },

  sendRouteConfig: {
    service: {
      DATA_SEND_ROUTE: createService('send_route', 'mdi:map-marker', 'serviceData.labelSend'),
    },
    data: {
      title: { label: localize('serviceData.labelTitle'), value: '', placeholder: 'Brandenburger Tor' },
      latitude: { label: localize('serviceData.labelLatitude'), value: '', placeholder: '52.5163' },
      longitude: { label: localize('serviceData.labelLongitude'), value: '', placeholder: '13.3777' },
      city: { label: localize('serviceData.labelCity'), value: '', placeholder: 'Berlin' },
      postcode: { label: localize('serviceData.labelPostCode'), value: '', placeholder: '10117' },
      street: { label: localize('serviceData.labelStreet'), value: '', placeholder: 'Pariser Platz' },
    },
  },

  sunroofConfigData: {
    service: {
      OPEN: createService('sunroof_open', 'mdi:window-open', 'serviceData.labelOpen'),
      CLOSE: createService('sunroof_close', 'mdi:window-closed', 'serviceData.labelClose'),
      TILT: createService('sunroof_tilt', 'mdi:window-shutter', 'serviceData.labelTilt'),
    },
  },
};
