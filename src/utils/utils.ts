import { HomeAssistant } from 'custom-card-helpers';
import { VehicleEntity } from '../types';
import { combinedFilters } from '../types';

import { version, description, repository } from '../../package.json';

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
    { entity_id: string; device_id: string; original_name: string; unique_id: string; translation_key: string }[]
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
      if (entityName === 'soc') {
        const socName = 'State of Charge';
        const entity = deviceEntities.find((e) => e.original_name === socName);
        if (entity) {
          entityIds[entityName] = {
            entity_id: entity.entity_id,
            original_name: entity.original_name,
            unique_id: entity.unique_id,
            device_id: entity.device_id,
          };
        }
      } else if (entityName === 'maxSoc') {
        const maxSocName = 'Max State of Charge';
        const entity = deviceEntities.find((e) => e.original_name === maxSocName);
        if (entity) {
          entityIds[entityName] = {
            entity_id: entity.entity_id,
            original_name: entity.original_name,
            unique_id: entity.unique_id,
            device_id: entity.device_id,
          };
        }
      }

      const entity = deviceEntities.find((e) => e.entity_id.startsWith(prefix) && e.entity_id.endsWith(suffix));
      if (entity) {
        entityIds[entityName] = {
          entity_id: entity.entity_id,
          original_name: entity.original_name,
          unique_id: entity.unique_id,
          device_id: entity.device_id,
        };
      }
    }
  }
  return entityIds;
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
    cardElement.addEventListener(event, presDown as EventListener);
  });
}

/**
 * Console log info
 */

export function logCardInfo(): void {
  /* eslint no-console: 0 */
  const line1 = '   VEHICLE-INFO-CARD';
  const line2 = `   v${version}`;
  const length = Math.max(line1.length, line2.length) + 3;
  const pad = (text: string, length: number) => text + ' '.repeat(length - text.length);
  const repo = repository.url;
  const sponsor = 'https://github.com/sponsors/ngocjohn';

  /* eslint no-console: 0 */
  console.groupCollapsed(
    `%c${pad(line1, length)}\n%c${pad(line2, length)}`,
    'color: orange; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
  );
  console.info(description);
  console.info(`Github: ${repo}`);
  console.info(`If you like the card, consider supporting the developer: ${sponsor}`);
  console.groupEnd();
}
