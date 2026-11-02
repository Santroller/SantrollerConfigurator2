import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import '@/i18n/config';

import { getLocalizedGuide, GUIDE_REGISTRY } from './registry';
import { getSetupGuide, withBuildGuide } from './setup/setupGuide';
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
        (key) => `${step.textKey ?? `guides.${guide.id}.steps.${step.id}`}.${key}`
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

  it('build guides end with the shared steps that fit them', () => {
    const ending = (id: string) => GUIDE_REGISTRY[id].steps.slice(-3).map((step) => step.id);
    expect(ending('wii-adapter')).toEqual(['hostDevices', 'games', 'test']);
    expect(ending('direct-pico-guitar').slice(-2)).toEqual(['games', 'test']);
    expect(ending('dj-turntable').slice(-2)).toEqual(['tt-wiring', 'test']);
  });

  it('runs a build guide whole inside the setup guide, testing once', () => {
    const guide = withBuildGuide(getLocalizedGuide(getSetupGuide('fresh', 'wii-adapter')), {
      guide: getLocalizedGuide(GUIDE_REGISTRY['wii-adapter']),
    });
    const ids = guide.steps.map((step) => step.id);
    expect(ids.filter((id) => id.endsWith('test'))).toEqual(['wii-adapter__test']);
    expect(ids.slice(ids.indexOf('wii-adapter__test'))).toEqual([
      'wii-adapter__test',
      'yourProfiles',
      'standby',
      'save',
    ]);
  });

  it('runs the extras after the build, before the steps it ends with', () => {
    const guide = withBuildGuide(
      getLocalizedGuide(getSetupGuide('fresh', 'direct-pico-guitar')),
      { guide: getLocalizedGuide(GUIDE_REGISTRY['direct-pico-guitar']) },
      [{ guide: getLocalizedGuide(GUIDE_REGISTRY['xbox-auth']) }]
    );
    const ids = guide.steps.map((step) => step.id);
    expect(ids.slice(ids.indexOf('direct-pico-guitar__nav'))).toEqual([
      'direct-pico-guitar__nav',
      'xbox-auth__auth-intro',
      'xbox-auth__auth-wiring',
      'xbox-auth__auth-test',
      'direct-pico-guitar__games',
      'direct-pico-guitar__test',
      'yourProfiles',
      'standby',
      'save',
    ]);
  });

  it('runs the extras before the test step without a build guide', () => {
    const guide = withBuildGuide(
      getLocalizedGuide(getSetupGuide('fresh', OTHER_BUILD)),
      undefined,
      [{ guide: getLocalizedGuide(GUIDE_REGISTRY['rgb-leds']) }]
    );
    const ids = guide.steps.map((step) => step.id);
    expect(ids.slice(ids.indexOf('profile'), ids.indexOf('test') + 1)).toEqual([
      'profile',
      'rgb-leds__led-intro',
      'rgb-leds__led-wiring',
      'rgb-leds__led-test',
      'test',
    ]);
  });
});
