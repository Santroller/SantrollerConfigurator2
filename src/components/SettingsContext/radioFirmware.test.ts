import { describe, expect, it } from 'vitest';
import { radioFirmwareStatus, radioFirmwareVersionOf } from './radioFirmware';

function image(size: number, version: number, magic = 0x57465253, areaSize = size) {
  const bytes = new Uint8Array(size).fill(0xff);
  const toc = new DataView(bytes.buffer, size - 4096, 32);
  toc.setUint32(0, magic, true);
  toc.setUint16(4, 1, true);
  toc.setUint16(6, 0, true);
  toc.setUint32(8, version, true);
  toc.setUint32(12, areaSize, true);
  return bytes;
}

describe('radioFirmwareVersionOf', () => {
  it('reads the content version from the last sector', () => {
    expect(radioFirmwareVersionOf(image(8192, 3))).toBe(3);
  });
  it('rejects images without a table of contents', () => {
    expect(radioFirmwareVersionOf(new Uint8Array(8192).fill(0xff))).toBeNull();
    expect(radioFirmwareVersionOf(image(8192, 3, 0x12345678))).toBeNull();
    expect(radioFirmwareVersionOf(new Uint8Array(100))).toBeNull();
  });
  it('rejects a table of contents for a different area size', () => {
    expect(radioFirmwareVersionOf(image(8192, 3, undefined, 4096))).toBeNull();
  });
});

describe('radioFirmwareStatus', () => {
  it('is unsupported without OTA radio writes or a bundled image', () => {
    expect(radioFirmwareStatus(null, 1, true)).toBe('unsupported');
    expect(radioFirmwareStatus(1, null, true)).toBe('unsupported');
  });
  it('reports missing firmware first', () => {
    expect(radioFirmwareStatus(1, 1, true)).toBe('missing');
  });
  it('treats an unversioned area as version 1', () => {
    expect(radioFirmwareStatus(0, 1, false)).toBe('current');
    expect(radioFirmwareStatus(0, 2, false)).toBe('outdated');
  });
  it('compares versions', () => {
    expect(radioFirmwareStatus(1, 2, false)).toBe('outdated');
    expect(radioFirmwareStatus(2, 2, false)).toBe('current');
    expect(radioFirmwareStatus(3, 2, false)).toBe('current');
  });
});
