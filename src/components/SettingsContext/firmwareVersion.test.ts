import { describe, expect, it } from 'vitest';
import {
  hasSlowBootStageBuild,
  needsFirmwareVerificationUf2,
  parseVersionReport,
} from './firmwareVersion';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const report = (bytes: number[]) => new DataView(Uint8Array.from([0x29, ...bytes]).buffer);

describe('parseVersionReport', () => {
  it('reads the hash and build number', () => {
    const parsed = parseVersionReport(report([...ascii('a1b2c3d4'), 0, 0, 0x0c, 0x0d, 0, 0]));
    expect(parsed).toEqual({ version: 'a1b2c3d4', build: 3340 });
  });

  it('handles firmware from before build numbers', () => {
    expect(parseVersionReport(report([...ascii('a1b2c3d4'), 0, 0]))).toEqual({
      version: 'a1b2c3d4',
      build: undefined,
    });
  });

  it('treats a build number of 0 as unknown', () => {
    const parsed = parseVersionReport(report([...ascii('a1b2c3d4'), 0, 0, 0, 0, 0, 0]));
    expect(parsed.build).toBeUndefined();
  });

  // what configurators from before build numbers do with the new report
  it('still gives older configurators the hash', () => {
    const bytes = Uint8Array.from([...ascii('a1b2c3d4'), 0, 0, 0x0c, 0x0d, 0, 0]);
    const old = String.fromCharCode.apply(null, Array.from(bytes)).replaceAll('\0', '').trim();
    expect(old.substring(0, 8)).toBe('a1b2c3d4');
  });
});

describe('hasSlowBootStageBuild', () => {
  it('flags compat builds from before the fix', () => {
    expect(hasSlowBootStageBuild('pico_w_compat', 2850)).toBe(true);
    expect(hasSlowBootStageBuild('pico_w_compat', 3438)).toBe(true);
  });

  describe('needsFirmwareVerificationUf2', () => {
    it('requires UF2 for installed builds before verification was enabled', () => {
      expect(needsFirmwareVerificationUf2(3489)).toBe(true);
      expect(needsFirmwareVerificationUf2(3492)).toBe(true);
    });

    it('allows the first verified build even before it reports the capability', () => {
      expect(needsFirmwareVerificationUf2(3493)).toBe(false);
      expect(needsFirmwareVerificationUf2(3494)).toBe(false);
    });

    it('uses the capability for unnumbered firmware', () => {
      expect(needsFirmwareVerificationUf2(undefined)).toBe(true);
      expect(needsFirmwareVerificationUf2(undefined, false)).toBe(true);
      expect(needsFirmwareVerificationUf2(undefined, true)).toBe(false);
    });

    it('does not allow an explicit disabled capability to bypass the gate', () => {
      expect(needsFirmwareVerificationUf2(3493, false)).toBe(true);
    });
  });

  it('leaves the firmware to report it from the fix on', () => {
    expect(hasSlowBootStageBuild('pico_w_compat', 3439)).toBe(false);
  });

  it('ignores builds from before the compat board existed', () => {
    expect(hasSlowBootStageBuild('pico_w_compat', 2849)).toBe(false);
  });

  it('ignores firmware without a build number', () => {
    expect(hasSlowBootStageBuild('pico_w_compat', undefined)).toBe(false);
  });

  it('only applies to the RP2040 compat board', () => {
    expect(hasSlowBootStageBuild('pico_w', 3000)).toBe(false);
    expect(hasSlowBootStageBuild('pico2_w_compat', 3000)).toBe(false);
  });
});
