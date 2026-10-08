import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import { importLegacyConfig } from './importLegacyConfig';

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name));

describe('importLegacyConfig', () => {
  it('imports a Rock Band guitar with shared solo fret pins', () => {
    const { config, warnings } = importLegacyConfig(fixture('reampedsunburst.picoconfig'));
    const profile = config.profiles[0];
    expect(profile.opts.deviceToEmulate).toBe(proto.SubType.RockBandGuitar);
    const byOutput = (output: proto.IOutput) =>
      profile.mappings.filter(
        (m) =>
          JSON.stringify(proto.Output.toObject(m.mapping as proto.Output)) ===
          JSON.stringify(output)
      );

    // the solo frets were bound to the same pins as the upper frets
    const RB = proto.RockBandGuitarButtonType;
    for (const [pin, fret, solo] of [
      [14, RB.RockBandGuitar_Green, RB.RockBandGuitar_SoloGreen],
      [11, RB.RockBandGuitar_Red, RB.RockBandGuitar_SoloRed],
      [10, RB.RockBandGuitar_Orange, RB.RockBandGuitar_SoloOrange],
    ]) {
      for (const output of [fret, solo]) {
        const [mapping] = byOutput({ rbButton: output });
        expect(mapping.input?.gpio).toMatchObject({
          pin,
          pinMode: proto.PinMode.PullUp,
          analog: false,
        });
        // the old global 1ms debounce
        expect(mapping.debounce100us).toBe(10);
      }
    }
    expect(
      byOutput({ gamepadButton: proto.GamepadButtonType.Gamepad_DpadUp })[0].input?.gpio?.pin
    ).toBe(21);

    const [whammy] = byOutput({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy });
    expect(whammy).toMatchObject({ min: 65520, max: 18512, center: 0 });
    expect(whammy.input?.gpio).toMatchObject({ pin: 26, analog: true });

    const [pickup] = byOutput({ rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup });
    expect(pickup.pickupThresholds).toEqual([14659, 27076, 40701, 56567]);

    // the old Fortnite Festival toggle on GP7 has no new equivalent
    expect(warnings.some((w) => w.includes('Fortnite Festival'))).toBe(true);
  });
});
