import { version, repository } from '../../package.json';

export const CARD_VERSION = `v${version}`;
export const CARD_UPADE_SENSOR = 'update.vehicle_info_card_update';
export const REPOSITORY = repository.repo;
export const PREFIX_NAME = 'vehicle-info';

export const VEHICLE_INFO_CARD_NAME = `${PREFIX_NAME}-card`;
export const VEHICLE_INFO_CARD_EDITOR_NAME = `${VEHICLE_INFO_CARD_NAME}-editor`;

export const VEHICLE_INFO_CARD_NEW_NAME = `${PREFIX_NAME}-vehicle-card`;
export const VEHICLE_INFO_CARD_NEW_EDITOR_NAME = `${VEHICLE_INFO_CARD_NEW_NAME}-editor`;

export const EXTRA_MAP_CARD_URL = 'https://cdn.jsdelivr.net/npm/extra-map-card/dist/extra-map-card-bundle.min.js';

export const PREVIEW_CONFIG_TYPES = ['btn_preview', 'card_preview', 'tire_preview'];
