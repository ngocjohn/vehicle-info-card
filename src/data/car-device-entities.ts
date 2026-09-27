export const CAR_ENTITY_KEYS = [
  'lock',
  'parkBrake',
  'liquidRangeCritical',
  'lowBrakeFluid',
  'lowWashWater',
  'lowCoolantLevel',
  'windowsClosed',
  'tirePressureWarning',
  'remoteStartActive',
  'engineState',
  'chargeFlapACStatus',
  'adBlueLevel',
  'averageSpeedReset',
  'averageSpeedStart',
  'chargeFlapDCStatus',
  'chargingPower',
  'distanceReset',
  'distanceStart',
  'distanceZEReset',
  'distanceZEStart',
  'ecoScoreAcceleration',
  'ecoScoreBonusRange',
  'ecoScoreConstant',
  'ecoScoreFreeWheel',
  'ecoScoreTotal',
  'electricConsumptionReset',
  'electricConsumptionStart',
  'fuelLevel',
  'ignitionState',
  'liquidConsumptionReset',
  'liquidConsumptionStart',
  'lockSensor',
  'maxSoc',
  'odometer',
  'precondStatus',
  'rangeElectric',
  'rangeLiquid',
  'soc',
  'starterBatteryState',
  'sunroofStatus',
  'tirePressureFrontLeft',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
] as const;

export type CarEntityKey = (typeof CAR_ENTITY_KEYS)[number];

/**
 * How a single `CarEntityKey` is located among a device's entities.
 *
 * `mbapi2020` publishes three independent identity signals. They are tried in
 * order of trustworthiness, and the first tier that yields a hit wins:
 *
 *  1. `translationKey` - the identity the integration *declares* for the entity
 *     (`MercedesMeEntity._attr_translation_key`). Stable across renames, not
 *     localizable, and the only signal that is a real contract rather than a
 *     by-product of string building.
 *  2. `suffix` - the legacy fallback, matching the tail of `unique_id`
 *     (`slugify("<vin>_<internal name>")`). Kept so the card still works against
 *     installs whose registry predates `translation_key`, and as insurance while
 *     mbapi2020 is mid-migration to `EntityDescription`.
 *  3. `originalNames` - the integration's English display name. A genuine last
 *     resort only; it is localizable, so it must never be the primary lookup.
 *
 * `domain` is an optional entity-domain constraint. It is required wherever two
 * keys share a `translationKey` - `lock` exists as both a `lock` platform entity
 * and a `sensor` - and it also stops the loose `_soc` suffix from matching
 * `max_soc`. It deliberately mirrors HA's `"<domain>."` entity_id prefix, which
 * is invariant under renaming.
 */
type EntityMatcher = {
  domain?: string;
  translationKey?: string;
  suffix?: string;
  originalNames?: string[];
};

export type { EntityMatcher };

type CarEntityFilter = {
  [key in CarEntityKey]?: EntityMatcher;
};
/**
 * Filters for binary sensors.
 */
const binarySensorsFilters = {
  lock: { domain: 'lock', translationKey: 'lock', suffix: '_lock' },
  parkBrake: { translationKey: 'parkbrakestatus', suffix: '_parkbrakestatus' },
  liquidRangeCritical: { translationKey: 'liquidrangecritical', suffix: '_liquidrangecritical' },
  lowBrakeFluid: { translationKey: 'warningbrakefluid', suffix: '_warningbrakefluid' },
  lowWashWater: { translationKey: 'warningwashwater', suffix: '_warningwashwater' },
  lowCoolantLevel: { translationKey: 'warningcoolantlevellow', suffix: '_warningcoolantlevellow' },
  windowsClosed: { translationKey: 'windowstatusoverall', suffix: '_windowstatusoverall' },
  tirePressureWarning: { translationKey: 'tirewarninglamp', suffix: '_tirewarninglamp' },
  remoteStartActive: { translationKey: 'remotestartactive', suffix: '_remotestartactive' },
  engineState: { translationKey: 'enginestate', suffix: '_enginestate' },
  chargeFlapACStatus: { translationKey: 'chargeflapacstatus', suffix: '_chargeflapacstatus' },
};


/**
 * Filters for sensor devices.
 */
const sensorDeviceFilters = {
  adBlueLevel: { translationKey: 'tankleveladblue', suffix: '_tankleveladblue' },
  averageSpeedReset: { translationKey: 'averagespeedreset', suffix: '_averagespeedreset' },
  averageSpeedStart: { translationKey: 'averagespeedstart', suffix: '_averagespeedstart' },
  chargeFlapDCStatus: { translationKey: 'chargeflapdcstatus', suffix: '_chargeflapdcstatus' },
  chargingPower: { translationKey: 'chargingpowerkw', suffix: '_chargingpowerkw' },
  distanceReset: { translationKey: 'distancereset', suffix: '_distancereset' },
  distanceStart: { translationKey: 'distancestart', suffix: '_distancestart' },
  distanceZEReset: { translationKey: 'distancezereset', suffix: '_distancezereset' },
  distanceZEStart: { translationKey: 'distancezestart', suffix: '_distancezestart' },
  ecoScoreAcceleration: { translationKey: 'ecoscoreaccel', suffix: '_ecoscoreaccel' },
  ecoScoreBonusRange: { translationKey: 'ecoscorebonusrange', suffix: '_ecoscorebonusrange' },
  ecoScoreConstant: { translationKey: 'ecoscoreconst', suffix: '_ecoscoreconst' },
  ecoScoreFreeWheel: { translationKey: 'ecoscorefreewhl', suffix: '_ecoscorefreewhl' },
  ecoScoreTotal: { translationKey: 'ecoscoretotal', suffix: '_ecoscoretotal' },
  electricConsumptionReset: { translationKey: 'electricconsumptionreset', suffix: '_electricconsumptionreset' },
  electricConsumptionStart: { translationKey: 'electricconsumptionstart', suffix: '_electricconsumptionstart' },
  fuelLevel: { translationKey: 'tanklevelpercent', suffix: '_tanklevelpercent' },
  ignitionState: { translationKey: 'ignitionstate', suffix: '_ignitionstate' },
  liquidConsumptionReset: { translationKey: 'liquidconsumptionreset', suffix: '_liquidconsumptionreset' },
  liquidConsumptionStart: { translationKey: 'liquidconsumptionstart', suffix: '_liquidconsumptionstart' },
  lockSensor: { domain: 'sensor', translationKey: 'lock', suffix: '_lock' },
  // `max_state_of_charge` was a guess that never existed upstream; the real
  // internal name is `max_soc`. Tiers 1 and 2 both key off `max_soc`, so the
  // stale suffix is dropped rather than left to mislead.
  maxSoc: { domain: 'sensor', translationKey: 'max_soc' },
  odometer: { translationKey: 'odometer', suffix: '_odometer' },
  precondStatus: { translationKey: 'preclimatestatus', suffix: '_preclimatestatus' },
  rangeElectric: { translationKey: 'rangeelectrickm', suffix: '_rangeelectrickm' },
  rangeLiquid: { translationKey: 'rangeliquid', suffix: '_rangeliquid' },
  soc: { domain: 'sensor', translationKey: 'soc', suffix: '_soc', originalNames: ['State of Charge'] },
  starterBatteryState: { translationKey: 'starterbatterystate', suffix: '_starterbatterystate' },
  sunroofStatus: { translationKey: 'sunroofstatus', suffix: '_sunroofstatus' },
  tirePressureFrontLeft: { translationKey: 'tirepressurefrontleft', suffix: '_tirepressurefrontleft' },
  tirePressureFrontRight: { translationKey: 'tirepressurefrontright', suffix: '_tirepressurefrontright' },
  tirePressureRearLeft: { translationKey: 'tirepressurerearleft', suffix: '_tirepressurerearleft' },
  tirePressureRearRight: { translationKey: 'tirepressurerearright', suffix: '_tirepressurerearright' },
};

export const combinedFilters = { ...binarySensorsFilters, ...sensorDeviceFilters } as CarEntityFilter;

/**
 * Minimal shape needed to match a registry entry against a filter.
 */
type MatchableEntity = {
  entity_id: string;
  unique_id?: string;
  original_name?: string;
  translation_key?: string;
};

/**
 * The tiered lookup itself, independent of `CarEntityKey`, so that capability
 * probes (which key off cover/switch/button entities) share exactly the same
 * resolution rules as the vehicle sensors.
 *
 * Each identity signal is tried in descending order of trustworthiness and the
 * first hit wins, so a key that resolves via `translation_key` never depends on
 * `unique_id` formatting. Returns `undefined` when the car simply does not have
 * that capability - absence is normal, since mbapi2020 only creates the entities
 * a vehicle actually reports.
 */
export function resolveByMatcher<T extends MatchableEntity>(
  matcher: EntityMatcher | undefined,
  deviceEntities: readonly T[]
): T | undefined {
  if (!matcher) {
    return undefined;
  }

  const candidates = matcher.domain
    ? deviceEntities.filter((e) => e.entity_id.startsWith(`${matcher.domain}.`))
    : deviceEntities;

  // Tier 1: the identity the integration declares.
  if (matcher.translationKey) {
    const wanted = matcher.translationKey.toLowerCase();
    const hit = candidates.find((e) => e.translation_key?.toLowerCase() === wanted);
    if (hit) {
      return hit;
    }
  }

  // Tier 2: the integration's internal name, recovered from unique_id.
  //
  // mbapi2020 builds `unique_id` as `slugify("<vin>_<internal name>")`, and a
  // VIN/FIN never contains an underscore, so the internal name is everything
  // after the first underscore. Comparing it exactly avoids the ambiguity that
  // `endsWith` cannot: `_soc` also matches `_max_soc`, which would otherwise let
  // the SoC key bind to the Max-SoC entity purely on registry ordering.
  if (matcher.translationKey) {
    const wanted = matcher.translationKey.toLowerCase();
    const hit = candidates.find((e) => internalNameOf(e.unique_id) === wanted);
    if (hit) {
      return hit;
    }
  }

  // Tier 3: unique_id / entity_id tail. Covers registries whose internal name
  // does not line up, and absorbs upstream renames.
  if (matcher.suffix) {
    const { suffix } = matcher;
    const hit = candidates.find((e) => (e.unique_id?.endsWith(suffix) ?? false) || e.entity_id.endsWith(suffix));
    if (hit) {
      return hit;
    }
  }

  // Tier 4: English display name. Localizable, hence last.
  if (matcher.originalNames?.length) {
    const hit = candidates.find((e) => !!e.original_name && matcher.originalNames!.includes(e.original_name));
    if (hit) {
      return hit;
    }
  }

  return undefined;
}

/**
 * Resolves one `CarEntityKey` against the entities of a single device.
 *
 * Returns `undefined` when the car simply does not have that capability -
 * absence is normal, since mbapi2020 only creates the entities a vehicle
 * actually reports.
 */
export function findEntityForKey<T extends MatchableEntity>(
  key: CarEntityKey,
  deviceEntities: readonly T[]
): T | undefined {
  return resolveByMatcher(combinedFilters[key], deviceEntities);
}

/**
 * Strips the `<vin>_` prefix from a mbapi2020 unique_id. Returns undefined when
 * the id carries no such prefix, so callers can fall through to other tiers.
 */
function internalNameOf(uniqueId: string | undefined): string | undefined {
  if (!uniqueId) {
    return undefined;
  }
  const sep = uniqueId.indexOf('_');
  return sep === -1 ? undefined : uniqueId.slice(sep + 1).toLowerCase();
}

/**
 * Keys the card could not resolve for the current car. Surfaced for diagnostics:
 * on any given model most keys are legitimately absent, and a silently short
 * list is indistinguishable from a broken lookup.
 */
export function findUnresolvedKeys(deviceEntities: readonly MatchableEntity[]): CarEntityKey[] {
  return (Object.keys(combinedFilters) as CarEntityKey[]).filter((key) => !findEntityForKey(key, deviceEntities));
}
