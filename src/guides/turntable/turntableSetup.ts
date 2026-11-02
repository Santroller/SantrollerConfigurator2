import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { ensureDeviceToEmulate } from '../adapters/adapterLiveStatus';

// The platters talk to the base over I2C, so both share I2C1 on GP18 (SDA) / GP19 (SCL). Each
// platter answers on its own address (left 0x0E, right 0x0D), picked by the device's left flag.
export const PLATTER_SDA = 18;
export const PLATTER_SCL = 19;

export interface BasePin {
  key: string;
  pin: number;
  physicalPin: number;
  analog: boolean;
  output: proto.IOutput;
}

// Base controls wired straight to the Pico, avoiding the platter I2C pins
export const BASE_PINOUT: BasePin[] = [
  {
    key: 'crossfader',
    pin: 26,
    physicalPin: 31,
    analog: true,
    output: { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_Crossfader },
  },
  {
    key: 'effectsDial',
    pin: 27,
    physicalPin: 32,
    analog: true,
    output: { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_EffectsKnob },
  },
  {
    key: 'euphoria',
    pin: 2,
    physicalPin: 4,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_Y },
  },
  {
    key: 'start',
    pin: 3,
    physicalPin: 5,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_Start },
  },
  {
    key: 'select',
    pin: 4,
    physicalPin: 6,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_Back },
  },
  {
    key: 'guide',
    pin: 5,
    physicalPin: 7,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_Guide },
  },
  {
    key: 'dpadUp',
    pin: 6,
    physicalPin: 9,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp },
  },
  {
    key: 'dpadDown',
    pin: 7,
    physicalPin: 10,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadDown },
  },
  {
    key: 'dpadLeft',
    pin: 8,
    physicalPin: 11,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadLeft },
  },
  {
    key: 'dpadRight',
    pin: 9,
    physicalPin: 12,
    analog: false,
    output: { gamepadButton: proto.GamepadButtonType.Gamepad_DpadRight },
  },
];

function sameOutput(a: proto.IOutput | null | undefined, b: proto.IOutput) {
  const [key, value] = Object.entries(b)[0];
  return a?.[key as keyof proto.IOutput] === value;
}

export function findPlatter(state: ConfigState, left: boolean) {
  return Object.values(state.deviceStatus).find(
    (d) => d.device.djhTurntable != null && (d.device.djhTurntable.left ?? true) === left
  );
}

/**
 * Adds a platter on I2C1 (GP18 / GP19) and loads its default mappings (velocity and the three
 * buttons), switching the profile to a DJ Hero turntable first as the defaults are turntable only.
 */
export function addPlatter(left: boolean) {
  const store = useConfigStore.getState();
  if (findPlatter(store, left)) {
    return;
  }
  ensureDeviceToEmulate([proto.SubType.DjHeroTurntable], proto.SubType.DjHeroTurntable);
  // The platters share one I2C bus, so a second one goes on the first one's pins
  const other = findPlatter(store, !left)?.device.djhTurntable?.i2c;
  const id = store.addDevice('djhTurntable', undefined, (device) => {
    const djh = device.djhTurntable!;
    djh.i2c = other
      ? { ...djh.i2c, ...other }
      : { ...djh.i2c, sda: PLATTER_SDA, scl: PLATTER_SCL, block: 1 };
    djh.left = left;
  });
  const status = useConfigStore.getState().deviceStatus[id];
  if (status) {
    useConfigStore.getState().loadDefaults(status);
  }
}

function isBaseMapping(mapping: proto.IMapping, base: BasePin) {
  return mapping.input?.gpio != null && sameOutput(mapping.mapping, base.output);
}

export function isBasePinoutApplied(state: ConfigState) {
  const mappings = state.config.profiles?.[state.currentProfile]?.mappings ?? [];
  return BASE_PINOUT.every((base) =>
    mappings.some((m) => isBaseMapping(m, base) && m.input?.gpio?.pin === base.pin)
  );
}

/**
 * Maps the base controls to the suggested GPIO pins, reusing any existing GPIO mapping for the
 * same control (eg an unassigned one from the profile defaults) so nothing is duplicated.
 */
export function applyBasePinout() {
  ensureDeviceToEmulate([proto.SubType.DjHeroTurntable], proto.SubType.DjHeroTurntable);
  const store = useConfigStore.getState();
  const idx = store.currentProfile;
  const profile = store.config.profiles?.[idx];
  if (!profile) {
    return;
  }
  const mappings = [...(profile.mappings ?? [])];
  for (const base of BASE_PINOUT) {
    const mapping: proto.IMapping = {
      mapping: base.output,
      input: {
        gpio: {
          pin: base.pin,
          pinMode: base.analog ? proto.PinMode.Floating : proto.PinMode.PullUp,
          analog: base.analog,
        },
      },
      // Both pots rest in the middle of their travel
      ...(base.analog ? { min: 0, max: 65535, center: 32767 } : {}),
    };
    const existing = mappings.findIndex((m) => isBaseMapping(m, base));
    if (existing === -1) {
      mappings.push(mapping);
    } else {
      mappings[existing] = { ...mappings[existing], ...mapping };
    }
  }
  store.updateProfile({ ...profile, mappings }, idx);
}
