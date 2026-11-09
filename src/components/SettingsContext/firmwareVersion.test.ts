import { describe, expect, it } from 'vitest';
import { needsUf2BeforeOta, parseVersionReport } from './firmwareVersion';

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

describe('needsUf2BeforeOta', () => {
  it('requires UF2 for installed builds before the minimum OTA build', () => {
    expect(needsUf2BeforeOta(3438, 'pico_w_compat')).toBe(true);
    expect(needsUf2BeforeOta(3492, 'pico_w_compat')).toBe(true);
    expect(needsUf2BeforeOta(3520, 'pico_w_compat')).toBe(true);
  });

  it('allows OTA from the minimum OTA build on', () => {
    expect(needsUf2BeforeOta(3521, 'pico_w_compat')).toBe(false);
    expect(needsUf2BeforeOta(3522, 'pico_w_compat')).toBe(false);
  });

  it('requires UF2 for unnumbered firmware', () => {
    expect(needsUf2BeforeOta(undefined)).toBe(true);
    expect(needsUf2BeforeOta(undefined, 'pico_w_compat')).toBe(true);
  });

  it('holds RP2040 boards to the RP2040 minimum', () => {
    expect(needsUf2BeforeOta(3520, 'pico_w_compat')).toBe(true);
    expect(needsUf2BeforeOta(3521, 'pico_w_compat')).toBe(false);
    expect(needsUf2BeforeOta(3525, 'pico_w')).toBe(false);
  });

  // 3526 moved RP2350 builds from a 4MB layout to a 2MB one
  it('holds RP2350 boards to the RP2350 minimum', () => {
    expect(needsUf2BeforeOta(3525, 'pico2_w_compat')).toBe(true);
    expect(needsUf2BeforeOta(3526, 'pico2_w_compat')).toBe(false);
    expect(needsUf2BeforeOta(3525, 'pico2_w')).toBe(true);
  });

  it('goes by the stricter minimum before the board is known', () => {
    expect(needsUf2BeforeOta(3525)).toBe(true);
    expect(needsUf2BeforeOta(3526)).toBe(false);
  });
});
