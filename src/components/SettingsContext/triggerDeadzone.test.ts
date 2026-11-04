import { describe, expect, it } from 'vitest';
import { proto } from './config.js';
import {
  calibratesAsTrigger,
  fixAbsoluteTriggerDeadzones,
  migrateMappingTriggers,
} from './triggerDeadzone';

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

  it('treats a wheel pedal as a trigger and its steering as a stick', () => {
    expect(
      calibratesAsTrigger({
        mapping: { wheelAxis: proto.WheelAxisType.Wheel_Brake },
      } as proto.IMapping)
    ).toBe(true);
    expect(
      calibratesAsTrigger({
        mapping: { wheelAxis: proto.WheelAxisType.Wheel_Steering },
      } as proto.IMapping)
    ).toBe(false);
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

  describe('migrateMappingTriggers', () => {
    it('moves mapping and nested cycle triggers to the input, preferring mapping settings', () => {
      const config = {
        profiles: [
          {
            mappings: [
              {
                input: {
                  cycle: {
                    trigger: proto.AnalogToDigitalTriggerType.JoyLow,
                    triggerValue: 12000,
                  },
                },
                trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
                triggerValue: 40000,
                maxTriggerValue: 50000,
              },
            ],
          },
        ],
      } as proto.IConfig;

      expect(migrateMappingTriggers(config)).toBe(true);
      const mapping = config.profiles![0].mappings![0];
      expect(mapping.input?.digitalTrigger).toBe(proto.AnalogToDigitalTriggerType.JoyHigh);
      expect(mapping.input?.digitalTriggerValue).toBe(40000);
      expect(mapping.input?.digitalMaxTriggerValue).toBe(50000);
      expect(mapping.input?.cycle?.trigger).toBeNull();
      expect(mapping.trigger).toBeNull();
      expect(mapping.triggerValue).toBeNull();
    });

    it('preserves generic input settings and migrates rapid trigger actuation separately', () => {
      const config = {
        profiles: [
          {
            mappings: [
              {
                input: {
                  digitalTrigger: proto.AnalogToDigitalTriggerType.Range,
                  digitalTriggerValue: 10000,
                  cycle: { trigger: proto.AnalogToDigitalTriggerType.JoyLow, triggerValue: 5 },
                },
                trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
                triggerValue: 32000,
                rapidTrigger: { downSensitivity: 3000, upSensitivity: 3000 },
              },
              {
                input: { gpio: { pin: 1, analog: true } },
                trigger: proto.AnalogToDigitalTriggerType.JoyHigh,
                triggerValue: 12345,
                rapidTrigger: { downSensitivity: 3000, upSensitivity: 3000 },
              },
            ],
          },
        ],
      } as proto.IConfig;

      expect(migrateMappingTriggers(config)).toBe(true);
      const mapping = config.profiles![0].mappings![0];
      expect(mapping.input?.digitalTrigger).toBe(proto.AnalogToDigitalTriggerType.Range);
      expect(mapping.input?.digitalTriggerValue).toBe(10000);
      expect(mapping.rapidTrigger?.actuationValue).toBe(32000);
      expect(mapping.triggerValue).toBeNull();
      expect(mapping.input?.cycle?.trigger).toBeNull();
      expect(config.profiles![0].mappings![1].input?.digitalTrigger).toBeUndefined();
      expect(config.profiles![0].mappings![1].rapidTrigger?.actuationValue).toBe(12345);
    });

    it('does not mark configs without legacy trigger fields as changed', () => {
      const config = {
        profiles: [{ mappings: [{ input: { gpio: { pin: 1 } } }] }],
      } as proto.IConfig;
      expect(migrateMappingTriggers(config)).toBe(false);
    });
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
