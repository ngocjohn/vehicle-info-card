export const servicesCtrl = {
  auxheat: { name: 'Auxiliary heating', icon: 'mdi:radiator' },
  charge: { name: 'Charge program', icon: 'mdi:ev-station' },
  doorsLock: { name: 'Security', icon: 'mdi:key-chain' },
  engine: { name: 'Engine control', icon: 'mdi:engine' },
  preheat: { name: 'Pre-conditioning', icon: 'mdi:car-seat-heater' },
  sendRoute: { name: 'Send route', icon: 'mdi:map-marker-path' },
  sigPos: { name: 'Signal position', icon: 'mdi:bugle' },
  sunroof: { name: 'Sunroof', icon: 'mdi:window-open' },
  windows: { name: 'Windows', icon: 'mdi:car-door' },
};

export const serviceData = {
  auxheatConfig: {
    service: {
      START: { command: 'auxheat_start', icon: 'mdi:radiator', label: 'Start' },
      STOP: { command: 'auxheat_stop', icon: 'mdi:radiator-off', label: 'Stop' },
      DATA_CONFIGURE: { command: 'auxheat_configure', icon: 'mdi:cog', label: 'save' },
    },
    data: {
      time_selection: 0, // Store the selected value here
      time_selection_options: {
        0: 'No selection',
        1: 'Time 1',
        2: 'Time 2',
        3: 'Time 3',
      },
      items: {
        time_1: { label: 'Time 1', value: 0 },
        time_2: { label: 'Time 2', value: 0 },
        time_3: { label: 'Time 3', value: 0 },
      },
    },
  },

  windowsConfig: {
    service: {
      OPEN: { command: 'windows_open', icon: 'mdi:arrow-up-bold', label: 'Open' },
      CLOSE: { command: 'windows_close', icon: 'mdi:arrow-down-bold', label: 'Close' },
      DATA_MOVE: { command: 'windows_move', icon: 'mdi:swap-vertical-bold', label: 'Move' },
    },
    data: {
      positions: {
        front_left: { label: 'Front left', value: 0 },
        front_right: { label: 'Front right', value: 0 },
        rear_left: { label: 'Rear left', value: 0 },
        rear_right: { label: 'Rear right', value: 0 },
      },
    },
  },

  preheatConfig: {
    service: {
      DATA_START_DEP_TIME: { command: 'preheat_start_departure_time', icon: 'mdi:cog', label: 'start time' },
      STOP_DEP_TIME: { command: 'preheat_stop_departure_time', icon: 'mdi:cog-off', label: 'stop time' },
      START: { command: 'preheat_start', icon: 'mdi:car-seat-heater', label: 'Start' },
      STOP: { command: 'preheat_stop', icon: 'mdi:car-seat', label: 'Stop' },
    },
    data: {
      time: { label: 'Departure time', value: 0 },
    },
  },

  engineConfig: {
    service: {
      START: { command: 'engine_start', icon: 'mdi:engine', label: 'Start' },
      STOP: { command: 'engine_stop', icon: 'mdi:engine-off', label: 'Stop' },
    },
  },

  batteryChargeConfig: {
    service: {
      DATA_MAX_SOC_CONFIGURE: {
        command: 'battery_max_soc_configure',
        icon: 'mdi:battery-charging-high',
        label: 'set max soc',
      },
      DATA_CHARGE_PROGRAM: { command: 'charge_program_configure', icon: 'mdi:ev-station', label: 'set program' },
    },
    data: {
      selected_program: 0, // Store the selected value here
      program_options: {
        0: 'DEFAULT',
        2: 'HOME',
        3: 'WORK',
      },
      max_soc: { label: 'Max state of charge', value: 50 },
    },
  },

  sendRouteConfig: {
    service: {
      DATA_SEND_ROUTE: { command: 'send_route', icon: 'mdi:map-marker', label: 'send' },
    },
    data: {
      title: { label: 'Title', value: '', placeholder: 'Brandenburger Tor' },
      latitude: { label: 'Latitude', value: '', placeholder: '52.5163' },
      longitude: { label: 'Longitude', value: '', placeholder: '13.3777' },
      city: { label: 'City', value: '', placeholder: 'Berlin' },
      postcode: { label: 'Postcode', value: '', placeholder: '10117' },
      street: { label: 'Street', value: '', placeholder: 'Pariser Platz' },
    },
  },

  sunroofConfigData: {
    service: {
      OPEN: { command: 'sunroof_open', icon: 'mdi:window-open', label: 'Open' },
      CLOSE: { command: 'sunroof_close', icon: 'mdi:window-close', label: 'Close' },
      TILT: { command: 'sunroof_tilt', icon: 'mdi:window-shutter', label: 'Tilt' },
    },
  },
};
