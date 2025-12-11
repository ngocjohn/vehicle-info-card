import { CarEntities } from '../types';
import { Store } from './store';

export class Car {
  private _store: Store;
  readonly cardEntities: CarEntities;
  constructor(store: Store, cardEntities: CarEntities) {
    this._store = store;
    this.cardEntities = cardEntities;
  }

  get store(): Store {
    return this._store;
  }
}
