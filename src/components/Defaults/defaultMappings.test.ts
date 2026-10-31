import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import {
  getAssignmentHostType,
  getDefaultMappings,
  getPs2Defaults,
  getWiiDefaults,
} from './defaultMappings';

describe('Classic Controller trigger defaults', () => {
  // The Pro's triggers are ZL / ZR (L / R are its shoulder buttons), the original's are L / R
  it.each([
    [proto.WiiExtType.WiiClassicController, false],
    [proto.WiiExtType.WiiClassicControllerPro, true],
    [undefined, false],
  ])('uses one combined input per trigger for extension %s', (wiiExtType, pro) => {
    const mappings = getWiiDefaults(proto.SubType.Gamepad, 2, { wiiExtType });

    for (const [button, axis] of [
      [
        pro ? proto.WiiButtonType.WiiButtonClassicZl : proto.WiiButtonType.WiiButtonClassicLt,
        proto.GamepadAxisType.Gamepad_LeftTrigger,
      ],
      [
        pro ? proto.WiiButtonType.WiiButtonClassicZr : proto.WiiButtonType.WiiButtonClassicRt,
        proto.GamepadAxisType.Gamepad_RightTrigger,
      ],
    ]) {
      const triggerMappings = mappings.filter((mapping) => mapping.mapping?.gamepadAxis === axis);
      expect(triggerMappings).toEqual([
        {
          input: { wiiButton: { button, deviceid: 2 } },
          mapping: { gamepadAxis: axis },
          min: 0,
          max: 65535,
        },
      ]);
      expect(
        mappings.filter((mapping) => mapping.input?.wiiButton?.button === button)
      ).toHaveLength(1);
    }
    expect(
      mappings.some(
        (mapping) =>
          mapping.input?.wiiAxis?.axis === proto.WiiAxisType.WiiAxisClassicLeftTrigger ||
          mapping.input?.wiiAxis?.axis === proto.WiiAxisType.WiiAxisClassicRightTrigger
      )
    ).toBe(false);
  });
});

describe('Dancepad defaults', () => {
  it('maps PS2 D-pad directions and corner face buttons', () => {
    const mappings = getPs2Defaults(proto.SubType.Dancepad, 2, {
      ps2CntType: proto.PS2ControllerType.PS2ControllerTypeDualshock2,
    });

    expect(
      mappings.map((mapping) => [mapping.input?.ps2Button?.button, mapping.mapping?.gamepadButton])
    ).toEqual([
      [proto.PS2ButtonType.PS2ButtonDpadUp, proto.GamepadButtonType.Gamepad_DpadUp],
      [proto.PS2ButtonType.PS2ButtonDpadDown, proto.GamepadButtonType.Gamepad_DpadDown],
      [proto.PS2ButtonType.PS2ButtonDpadLeft, proto.GamepadButtonType.Gamepad_DpadLeft],
      [proto.PS2ButtonType.PS2ButtonDpadRight, proto.GamepadButtonType.Gamepad_DpadRight],
      [proto.PS2ButtonType.PS2ButtonCross, proto.GamepadButtonType.Gamepad_A],
      [proto.PS2ButtonType.PS2ButtonCircle, proto.GamepadButtonType.Gamepad_B],
      [proto.PS2ButtonType.PS2ButtonTriangle, proto.GamepadButtonType.Gamepad_Y],
      [proto.PS2ButtonType.PS2ButtonSquare, proto.GamepadButtonType.Gamepad_X],
      [proto.PS2ButtonType.PS2ButtonSelect, proto.GamepadButtonType.Gamepad_Back],
      [proto.PS2ButtonType.PS2ButtonStart, proto.GamepadButtonType.Gamepad_Start],
    ]);
    expect(mappings.every((mapping) => mapping.input?.ps2Button?.deviceid === 2)).toBe(true);
  });

  it('maps Wii Classic Controller D-pad directions and face buttons when emulating a dancepad', () => {
    const mappings = getWiiDefaults(proto.SubType.Dancepad, 1, {
      wiiExtType: proto.WiiExtType.WiiClassicController,
    });

    expect(
      mappings.map((mapping) => [mapping.input?.wiiButton?.button, mapping.mapping?.gamepadButton])
    ).toEqual([
      [proto.WiiButtonType.WiiButtonClassicDPadUp, proto.GamepadButtonType.Gamepad_DpadUp],
      [proto.WiiButtonType.WiiButtonClassicDPadDown, proto.GamepadButtonType.Gamepad_DpadDown],
      [proto.WiiButtonType.WiiButtonClassicDPadLeft, proto.GamepadButtonType.Gamepad_DpadLeft],
      [proto.WiiButtonType.WiiButtonClassicDPadRight, proto.GamepadButtonType.Gamepad_DpadRight],
      [proto.WiiButtonType.WiiButtonClassicA, proto.GamepadButtonType.Gamepad_A],
      [proto.WiiButtonType.WiiButtonClassicB, proto.GamepadButtonType.Gamepad_B],
      [proto.WiiButtonType.WiiButtonClassicY, proto.GamepadButtonType.Gamepad_Y],
      [proto.WiiButtonType.WiiButtonClassicX, proto.GamepadButtonType.Gamepad_X],
      [proto.WiiButtonType.WiiButtonClassicMinus, proto.GamepadButtonType.Gamepad_Back],
      [proto.WiiButtonType.WiiButtonClassicPlus, proto.GamepadButtonType.Gamepad_Start],
    ]);
    expect(mappings.every((mapping) => mapping.input?.wiiButton?.deviceid === 1)).toBe(true);
  });
});

describe('DJ Hero turntable defaults', () => {
  it('includes all face buttons and d-pad directions', () => {
    const mappings = getDefaultMappings('gpio', proto.SubType.DjHeroTurntable);

    expect(
      mappings.map((mapping) => mapping.mapping?.gamepadButton).filter((button) => button != null)
    ).toEqual([
      proto.GamepadButtonType.Gamepad_A,
      proto.GamepadButtonType.Gamepad_B,
      proto.GamepadButtonType.Gamepad_X,
      proto.GamepadButtonType.Gamepad_Y,
      proto.GamepadButtonType.Gamepad_DpadUp,
      proto.GamepadButtonType.Gamepad_DpadDown,
      proto.GamepadButtonType.Gamepad_DpadLeft,
      proto.GamepadButtonType.Gamepad_DpadRight,
      proto.GamepadButtonType.Gamepad_Back,
      proto.GamepadButtonType.Gamepad_Start,
      proto.GamepadButtonType.Gamepad_Guide,
    ]);
  });
});

// An axis output driven by a digital input needs a pressed value, and an analog one needs a
// range: with neither, the firmware calibrates against 0-0 and the axis never moves.
const isAxisOutput = (m: proto.IMapping) =>
  Object.entries(m.mapping ?? {}).some(([k, v]) => k.endsWith('Axis') && v != null);
const calibrated = (m: proto.IMapping) => m.pressed != null || (m.max ?? 0) > (m.min ?? 0);

describe('drum defaults', () => {
  const wiiDrums = { wiiExtType: proto.WiiExtType.WiiGuitarHeroDrums };
  it.each(['midiSerial', 'bhDrum', 'worldTourDrum'])(
    'holds both Rock Band kick pedals for %s MIDI hits',
    (deviceType) => {
      const kicks = getDefaultMappings(deviceType, proto.SubType.RockBandDrums, 1).filter(
        (m) => m.mapping?.rbDrumButton != null
      );
      expect(kicks.map((m) => [m.input?.midi?.midiNote?.note, m.mapping?.rbDrumButton])).toEqual([
        [36, proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal],
        [35, proto.RockBandDrumsButtonType.RockBandDrums_Kick1Pedal],
        [44, proto.RockBandDrumsButtonType.RockBandDrums_Kick2Pedal],
      ]);
      for (const kick of kicks) {
        expect(kick.debounce).toBe(30);
        expect(kick.input?.midi?.deviceid).toBe(1);
      }
    }
  );
  for (const subType of [proto.SubType.RockBandDrums, proto.SubType.GuitarHeroDrums]) {
    const name = proto.SubType[subType];
    it(`calibrates every Wii drum axis for ${name}`, () => {
      const axes = getDefaultMappings('wii', subType, 1, wiiDrums).filter(isAxisOutput);
      expect(axes.length).toBeGreaterThan(0);
      expect(axes.filter((m) => !calibrated(m))).toEqual([]);
    });
    it(`reads Wii ${name} pads from the kit's MIDI stream`, () => {
      const pads = getDefaultMappings('wii', subType, 1, wiiDrums).filter(
        (m) => m.mapping?.rbDrumAxis != null || m.mapping?.ghDrumAxis != null
      );
      expect(pads.length).toBeGreaterThan(0);
      for (const pad of pads) {
        expect(pad.input?.midi?.sourceType).toBe(proto.MidiInputSourceType.MidiInputSourceType_Wii);
        expect(pad.input?.midi?.deviceid).toBe(1);
      }
    });
    it(`holds MIDI drum hits for ${name}`, () => {
      const pads = getDefaultMappings('midiSerial', subType, 1).filter(
        (m) => m.input?.midi?.midiNote && isAxisOutput(m)
      );
      expect(pads.length).toBeGreaterThan(0);
      for (const pad of pads) {
        expect(calibrated(pad)).toBe(true);
        expect(pad.debounce).toBeGreaterThan(0);
        expect(pad.peakBased).toBe(true);
      }
    });
  }
});

describe('USB host tilt defaults', () => {
  it('centres tilt, as every host guitar rests in the middle when horizontal', () => {
    for (const subType of [
      proto.SubType.GuitarHeroGuitar,
      proto.SubType.RockBandGuitar,
      proto.SubType.LiveGuitar,
      proto.SubType.ProGuitarMustang,
    ]) {
      const tilt = getDefaultMappings('usbHost', subType).filter(
        (m) =>
          m.mapping?.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt ||
          m.mapping?.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Tilt ||
          m.mapping?.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt ||
          m.mapping?.proAxis === proto.ProGuitarAxisType.ProGuitar_Tilt
      );
      expect(tilt).toHaveLength(1);
      expect(tilt[0].center).toBe(32768);
    }
  });
});

describe('USB host defaults for a different emulated type', () => {
  it('decodes the host as itself but outputs the emulated type', () => {
    const mappings = getDefaultMappings(
      'usbHost',
      proto.SubType.RockBandGuitar,
      3,
      undefined,
      proto.SubType.ProGuitarMustang
    );
    expect(
      mappings.find(
        (m) =>
          m.input?.usbButton?.button?.proButton === proto.ProGuitarButtonType.ProGuitar_SoloBlue
      )?.mapping
    ).toEqual({ rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue });
    expect(
      mappings.find(
        (m) => m.input?.usbAxis?.axis?.proAxis === proto.ProGuitarAxisType.ProGuitar_Tilt
      )?.mapping
    ).toEqual({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Tilt });
    // fret numbers and velocities have no Rock Band guitar equivalent
    expect(mappings.some((m) => m.mapping?.proAxis != null || m.mapping?.proButton != null)).toBe(
      false
    );
    // gamepad outputs work for every type
    expect(
      mappings.find(
        (m) => m.input?.usbButton?.button?.gamepadButton === proto.GamepadButtonType.Gamepad_Start
      )?.mapping
    ).toEqual({ gamepadButton: proto.GamepadButtonType.Gamepad_Start });
  });

  it('maps solo frets to tap frets on a Guitar Hero guitar', () => {
    const mappings = getDefaultMappings(
      'bt',
      proto.SubType.GuitarHeroGuitar,
      1,
      undefined,
      proto.SubType.RockBandGuitar
    );
    expect(
      mappings.find(
        (m) =>
          m.input?.btButton?.button?.rbButton ===
          proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed
      )?.mapping
    ).toEqual({ ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed });
    // Guitar Hero guitars have no pickup selector
    expect(mappings.some((m) => m.mapping?.rbAxis != null)).toBe(false);
  });

  it('maps a pro keyboard to a KeyboardMania controller', () => {
    const mappings = getDefaultMappings(
      'usbHost',
      proto.SubType.KeyboardMania,
      2,
      undefined,
      proto.SubType.ProKeys
    );
    // keys are read as a button range from the pro keyboard, and only two octaves fit
    expect(
      mappings.find((m) => m.input?.usbButton?.button?.proKeyMultiple != null)?.mapping
    ).toEqual({ proKeyMultiple: 24 });
    expect(
      mappings.find(
        (m) => m.input?.usbButton?.button?.gamepadButton === proto.GamepadButtonType.Gamepad_Start
      )?.mapping
    ).toEqual({ kbmButton: proto.KeyboardManiaButtonType.KeyboardMania_Start });
    expect(
      mappings.find(
        (m) => m.input?.usbButton?.button?.gamepadButton === proto.GamepadButtonType.Gamepad_Back
      )?.mapping
    ).toEqual({ kbmButton: proto.KeyboardManiaButtonType.KeyboardMania_Select });
    // KeyboardMania has no gamepad report, so nothing is left writing into one
    expect(
      mappings.every((m) => m.mapping?.kbmButton != null || m.mapping?.proKeyMultiple != null)
    ).toBe(true);
  });

  it('keeps everything when the host matches the emulated type', () => {
    const mappings = getDefaultMappings('usbHost', proto.SubType.ProGuitarMustang, 0);
    expect(
      mappings.every((m) => m.mapping === (m.input?.usbButton?.button ?? m.input?.usbAxis?.axis))
    ).toBe(true);
    expect(mappings.length).toBeGreaterThan(20);
  });
});

describe('keyboard host defaults', () => {
  it('passes every key through to a keyboard profile', () => {
    expect(
      getDefaultMappings(
        'usbHost',
        proto.SubType.KeyboardMouse,
        2,
        undefined,
        proto.SubType.KeyboardMouse
      )
    ).toEqual([
      {
        mapping: { keyboardPassthrough: true },
        input: { usbButton: { deviceid: 2, button: { keyboardPassthrough: true } } },
      },
    ]);
  });

  it('maps nothing for other profiles', () => {
    expect(
      getDefaultMappings(
        'usbHost',
        proto.SubType.Gamepad,
        2,
        undefined,
        proto.SubType.KeyboardMouse
      )
    ).toEqual([]);
  });
});

describe('host type of an assignment', () => {
  it.each<[proto.IProfileAssignmentInfo | undefined, proto.SubType]>([
    [{ usbType: proto.SubType.Gamepad }, proto.SubType.Gamepad],
    [
      { usbDevice: { vid: 1, pid: 2, subtype: proto.SubType.LiveGuitar } },
      proto.SubType.LiveGuitar,
    ],
    [{ bluetoothType: proto.SubType.RockBandDrums }, proto.SubType.RockBandDrums],
    [{ bluetoothDevice: { vid: 1, pid: 2, subtype: proto.SubType.Taiko } }, proto.SubType.Taiko],
    // any device
    [{ usbDevice: { vid: 1, pid: 2 } }, proto.SubType.DjHeroTurntable],
    [undefined, proto.SubType.DjHeroTurntable],
  ])('reads %o', (assignment, expected) => {
    expect(getAssignmentHostType(assignment, proto.SubType.DjHeroTurntable)).toBe(expected);
  });

  // A gamepad slot on a turntable profile used to get turntable inputs, which a gamepad host
  // reports as 0, pinning the tables at full speed
  it('only reads gamepad inputs from a gamepad slot on a turntable profile', () => {
    const mappings = getDefaultMappings(
      'usbHost',
      proto.SubType.DjHeroTurntable,
      1,
      undefined,
      getAssignmentHostType({ usbType: proto.SubType.Gamepad }, proto.SubType.DjHeroTurntable)
    );
    expect(mappings.length).toBeGreaterThan(0);
    expect(
      mappings.every(
        (m) =>
          m.input?.usbButton?.button?.gamepadButton != null ||
          m.input?.usbAxis?.axis?.gamepadAxis != null
      )
    ).toBe(true);
  });
});
