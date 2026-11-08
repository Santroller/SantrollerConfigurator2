import { describe, expect, it } from 'vitest';
import { proto } from './config.js';
import { countMappingsDroppedBySubType, remapMappingsForSubType } from './subTypeMappings';

const gpio = (pin: number): proto.IInput => ({
  gpio: { pin, pinMode: proto.PinMode.PullUp, analog: false },
});

const profileWith = (subType: proto.SubType, mappings: proto.IMapping[]): proto.IProfile => ({
  opts: {
    uid: 0,
    name: '',
    faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    deviceToEmulate: subType,
  },
  mappings,
});

const start: proto.IMapping = {
  mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_Start },
  input: gpio(1),
};
const key: proto.IMapping = { mapping: { keycode: 4 }, input: gpio(9) };

describe('remapMappingsForSubType', () => {
  it('turns GH outputs into RB ones when switching to an RB guitar', () => {
    const profile = profileWith(proto.SubType.RockBandGuitar, [
      {
        mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow },
        input: gpio(2),
      },
      {
        mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue },
        input: gpio(3),
      },
      {
        mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt },
        input: gpio(4),
        min: 10,
      },
      start,
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.GuitarHeroGuitar, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Yellow },
      { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue },
      { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Tilt },
      start.mapping,
    ]);
    expect(mappings[2].input).toEqual(gpio(4));
    expect(mappings[2].min).toBe(10);
  });

  it('turns RB outputs into GH ones and drops the pickup selector', () => {
    const profile = profileWith(proto.SubType.GuitarHeroGuitar, [
      {
        mapping: { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Blue },
        input: gpio(2),
      },
      {
        mapping: { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy },
        input: gpio(3),
      },
      {
        mapping: { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup },
        input: gpio(4),
      },
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.RockBandGuitar, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue },
      { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
    ]);
  });

  it('drops instrument outputs the new type has no equivalent for, keeping generic ones', () => {
    const profile = profileWith(proto.SubType.RockBandDrums, [
      {
        mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green },
        input: gpio(2),
      },
      {
        mapping: { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad },
        input: gpio(3),
      },
      start,
      key,
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.GuitarHeroGuitar, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad },
      start.mapping,
      key.mapping,
    ]);
  });

  it('keeps outputs shared between related types', () => {
    const profile = profileWith(proto.SubType.ProGuitarSquier, [
      { mapping: { proButton: proto.ProGuitarButtonType.ProGuitar_Green }, input: gpio(2) },
    ]);
    expect(remapMappingsForSubType(proto.SubType.ProGuitarMustang, profile)).toHaveLength(1);
  });

  it('turns the sticks and triggers a wheel uses into wheel axes when switching to a wheel', () => {
    const profile = profileWith(proto.SubType.Wheel, [
      {
        mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
        input: gpio(2),
        center: 2000,
      },
      { mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger }, input: gpio(3) },
      { mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger }, input: gpio(4) },
      { mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY }, input: gpio(5) },
      start,
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.Gamepad, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { wheelAxis: proto.WheelAxisType.Wheel_Steering },
      { wheelAxis: proto.WheelAxisType.Wheel_Accelerator },
      { wheelAxis: proto.WheelAxisType.Wheel_Brake },
      { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY },
      start.mapping,
    ]);
    expect(mappings[0].center).toBe(2000);
  });

  it('turns wheel axes back into gamepad axes, dropping the clutch and handbrake', () => {
    const profile = profileWith(proto.SubType.Gamepad, [
      { mapping: { wheelAxis: proto.WheelAxisType.Wheel_Steering }, input: gpio(2) },
      { mapping: { wheelAxis: proto.WheelAxisType.Wheel_Brake }, input: gpio(3) },
      { mapping: { wheelAxis: proto.WheelAxisType.Wheel_Clutch }, input: gpio(4) },
      { mapping: { wheelAxis: proto.WheelAxisType.Wheel_Handbrake }, input: gpio(5) },
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.Wheel, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
      { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger },
    ]);
  });

  it('moves a 5 fret d-pad strum onto the GHL strum outputs', () => {
    const profile = profileWith(proto.SubType.LiveGuitar, [
      { mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }, input: gpio(2) },
      { mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown }, input: gpio(3) },
      { mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft }, input: gpio(4) },
      start,
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.GuitarHeroGuitar, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumUp },
      { ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumDown },
      { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft },
      start.mapping,
    ]);
    expect(mappings[0].input).toEqual(gpio(2));
  });

  it('moves the GHL strum back onto the d-pad for a 5 fret guitar', () => {
    const profile = profileWith(proto.SubType.RockBandGuitar, [
      {
        mapping: { ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumUp },
        input: gpio(2),
      },
      {
        mapping: {
          ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_StrumDown,
        },
        input: gpio(3),
      },
      {
        mapping: { ghlButton: proto.GuitarHeroLiveGuitarButtonType.GuitarHeroLiveGuitar_White1 },
        input: gpio(4),
      },
    ]);
    const mappings = remapMappingsForSubType(proto.SubType.LiveGuitar, profile)!;
    expect(mappings.map((m) => m.mapping)).toEqual([
      { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp },
      { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown },
    ]);
  });

  it('leaves a gamepad d-pad alone when switching to GHL', () => {
    const profile = profileWith(proto.SubType.LiveGuitar, [
      { mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp }, input: gpio(2) },
    ]);
    expect(remapMappingsForSubType(proto.SubType.Gamepad, profile)!.map((m) => m.mapping)).toEqual([
      { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp },
    ]);
  });

  it('leaves mappings alone when the device type is unchanged', () => {
    const mappings: proto.IMapping[] = [
      {
        mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green },
        input: gpio(2),
      },
    ];
    const rb = profileWith(proto.SubType.RockBandGuitar, mappings);
    expect(remapMappingsForSubType(proto.SubType.RockBandGuitar, rb)).toBe(mappings);
  });
});

describe('countMappingsDroppedBySubType', () => {
  it('counts only the mappings that would be dropped, not converted ones', () => {
    const profile = profileWith(proto.SubType.GuitarHeroGuitar, [
      {
        mapping: { ghButton: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green },
        input: gpio(2),
      },
      {
        mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
        input: gpio(3),
      },
      start,
    ]);
    expect(countMappingsDroppedBySubType(profile, proto.SubType.RockBandGuitar)).toBe(0);
    expect(countMappingsDroppedBySubType(profile, proto.SubType.GuitarHeroDrums)).toBe(2);
    expect(countMappingsDroppedBySubType(profile, proto.SubType.GuitarHeroGuitar)).toBe(0);
  });
});
