import { describe, expect, it } from 'vitest';
import {
  calibrateLike,
  syncEditedCalibrations,
  syncsCalibration,
  unifyCalibrations,
} from './calibrationSync';
import { proto } from './config';

const MUX = 4;
const devices = (syncCalibration: boolean): proto.IDevice[] => [
  { deviceid: MUX, syncCalibration, multiplexer: {} as proto.IMultiplexerDevice },
];
const channel = (c: number): proto.IInput => ({ multiplexer: { deviceid: MUX, channel: c } });
const opts = {} as proto.IProfileOpts;

const whammy = (min: number, max: number): proto.IMapping => ({
  mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
  input: channel(0),
  min,
  max,
});
// the whammy as a button, pressed half way
const whammyButton = (triggerValue: number): proto.IMapping => ({
  mapping: { keycode: 4 },
  input: {
    ...channel(0),
    digitalTrigger: proto.AnalogToDigitalTriggerType.JoyHigh,
    digitalTriggerValue: triggerValue,
  },
  min: 1000,
  max: 60000,
});

describe('syncsCalibration', () => {
  it('follows the setting of the device an input reads from', () => {
    expect(syncsCalibration(devices(true), channel(0))).toBe(true);
    expect(syncsCalibration(devices(false), channel(0))).toBe(false);
    expect(
      syncsCalibration(devices(true), {
        gpio: { pin: 26, analog: true, pinMode: proto.PinMode.Floating },
      })
    ).toBe(false);
  });

  it('counts slot inputs as synced when a device of their kind is', () => {
    const usb: proto.IDevice[] = [
      { deviceid: 1, syncCalibration: true, usbHost: {} as proto.IUsbHostDevice },
    ];
    expect(syncsCalibration(usb, { usbAxis: { deviceid: 0, axis: {} } })).toBe(true);
  });
});

describe('calibrateLike', () => {
  it('shares range, filter and debounce, but only buttons share trigger points', () => {
    const axis = calibrateLike(whammy(0, 100), whammyButton(30000));
    expect(axis).toMatchObject({ min: 1000, max: 60000 });
    expect(axis.input?.digitalTriggerValue).toBeUndefined();
    const button = calibrateLike(whammyButton(10), whammyButton(30000));
    expect(button.input?.digitalTriggerValue).toBe(30000);
  });

  it('returns the same mapping when nothing changes', () => {
    const mapping = whammy(1000, 60000);
    expect(calibrateLike(mapping, { ...mapping })).toBe(mapping);
  });
});

describe('syncEditedCalibrations', () => {
  const profiles = (a: proto.IMapping, b: proto.IMapping): proto.IProfile[] => [
    { opts, mappings: [a] },
    { opts, mappings: [b] },
  ];

  it('takes every other mapping on the input along with an edit', () => {
    const before = profiles(whammy(1000, 60000), whammy(1000, 60000));
    const after = [{ opts, mappings: [whammy(2000, 50000)] }, before[1]];
    const synced = syncEditedCalibrations(devices(true), before[0], after, 0);
    expect(synced[1].mappings![0]).toMatchObject({ min: 2000, max: 50000 });
  });

  it('leaves other inputs and unsynced devices alone', () => {
    const other = { ...whammy(1000, 60000), input: channel(1) };
    const before = profiles(whammy(1000, 60000), other);
    const after = [{ opts, mappings: [whammy(2000, 50000)] }, before[1]];
    expect(syncEditedCalibrations(devices(true), before[0], after, 0)).toBe(after);
    const unsynced = profiles(whammy(1000, 60000), whammy(1000, 60000));
    const edited = [{ opts, mappings: [whammy(2000, 50000)] }, unsynced[1]];
    expect(syncEditedCalibrations(devices(false), unsynced[0], edited, 0)).toBe(edited);
  });

  it('gives a mapping that just moved onto the input the calibration it has', () => {
    const elsewhere = { ...whammy(0, 100), input: channel(3) };
    const before: proto.IProfile = { opts, mappings: [elsewhere] };
    const after = [
      { opts, mappings: [{ ...elsewhere, input: channel(0) }] },
      { opts, mappings: [whammy(1000, 60000)] },
    ];
    const synced = syncEditedCalibrations(devices(true), before, after, 0);
    expect(synced[0].mappings![0]).toMatchObject({ min: 1000, max: 60000 });
    expect(synced[1]).toBe(after[1]);
  });
});

describe('unifyCalibrations', () => {
  it('calibrates every mapping on an input like the first one', () => {
    const synced = unifyCalibrations(
      devices(true),
      [
        { opts, mappings: [whammy(1000, 60000)] },
        { opts, mappings: [whammy(0, 100)] },
      ],
      MUX
    );
    expect(synced[1].mappings![0]).toMatchObject({ min: 1000, max: 60000 });
  });
});

describe('LEDs lit by a synced input', () => {
  const led = (min: number, max: number, c = 0): proto.ILed => ({
    device: { gpio: { pin: 25, analog: true } },
    mapping: { inputMapping: { input: channel(c), min, max } },
  });
  const range = (profile: proto.IProfile) => {
    const { min, max } = profile.leds![0].mapping.inputMapping!;
    return { min, max };
  };

  it('take the range of a calibrated mapping, and nothing else', () => {
    const before: proto.IProfile[] = [
      { opts, mappings: [whammy(1000, 60000)], leds: [] },
      { opts, mappings: [], leds: [led(1000, 60000)] },
    ];
    const edited = { ...whammy(2000, 50000), center: 9, deadzone: 9 };
    const after = [{ ...before[0], mappings: [edited] }, before[1]];
    const synced = syncEditedCalibrations(devices(true), before[0], after, 0);
    expect(range(synced[1])).toEqual({ min: 2000, max: 50000 });
    expect(synced[1].leds![0].mapping.inputMapping).not.toHaveProperty('center');
  });

  it('give their range to mappings and other LEDs when calibrated', () => {
    const before: proto.IProfile[] = [
      { opts, mappings: [], leds: [led(1000, 60000)] },
      { opts, mappings: [{ ...whammy(1000, 60000), center: 7 }], leds: [led(1000, 60000)] },
    ];
    const after = [{ ...before[0], leds: [led(3000, 40000)] }, before[1]];
    const synced = syncEditedCalibrations(devices(true), before[0], after, 0);
    expect(synced[1].mappings![0]).toMatchObject({ min: 3000, max: 40000, center: 7 });
    expect(range(synced[1])).toEqual({ min: 3000, max: 40000 });
  });

  it('take the range the input has when newly put on it', () => {
    const before: proto.IProfile = { opts, mappings: [], leds: [led(0, 100, 3)] };
    const after = [
      { ...before, leds: [led(0, 100)] },
      { opts, mappings: [whammy(1000, 60000)], leds: [] },
    ];
    const synced = syncEditedCalibrations(devices(true), before, after, 0);
    expect(range(synced[0])).toEqual({ min: 1000, max: 60000 });
  });

  it('line up when syncing is turned on, even with no mapping on the input', () => {
    const synced = unifyCalibrations(
      devices(true),
      [
        { opts, mappings: [], leds: [led(1000, 60000, 2)] },
        { opts, mappings: [], leds: [led(0, 100, 2)] },
      ],
      MUX
    );
    expect(range(synced[1])).toEqual({ min: 1000, max: 60000 });
  });

  it('are left alone when the device does not sync', () => {
    const before: proto.IProfile[] = [
      { opts, mappings: [whammy(1000, 60000)], leds: [] },
      { opts, mappings: [], leds: [led(1000, 60000)] },
    ];
    const after = [{ ...before[0], mappings: [whammy(2000, 50000)] }, before[1]];
    expect(syncEditedCalibrations(devices(false), before[0], after, 0)).toBe(after);
  });
});
