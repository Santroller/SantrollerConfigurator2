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
