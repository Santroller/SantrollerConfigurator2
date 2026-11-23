import { describe, expect, it } from 'vitest';
import { getProfileWideSlotIds } from '@/components/Inputs/inputRegistry';
import { proto } from './config';
import {
  migrateAuxSubtypes,
  migrateConfigSubtypes,
  subtypeFromStored,
  subtypeOldValue,
} from './subtypeNumbering';

describe('subtype numbering', () => {
  it('keeps every subtype valid BCD', () => {
    for (const [name, value] of Object.entries(proto.SubType)) {
      if (typeof value !== 'number' || name === 'Unknown') {
        continue;
      }
      expect(value <= 0x99 && (value & 0x0f) <= 9, `${name} = ${value}`).toBe(true);
    }
  });

  it('maps old values to their replacements and leaves current ones alone', () => {
    expect(subtypeFromStored(15)).toBe(proto.SubType.Wheel);
    expect(subtypeFromStored(28)).toBe(proto.SubType.Midi);
    expect(subtypeFromStored(proto.SubType.Wheel)).toBe(proto.SubType.Wheel);
    expect(subtypeFromStored(proto.SubType.FlightStick)).toBe(proto.SubType.FlightStick);
    expect(subtypeOldValue(proto.SubType.Wheel)).toBe(15);
    expect(subtypeOldValue(proto.SubType.ProKeys)).toBe(16);
  });

  it('migrates every subtype in a config', () => {
    const config = proto.Config.fromObject({
      profiles: [
        {
          opts: { deviceToEmulate: 15 },
          assignments: [
            {
              assignments: [
                { usbType: 28 },
                { bluetoothType: 31 },
                { midiProGuitar: proto.SubType.ProGuitarMustang },
                { usbDevice: { vid: 1, pid: 2, subtype: 13 } },
                { bluetoothDevice: { vid: 1, pid: 2, subtype: 14 } },
              ],
            },
          ],
        },
      ],
    });
    expect(migrateConfigSubtypes(config)).toBe(true);
    const profile = config.profiles[0];
    expect(profile.opts?.deviceToEmulate).toBe(proto.SubType.Wheel);
    const list = profile.assignments[0].assignments;
    expect(list[0].usbType).toBe(proto.SubType.Midi);
    expect(list[1].bluetoothType).toBe(proto.SubType.KeyboardMania);
    expect(list[2].midiProGuitar).toBe(proto.SubType.ProGuitarMustang);
    expect(list[3].usbDevice?.subtype).toBe(proto.SubType.ProjectDiva);
    expect(list[4].bluetoothDevice?.subtype).toBe(proto.SubType.GuitarFreaks);
    // unset oneof fields stay unset
    expect(list[0].bluetoothType).toBeNull();
    expect(migrateConfigSubtypes(config)).toBe(false);
  });

  it('migrates saved pairings, including Unknown saved signed', () => {
    const aux = proto.AuxConfigBlock.fromObject({
      bluetoothStates: [
        { id: 1, macAddress: new Uint8Array(6), name: 'a', ble: true, subtype: 15 },
        { id: 2, macAddress: new Uint8Array(6), name: 'b', ble: true, subtype: -1 },
      ],
    });
    migrateAuxSubtypes(aux);
    expect(aux.bluetoothStates[0].subtype).toBe(proto.SubType.Wheel);
    expect(aux.bluetoothStates[1].subtype).toBe(proto.SubType.Unknown);
  });

  it('keeps slot ids where they were before the renumbering', () => {
    // Wheel was 15, so its slot still comes before ProKeys (16), from either numbering
    const ids = (wheel: number) =>
      getProfileWideSlotIds([[{ usbType: proto.SubType.ProKeys }, { usbType: wheel }]]);
    expect(ids(proto.SubType.Wheel)).toEqual([[2, 1]]);
    expect(ids(15)).toEqual([[2, 1]]);
  });
});
