import { describe, expect, it } from 'vitest';
import { proto } from './config.js';
import { calibratesAsTrigger, fixAbsoluteTriggerDeadzones } from './triggerDeadzone';

const GH_WHAMMY = { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy };
const GH_TILT = { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt };
const configWith = (...mappings: Omit<proto.IMapping, 'input'>[]) =>
  ({ profiles: [{ mappings }] }) as proto.IConfig;
const deadzones = (config: proto.IConfig) => config.profiles![0].mappings!.map((m) => m.deadzone);

describe('calibratesAsTrigger', () => {
  it('matches the firmware trigger axes', () => {
    expect(calibratesAsTrigger({ mapping: GH_WHAMMY } as proto.IMapping)).toBe(true);
    expect(
      calibratesAsTrigger({
        mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger },
      } as proto.IMapping)
    ).toBe(true);
    expect(
      calibratesAsTrigger({
        mapping: { proAxis: proto.ProGuitarAxisType.ProGuitar_Tilt },
      } as proto.IMapping)
    ).toBe(false);
    expect(calibratesAsTrigger({ mapping: GH_TILT } as proto.IMapping)).toBe(false);
  });

  it('treats any section as a trigger', () => {
    expect(
      calibratesAsTrigger({
        mapping: GH_TILT,
        section: proto.AxisSection.AxisSectionPositive,
      } as proto.IMapping)
    ).toBe(true);
  });
});

describe('fixAbsoluteTriggerDeadzones', () => {
  it('turns a deadzone saved as a raw position back into a distance from min', () => {
    const config = configWith(
      { mapping: GH_WHAMMY, min: 56848, max: 61232, deadzone: 58097 },
      { mapping: GH_WHAMMY, min: 61232, max: 56848, deadzone: 60000 }
    );
    expect(fixAbsoluteTriggerDeadzones(config)).toBe(true);
    expect(deadzones(config)).toEqual([1249, 1232]);
  });

  it('leaves working deadzones, sticks and switches alone', () => {
    const config = configWith(
      { mapping: GH_WHAMMY, min: 56848, max: 61232, deadzone: 1249 },
      { mapping: GH_TILT, min: 0, max: 65535, center: 32768, deadzone: 40000 },
      { mapping: GH_WHAMMY, pressed: 65535, min: 56848, max: 61232, deadzone: 58097 }
    );
    expect(fixAbsoluteTriggerDeadzones(config)).toBe(false);
    expect(deadzones(config)).toEqual([1249, 40000, 58097]);
  });
});
