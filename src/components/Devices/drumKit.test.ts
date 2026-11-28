import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { layoutFromKit, padLabel, padMapping, templatePads } from './drumKit';

const KIT_ID = 7;
const ghRed = { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad };
const rbKick = { rbDrumButton: proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal };

describe('padMapping', () => {
  it('reads drum lanes like triggers with peak hold', () => {
    const mapping = padMapping(ghRed, KIT_ID, 0);
    expect(mapping).toMatchObject({
      input: { drumKit: { deviceid: KIT_ID, pad: 0 } },
      min: 4000,
      peakBased: true,
    });
    expect(mapping.input?.digitalTrigger).toBeUndefined();
  });

  it('presses buttons past the same point', () => {
    expect(padMapping(rbKick, KIT_ID, 0).input).toMatchObject({
      digitalTrigger: proto.AnalogToDigitalTriggerType.JoyHigh,
      digitalTriggerValue: 4000,
    });
  });
});

describe('padLabel', () => {
  const name = (type: proto.DrumPadType) => proto.DrumPadType[type];
  it('names pads by type, numbering repeats', () => {
    const red = { id: 0, type: proto.DrumPadType.DrumPadRed, input: {} };
    const kick = { id: 1, type: proto.DrumPadType.DrumPadKick, input: {} };
    const pads = [red, kick, { ...kick, id: 2 }];
    expect(padLabel(pads, red, name)).toBe('DrumPadRed');
    expect(padLabel(pads, pads[2], name)).toBe('DrumPadKick 2');
  });
});

describe('layoutFromKit', () => {
  const ghKit = { pads: templatePads('gh') };

  it('maps a Guitar Hero kit to every Rock Band lane it can play', () => {
    const mappings = layoutFromKit([], KIT_ID, ghKit, proto.SubType.RockBandDrums);
    const outputs = mappings.map((m) => m.mapping);
    expect(outputs).toContainEqual({
      rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_YellowCymbal,
    });
    // the orange cymbal plays Rock Band's green cymbal
    expect(outputs).toContainEqual({
      rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_GreenCymbal,
    });
    expect(outputs).toContainEqual(rbKick);
    expect(mappings.every((m) => m.input?.drumKit?.deviceid === KIT_ID)).toBe(true);
  });

  it('replaces the lanes it covers and keeps everything else', () => {
    const start: proto.IMapping[] = [
      {
        mapping: ghRed,
        input: { gpio: { pin: 4, analog: true, pinMode: proto.PinMode.PullUp } },
      },
      {
        mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_Start },
        input: { gpio: { pin: 5, analog: false, pinMode: proto.PinMode.PullUp } },
      },
    ];
    const mappings = layoutFromKit(start, KIT_ID, ghKit, proto.SubType.GuitarHeroDrums);
    expect(mappings.filter((m) => m.mapping?.ghDrumAxis === ghRed.ghDrumAxis)).toHaveLength(1);
    expect(mappings[0]).toBe(start[1]);
  });

  it('leaves non drum profiles alone', () => {
    const start: proto.IMapping[] = [];
    expect(layoutFromKit(start, KIT_ID, ghKit, proto.SubType.Gamepad)).toBe(start);
  });
});
