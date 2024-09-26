const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
import { LovelaceCardConfig } from 'custom-card-helpers';
import { PropertyValues } from 'lit';
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleEntities,
  VehicleEntity,
  VehicleCardConfig,
  BaseButtonConfig,
  CustomButtonEntity,
} from '../types';
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

  const customButton: CustomButtonEntity = {
    enabled: true,
    hide: false,
    primary: button.primary,
    secondary: stateValue,
    icon: button.icon || '',
    notify,
    button_type: button.button_type || 'default',
    button_action: button.button_action,
    entity: button.entity || '',
    attribute: button.attribute || '',
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

export function deepMerge(target: any, source: VehicleCardConfig): VehicleCardConfig {
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
