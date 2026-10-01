import { proto } from '@/components/SettingsContext/config';
import {
  ConfigState,
  DeviceStatus,
  useConfigStore,
} from '@/components/SettingsContext/SettingsContext';

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
 * Standard recommended pinout for Guitar Hero guitars
 */
export const RECOMMENDED_PICO_PINOUT_GH = [
  {
    target: GUITAR_TARGETS.FRET_GREEN,
    pin: 2,
    label: 'Green Fret',
    color: 'green',
    physicalPin: 4,
  },
  { target: GUITAR_TARGETS.FRET_RED, pin: 3, label: 'Red Fret', color: 'red', physicalPin: 5 },
  {
    target: GUITAR_TARGETS.FRET_YELLOW,
    pin: 4,
    label: 'Yellow Fret',
    color: 'yellow',
    physicalPin: 6,
  },
  { target: GUITAR_TARGETS.FRET_BLUE, pin: 5, label: 'Blue Fret', color: 'blue', physicalPin: 7 },
  {
    target: GUITAR_TARGETS.FRET_ORANGE,
    pin: 6,
    label: 'Orange Fret',
    color: 'orange',
    physicalPin: 9,
  },
  { target: GUITAR_TARGETS.STRUM_UP, pin: 7, label: 'Strum Up', color: 'cyan', physicalPin: 10 },
  {
    target: GUITAR_TARGETS.STRUM_DOWN,
    pin: 8,
    label: 'Strum Down',
    color: 'indigo',
    physicalPin: 11,
  },
  { target: GUITAR_TARGETS.START, pin: 9, label: 'Start / Plus', color: 'teal', physicalPin: 12 },
  {
    target: GUITAR_TARGETS.SELECT,
    pin: 10,
    label: 'Select / Minus',
    color: 'teal',
    physicalPin: 14,
  },
  {
    target: GUITAR_TARGETS.TILT,
    pin: 11,
    label: 'Digital Tilt Switch',
    color: 'teal',
    physicalPin: 15,
  },
  {
    target: GUITAR_TARGETS.WHAMMY,
    pin: 26,
    label: 'Whammy Bar (ADC0)',
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
    label: 'Green Fret',
    color: 'green',
    physicalPin: 4,
  },
  { target: GUITAR_TARGETS.FRET_RED, pin: 3, label: 'Red Fret', color: 'red', physicalPin: 5 },
  {
    target: GUITAR_TARGETS.FRET_YELLOW,
    pin: 4,
    label: 'Yellow Fret',
    color: 'yellow',
    physicalPin: 6,
  },
  { target: GUITAR_TARGETS.FRET_BLUE, pin: 5, label: 'Blue Fret', color: 'blue', physicalPin: 7 },
  {
    target: GUITAR_TARGETS.FRET_ORANGE,
    pin: 6,
    label: 'Orange Fret',
    color: 'orange',
    physicalPin: 9,
  },
  { target: GUITAR_TARGETS.STRUM_UP, pin: 7, label: 'Strum Up', color: 'cyan', physicalPin: 10 },
  {
    target: GUITAR_TARGETS.STRUM_DOWN,
    pin: 8,
    label: 'Strum Down',
    color: 'indigo',
    physicalPin: 11,
  },
  { target: GUITAR_TARGETS.START, pin: 9, label: 'Start / Plus', color: 'teal', physicalPin: 12 },
  {
    target: GUITAR_TARGETS.SELECT,
    pin: 10,
    label: 'Select / Minus',
    color: 'teal',
    physicalPin: 14,
  },
  {
    target: GUITAR_TARGETS.TILT,
    pin: 11,
    label: 'Digital Tilt Switch',
    color: 'teal',
    physicalPin: 15,
  },
  {
    target: GUITAR_TARGETS.UPPER_COMMON,
    pin: 14,
    label: 'Upper Frets Common (Matrix Row 1)',
    color: 'violet',
    physicalPin: 19,
  },
  {
    target: GUITAR_TARGETS.SOLO_COMMON,
    pin: 15,
    label: 'Solo Frets Common (Matrix Row 2)',
    color: 'violet',
    physicalPin: 20,
  },
  {
    target: GUITAR_TARGETS.WHAMMY,
    pin: 26,
    label: 'Whammy Bar (ADC0)',
    color: 'grape',
    physicalPin: 31,
  },
  {
    target: GUITAR_TARGETS.PICKUP_SELECTOR,
    pin: 27,
    label: 'Pickup Selector (ADC1)',
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

  const updatedInput: proto.IInput = {
    gpio: {
      pin,
      pinMode: isAnalog ? proto.PinMode.Floating : proto.PinMode.PullUp,
      analog: isAnalog,
    },
  };

  if (idx !== -1) {
    const existing = currentMappings[idx];
    currentMappings[idx] = {
      ...existing,
      input: updatedInput,
    };
  } else {
    // Create new mapping
    const newMapping: proto.IMapping = {
      mapping: {
        [target.type]: target.id,
      },
      input: updatedInput,
      min: isAnalog ? 0 : undefined,
      max: isAnalog ? 65535 : undefined,
      center: 0,
    };
    currentMappings.push(newMapping);
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
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }

  if (family === 'rb') {
    configureRbMatrixFrets();
  }

  const pinout = family === 'rb' ? RECOMMENDED_PICO_PINOUT_RB : RECOMMENDED_PICO_PINOUT_GH;
  const currentProfile = store.config.profiles?.[profileIdx] ?? profile;
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

    const isAnalog =
      (rec.target.type as string) === 'ghAxis' || (rec.target.type as string) === 'rbAxis';
    const idx = findMappingIndex(currentProfile, rec.target);

    const updatedInput: proto.IInput = {
      gpio: {
        pin: rec.pin,
        pinMode: isAnalog ? proto.PinMode.Floating : proto.PinMode.PullUp,
        analog: isAnalog,
      },
    };

    if (idx !== -1) {
      currentMappings[idx] = {
        ...currentMappings[idx],
        input: updatedInput,
      };
    } else {
      currentMappings.push({
        mapping: { [rec.target.type]: rec.target.id },
        input: updatedInput,
        min: isAnalog ? 0 : undefined,
        max: isAnalog ? 65535 : undefined,
        center: 0,
      });
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
  const saved = localStorage.getItem('santroller_guitar_family');
  if (saved === 'gh' || saved === 'rb') {
    return saved;
  }
  if (state) {
    const profile = state.config.profiles?.[state.currentProfile];
    if (profile?.opts?.deviceToEmulate === proto.SubType.RockBandGuitar) {
      return 'rb';
    }
  }
  return 'gh';
}

/**
 * Persists the active guitar family ('gh' or 'rb') and aligns the active profile.
 */
export function setGuitarFamily(family: GuitarFamily): void {
  localStorage.setItem('santroller_guitar_family', family);
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

/**
 * Checks if a GH5 neck device is configured in the current controller setup.
 */
export function isGh5NeckConfigured(state: ConfigState): boolean {
  const hasInDevices = state.config.devices?.some(
    (d) => d.gh5Neck !== undefined && d.gh5Neck !== null
  );
  const hasInStatus = Object.values(state.deviceStatus ?? {}).some(
    (d) => d.type === 'gh5Neck' || Boolean(d.device?.gh5Neck)
  );
  return Boolean(hasInDevices || hasInStatus);
}

/**
 * Automatically adds the GH5 neck driver with standard RP2040 I2C pins (GP18 SDA, GP19 SCL)
 * and loads default mappings for frets and slider bar.
 */
export function configureGh5Neck(): void {
  const store = useConfigStore.getState();
  if (isGh5NeckConfigured(store)) {
    return;
  }

  let devId = '0';
  if (Object.keys(store.deviceStatus).length) {
    devId = (
      Math.max(...Object.values(store.deviceStatus).map((x) => x.device.deviceid)) + 1
    ).toString();
  }

  const gh5Device: proto.IDevice = {
    deviceid: parseInt(devId, 10),
    gh5Neck: {
      i2c: {
        sda: 18,
        scl: 19,
        block: 1,
        clock: 150000,
      },
    },
  };

  const newStatus = new DeviceStatus(devId, 'gh5Neck', gh5Device);
  useConfigStore.setState((state) => {
    state.deviceStatus[devId] = newStatus;
  });

  store.loadDefaults(newStatus);
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
  const hasInDevices = state.config.devices?.some(
    (d) => d.matrix !== undefined && d.matrix !== null
  );
  const hasInStatus = Object.values(state.deviceStatus ?? {}).some(
    (d) => d.type === 'matrix' || Boolean(d.device?.matrix)
  );
  return Boolean(hasInDevices || hasInStatus);
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

  const inPins = (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6);
  const outPins = (1 << 14) | (1 << 15);

  let devId = Object.keys(store.deviceStatus).find(
    (k) => store.deviceStatus[k].type === 'matrix' || Boolean(store.deviceStatus[k].device?.matrix)
  );

  if (!devId) {
    let nextNum = 0;
    if (Object.keys(store.deviceStatus).length) {
      nextNum = Math.max(...Object.values(store.deviceStatus).map((x) => x.device.deviceid)) + 1;
    }
    devId = nextNum.toString();

    const matrixDevice: proto.IDevice = {
      deviceid: nextNum,
      matrix: {
        inPins,
        outPins,
      },
    };

    const newStatus = new DeviceStatus(devId, 'matrix', matrixDevice);
    useConfigStore.setState((state) => {
      state.deviceStatus[devId!] = newStatus;
    });
  } else {
    const existing = store.deviceStatus[devId];
    const currentInPins = existing.device.matrix?.inPins ?? 0;
    const currentOutPins = existing.device.matrix?.outPins ?? 0;
    store.updateDevice(
      {
        ...existing.device,
        matrix: {
          inPins: currentInPins | inPins,
          outPins: currentOutPins | outPins,
        },
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

    const idx = findMappingIndex(profile, m.target);
    if (idx !== -1) {
      currentMappings[idx] = {
        ...currentMappings[idx],
        input: updatedInput,
      };
    } else {
      currentMappings.push({
        mapping: { [m.target.type]: m.target.id },
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
    const mainIdx = findMappingIndex(profile, item.main);
    if (mainIdx !== -1) {
      currentMappings[mainIdx] = { ...currentMappings[mainIdx], input: mainInput };
    } else {
      currentMappings.push({
        mapping: { [item.main.type]: item.main.id },
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
