/* eslint-disable @typescript-eslint/no-explicit-any */

// Hack to load ha-components needed for editor
export const loadHaComponents = () => {
  if (!customElements.get('ha-form')) {
    (customElements.get('hui-button-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-entity-picker')) {
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-card-conditions-editor')) {
    (customElements.get('hui-conditional-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-form-multi_select')) {
    // Load the component by invoking a related component's method
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
  }
};

export const stickyPreview = () => {
  // Change the default preview element to be sticky
  const root = document.querySelector('body > home-assistant')?.shadowRoot;
  const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
  const previewElement = dialog?.querySelector('ha-dialog > div.content > div.element-preview') as HTMLElement;
  if (previewElement && previewElement.style.position !== 'sticky') {
    previewElement.style.position = 'sticky';
    previewElement.style.top = '0';
  }
};
