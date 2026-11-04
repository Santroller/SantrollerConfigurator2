import { proto } from '@/components/SettingsContext/config';
import { CODE_TO_HID } from '@/devices/keyboard';

// Santroller 1's Fortnite Festival mode sent the controller's bindings as keyboard keys. Any
// Fortnite Festival mode binding turned on its "pro" layout, so that is the one used here.

type KeyCode = keyof typeof CODE_TO_HID;

const ST = proto.SubType;
const GB = proto.GamepadButtonType;
const COLOURS = ['Green', 'Red', 'Yellow', 'Blue', 'Orange'] as const;
const FRET_KEYS: KeyCode[] = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
const DRUM_KEYS: KeyCode[] = ['KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'];

// The frets and solo frets of each guitar, by colour
function byColour<T extends Record<string, string | number>>(
  values: T,
  prefix: string,
  solo: string
): Map<number, KeyCode> {
  return new Map(
    COLOURS.flatMap((colour, i) =>
      [`${prefix}${colour}`, `${prefix}${solo}${colour}`]
        .map((name) => values[name] as number | undefined)
        .filter((value) => value != null)
        .map((value) => [value!, FRET_KEYS[i]] as const)
    )
  );
}

const GH_FRETS = byColour(proto.GuitarHeroGuitarButtonType, 'GuitarHeroGuitar_', 'Tap');
const RB_FRETS = byColour(proto.RockBandGuitarButtonType, 'RockBandGuitar_', 'Solo');
const PRO_FRETS = byColour(proto.ProGuitarButtonType, 'ProGuitar_', 'Solo');

const GH_DRUMS = new Map<number, KeyCode>([
  [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_GreenPad, DRUM_KEYS[0]],
  [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad, DRUM_KEYS[1]],
  [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_YellowPad, DRUM_KEYS[2]],
  [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_BluePad, DRUM_KEYS[3]],
  [proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_OrangePad, DRUM_KEYS[4]],
]);
// Cymbals and kicks didn't send a key
const RB_DRUMS = new Map<number, KeyCode>([
  [proto.RockBandDrumsAxisType.RockBandDrums_GreenPad, DRUM_KEYS[0]],
  [proto.RockBandDrumsAxisType.RockBandDrums_RedPad, DRUM_KEYS[1]],
  [proto.RockBandDrumsAxisType.RockBandDrums_YellowPad, DRUM_KEYS[2]],
  [proto.RockBandDrumsAxisType.RockBandDrums_BluePad, DRUM_KEYS[3]],
]);

const BUTTONS = new Map<number, KeyCode>([
  [GB.Gamepad_Back, 'PageDown'],
  [GB.Gamepad_Start, 'Escape'],
  [GB.Gamepad_DpadLeft, 'ArrowLeft'],
  [GB.Gamepad_DpadRight, 'ArrowRight'],
]);

const GUITARS = new Set<proto.SubType>([
  ST.GuitarHeroGuitar,
  ST.RockBandGuitar,
  ST.LiveGuitar,
  ST.ProGuitarMustang,
  ST.ProGuitarSquier,
]);

// Fields that only mean something for an axis
const AXIS_FIELDS = [
  'pressed',
  'released',
  'min',
  'max',
  'center',
  'deadzone',
  'section',
  'sectionStart',
  'sectionEnd',
  'pickupThresholds',
] as const;

function asKey(mapping: proto.IMapping, code: KeyCode): proto.IMapping {
  const key: proto.IMapping = { ...mapping, mapping: { keycode: CODE_TO_HID[code] } };
  for (const field of AXIS_FIELDS) {
    delete key[field];
  }
  return key;
}

// An axis as a key, held once it is `fraction` of the way through its calibrated range (or past
// its deadzone, for 0). A digital input that drove the axis is used as is.
function axisAsKey(mapping: proto.IMapping, code: KeyCode, fraction: number): proto.IMapping {
  const key = asKey(mapping, code);
  if (mapping.pressed != null || mapping.input?.digitalTrigger != null) {
    return key;
  }
  const min = mapping.min ?? 0;
  const max = mapping.max ?? 65535;
  const inverted = min > max;
  const deadzone = fraction ? 0 : (mapping.deadzone ?? 0);
  return {
    ...key,
    input: {
      ...key.input,
      digitalTrigger: inverted
        ? proto.AnalogToDigitalTriggerType.JoyLow
        : proto.AnalogToDigitalTriggerType.JoyHigh,
      digitalTriggerValue: Math.round(
        min + (max - min) * fraction + (inverted ? -deadzone : deadzone)
      ),
    },
  };
}

function festivalMapping(mapping: proto.IMapping, subType: proto.SubType): proto.IMapping[] {
  const out = mapping.mapping ?? {};
  // Keys and actions were sent the same way in every mode
  if (out.keycode != null || out.consumerKey != null || out.action != null) {
    return [mapping];
  }
  const fret =
    (out.ghButton != null && GH_FRETS.get(out.ghButton)) ||
    (out.rbButton != null && RB_FRETS.get(out.rbButton)) ||
    (out.proButton != null && PRO_FRETS.get(out.proButton));
  if (fret) {
    return [asKey(mapping, fret)];
  }
  const GHL = proto.GuitarHeroLiveGuitarButtonType;
  const strum =
    out.ghlButton === GHL.GuitarHeroLiveGuitar_StrumUp ||
    (GUITARS.has(subType) && out.gamepadButton === GB.Gamepad_DpadUp)
      ? 'ShiftRight'
      : out.ghlButton === GHL.GuitarHeroLiveGuitar_StrumDown ||
          (GUITARS.has(subType) && out.gamepadButton === GB.Gamepad_DpadDown)
        ? 'ControlRight'
        : undefined;
  if (strum) {
    return [asKey(mapping, strum)];
  }
  const button = out.gamepadButton != null ? BUTTONS.get(out.gamepadButton) : undefined;
  if (button) {
    return [asKey(mapping, button)];
  }
  const tilt =
    out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt ||
    out.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Tilt ||
    out.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt;
  if (tilt) {
    // Past 240 of the PS3's 0 - 255 tilt
    return [axisAsKey(mapping, 'PageDown', 240 / 255)];
  }
  const whammy =
    out.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy ||
    out.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Whammy ||
    out.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy;
  if (whammy) {
    return [axisAsKey(mapping, 'Slash', 0.5)];
  }
  const pad =
    (out.ghDrumAxis != null && GH_DRUMS.get(out.ghDrumAxis)) ||
    (out.rbDrumAxis != null && RB_DRUMS.get(out.rbDrumAxis));
  if (pad) {
    // Any hit past the deadzone counts
    return [axisAsKey(mapping, pad, 0)];
  }
  return [];
}

// The mappings for a Fortnite Festival keyboard profile, from the controller profile's mappings
export function festivalMappings(
  mappings: proto.IMapping[],
  subType: proto.SubType
): proto.IMapping[] {
  // Frets and solo frets on the same input would send the same key twice
  const seen = new Set<string>();
  return mappings
    .flatMap((mapping) => festivalMapping(mapping, subType))
    .filter((mapping) => {
      const key = JSON.stringify(mapping);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}
