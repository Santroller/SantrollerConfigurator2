import { addMatrixPins, withMatrixPins } from '@/components/Devices/matrixPins';
import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { AnalogPins } from '@/devices/pico/pins';
import { findDeviceStatus } from '../guideConfig';
import { gpPin } from '../wiringText';

export interface PinMappingTarget {
  name: string;
  type: 'ghButton' | 'rbButton' | 'gamepadButton' | 'ghAxis' | 'rbAxis';
  id: number;
}

export const GUITAR_TARGETS = {
  // Frets
  FRET_GREEN: {
    name: 'Green Fret',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Green,
  },
  FRET_RED: {
    name: 'Red Fret',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Red,
  },
  FRET_YELLOW: {
    name: 'Yellow Fret',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Yellow,
  },
  FRET_BLUE: {
    name: 'Blue Fret',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Blue,
  },
  FRET_ORANGE: {
    name: 'Orange Fret',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_Orange,
  },

  // Slider Bar (GH Tap / RB Solo)
  TAP_GREEN: {
    name: 'Tap Green',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapGreen,
  },
  TAP_RED: {
    name: 'Tap Red',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapRed,
  },
  TAP_YELLOW: {
    name: 'Tap Yellow',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapYellow,
  },
  TAP_BLUE: {
    name: 'Tap Blue',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapBlue,
  },
  TAP_ORANGE: {
    name: 'Tap Orange',
    type: 'ghButton' as const,
    id: proto.GuitarHeroGuitarButtonType.GuitarHeroGuitar_TapOrange,
  },

  // Rock Band Solo Frets (Lower Neck)
  SOLO_GREEN: {
    name: 'Solo Green',
    type: 'rbButton' as const,
    id: proto.RockBandGuitarButtonType.RockBandGuitar_SoloGreen,
  },
  SOLO_RED: {
    name: 'Solo Red',
    type: 'rbButton' as const,
    id: proto.RockBandGuitarButtonType.RockBandGuitar_SoloRed,
  },
  SOLO_YELLOW: {
    name: 'Solo Yellow',
    type: 'rbButton' as const,
    id: proto.RockBandGuitarButtonType.RockBandGuitar_SoloYellow,
  },
  SOLO_BLUE: {
    name: 'Solo Blue',
    type: 'rbButton' as const,
    id: proto.RockBandGuitarButtonType.RockBandGuitar_SoloBlue,
  },
  SOLO_ORANGE: {
    name: 'Solo Orange',
    type: 'rbButton' as const,
    id: proto.RockBandGuitarButtonType.RockBandGuitar_SoloOrange,
  },

  // Rock Band 7-wire Matrix Row Commons
  UPPER_COMMON: {
    name: 'Upper Frets Common',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_RightThumbClick,
  },
  SOLO_COMMON: {
    name: 'Solo Frets Common',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_LeftThumbClick,
  },
  SOLO_SWITCH: {
    name: 'RB Solo Switch',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_LeftThumbClick,
  },

  // Rock Band 5-Way Pickup Selector
  PICKUP_SELECTOR: {
    name: 'Pickup Selector',
    type: 'rbAxis' as const,
    id: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup,
  },

  // Strum
  STRUM_UP: {
    name: 'Strum Up',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_DpadUp,
  },
  STRUM_DOWN: {
    name: 'Strum Down',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_DpadDown,
  },

  // Whammy & Tilt
  WHAMMY: {
    name: 'Whammy Bar',
    type: 'ghAxis' as const,
    id: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy,
  },
  TILT: {
    name: 'Tilt',
    type: 'ghAxis' as const,
    id: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt,
  },

  // Navigation
  START: {
    name: 'Start / Plus',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_Start,
  },
  SELECT: {
    name: 'Select / Minus',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_Back,
  },
  GUIDE: {
    name: 'Home / Xbox / PS',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_Guide,
  },
  DPAD_LEFT: {
    name: 'D-Pad Left',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_DpadLeft,
  },
  DPAD_RIGHT: {
    name: 'D-Pad Right',
    type: 'gamepadButton' as const,
    id: proto.GamepadButtonType.Gamepad_DpadRight,
  },
};

export type GuitarFamily = 'gh' | 'rb';

/**
 * Standard recommended pinout for Guitar Hero guitars. labelKey is under
 * guides.direct-pico-guitar.steps.intro.pinoutLabels
 */
export const RECOMMENDED_PICO_PINOUT_GH = [
  {
    target: GUITAR_TARGETS.FRET_GREEN,
    pin: 2,
    labelKey: 'greenFret',
    color: 'green',
    physicalPin: 4,
  },
  { target: GUITAR_TARGETS.FRET_RED, pin: 3, labelKey: 'redFret', color: 'red', physicalPin: 5 },
  {
    target: GUITAR_TARGETS.FRET_YELLOW,
    pin: 4,
    labelKey: 'yellowFret',
    color: 'yellow',
    physicalPin: 6,
  },
  { target: GUITAR_TARGETS.FRET_BLUE, pin: 5, labelKey: 'blueFret', color: 'blue', physicalPin: 7 },
  {
    target: GUITAR_TARGETS.FRET_ORANGE,
    pin: 6,
    labelKey: 'orangeFret',
    color: 'orange',
    physicalPin: 9,
  },
  { target: GUITAR_TARGETS.STRUM_UP, pin: 7, labelKey: 'strumUp', color: 'cyan', physicalPin: 10 },
  {
    target: GUITAR_TARGETS.STRUM_DOWN,
    pin: 8,
    labelKey: 'strumDown',
    color: 'indigo',
    physicalPin: 11,
  },
  { target: GUITAR_TARGETS.START, pin: 9, labelKey: 'startPlus', color: 'teal', physicalPin: 12 },
  {
    target: GUITAR_TARGETS.SELECT,
    pin: 10,
    labelKey: 'selectMinus',
    color: 'teal',
    physicalPin: 14,
  },
  {
    target: GUITAR_TARGETS.TILT,
    pin: 11,
    labelKey: 'tiltSwitch',
    color: 'teal',
    physicalPin: 15,
  },
  {
    target: GUITAR_TARGETS.WHAMMY,
    pin: 26,
    labelKey: 'whammyAdc0',
    color: 'grape',
    physicalPin: 31,
  },
];

/**
 * Standard recommended pinout for Rock Band guitars (includes Solo line & Pickup Selector)
 */
export const RECOMMENDED_PICO_PINOUT_RB = [
  {
    target: GUITAR_TARGETS.FRET_GREEN,
    pin: 2,
    labelKey: 'greenFret',
    color: 'green',
    physicalPin: 4,
  },
  { target: GUITAR_TARGETS.FRET_RED, pin: 3, labelKey: 'redFret', color: 'red', physicalPin: 5 },
  {
    target: GUITAR_TARGETS.FRET_YELLOW,
    pin: 4,
    labelKey: 'yellowFret',
    color: 'yellow',
    physicalPin: 6,
  },
  { target: GUITAR_TARGETS.FRET_BLUE, pin: 5, labelKey: 'blueFret', color: 'blue', physicalPin: 7 },
  {
    target: GUITAR_TARGETS.FRET_ORANGE,
    pin: 6,
    labelKey: 'orangeFret',
    color: 'orange',
    physicalPin: 9,
  },
  { target: GUITAR_TARGETS.STRUM_UP, pin: 7, labelKey: 'strumUp', color: 'cyan', physicalPin: 10 },
  {
    target: GUITAR_TARGETS.STRUM_DOWN,
    pin: 8,
    labelKey: 'strumDown',
    color: 'indigo',
    physicalPin: 11,
  },
  { target: GUITAR_TARGETS.START, pin: 9, labelKey: 'startPlus', color: 'teal', physicalPin: 12 },
  {
    target: GUITAR_TARGETS.SELECT,
    pin: 10,
    labelKey: 'selectMinus',
    color: 'teal',
    physicalPin: 14,
  },
  {
    target: GUITAR_TARGETS.TILT,
    pin: 11,
    labelKey: 'tiltSwitch',
    color: 'teal',
    physicalPin: 15,
  },
  {
    target: GUITAR_TARGETS.UPPER_COMMON,
    pin: 14,
    labelKey: 'upperFretsCommon',
    color: 'violet',
    physicalPin: 19,
  },
  {
    target: GUITAR_TARGETS.SOLO_COMMON,
    pin: 15,
    labelKey: 'soloFretsCommon',
    color: 'violet',
    physicalPin: 20,
  },
  {
    target: GUITAR_TARGETS.WHAMMY,
    pin: 26,
    labelKey: 'whammyAdc0',
    color: 'grape',
    physicalPin: 31,
  },
  {
    target: GUITAR_TARGETS.PICKUP_SELECTOR,
    pin: 27,
    labelKey: 'pickupSelectorAdc1',
    color: 'orange',
    physicalPin: 32,
  },
];

export const RECOMMENDED_PICO_PINOUT = RECOMMENDED_PICO_PINOUT_GH;

/**
 * Finds the index of a mapping in the current profile that matches the target.
 */
export function findMappingIndex(
  profile: proto.IProfile | undefined,
  target: PinMappingTarget
): number {
  if (!profile?.mappings) {
    return -1;
  }
  return profile.mappings.findIndex((m) => {
    if (!m.mapping) {
      return false;
    }
    switch (target.type) {
      case 'ghButton':
        return m.mapping.ghButton === target.id || m.mapping.rbButton === target.id;
      case 'rbButton':
        return m.mapping.rbButton === target.id || m.mapping.ghButton === target.id;
      case 'gamepadButton':
        return m.mapping.gamepadButton === target.id;
      case 'ghAxis':
        return m.mapping.ghAxis === target.id || m.mapping.rbAxis === target.id;
      case 'rbAxis':
        return m.mapping.rbAxis === target.id || m.mapping.ghAxis === target.id;
      default:
        return false;
    }
  });
}

/**
 * The GH and RB button / axis enums share ids (frets 1-5, tap / solo 6-10, whammy 1, tilt 2),
 * so a target only needs its output field swapped to suit the family being emulated.
 */
export function targetForFamily(target: PinMappingTarget, family: GuitarFamily): PinMappingTarget {
  if (family === 'rb') {
    if (target.type === 'ghButton') {
      return { ...target, type: 'rbButton' };
    }
    if (target.type === 'ghAxis') {
      return { ...target, type: 'rbAxis' };
    }
  } else {
    if (target.type === 'rbButton') {
      return { ...target, type: 'ghButton' };
    }
    if (
      target.type === 'rbAxis' &&
      target.id !== proto.RockBandGuitarAxisType.RockBandGuitar_Pickup
    ) {
      return { ...target, type: 'ghAxis' };
    }
  }
  return target;
}

function profileFamily(profile: proto.IProfile): GuitarFamily {
  return profile.opts?.deviceToEmulate === proto.SubType.RockBandGuitar ? 'rb' : 'gh';
}

/**
 * Builds a GPIO mapping for a target, or updates an existing one in place. A digital pin driving
 * an axis (eg a tilt switch) uses pressed instead of calibration, as min and max are meaningless.
 */
function gpioMapping(
  target: PinMappingTarget,
  family: GuitarFamily,
  pin: number,
  isAnalog: boolean,
  existing?: proto.IMapping
): proto.IMapping {
  const resolved = targetForFamily(target, family);
  const isAxis = resolved.type === 'ghAxis' || resolved.type === 'rbAxis';
  const input: proto.IInput = {
    gpio: {
      pin,
      pinMode: isAnalog ? proto.PinMode.Floating : proto.PinMode.PullUp,
      analog: isAnalog,
    },
  };
  const mapping: proto.IMapping = existing
    ? { ...existing, mapping: { [resolved.type]: resolved.id }, input }
    : { mapping: { [resolved.type]: resolved.id }, input, center: 0 };
  if (isAxis && isAnalog) {
    mapping.min = existing?.min ?? 0;
    mapping.max = existing?.max ?? 65535;
    mapping.pressed = undefined;
  } else if (isAxis) {
    mapping.pressed = existing?.pressed ?? 65535;
    mapping.center = 0;
  }
  return mapping;
}

/**
 * Gets the current pin assigned to a target in the active profile.
 */
export function getTargetPin(state: ConfigState, target: PinMappingTarget): number {
  const profile = state.config.profiles?.[state.currentProfile];
  const idx = findMappingIndex(profile, target);
  if (idx === -1 || !profile?.mappings?.[idx]?.input?.gpio) {
    return -1;
  }
  return profile.mappings[idx].input.gpio.pin ?? -1;
}

/**
 * Updates the GPIO pin for a mapping target. If mapping doesn't exist, it creates one.
 */
export function setTargetPin(target: PinMappingTarget, pin: number, isAnalog = false) {
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }

  const currentMappings = profile.mappings ? [...profile.mappings] : [];
  const idx = findMappingIndex(profile, target);
  const family = profileFamily(profile);

  if (idx !== -1) {
    currentMappings[idx] = gpioMapping(target, family, pin, isAnalog, currentMappings[idx]);
  } else {
    currentMappings.push(gpioMapping(target, family, pin, isAnalog));
  }

  store.updateProfile(
    {
      ...profile,
      mappings: currentMappings,
    },
    profileIdx
  );
}

/**
 * Checks if a digital target is actively pressed in real time.
 */
export function isTargetPressed(state: ConfigState, target: PinMappingTarget): boolean {
  const profile = state.config.profiles?.[state.currentProfile];
  const idx = findMappingIndex(profile, target);
  if (idx === -1) {
    return false;
  }
  const status = state.mappingStatus[state.currentProfile]?.[idx];
  return (status?.state ?? 0) > 0;
}

/**
 * Gets the raw analog value (0 - 65535) for an analog target.
 */
export function getTargetAnalogValue(state: ConfigState, target: PinMappingTarget): number {
  const profile = state.config.profiles?.[state.currentProfile];
  const idx = findMappingIndex(profile, target);
  if (idx === -1) {
    return 0;
  }
  const status = state.mappingStatus[state.currentProfile]?.[idx];
  return status?.stateRaw ?? status?.state ?? 0;
}

/**
 * Applies the recommended pinout for the selected guitar family (GH or RB) to the current profile.
 */
export function applyRecommendedPinout(family: GuitarFamily = 'gh') {
  const profileIdx = useConfigStore.getState().currentProfile;
  if (!useConfigStore.getState().config.profiles?.[profileIdx]) {
    return;
  }

  if (family === 'rb') {
    configureRbMatrixFrets();
  }

  // Re-read the store, as the matrix setup above replaced the profile
  const store = useConfigStore.getState();
  const currentProfile = store.config.profiles![profileIdx];
  const pinout = family === 'rb' ? RECOMMENDED_PICO_PINOUT_RB : RECOMMENDED_PICO_PINOUT_GH;
  const currentMappings = currentProfile.mappings ? [...currentProfile.mappings] : [];

  for (const rec of pinout) {
    if (rec.target === GUITAR_TARGETS.UPPER_COMMON || rec.target === GUITAR_TARGETS.SOLO_COMMON) {
      continue;
    }
    if (
      family === 'rb' &&
      (rec.target === GUITAR_TARGETS.FRET_GREEN ||
        rec.target === GUITAR_TARGETS.FRET_RED ||
        rec.target === GUITAR_TARGETS.FRET_YELLOW ||
        rec.target === GUITAR_TARGETS.FRET_BLUE ||
        rec.target === GUITAR_TARGETS.FRET_ORANGE)
    ) {
      continue;
    }

    // Only the ADC pins read analog, so the tilt switch on GP11 stays a digital pull-up input
    const isAxis =
      (rec.target.type as string) === 'ghAxis' || (rec.target.type as string) === 'rbAxis';
    const isAnalog = isAxis && AnalogPins.includes(rec.pin);
    const idx = findMappingIndex(currentProfile, rec.target);

    if (idx !== -1) {
      currentMappings[idx] = gpioMapping(
        rec.target,
        family,
        rec.pin,
        isAnalog,
        currentMappings[idx]
      );
    } else {
      currentMappings.push(gpioMapping(rec.target, family, rec.pin, isAnalog));
    }
  }

  const targetSubType =
    family === 'rb' ? proto.SubType.RockBandGuitar : proto.SubType.GuitarHeroGuitar;

  store.updateProfile(
    {
      ...currentProfile,
      opts: {
        ...currentProfile.opts,
        deviceToEmulate: targetSubType,
      },
      mappings: currentMappings,
    },
    profileIdx
  );
}

/**
 * Gets the active guitar family ('gh' or 'rb') from localStorage or current profile.
 */
export function getGuitarFamily(state?: ConfigState): GuitarFamily {
  // A connected profile already emulating a GH or RB guitar wins over a previous session's pick
  const profile = state?.config.profiles?.[state.currentProfile];
  if (profile?.opts?.deviceToEmulate === proto.SubType.RockBandGuitar) {
    return 'rb';
  }
  if (profile?.opts?.deviceToEmulate === proto.SubType.GuitarHeroGuitar) {
    return 'gh';
  }
  try {
    const saved = localStorage.getItem('santroller_guitar_family');
    if (saved === 'gh' || saved === 'rb') {
      return saved;
    }
  } catch {
    // Ignore storage issues
  }
  return 'gh';
}

/**
 * Persists the active guitar family ('gh' or 'rb') and aligns the active profile.
 */
export function setGuitarFamily(family: GuitarFamily): void {
  try {
    localStorage.setItem('santroller_guitar_family', family);
  } catch {
    // Ignore storage issues
  }
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (profile) {
    const targetSubType =
      family === 'rb' ? proto.SubType.RockBandGuitar : proto.SubType.GuitarHeroGuitar;
    if (profile.opts.deviceToEmulate !== targetSubType) {
      store.updateProfile(
        {
          ...profile,
          opts: {
            ...profile.opts,
            deviceToEmulate: targetSubType,
          },
        },
        profileIdx
      );
    }
  }
}

// Pico header pins for I2C1, shared by the GH5 neck, the MPR121 and the accelerometer
const PICO_I2C1 = { sda: 18, scl: 19, block: 1 };

const FRET_IDS = [
  GUITAR_TARGETS.FRET_GREEN,
  GUITAR_TARGETS.FRET_RED,
  GUITAR_TARGETS.FRET_YELLOW,
  GUITAR_TARGETS.FRET_BLUE,
  GUITAR_TARGETS.FRET_ORANGE,
].map((target) => target.id);

// Tap (GH) and solo (RB) frets share ids, so this covers the slider and the lower neck
const TAP_TARGETS = [
  GUITAR_TARGETS.TAP_GREEN,
  GUITAR_TARGETS.TAP_RED,
  GUITAR_TARGETS.TAP_YELLOW,
  GUITAR_TARGETS.TAP_BLUE,
  GUITAR_TARGETS.TAP_ORANGE,
];
const TAP_IDS = TAP_TARGETS.map((target) => target.id);

function isNeckButton(mapping: proto.IMapping, ids: number[]) {
  const id = mapping.mapping?.ghButton ?? mapping.mapping?.rbButton;
  return id != null && ids.includes(id);
}

/**
 * Drops the fret mappings with the given ids that `remove` matches. Returns whether any were
 * removed.
 */
function removeNeckMappings(ids: number[], remove: (input: proto.IInput) => boolean): boolean {
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (!profile?.mappings) {
    return false;
  }
  const mappings = profile.mappings.filter(
    (m) => !isNeckButton(m, ids) || !m.input || !remove(m.input)
  );
  if (mappings.length === profile.mappings.length) {
    return false;
  }
  store.updateProfile({ ...profile, mappings }, profileIdx);
  return true;
}

const GUITAR_I2C_KINDS = ['gh5Neck', 'mpr121', 'accelerometer'] as const;

/**
 * The I2C bus the guitar's add-ons share: the pins of one that's already added, which can be changed
 * in the guide, or I2C1's header pins otherwise
 */
export function guitarI2cBus(state: ConfigState): { sda: number; scl: number; block: number } {
  for (const kind of GUITAR_I2C_KINDS) {
    const i2c = findDeviceStatus(state, kind)?.device[kind]?.i2c;
    if (i2c) {
      return { sda: i2c.sda, scl: i2c.scl, block: i2c.block };
    }
  }
  return { sda: PICO_I2C1.sda, scl: PICO_I2C1.scl, block: PICO_I2C1.block };
}

// The add-ons' shared I2C pins, for the guide's wiring text, its own words for them included
export function useGuitarI2cPins() {
  const gh5 = useConfigStore((state) => findDeviceStatus(state, 'gh5Neck')?.device.gh5Neck?.i2c);
  const mpr121 = useConfigStore((state) => findDeviceStatus(state, 'mpr121')?.device.mpr121?.i2c);
  const accel = useConfigStore(
    (state) => findDeviceStatus(state, 'accelerometer')?.device.accelerometer?.i2c
  );
  const i2c = gh5 ?? mpr121 ?? accel;
  const sda = i2c?.sda ?? PICO_I2C1.sda;
  const scl = i2c?.scl ?? PICO_I2C1.scl;
  return { sda, scl, sdaPin: gpPin(sda), sclPin: gpPin(scl) };
}

/**
 * Adds a device on the I2C1 header pins. The firmware shares the bus between devices at different
 * addresses, but runs it at the clock of whichever device starts first, so every device on it is
 * brought down to the slowest clock (eg the GH5 neck's 150 kHz).
 */
function addI2c1Device(
  kind: 'gh5Neck' | 'mpr121' | 'accelerometer',
  fill?: (device: proto.IDevice) => void
): string {
  // Joins the bus an add-on already on the guitar is using, as its pins may have been changed
  const bus = guitarI2cBus(useConfigStore.getState());
  const id = useConfigStore.getState().addDevice(kind, undefined, (device) => {
    device[kind]!.i2c = { ...device[kind]!.i2c, ...bus };
    fill?.(device);
  });
  const store = useConfigStore.getState();
  const onBus = Object.values(store.deviceStatus).flatMap((status) =>
    Object.entries(status.device).flatMap(([field, config]) => {
      const i2c = (config as { i2c?: proto.II2CDevice } | null)?.i2c;
      return i2c?.block === bus.block && i2c.sda === bus.sda && i2c.scl === bus.scl
        ? [{ status, field, i2c }]
        : [];
    })
  );
  const clock = Math.min(...onBus.map(({ i2c }) => i2c.clock));
  for (const { status, field, i2c } of onBus) {
    if (i2c.clock !== clock) {
      store.updateDevice(
        {
          ...status.device,
          [field]: {
            ...(status.device[field as keyof proto.IDevice] as object),
            i2c: { ...i2c, clock },
          },
        },
        status.id
      );
    }
  }
  return id;
}

/**
 * Checks if a GH5 neck device is configured in the current controller setup.
 */
export function isGh5NeckConfigured(state: ConfigState): boolean {
  return findDeviceStatus(state, 'gh5Neck') !== undefined;
}

/**
 * Adds the GH5 neck driver on I2C1 (GP18 SDA, GP19 SCL) and loads its default mappings for the
 * frets and slider bar. Any other fret and tap mappings (eg GPIO) are removed first, as they would
 * otherwise be found ahead of the neck's and shadow it.
 */
export function configureGh5Neck(): void {
  if (isGh5NeckConfigured(useConfigStore.getState())) {
    return;
  }
  removeNeckMappings([...FRET_IDS, ...TAP_IDS], (input) => input.gh5Neck == null);
  const id = addI2c1Device('gh5Neck');
  const store = useConfigStore.getState();
  store.loadDefaults(store.deviceStatus[id]);
}

/**
 * Checks if an MPR121 touch controller is configured in the current controller setup.
 */
export function isMpr121Configured(state: ConfigState): boolean {
  return findDeviceStatus(state, 'mpr121') !== undefined;
}

/**
 * Adds an MPR121 on I2C1 (GP18 SDA, GP19 SCL) and maps electrodes 0 - 4 (the World Tour slider
 * vias) to the five tap (GH) or solo (RB) frets. The frets themselves stay on GPIO.
 */
export function configureMpr121Slider(): void {
  const store = useConfigStore.getState();
  let id = findDeviceStatus(store, 'mpr121')?.id;
  if (id === undefined) {
    id = addI2c1Device('mpr121', (device) => {
      device.mpr121!.touchpadCount = TAP_TARGETS.length;
    });
  }

  const deviceid = parseInt(id, 10);
  const updated = useConfigStore.getState();
  const profileIdx = updated.currentProfile;
  const profile = updated.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }
  const family = profileFamily(profile);
  const mappings = (profile.mappings ?? []).filter((m) => !isNeckButton(m, TAP_IDS));
  TAP_TARGETS.forEach((target, pin) => {
    const resolved = targetForFamily(target, family);
    mappings.push({
      mapping: { [resolved.type]: resolved.id },
      input: {
        mpr121: {
          deviceid,
          pin,
          mode: proto.Mpr121PinMode.Touch,
          pinMode: proto.PinMode.PullUp,
        },
      },
      center: 0,
    });
  });
  updated.updateProfile({ ...profile, mappings }, profileIdx);
}

/**
 * Checks if the tilt axis reads from an I2C accelerometer.
 */
export function isAccelerometerTiltConfigured(state: ConfigState): boolean {
  const profile = state.config.profiles?.[state.currentProfile];
  const idx = findMappingIndex(profile, GUITAR_TARGETS.TILT);
  return (
    findDeviceStatus(state, 'accelerometer') !== undefined &&
    idx !== -1 &&
    profile?.mappings?.[idx]?.input?.accelerometer != null
  );
}

/**
 * Adds an accelerometer on I2C1 (GP18 SDA, GP19 SCL), which it can share with a GH5 neck or
 * MPR121, and drives the tilt axis from its X axis.
 */
export function configureAccelerometerTilt(): void {
  const store = useConfigStore.getState();
  let id = findDeviceStatus(store, 'accelerometer')?.id;
  if (id === undefined) {
    id = addI2c1Device('accelerometer');
  }

  const updated = useConfigStore.getState();
  const profileIdx = updated.currentProfile;
  const profile = updated.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }
  const tilt = targetForFamily(GUITAR_TARGETS.TILT, profileFamily(profile));
  // The firmware scales every supported accelerometer to roughly 16384 counts per g around
  // 32767, so level reads as no tilt and the axis pointing straight up as full tilt
  const mapping: proto.IMapping = {
    mapping: { [tilt.type]: tilt.id },
    input: {
      accelerometer: {
        deviceid: parseInt(id, 10),
        type: proto.AccelerometerInputType.AccelerometerX,
      },
    },
    min: 32767,
    center: 40959,
    max: 49151,
    deadzone: 0,
  };
  const mappings = [...(profile.mappings ?? [])];
  const idx = findMappingIndex(profile, GUITAR_TARGETS.TILT);
  if (idx !== -1) {
    mappings[idx] = mapping;
  } else {
    mappings.push(mapping);
  }
  updated.updateProfile({ ...profile, mappings }, profileIdx);
}

/**
 * Resets fret mappings to direct GPIO pins GP2 through GP6.
 */
export function configureDirectGpioFrets(): void {
  const fretPins = [
    { target: GUITAR_TARGETS.FRET_GREEN, pin: 2 },
    { target: GUITAR_TARGETS.FRET_RED, pin: 3 },
    { target: GUITAR_TARGETS.FRET_YELLOW, pin: 4 },
    { target: GUITAR_TARGETS.FRET_BLUE, pin: 5 },
    { target: GUITAR_TARGETS.FRET_ORANGE, pin: 6 },
  ];
  for (const item of fretPins) {
    setTargetPin(item.target, item.pin, false);
  }
}

/**
 * Checks if a Matrix device is configured in the current controller setup.
 */
export function isRbMatrixConfigured(state: ConfigState): boolean {
  return findDeviceStatus(state, 'matrix') !== undefined;
}

/**
 * Deletes the 7-wire matrix device along with the fret mappings reading from it, freeing its
 * GP14 / GP15 row outputs for another wiring method. Returns whether there was one to delete.
 */
export function removeRbMatrixFrets(): boolean {
  const store = useConfigStore.getState();
  const status = findDeviceStatus(store, 'matrix');
  if (!status) {
    return false;
  }
  store.deleteDevice(status.id);
  return true;
}

/**
 * Automatically configures a 5x2 Matrix device on the Pico:
 * - 5 Inputs (Columns): GP2 (Green), GP3 (Red), GP4 (Yellow), GP5 (Blue), GP6 (Orange)
 * - 2 Outputs (Rows): GP14 (Upper Frets Common), GP15 (Solo Frets Common)
 * Maps all 10 frets (5 main + 5 solo) without needing trace cutting.
 */
export function configureRbMatrixFrets(): void {
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }

  const inPins = [2, 3, 4, 5, 6];
  const outPins = [14, 15];

  let devId = findDeviceStatus(store, 'matrix')?.id;

  if (!devId) {
    devId = store.addDevice('matrix', undefined, (device) => {
      device.matrix = withMatrixPins(withMatrixPins(device.matrix, 'in', inPins), 'out', outPins);
    });
  } else {
    const existing = store.deviceStatus[devId];
    store.updateDevice(
      {
        ...existing.device,
        matrix: addMatrixPins(addMatrixPins(existing.device.matrix, 'in', inPins), 'out', outPins),
      },
      devId
    );
  }

  const devIdNum = parseInt(devId, 10);
  const currentMappings = profile.mappings ? [...profile.mappings] : [];

  const matrixMappings = [
    // Upper Frets (Row = GP14)
    { target: GUITAR_TARGETS.FRET_GREEN, inPin: 2, outPin: 14 },
    { target: GUITAR_TARGETS.FRET_RED, inPin: 3, outPin: 14 },
    { target: GUITAR_TARGETS.FRET_YELLOW, inPin: 4, outPin: 14 },
    { target: GUITAR_TARGETS.FRET_BLUE, inPin: 5, outPin: 14 },
    { target: GUITAR_TARGETS.FRET_ORANGE, inPin: 6, outPin: 14 },
    // Solo Frets (Row = GP15)
    { target: GUITAR_TARGETS.SOLO_GREEN, inPin: 2, outPin: 15 },
    { target: GUITAR_TARGETS.SOLO_RED, inPin: 3, outPin: 15 },
    { target: GUITAR_TARGETS.SOLO_YELLOW, inPin: 4, outPin: 15 },
    { target: GUITAR_TARGETS.SOLO_BLUE, inPin: 5, outPin: 15 },
    { target: GUITAR_TARGETS.SOLO_ORANGE, inPin: 6, outPin: 15 },
  ];

  for (const m of matrixMappings) {
    const updatedInput: proto.IInput = {
      matrix: {
        deviceid: devIdNum,
        pin: m.inPin,
        outputPin: m.outPin,
      },
    };

    const target = targetForFamily(m.target, 'rb');
    const idx = findMappingIndex(profile, m.target);
    if (idx !== -1) {
      currentMappings[idx] = {
        ...currentMappings[idx],
        mapping: { [target.type]: target.id },
        input: updatedInput,
      };
    } else {
      currentMappings.push({
        mapping: { [target.type]: target.id },
        input: updatedInput,
        center: 0,
      });
    }
  }

  store.updateProfile(
    {
      ...profile,
      mappings: currentMappings,
    },
    profileIdx
  );
}

/**
 * Checks if Shifted inputs are configured in the current profile (used by Rock Band Type B dual-contact solo bus).
 */
export function isRbShiftedConfigured(state: ConfigState): boolean {
  const profile = state.config.profiles?.[state.currentProfile];
  return Boolean(
    profile?.mappings?.some((m) => m.input?.shifted !== undefined && m.input?.shifted !== null)
  );
}

/**
 * Removes the shifted fret and solo mappings set up by configureRbShiftedFrets. Returns whether
 * there were any.
 */
export function removeRbShiftedFrets(): boolean {
  return removeNeckMappings([...FRET_IDS, ...TAP_IDS], (input) => input.shifted != null);
}

/**
 * Configures Rock Band Type B (Dual-Contact Solo Bus) using Shifted inputs:
 * - 5 Fret lines: GP2..GP6 (grounded on press)
 * - 1 Solo line: GP12 (shorted to ground when any solo fret is pressed)
 * - Main Frets: ShiftedInput (fret pin, shift pin: GP12, invertShift: true)
 * - Solo Frets: ShiftedInput (fret pin, shift pin: GP12, invertShift: false)
 */
export function configureRbShiftedFrets(soloPin = 12): void {
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }

  const currentMappings = profile.mappings ? [...profile.mappings] : [];

  const fretList = [
    { main: GUITAR_TARGETS.FRET_GREEN, solo: GUITAR_TARGETS.SOLO_GREEN, pin: 2 },
    { main: GUITAR_TARGETS.FRET_RED, solo: GUITAR_TARGETS.SOLO_RED, pin: 3 },
    { main: GUITAR_TARGETS.FRET_YELLOW, solo: GUITAR_TARGETS.SOLO_YELLOW, pin: 4 },
    { main: GUITAR_TARGETS.FRET_BLUE, solo: GUITAR_TARGETS.SOLO_BLUE, pin: 5 },
    { main: GUITAR_TARGETS.FRET_ORANGE, solo: GUITAR_TARGETS.SOLO_ORANGE, pin: 6 },
  ];

  for (const item of fretList) {
    // Main fret: active when Fret is pressed and Solo is NOT pressed
    const mainInput: proto.IInput = {
      shifted: {
        input: { gpio: { pin: item.pin, pinMode: proto.PinMode.PullUp, analog: false } },
        shift: { gpio: { pin: soloPin, pinMode: proto.PinMode.PullUp, analog: false } },
        invertShift: true,
      },
    };
    const main = targetForFamily(item.main, 'rb');
    const mainIdx = findMappingIndex(profile, item.main);
    if (mainIdx !== -1) {
      currentMappings[mainIdx] = {
        ...currentMappings[mainIdx],
        mapping: { [main.type]: main.id },
        input: mainInput,
      };
    } else {
      currentMappings.push({
        mapping: { [main.type]: main.id },
        input: mainInput,
        center: 0,
      });
    }

    // Solo fret: active when Fret is pressed and Solo IS pressed
    const soloInput: proto.IInput = {
      shifted: {
        input: { gpio: { pin: item.pin, pinMode: proto.PinMode.PullUp, analog: false } },
        shift: { gpio: { pin: soloPin, pinMode: proto.PinMode.PullUp, analog: false } },
        invertShift: false,
      },
    };
    const soloIdx = findMappingIndex(profile, item.solo);
    if (soloIdx !== -1) {
      currentMappings[soloIdx] = { ...currentMappings[soloIdx], input: soloInput };
    } else {
      currentMappings.push({
        mapping: { [item.solo.type]: item.solo.id },
        input: soloInput,
        center: 0,
      });
    }
  }

  store.updateProfile(
    {
      ...profile,
      mappings: currentMappings,
    },
    profileIdx
  );
}
