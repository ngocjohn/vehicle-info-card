const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

import { combinedFilters, CARD_UPADE_SENSOR, CARD_VERSION, REPOSITORY } from '../const/const';
import { baseDataKeys } from '../const/data-keys';
import { VehicleCardEditor } from '../editor';
import {
  HomeAssistant,
  VehicleEntities,
  VehicleEntity,
  VehicleCardConfig,
  BaseButtonConfig,
  CustomButtonEntity,
  CardTypeConfig,
  ButtonCardEntity,
  AddedCards,
  MapData,
  SECTION,
  defaultConfig,
  Address,
} from '../types';
import { LovelaceCardConfig } from '../types/ha-frontend/lovelace/lovelace';
import { VehicleCard } from '../vehicle-info-card';

/**
 *
 * @param car
 * @returns
 */

async function getVehicleEntities(
  hass: HomeAssistant,
  config: { entity: string },
  component: VehicleCard
): Promise<VehicleEntities> {
  const entityState = hass.states[config.entity];
  if (!entityState) {
    component._entityNotFound = true;
    console.log('Entity not found', component._entityNotFound);
  }

  const allEntities = await hass.callWS<Required<VehicleEntity>[]>({
    type: 'config/entity_registry/list',
  });
  const carEntity = allEntities.find((e) => e.entity_id === config.entity);
  if (!carEntity) {
    console.log('Car entity not found');
    return {};
  }

  const deviceEntities = allEntities
    .filter((e) => e.device_id === carEntity.device_id && e.hidden_by === null && e.disabled_by === null)
    .filter((e) => hass.states[e.entity_id] && !['unavailable', 'unknown'].includes(hass.states[e.entity_id].state));

  const entityIds: VehicleEntities = {};

  for (const entityName of Object.keys(combinedFilters)) {
    const { prefix, suffix } = combinedFilters[entityName];

    if (entityName === 'soc' || entityName === 'maxSoc') {
      const specialName = entityName === 'soc' ? 'State of Charge' : 'Max State of Charge';
      const entity = deviceEntities.find((e) => e.original_name === specialName);
      if (entity) {
        entityIds[entityName] = {
          entity_id: entity.entity_id,
          original_name: entity.original_name,
        };
      }
      continue;
    }

    const entity = deviceEntities.find((e) => {
      if (prefix) {
        return e.entity_id.startsWith(prefix) && e.entity_id.endsWith(suffix);
      }
      return e.unique_id.endsWith(suffix) || e.entity_id.endsWith(suffix);
    });

    if (entity) {
      entityIds[entityName] = {
        entity_id: entity.entity_id,
        original_name: entity.original_name,
      };
    }
  }
  return entityIds;
}

async function getModelName(hass: HomeAssistant, entityCar: string): Promise<string> {
  // Fetch all entities
  const allEntities = await hass.callWS<{ entity_id: string; device_id: string }[]>({
    type: 'config/entity_registry/list',
  });
  // Find the car entity
  const carEntity = allEntities.find((entity) => entity.entity_id === entityCar);
  if (!carEntity) return '';
  console.log('Car Entity:', carEntity);
  const deviceId = carEntity.device_id;
  if (!deviceId) return '';

  // Fetch all devices
  const allDevices = await hass.callWS<{ id: string; name: string; model: string }[]>({
    type: 'config/device_registry/list',
  });
  // Find the device by ID
  const device = allDevices.find((device) => device.id === deviceId);
  if (!device) return '';
  console.log('Device:', device);
  return device.model || '';
}

/**
 * Update config with changed properties
 * @param config
 * @param changedProps
 **/

export function getCarEntity(hass: HomeAssistant): string {
  console.log('Getting car entity');
  const entities = Object.keys(hass.states).filter((entity) => entity.startsWith('sensor.') && entity.endsWith('_car'));
  return entities[0] || '';
}

export async function createCustomButtons(
  hass: HomeAssistant,
  button: BaseButtonConfig
): Promise<CustomButtonEntity | void> {
  if (!button) {
    return;
  }

  const stateValue = button.secondary
    ? await getTemplateValue(hass, button.secondary)
    : button.attribute && button.entity
    ? hass.formatEntityAttributeValue(hass.states[button.entity], button.attribute)
    : button.entity
    ? hass.formatEntityState(hass.states[button.entity])
    : '';

  const notify = button.notify ? await getBooleanTemplate(hass, button.notify) : false;
  const icon = button.icon_template ? await getTemplateValue(hass, button.icon_template) : button.icon || '';
  const color = button.color_template ? await getTemplateValue(hass, button.color_template) : '';
  const customButton: CustomButtonEntity = {
    enabled: true,
    hide: false,
    primary: button.primary,
    secondary: stateValue,
    icon,
    notify,
    button_type: button.button_type || 'default',
    button_action: button.button_action,
    entity: button.entity || '',
    attribute: button.attribute || '',
    color,
  };

  return customButton;
}

export async function createCardElement(
  hass: HomeAssistant,
  cards: LovelaceCardConfig[]
): Promise<LovelaceCardConfig[]> {
  if (!cards) {
    return [];
  }

  // Load the helpers and ensure they are available
  let helpers;

  if ((window as any).loadCardHelpers) {
    helpers = await (window as any).loadCardHelpers();
  } else if (HELPERS) {
    helpers = HELPERS;
  }

  // Check if helpers were loaded and if createCardElement exists
  if (!helpers || !helpers.createCardElement) {
    console.error('Card helpers or createCardElement not available.');
    return [];
  }

  const cardElements = await Promise.all(
    cards.map(async (card) => {
      try {
        const element = await helpers.createCardElement(card);
        element.hass = hass;
        return element;
      } catch (error) {
        console.error('Error creating card element:', error);
        return null;
      }
    })
  );
  return cardElements;
}

async function getTemplateValue(hass: HomeAssistant, templateConfig: string): Promise<string> {
  if (!hass || !templateConfig) {
    return '';
  }

  try {
    // Prepare the body with the template
    const result = await hass.callApi<string>('POST', 'template', { template: templateConfig });
    return result;
  } catch (error) {
    throw new Error(`Error evaluating template: ${error}`);
  }
}

async function getBooleanTemplate(hass: HomeAssistant, templateConfig: string): Promise<boolean> {
  if (!hass || !templateConfig) {
    return false;
  }

  try {
    // Prepare the body with the template
    const result = await hass.callApi<string>('POST', 'template', { template: templateConfig });
    if (result.trim().toLowerCase() === 'true') {
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error evaluating template: ${error}`);
    return false;
  }
}

export async function getDefaultButton(
  hass: HomeAssistant,
  config: VehicleCardConfig,
  baseCard: CardTypeConfig
): Promise<ButtonCardEntity> {
  const button = config[baseCard.button];
  const useCustom = config.use_custom_cards?.[baseCard.config] || false;
  const customCard = config[baseCard.config] !== undefined;

  const buttonCard = {
    key: baseCard.type,
    default_name: baseCard.name,
    default_icon: baseCard.icon,
    button: {
      hidden: button?.hide || false,
      button_action: button?.button_action || {},
      entity: button?.entity || '',
      icon: button?.icon || '',
      primary: button?.primary || '',
      secondary: button?.secondary || '',
      attribute: button?.attribute || '',
      notify: button?.notify || '',
      icon_template: button?.icon_template || '',
      color_template: button?.color_template || '',
      picture_template: button?.picture_template || '',
    },
    button_type: button?.button_type || 'default',
    card_type: useCustom ? ('custom' as const) : ('default' as const),
    custom_button: button?.enabled || false,
    custom_card: customCard ? await createCardElement(hass, config[baseCard.config]) : [],
  };
  return buttonCard;
}

export async function getAddedButton(
  hass: HomeAssistant,
  addedCard: AddedCards[keyof AddedCards],
  key: string
): Promise<ButtonCardEntity> {
  const button = addedCard.button;
  const customCard = addedCard.cards && addedCard.cards.length > 0;

  const buttonCard = {
    key: key,
    custom_button: button.enabled ?? false,
    button: {
      hidden: button.hide ?? false,
      button_action: button?.button_action || {},
      entity: button.entity || '',
      icon: button.icon || '',
      primary: button.primary || '',
      secondary: button.secondary || '',
      attribute: button.attribute || '',
      notify: button.notify || '',
      icon_template: button.icon_template || '',
      color_template: button.color_template || '',
      picture_template: button.picture_template || '',
    },
    button_type: button.button_type || 'default',
    card_type: 'custom' as const,
    custom_card: customCard ? await createCardElement(hass, addedCard.cards) : [],
  };
  return buttonCard;
}

export async function handleFirstUpdated(editor: VehicleCardEditor): Promise<void> {
  if (!editor._latestRelease.version) {
    console.log('Fetching latest release');

    // Use Promise.all to run both async operations in parallel
    const [latestVersion, installed] = await Promise.all([
      fetchLatestReleaseTag(),
      installedByHACS(editor.hass as HomeAssistant),
    ]);

    // Update component data after both promises resolve
    editor._latestRelease.version = latestVersion;
    editor._latestRelease.hacs = !!installed;
    editor._latestRelease.updated = latestVersion === CARD_VERSION;
  } else {
    console.log('Latest release already fetched');
  }

  const updates: Partial<VehicleCardConfig> = {};

  if (!editor._config?.entity || editor._config.entity === '') {
    console.log('Entity not found, fetching...');
    updates.entity = getCarEntity(editor.hass as HomeAssistant);
  }

  // After setting the entity, fetch the model name
  if (updates.entity || !editor._config.model_name) {
    const entity = updates.entity || editor._config.entity;
    updates.model_name = await getModelName(editor.hass as HomeAssistant, entity);
  }

  if (!editor._config.selected_language) {
    updates.selected_language = editor.hass.language;
    console.log('Selected language:', updates.selected_language);
  }
  let extraConfig = { ...(editor._config.extra_configs || {}) };
  if (editor._config.extra_configs?.section_order === undefined) {
    console.log('Section order not found, creating default...');
    const section = {
      show_header_info: SECTION.HEADER_INFO,
      show_slides: SECTION.IMAGES_SLIDER,
      show_map: SECTION.MINI_MAP,
      show_buttons: SECTION.BUTTONS,
    };

    let sectionOrder: string[] = [];
    for (const sectionKey in section) {
      if (editor._config[sectionKey] === undefined || editor._config[sectionKey] === true) {
        sectionOrder.push(section[sectionKey]);
      }
    }

    extraConfig.section_order = sectionOrder;
    updates.extra_configs = extraConfig;

    console.log('Section order:', updates.extra_configs?.section_order);
  }
  if (editor._config?.extra_configs?.images_swipe === undefined) {
    console.log('Images swipe not found, creating default...');
    const defaultImageSwipe = defaultConfig.extra_configs.images_swipe;
    extraConfig.images_swipe = defaultImageSwipe;
    updates.extra_configs = extraConfig;
    console.log('Images swipe:', updates.extra_configs?.images_swipe);
  }

  if (Object.keys(updates).length > 0) {
    console.log('Updating config with:', updates);
    editor._config = { ...editor._config, ...updates };
    console.log('New config:', editor._config);
    editor.configChanged();
  }
}

async function installedByHACS(hass: HomeAssistant): Promise<boolean> {
  const hacs = hass?.config?.components?.includes('hacs');
  if (!hacs) return false;
  const hacsEntities = await hass.callWS<{ entity_id: string }[]>({
    type: 'config/entity_registry/list',
  });

  const hacsEntity = hacsEntities.find((entity) => entity.entity_id === CARD_UPADE_SENSOR);
  return !!hacsEntity;
}
/* eslint-disable-next-line */
async function getMapData(
  hass: HomeAssistant,
  deviceTracker: string,
  apiKey: string,
  showAddres: boolean
): Promise<MapData> {
  const deviceStateObj = hass.states[deviceTracker];
  if (!deviceStateObj) {
    return { lat: 0, lon: 0, address: {} };
  }
  const { latitude, longitude } = deviceStateObj.attributes;
  if (showAddres) {
    const address = apiKey
      ? await getAddressFromGoggle(latitude, longitude, apiKey)
      : await getAddressFromOpenStreet(latitude, longitude);
    // console.log(`Address for device tracker '${deviceTracker}':`, address);
    if (!address) {
      console.log('Address not found.');
      return { lat: latitude, lon: longitude, address: {} };
    }
    // console.log('Map data:', { lat: latitude, lon: longitude, address });
    return { lat: latitude, lon: longitude, address };
  } else {
    // console.log('Map data:', { lat: latitude, lon: longitude });
    console.log('map address is disabled');
    return { lat: latitude, lon: longitude, address: {} };
  }
}

export async function createMapPopup(hass: HomeAssistant, config: VehicleCardConfig): Promise<LovelaceCardConfig[]> {
  const { default_zoom, hours_to_show, theme_mode } = config.map_popup_config || {};
  const haMapConfig = [
    {
      type: 'map',
      default_zoom: default_zoom || 14,
      hours_to_show: hours_to_show,
      theme_mode: theme_mode,
      entities: [
        {
          entity: config.device_tracker,
        },
      ],
    },
  ];

  return await createCardElement(hass, haMapConfig);
}

export async function handleCardFirstUpdated(component: VehicleCard): Promise<void> {
  const hass = component._hass as HomeAssistant;
  const config = component.config as VehicleCardConfig;
  const card = component as VehicleCard;
  card.vehicleEntities = await getVehicleEntities(hass, config, component);
  card.DataKeys = baseDataKeys(card.userLang);
  if (!card.vehicleEntities) {
    console.log('Vehicle entities not found, fetching...');
    console.log('No vehicle entities found');
    card._entityNotFound = true;
  }

  _getMapDat(card);
}

export async function _getMapDat(card: VehicleCard): Promise<void> {
  console.log('Getting map data...');
  const config = card.config as VehicleCardConfig;
  if (!config.show_map || !config.device_tracker || card._currentPreviewType !== null) return;

  // console.log('Fetching map data...');
  const hass = card._hass as HomeAssistant;
  const deviceTracker = config.device_tracker;
  const mapData = {} as MapData;
  const deviceStateObj = hass.states[deviceTracker];
  if (!deviceStateObj) return;
  const { latitude, longitude, entity_picture } = deviceStateObj.attributes;
  mapData.lat = latitude;
  mapData.lon = longitude;
  mapData.entityPic = entity_picture ?? undefined;
  card.MapData = mapData;
  // console.log('Map data:', mapData);
}

export async function _getMapAddress(card: VehicleCard, lat: number, lon: number) {
  if (card.config.extra_configs?.show_address === false) return;
  const apiKey = card.config?.google_api_key;
  // console.log('Getting address from map data');
  const adress = apiKey ? await getAddressFromGoggle(lat, lon, apiKey) : await getAddressFromOpenStreet(lat, lon);
  if (!adress) {
    return;
  }
  return adress;
}

async function getAddressFromGoggle(lat: number, lon: number, apiKey: string): Promise<Address | null> {
  // console.log('getAddressFromGoggle');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    // console.log('Google address data:', data);
    if (data.status !== 'OK') {
      throw new Error('No results found');
    }
    const addressComponents = data.results[0].address_components;
    let address: Partial<Address> = {};

    addressComponents.forEach((comp) => {
      if (comp.types.includes('street_number')) {
        address.streetNumber = comp.short_name;
      }
      if (comp.types.includes('route')) {
        address.streetName = comp.short_name;
      }
      if (comp.types.includes('neighborhood')) {
        address.sublocality = comp.short_name;
      }
      if (
        ['locality', 'administrative_area_level_2', 'administrative_area_level_1'].some((type) =>
          comp.types.includes(type)
        ) &&
        !address.city
      ) {
        address.city = comp.short_name;
      }
    });
    return address as Address;
  } catch (error) {
    console.warn('Failed to fetch address from Google:', error);
    return null;
  }
}

async function getAddressFromOpenStreet(lat: number, lon: number): Promise<Address | null> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`);

    if (!response.ok) {
      throw new Error('Failed to fetch address from OpenStreetMap');
    }

    const data = await response.json();
    const { house_number, road, suburb, village, city, town, neighbourhood } = data.address;
    // console.log('Address:', data.address);

    return {
      streetNumber: house_number || '',
      streetName: road || '',
      sublocality: neighbourhood || village || '',
      city: suburb || city || town || '',
    };
  } catch (error) {
    console.warn('Error fetching address:', error);
    return null;
  }
}

async function fetchLatestReleaseTag() {
  const apiUrl = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;

  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      const releaseTag = data.tag_name;
      return releaseTag;
    } else {
      console.error('Failed to fetch the latest release tag:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching the latest release tag:', error);
  }
}
