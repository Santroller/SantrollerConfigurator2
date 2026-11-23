import { proto } from './config';

// Mirrors the firmware's subtype_numbering.hpp. SubType values are valid BCD as they are, so they can go straight
// into a revision, and match Santroller 1's numbering for the subtypes it had. Before that, a few subtypes had values
// with a hex digit above 9. Those moved to free values, and nothing took their old ones, so an old value always means
// the same thing: configs, pairings and events from firmware still on the old numbering go through
// subtypeFromStored, which leaves every current value alone.
const SUBTYPE_RENUMBERING: ReadonlyArray<readonly [number, proto.SubType]> = [
  [10, proto.SubType.DisneyInfinity],
  [11, proto.SubType.Skylanders],
  [12, proto.SubType.LegoDimensions],
  [13, proto.SubType.ProjectDiva],
  [14, proto.SubType.GuitarFreaks],
  [15, proto.SubType.Wheel],
  [26, proto.SubType.PowerGigGuitar],
  [27, proto.SubType.RockRevolutionGuitar],
  [28, proto.SubType.Midi],
  [29, proto.SubType.BeatMania],
  [30, proto.SubType.DrumMania],
  [31, proto.SubType.KeyboardMania],
];
const FROM_OLD = new Map<number, proto.SubType>(SUBTYPE_RENUMBERING);
const TO_OLD = new Map<proto.SubType, number>(SUBTYPE_RENUMBERING.map(([old, x]) => [x, old]));

// A subtype from a config, a pairing or the firmware, which may use the old numbering
export function subtypeFromStored(subtype: number): proto.SubType {
  return FROM_OLD.get(subtype) ?? (subtype as proto.SubType);
}

// The value a subtype had in the old numbering. Slots are numbered in order of type, so slot ids use this to stay
// where they were before the renumbering, matching the firmware's slot_subtype.
export function subtypeOldValue(subtype: proto.SubType): number {
  return TO_OLD.get(subtype) ?? subtype;
}

// Moves every subtype in a config to the current numbering. Returns whether any changed, so the config is saved
// with the new values.
export function migrateConfigSubtypes(config: proto.IConfig): boolean {
  let changed = false;
  // Only fields that are set and in the old numbering are written, so unset oneof fields stay unset
  const migrate = <K extends string>(
    target: { [key in K]?: proto.SubType | null } | null | undefined,
    key: K
  ) => {
    const subtype = target?.[key];
    if (target == null || subtype == null) {
      return;
    }
    const migrated = subtypeFromStored(subtype);
    if (migrated !== subtype) {
      target[key] = migrated;
      changed = true;
    }
  };
  for (const profile of config.profiles ?? []) {
    migrate(profile.opts, 'deviceToEmulate');
    for (const list of profile.assignments ?? []) {
      for (const assignment of list.assignments ?? []) {
        migrate(assignment, 'usbType');
        migrate(assignment, 'bluetoothType');
        migrate(assignment, 'midiProGuitar');
        migrate(assignment.usbDevice, 'subtype');
        migrate(assignment.bluetoothDevice, 'subtype');
      }
    }
  }
  return changed;
}

// The same for the pairings the firmware saved. Only shown here, the firmware reads its own copy the same way.
export function migrateAuxSubtypes(aux: proto.IAuxConfigBlock): void {
  for (const state of aux.bluetoothStates ?? []) {
    if (state.subtype != null) {
      state.subtype = subtypeFromStored(state.subtype & 0xff);
    }
  }
}
