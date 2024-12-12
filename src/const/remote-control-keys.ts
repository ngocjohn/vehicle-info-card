import { localize } from '../localize/localize';

const transLabel = (key: string, lang: string) => localize(`card.serviceData.${key}`, lang);

const createItem = (nameKey: string, icon: string, lang: string) => ({
  name: localize(`card.servicesCtrl.${nameKey}`, lang),
  icon,
});

const createService = (command: string, icon: string, nameKey: string, lang: string) => ({
  command,
  icon,
  label: transLabel(nameKey, lang),
});

export const servicesCtrl = (lang: string) => ({
  auxheat: createItem('auxheat', 'mdi:radiator', lang),
  charge: createItem('charge', 'mdi:ev-station', lang),
  doorsLock: createItem('doorsLock', 'mdi:key-chain', lang),
  engine: createItem('engine', 'mdi:engine', lang),
  preheat: createItem('preheat', 'mdi:car-seat-heater', lang),
  sendRoute: createItem('sendRoute', 'mdi:map-marker-path', lang),
  sigPos: createItem('sigPos', 'mdi:bugle', lang),
  sunroof: createItem('sunroof', 'mdi:window-open', lang),
  windows: createItem('windows', 'mdi:car-door', lang),
});

const precondSeatConfig = (lang: string) => ({
  service: {
    START: createService('preheat_start', 'mdi:car-seat-heater', 'labelStart', lang),
    STOP: createService('preheat_stop', 'mdi:car-seat', 'labelStop', lang),
    DATA_SEAT_CONFIGURE: createService('preconditioning_configure_seats', 'mdi:car-seat', 'labelSeatConfig', lang),
    DATA_TEMP_CONFIGURE: createService('temperature_configure', 'mdi:thermometer', 'labelSetTempZone', lang),
  },
  data: {
    precondSeat: {
      front_left: { label: transLabel('labelWindowFrontLeft', lang), value: false },
      front_right: { label: transLabel('labelWindowFrontRight', lang), value: false },
      rear_left: { label: transLabel('labelWindowRearLeft', lang), value: false },
      rear_right: { label: transLabel('labelWindowRearRight', lang), value: false },
    },
    temperature: {
      front_left: { label: transLabel('labelWindowFrontLeft', lang) },
      front_right: { label: transLabel('labelWindowFrontRight', lang) },
      rear_left: { label: transLabel('labelWindowRearLeft', lang) },
      rear_right: { label: transLabel('labelWindowRearRight', lang) },
    },
  },
});

const sendRouteConfig = (lang: string) => ({
  service: {
    DATA_SEND_ROUTE: createService('send_route', 'mdi:map-marker', 'labelSend', lang),
  },
  data: {
    title: { label: transLabel('labelTitle', lang), value: '', placeholder: 'Brandenburger Tor' },
    latitude: { label: transLabel('labelLatitude', lang), value: '', placeholder: '52.5163' },
    longitude: { label: transLabel('labelLongitude', lang), value: '', placeholder: '13.3777' },
    city: { label: transLabel('labelCity', lang), value: '', placeholder: 'Berlin' },
    postcode: { label: transLabel('labelPostCode', lang), value: '', placeholder: '10117' },
    street: { label: transLabel('labelStreet', lang), value: '', placeholder: 'Pariser Platz' },
  },
});
const batteryChargeConfig = (lang: string) => ({
  service: {
    DATA_MAX_SOC_CONFIGURE: createService(
      'battery_max_soc_configure',
      'mdi:battery-charging-high',
      'labelSetMaxSoc',
      lang
    ),
    DATA_CHARGE_PROGRAM: createService('charge_program_configure', 'mdi:ev-station', 'labelSetProgram', lang),
  },
  data: {
    selected_program: 0, // Store the selected value here
    program_options: {
      0: 'DEFAULT',
      2: 'HOME',
      3: 'WORK',
    },
    max_soc: { label: transLabel('labelMaxStateOfCharge', lang), value: 50 },
    program_select: { label: transLabel('labelChargeProgram', lang) },
  },
});

const engineConfig = (lang: string) => ({
  service: {
    START: createService('engine_start', 'mdi:engine-start', 'labelStart', lang),
    STOP: createService('engine_stop', 'mdi:engine-off', 'labelStop', lang),
  },
});

const preheatConfig = (lang: string) => ({
  service: {
    DATA_START_DEP_TIME: createService('preheat_start_departure_time', 'mdi:cog', 'labelStartTime', lang),
    STOP_DEP_TIME: createService('preheat_stop_departure_time', 'mdi:cog', 'labelStopTime', lang),
  },
  data: {
    time: { label: transLabel('labelDepartureTime', lang), value: 0, hour: '00', minute: '00' },
    departure_time: { label: transLabel('labelDepartureTime', lang) },
  },
});

const windowsConfig = (lang: string) => ({
  service: {
    OPEN: createService('windows_open', 'mdi:arrow-down-bold', 'labelOpen', lang),
    CLOSE: createService('windows_close', 'mdi:arrow-up-bold', 'labelClose', lang),
    DATA_MOVE: createService('windows_move', 'mdi:swap-vertical-bold', 'labelMove', lang),
  },
  data: {
    positions: {
      front_left: { label: transLabel('labelWindowFrontLeft', lang), value: 0 },
      front_right: { label: transLabel('labelWindowFrontRight', lang), value: 0 },
      rear_left: { label: transLabel('labelWindowRearLeft', lang), value: 0 },
      rear_right: { label: transLabel('labelWindowRearRight', lang), value: 0 },
    },
  },
});

const auxheatConfig = (lang: string) => ({
  service: {
    START: createService('auxheat_start', 'mdi:radiator', 'labelStart', lang),
    STOP: createService('auxheat_stop', 'mdi:radiator-off', 'labelStop', lang),
    DATA_CONFIGURE: createService('auxheat_configure', 'mdi:cog', 'labelSave', lang),
  },
  data: {
    time_selection: '0',
    time_selection_options: {
      '0': transLabel('labelNoSelection', lang),
      '1': transLabel('labelTime1', lang),
      '2': transLabel('labelTime2', lang),
      '3': transLabel('labelTime3', lang),
    },
    items: {
      time_1: { label: transLabel('labelTime1', lang), value: 0, hour: '00', minute: '00' },
      time_2: { label: transLabel('labelTime2', lang), value: 0, hour: '00', minute: '00' },
      time_3: { label: transLabel('labelTime3', lang), value: 0, hour: '00', minute: '00' },
    },
    selection_time: { label: transLabel('labelTimeSelection', lang) },
  },
});

const sunroofConfigData = (lang: string) => ({
  service: {
    OPEN: createService('sunroof_open', 'mdi:window-open', 'labelOpen', lang),
    CLOSE: createService('sunroof_close', 'mdi:window-closed', 'labelClose', lang),
    TILT: createService('sunroof_tilt', 'mdi:window-shutter', 'labelTilt', lang),
  },
});

export const ControlServiceData = (lang: string) => ({
  auxheatConfig: auxheatConfig(lang),
  batteryChargeConfig: batteryChargeConfig(lang),
  engineConfig: engineConfig(lang),
  precondSeatConfig: precondSeatConfig(lang),
  preheatConfig: preheatConfig(lang),
  sendRouteConfig: sendRouteConfig(lang),
  sunroofConfigData: sunroofConfigData(lang),
  windowsConfig: windowsConfig(lang),
});

export const tempSelectOptions = [
  { value: '0', label: 'Low' },
  { value: '16', label: '16°C' },
  { value: '16.5', label: '16.5°C' },
  { value: '17', label: '17°C' },
  { value: '17.5', label: '17.5°C' },
  { value: '18', label: '18°C' },
  { value: '18.5', label: '18.5°C' },
  { value: '19', label: '19°C' },
  { value: '19.5', label: '19.5°C' },
  { value: '20', label: '20°C' },
  { value: '20.5', label: '20.5°C' },
  { value: '21', label: '21°C' },
  { value: '21.5', label: '21.5°C' },
  { value: '22', label: '22°C' },
  { value: '22.5', label: '22.5°C' },
  { value: '23', label: '23°C' },
  { value: '23.5', label: '23.5°C' },
  { value: '24', label: '24°C' },
  { value: '24.5', label: '24.5°C' },
  { value: '25', label: '25°C' },
  { value: '25.5', label: '25.5°C' },
  { value: '26', label: '26°C' },
  { value: '26.5', label: '26.5°C' },
  { value: '27', label: '27°C' },
  { value: '27.5', label: '27.5°C' },
  { value: '28', label: '28°C' },
  { value: '28.5', label: '28.5°C' },
  { value: '30', label: 'High' },
];
