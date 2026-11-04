import i18next from 'i18next';
import { describe, expect, it, vi } from 'vitest';

import '@/i18n/config';

import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';
import { describeMapping } from './testStep';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null });
});

const t = i18next.t.bind(i18next);
// Only what a mapping sends matters for naming it, not where it comes from
const named = (mapping: Omit<proto.IMapping, 'input'>) =>
  describeMapping(t, { input: {}, ...mapping }, 4);

describe('naming inputs in the tester', () => {
  it('names instrument outputs, and says how to show them', () => {
    expect(
      named({ mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green } })
    ).toEqual({ label: 'Green Fret', kind: 'button' });
    expect(
      named({ mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy } })
    ).toEqual({ label: 'Whammy', kind: 'axis' });
    // Drum pads only send a short hit
    expect(
      named({ mapping: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad } })
    ).toMatchObject({ kind: 'hit' });
  });

  it('shows an analog input turned into a button as a button', () => {
    expect(
      named({
        mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt },
        trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
      })
    ).toMatchObject({ kind: 'button' });
  });

  it('names gamepad buttons, the d-pad included, and keys', () => {
    expect(
      named({ mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp } }).label
    ).toBe('D-pad Up');
    expect(named({ mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_Start } }).label).toBe(
      'Start Button'
    );
    expect(named({ mapping: { keycode: CODE_TO_HID.KeyD } }).label).toBe('D');
  });

  it('falls back to the input number', () => {
    expect(named({ mapping: {} })).toEqual({ label: 'Input #5', kind: 'button' });
  });
});
