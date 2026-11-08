import { describe, expect, it } from 'vitest';
import { AllPinsNamed, I2CGroups, MosiPins, SckPins, SclPins, SdaPins, SPIGroups } from './pins';

describe('Pico GPIO peripheral pin options', () => {
  it('offers GPIO22/23 for their supported I2C1 and SPI0 functions', () => {
    expect(SdaPins[22]).toMatchObject({ channel: '1', pin: 22 });
    expect(SclPins[23]).toMatchObject({ channel: '1', pin: 23 });
    expect(I2CGroups[22]).toBe('1');
    expect(I2CGroups[23]).toBe('1');

    expect(SckPins[22]).toMatchObject({ channel: '0', pin: 22 });
    expect(MosiPins[23]).toMatchObject({ channel: '0', pin: 23 });
    expect(SPIGroups[22]).toBe('0');
    expect(SPIGroups[23]).toBe('0');
  });

  it('keeps GPIO22/23 available as general GPIO pins', () => {
    expect(AllPinsNamed[22]).toMatchObject({ pin: 22 });
    expect(AllPinsNamed[23]).toMatchObject({ pin: 23 });
  });
});

describe('RP2350B pins', () => {
  it('continues the peripheral functions up to GP47', async () => {
    const { RxPins, TxPins, MisoPins } = await import('./pins');
    // GP32 - GP35: SPI0, UART0, I2C0 / I2C1 (RP2350 datasheet function table)
    expect(MisoPins[32]).toMatchObject({ channel: '0' });
    expect(SckPins[34]).toMatchObject({ channel: '0' });
    expect(TxPins[32]).toMatchObject({ channel: '0' });
    expect(RxPins[33]).toMatchObject({ channel: '0' });
    expect(SdaPins[32]).toMatchObject({ channel: '0' });
    expect(SclPins[35]).toMatchObject({ channel: '1' });
    // GP40 - GP43: SPI1, UART1
    expect(MosiPins[43]).toMatchObject({ channel: '1' });
    expect(TxPins[40]).toMatchObject({ channel: '1' });
    expect(TxPins[44]).toMatchObject({ channel: '0' });
    expect(TxPins[34]).toBeUndefined();
  });

  it('only offers pins the chip has', async () => {
    const { pinAvailable, AnalogPinsNamed } = await import('./pins');
    expect(pinAvailable(AllPinsNamed[29], 30)).toBe(true);
    expect(pinAvailable(AllPinsNamed[30], 30)).toBe(false);
    expect(pinAvailable(AllPinsNamed[47], 48)).toBe(true);
    // The ADC moves to GP40 - GP47 on an RP2350B
    expect(pinAvailable(AnalogPinsNamed[26], 30)).toBe(true);
    expect(pinAvailable(AnalogPinsNamed[26], 48)).toBe(false);
    expect(pinAvailable(AnalogPinsNamed[40], 48)).toBe(true);
    expect(pinAvailable(AnalogPinsNamed[40], 30)).toBe(false);
    expect(pinAvailable({ label: 'pin', pin: 29, lastPin: 30 }, 30)).toBe(false);
  });

  it('maps the wireless pin presets', async () => {
    const { wirelessChipPins } = await import('./pins');
    const { proto } = await import('@/components/SettingsContext/config');
    expect(wirelessChipPins({})).toEqual({ on: 23, data: 24, cs: 25, clock: 29 });
    expect(
      wirelessChipPins({ wirelessPins: proto.WirelessPins.WirelessPinsWaveshareRp2350bPlusW })
    ).toEqual({ on: 36, data: 37, cs: 38, clock: 39 });
    expect(
      wirelessChipPins({ wirelessPins: proto.WirelessPins.WirelessPinsCustom, wlOnPin: 2 })
    ).toEqual({ on: 2, data: -1, cs: -1, clock: -1 });
  });

  it('stores switch network pins above GP31 in pinsHigh', async () => {
    const { switchNetworkPins, withSwitchNetworkPins } =
      await import('@/components/Devices/matrixPins');
    const network = withSwitchNetworkPins({ pins: 0, buttons: [] }, [0, 31, 32, 47]);
    expect(network.pins).toBe((1 | (2 ** 31)) >>> 0);
    expect(network.pinsHigh).toBe(1 | (1 << 15));
    expect(switchNetworkPins(network)).toEqual([0, 31, 32, 47]);
  });
});
