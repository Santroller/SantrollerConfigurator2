import { proto } from '@/components/SettingsContext/config';
import { LegacyImportContext } from './context';
import { convertHostMidiSettings } from './families/hostMidi';
import { convertInstrumentPeripheralSettings } from './families/instrumentPeripherals';
import { convertLedsModesSettings } from './families/ledsModes';
import { convertWiiPs2Settings } from './families/wiiPs2';

import './families';

import { legacy } from './legacy';
import { convertOutput } from './outputs';

export interface LegacyImportResult {
  config: proto.Config;
  aux: proto.AuxConfigBlock;
  // Things that couldn't be imported exactly, to show to the user
  warnings: string[];
}

function emulatedSubType(
  old: legacy.SerializedConfiguration,
  warn: (m: string) => void
): proto.SubType {
  switch (old.emulationType) {
    case legacy.EmulationType.EmulationType_KeyboardMouse:
    case legacy.EmulationType.EmulationType_BluetoothKeyboardMouse:
      return proto.SubType.KeyboardMouse;
    case legacy.EmulationType.EmulationType_FortniteFestival:
      warn('Fortnite Festival mode was imported as the controller type it was set up with.');
      break;
  }
  // The old controller types use the same numbers as the new ones
  const type = old.deviceType ?? legacy.DeviceControllerType.DeviceControllerType_Gamepad;
  return proto.SubType[type] != null ? (type as number as proto.SubType) : proto.SubType.Gamepad;
}

// Converts a Santroller 1 .picoconfig file into a new config
export function importLegacyConfig(data: Uint8Array, name = 'Imported'): LegacyImportResult {
  const old = legacy.SerializedConfiguration.decode(data);
  const warnings: string[] = [];
  const subType = emulatedSubType(old, (m) => warnings.push(m));
  const ctx = new LegacyImportContext(old, subType);
  ctx.warnings.push(...warnings);

  for (const binding of old.bindings) {
    convertOutput(ctx, binding);
  }
  convertInstrumentPeripheralSettings(ctx);
  convertHostMidiSettings(ctx);
  // This copies the profile's assignments into every console mode, so it goes after anything
  // that adds assignments
  const settings = convertLedsModesSettings(ctx);
  // Wii Remote / PS2 console output only matches while that console is talking to the device, so
  // each gets a list of its own (assignments in one list all have to match)
  const emulation = convertWiiPs2Settings(ctx).map((info) => ({
    assignments: [info, ...ctx.assignments],
  }));

  // Copy mappings onto the other devices their old input read from
  ctx.mappings.splice(
    0,
    ctx.mappings.length,
    ...ctx.mappings.flatMap((mapping) => [
      mapping,
      ...(ctx.extraInputs.get(mapping.input!) ?? []).map((input) => ({ ...mapping, input })),
    ])
  );

  // The firmware only turns the tap frets into a GH5 slider value when this is on
  const TAPS = proto.GuitarHeroGuitarButtonType;
  const supportsSlider = ctx.mappings.some(
    (m) =>
      m.mapping?.ghButton != null &&
      m.mapping.ghButton >= TAPS.GuitarHeroGuitar_TapGreen &&
      m.mapping.ghButton <= TAPS.GuitarHeroGuitar_TapOrange
  );

  const profile: proto.IProfile = {
    opts: {
      uid: 1,
      name: old.variant || name,
      deviceToEmulate: subType,
      deviceSlotIdVersion: 1,
      faceButtonMappingMode: old.swapSwitchFaceButtons
        ? proto.FaceButtonMappingMode.PositionBased
        : proto.FaceButtonMappingMode.LegendBased,
      xinputOnWindows: old.xInputOnWindows,
      invertYAxisHid: old.invertHidYAxis,
      cymbalGlitchFix: old.rb3CymbalGlitchFix,
      queueInputs: old.queueBasedInputs,
      combinedStrumDebounce: old.combinedStrumDebounce,
      selectToDpadLeft: old.selectDpadLeftXb1,
      ps3OnRpcs3: old.ps3OnRpcs3,
      fullRangeTurntableOnPc: old.djFullRange,
      supportsSlider,
    },
    assignments: [...settings.assignments, ...emulation],
    mappings: ctx.mappings,
    leds: ctx.leds,
  };

  const config = proto.Config.fromObject({
    devices: ctx.devices,
    profiles: [profile],
    guiConfig: [],
    ...(settings.inactivity ? { inactivity: settings.inactivity } : {}),
  });
  const error = proto.Config.verify(config);
  if (error) {
    throw new Error(`The imported config is invalid: ${error}`);
  }
  return {
    config,
    aux: proto.AuxConfigBlock.create({
      states: [],
      toggleStates: [],
      bluetoothStates: [],
      tlvEntries: [],
    }),
    warnings: ctx.warnings,
  };
}
