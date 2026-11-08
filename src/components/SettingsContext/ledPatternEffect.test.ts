import { describe, expect, it } from 'vitest';
import { proto } from './config.js';
import { migrateLedPatterns } from './ledPatternEffect';

const rgb = (): proto.IRGBLedDevice => ({
  deviceId: 1,
  startR: 10,
  startG: 20,
  startB: 30,
  startW: 255,
  endR: 0,
  endG: 0,
  endB: 0,
  endW: 0,
  activeLed: [0, 1],
  hasStart: true,
});
const configWith = (...leds: proto.ILed[]) => ({ profiles: [{ leds }] }) as proto.IConfig;

describe('migrateLedPatterns', () => {
  it('turns breathing into static with the breathing effect, keeping its colours', () => {
    const config = configWith({
      device: { rgb: rgb() },
      mapping: {
        patternMapping: { pattern: proto.RgbPatternType.PatternFade, speed: 3, brightness: 200 },
      },
    });
    expect(migrateLedPatterns(config)).toBe(true);
    const led = config.profiles![0].leds![0];
    expect(led.mapping).toEqual({ staticMapping: {} });
    expect(led.effect).toEqual({ type: proto.LedEffectType.EffectBreathing, speed: 3 });
    expect(led.device!.rgb).toEqual(rgb());
  });

  it('turns a rainbow into white at its brightness with the rainbow effect', () => {
    const config = configWith({
      device: { rgb: rgb() },
      mapping: {
        patternMapping: { pattern: proto.RgbPatternType.PatternRainbow, speed: 7, brightness: 128 },
      },
    });
    expect(migrateLedPatterns(config)).toBe(true);
    const led = config.profiles![0].leds![0];
    expect(led.mapping).toEqual({ staticMapping: {} });
    expect(led.effect).toEqual({ type: proto.LedEffectType.EffectRainbow, speed: 7 });
    expect(led.device!.rgb).toMatchObject({
      endR: 255,
      endG: 255,
      endB: 255,
      endW: 128,
      hasStart: false,
    });
    expect(led.device!.rgb!.activeLed).toEqual([0, 1]);
  });

  it('leaves other modes alone', () => {
    const config = configWith({
      device: { gpio: { pin: 1, analog: true } },
      mapping: { staticMapping: {} },
    });
    expect(migrateLedPatterns(config)).toBe(false);
    expect(config.profiles![0].leds![0].effect).toBeUndefined();
  });
});
