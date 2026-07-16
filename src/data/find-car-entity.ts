import { CarEntities, CarEntity } from 'types';

function getCarEntityConfig(obj: CarEntities, entityKey: string): CarEntity | undefined {
  return obj[entityKey as keyof CarEntities];
}

export default function setupFindCarEntity(carEntities: CarEntities) {
  return function (entityKey: string): CarEntity | undefined {
    return getCarEntityConfig(carEntities, entityKey);
  };
}
