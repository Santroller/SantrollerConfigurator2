import { describe, expect, it } from 'vitest';
import { configFlashAddress, parseFirmwareLayout, Uf2BuildError } from './uf2Layout';

const pico1 = { flashSize: 2 * 1024 * 1024, configSize: 0x8000 };
const pico2 = { flashSize: 4 * 1024 * 1024, configSize: 0x8000 };

describe('parseFirmwareLayout', () => {
  it('reads what the firmware build writes', () => {
    expect(
      parseFirmwareLayout({ board: 'pico2_w_compat', flashSize: 4194304, configSize: 32768 })
    ).toEqual(pico2);
  });

  it.each([
    null,
    {},
    { flashSize: 4194304 },
    { flashSize: '4194304', configSize: 32768 },
    { flashSize: 32768, configSize: 65536 },
  ])('rejects %j', (data) => {
    expect(() => parseFirmwareLayout(data)).toThrow(Uf2BuildError);
  });
});

describe('configFlashAddress', () => {
  it('ends the config at the end of flash', () => {
    expect(configFlashAddress(pico1, 1000)).toBe(0x10200000 - 1024);
    expect(configFlashAddress(pico2, 1000)).toBe(0x10400000 - 1024);
    expect(configFlashAddress(pico2, 1024)).toBe(0x10400000 - 1024);
  });

  it('fits a config that fills the whole area', () => {
    expect(configFlashAddress(pico2, 0x8000)).toBe(0x10400000 - 0x8000);
  });

  it('rejects a config the firmware has no room for', () => {
    expect(() => configFlashAddress(pico2, 0x8001)).toThrow(
      expect.objectContaining({ code: 'configTooLarge' })
    );
  });
});
