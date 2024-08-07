// Hack to load ha-components needed for editor
export const loadHaComponents = () => {
  console.log('loadHaComponents');
  if (!customElements.get('ha-form')) {
    (customElements.get('hui-button-card') as any)?.getConfigElement();
    // console.log('loadHaComponents hui-button-card');
  }
  if (!customElements.get('ha-entity-picker')) {
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
    // console.log('loadHaComponents hui-entities-card');
  }
  if (!customElements.get('ha-card-conditions-editor')) {
    (customElements.get('hui-conditional-card') as any)?.getConfigElement();
    // console.log('loadHaComponents hui-conditional-card');
  }
  // console.log('loadHaComponents done');
};

export const loadCustomElement = async <T = any>(name: string) => {
  let Component = customElements.get(name) as T;
  if (Component) {
    return Component;
  }
  await customElements.whenDefined(name);
  return customElements.get(name) as T;
};
