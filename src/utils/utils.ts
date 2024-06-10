import { HomeAssistant } from 'custom-card-helpers';
import { SensorDevice, BinarySensorDevice } from '../types';

/**
 *
 * @param hass
 * @param config
 * @param filters
 * @returns
 */
export async function getDeviceEntities(
  hass: HomeAssistant,
  config: { entity?: string },
  filters: {
    [key: string]: { prefix?: string; suffix: string };
  },
): Promise<{ [key: string]: SensorDevice | BinarySensorDevice }> {
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
  const entityIds: { [key: string]: SensorDevice | BinarySensorDevice } = {};

  for (const entityName of Object.keys(filters)) {
    const { prefix, suffix } = filters[entityName];
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
