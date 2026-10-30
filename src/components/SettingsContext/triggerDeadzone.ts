import { proto } from './config.js';

/**
 * Whether the firmware calibrates this axis like a trigger, so it rests at min and its deadzone is
 * measured from min instead of around the center. Matches the trigger flag each AxisMapping is
 * built with, and sections always calibrate like a trigger.
 */
export function calibratesAsTrigger(mapping: proto.IMapping): boolean {
  if (
    (mapping.section ?? proto.AxisSection.AxisSectionFull) !== proto.AxisSection.AxisSectionFull
  ) {
    return true;
  }
  const output = mapping.mapping;
  if (!output) {
    return false;
  }
  return (
    output.gamepadAxis === proto.GamepadAxisType.Gamepad_LeftTrigger ||
    output.gamepadAxis === proto.GamepadAxisType.Gamepad_RightTrigger ||
    output.ghAxis === proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy ||
    output.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Whammy ||
    output.rbAxis === proto.RockBandGuitarAxisType.RockBandGuitar_Pickup ||
    output.ghlAxis === proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy ||
    (output.proAxis != null && output.proAxis !== proto.ProGuitarAxisType.ProGuitar_Tilt) ||
    output.proKeyboardAxis === proto.ProKeyboardAxisType.ProKeyboardPedal ||
    output.ghDrumAxis != null ||
    output.rbDrumAxis != null ||
    output.ghaAxis != null ||
    output.midiControl != null
  );
}

/**
 * The deadzone slider used to sit on the raw scale next to min and max, so trigger deadzones were
 * often set to the raw value the axis should start at instead of the distance from min. That puts
 * the start past max, and the axis never leaves 0. A deadzone that lands inside the calibrated
 * range like that is turned back into a distance from min. Returns whether anything changed.
 */
export function fixAbsoluteTriggerDeadzones(config: proto.IConfig): boolean {
  let changed = false;
  config.profiles?.forEach((profile) => {
    profile.mappings?.forEach((mapping) => {
      const deadzone = mapping.deadzone ?? 0;
      if (!deadzone || mapping.pressed != null || !calibratesAsTrigger(mapping)) {
        return;
      }
      const min = mapping.min ?? 0;
      const max = mapping.max ?? 0;
      const inverted = min > max;
      const start = inverted ? min - deadzone : min + deadzone;
      const pastMax = inverted ? start < max : start > max;
      const insideRange = inverted
        ? deadzone > max && deadzone < min
        : deadzone > min && deadzone < max;
      if (!pastMax || !insideRange) {
        return;
      }
      mapping.deadzone = Math.abs(deadzone - min);
      changed = true;
    });
  });
  return changed;
}
