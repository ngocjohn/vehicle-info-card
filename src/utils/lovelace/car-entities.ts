// helper functions
import { CarEntity, EntityRegistryDisplayEntry, fetchEntityRegistry } from 'types';
import { HomeAssistant } from 'types';
import { CarEntities } from 'types';

import { combinedFilters } from '../../data/car-device-entities';

export async function getCarEntities(entry: EntityRegistryDisplayEntry, hass: HomeAssistant): Promise<CarEntities> {
  const deviceId = entry.device_id;
  if (!deviceId) {
    return {};
  }

  const deviceEntities = await fetchEntityRegistry(hass.connection).then((entries) =>
    entries.filter((e) => e.device_id === deviceId && !e.hidden_by && !e.disabled_by)
  );
  // console.log('%cCAR-ENTITIES:', 'color: #bada55;', combinedFilters);

  const entities: CarEntities = {};
  for (const [key, val] of Object.entries(combinedFilters)) {
    const { prefix, suffix } = val;
    const matchesEntity = deviceEntities.find((e) => {
      if (['soc', 'maxSoc'].includes(key)) {
        const origName = key === 'soc' ? 'State of Charge' : 'Max State of Charge';
        return e.original_name === origName;
      } else if (prefix) {
        return e.entity_id.startsWith(prefix) && e.entity_id.endsWith(suffix);
      } else {
        return e.unique_id?.endsWith(suffix) || e.entity_id.endsWith(suffix);
      }
    });

    if (matchesEntity) {
      const entityStateObj = hass.states[matchesEntity.entity_id];
      const icon = entityStateObj?.attributes?.icon || undefined;
      const unit = entityStateObj?.attributes?.unit_of_measurement || undefined;
      entities[key] = {
        entity_id: matchesEntity.entity_id,
        original_name: matchesEntity.original_name,
        icon,
        unit,
      } as CarEntity;
    }
  }

  // console.log(Object.keys(entities).length, entities);
  return entities;
}
