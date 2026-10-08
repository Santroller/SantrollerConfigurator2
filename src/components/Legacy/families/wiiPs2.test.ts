import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { LegacyImportContext } from '../context';
import { importLegacyConfig } from '../importLegacyConfig';
import { legacy } from '../legacy';
import { convertWiiPs2Settings } from './wiiPs2';

const DCT = legacy.DeviceControllerType;
const WII = legacy.WiiInputType;
const PS2 = legacy.Ps2InputType;
const SB = legacy.StandardButtonType;
const SA = legacy.StandardAxisType;
const LIB = legacy.InstrumentButtonType;

function run(deviceType: legacy.DeviceControllerType, bindings: legacy.ISerializedOutput[]) {
  const cfg = legacy.SerializedConfiguration.create({ deviceType, bindings });
  const { config, warnings } = importLegacyConfig(
    legacy.SerializedConfiguration.encode(cfg).finish()
  );
  const profile = config.profiles[0];
  const find = (output: proto.IOutput) =>
    profile.mappings.filter(
      (m) =>
        JSON.stringify(proto.Output.toObject(m.mapping as proto.Output)) === JSON.stringify(output)
    );
  return { config, profile, warnings, find };
}

const wiiIn = (type: legacy.WiiInputType): legacy.ISerializedInput => ({
  serializedWiiInputCombined: { type },
});
const ps2In = (type: legacy.Ps2InputType): legacy.ISerializedInput => ({
  serializedPs2InputCombined: { type },
});
const button = (
  input: legacy.ISerializedInput,
  type: legacy.StandardButtonType
): legacy.ISerializedOutput => ({
  serializedControllerButton: { input, type },
});
const axis = (
  input: legacy.ISerializedInput,
  type: legacy.StandardAxisType,
  min: number,
  max: number,
  deadzone = 0
): legacy.ISerializedOutput => ({ serializedControllerAxis: { input, type, min, max, deadzone } });
const wiiCombined = (outputs: legacy.ISerializedOutput[]): legacy.ISerializedOutput => ({
  serializedWiiCombinedOutput: { sda: 4, scl: 5, outputs },
});
const ps2Combined = (outputs: legacy.ISerializedOutput[]): legacy.ISerializedOutput => ({
  serializedPs2CombinedOutput: { mosi: 3, miso: 4, sck: 6, att: 7, ack: 8, outputs },
});

describe('Wii extensions', () => {
  it('imports a Wii guitar on a Rock Band guitar', () => {
    const { config, find, warnings } = run(DCT.DeviceControllerType_RockBandGuitar, [
      wiiCombined([
        {
          serializedGuitarButton: {
            input: wiiIn(WII.WiiInputType_GuitarGreen),
            type: LIB.InstrumentButtonType_Green,
          },
        },
        {
          serializedGuitarAxis: {
            input: wiiIn(WII.WiiInputType_GuitarWhammy),
            type: legacy.GuitarAxisType.GuitarAxisType_Whammy,
            min: 4000,
            max: 60000,
            deadzone: 8000,
          },
        },
        {
          serializedGuitarButton: {
            input: wiiIn(WII.WiiInputType_GuitarTapAll),
            type: LIB.InstrumentButtonType_SliderToFrets,
          },
        },
        {
          serializedGuitarAxis: {
            input: wiiIn(WII.WiiInputType_GuitarTapBar),
            type: legacy.GuitarAxisType.GuitarAxisType_Slider,
            min: 0,
            max: 65535,
          },
        },
        { serializedJoystickToDpad: { threshold: 16383, wii: true } },
        // written by the old configurator with enabled and peripheral swapped
        { serializedStartSelectHome: { wii: true, enabled: false, peripheral: true } },
      ]),
    ]);
    const wii = config.devices.find((d) => d.wii)!;
    expect(wii.wii!.i2c).toMatchObject({ sda: 4, scl: 5 });
    const deviceid = wii.deviceid;
    const RB = proto.RockBandGuitarButtonType;

    const frets = find({ rbButton: RB.RockBandGuitar_Green }).map(
      (m) => m.input?.wiiButton?.button
    );
    expect(frets).toEqual([
      proto.WiiButtonType.WiiButtonGuitarGreen,
      proto.WiiButtonType.WiiButtonGuitarTapGreen,
    ]);
    expect(find({ rbButton: RB.RockBandGuitar_SoloOrange })[0].input?.wiiButton).toEqual({
      deviceid,
      button: proto.WiiButtonType.WiiButtonGuitarTapOrange,
    });

    // the whammy reads the same values as before
    const [whammy] = find({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy });
    expect(whammy.input?.wiiAxis).toEqual({
      deviceid,
      axis: proto.WiiAxisType.WiiAxisGuitarWhammy,
    });
    expect(whammy).toMatchObject({ min: 4000, max: 60000, center: 0, deadzone: 8000 });

    // only the guitar's stick presses the dpad, the other extensions would read as held down
    const left = find({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft });
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({
      input: { wiiAxis: { deviceid, axis: proto.WiiAxisType.WiiAxisGuitarJoystickX } },
      trigger: proto.AnalogToDigitalTriggerType.JoyLow,
      triggerValue: 32768 - 16383,
    });
    const right = find({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight });
    expect(right.map((m) => m.triggerValue)).toContain(32768 + 16383);
    expect(warnings.some((w) => w.includes('other extensions than the guitar'))).toBe(true);

    const guide = find({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide });
    expect(guide).toHaveLength(4);
    expect(guide[1].input?.shortcut?.inputs).toEqual([
      { wiiButton: { deviceid, button: proto.WiiButtonType.WiiButtonGuitarPlus } },
      { wiiButton: { deviceid, button: proto.WiiButtonType.WiiButtonGuitarMinus } },
    ]);
  });

  it('keeps one extension for conflicting gamepad axes', () => {
    const { find, warnings } = run(DCT.DeviceControllerType_Gamepad, [
      wiiCombined([
        axis(
          wiiIn(WII.WiiInputType_ClassicLeftStickX),
          SA.StandardAxisType_LeftStickX,
          -30000,
          30000,
          4000
        ),
        axis(
          wiiIn(WII.WiiInputType_ClassicLeftTrigger),
          SA.StandardAxisType_LeftTrigger,
          0,
          65535,
          8000
        ),
        axis(
          wiiIn(WII.WiiInputType_NunchukStickX),
          SA.StandardAxisType_LeftStickX,
          -30000,
          30000,
          4000
        ),
        axis(wiiIn(WII.WiiInputType_GuitarWhammy), SA.StandardAxisType_LeftTrigger, 0, 65535),
        button(wiiIn(WII.WiiInputType_ClassicA), SB.StandardButtonType_A),
        button(wiiIn(WII.WiiInputType_NunchukC), SB.StandardButtonType_A),
      ]),
    ]);
    const [stick, ...rest] = find({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX });
    expect(rest).toHaveLength(0);
    expect(stick.input?.wiiAxis?.axis).toBe(proto.WiiAxisType.WiiAxisClassicLeftStickX);
    // signed stick calibration moves up into the unsigned range
    expect(stick).toMatchObject({ min: 2768, max: 62768, center: 32768, deadzone: 4000 });

    // triggers read 0 when another extension is plugged in, which is fine
    const triggers = find({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger });
    expect(triggers).toHaveLength(2);
    expect(triggers[0]).toMatchObject({ min: 0, max: 65535, center: 0 });
    expect(find({ gamepadButton: proto.GamepadButtonType.Gamepad_A })).toHaveLength(2);
    expect(warnings.some((w) => w.includes('Classic Controller'))).toBe(true);
  });

  it('imports a standalone Wii input with its own pins', () => {
    const { config, find, warnings } = run(DCT.DeviceControllerType_Gamepad, [
      button(
        {
          serializedAnalogToDigital: {
            child: {
              serializedWiiInput: {
                sda: 8,
                scl: 9,
                type: WII.WiiInputType_NunchukStickY,
                peripheral: true,
              },
            },
            type: legacy.AnalogToDigitalType.AnalogToDigitalType_JoyHigh,
            threshold: 10000,
          },
        },
        SB.StandardButtonType_DpadUp
      ),
      button(
        { serializedWiiInput: { sda: 8, scl: 9, type: WII.WiiInputType_NunchukZ } },
        SB.StandardButtonType_B
      ),
      button(
        { serializedWiiInput: { sda: 8, scl: 9, type: WII.WiiInputType_NunchukAccelerationX } },
        SB.StandardButtonType_X
      ),
    ]);
    expect(config.devices.filter((d) => d.wii)).toHaveLength(1);
    const [up] = find({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp });
    expect(up).toMatchObject({
      trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
      triggerValue: 42768,
    });
    expect(
      find({ gamepadButton: proto.GamepadButtonType.Gamepad_B })[0].input?.wiiButton?.button
    ).toBe(proto.WiiButtonType.WiiButtonNunchukZ);
    expect(find({ gamepadButton: proto.GamepadButtonType.Gamepad_X })).toHaveLength(0);
    expect(warnings.some((w) => w.includes('secondary Pico'))).toBe(true);
    expect(warnings.some((w) => w.includes('acceleration'))).toBe(true);
  });
});

describe('PS2 controllers', () => {
  it('imports a PS2 controller on a DualShock 2 slot', () => {
    const { config, profile, find, warnings } = run(DCT.DeviceControllerType_Gamepad, [
      ps2Combined([
        button(ps2In(PS2.Ps2InputType_Cross), SB.StandardButtonType_A),
        button(ps2In(PS2.Ps2InputType_GuitarGreen), SB.StandardButtonType_A),
        axis(ps2In(PS2.Ps2InputType_LeftStickX), SA.StandardAxisType_LeftStickX, -30000, 30000),
        axis(ps2In(PS2.Ps2InputType_Dualshock2L2), SA.StandardAxisType_LeftTrigger, 0, 65535),
        {
          serializedControllerAxis: {
            input: {
              serializedDigitalToAnalog: {
                child: ps2In(PS2.Ps2InputType_L2),
                on: 65535,
                trigger: true,
              },
            },
            type: SA.StandardAxisType_LeftTrigger,
            min: 0,
            max: 65535,
          },
        },
        { serializedJoystickToDpad: { threshold: 16383, wii: false } },
        { serializedStartSelectHome: { wii: false } },
      ]),
    ]);
    const psx = config.devices.find((d) => d.psx)!.psx!;
    expect(psx).toMatchObject({ attPin: 7, ackPin: 8, spi: { mosi: 3, miso: 4, sck: 6 } });
    expect(profile.assignments[0].assignments).toContainEqual(
      expect.objectContaining({ ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeDualshock2 })
    );

    // inputs use the slot, not the device id
    const a = find({ gamepadButton: proto.GamepadButtonType.Gamepad_A });
    expect(a).toHaveLength(1);
    expect(a[0].input?.ps2Button).toEqual({
      deviceid: 1,
      button: proto.PS2ButtonType.PS2ButtonCross,
    });

    const [stick] = find({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX });
    expect(stick).toMatchObject({ min: 2768, max: 62768, center: 32768 });
    // the digital L2 wasn't used on a DualShock 2, the pressure was
    const triggers = find({ gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger });
    expect(triggers).toHaveLength(1);
    expect(triggers[0].input?.ps2Axis?.axis).toBe(proto.PS2AxisType.PS2AxisDualshock2L2);

    expect(find({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown })[0]).toMatchObject({
      input: { ps2Axis: { deviceid: 1, axis: proto.PS2AxisType.PS2AxisLeftStickY } },
      trigger: proto.AnalogToDigitalTriggerType.JoyLow,
      triggerValue: 32768 - 16383,
    });
    expect(
      find({ gamepadButton: proto.GamepadButtonType.Gamepad_Guide })[0].input?.shortcut?.inputs
    ).toEqual([
      { ps2Button: { deviceid: 1, button: proto.PS2ButtonType.PS2ButtonStart } },
      { ps2Button: { deviceid: 1, button: proto.PS2ButtonType.PS2ButtonSelect } },
    ]);
    expect(warnings.some((w) => w.includes('DualShock 2'))).toBe(true);
  });

  it('imports a PS2 guitar', () => {
    const { profile, find } = run(DCT.DeviceControllerType_GuitarHeroGuitar, [
      ps2Combined([
        {
          serializedGuitarButton: {
            input: ps2In(PS2.Ps2InputType_GuitarGreen),
            type: LIB.InstrumentButtonType_Green,
          },
        },
        button(ps2In(PS2.Ps2InputType_Cross), SB.StandardButtonType_A),
        button(ps2In(PS2.Ps2InputType_DpadUp), SB.StandardButtonType_DpadUp),
        button(ps2In(PS2.Ps2InputType_Start), SB.StandardButtonType_Start),
        {
          serializedGuitarAxis: {
            input: ps2In(PS2.Ps2InputType_GuitarWhammy),
            type: legacy.GuitarAxisType.GuitarAxisType_Whammy,
            min: 0,
            max: 65535,
          },
        },
        {
          serializedGuitarButton: {
            input: ps2In(PS2.Ps2InputType_GuitarTapAll),
            type: LIB.InstrumentButtonType_SliderToFrets,
          },
        },
      ]),
    ]);
    expect(profile.assignments[0].assignments).toContainEqual(
      expect.objectContaining({ ps2Cnt: proto.PS2ControllerType.PS2ControllerTypeGuitar })
    );
    const GH = proto.GuitarHeroGuitarButtonType;
    expect(
      find({ ghButton: GH.GuitarHeroGuitar_Green }).map((m) => m.input?.ps2Button?.button)
    ).toEqual([
      proto.PS2ButtonType.PS2ButtonGuitarGreen,
      proto.PS2ButtonType.PS2ButtonGuitarTapGreen,
    ]);
    expect(find({ gamepadButton: proto.GamepadButtonType.Gamepad_A })).toHaveLength(0);
    expect(
      find({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp })[0].input?.ps2Button?.button
    ).toBe(proto.PS2ButtonType.PS2ButtonGuitarDpadUp);
    expect(
      find({ gamepadButton: proto.GamepadButtonType.Gamepad_Start })[0].input?.ps2Button?.button
    ).toBe(proto.PS2ButtonType.PS2ButtonGuitarStart);
    expect(
      find({ ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy })[0]
    ).toMatchObject({
      input: { ps2Axis: { deviceid: 1, axis: proto.PS2AxisType.PS2AxisGuitarWhammy } },
      min: 0,
      max: 65535,
    });
  });

  it('imports a standalone PS2 input onto the same slot', () => {
    const pins = { mosi: 3, miso: 4, sck: 6, att: 7, ack: 8 };
    const { config, profile, find } = run(DCT.DeviceControllerType_Gamepad, [
      button(
        { serializedPs2Input: { ...pins, type: PS2.Ps2InputType_Triangle } },
        SB.StandardButtonType_Y
      ),
      button(
        { serializedPs2Input: { ...pins, type: PS2.Ps2InputType_TaikoRimLeft } },
        SB.StandardButtonType_LeftShoulder
      ),
    ]);
    expect(config.devices.filter((d) => d.psx)).toHaveLength(1);
    expect(profile.assignments[0].assignments!.filter((a) => a.ps2Cnt != null)).toHaveLength(1);
    expect(find({ gamepadButton: proto.GamepadButtonType.Gamepad_Y })[0].input?.ps2Button).toEqual({
      deviceid: 1,
      button: proto.PS2ButtonType.PS2ButtonTriangle,
    });
    // taiko drums show up as digital controllers, so read the button the drum presses
    expect(
      find({ gamepadButton: proto.GamepadButtonType.Gamepad_LeftShoulder })[0].input?.ps2Button
        ?.button
    ).toBe(proto.PS2ButtonType.PS2ButtonL1);
  });
});

describe('console output', () => {
  it('sets up Wii and PS2 emulation', () => {
    const old = legacy.SerializedConfiguration.create({
      hasWiiOutput: true,
      wiiOutputSda: 10,
      wiiOutputScl: 11,
      hasWiiOutputEn: true,
      wiiOutputEn: 12,
      hasPs2Output: true,
      ps2OutputMosi: 13,
      ps2OutputMiso: 14,
      ps2OutputSck: 15,
      ps2OutputAtt: 16,
      ps2OutputAck: 17,
    });
    const ctx = new LegacyImportContext(old, proto.SubType.Gamepad);
    expect(convertWiiPs2Settings(ctx)).toEqual([{ wiiEmulation: {} }, { ps2Emulation: {} }]);
    expect(ctx.devices.find((d) => d.wiiEmulation)!.wiiEmulation!.i2c).toMatchObject({
      sda: 10,
      scl: 11,
    });
    expect(ctx.devices.find((d) => d.psxEmulation)!.psxEmulation).toEqual({
      dataPin: 14,
      commandPin: 13,
      clockPin: 15,
      attentionPin: 16,
      acknowledgePin: 17,
    });
    expect(ctx.warnings.some((w) => w.includes('enable pin'))).toBe(true);
  });

  it('does nothing without console output', () => {
    const ctx = new LegacyImportContext(
      legacy.SerializedConfiguration.create({}),
      proto.SubType.Gamepad
    );
    expect(convertWiiPs2Settings(ctx)).toEqual([]);
    expect(ctx.devices).toHaveLength(0);
  });
});
