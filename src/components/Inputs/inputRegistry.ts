import { proto } from '@/components/SettingsContext/config';

export type InputKind = keyof proto.IInput;

export function isSelectablePS2Axis(key: string, selected?: string): boolean {
  return !key.startsWith('PS2AxisDualshock2') || key === selected;
}

export function isSelectableWiiAxis(key: string, selected?: string): boolean {
  return (
    (key !== 'WiiAxisClassicLeftTrigger' && key !== 'WiiAxisClassicRightTrigger') ||
    key === selected
  );
}

export type SelectedInput = {
  [Kind in InputKind]: {
    kind: Kind;
    value: NonNullable<proto.IInput[Kind]>;
  };
}[InputKind];

type InputCapabilities = {
  axis: boolean;
  button: boolean;
};

type InputDefinition = {
  isAnalog?: (input: proto.IInput) => boolean;
  usesDevice?: (input: proto.IInput, deviceid: number) => boolean;
};

type DeviceInputDefinition = {
  create: (deviceid: number, capabilities: InputCapabilities) => proto.IInput | undefined;
};

const digitalGpioInput = (): proto.IInput => ({
  gpio: { pin: -1, analog: false, pinMode: proto.PinMode.PullUp },
});

const hasDevice =
  (getInput: (input: proto.IInput) => { deviceid?: number | null } | null | undefined) =>
  (input: proto.IInput, deviceid: number) =>
    getInput(input)?.deviceid === deviceid;

const inputRegistry: Record<InputKind, InputDefinition> = {
  gpio: { isAnalog: (input) => !!input.gpio?.analog },
  fixed: {},
  key: {},
  mouseAxis: { isAnalog: () => true },
  mouseButton: {},
  mpr121: { usesDevice: hasDevice((input) => input.mpr121) },
  ads1115: { isAnalog: () => true, usesDevice: hasDevice((input) => input.ads1115) },
  infiniumFader: { isAnalog: () => true, usesDevice: hasDevice((input) => input.infiniumFader) },
  wiiAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.wiiAxis) },
  wiiButton: { usesDevice: hasDevice((input) => input.wiiButton) },
  crkd: { usesDevice: hasDevice((input) => input.crkd) },
  crkdDrum: { isAnalog: () => true, usesDevice: hasDevice((input) => input.crkdDrum) },
  gh5Neck: { usesDevice: hasDevice((input) => input.gh5Neck) },
  accelerometer: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.accelerometer),
  },
  encoder: { isAnalog: () => true, usesDevice: hasDevice((input) => input.encoder) },
  multiplexer: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.multiplexer),
  },
  usbAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.usbAxis) },
  usbButton: { usesDevice: hasDevice((input) => input.usbButton) },
  btAxis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.btAxis) },
  btButton: { usesDevice: hasDevice((input) => input.btButton) },
  ps2Axis: { isAnalog: () => true, usesDevice: hasDevice((input) => input.ps2Axis) },
  ps2Button: { usesDevice: hasDevice((input) => input.ps2Button) },
  midi: {
    isAnalog: (input) =>
      !!(
        input.midi?.midiNote ||
        input.midi?.midiControlChange ||
        input.midi?.midiPitchBend ||
        input.midi?.midiProGuitarAxis
      ),
    usesDevice: hasDevice((input) => input.midi),
  },
  protarNeckAxis: {
    isAnalog: () => true,
    usesDevice: hasDevice((input) => input.protarNeckAxis),
  },
  protarNeckButton: { usesDevice: hasDevice((input) => input.protarNeckButton) },
  vtechExpander: { usesDevice: hasDevice((input) => input.vtechExpander) },
  peripheral: {
    isAnalog: (input) => !!input.peripheral?.analog,
    usesDevice: hasDevice((input) => input.peripheral),
  },
  matrix: { usesDevice: hasDevice((input) => input.matrix) },
  switchNetwork: { usesDevice: hasDevice((input) => input.switchNetwork) },
  shortcut: {
    usesDevice: (input, deviceid) =>
      input.shortcut?.inputs?.some((nestedInput) => inputUsesDevice(nestedInput, deviceid)) ??
      false,
  },
  held: {
    usesDevice: (input, deviceid) =>
      !!input.held?.input && inputUsesDevice(input.held.input, deviceid),
  },
  cycle: {
    isAnalog: () => true,
    usesDevice: (input, deviceid) =>
      input.cycle?.deviceid === deviceid ||
      (!!input.cycle?.input && inputUsesDevice(input.cycle.input, deviceid)) ||
      (!!input.cycle?.inputReverse && inputUsesDevice(input.cycle.inputReverse, deviceid)),
  },
  toggle: {
    usesDevice: (input, deviceid) =>
      input.toggle?.deviceid === deviceid ||
      (!!input.toggle?.input && inputUsesDevice(input.toggle.input, deviceid)),
  },
  shifted: {
    usesDevice: (input, deviceid) =>
      (!!input.shifted?.input && inputUsesDevice(input.shifted.input, deviceid)) ||
      (!!input.shifted?.shift && inputUsesDevice(input.shifted.shift, deviceid)),
  },
};

const deviceInputRegistry: Record<string, DeviceInputDefinition> = {
  wii: {
    create: (deviceid, { axis, button }) =>
      axis
        ? { wiiAxis: { axis: proto.WiiAxisType.WiiAxisClassicLeftStickX, deviceid } }
        : button
          ? { wiiButton: { button: proto.WiiButtonType.WiiButtonClassicA, deviceid } }
          : undefined,
  },
  psx: {
    create: (deviceid, { axis, button }) =>
      axis
        ? { ps2Axis: { axis: proto.PS2AxisType.PS2AxisLeftStickX, deviceid } }
        : button
          ? { ps2Button: { button: proto.PS2ButtonType.PS2ButtonCross, deviceid } }
          : undefined,
  },
  ads1115: { create: (deviceid) => ({ ads1115: { channel: 0, deviceid } }) },
  multiplexer: { create: (deviceid) => ({ multiplexer: { channel: 0, deviceid } }) },
  accelerometer: {
    create: (deviceid) => ({
      accelerometer: { type: proto.AccelerometerInputType.AccelerometerX, deviceid },
    }),
  },
  vtechExpander: { create: (deviceid) => ({ vtechExpander: { button: 0, deviceid } }) },
  matrix: {
    create: (deviceid) => ({ matrix: { outputPin: -1, pin: -1, deviceid } }),
  },
  switchNetwork: {
    create: (deviceid) => ({ switchNetwork: { button: 0, deviceid } }),
  },
  encoder: {
    create: (deviceid) => ({
      encoder: { type: proto.EncoderInputType.EncoderDelta, deviceid },
    }),
  },
  crkdNeck: {
    create: (deviceid) => ({
      crkd: { button: proto.CrkdNeckButtonType.CrkdGreen, deviceid },
    }),
  },
  bhDrum: {
    create: (deviceid) => ({
      midi: {
        midiNote: { note: 1, channel: 10 },
        deviceid,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      },
    }),
  },
  worldTourDrum: {
    create: (deviceid) => ({
      midi: {
        midiNote: { note: 1, channel: 10 },
        deviceid,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      },
    }),
  },
  midiSerial: {
    create: (deviceid) => ({
      midi: {
        midiNote: { note: 1, channel: 10 },
        deviceid,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
      },
    }),
  },
  infiniumFader: {
    create: (deviceid) => ({
      infiniumFader: { deviceid },
    }),
  },
  peripheral: {
    create: (deviceid, { axis }) => ({
      peripheral: { pin: -1, pinMode: proto.PinMode.PullUp, analog: axis, deviceid },
    }),
  },
  crkdDrum: {
    create: (deviceid) => ({
      crkdDrum: { axis: proto.CrkdDrumAxisType.CrkdGreenPad, deviceid },
    }),
  },
  gh5Neck: {
    create: (deviceid) => ({
      gh5Neck: { button: proto.Gh5NeckButtonType.Gh5Green, deviceid },
    }),
  },
  usbHost: {
    create: (deviceid, { axis }) =>
      axis
        ? {
            usbAxis: {
              axis: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
              deviceid,
            },
          }
        : {
            usbButton: {
              button: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
              deviceid,
            },
          },
  },
  bt: {
    create: (deviceid, { axis }) =>
      axis
        ? {
            btAxis: {
              axis: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
              deviceid,
            },
          }
        : {
            btButton: {
              button: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
              deviceid,
            },
          },
  },
  protarNeck: {
    create: (deviceid, { axis }) =>
      axis
        ? {
            protarNeckAxis: {
              axis: proto.ProGuitarNeckAxisType.ProGuitarNeckAFret,
              deviceid,
            },
          }
        : {
            protarNeckButton: {
              button: proto.ProGuitarNeckButtonType.ProGuitarNeckGreen,
              deviceid,
            },
          },
  },
  cycle: { create: (deviceid) => ({ cycle: { input: digitalGpioInput(), deviceid } }) },
  toggle: { create: (deviceid) => ({ toggle: { input: digitalGpioInput(), deviceid } }) },
};

const standaloneInputRegistry: Record<string, () => proto.IInput> = {
  gpio_analog: () => ({
    gpio: { pin: -1, analog: true, pinMode: proto.PinMode.Floating },
  }),
  gpio_digital: digitalGpioInput,
  shortcut: () => ({ shortcut: { inputs: [digitalGpioInput()] } }),
  held: () => ({ held: { input: digitalGpioInput(), time: 1000 } }),
  shifted: () => ({
    shifted: { input: digitalGpioInput(), shift: digitalGpioInput(), invertShift: false },
  }),
};

export function createDeviceInput(
  deviceType: string,
  deviceid: number,
  capabilities: InputCapabilities
) {
  return deviceInputRegistry[deviceType]?.create(deviceid, capabilities);
}

export function createStandaloneInput(type: string) {
  return standaloneInputRegistry[type]?.();
}

export const getHostSourceType = (item: proto.IProfileAssignmentInfo): string | null => {
  if (item.wiiExt != null) {
    return 'wiiExt';
  }
  if (item.ps2Cnt != null) {
    return 'ps2Cnt';
  }
  if (item.usbType != null) {
    return 'usbType';
  }
  if (item.usbDevice != null) {
    return 'usbDevice';
  }
  if (item.bluetoothType != null) {
    return 'bluetoothType';
  }
  if (item.bluetoothDevice != null) {
    return 'bluetoothDevice';
  }
  if (item.midiChannel != null) {
    return 'midiChannel';
  }
  return null;
};

export type ProfileSlot = {
  slotId: number;
  item: proto.IProfileAssignmentInfo;
  items: proto.IProfileAssignmentInfo[];
  deviceKind: string;
  key: string;
  label: string;
  midiChannel?: number;
};

export function getProfileSlotKey(deviceKind: string, slotId: number) {
  return `${deviceKind}:${slotId}`;
}

export function getAssignmentTriggerIds(assignments: proto.IProfileAssignmentInfo[] = []) {
  let triggerId = 0;
  return assignments.map((item) => {
    const currentId = triggerId;
    const hasInputTrigger =
      !!getSelectedInput(item.input?.input) || !!getSelectedInput(item.inputAnyTime?.input);
    const hasTrigger =
      item.consoleType != null ||
      item.bluetooth != null ||
      item.ps2Emulation != null ||
      item.wiiEmulation != null ||
      getHostSourceType(item) != null ||
      hasInputTrigger;
    if (hasTrigger) {
      triggerId += 1;
    }
    return currentId;
  });
}

export function getAssignmentSlotIds(assignments: proto.IProfileAssignmentInfo[] = []) {
  const counts = new Map<string, number>();
  return assignments.map((item) => {
    const source = getHostSourceType(item);
    if (!source) {
      return 0;
    }
    const deviceKind =
      source === 'midiChannel'
        ? 'midi'
        : source === 'wiiExt'
          ? 'wii'
          : source === 'ps2Cnt'
            ? 'psx'
            : source.startsWith('bluetooth')
              ? 'bt'
              : 'usbHost';
    const slotId = (counts.get(deviceKind) ?? 0) + 1;
    counts.set(deviceKind, slotId);
    return slotId;
  });
}

export function getProfileSlotLabel(
  item: proto.IProfileAssignmentInfo,
  slotId: number,
  t?: (key: string) => string
) {
  const source = getHostSourceType(item);
  if (!source) {
    return `${t?.('assignments.slot') ?? 'Slot'} ${slotId}`;
  }

  const type =
    item.usbType != null
      ? `subType.${proto.SubType[item.usbType]}`
      : item.bluetoothType != null
        ? `subType.${proto.SubType[item.bluetoothType]}`
        : item.ps2Cnt != null
          ? `ps2Cnt.${proto.PS2ControllerType[item.ps2Cnt]}`
          : item.wiiExt != null
            ? `wiiExt.${proto.WiiExtType[item.wiiExt]}`
            : undefined;
  const typeLabel = type ? (t?.(type) ?? type.split('.').at(-1)) : undefined;
  const sourceLabelKey =
    typeLabel && source === 'usbType'
      ? 'assignments.source.usbTypeWithSubtype'
      : typeLabel && source === 'bluetoothType'
        ? 'assignments.source.bluetoothTypeWithSubtype'
        : `assignments.source.${source}`;
  const sourceLabel = t?.(sourceLabelKey) ?? t?.(`assignments.source.${source}`) ?? source;
  return `${t?.('assignments.slot') ?? 'Slot'} ${slotId}: ${sourceLabel}${typeLabel ? ` (${typeLabel})` : ''}`;
}

export function getProfileSlots(profile?: proto.IProfile, t?: (key: string) => string) {
  const slots = new Map<string, ProfileSlot>();
  for (const rule of profile?.assignments ?? []) {
    const assignments = rule.assignments ?? [];
    const slotIds =
      (profile?.opts?.deviceSlotIdVersion ?? 0) >= 1
        ? getAssignmentSlotIds(assignments)
        : getAssignmentTriggerIds(assignments);
    for (const [assignmentIndex, item] of assignments.entries()) {
      const slotId = slotIds[assignmentIndex];
      const source = getHostSourceType(item);
      if (!source) {
        continue;
      }
      const deviceKind =
        source === 'midiChannel'
          ? 'midi'
          : source === 'wiiExt'
            ? 'wii'
            : source === 'ps2Cnt'
              ? 'psx'
              : source.startsWith('bluetooth')
                ? 'bt'
                : 'usbHost';
      const key = getProfileSlotKey(deviceKind, slotId);
      const existing = slots.get(key);
      if (existing) {
        existing.items.push(item);
        const labels = new Set(existing.label.split(' / '));
        labels.add(getProfileSlotLabel(item, slotId, t));
        existing.label = [...labels].join(' / ');
      } else {
        slots.set(key, {
          slotId,
          item,
          items: [item],
          deviceKind,
          key,
          label: getProfileSlotLabel(item, slotId, t),
        });
      }
    }
  }
  return [...slots.values()].map((slot) => {
    const channels = new Set(
      slot.items.flatMap((item) => (item.midiChannel == null ? [] : [item.midiChannel]))
    );
    return {
      ...slot,
      midiChannel: channels.size === 1 ? [...channels][0] : undefined,
    };
  });
}

export function createSlotInput(slot: ProfileSlot, capabilities: InputCapabilities) {
  if (slot.deviceKind === 'midi') {
    return {
      midi: {
        deviceid: slot.slotId,
        sourceType: proto.MidiInputSourceType.MidiInputSourceType_MIDI,
        midiNote: { note: 1, channel: slot.midiChannel ?? 10 },
      },
    };
  }
  return createDeviceInput(slot.deviceKind, slot.slotId, capabilities);
}

export function getProfileSlotForInput(input: proto.IInput, slots: ProfileSlot[]) {
  const deviceId = getInputDeviceId(input);
  if (deviceId == null) {
    return undefined;
  }

  let deviceKind: string | undefined;
  if (input.wiiAxis || input.wiiButton) {
    deviceKind = 'wii';
  } else if (input.ps2Axis || input.ps2Button) {
    deviceKind = 'psx';
  } else if (input.usbAxis || input.usbButton) {
    deviceKind = 'usbHost';
  } else if (input.btAxis || input.btButton) {
    deviceKind = 'bt';
  } else if (input.midi) {
    switch (input.midi.sourceType) {
      case proto.MidiInputSourceType.MidiInputSourceType_MIDI:
        deviceKind = 'midi';
        break;
      case proto.MidiInputSourceType.MidiInputSourceType_Auto:
        return undefined;
      case proto.MidiInputSourceType.MidiInputSourceType_USB:
        deviceKind = 'usbHost';
        break;
      case proto.MidiInputSourceType.MidiInputSourceType_Bluetooth:
        deviceKind = 'bt';
        break;
      case proto.MidiInputSourceType.MidiInputSourceType_Wii:
        deviceKind = 'wii';
        break;
      default: {
        const candidates = slots.filter(
          (slot) =>
            slot.slotId === deviceId && ['midi', 'usbHost', 'bt', 'wii'].includes(slot.deviceKind)
        );
        if (candidates.length === 1) {
          return candidates[0];
        }
      }
    }
  }

  if (!deviceKind) {
    return undefined;
  }
  return slots.find((slot) => slot.key === getProfileSlotKey(deviceKind, deviceId));
}

export function midiInputSourceType(deviceKind?: string) {
  switch (deviceKind) {
    case 'usbHost':
      return proto.MidiInputSourceType.MidiInputSourceType_USB;
    case 'bt':
      return proto.MidiInputSourceType.MidiInputSourceType_Bluetooth;
    case 'wii':
      return proto.MidiInputSourceType.MidiInputSourceType_Wii;
    case 'midi':
      return proto.MidiInputSourceType.MidiInputSourceType_MIDI;
    default:
      return proto.MidiInputSourceType.MidiInputSourceType_Auto;
  }
}

function midiSourceDeviceKind(sourceType?: proto.MidiInputSourceType | null): string | undefined {
  switch (sourceType) {
    case proto.MidiInputSourceType.MidiInputSourceType_USB:
      return 'usbHost';
    case proto.MidiInputSourceType.MidiInputSourceType_Bluetooth:
      return 'bt';
    case proto.MidiInputSourceType.MidiInputSourceType_Wii:
      return 'wii';
    case proto.MidiInputSourceType.MidiInputSourceType_MIDI:
      return 'midi';
    case proto.MidiInputSourceType.MidiInputSourceType_Auto:
      return undefined;
    default:
      return sourceType == null ? 'midi' : undefined;
  }
}

export function withSlotMidiChannel(
  input: proto.IInput,
  channels: Map<string, number>,
  slots: ProfileSlot[] = []
): proto.IInput {
  if (input.midi) {
    const midiDeviceId = input.midi.deviceid;
    let deviceKind = midiSourceDeviceKind(input.midi.sourceType);
    if (input.midi.sourceType == null) {
      const candidates = new Set(
        slots
          .filter(
            (slot) =>
              slot.slotId === midiDeviceId &&
              ['midi', 'usbHost', 'bt', 'wii'].includes(slot.deviceKind)
          )
          .map((slot) => slot.deviceKind)
      );
      if (candidates.size !== 1) {
        return input;
      }
      deviceKind = [...candidates][0];
    }
    if (!deviceKind) {
      return input;
    }
    const channel = channels.get(getProfileSlotKey(deviceKind, input.midi.deviceid ?? -1));
    if (channel == null) {
      return input;
    }
    const midi = input.midi;
    return {
      ...input,
      midi: {
        ...midi,
        midiNote: midi.midiNote ? { ...midi.midiNote, channel } : undefined,
        midiControlChange: midi.midiControlChange
          ? { ...midi.midiControlChange, channel }
          : undefined,
        midiPitchBend: midi.midiPitchBend ? { ...midi.midiPitchBend, channel } : undefined,
      },
    };
  }
  if (input.shortcut?.inputs) {
    return {
      ...input,
      shortcut: {
        ...input.shortcut,
        inputs: input.shortcut.inputs.map((x) => withSlotMidiChannel(x, channels, slots)),
      },
    };
  }
  if (input.held?.input) {
    return {
      ...input,
      held: { ...input.held, input: withSlotMidiChannel(input.held.input, channels, slots) },
    };
  }
  if (input.shifted) {
    return {
      ...input,
      shifted: {
        ...input.shifted,
        input: input.shifted.input
          ? withSlotMidiChannel(input.shifted.input, channels, slots)
          : undefined,
        shift: input.shifted.shift
          ? withSlotMidiChannel(input.shifted.shift, channels, slots)
          : undefined,
      },
    };
  }
  if (input.cycle) {
    return {
      ...input,
      cycle: {
        ...input.cycle,
        input: input.cycle.input
          ? withSlotMidiChannel(input.cycle.input, channels, slots)
          : undefined,
        inputReverse: input.cycle.inputReverse
          ? withSlotMidiChannel(input.cycle.inputReverse, channels, slots)
          : undefined,
      },
    };
  }
  if (input.toggle?.input) {
    return {
      ...input,
      toggle: {
        ...input.toggle,
        input: withSlotMidiChannel(input.toggle.input, channels, slots),
      },
    };
  }
  return input;
}

export function getSelectedInput(input?: proto.IInput | null): SelectedInput | undefined {
  if (!input) {
    return undefined;
  }

  for (const [kind, value] of Object.entries(input)) {
    if (value != null) {
      return { kind: kind as InputKind, value } as SelectedInput;
    }
  }

  return undefined;
}

export function getInputDeviceId(input: proto.IInput): number | undefined {
  const selected = getSelectedInput(input);
  if (!selected || typeof selected.value !== 'object' || !('deviceid' in selected.value)) {
    return undefined;
  }

  return selected.value.deviceid ?? undefined;
}

export function isAnalogInput(input: proto.IInput) {
  const kind = getSelectedInput(input)?.kind;
  return kind ? (inputRegistry[kind]?.isAnalog?.(input) ?? false) : false;
}

export const MIDI_PERCUSSION_CHANNEL = 10;

export function isDrumInput(input: proto.IInput): boolean {
  if (input.crkdDrum) {
    return true;
  }
  const midi = input.midi;
  return [midi?.midiNote, midi?.midiControlChange, midi?.midiPitchBend].some(
    (message) => message?.channel === MIDI_PERCUSSION_CHANNEL
  );
}

export function inputUsesDevice(input: proto.IInput, deviceid: number): boolean {
  const kind = getSelectedInput(input)?.kind;
  return kind ? (inputRegistry[kind]?.usesDevice?.(input, deviceid) ?? false) : false;
}
