import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { ledOverlaps, pwmChannelShares } from './ledOverlap';

const input: proto.ILedMapping = { inputMapping: { input: {} } };
const rumble: proto.ILedMapping = { rumbleMapping: { type: proto.LedRumbleType.RumbleLeft } };

const rgb = (activeLed: number[], hasStart: boolean, mapping = input): proto.ILed => ({
  device: {
    rgb: {
      deviceId: 1,
      activeLed,
      hasStart,
      startR: 0,
      startG: 0,
      startB: 0,
      startW: 0,
      endR: 0,
      endG: 0,
      endB: 0,
      endW: 0,
    },
  },
  mapping,
});
const gpio = (pin: number, mapping = input): proto.ILed => ({
  device: { gpio: { pin, analog: false } },
  mapping,
});

const hides = (leds: proto.ILed[]) => ledOverlaps(leds).map((x) => x.hides);
const cutsShort = (leds: proto.ILed[]) => ledOverlaps(leds).map((x) => x.cutsShort);

describe('ledOverlaps', () => {
  it('allows later RGB mappings without an off colour to layer on top', () => {
    expect(hides([rgb([0], true), rgb([0], false), rgb([0], false)])).toEqual([[], [], []]);
  });

  it('flags a later RGB mapping with an off colour on a shared LED', () => {
    expect(hides([rgb([0, 1], true), rgb([2], true), rgb([1], true)])).toEqual([[], [], [0]]);
  });

  it('flags any later GPIO mapping on the same pin', () => {
    expect(hides([gpio(2), gpio(3), gpio(2)])).toEqual([[], [], [0]]);
  });

  it('flags a mapping that takes the LED back from one the host drives, in either order', () => {
    expect(hides([gpio(2, rumble), gpio(2)])).toEqual([[], []]);
    expect(cutsShort([gpio(2, rumble), gpio(2)])).toEqual([[], [0]]);
    expect(cutsShort([rgb([0, 1], true), rgb([1], true, rumble)])).toEqual([[1], []]);
  });

  it('lets the host keep the LED while an RGB mapping without an off colour is released', () => {
    expect(cutsShort([rgb([0], true, rumble), rgb([0], false)])).toEqual([[], []]);
  });
});

describe('pwmChannelShares', () => {
  const pwm = (pin: number): proto.ILed => ({
    device: { gpio: { pin, analog: true } },
    mapping: input,
  });

  it('flags PWM pins 16 apart', () => {
    expect(pwmChannelShares([pwm(0), pwm(16), pwm(1)])).toEqual([[1], [0], []]);
  });

  it('flags RP2350B pins 8 apart, but not against the lower pins', () => {
    expect(pwmChannelShares([pwm(32), pwm(40), pwm(16)])).toEqual([[1], [0], []]);
  });

  it('ignores the same pin, digital pins and unset pins', () => {
    expect(pwmChannelShares([pwm(2), pwm(2), gpio(18), pwm(-1)])).toEqual([[], [], [], []]);
  });
});
