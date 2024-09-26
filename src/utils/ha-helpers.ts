const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
import { LovelaceCardConfig } from 'custom-card-helpers';
import { PropertyValues } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { VehicleEntities, VehicleEntity, VehicleCardConfig } from '../types';
import { combinedFilters } from '../const/const';
import { fetchLatestReleaseTag } from './loader';
/**
 *
 * @param car
 * @returns
 */

export async function getVehicleEntities(
  hass: HomeAssistant,
  config: { entity?: string },
  component: any
): Promise<VehicleEntities | void> {
  if (!config.entity) {
    console.log('Entity not provided', component._entityNotFound);
    return;
  }
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

export async function getModelName(hass: HomeAssistant, entityCar: string): Promise<string> {
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
 * Additional card listeners
 * @param cardElement
 * @param toggleCard
 */

export function setupCardListeners(
  cardElement: Element | null,
  toggleCard: (direction: 'next' | 'prev') => void
): void {
  if (!cardElement) return;
  // Variables to store touch/mouse coordinates
  let xDown: number | null = null;
  let yDown: number | null = null;
  let xDiff: number | null = null;
  let yDiff: number | null = null;
  let isSwiping = false;

  const presDown = (e: TouchEvent | MouseEvent) => {
    e.stopImmediatePropagation();
    if (e instanceof TouchEvent) {
      xDown = e.touches[0].clientX;
      yDown = e.touches[0].clientY;
    } else if (e instanceof MouseEvent) {
      xDown = e.clientX;
      yDown = e.clientY;
    }

    ['touchmove', 'mousemove'].forEach((event) => {
      cardElement.addEventListener(event, pressMove as EventListener);
    });

    ['touchend', 'mouseup'].forEach((event) => {
      cardElement.addEventListener(event, pressRelease as EventListener);
    });
  };

  const pressMove = (e: TouchEvent | MouseEvent) => {
    if (xDown === null || yDown === null) return;

    if (e instanceof TouchEvent) {
      xDiff = xDown - e.touches[0].clientX;
      yDiff = yDown - e.touches[0].clientY;
    } else if (e instanceof MouseEvent) {
      xDiff = xDown - e.clientX;
      yDiff = yDown - e.clientY;
    }

    if (xDiff !== null && yDiff !== null) {
      if (Math.abs(xDiff) > 1 && Math.abs(yDiff) > 1) {
        isSwiping = true;
      }
    }
  };

  const pressRelease = (e: TouchEvent | MouseEvent) => {
    e.stopImmediatePropagation();

    ['touchmove', 'mousemove'].forEach((event) => {
      cardElement.removeEventListener(event, pressMove as EventListener);
    });

    ['touchend', 'mouseup'].forEach((event) => {
      cardElement.removeEventListener(event, pressRelease as EventListener);
    });

    const cardWidth = cardElement.clientWidth;

    if (isSwiping && xDiff !== null && yDiff !== null) {
      if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > cardWidth / 3) {
        if (xDiff > 0) {
          // Next card - swipe left
          cardElement.classList.add('swiping-left');
          setTimeout(() => {
            toggleCard('next');
            cardElement.classList.remove('swiping-left');
          }, 300);
        } else {
          // Previous card - swipe right
          cardElement.classList.add('swiping-right');
          setTimeout(() => {
            toggleCard('prev');
            cardElement.classList.remove('swiping-right');
          }, 300);
        }
      }
      xDiff = yDiff = xDown = yDown = null;
      isSwiping = false;
    }
  };

  // Attach the initial pressDown listeners
  ['touchstart', 'mousedown'].forEach((event) => {
    cardElement.addEventListener(event, presDown as EventListener, { passive: true });
  });
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

export async function getTemplateValue(hass: HomeAssistant, templateConfig: string): Promise<string> {
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

export async function getBooleanTemplate(hass: HomeAssistant, templateConfig: string): Promise<boolean> {
  if (!hass || !templateConfig) {
    return true;
  }

  try {
    // Prepare the body with the template
    const result = await hass.callApi<string>('POST', 'template', { template: templateConfig });
    if (result.trim().toLowerCase() === 'true') {
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Error evaluating template: ${error}`);
  }
}
export async function handleFirstUpdated(
  component: any, // Replace 'any' with the correct type for your component if available
  _changedProperties: PropertyValues
): Promise<void> {
  fetchLatestReleaseTag().then((latestRelease) => {
    component._latestRelease = latestRelease;
  });

  const updates: Partial<VehicleCardConfig> = {};

  if (!component._config.entity || component._config.entity === '') {
    console.log('Entity not found, fetching...');
    updates.entity = getCarEntity(component.hass as HomeAssistant);
  }

  // After setting the entity, fetch the model name
  if (updates.entity || !component._config.model_name) {
    const entity = updates.entity || component._config.entity;
    updates.model_name = await getModelName(component.hass as HomeAssistant, entity);
  }

  if (!component._config.selected_language) {
    updates.selected_language = component.hass.language;
    console.log('Selected language:', updates.selected_language);
  }

  if (Object.keys(updates).length > 0) {
    console.log('Updating config with:', updates);
    component._config = { ...component._config, ...updates };
    console.log('New config:', component._config);
    component.configChanged();
  }
}

export async function handleCardFirstUpdated(
  component: any, // Replace 'any' with the correct type for your component if available
  _changedProperties: PropertyValues
): Promise<void> {
  component.vehicleEntities = await getVehicleEntities(component._hass as HomeAssistant, component.config, component);
  if (!component.vehicleEntities) {
    console.log('No vehicle entities found');
    component._entityNotFound = true;
  }

  if (!component.config.selected_language || component.config.selected_language === 'system') {
    component.selectedLanguage = component._hass.language;
  } else {
    component.selectedLanguage = component.config.selected_language;
  }
}

// Default configuration for the Vehicle Card.

export const defaultConfig: Partial<VehicleCardConfig> = {
  type: 'custom:vehicle-info-card',
  name: 'Mercedes Vehicle Card',
  entity: '',
  model_name: '',
  selected_language: 'system',
  show_slides: false,
  show_map: false,
  show_buttons: true,
  show_background: true,
  enable_map_popup: false,
  enable_services_control: false,
  show_error_notify: false,
  device_tracker: '',
  map_popup_config: {
    hours_to_show: 0,
    default_zoom: 14,
    theme_mode: 'auto',
  },
  selected_theme: {
    theme: 'default',
    mode: 'auto',
  },
  extra_configs: {
    tire_background: '',
  },
  button_grid: {
    use_swiper: false,
    rows_size: 2,
  },
  services: {
    auxheat: false,
    charge: false,
    doorsLock: false,
    engine: false,
    preheat: false,
    sendRoute: false,
    sigPos: false,
    sunroof: false,
    windows: false,
  },
  eco_button: {
    enabled: false,
  },
  trip_button: {
    enabled: false,
  },
  vehicle_button: {
    enabled: false,
  },
  tyre_button: {
    enabled: false,
  },
  use_custom_cards: {
    vehicle_card: true,
    trip_card: true,
    eco_card: true,
    tyre_card: true,
  },
};

export function deepMerge(target: any, source: any): any {
  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] === null) {
      // If the source value is null, use the target's value
      output[key] = target[key];
    } else if (source[key] instanceof Object && key in target) {
      // If the value is an object and exists in the target, merge deeply
      output[key] = deepMerge(target[key], source[key]);
    } else {
      // Otherwise, use the source's value
      output[key] = source[key];
    }
  }

  return output;
}
