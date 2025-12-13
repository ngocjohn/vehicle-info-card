import { Unpromise } from '@watchable/unpromise';

const TIMEOUT_ERROR = 'SELECTTREE-TIMEOUT';

export async function await_element(el: any, hard = false) {
  if (el.localName?.includes('-')) await customElements.whenDefined(el.localName);
  if (el.updateComplete) await el.updateComplete;
  if (hard) {
    if (el.pageRendered) await el.pageRendered;
    if (el._panelState) {
      let rounds = 0;
      while (el._panelState !== 'loaded' && rounds++ < 5) await new Promise((r) => setTimeout(r, 100));
    }
  }
}

async function _selectTree(root: any, path: any, all = false) {
  let el = [root];
  if (typeof path === 'string') {
    path = path.split(/(\$| )/);
  }
  while (path[path.length - 1] === '') path.pop();
  for (const [, p] of path.entries()) {
    const e = el[0];
    if (!e) return null;

    if (!p.trim().length) continue;

    await_element(e);
    el = p === '$' ? [e.shadowRoot] : e.querySelectorAll(p);
  }
  return all ? el : el[0];
}

export async function selectTree(root: any, path: any, all = false, timeout = 10000) {
  return Unpromise.race([
    _selectTree(root, path, all),
    new Promise((_, reject) => setTimeout(() => reject(new Error(TIMEOUT_ERROR)), timeout)),
  ]).catch((err) => {
    if (!err.message || err.message !== TIMEOUT_ERROR) throw err;
    return null;
  });
}

export const stopPropagation = (ev) => ev.stopPropagation();
export const preventDefault = (ev) => ev.preventDefault();
export const stopAndPrevent = (ev) => {
  ev.stopPropagation();
  ev.preventDefault();
};

/**
 * Find the closest matching element in a chain of nested, slotted custom elements.
 *
 * @param selector selector used to find the element; values are case-sensitive.
 * @param base element to start searching from; specify `this` to start searching from the current element.
 * @returns a matching element if found; otherwise, null.
 *
 * examples:
 * - find element by it's `id=` value:
 *   const container = this.closestElement('#spcPlayer', this);
 * - find element by it's html tag name (e.g. `<spc-player>`):
 *   const container = this.closestElement('spc-player', this);
 */
export function closestElement(selector: string, base: Element) {
  function __closestFrom(el: Element | Window | Document | null): Element | null {
    if (!el || el === document || el === window) return null;
    if ((el as Slottable).assignedSlot) el = (el as Slottable).assignedSlot;

    const found = (el as Element).closest(selector);
    return found ? found : __closestFrom(((el as Element).getRootNode() as ShadowRoot).host);
  }
  return __closestFrom(base);
}

export function isCardInEditPreview(cardElement: Element) {
  // get parent element data.
  if (cardElement) {
    // check for "<hui-card>" tag reference;
    const cardHuiObj = closestElement('hui-card', cardElement) as Element;
    if (cardHuiObj) {
      // console.log(
      //   'isCardInEditPreview - closestElement found "<hui-card>" tag; checking for ".element-preview" class parent'
      // );

      // check for "element-preview" class reference;
      // if found, then the card is being edited.
      const cardPreviewObj = closestElement('.element-preview', cardHuiObj) as Element;
      if (cardPreviewObj) {
        // console.log('isCardInEditPreview - closestElement found ".element-preview" class; card is in edit mode');
        return true;
      } else {
        // console.log(
        //   'isCardInEditPreview - closestElement did NOT find ".element-preview" class; card is NOT in edit mode'
        // );
        return false;
      }
    } else {
      return false;
    }
  } else {
    // console.log('isCardInEditPreview - cardElement object not supplied; card is NOT in edit mode');
    return false;
  }
}

/**
 * Returns true if the card is currently being previewed in the card picker
 * dialog, which is used when adding a card to a UI dashboard;
 * otherwise, false.
 *
 * The parentElement structure will look like the following when the MAIN card
 * is in card picker preview mode (in the card picker preview pane):
 *
 * (HA 2024.08.1 release):
 * - parentElement1.tagName='DIV',   class name='preview   '
 * - parentElement2.tagName='DIV',   class name='card'
 * - parentElement3.tagName='DIV',   class name='cards-container'
 * - parentElement4.tagName='DIV',   class name=undefined
 */
export function isCardInPickerPreview(cardElement: Element) {
  let parent1Cls: string | undefined = undefined;
  let parent2Cls: string | undefined = undefined;
  let parent3Cls: string | undefined = undefined;

  // get parent element data.
  if (cardElement) {
    //console.log("isCardInEditPreview - ParentElement tagName info:\n parentElement1: %s = %s\n parentElement2: %s = %s\n parentElement3: %s = %s\n parentElement4: %s = %s\n parentElement5: %s = %s\n parentElement6: %s = %s\n parentElement7: %s = %s",
    //  cardElement.parentElement?.tagName, cardElement.parentElement?.className,
    //  cardElement.parentElement?.parentElement?.tagName, cardElement.parentElement?.parentElement?.className,
    //  cardElement.parentElement?.parentElement?.parentElement?.tagName, cardElement.parentElement?.parentElement?.parentElement?.className,
    //  cardElement.parentElement?.parentElement?.parentElement?.parentElement?.tagName, cardElement.parentElement?.parentElement?.parentElement?.parentElement?.className,
    //  cardElement.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.tagName, cardElement.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.className,
    //  cardElement.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.tagName, cardElement.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.className,
    //  cardElement.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.tagName, cardElement.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.className,
    //);

    const parent1Elm = cardElement.parentElement;
    if (parent1Elm) {
      parent1Cls = (parent1Elm.className || '').trim();
      const parent2Elm = parent1Elm.parentElement;
      if (parent2Elm) {
        parent2Cls = (parent2Elm.className || '').trim();
        const parent3Elm = parent2Elm.parentElement;
        if (parent3Elm) {
          parent3Cls = (parent3Elm.className || '').trim();
        }
      }
    }
  } else {
    // cardElement was undefined.
  }

  // check if the card is in the card picker preview pane.
  let result = false;
  if (parent1Cls === 'preview' && parent2Cls === 'card' && parent3Cls === 'cards-container') {
    result = true;
  }

  return result;
}
