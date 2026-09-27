import memoizeOne from 'memoize-one';
import { EntityRegistryDisplayEntry, fetchEntityRegistry, HomeAssistant } from 'types';
import { ServicesItem } from 'types/card-config/services-config';

import { EntityMatcher, resolveByMatcher } from './car-device-entities';

type Matchable = {
  entity_id: string;
  unique_id?: string;
  original_name?: string;
  translation_key?: string;
};

/**
 * A remote-control action is offered only when the car actually exposes the
 * hardware behind it.
 *
 * `mbapi2020` creates entities conditionally, gated on the vehicle's reported
 * capabilities, so the presence of an entity is a direct, honest signal. A
 * service is considered available when ANY of its probes resolves, which lets a
 * capability be recognised through more than one entity the integration may
 * expose (for example aux heat appearing as either a status sensor or a switch).
 *
 * `sendRoute` has no probe on purpose: it only hands a destination to the
 * Mercedes backend and needs no vehicle hardware, so it stays available even
 * when every other control is filtered out.
 */
const SERVICE_CAPABILITY_PROBES: Record<ServicesItem, EntityMatcher[]> = {
  auxheat: [
    { domain: 'sensor', translationKey: 'auxheatstatus' },
    { domain: 'switch', translationKey: 'auxheat' },
  ],
  charge: [
    { domain: 'sensor', translationKey: 'soc' },
    { domain: 'sensor', translationKey: 'max_soc' },
    { domain: 'sensor', translationKey: 'rangeelectrickm' },
  ],
  doorsLock: [{ domain: 'lock', translationKey: 'lock' }],
  engine: [
    { domain: 'binary_sensor', translationKey: 'enginestate' },
    { domain: 'sensor', translationKey: 'enginestate' },
  ],
  preheat: [
    { domain: 'binary_sensor', translationKey: 'preclimatestatus' },
    { domain: 'sensor', translationKey: 'preclimatestatus' },
    { domain: 'switch', translationKey: 'precond' },
  ],
  sendRoute: [],
  sigPos: [{ domain: 'button', translationKey: 'btn_sigpos_start_now' }],
  sunroof: [
    { domain: 'sensor', translationKey: 'sunroofstatus' },
    { domain: 'binary_sensor', translationKey: 'sunroofstatus' },
  ],
  windows: [
    { domain: 'cover', translationKey: 'windows' },
    { domain: 'binary_sensor', translationKey: 'windowstatusoverall' },
  ],
};

/**
 * Services this car can actually perform. Pure and synchronous so it can be
 * unit-tested and reused by both the modern and legacy card paths.
 */
export function findAvailableServices(deviceEntities: readonly Matchable[]): ServicesItem[] {
  return (Object.keys(SERVICE_CAPABILITY_PROBES) as ServicesItem[]).filter((service) => {
    const probes = SERVICE_CAPABILITY_PROBES[service];
    // No probes => capability-free action, always offered.
    return probes.length === 0 || probes.some((probe) => !!resolveByMatcher(probe, deviceEntities));
  });
}

/**
 * Same as {@link findAvailableServices} but resolved from the live registry,
 * scoped to the device that owns the configured car entity. Memoized, and it
 * resolves to every service on failure so a transient registry error degrades
 * to today's behaviour rather than hiding the whole control panel.
 */
export const getAvailableServices = memoizeOne(
  async (entry: EntityRegistryDisplayEntry | undefined, hass: HomeAssistant): Promise<ServicesItem[]> => {
    const deviceId = entry?.device_id;
    if (!deviceId) {
      return Object.keys(SERVICE_CAPABILITY_PROBES) as ServicesItem[];
    }
    try {
      const deviceEntities = (await fetchEntityRegistry(hass.connection)).filter(
        (e) => e.device_id === deviceId && !e.hidden_by && !e.disabled_by
      );
      return findAvailableServices(deviceEntities);
    } catch (err) {
      console.warn('vehicle-info-card: could not determine service capabilities, showing all', err);
      return Object.keys(SERVICE_CAPABILITY_PROBES) as ServicesItem[];
    }
  }
);
