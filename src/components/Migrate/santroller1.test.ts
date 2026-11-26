import { readFileSync } from 'fs';
import { join } from 'path';
import { compress } from 'brotli/compress';
import { describe, expect, it } from 'vitest';
import { importLegacyConfigs } from '@/components/Legacy/importLegacyConfig';
import {
  chipForBoard,
  decompressSantroller1Config,
  parseSavedPresets,
  santroller1FileName,
  santroller1Mode,
  uf2Runs,
} from './santroller1';

export const fixture = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, '__fixtures__', name)));

// A UF2 block writing 256 bytes of value to addr
export function uf2Block(addr: number, value = 0) {
  const block = new Uint8Array(512);
  const view = new DataView(block.buffer);
  view.setUint32(0, 0x0a324655, true);
  view.setUint32(4, 0x9e5d5157, true);
  view.setUint32(12, addr, true);
  view.setUint32(16, 256, true);
  block.fill(value, 32, 32 + 256);
  view.setUint32(508, 0x0ab16f30, true);
  return block;
}

describe('parseSavedPresets', () => {
  it("reads the presets out of Santroller 1's config.bin", () => {
    const presets = parseSavedPresets(fixture('santroller1-config.bin'));
    expect(presets.map((preset) => preset.name)).toEqual(['test']);
    expect(presets[0].data.length).toBeGreaterThan(0);
  });

  it('has no presets when none were saved', () => {
    // Only the legend type, as a fresh install writes it
    expect(parseSavedPresets(Uint8Array.from([0x08, 0x01]))).toEqual([]);
  });

  it('imports a preset alongside the config read off the controller', () => {
    const [preset] = parseSavedPresets(fixture('santroller1-config.bin'));
    const { config } = importLegacyConfigs([
      { data: fixture('santroller1-device.pico2config'), name: 'Controller' },
      { data: preset.data, name: preset.name },
    ]);
    expect(config.profiles.map((profile) => profile.opts?.name)).toEqual(['Controller', 'test']);
  });
});

describe('santroller1Mode', () => {
  it('reads the console mode from the end of the serial', () => {
    expect(santroller1Mode('00AA966B5AAC69C23041', false)).toEqual({ mode: 0, configurable: true });
    expect(santroller1Mode('00AA966B5AAC69C23240', false)).toEqual({
      mode: 2,
      configurable: false,
    });
    expect(santroller1Mode('00AA966B5AAC69C23940', false).configurable).toBe(true);
  });

  it("can't reach an XInput controller on Windows unless it's in Windows mode", () => {
    expect(santroller1Mode('00AA966B5AAC69C23041', true).configurable).toBe(false);
    expect(santroller1Mode('00AA966B5AAC69C23040', true).configurable).toBe(true);
    expect(santroller1Mode('00AA966B5AAC69C23941', true).configurable).toBe(true);
  });
});

describe('chipForBoard', () => {
  it('only runs Santroller 2 on RP2040 and RP2350 boards', () => {
    expect(chipForBoard('pico2w')).toBe('rp2350');
    expect(chipForBoard('picow')).toBe('rp2040');
    expect(chipForBoard('seeed_xiao_rp2040')).toBe('rp2040');
    expect(chipForBoard('micro')).toBeUndefined();
    expect(chipForBoard(undefined)).toBeUndefined();
  });
});

describe('santroller1FileName', () => {
  it('names the file after the board, as Santroller 1 exported them', () => {
    expect(santroller1FileName('My guitar', 'pico2w')).toBe('My guitar.pico2wconfig');
    expect(santroller1FileName('a/b', 'adafruit_qtpy')).toBe('a_b.picoconfig');
  });
});

describe('decompressSantroller1Config', () => {
  it('undoes the Brotli Santroller 1 keeps its config in', async () => {
    const config = fixture('santroller1-device.pico2config');
    const compressed = (await compress(config))!;
    expect(await decompressSantroller1Config(compressed)).toEqual(config);
  });
});

describe('uf2Runs', () => {
  it('joins consecutive blocks', () => {
    const uf2 = new Uint8Array(1536);
    uf2.set(uf2Block(0x10000000, 1), 0);
    uf2.set(uf2Block(0x10000100, 2), 512);
    uf2.set(uf2Block(0x10001000, 3), 1024);
    const runs = uf2Runs(uf2);
    expect(runs.map((run) => [run.addr, run.data.length])).toEqual([
      [0x10000000, 512],
      [0x10001000, 256],
    ]);
    expect(runs[0].data[300]).toBe(2);
  });

  it('turns down anything else', () => {
    expect(() => uf2Runs(new Uint8Array(512))).toThrow();
  });
});
