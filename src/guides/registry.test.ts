import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import '@/i18n/config';

import { GUIDE_REGISTRY } from './registry';
import { getSetupGuide } from './setup/setupGuide';
import { OTHER_BUILD } from './setup/setupPath';
import { GuideSource } from './types';

// Guides only hold their structure, so every bit of text they show has to be in the translations
function missingKeys(guide: GuideSource) {
  const keys = [
    ...['title', 'subtitle', 'description', 'estimatedTime'].map(
      (key) => `guides.${guide.id}.${key}`
    ),
    ...guide.steps.flatMap((step) =>
      ['title', 'shortTitle', 'description'].map(
        (key) => `guides.${guide.id}.steps.${step.id}.${key}`
      )
    ),
  ];
  return keys.filter((key) => !i18next.exists(key));
}

describe('guide text', () => {
  it.each(Object.values(GUIDE_REGISTRY).map((guide) => [guide.id, guide]))(
    '%s has all its text',
    (_, guide) => {
      expect(missingKeys(guide)).toEqual([]);
    }
  );

  it('every setup guide path has all its text', () => {
    const paths = [
      getSetupGuide('fresh', null),
      getSetupGuide('fresh', OTHER_BUILD),
      getSetupGuide('fresh', 'direct-pico-guitar'),
      getSetupGuide('santroller1', null),
    ];
    expect(paths.flatMap(missingKeys)).toEqual([]);
  });
});
