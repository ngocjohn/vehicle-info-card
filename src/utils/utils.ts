import { HomeAssistant } from 'custom-card-helpers';
import { VehicleEntity } from '../types';
import { combinedFilters } from '../types';

/**
 *
 * @param car
 * @returns
 */

export async function getVehicleEntities(
  hass: HomeAssistant,
  config: { entity?: string },
): Promise<{ [key: string]: VehicleEntity }> {
  const allEntities = await hass.callWS<
    { entity_id: string; device_id: string; original_name: string; unique_id: string }[]
  >({
    type: 'config/entity_registry/list',
  });

  const carEntity = allEntities.find((e) => e.entity_id === config.entity);
  if (!carEntity) {
    return {};
  }

  const deviceEntities = allEntities.filter((e) => e.device_id === carEntity.device_id);
  const entityIds: { [key: string]: VehicleEntity } = {};

  for (const entityName of Object.keys(combinedFilters)) {
    const { prefix, suffix } = combinedFilters[entityName];
    if (!prefix) {
      const entity = deviceEntities.find((e) => e.unique_id.endsWith(suffix));
      if (entity) {
        entityIds[entityName] = {
          entity_id: entity.entity_id,
          original_name: entity.original_name,
          device_id: entity.device_id,
        };
      }
    } else {
      const entity = deviceEntities.find((e) => e.entity_id.startsWith(prefix) && e.entity_id.endsWith(suffix));
      if (entity) {
        entityIds[entityName] = {
          entity_id: entity.entity_id,
          original_name: entity.original_name,
          device_id: entity.device_id,
        };
      }
    }
  }
  return entityIds;
}
