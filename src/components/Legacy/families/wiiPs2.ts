import { proto } from '@/components/SettingsContext/config';
import { ConvertedInput, LegacyImportContext, setI2c, setSpi } from '../context';
import { registerInputConverters } from '../inputs';
import { legacy } from '../legacy';
import { addButton, convertOutput, guitarButtonOutput, registerOutputConverters } from '../outputs';

const ST = proto.SubType;
const LIB = legacy.InstrumentButtonType;
const WII = legacy.WiiInputType;
const PS2 = legacy.Ps2InputType;
const PT = proto.PS2ControllerType;
const A2D = legacy.AnalogToDigitalType;
const GB = proto.GamepadButtonType;

const TAPS = [0, 1, 2, 3, 4];

function warnPeripheral(
  ctx: LegacyImportContext,
  peripheral: boolean | null | undefined,
  name: string
) {
  if (peripheral) {
    ctx.warn(`${name} on the secondary Pico was imported onto the main Pico, so check its pins.`);
  }
}

function warnTapBar(ctx: LegacyImportContext) {
  ctx.warn('A tap bar binding was skipped, the tap bar can now only be bound as tap frets.');
}

const isFiveFret = (ctx: LegacyImportContext) =>
  ctx.subType === ST.GuitarHeroGuitar || ctx.subType === ST.RockBandGuitar;

// The output and input of a binding, whatever type of binding it is
function bindingBody(output: legacy.ISerializedOutput) {
  const kind = legacy.SerializedOutput.fromObject(output).subtype;
  if (!kind) {
    return undefined;
  }
  return (output as Record<string, unknown>)[kind] as {
    input?: legacy.ISerializedInput | null;
    enabled?: boolean | null;
    debounce?: number | null;
    type?: number | null;
  };
}

// ---------------------------------------------------------------------------
// Wii extensions
// ---------------------------------------------------------------------------

function wiiDevice(
  ctx: LegacyImportContext,
  sda?: number | null,
  scl?: number | null,
  peripheral?: boolean | null
) {
  warnPeripheral(ctx, peripheral, 'A Wii extension');
  return ctx.addDevice('wii', `${sda},${scl}`, (dev) => setI2c(dev.i2c, sda, scl));
}

// Old inputs that were signed, these read the same as the new ones moved up by 32768. Every other
// input reads the same raw value as before.
const WII_SIGNED = new Set([
  'ClassicLeftStickX',
  'ClassicLeftStickY',
  'ClassicRightStickX',
  'ClassicRightStickY',
  'DrumJoystickX',
  'DrumJoystickY',
  'GuitarJoystickX',
  'GuitarJoystickY',
  'NunchukStickX',
  'NunchukStickY',
  'NunchukRotationPitch',
  'NunchukRotationRoll',
  'DjTurntableLeft',
  'DjTurntableRight',
  'DjStickX',
  'DjStickY',
]);

function wiiInput(
  ctx: LegacyImportContext,
  deviceid: number,
  type: legacy.WiiInputType | null | undefined
): ConvertedInput | undefined {
  const name = (WII[type ?? 0] ?? '').replace(/^WiiInputType_/, '');
  if (name.startsWith('NunchukAcceleration')) {
    ctx.warn(
      'Nunchuk acceleration bindings were skipped, the new firmware reads them on a different scale.'
    );
    return undefined;
  }
  if (name === 'GuitarTapBar' || name === 'GuitarTapAll') {
    warnTapBar(ctx);
    return undefined;
  }
  const axis = proto.WiiAxisType[`WiiAxis${name}` as keyof typeof proto.WiiAxisType];
  if (axis != null) {
    return { input: { wiiAxis: { deviceid, axis } }, analog: true, isUint: !WII_SIGNED.has(name) };
  }
  const button = proto.WiiButtonType[`WiiButton${name}` as keyof typeof proto.WiiButtonType];
  if (button != null) {
    return { input: { wiiButton: { deviceid, button } }, analog: false, isUint: true };
  }
  ctx.warn("A Wii binding the new firmware doesn't have was skipped.");
  return undefined;
}

const WII_EXTENSIONS = [
  'Classic',
  'Nunchuk',
  'Guitar',
  'Drum',
  'Dj',
  'UDraw',
  'Drawsome',
  'TaTaCon',
] as const;
type WiiExtension = (typeof WII_EXTENSIONS)[number];

const WII_EXTENSION_NAMES: Record<WiiExtension, string> = {
  Classic: 'Classic Controller',
  Nunchuk: 'Nunchuk',
  Guitar: 'guitar',
  Drum: 'drum kit',
  Dj: 'DJ Hero turntable',
  UDraw: 'uDraw tablet',
  Drawsome: 'Drawsome tablet',
  TaTaCon: 'Taiko drum',
};

function wiiExtension(input: proto.IInput): WiiExtension | undefined {
  const name = input.wiiAxis
    ? proto.WiiAxisType[input.wiiAxis.axis]
    : input.wiiButton
      ? proto.WiiButtonType[input.wiiButton.button]
      : undefined;
  const short = name?.replace(/^Wii(Axis|Button)/, '').replace(/^DjHero/, 'Dj');
  return WII_EXTENSIONS.find((ext) => short?.startsWith(ext));
}

function preferredWiiExtension(ctx: LegacyImportContext): WiiExtension | undefined {
  switch (ctx.subType) {
    case ST.GuitarHeroGuitar:
    case ST.RockBandGuitar:
    case ST.LiveGuitar:
      return 'Guitar';
    case ST.GuitarHeroDrums:
    case ST.RockBandDrums:
      return 'Drum';
    case ST.DjHeroTurntable:
      return 'Dj';
    case ST.Taiko:
      return 'TaTaCon';
    default:
      return undefined;
  }
}

// Whether a mapping does something while its input reads 0, which is what the new firmware reads
// from every extension other than the one plugged in
function activeAtZero(m: proto.IMapping) {
  if (m.trigger != null) {
    const value = m.triggerValue ?? 0;
    let pressed = false;
    switch (m.trigger) {
      case proto.AnalogToDigitalTriggerType.JoyLow:
        pressed = value > 0;
        break;
      case proto.AnalogToDigitalTriggerType.Exact:
        pressed = value === 0;
        break;
      case proto.AnalogToDigitalTriggerType.Range:
        pressed = value < 0 && (m.maxTriggerValue ?? 0) > 0;
        break;
    }
    return pressed !== !!m.inverted;
  }
  if (m.input?.wiiButton || m.pressed != null) {
    return !!m.inverted;
  }
  const min = m.min ?? 0;
  const max = m.max ?? 65535;
  const deadzone = m.deadzone ?? 0;
  if (m.section != null || !m.center) {
    // calibrated like a trigger
    return min > max ? min - deadzone >= 0 : min + deadzone < 0;
  }
  return m.center >= deadzone;
}

// The old firmware only read the inputs of the extension that was plugged in, while the new one
// reads every mapping, getting 0 from the other extensions. Analog bindings that react to that
// would fight the plugged in extension, so only one extension's ones can be kept.
function resolveWiiConflicts(ctx: LegacyImportContext, deviceid: number, start: number) {
  const conflicts = new Map<WiiExtension, proto.IMapping[]>();
  for (const m of ctx.mappings.slice(start)) {
    const input = m.input?.wiiAxis ?? m.input?.wiiButton;
    const ext = input?.deviceid === deviceid ? wiiExtension(m.input!) : undefined;
    if (ext && activeAtZero(m)) {
      conflicts.set(ext, [...(conflicts.get(ext) ?? []), m]);
    }
  }
  if (conflicts.size < 2) {
    return;
  }
  const preferred = preferredWiiExtension(ctx);
  const keep =
    preferred && conflicts.has(preferred)
      ? preferred
      : WII_EXTENSIONS.filter((ext) => conflicts.has(ext)).reduce((best, ext) =>
          conflicts.get(ext)!.length > conflicts.get(best)!.length ? ext : best
        );
  const remove = new Set([...conflicts].filter(([ext]) => ext !== keep).flatMap(([, ms]) => ms));
  for (let i = ctx.mappings.length - 1; i >= start; i--) {
    if (remove.has(ctx.mappings[i])) {
      ctx.mappings.splice(i, 1);
    }
  }
  ctx.warn(
    `Analog Wii bindings for other extensions than the ${WII_EXTENSION_NAMES[keep]} were skipped, as the new firmware reads them all at once. Add a profile for each other extension you use.`
  );
}

// ---------------------------------------------------------------------------
// PS2 controllers
// ---------------------------------------------------------------------------

// The controller types the new firmware reads standard buttons and sticks from
const PS2_STANDARD = [
  PT.PS2ControllerTypeDualshock2,
  PT.PS2ControllerTypeDualshock,
  PT.PS2ControllerTypeFlightStick,
  PT.PS2ControllerTypeDigital,
  PT.PS2ControllerTypeJogCon,
  PT.PS2ControllerTypeGunCon,
];
const PS2_STICKS = [
  PT.PS2ControllerTypeDualshock2,
  PT.PS2ControllerTypeDualshock,
  PT.PS2ControllerTypeFlightStick,
];
const PS2_STICK_NAMES = ['LeftStickX', 'LeftStickY', 'RightStickX', 'RightStickY'];
const PS2_SIGNED = new Set([...PS2_STICK_NAMES, 'MouseX', 'MouseY', 'NegConTwist']);
// The new firmware never detects a Taiko controller, they show up as digital controllers
const PS2_TAIKO: Record<string, string> = {
  TaikoRimLeft: 'L1',
  TaikoRimRight: 'R1',
  TaikoCenterLeft: 'DpadLeft',
  TaikoCenterRight: 'Circle',
};
// Guitars report their dpad differently, the old firmware switched to that for guitars
const PS2_GUITAR: Record<string, string> = {
  DpadUp: 'GuitarDpadUp',
  DpadDown: 'GuitarDpadDown',
  DpadLeft: 'GuitarDpadLeft',
  DpadRight: 'GuitarDpadRight',
  Start: 'GuitarStart',
  Select: 'GuitarSelect',
};

const PS2_TYPE_NAMES: Partial<Record<proto.PS2ControllerType, string>> = {
  [PT.PS2ControllerTypeDualshock2]: 'DualShock 2',
  [PT.PS2ControllerTypeDualshock]: 'DualShock',
  [PT.PS2ControllerTypeFlightStick]: 'flight stick',
  [PT.PS2ControllerTypeDigital]: 'digital controller',
  [PT.PS2ControllerTypeGuitar]: 'Guitar Hero guitar',
  [PT.PS2ControllerTypeNegCon]: 'NeGcon',
  [PT.PS2ControllerTypeJogCon]: 'JogCon',
  [PT.PS2ControllerTypeGunCon]: 'GunCon',
  [PT.PS2ControllerTypeMouse]: 'PS2 mouse',
};
const PS2_TYPES = Object.keys(PS2_TYPE_NAMES).map(Number) as proto.PS2ControllerType[];

interface Ps2Target {
  axis?: proto.PS2AxisType;
  button?: proto.PS2ButtonType;
  isUint: boolean;
}

// The new input an old PS2 input reads on a controller type, if that type has it
function ps2Target(
  type: legacy.Ps2InputType,
  controller: proto.PS2ControllerType
): Ps2Target | undefined {
  const oldName = (PS2[type] ?? '').replace(/^Ps2InputType_/, '');
  let name = PS2_TAIKO[oldName] ?? oldName;
  if (controller === PT.PS2ControllerTypeGuitar) {
    name = PS2_GUITAR[name] ?? name;
  }
  const types = name.startsWith('Guitar')
    ? [PT.PS2ControllerTypeGuitar]
    : name.startsWith('NegCon')
      ? [PT.PS2ControllerTypeNegCon]
      : name.startsWith('Mouse')
        ? [PT.PS2ControllerTypeMouse]
        : name.startsWith('JogCon')
          ? [PT.PS2ControllerTypeJogCon]
          : name.startsWith('GunCon')
            ? [PT.PS2ControllerTypeGunCon]
            : name.startsWith('Dualshock2')
              ? [PT.PS2ControllerTypeDualshock2]
              : PS2_STICK_NAMES.includes(name)
                ? PS2_STICKS
                : PS2_STANDARD;
  if (!types.includes(controller)) {
    return undefined;
  }
  const isUint = !PS2_SIGNED.has(oldName);
  const axis = proto.PS2AxisType[`PS2Axis${name}` as keyof typeof proto.PS2AxisType];
  if (axis != null) {
    return { axis, isUint };
  }
  const button = proto.PS2ButtonType[`PS2Button${name}` as keyof typeof proto.PS2ButtonType];
  return button != null ? { button, isUint } : undefined;
}

// Every old PS2 input in the config that was in use
function collectPs2Inputs(node: unknown, found: legacy.Ps2InputType[]) {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectPs2Inputs(n, found));
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj.enabled === false) {
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    const v = value as Record<string, unknown> | null;
    if (key === 'serializedPs2Input' || key === 'serializedPs2InputCombined') {
      const type = (v?.type as legacy.Ps2InputType | undefined) ?? 0;
      if (type === PS2.Ps2InputType_GuitarTapAll || type === PS2.Ps2InputType_GuitarTapBar) {
        found.push(...TAPS.map((i) => PS2.Ps2InputType_GuitarTapGreen + i));
      } else {
        found.push(type);
      }
    } else if (key === 'serializedJoystickToDpad' && v && !v.wii && v.enabled !== false) {
      found.push(PS2.Ps2InputType_LeftStickX, PS2.Ps2InputType_LeftStickY);
    } else if (key === 'serializedStartSelectHome' && v && !v.wii && startSelectHomeEnabled(v)) {
      found.push(PS2.Ps2InputType_Start, PS2.Ps2InputType_Select);
    } else {
      collectPs2Inputs(value, found);
    }
  }
}

interface Ps2State {
  type: proto.PS2ControllerType;
  devices: Set<string>;
}

const ps2States = new WeakMap<LegacyImportContext, Ps2State>();

// The new firmware only uses a PS2 controller in a profile assigned to its type, so work out the
// type the config was set up for from the inputs it used
function ps2State(ctx: LegacyImportContext): Ps2State {
  let state = ps2States.get(ctx);
  if (!state) {
    const inputs: legacy.Ps2InputType[] = [];
    collectPs2Inputs(ctx.old.bindings, inputs);
    const counts = new Map(PS2_TYPES.map((t) => [t, inputs.filter((i) => ps2Target(i, t)).length]));
    const guitar =
      ctx.subType === ST.GuitarHeroGuitar ||
      ctx.subType === ST.RockBandGuitar ||
      ctx.subType === ST.LiveGuitar;
    const type =
      guitar && counts.get(PT.PS2ControllerTypeGuitar)!
        ? PT.PS2ControllerTypeGuitar
        : PS2_TYPES.reduce((best, t) => (counts.get(t)! > counts.get(best)! ? t : best));
    state = { type, devices: new Set() };
    ps2States.set(ctx, state);
  }
  return state;
}

function ps2Slot(
  ctx: LegacyImportContext,
  pins: {
    mosi?: number | null;
    miso?: number | null;
    sck?: number | null;
    att?: number | null;
    ack?: number | null;
  },
  peripheral?: boolean | null
) {
  warnPeripheral(ctx, peripheral, 'A PS2 controller');
  const state = ps2State(ctx);
  const key = [pins.mosi, pins.miso, pins.sck, pins.att, pins.ack].join(',');
  ctx.addDevice('psx', key, (dev) => {
    setSpi(dev.spi, pins.mosi, pins.miso, pins.sck);
    dev.attPin = pins.att ?? -1;
    dev.ackPin = pins.ack ?? -1;
  });
  state.devices.add(key);
  if (state.devices.size > 1) {
    ctx.warn(
      'Only one PS2 controller is used per profile now, so add a profile for each other one.'
    );
  }
  ctx.warn(
    `The PS2 bindings were imported for a ${PS2_TYPE_NAMES[state.type]}, so the profile now only works with that type of PS2 controller.`
  );
  return ctx.addSlot('psx', 'main', { ps2Cnt: state.type });
}

function ps2Input(
  ctx: LegacyImportContext,
  deviceid: number,
  type: legacy.Ps2InputType | null | undefined
): ConvertedInput | undefined {
  const t = type ?? 0;
  if (t === PS2.Ps2InputType_GuitarTapBar || t === PS2.Ps2InputType_GuitarTapAll) {
    warnTapBar(ctx);
    return undefined;
  }
  const state = ps2State(ctx);
  const target = ps2Target(t, state.type);
  if (!target) {
    ctx.warn(
      `PS2 bindings that a ${PS2_TYPE_NAMES[state.type]} doesn't have were skipped. Add a profile for each other type of PS2 controller you use.`
    );
    return undefined;
  }
  return target.axis != null
    ? { input: { ps2Axis: { deviceid, axis: target.axis } }, analog: true, isUint: target.isUint }
    : { input: { ps2Button: { deviceid, button: target.button! } }, analog: false, isUint: true };
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

function combinedDevice(ctx: LegacyImportContext, kind: string) {
  if (ctx.combined?.kind !== kind) {
    ctx.warn('A combined input outside of its device was skipped.');
    return undefined;
  }
  return ctx.combined.deviceid;
}

registerInputConverters({
  serializedWiiInput: (ctx, { serializedWiiInput: i }) =>
    wiiInput(ctx, wiiDevice(ctx, i!.sda, i!.scl, i!.peripheral), i!.type),
  serializedWiiInputCombined: (ctx, { serializedWiiInputCombined: i }) => {
    const deviceid = combinedDevice(ctx, 'wii');
    return deviceid == null ? undefined : wiiInput(ctx, deviceid, i!.type);
  },
  serializedPs2Input: (ctx, { serializedPs2Input: i }) =>
    ps2Input(ctx, ps2Slot(ctx, i!, i!.peripheral), i!.type),
  serializedPs2InputCombined: (ctx, { serializedPs2InputCombined: i }) => {
    const deviceid = combinedDevice(ctx, 'psx');
    return deviceid == null ? undefined : ps2Input(ctx, deviceid, i!.type);
  },
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

// The old configurator turned bindings of the whole tap bar into one binding per tap fret when it
// built the firmware: the frets on 5 fret guitars, and the tap bar into the solo frets on Rock Band
// guitars. Returns false for any other binding.
function convertTapBinding(ctx: LegacyImportContext, output: legacy.ISerializedOutput): boolean {
  const body = bindingBody(output);
  const input = body?.input;
  const wii = input?.serializedWiiInputCombined ?? input?.serializedWiiInput;
  const ps2 = input?.serializedPs2InputCombined ?? input?.serializedPs2Input;
  const tapAll =
    wii?.type === WII.WiiInputType_GuitarTapAll || ps2?.type === PS2.Ps2InputType_GuitarTapAll;
  const tapBar =
    wii?.type === WII.WiiInputType_GuitarTapBar || ps2?.type === PS2.Ps2InputType_GuitarTapBar;
  if (!tapAll && !tapBar) {
    return false;
  }
  if (body!.enabled === false || !isFiveFret(ctx)) {
    // The old configurator dropped these on anything else
    if (tapBar && body!.enabled !== false) {
      warnTapBar(ctx);
    }
    return true;
  }
  const tapInput = (i: number): legacy.ISerializedInput => {
    if (wii) {
      const tap = { ...wii, type: WII.WiiInputType_GuitarTapGreen + i };
      return input!.serializedWiiInputCombined
        ? { serializedWiiInputCombined: tap }
        : { serializedWiiInput: tap };
    }
    const tap = { ...ps2!, type: PS2.Ps2InputType_GuitarTapGreen + i };
    return input!.serializedPs2InputCombined
      ? { serializedPs2InputCombined: tap }
      : { serializedPs2Input: tap };
  };
  // On Guitar Hero guitars the solo frets are the tap frets
  const first = tapAll ? LIB.InstrumentButtonType_Green : LIB.InstrumentButtonType_SoloGreen;
  TAPS.forEach((i) => addButton(ctx, tapInput(i), guitarButtonOutput(ctx, first + i), 5));
  return true;
}

// The old digital L2 / R2 bindings, which it didn't use on a DualShock 2 as that has their pressure
function isPs2DigitalTrigger(output: legacy.ISerializedOutput) {
  const child = bindingBody(output)?.input?.serializedDigitalToAnalog?.child;
  const type = (child?.serializedPs2InputCombined ?? child?.serializedPs2Input)?.type;
  return type === PS2.Ps2InputType_L2 || type === PS2.Ps2InputType_R2;
}

function convertChildren(
  ctx: LegacyImportContext,
  kind: 'wii' | 'psx',
  deviceid: number,
  outputs: legacy.ISerializedOutput[] | null | undefined
) {
  const previous = ctx.combined;
  ctx.combined = { kind, deviceid };
  const start = ctx.mappings.length;
  for (const child of outputs ?? []) {
    if (
      kind === 'psx' &&
      ps2State(ctx).type === PT.PS2ControllerTypeDualshock2 &&
      isPs2DigitalTrigger(child)
    ) {
      continue;
    }
    if (!convertTapBinding(ctx, child)) {
      convertOutput(ctx, child);
    }
  }
  if (kind === 'wii') {
    resolveWiiConflicts(ctx, deviceid, start);
  }
  ctx.combined = previous;
}

const WII_STICKS: [legacy.WiiInputType, legacy.WiiInputType][] = [
  [WII.WiiInputType_ClassicLeftStickX, WII.WiiInputType_ClassicLeftStickY],
  [WII.WiiInputType_NunchukStickX, WII.WiiInputType_NunchukStickY],
  [WII.WiiInputType_GuitarJoystickX, WII.WiiInputType_GuitarJoystickY],
  [WII.WiiInputType_DrumJoystickX, WII.WiiInputType_DrumJoystickY],
  [WII.WiiInputType_DjStickX, WII.WiiInputType_DjStickY],
];

// The old Wii / PS2 helpers were only used inside the Wii and PS2 combined outputs, where their
// inputs read from that device
function helperInput(ctx: LegacyImportContext, wii: boolean | null | undefined) {
  const kind = wii ? 'wii' : 'psx';
  if (ctx.combined?.kind !== kind) {
    ctx.warn(`A ${wii ? 'Wii' : 'PS2'} shortcut binding outside of its device was skipped.`);
    return undefined;
  }
  return (type: number): legacy.ISerializedInput =>
    wii ? { serializedWiiInputCombined: { type } } : { serializedPs2InputCombined: { type } };
}

// The old protobuf contract was written with enabled and peripheral swapped, so either being set
// means it was enabled: the peripheral flag is never set for these in practice
function startSelectHomeEnabled(o: { enabled?: unknown; peripheral?: unknown }) {
  return o.enabled !== false || !!o.peripheral;
}

registerOutputConverters({
  serializedWiiCombinedOutput: (ctx, { serializedWiiCombinedOutput: o }) =>
    convertChildren(ctx, 'wii', wiiDevice(ctx, o!.sda, o!.scl, o!.peripheral), o!.outputs),

  serializedPs2CombinedOutput: (ctx, { serializedPs2CombinedOutput: o }) =>
    convertChildren(ctx, 'psx', ps2Slot(ctx, o!, o!.peripheral), o!.outputs),

  // The left stick pressing the dpad past a threshold
  serializedJoystickToDpad: (ctx, { serializedJoystickToDpad: o }) => {
    if (o!.enabled === false) {
      return;
    }
    const input = helperInput(ctx, o!.wii);
    if (!input) {
      return;
    }
    const threshold = o!.threshold ?? 0;
    const sticks: [number, number][] = o!.wii
      ? WII_STICKS
      : [[PS2.Ps2InputType_LeftStickX, PS2.Ps2InputType_LeftStickY]];
    const dpad = (type: number, dir: legacy.AnalogToDigitalType, button: proto.GamepadButtonType) =>
      addButton(
        ctx,
        { serializedAnalogToDigital: { child: input(type), type: dir, threshold } },
        { gamepadButton: button },
        10
      );
    for (const [x, y] of sticks) {
      dpad(x, A2D.AnalogToDigitalType_JoyLow, GB.Gamepad_DpadLeft);
      dpad(x, A2D.AnalogToDigitalType_JoyHigh, GB.Gamepad_DpadRight);
      dpad(y, A2D.AnalogToDigitalType_JoyHigh, GB.Gamepad_DpadUp);
      dpad(y, A2D.AnalogToDigitalType_JoyLow, GB.Gamepad_DpadDown);
    }
  },

  // Start and select together pressing the guide button
  serializedStartSelectHome: (ctx, { serializedStartSelectHome: o }) => {
    if (!startSelectHomeEnabled(o!)) {
      return;
    }
    const input = helperInput(ctx, o!.wii);
    if (!input) {
      return;
    }
    const pairs: [number, number][] = o!.wii
      ? [
          [WII.WiiInputType_ClassicPlus, WII.WiiInputType_ClassicMinus],
          [WII.WiiInputType_GuitarPlus, WII.WiiInputType_GuitarMinus],
          [WII.WiiInputType_DrumPlus, WII.WiiInputType_DrumMinus],
          [WII.WiiInputType_DjHeroPlus, WII.WiiInputType_DjHeroMinus],
        ]
      : [[PS2.Ps2InputType_Start, PS2.Ps2InputType_Select]];
    for (const [start, select] of pairs) {
      addButton(
        ctx,
        { serializedMacroInput: { child1: input(start), child2: input(select) } },
        { gamepadButton: GB.Gamepad_Guide },
        10
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Console output (the device acting as a Wii extension or a PS2 controller)
// ---------------------------------------------------------------------------

// Sets up the Wii extension and PS2 controller emulation the old config had. These are a separate
// way of connecting to a console, so the returned assignments each need their own assignment list
// in the profile (alongside the host device assignments), not the USB one.
export function convertWiiPs2Settings(ctx: LegacyImportContext): proto.IProfileAssignmentInfo[] {
  const old = ctx.old;
  const assignments: proto.IProfileAssignmentInfo[] = [];
  if (old.hasWiiOutput) {
    ctx.addDevice('wiiEmulation', 'main', (dev) =>
      setI2c(dev.i2c, old.wiiOutputSda, old.wiiOutputScl)
    );
    if (old.hasWiiOutputEn) {
      ctx.warn(
        'The Wii output enable pin was skipped, the new firmware detects the Wii Remote itself.'
      );
    }
    assignments.push({ wiiEmulation: {} });
  }
  if (old.hasPs2Output) {
    ctx.addDevice('psxEmulation', 'main', (dev) => {
      dev.dataPin = old.ps2OutputMiso ?? -1;
      dev.commandPin = old.ps2OutputMosi ?? -1;
      dev.attentionPin = old.ps2OutputAtt ?? -1;
      dev.clockPin = old.ps2OutputSck ?? -1;
      dev.acknowledgePin = old.ps2OutputAck ?? -1;
    });
    assignments.push({ ps2Emulation: {} });
  }
  return assignments;
}
