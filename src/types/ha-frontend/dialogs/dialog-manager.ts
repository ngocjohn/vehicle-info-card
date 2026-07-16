import type { HASSDomEvent, ValidHassDomEvent } from '../common/dom/fire_event';

declare global {
  // for fire event
  interface HASSDomEvents {
    'show-dialog': ShowDialogParams<unknown>;
    'close-dialog': undefined;
    'dialog-closed': DialogClosedParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    'show-dialog': HASSDomEvent<ShowDialogParams<unknown>>;
    'dialog-closed': HASSDomEvent<DialogClosedParams>;
  }
}

export interface HassDialog<T = HASSDomEvents[ValidHassDomEvent]> extends HTMLElement {
  showDialog(params: T);
  closeDialog?: () => boolean;
}

interface ShowDialogParams<T> {
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
  dialogParams: T;
  addHistory?: boolean;
}

export interface DialogClosedParams {
  dialog: string;
}
