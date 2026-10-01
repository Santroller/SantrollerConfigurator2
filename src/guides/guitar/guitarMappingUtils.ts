import { proto } from '@/components/SettingsContext/config';
import { ConfigState, useConfigStore } from '@/components/SettingsContext/SettingsContext';

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

/**
 * Standard recommended pinout for Raspberry Pi Pico guitars
 */
export const RECOMMENDED_PICO_PINOUT = [
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
  { target: GUITAR_TARGETS.STRUM_UP, pin: 7, label: 'Strum Up', color: 'gray', physicalPin: 10 },
  {
    target: GUITAR_TARGETS.STRUM_DOWN,
    pin: 8,
    label: 'Strum Down',
    color: 'gray',
    physicalPin: 11,
  },
  { target: GUITAR_TARGETS.START, pin: 9, label: 'Start / Plus', color: 'cyan', physicalPin: 12 },
  {
    target: GUITAR_TARGETS.SELECT,
    pin: 10,
    label: 'Select / Minus',
    color: 'cyan',
    physicalPin: 14,
  },
  {
    target: GUITAR_TARGETS.WHAMMY,
    pin: 26,
    label: 'Whammy Bar (ADC0)',
    color: 'grape',
    physicalPin: 31,
  },
  {
    target: GUITAR_TARGETS.TILT,
    pin: 11,
    label: 'Digital Tilt Switch',
    color: 'teal',
    physicalPin: 15,
  },
];

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
        return m.mapping.ghButton === target.id;
      case 'rbButton':
        return m.mapping.rbButton === target.id;
      case 'gamepadButton':
        return m.mapping.gamepadButton === target.id;
      case 'ghAxis':
        return m.mapping.ghAxis === target.id;
      case 'rbAxis':
        return m.mapping.rbAxis === target.id;
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
 * Applies the entire recommended standard Santroller pinout to the current profile.
 */
export function applyRecommendedPinout() {
  const store = useConfigStore.getState();
  const profileIdx = store.currentProfile;
  const profile = store.config.profiles?.[profileIdx];
  if (!profile) {
    return;
  }

  const currentMappings = profile.mappings ? [...profile.mappings] : [];

  for (const rec of RECOMMENDED_PICO_PINOUT) {
    const isAnalog =
      (rec.target.type as string) === 'ghAxis' || (rec.target.type as string) === 'rbAxis';
    const idx = findMappingIndex(profile, rec.target);

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

  store.updateProfile(
    {
      ...profile,
      mappings: currentMappings,
    },
    profileIdx
  );
}
