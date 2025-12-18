import memoizeOne from 'memoize-one';
import { HomeAssistant } from 'types';

export const getEntityAttributeValue = memoizeOne(
  (hass: HomeAssistant, entityId: string, attributeName: string, formatted: boolean = false): any => {
    const stateObj = hass.states[entityId];
    if (!stateObj) {
      return undefined;
    }
    if (formatted) {
      return hass.formatEntityAttributeValue(stateObj, attributeName);
    } else {
      return stateObj?.attributes[attributeName];
    }
  }
);

export const getEntityStateValue = memoizeOne(
  (hass: HomeAssistant, entityId: string, forrmated: boolean = false): any => {
    const stateObj = hass.states[entityId];
    if (!stateObj) {
      return undefined;
    }
    if (forrmated) {
      return hass.formatEntityState(stateObj);
    } else {
      return stateObj?.state;
    }
  }
);
