import { useMemo } from 'react';
import i18next, { type TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { PS2_ADAPTER_GUIDE } from './adapters/ps2AdapterGuide';
import { WII_ADAPTER_GUITAR_GUIDE } from './adapters/wiiAdapterGuide';
import { DRUM_KIT_GUIDE } from './drums/drumGuide';
import { DIRECT_PICO_GUITAR_GUIDE } from './guitar/guitarGuide';
import { RGB_LED_GUIDE } from './leds/ledGuide';
import { DJ_TURNTABLE_GUIDE } from './turntable/turntableGuide';
import { GuideCategory, GuideDefinition } from './types';
import { USB_HOST_GUIDE } from './usb/usbHostGuide';
import { XBOX360_RF_GUIDE } from './xbox360rf/xbox360RfGuide';

export const GUIDE_REGISTRY: Record<string, GuideDefinition> = {
  [DIRECT_PICO_GUITAR_GUIDE.id]: DIRECT_PICO_GUITAR_GUIDE,
  [WII_ADAPTER_GUITAR_GUIDE.id]: WII_ADAPTER_GUITAR_GUIDE,
  [PS2_ADAPTER_GUIDE.id]: PS2_ADAPTER_GUIDE,
  [DRUM_KIT_GUIDE.id]: DRUM_KIT_GUIDE,
  [DJ_TURNTABLE_GUIDE.id]: DJ_TURNTABLE_GUIDE,
  [USB_HOST_GUIDE.id]: USB_HOST_GUIDE,
  [RGB_LED_GUIDE.id]: RGB_LED_GUIDE,
  [XBOX360_RF_GUIDE.id]: XBOX360_RF_GUIDE,
};

export interface CategoryInfo {
  id: GuideCategory | 'all';
  label: string;
  description: string;
}

export const GUIDE_CATEGORIES: CategoryInfo[] = [
  { id: 'all', label: 'All Guides', description: 'Browse all available build guides' },
  {
    id: 'guitar',
    label: 'Guitars',
    description: 'Rewire or mod Guitar Hero and Rock Band guitars',
  },
  { id: 'adapters', label: 'Adapters', description: 'Wii, PS2, and USB host adapters' },
  { id: 'drums', label: 'Drums', description: 'E-drum MIDI setup and piezo triggers' },
  { id: 'turntable', label: 'DJ Hero', description: 'DJ Hero turntable conversions' },
  {
    id: 'mods',
    label: 'LEDs & Mods',
    description: 'WS2812B addressable LEDs and custom peripherals',
  },
];

export function getGuideCategories(t?: TFunction): CategoryInfo[] {
  const translate = t ?? i18next.t.bind(i18next);
  return GUIDE_CATEGORIES.map((c) => ({
    id: c.id,
    label: String(translate(`guides.categories.${c.id}`, c.label)),
    description: String(translate(`guides.categoryDescriptions.${c.id}`, c.description)),
  }));
}

export function useGuideCategories(): CategoryInfo[] {
  const { t } = useTranslation();
  return useMemo(() => getGuideCategories(t), [t]);
}

export function getLocalizedGuide(guide: GuideDefinition, t?: TFunction): GuideDefinition {
  const translate = t ?? i18next.t.bind(i18next);
  const localizedTitle = translate(`guides.${guide.id}.title`, guide.title);
  const localizedSubtitle = translate(`guides.${guide.id}.subtitle`, guide.subtitle);
  const localizedDesc = translate(`guides.${guide.id}.description`, guide.description);
  const localizedTime = translate(`guides.${guide.id}.estimatedTime`, guide.estimatedTime);
  const localizedBadge = guide.badge
    ? translate(`guides.${guide.id}.badge`, guide.badge)
    : undefined;

  const localizedSteps = guide.steps.map((step) => ({
    ...step,
    title: translate(`guides.${guide.id}.steps.${step.id}.title`, step.title),
    shortTitle: translate(`guides.${guide.id}.steps.${step.id}.shortTitle`, step.shortTitle),
    description: translate(`guides.${guide.id}.steps.${step.id}.description`, step.description),
    badge: step.badge
      ? translate(`guides.${guide.id}.steps.${step.id}.badge`, step.badge)
      : undefined,
  }));

  return {
    ...guide,
    title: String(localizedTitle),
    subtitle: String(localizedSubtitle),
    description: String(localizedDesc),
    estimatedTime: String(localizedTime),
    badge: localizedBadge ? String(localizedBadge) : undefined,
    steps: localizedSteps,
  };
}

export function getAllGuides(t?: TFunction): GuideDefinition[] {
  return Object.values(GUIDE_REGISTRY).map((g) => getLocalizedGuide(g, t));
}

export function useAllGuides(): GuideDefinition[] {
  const { t } = useTranslation();
  return useMemo(() => getAllGuides(t), [t]);
}

export function getGuideById(id: string | undefined, t?: TFunction): GuideDefinition | undefined {
  if (!id || !GUIDE_REGISTRY[id]) {
    return undefined;
  }
  return getLocalizedGuide(GUIDE_REGISTRY[id], t);
}

export function useGuideById(id: string | undefined): GuideDefinition | undefined {
  const { t } = useTranslation();
  return useMemo(() => getGuideById(id, t), [id, t]);
}

export function getGuidesByCategory(
  category: GuideCategory | 'all',
  t?: TFunction
): GuideDefinition[] {
  const all = getAllGuides(t);
  if (category === 'all') {
    return all;
  }
  return all.filter((g) => g.category === category);
}

export function useGuidesByCategory(category: GuideCategory | 'all'): GuideDefinition[] {
  const { t } = useTranslation();
  return useMemo(() => getGuidesByCategory(category, t), [category, t]);
}
