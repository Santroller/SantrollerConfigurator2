import { proto } from './config.js';

type OutputKey = keyof proto.IOutput;

// The emulated types each instrument specific output can drive. The firmware picks the report
// layout from the output, not the profile, so these write the wrong report on any other type.
// Gamepad, keyboard, mouse, action and MIDI outputs work on every type, so they are left out.
const INSTRUMENT_OUTPUTS: Partial<Record<OutputKey, proto.SubType[]>> = {
  ghButton: [proto.SubType.GuitarHeroGuitar],
  ghAxis: [proto.SubType.GuitarHeroGuitar],
  rbButton: [proto.SubType.RockBandGuitar, proto.SubType.PowerGigGuitar],
  rbAxis: [proto.SubType.RockBandGuitar, proto.SubType.PowerGigGuitar],
  ghDrumAxis: [proto.SubType.GuitarHeroDrums],
  rbDrumButton: [proto.SubType.RockBandDrums, proto.SubType.PowerGigDrum],
  rbDrumAxis: [proto.SubType.RockBandDrums, proto.SubType.PowerGigDrum],
  ghlButton: [proto.SubType.LiveGuitar],
  ghlAxis: [proto.SubType.LiveGuitar],
  proButton: [proto.SubType.ProGuitarMustang, proto.SubType.ProGuitarSquier],
  proAxis: [proto.SubType.ProGuitarMustang, proto.SubType.ProGuitarSquier],
  djhButton: [proto.SubType.DjHeroTurntable],
  djhAxis: [proto.SubType.DjHeroTurntable],
  divaAxis: [proto.SubType.ProjectDiva],
  divaTouch: [proto.SubType.ProjectDiva],
  gfButton: [proto.SubType.GuitarFreaks],
  dmButton: [proto.SubType.DrumMania],
  bmButton: [proto.SubType.BeatMania],
  popnButton: [proto.SubType.PopNMusic],
  kbmButton: [proto.SubType.KeyboardMania],
  proKeySingle: [proto.SubType.ProKeys],
  proKeyMultiple: [proto.SubType.ProKeys, proto.SubType.KeyboardMania],
  proKeyboardAxis: [proto.SubType.ProKeys],
  proKeyboardButton: [proto.SubType.ProKeys],
  wheelAxis: [proto.SubType.Wheel],
  wheelButton: [proto.SubType.Wheel],
};

function setOutputKey(output: proto.IOutput | null | undefined): OutputKey | undefined {
  if (!output) {
    return undefined;
  }
  return (Object.keys(output) as OutputKey[]).find((key) => output[key] != null);
}

/**
 * Swaps GH guitar outputs for RB ones (or the reverse) on a GH / RB guitar profile. The ids line up
 * (frets 1-5, tap / solo 6-10, pedal 18, whammy 1, tilt 2), so only the output type changes.
 */
function convertGuitarFamily(m: proto.IMapping, subType: proto.SubType): proto.IMapping {
  const out = m.mapping;
  if (subType === proto.SubType.RockBandGuitar) {
    if (out?.ghButton != null) {
      return { ...m, mapping: { rbButton: out.ghButton as number } };
    }
    if (out?.ghAxis != null) {
      return { ...m, mapping: { rbAxis: out.ghAxis as number } };
    }
  }
  if (subType === proto.SubType.GuitarHeroGuitar) {
    if (out?.rbButton != null) {
      return { ...m, mapping: { ghButton: out.rbButton as number } };
    }
    // RB's pickup selector has no GH equivalent, so it is left to be dropped
    if (out?.rbAxis != null && out.rbAxis !== proto.RockBandGuitarAxisType.RockBandGuitar_Pickup) {
      return { ...m, mapping: { ghAxis: out.rbAxis as number } };
    }
  }
  return m;
}

// The gamepad axes a wheel sends its steering and pedals on, see the firmware's WheelAxisMapping
const WHEEL_GAMEPAD_AXES: [proto.WheelAxisType, proto.GamepadAxisType][] = [
  [proto.WheelAxisType.Wheel_Steering, proto.GamepadAxisType.Gamepad_LeftStickX],
  [proto.WheelAxisType.Wheel_Accelerator, proto.GamepadAxisType.Gamepad_RightTrigger],
  [proto.WheelAxisType.Wheel_Brake, proto.GamepadAxisType.Gamepad_LeftTrigger],
];

/**
 * Swaps a gamepad axis for the wheel axis sent on it when the output is for a wheel, and a wheel
 * axis back to its gamepad axis for anything else. Both calibrate the same way (the steering is
 * centred, pedals rest at 0). The clutch and handbrake have no gamepad equivalent, so they are
 * left as they are, to be dropped. Any other output is returned unchanged.
 */
export function convertWheelOutput(output: proto.IOutput, subType: proto.SubType): proto.IOutput {
  if (subType === proto.SubType.Wheel) {
    const pair = WHEEL_GAMEPAD_AXES.find(([, gamepadAxis]) => gamepadAxis === output.gamepadAxis);
    return pair ? { wheelAxis: pair[0] } : output;
  }
  const pair = WHEEL_GAMEPAD_AXES.find(([wheelAxis]) => wheelAxis === output.wheelAxis);
  return pair ? { gamepadAxis: pair[1] } : output;
}

function convertWheelAxes(m: proto.IMapping, subType: proto.SubType): proto.IMapping {
  const mapping = m.mapping && convertWheelOutput(m.mapping, subType);
  return mapping === m.mapping ? m : { ...m, mapping };
}

function suitsSubType(m: proto.IMapping, subType: proto.SubType | null | undefined): boolean {
  const key = setOutputKey(m.mapping);
  const allowed = key && INSTRUMENT_OUTPUTS[key];
  return !allowed || (subType != null && allowed.includes(subType));
}

/**
 * Fits a profile's mappings to the type it now emulates: GH and RB guitar outputs are converted,
 * and any other instrument output the new type can't drive is dropped instead of being left to
 * write the wrong report. Mappings are untouched unless the type changed.
 */
export function remapMappingsForSubType(
  prevSubType: proto.SubType | null | undefined,
  profile: proto.IProfile
): proto.IMapping[] | undefined {
  const subType = profile.opts?.deviceToEmulate;
  if (prevSubType === subType || !profile.mappings) {
    return profile.mappings;
  }
  return profile.mappings
    .map((m) => (subType != null ? convertWheelAxes(convertGuitarFamily(m, subType), subType) : m))
    .filter((m) => suitsSubType(m, subType));
}

/**
 * How many of a profile's mappings switching it to a new type would drop.
 */
export function countMappingsDroppedBySubType(
  profile: proto.IProfile,
  subType: proto.SubType
): number {
  const before = profile.mappings?.length ?? 0;
  const after = remapMappingsForSubType(profile.opts?.deviceToEmulate, {
    ...profile,
    opts: { ...profile.opts, deviceToEmulate: subType },
  })?.length;
  return before - (after ?? 0);
}
