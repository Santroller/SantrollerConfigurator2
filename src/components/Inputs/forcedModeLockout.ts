import { getSelectedInput } from '@/components/Inputs/inputRegistry';
import { proto } from '@/components/SettingsContext/config';

// The firmware only keeps the config interface in HID mode, and in Xbox 360 mode unless every USB
// device is a microphone (config_loader.cpp), so forcing any other mode hides the device from the tool
export function forcedModeHidesTool(mode: proto.ConsoleMode, type: proto.SubType): boolean {
  if (mode === proto.ConsoleMode.ModeHid) {
    return false;
  }
  if (mode === proto.ConsoleMode.ModeXbox360) {
    return type === proto.SubType.Microphone;
  }
  return true;
}

// A rule forcing a mode that hides the device from the tool, with no held input to skip it, leaves
// no way to get back into the tool once it applies
export function forcedModeLocksOutTool(
  assignments: proto.IProfileAssignmentInfo[],
  type: proto.SubType
): boolean {
  const forced = assignments.find((x) => x.consoleType?.forcedType != null)?.consoleType
    ?.forcedType;
  if (forced == null || !forcedModeHidesTool(forced, type)) {
    return false;
  }
  return !assignments.some(
    (x) =>
      getSelectedInput(x.input?.input) !== undefined ||
      getSelectedInput(x.inputAnyTime?.input) !== undefined
  );
}
