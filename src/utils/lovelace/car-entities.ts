import memoizeOne from 'memoize-one';
// helper functions
import { CarEntity, EntityRegistryDisplayEntry, fetchEntityRegistry } from 'types';
import { HomeAssistant } from 'types';
import { CarEntities } from 'types';

import { CarEntityKey, combinedFilters, findEntityForKey, findUnresolvedKeys } from '../../data/car-device-entities';

export const getCarEntities = memoizeOne(
  async (entry: EntityRegistryDisplayEntry, hass: HomeAssistant): Promise<CarEntities> => {
    const deviceId = entry.device_id;
    if (!deviceId) {
      return {};
    }

    const deviceEntities = await fetchEntityRegistry(hass.connection).then((entries) =>
      entries.filter((e) => e.device_id === deviceId && !e.hidden_by && !e.disabled_by)
    );
    // console.log('%cCAR-ENTITIES:', 'color: #bada55;', combinedFilters);

    const entities: CarEntities = {};
    for (const key of Object.keys(combinedFilters) as CarEntityKey[]) {
      const matchesEntity = findEntityForKey(key, deviceEntities);

      if (matchesEntity) {
        const entityStateObj = hass.states[matchesEntity.entity_id];
        const icon = entityStateObj?.attributes?.icon || undefined;
        const unit = entityStateObj?.attributes?.unit_of_measurement || undefined;
        entities[key] = {
          entity_id: matchesEntity.entity_id,
          original_name: matchesEntity.original_name ?? '',
          icon,
          unit,
        } as CarEntity;
      }
    }

    // Diagnostics. Absence is expected on most models, so a short list is not by
    // itself a fault - but silently returning one is indistinguishable from a
    // broken lookup, so report both halves once per resolution.
    const unresolved = findUnresolvedKeys(deviceEntities);
    const report = {
      resolved: Object.keys(entities).length,
      total: Object.keys(combinedFilters).length,
      // Capabilities this car genuinely does not report.
      unavailable: unresolved,
      entities,
    };
    // console.warn, not console.log: the production build runs terser with
    // drop_console: ['log', 'error'], so a log call would never reach the console.
    console.warn(
      `[vehicle-info-card] resolved ${report.resolved}/${report.total} car entities` +
        (unresolved.length ? `; not reported by this car: ${unresolved.join(', ')}` : ''),
    );
    window.VicCarEntities = report;

    // console.log(Object.keys(entities).length, entities);
    return entities;
  }
);
