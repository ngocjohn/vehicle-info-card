import { HomeAssistant } from 'custom-card-helpers';
import { VehicleEntities, VehicleEntity } from '../types';
import { combinedFilters } from '../const/const';

/**
 *
 * @param car
 * @returns
 */

export async function getVehicleEntities(hass: HomeAssistant, config: { entity?: string }): Promise<VehicleEntities> {
  if (!config.entity) {
    return {};
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
      return e.unique_id.endsWith(suffix);
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

export async function getModelName(hass: HomeAssistant, config: { entity?: string }): Promise<string> {
  // Fetch all entities
  const allEntities = await hass.callWS<{ entity_id: string; device_id: string }[]>({
    type: 'config/entity_registry/list',
  });
  // Find the car entity
  const carEntity = allEntities.find((entity) => entity.entity_id === config.entity);
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
  toggleCard: (direction: 'next' | 'prev') => void,
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
