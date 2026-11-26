import { useMemo } from 'react';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { useGuitarFamily } from './guitar/guitarMappingUtils';
import { GuideDefinition } from './types';

/**
 * The guide without the steps that don't apply to this build, updating as the choices they
 * depend on change. With requireDevice, steps that only work on a connected controller are left
 * out until there is one.
 */
export function useVisibleSteps(
  guide: GuideDefinition,
  { requireDevice = false }: { requireDevice?: boolean } = {}
): GuideDefinition {
  const guitarFamily = useGuitarFamily();
  const deviceConnected = useConfigStore((state) => state.connected);
  const connected = !requireDevice || deviceConnected;
  return useMemo(() => {
    const context = { guitarFamily, connected };
    const steps = guide.steps.filter((step) => step.visible?.(context) ?? true);
    return steps.length === guide.steps.length ? guide : { ...guide, steps };
  }, [guide, guitarFamily, connected]);
}
