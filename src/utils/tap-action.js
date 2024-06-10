const maxHoldDuration = 300;
const doubleTapTimeout = 300;

export const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);

  return event;
};

export function tapFeedback(feedbackElement) {
  if (feedbackElement === undefined) return;

  forwardHaptic('success');

  feedbackElement.style.display = '';
  feedbackElement.style.animation = 'tap-feedback .3s';

  setTimeout(() => {
    feedbackElement.style.animation = 'none';
    feedbackElement.style.display = 'none';
  }, 500);
}

export function callAction(element, config, action) {
  setTimeout(() => {
    const event = new Event('hass-action', { bubbles: true, composed: true });
    event.detail = { config, action };
    element.dispatchEvent(event);
  }, 1);
  console.log('callAction', element, config, action);
}

class ActionHandler {
  constructor(element, config, sendActionEvent, defaultEntity) {
    this.element = element;
    this.config = config;
    this.sendActionEvent = sendActionEvent;
    this.defaultEntity = defaultEntity;
    this.tapTimeout = null;
    this.lastTap = 0;
    this.startTime = null;
  }

  handleStart(e) {
    e.stopPropagation();
    e.stopImmediatePropagation();

    this.startTime = Date.now();
    clearTimeout(this.tapTimeout);
  }

  handleEnd() {
    if (this.startTime === null) return;

    const currentTime = Date.now();
    const holdDuration = currentTime - this.startTime;
    const doubleTapDuration = currentTime - this.lastTap;

    this.lastTap = currentTime;
    this.startTime = null;

    if (holdDuration > maxHoldDuration) {
      this.sendActionEvent(this.element, this.config, 'hold', this.defaultEntity);
    } else if (doubleTapDuration < doubleTapTimeout) {
      this.sendActionEvent(this.element, this.config, 'double_tap', this.defaultEntity);
    } else {
      this.tapTimeout = setTimeout(() => {
        this.sendActionEvent(this.element, this.config, 'tap', this.defaultEntity);
      }, doubleTapTimeout);
    }
  }
}

export function sendActionEvent(element, config, action, defaultEntity) {
  const tapAction = config?.tap_action || { action: 'none' };
  const holdAction = config?.hold_action || { action: 'none' };
  const doubleTapAction = config?.double_tap_action || { action: 'none' };

  const entity = config?.entity || defaultEntity;

  callAction(
    element,
    { entity: entity, tap_action: tapAction, hold_action: holdAction, double_tap_action: doubleTapAction },
    action,
  );
}

export function addActions(element, config, defaultEntity) {
  const handler = new ActionHandler(element, config, sendActionEvent, defaultEntity);

  element.addEventListener('pointerdown', handler.handleStart.bind(handler));
  element.addEventListener('pointerup', handler.handleEnd.bind(handler));
  // element.addEventListener('contextmenu', (e) => e.preventDefault());
  // element.style.cursor = 'auto';
}

export const forwardHaptic = (hapticType) => {
  fireEvent(window, 'haptic', hapticType);
};
