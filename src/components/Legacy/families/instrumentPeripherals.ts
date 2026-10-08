import { getProtarNeckDefaults } from '@/components/Defaults/defaultMappings';
import { proto } from '@/components/SettingsContext/config';
import {
  CombinedSource,
  ConvertedInput,
  LegacyImportContext,
  setI2c,
  setSpi,
  setUart,
} from '../context';
import { convertInput, registerInputConverters } from '../inputs';
import { legacy } from '../legacy';
import {
  addButton,
  addButtonMapping,
  convertOutput,
  guitarButtonOutput,
  registerOutputConverters,
  registerTapBarConverter,
} from '../outputs';

const ST = proto.SubType;
const GH5 = legacy.Gh5NeckInputType;
const LIB = legacy.InstrumentButtonType;

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

function warnPeripheral(
  ctx: LegacyImportContext,
  peripheral: boolean | null | undefined,
  name: string
) {
  if (peripheral) {
    ctx.warn(`${name} on the secondary Pico was imported onto the main Pico, so check its pins.`);
  }
}

function gh5Device(
  ctx: LegacyImportContext,
  sda?: number | null,
  scl?: number | null,
  peripheral?: boolean | null
) {
  warnPeripheral(ctx, peripheral, 'A GH5 neck');
  return ctx.addDevice('gh5Neck', `${sda},${scl}`, (dev) => setI2c(dev.i2c, sda, scl));
}

// The old "clone" neck is the EKT2101 based neck the new firmware calls the crazy guitar neck
function cloneDevice(
  ctx: LegacyImportContext,
  sda?: number | null,
  scl?: number | null,
  peripheral?: boolean | null
) {
  warnPeripheral(ctx, peripheral, 'A GH5 clone neck');
  return ctx.addDevice('crazyGuitarNeck', `${sda},${scl}`, (dev) => setI2c(dev.i2c, sda, scl));
}

function crkdDevice(
  ctx: LegacyImportContext,
  tx?: number | null,
  rx?: number | null,
  peripheral?: boolean | null
) {
  warnPeripheral(ctx, peripheral, 'A CRKD neck');
  return ctx.addDevice('crkdNeck', `${tx},${rx}`, (dev) => {
    setUart(dev.uart, tx, rx);
    dev.uart!.baudrate = 460800;
  });
}

// Both turntables sat on the same bus, the old firmware told them apart by address
function djDevice(
  ctx: LegacyImportContext,
  left: boolean,
  sda?: number | null,
  scl?: number | null,
  peripheral?: boolean | null
) {
  warnPeripheral(ctx, peripheral, 'A DJ Hero turntable');
  if (ctx.old.djSmooth) {
    ctx.warn("Turntable smoothing was skipped, the new firmware doesn't smooth the platters.");
  }
  return ctx.addDevice('djhTurntable', `${sda},${scl},${left ? 'left' : 'right'}`, (dev) => {
    setI2c(dev.i2c, sda, scl);
    dev.left = left;
    if (ctx.old.djPollRate) {
      dev.pollIntervalMs = ctx.old.djPollRate;
    }
  });
}

interface DjSource extends CombinedSource {
  sda?: number | null;
  scl?: number | null;
  peripheral?: boolean | null;
}

function combinedDevice(ctx: LegacyImportContext, kind: string) {
  if (ctx.combined?.kind !== kind) {
    ctx.warn('A combined input outside of its device was skipped.');
    return undefined;
  }
  return ctx.combined;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const button = (input: proto.IInput): ConvertedInput => ({ input, analog: false, isUint: true });

function warnTapBar(ctx: LegacyImportContext) {
  ctx.warn('A tap bar binding was skipped, the tap bar can now only be bound as tap frets.');
}

// The old neck inputs are numbered like the new ones, but start from 0
function gh5Input(
  ctx: LegacyImportContext,
  deviceid: number,
  type: legacy.Gh5NeckInputType | null | undefined
) {
  const t = type ?? GH5.Gh5NeckInputType_Green;
  if (t > GH5.Gh5NeckInputType_TapOrange) {
    warnTapBar(ctx);
    return undefined;
  }
  return button({ gh5Neck: { deviceid, button: (t + 1) as proto.Gh5NeckButtonType } });
}

function cloneInput(
  ctx: LegacyImportContext,
  deviceid: number,
  type: legacy.Gh5NeckInputType | null | undefined
) {
  const t = type ?? GH5.Gh5NeckInputType_Green;
  if (t > GH5.Gh5NeckInputType_TapOrange) {
    warnTapBar(ctx);
    return undefined;
  }
  return button({
    crazyGuitarNeck: { deviceid, button: (t + 1) as proto.CrazyGuitarNeckButtonType },
  });
}

const CRKD_BUTTONS: Record<legacy.CrkdNeckInputType, proto.CrkdNeckButtonType> = {
  [legacy.CrkdNeckInputType.CrkdNeckInputType_Green]: proto.CrkdNeckButtonType.CrkdGreen,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_Red]: proto.CrkdNeckButtonType.CrkdRed,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_Yellow]: proto.CrkdNeckButtonType.CrkdYellow,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_Blue]: proto.CrkdNeckButtonType.CrkdBlue,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_Orange]: proto.CrkdNeckButtonType.CrkdOrange,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_DpadLeft]: proto.CrkdNeckButtonType.CrkdDpadLeft,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_DpadRight]: proto.CrkdNeckButtonType.CrkdDpadRight,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_DpadUp]: proto.CrkdNeckButtonType.CrkdDpadUp,
  [legacy.CrkdNeckInputType.CrkdNeckInputType_DpadDown]: proto.CrkdNeckButtonType.CrkdDpadDown,
};

const crkdInput = (deviceid: number, type: legacy.CrkdNeckInputType | null | undefined) =>
  button({
    crkd: {
      deviceid,
      button: CRKD_BUTTONS[type ?? legacy.CrkdNeckInputType.CrkdNeckInputType_Green],
    },
  });

const DJ = legacy.DjInputType;
const DJ_TYPES: Record<legacy.DjInputType, proto.DJHeroPlatterInputType> = {
  [DJ.DjInputType_LeftTurntable]: proto.DJHeroPlatterInputType.DJHeroPlatterVelocity,
  [DJ.DjInputType_RightTurntable]: proto.DJHeroPlatterInputType.DJHeroPlatterVelocity,
  [DJ.DjInputType_LeftGreen]: proto.DJHeroPlatterInputType.DJHeroPlatterGreen,
  [DJ.DjInputType_LeftRed]: proto.DJHeroPlatterInputType.DJHeroPlatterRed,
  [DJ.DjInputType_LeftBlue]: proto.DJHeroPlatterInputType.DJHeroPlatterBlue,
  [DJ.DjInputType_RightGreen]: proto.DJHeroPlatterInputType.DJHeroPlatterGreen,
  [DJ.DjInputType_RightRed]: proto.DJHeroPlatterInputType.DJHeroPlatterRed,
  [DJ.DjInputType_RightBlue]: proto.DJHeroPlatterInputType.DJHeroPlatterBlue,
};

const isLeftDj = (type: legacy.DjInputType) =>
  type === DJ.DjInputType_LeftTurntable ||
  (type >= DJ.DjInputType_LeftGreen && type <= DJ.DjInputType_LeftBlue);

function djInput(
  ctx: LegacyImportContext,
  type: legacy.DjInputType | null | undefined,
  sda?: number | null,
  scl?: number | null,
  peripheral?: boolean | null
): ConvertedInput {
  const t = type ?? DJ.DjInputType_LeftTurntable;
  const deviceid = djDevice(ctx, isLeftDj(t), sda, scl, peripheral);
  const velocity = t === DJ.DjInputType_LeftTurntable || t === DJ.DjInputType_RightTurntable;
  // The old platter velocity was signed
  return {
    input: { djhPlatter: { deviceid, type: DJ_TYPES[t] } },
    analog: velocity,
    isUint: !velocity,
    // the old velocity was the raw value << 9, the new one is (raw + 128) << 8
    scale: velocity ? 0.5 : undefined,
  };
}

function warnWorldTourNeck(ctx: LegacyImportContext) {
  ctx.warn("The World Tour tap bar was skipped, the new firmware doesn't support it.");
}

registerInputConverters({
  serializedGh5NeckInput: (ctx, { serializedGh5NeckInput: i }) =>
    gh5Input(ctx, gh5Device(ctx, i!.sda, i!.scl, i!.peripheral), i!.type),
  serializedGh5NeckInputCombined: (ctx, { serializedGh5NeckInputCombined: i }) => {
    const source = combinedDevice(ctx, 'gh5Neck');
    return source && gh5Input(ctx, source.deviceid, i!.type);
  },
  serializedCloneNeckInput: (ctx, { serializedCloneNeckInput: i }) =>
    cloneInput(ctx, cloneDevice(ctx, i!.sda, i!.scl, i!.peripheral), i!.type),
  serializedCloneNeckInputCombined: (ctx, { serializedCloneNeckInputCombined: i }) => {
    const source = combinedDevice(ctx, 'crazyGuitarNeck');
    return source && cloneInput(ctx, source.deviceid, i!.type);
  },
  serializedCrkdNeckInput: (ctx, { serializedCrkdNeckInput: i }) =>
    crkdInput(crkdDevice(ctx, i!.tx, i!.rx, i!.peripheral), i!.type),
  serializedCrkdNeckInputCombined: (ctx, { serializedCrkdNeckInputCombined: i }) => {
    const source = combinedDevice(ctx, 'crkdNeck');
    return source && crkdInput(source.deviceid, i!.type);
  },
  serializedDjInput: (ctx, { serializedDjInput: i }) =>
    djInput(ctx, i!.type, i!.sda, i!.scl, i!.peripheral),
  serializedDjInputCombined: (ctx, { serializedDjInputCombined: i }) => {
    const source = combinedDevice(ctx, 'djhTurntable') as DjSource | undefined;
    return source && djInput(ctx, i!.type, source.sda, source.scl, source.peripheral);
  },
  serializedGhWtInput: (ctx) => {
    warnWorldTourNeck(ctx);
    return undefined;
  },
  serializedGhWtInputCombined: (ctx) => {
    warnWorldTourNeck(ctx);
    return undefined;
  },
  serializedMpr121SliderInput: (ctx) => {
    warnTapBar(ctx);
    return undefined;
  },
});

// ---------------------------------------------------------------------------
// Tap bar
// ---------------------------------------------------------------------------

// The GH5 slider value for each combination of tap frets (bit 0 green - bit 4 orange)
const GH5_SLIDER = [
  0x80, 0x15, 0x4d, 0x30, 0x9a, 0x99, 0x66, 0x65, 0xc9, 0xc7, 0xc8, 0xc6, 0xaf, 0xad, 0xae, 0xac,
  0xff, 0xfb, 0xfd, 0xf9, 0xfe, 0xfa, 0xfc, 0xf8, 0xe6, 0xe2, 0xe4, 0xe0, 0xe5, 0xe1, 0xe3, 0xdf,
];

const TAPS = [0, 1, 2, 3, 4];

// The tap frets (green - orange) behind an old tap bar input, as old inputs that read one each
function tapInputs(
  ctx: LegacyImportContext,
  input: legacy.ISerializedInput
): (legacy.ISerializedInput | undefined)[] | undefined {
  const tap = (type: legacy.Gh5NeckInputType | null | undefined) =>
    type === GH5.Gh5NeckInputType_TapBar || type === GH5.Gh5NeckInputType_TapAll;
  const tapType = (i: number) => GH5.Gh5NeckInputType_TapGreen + i;
  const {
    serializedGh5NeckInput: gh5,
    serializedGh5NeckInputCombined: gh5Combined,
    serializedCloneNeckInput: clone,
    serializedCloneNeckInputCombined: cloneCombined,
    serializedMpr121SliderInput: mpr121,
    serializedDigitalToAnalog: digital,
  } = input;
  if (gh5 && tap(gh5.type)) {
    return TAPS.map((i) => ({ serializedGh5NeckInput: { ...gh5, type: tapType(i) } }));
  }
  if (gh5Combined && tap(gh5Combined.type)) {
    return TAPS.map((i) => ({
      serializedGh5NeckInputCombined: { ...gh5Combined, type: tapType(i) },
    }));
  }
  if (clone && tap(clone.type)) {
    return TAPS.map((i) => ({ serializedCloneNeckInput: { ...clone, type: tapType(i) } }));
  }
  if (cloneCombined && tap(cloneCombined.type)) {
    return TAPS.map((i) => ({
      serializedCloneNeckInputCombined: { ...cloneCombined, type: tapType(i) },
    }));
  }
  if (mpr121) {
    const pins = [
      mpr121.inputGreen,
      mpr121.inputRed,
      mpr121.inputYellow,
      mpr121.inputBlue,
      mpr121.inputOrange,
    ];
    return pins.map((pin) => ({
      serializedMpr121Input: { input: pin ?? 0, peripheral: mpr121.peripheral },
    }));
  }
  if (digital?.child) {
    // A digital input that set the slider to a fixed value presses the tap frets for that value
    const frets = GH5_SLIDER.indexOf((digital.on ?? 0) & 0xff);
    return TAPS.map((i) => (frets > 0 && frets & (1 << i) ? digital.child! : undefined));
  }
  if (input.serializedGhWtInput || input.serializedGhWtInputCombined) {
    warnWorldTourNeck(ctx);
    return [];
  }
  return undefined;
}

function sliderOutput(ctx: LegacyImportContext, index: number): proto.IOutput | undefined {
  const colour = (['Green', 'Red', 'Yellow', 'Blue', 'Orange'] as const)[index];
  switch (ctx.subType) {
    case ST.GuitarHeroGuitar:
      return { ghButton: proto.GuitarHeroGuitarButtonType[`GuitarHeroGuitar_Tap${colour}`] };
    case ST.RockBandGuitar:
      // The old configurator turned the tap bar into the solo frets on Rock Band guitars
      return { rbButton: proto.RockBandGuitarButtonType[`RockBandGuitar_Solo${colour}`] };
    default:
      return undefined;
  }
}

// Converts an old binding that read the whole tap bar (a slider axis, or the tap bar pressing the
// frets), which the new firmware does with one tap fret input per colour. Returns false for any
// other binding.
export function convertTapBarBinding(
  ctx: LegacyImportContext,
  output: legacy.ISerializedOutput
): boolean {
  const { serializedGuitarButton: b, serializedGuitarAxis: a } = output;
  const frets =
    b &&
    (b.type === LIB.InstrumentButtonType_Slider ||
      b.type === LIB.InstrumentButtonType_SliderToFrets);
  const slider = a?.type === legacy.GuitarAxisType.GuitarAxisType_Slider;
  const source = frets ? b : slider ? a : undefined;
  if (!source) {
    return false;
  }
  if (source.enabled === false || !source.input) {
    return true;
  }
  const inputs = tapInputs(ctx, source.input);
  if (!inputs) {
    warnTapBar(ctx);
    return true;
  }
  if (frets) {
    inputs.forEach((input, i) =>
      addButton(
        ctx,
        input,
        guitarButtonOutput(ctx, LIB.InstrumentButtonType_Green + i),
        b!.debounce
      )
    );
    return true;
  }
  if (ctx.subType === ST.LiveGuitar) {
    // Guitar Hero Live guitars have no slider, the old firmware ignored it too
    return true;
  }
  inputs.forEach((input, i) => {
    const out = sliderOutput(ctx, i);
    if (!out) {
      ctx.warn('A tap bar slider binding was skipped, the emulated controller has no slider.');
      return;
    }
    const converted = input && convertInput(ctx, input);
    if (converted) {
      addButtonMapping(ctx, { ...converted, analog: false, digitalToAnalog: undefined }, out);
    }
  });
  return true;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

function convertChildren(
  ctx: LegacyImportContext,
  source: CombinedSource,
  outputs: legacy.ISerializedOutput[] | null | undefined
) {
  const previous = ctx.combined;
  ctx.combined = source;
  for (const child of outputs ?? []) {
    if (!convertTapBarBinding(ctx, child)) {
      convertOutput(ctx, child);
    }
  }
  ctx.combined = previous;
}

registerOutputConverters({
  serializedGh5CombinedOutput: (ctx, { serializedGh5CombinedOutput: o }) =>
    convertChildren(
      ctx,
      { kind: 'gh5Neck', deviceid: gh5Device(ctx, o!.sda, o!.scl, o!.peripheral) },
      o!.outputs
    ),

  serializedCloneCombinedOutput: (ctx, { serializedCloneCombinedOutput: o }) =>
    convertChildren(
      ctx,
      { kind: 'crazyGuitarNeck', deviceid: cloneDevice(ctx, o!.sda, o!.scl, o!.peripheral) },
      o!.outputs
    ),

  serializedCrkdCombinedOutput: (ctx, { serializedCrkdCombinedOutput: o }) =>
    convertChildren(
      ctx,
      { kind: 'crkdNeck', deviceid: crkdDevice(ctx, o!.tx, o!.rx, o!.peripheral) },
      o!.outputs
    ),

  // The turntables are only added once a binding uses them
  serializedDjCombinedOutput: (ctx, { serializedDjCombinedOutput: o }) => {
    const source: DjSource = {
      kind: 'djhTurntable',
      deviceid: 0,
      sda: o!.sda,
      scl: o!.scl,
      peripheral: o!.peripheral,
    };
    convertChildren(ctx, source, o!.outputs);
  },

  serializedGhwtCombinedOutput: (ctx) => warnWorldTourNeck(ctx),

  // This only marked the controller as a pro guitar, the Mustang neck is a config setting
  serializedProGuitarCombinedOutput: () => {},
});

// ---------------------------------------------------------------------------
// Config level peripherals
// ---------------------------------------------------------------------------

const RB_DRUM_NOTES: Record<number, number> = { 45: 41, 38: 38, 46: 48, 48: 45, 49: 41 };
const GH_DRUM_NOTES: Record<number, number> = { 45: 41, 38: 38, 46: 22, 48: 45, 49: 51 };

// The old firmware renamed the notes from the Band Hero / World Tour drums before the MIDI
// bindings saw them, while the new firmware hands the drum's own notes to its MIDI slot. Returns
// the drum notes that an old MIDI binding's note came from.
export function legacyDrumNotes(subType: proto.SubType, oldNote: number): number[] {
  const renamed = subType === ST.RockBandDrums ? RB_DRUM_NOTES : GH_DRUM_NOTES;
  const notes = Object.entries(renamed)
    .filter(([, note]) => note === oldNote)
    .map(([raw]) => parseInt(raw, 10));
  return oldNote in renamed ? notes : [oldNote, ...notes];
}

// The MIDI slots for the Band Hero / World Tour drums. Old MIDI bindings read every MIDI source at
// once, so they need to be bound to each of these too, with notes from `legacyDrumNotes`.
export function legacyDrumMidiSlots(ctx: LegacyImportContext): number[] {
  const old = ctx.old;
  const slots: number[] = [];
  if (old.hasBhDrumInput) {
    ctx.addDevice('bhDrum', 'main', (dev) => setI2c(dev.i2c, old.bhDrumSda, old.bhDrumScl));
    slots.push(ctx.addSlot('midi', 'bhDrum', { midiChannel: 10 }));
  }
  if (old.hasWtDrumInput) {
    ctx.addDevice('worldTourDrum', 'main', (dev) => {
      setSpi(dev.spi, old.wtDrumMosi, old.wtDrumMiso, old.wtDrumSck);
      dev.csPin = old.wtDrumCs ?? -1;
    });
    slots.push(ctx.addSlot('midi', 'worldTourDrum', { midiChannel: 10 }));
  }
  return slots;
}

// Adds the peripherals that were config settings rather than bindings
export function convertInstrumentPeripheralSettings(ctx: LegacyImportContext) {
  const old = ctx.old;
  // The old firmware sent the Mustang neck straight to the pro guitar report
  if (
    old.hasMustangNeckInput &&
    (ctx.subType === ST.ProGuitarMustang || ctx.subType === ST.ProGuitarSquire)
  ) {
    const deviceid = ctx.addDevice('protarNeck', 'main', (dev) => {
      setSpi(dev.spi, old.mustangNeckMosi, old.mustangNeckMiso, old.mustangNeckSck);
      dev.attPin = old.mustangNeckCs ?? -1;
    });
    ctx.mappings.push(...getProtarNeckDefaults(ctx.subType, deviceid));
  }
  legacyDrumMidiSlots(ctx);
}

registerTapBarConverter(convertTapBarBinding);
