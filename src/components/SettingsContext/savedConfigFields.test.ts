import { describe, expect, it } from 'vitest';
import { proto } from './config';
import { savedDeviceName, savedManufacturerName, savedSellerConfig } from './savedConfigFields';

describe('savedDeviceName', () => {
  it('reads the name from the main section', () => {
    const main = proto.Config.encode({
      deviceName: 'My Guitar',
      xboxOneLegacyAdapter: true,
    }).finish();
    expect(savedDeviceName(main)).toBe('My Guitar');
  });

  it('is undefined when the device is not named', () => {
    expect(
      savedDeviceName(proto.Config.encode({ xboxOneLegacyAdapter: true }).finish())
    ).toBeUndefined();
  });

  it('still reads it with the aux section after it', () => {
    const main = proto.Config.encode({ deviceName: 'My Guitar' }).finish();
    const aux = proto.AuxConfigBlock.encode({ toggleStates: [{ id: 1, state: true }] }).finish();
    const saved = new Uint8Array(main.length + aux.length);
    saved.set(main, 0);
    saved.set(aux, main.length);
    expect(savedDeviceName(saved)).toBe('My Guitar');
  });
});

describe('savedManufacturerName', () => {
  it('reads the global manufacturer separately from the product name', () => {
    const main = proto.Config.encode({
      deviceName: 'My Guitar',
      manufacturerName: 'My Company',
    }).finish();
    expect(savedDeviceName(main)).toBe('My Guitar');
    expect(savedManufacturerName(main)).toBe('My Company');
  });

  it('is undefined for older configs without a manufacturer name', () => {
    const main = proto.Config.encode({ deviceName: 'My Guitar' }).finish();
    expect(savedManufacturerName(main)).toBeUndefined();
  });

  it('retains an explicitly cleared manufacturer', () => {
    const main = proto.Config.encode({ manufacturerName: '' }).finish();
    expect(savedManufacturerName(main)).toBe('');
  });

  it('reads the manufacturer with the aux section appended', () => {
    const main = proto.Config.encode({ manufacturerName: 'My Company' }).finish();
    const aux = proto.AuxConfigBlock.encode({ toggleStates: [{ id: 1, state: true }] }).finish();
    const saved = new Uint8Array(main.length + aux.length);
    saved.set(main);
    saved.set(aux, main.length);
    expect(savedManufacturerName(saved)).toBe('My Company');
  });
});

describe('savedSellerConfig', () => {
  it('reads the seller entry from among the other gui entries', () => {
    const main = proto.Config.encode({
      guiConfig: [
        { deviceid: 3, label: { label: 'Neck', pin: 1 } },
        { deviceid: 0, seller: { name: 'My Tool', logo: new Uint8Array([1, 2, 3]) } },
      ],
    }).finish();
    const seller = savedSellerConfig(main);
    expect(seller?.name).toBe('My Tool');
    expect(Array.from(seller?.logo ?? [])).toEqual([1, 2, 3]);
    expect(seller?.favicon).toBeNull();
  });

  it('round-trips separate logo and favicon bytes in the saved seller branding', () => {
    const main = proto.Config.encode({
      guiConfig: [
        {
          deviceid: 0,
          seller: {
            name: 'My Tool',
            logo: new Uint8Array([1, 2, 3]),
            favicon: new Uint8Array([4, 5, 6]),
          },
        },
      ],
    }).finish();
    const aux = proto.AuxConfigBlock.encode({ toggleStates: [{ id: 1, state: true }] }).finish();
    const saved = new Uint8Array(main.length + aux.length);
    saved.set(main);
    saved.set(aux, main.length);
    const seller = savedSellerConfig(saved);
    expect(seller?.name).toBe('My Tool');
    expect(Array.from(seller?.logo ?? [])).toEqual([1, 2, 3]);
    expect(Array.from(seller?.favicon ?? [])).toEqual([4, 5, 6]);
  });

  it('is undefined when there is no seller entry', () => {
    const main = proto.Config.encode({
      guiConfig: [{ deviceid: 3, label: { label: 'Neck', pin: 1 } }],
    }).finish();
    expect(savedSellerConfig(main)).toBeUndefined();
  });

  it('still reads it with the aux section after it', () => {
    const main = proto.Config.encode({
      guiConfig: [{ deviceid: 0, seller: { name: 'My Tool', logo: new Uint8Array() } }],
    }).finish();
    const aux = proto.AuxConfigBlock.encode({ toggleStates: [{ id: 1, state: true }] }).finish();
    const saved = new Uint8Array(main.length + aux.length);
    saved.set(main, 0);
    saved.set(aux, main.length);
    expect(savedSellerConfig(saved)?.name).toBe('My Tool');
  });
});
