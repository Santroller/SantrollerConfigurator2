import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';
import { MIDI_PERCUSSION_CHANNEL } from '@/devices/midi';
import { getPresetKeyLabels, getPresetMappings, GM_DRUMS, MAPPING_PRESETS } from './mappingPresets';

const preset = (id: string) => MAPPING_PRESETS.find((p) => p.id === id)!;
const wiiGuitar = { wiiExtType: proto.WiiExtType.WiiGuitarHeroGuitar };
const keyFor = (mappings: proto.IMapping[], button: proto.WiiButtonType) =>
  mappings.filter((m) => m.input?.wiiButton?.button === button).map((m) => m.mapping?.keycode);

describe('Fortnite Festival presets', () => {
  it('maps a Wii guitar to the lead keys', () => {
    const mappings = getPresetMappings(preset('festival_guitar'), 'wii', 1, wiiGuitar);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarGreen)).toEqual([CODE_TO_HID.KeyD]);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarOrange)).toEqual([CODE_TO_HID.KeyL]);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarStrumUp)).toEqual([
      CODE_TO_HID.ArrowUp,
    ]);
    // every mapping that survives is a key
    expect(mappings.every((m) => m.mapping?.keycode != null)).toBe(true);
  });

  it('maps a Wii guitar to the pro keys, with whammy as a held key', () => {
    const mappings = getPresetMappings(preset('festival_pro_guitar'), 'wii', 1, wiiGuitar);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarGreen)).toEqual([
      CODE_TO_HID.Digit1,
    ]);
    expect(keyFor(mappings, proto.WiiButtonType.WiiButtonGuitarStrumDown)).toEqual([
      CODE_TO_HID.ControlRight,
    ]);
    const whammy = mappings.find((m) => m.mapping?.keycode === CODE_TO_HID.Slash);
    expect(whammy?.trigger).toBeDefined();
  });

  // A Guitar Hero kit as the drum kit guide sets one up: a piezo per pad, and on the kick
  const GHD = proto.GuitarHeroDrumsAxisType;
  const ghPad = (axis: proto.GuitarHeroDrumsAxisType, pin: number): proto.IMapping => ({
    mapping: { ghDrumAxis: axis },
    input: { gpio: { pin, pinMode: proto.PinMode.Floating, analog: true } },
    debounce: 5,
  });
  const ghKit = [
    ghPad(GHD.GuitarHeroDrums_RedPad, 26),
    ghPad(GHD.GuitarHeroDrums_YellowPad, 27),
    ghPad(GHD.GuitarHeroDrums_BluePad, 28),
    ghPad(GHD.GuitarHeroDrums_OrangePad, 1),
    ghPad(GHD.GuitarHeroDrums_GreenPad, 2),
    ghPad(GHD.GuitarHeroDrums_KickPedal, 3),
  ];
  const keysFrom = (id: string) =>
    ghKit.map((pad) =>
      preset(id)
        .convert(pad)
        .map((m) => [m.mapping?.keycode, m.debounce])
    );

  it('maps a Guitar Hero kit to the pro drum keys, with its cymbals as Rock Band cymbals', () => {
    expect(keysFrom('festival_pro_drums')).toEqual([
      [[CODE_TO_HID.KeyD, 5]],
      [[CODE_TO_HID.KeyR, 5]],
      [[CODE_TO_HID.KeyJ, 5]],
      [[CODE_TO_HID.KeyI, 5]],
      [[CODE_TO_HID.KeyK, 5]],
      [[CODE_TO_HID.Space, 5]],
    ]);
  });

  it('maps a Guitar Hero kit to the four drum lanes', () => {
    expect(keysFrom('festival_drums')).toEqual([
      [[CODE_TO_HID.KeyF, 5]],
      [[CODE_TO_HID.KeyG, 5]],
      [[CODE_TO_HID.KeyH, 5]],
      // orange and green both play the green lane
      [[CODE_TO_HID.KeyJ, 5]],
      [[CODE_TO_HID.KeyJ, 5]],
      [[CODE_TO_HID.KeyK, 5]],
    ]);
  });
});

describe('Preset key labels', () => {
  const namesFor = (labels: { key: number; names: string[] }[], code: keyof typeof CODE_TO_HID) =>
    labels.find((l) => l.key === CODE_TO_HID[code])?.names;

  it('names each Festival guitar key after what it plays', () => {
    const labels = getPresetKeyLabels(preset('festival_guitar'), 'wii', 1, wiiGuitar);
    expect(namesFor(labels, 'KeyD')).toEqual(['outputs.GuitarHeroGuitar_Green']);
    expect(namesFor(labels, 'ArrowUp')).toEqual(['keyboard.presetLabels.strumUp']);
    expect(new Set(labels.map((l) => l.key)).size).toBe(labels.length);
  });

  it('lists everything sharing a key, once each', () => {
    const labels = getPresetKeyLabels(preset('festival_drums'), 'gpio');
    // without pro, cymbals play as their matching pad
    expect(namesFor(labels, 'KeyG')).toEqual([
      'outputs.RockBandDrums_YellowPad',
      'outputs.RockBandDrums_YellowCymbal',
    ]);
    expect(namesFor(labels, 'KeyK')).toEqual([
      'outputs.RockBandDrums_Kick1Pedal',
      'outputs.RockBandDrums_Kick2Pedal',
    ]);
    for (const { names } of labels) {
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('labels nothing for presets that send no keys', () => {
    expect(getPresetKeyLabels(preset('midi_drums_rb'), 'gpio')).toEqual([]);
  });
});

describe('PS2 guitar on PS3 preset', () => {
  it('lays a Wii guitar out like a PS2 guitar and holds d-pad left', () => {
    const mappings = getPresetMappings(preset('ps2_guitar_on_ps3'), 'wii', 1, wiiGuitar);
    const green = mappings.find(
      (m) => m.input?.wiiButton?.button === proto.WiiButtonType.WiiButtonGuitarGreen
    );
    expect(green?.mapping).toEqual({ gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger });
    expect(green?.pressed).toBe(65535);
    expect(
      mappings.filter((m) => m.mapping?.gamepadButton === proto.GamepadButtonType.Gamepad_DpadLeft)
    ).toEqual([
      {
        mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft },
        input: { fixed: { value: 65535 } },
      },
    ]);
  });
});

describe('General MIDI drum presets', () => {
  const notes = (mappings: proto.IMapping[]) => mappings.map((m) => m.mapping?.midiNote?.note);

  it('maps Rock Band pads and cymbals to drum kit notes on channel 10', () => {
    const mappings = getPresetMappings(preset('midi_drums_rb'), 'gpio');
    expect(notes(mappings)).toEqual([
      GM_DRUMS.snare,
      GM_DRUMS.highTom,
      GM_DRUMS.lowTom,
      GM_DRUMS.floorTom,
      GM_DRUMS.closedHiHat,
      GM_DRUMS.ride,
      GM_DRUMS.crash,
      GM_DRUMS.kick,
      GM_DRUMS.kick,
    ]);
    expect(mappings.every((m) => m.mapping?.midiNote?.channel === MIDI_PERCUSSION_CHANNEL)).toBe(
      true
    );
  });

  it('keeps a pad analog, with its calibration for the velocity', () => {
    const mappings = getPresetMappings(preset('midi_drums_rb'), 'gpio');
    const snare = mappings.find((m) => m.mapping?.midiNote?.note === GM_DRUMS.snare)!;
    expect(snare.input?.gpio?.analog).toBe(true);
    expect(snare.trigger).toBe(proto.AnalogToDigitalTriggerType.JoyHigh);
    expect(snare.min).toBe(0);
    expect(snare.max).toBe(65535);
    expect(snare.debounce).toBe(30);
  });

  it('maps Guitar Hero pads, including the kick axis', () => {
    const mappings = getPresetMappings(preset('midi_drums_gh'), 'gpio');
    expect(notes(mappings)).toEqual([
      GM_DRUMS.snare,
      GM_DRUMS.closedHiHat,
      GM_DRUMS.highTom,
      GM_DRUMS.crash,
      GM_DRUMS.floorTom,
      GM_DRUMS.kick,
    ]);
  });
});
