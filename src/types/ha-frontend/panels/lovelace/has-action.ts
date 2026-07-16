import type { ActionConfig, ActionsConfig } from '../../lovelace/action';

export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== 'none';
}

export function hasAnyAction(config: ActionsConfig): boolean {
  return (
    !config.tap_action ||
    hasAction(config.tap_action) ||
    hasAction(config.hold_action) ||
    hasAction(config.double_tap_action)
  );
}
