import { useMemo } from 'react';
import { useGuitarFamily } from './guitar/guitarMappingUtils';
import { GuideDefinition } from './types';

/**
 * The guide without the steps that don't apply to this build, updating as the choices they
 * depend on change.
 */
export function useVisibleSteps(guide: GuideDefinition): GuideDefinition {
  const guitarFamily = useGuitarFamily();
  return useMemo(() => {
    const context = { guitarFamily };
    const steps = guide.steps.filter((step) => step.visible?.(context) ?? true);
    return steps.length === guide.steps.length ? guide : { ...guide, steps };
  }, [guide, guitarFamily]);
}
