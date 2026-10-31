import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import {
  actionHoldMs,
  actionOutputLabel,
  actionOutputValue,
  getActionOptions,
  isActionOutput,
} from './actionOutputs';
import { getProfileSlots } from './inputRegistry';

const ST = proto.SubType;
const t = (key: string, options?: Record<string, unknown>) =>
  options?.slot != null ? `${key}(${options.slot})` : key;

const profile: proto.IProfile = {
  opts: {
    uid: 1,
    name: 'p',
    deviceToEmulate: ST.Gamepad,
    faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    deviceSlotIdVersion: 3,
  },
  assignments: [
    {
      assignments: [
        { consoleType: {} },
        { usbType: ST.Gamepad },
        { usbType: ST.KeyboardMouse },
        { bluetoothType: ST.GuitarHeroGuitar },
      ],
    },
  ],
};

describe('action outputs', () => {
  const slots = getProfileSlots(profile);

  it('offers turning off each USB and bluetooth controller slot, but not keyboards', () => {
    const options = getActionOptions(slots, t);
    expect(options.map((x) => x.output)).toEqual([
      { action: proto.ActionType.ActionRestartDeviceStack },
      { action: proto.ActionType.ActionBootloader },
      { turnOffController: { usb: 1 } },
      { turnOffController: { bluetooth: 1 } },
    ]);
    // Each option is found again from its output
    options.forEach((x) => expect(actionOutputValue(x.output)).toBe(x.value));
  });

  it('treats turning off a controller as an action', () => {
    expect(isActionOutput({ turnOffController: { usb: 1 } })).toBe(true);
    expect(isActionOutput({ action: proto.ActionType.ActionBootloader })).toBe(true);
    expect(isActionOutput({ gamepadButton: proto.GamepadButtonType.Gamepad_A })).toBe(false);
    expect(actionHoldMs({ action: proto.ActionType.ActionBootloader })).toBe(3000);
    expect(actionHoldMs({ turnOffController: { usb: 1 } })).toBe(2000);
  });

  it('still labels a turn off action whose slot was removed', () => {
    expect(actionOutputLabel({ turnOffController: { bluetooth: 9 } }, slots, t)).toBe(
      'outputs.TurnOffController(assignments.slot 9)'
    );
  });
});
