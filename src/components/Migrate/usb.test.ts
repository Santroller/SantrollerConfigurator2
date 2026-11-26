/// <reference types="w3c-web-usb" />
import { compress } from 'brotli/compress';
import { afterEach, describe, expect, it } from 'vitest';
import { Picoboot } from './picoboot';
import { fixture, uf2Block } from './santroller1.test';
import { webBackend } from './webBackend';

// Just enough of a WebUSB device for the configurator's side to talk to

interface Transfer {
  kind: 'out' | 'in' | 'controlIn' | 'controlOut';
  setup?: USBControlTransferParameters;
  data?: Uint8Array;
}

function fakeDevice(
  ids: { vendorId: number; productId: number; serialNumber?: string; productName?: string },
  controlIn: (setup: USBControlTransferParameters, length: number) => Uint8Array = () =>
    new Uint8Array()
) {
  const transfers: Transfer[] = [];
  const ok = { status: 'ok' as const };
  const device = {
    ...ids,
    opened: false,
    configuration: {
      configurationValue: 1,
      interfaces: [
        {
          interfaceNumber: 0,
          alternate: { interfaceClass: 8, endpoints: [] },
        },
        {
          interfaceNumber: 1,
          alternate: {
            interfaceClass: 0xff,
            endpoints: [
              { endpointNumber: 3, direction: 'out', packetSize: 64 },
              { endpointNumber: 4, direction: 'in', packetSize: 64 },
            ],
          },
        },
      ],
    },
    open: async () => {
      device.opened = true;
    },
    close: async () => {
      device.opened = false;
    },
    selectConfiguration: async () => undefined,
    claimInterface: async () => undefined,
    controlTransferIn: async (setup: USBControlTransferParameters, length: number) => {
      transfers.push({ kind: 'controlIn', setup });
      const data = controlIn(setup, length);
      return { ...ok, data: new DataView(data.buffer, data.byteOffset, data.byteLength) };
    },
    controlTransferOut: async (setup: USBControlTransferParameters) => {
      transfers.push({ kind: 'controlOut', setup });
      return { ...ok, bytesWritten: 0 };
    },
    transferOut: async (_endpoint: number, data: Uint8Array) => {
      transfers.push({ kind: 'out', data: new Uint8Array(data) });
      return { ...ok, bytesWritten: data.length };
    },
    transferIn: async () => {
      transfers.push({ kind: 'in' });
      return { ...ok, data: new DataView(new ArrayBuffer(0)) };
    },
  };
  return { device: device as unknown as USBDevice, transfers };
}

function installUsb(devices: USBDevice[]) {
  Object.defineProperty(navigator, 'usb', {
    configurable: true,
    value: { getDevices: async () => devices },
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'usb');
});

describe('Picoboot', () => {
  it('erases, writes the whole UF2 and reboots', async () => {
    const { device, transfers } = fakeDevice({ vendorId: 0x2e8a, productId: 0x000f });
    const uf2 = new Uint8Array(512 * 3);
    uf2.set(uf2Block(0x10000000, 1), 0);
    uf2.set(uf2Block(0x10000100, 2), 512);
    uf2.set(uf2Block(0x10002000, 3), 1024);
    await (await Picoboot.open(device)).flash('rp2350', uf2);

    expect(transfers[0].setup).toMatchObject({ requestType: 'vendor', request: 0x41, index: 1 });
    const commands = transfers
      .filter((t) => t.kind === 'out' && t.data!.length === 32)
      .map((t) => new DataView(t.data!.buffer))
      .filter((view) => view.getUint32(0, true) === 0x431fd10b)
      .map((view) => ({
        id: view.getUint8(8),
        addr: view.getUint32(16, true),
        size: view.getUint32(20, true),
      }));
    expect(commands).toEqual([
      { id: 0x1, addr: 1, size: 0 },
      { id: 0x6, addr: 0, size: 0 },
      { id: 0x3, addr: 0x10000000, size: 4096 },
      { id: 0x5, addr: 0x10000000, size: 512 },
      { id: 0x3, addr: 0x10002000, size: 4096 },
      { id: 0x5, addr: 0x10002000, size: 256 },
      // REBOOT2, normal boot after 500ms
      { id: 0xa, addr: 0, size: 500 },
    ]);
    // every command is acknowledged
    expect(transfers.filter((t) => t.kind === 'in')).toHaveLength(commands.length);
    const written = transfers.filter((t) => t.kind === 'out' && t.data!.length !== 32);
    expect(written.map((t) => t.data![0])).toEqual([1, 3]);
    expect(written[0].data![300]).toBe(2);
  });
});

describe('webBackend', () => {
  it('reads the config off a Santroller 1 controller', async () => {
    const config = fixture('santroller1-device.pico2config');
    const compressed = (await compress(config))!;
    const { device, transfers } = fakeDevice(
      { vendorId: 0x1209, productId: 0x2882, serialNumber: 'X041', productName: 'Santroller' },
      (setup, length) => compressed.slice(setup.value, setup.value + length)
    );
    installUsb([device]);
    expect(await webBackend.readSantroller1Config('X041')).toEqual(config);
    const reads = transfers.filter((t) => t.kind === 'controlIn');
    expect(reads[0].setup).toEqual({
      requestType: 'class',
      recipient: 'interface',
      request: 0x34,
      value: 0,
      index: 2,
    });
    expect(reads.map((t) => t.setup!.value)).toEqual(
      Array.from({ length: Math.ceil(compressed.length / 64) + 1 }, (_, i) => i * 64)
    );
    expect(device.opened).toBe(false);
  });

  it('finds Picos it has been allowed to use', async () => {
    const { device: santroller1 } = fakeDevice(
      { vendorId: 0x1209, productId: 0x2882, serialNumber: 'X241', productName: 'Santroller' },
      () => new Uint8Array()
    );
    const { device: bootsel } = fakeDevice({ vendorId: 0x2e8a, productId: 0x0003 });
    installUsb([santroller1, bootsel]);
    expect(await webBackend.scan()).toEqual({
      bootsel: [{ chip: 'rp2040' }],
      // In a console mode, so it isn't asked anything
      santroller1: [
        { serial: 'X241', board: undefined, mode: 2, consoleMode: true, error: undefined },
      ],
    });
  });
});
