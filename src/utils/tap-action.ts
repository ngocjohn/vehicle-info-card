import { ButtonActionConfig } from '../types';
type ActionType = 'tap' | 'double_tap' | 'hold';

export function addActions(element: HTMLElement, config: ButtonActionConfig) {
  const handler = new ActionHandler(element, config, sendActionEvent);

  element.addEventListener('pointerdown', handler.handleStart.bind(handler));
  element.addEventListener('pointerup', handler.handleEnd.bind(handler));

  element.addEventListener('contextmenu', (e) => e.preventDefault());
  element.style.cursor = 'pointer';
}

function sendActionEvent(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  const tapAction = config?.tap_action || { action: 'more-info' };
  const doubleTapAction = config?.double_tap_action || { action: 'none' };
  const holdAction = config?.hold_action || { action: 'none' };
  const entity = config?.entity || null;
  if (!entity) return;

  callAction(
    element,
    { entity: entity, tap_action: tapAction, double_tap_action: doubleTapAction, hold_action: holdAction },
    action
  );
  // console.log('sendActionEvent', action, entity, tapAction, doubleTapAction, holdAction);
}

function callAction(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  setTimeout(() => {
    const event = new CustomEvent('hass-action', { bubbles: true, composed: true, detail: { config, action } });
    element.dispatchEvent(event);
    // console.log('dispatched', event);
  }, 1);
}

class ActionHandler {
  private element: HTMLElement;
  private config: ButtonActionConfig;
  private sendActionEvent: (element: HTMLElement, config: ButtonActionConfig, action: ActionType) => void;
  private tapTimeout: number | null;
  private startTime: number | null;
  private lastTap: number;
  private defaultEntity: string | null;
  private isSwiping: boolean;
  private startX: number | null = null;
  private startY: number | null = null;

  constructor(
    element: HTMLElement,
    config: ButtonActionConfig,
    sendActionEvent: (element: HTMLElement, config: ButtonActionConfig, action: ActionType) => void
  ) {
    this.element = element;
    this.config = config;
    this.sendActionEvent = sendActionEvent;
    this.defaultEntity = config.entity || this._extractEntityFromAction(config);
    this.tapTimeout = null;
    this.lastTap = 0;
    this.startTime = null;
    this.isSwiping = false;
  }

  // Utility method to extract entity from the button actions
  _extractEntityFromAction(config) {
    if (config?.button_action?.tap_action?.target?.entity_id) {
      return config.button_action.tap_action.target.entity_id;
    }
    if (config?.button_action?.hold_action?.target?.entity_id) {
      // console.log('entity_id', config.button_action.hold_action.target.entity_id);
      return config.button_action.hold_action.target.entity_id;
    }
    if (config?.button_action?.double_tap_action?.target?.entity_id) {
      // console.log('entity_id', config.button_action.double_tap_action.target.entity_id);
      return config.button_action.double_tap_action.target.entity_id;
    }

    // If no entity is found, return null
    return null;
  }

  handleEnd(e: PointerEvent) {
    if (this.startTime === null) return;

    const currentTime = Date.now();
    const holdDuration = currentTime - this.startTime;

    const deltaX = Math.abs((e.clientX || 0) - (this.startX || 0));
    const deltaY = Math.abs((e.clientY || 0) - (this.startY || 0));
    const moveThreshold = 20;

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      this.isSwiping = true;
      this.startTime = null;
      // console.log('Swipe detected, ignoring tap/hold/double_tap');
      return; // Ignore swipe as a valid tap/hold/double_tap
    }

    // console.log('Pointer up:', currentTime, 'Hold duration:', holdDuration, 'Double tap duration:', doubleTapDuration);

    const doubleTapDuration = currentTime - this.lastTap;
    this.lastTap = currentTime;
    this.startTime = null;

    if (holdDuration > 500) {
      // Set a threshold for long press (500ms example)
      this.sendActionEvent(this.element, this.config, 'hold');
    } else if (doubleTapDuration < 300) {
      // Set a threshold for double tap (300ms example)
      this.sendActionEvent(this.element, this.config, 'double_tap');
    } else {
      this.tapTimeout = window.setTimeout(() => {
        this.sendActionEvent(this.element, this.config, 'tap');
      }, 300); // Same threshold for single tap
    }
  }

  handleStart(e: PointerEvent) {
    e.preventDefault();
    this.startTime = Date.now();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.isSwiping = false;
    clearTimeout(this.tapTimeout as number);
  }
}
