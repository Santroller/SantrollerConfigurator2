/// <reference types="w3c-web-usb" />

import { MigrateBackend } from './backend';
import { Picoboot } from './picoboot';
import {
  BOOTSEL_PIDS,
  Chip,
  chipForBootselPid,
  decompressSantroller1Config,
  MigrateScan,
  RPI_VID,
  S1_CONFIG_CHUNK,
  S1_INTERFACE,
  S1_JUMP_BOOTLOADER,
  S1_MAX_CONFIG,
  S1_READ_BOARD,
  S1_READ_CONFIG,
  S1_READ_F_CPU,
  SANTROLLER_V1_PID,
  SANTROLLER_VID,
  santroller1Mode,
} from './santroller1';

// The website's side, over WebUSB. Only sees the devices the user has picked in the browser's
// chooser, and can't write to the bootloader's drive, so flashing goes over PICOBOOT.

const isWindows = () => /Windows/.test(navigator.userAgent);

const BOOTSEL_FILTERS = (Object.keys(BOOTSEL_PIDS) as Chip[]).map((chip) => ({
  vendorId: RPI_VID,
  productId: BOOTSEL_PIDS[chip],
}));
const SANTROLLER1_FILTER = { vendorId: SANTROLLER_VID, productId: SANTROLLER_V1_PID };
// Everything there is to install Santroller 2 on
export const INSTALL_FILTERS: USBDeviceFilter[] = [...BOOTSEL_FILTERS, SANTROLLER1_FILTER];

function isSantroller1(device: USBDevice) {
  return (
    device.vendorId === SANTROLLER_VID &&
    device.productId === SANTROLLER_V1_PID &&
    // Ardwiino, from before Santroller 1, used the same ids
    (!device.productName || device.productName === 'Santroller')
  );
}

// One thing at a time per device, as a scan and a read could otherwise open it at once
const queues = new WeakMap<USBDevice, Promise<unknown>>();
function exclusive<T>(device: USBDevice, task: () => Promise<T>): Promise<T> {
  const result = (queues.get(device) ?? Promise.resolve()).catch(() => undefined).then(task);
  queues.set(device, result);
  return result;
}

// Opens Santroller 1's vendor interface for the task, and lets go of it after
function withSantroller1<T>(device: USBDevice, task: () => Promise<T>) {
  return exclusive(device, async () => {
    await device.open();
    try {
      if (!device.configuration) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(S1_INTERFACE);
      return await task();
    } finally {
      await device.close().catch(() => undefined);
    }
  });
}

async function read(device: USBDevice, request: number, value: number, length: number) {
  const result = await device.controlTransferIn(
    { requestType: 'class', recipient: 'interface', request, value, index: S1_INTERFACE },
    length
  );
  if (result.status !== 'ok' || !result.data) {
    throw new Error(`The controller didn't answer (${result.status})`);
  }
  return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
}

async function readString(device: USBDevice, request: number) {
  return new TextDecoder()
    .decode(await read(device, request, 0, 32))
    .replaceAll('\0', '')
    .trim();
}

async function findSantroller1(serial: string) {
  const device = (await navigator.usb.getDevices()).find(
    (candidate) => isSantroller1(candidate) && candidate.serialNumber === serial
  );
  if (!device) {
    throw new Error('The controller was unplugged');
  }
  return device;
}

export const webBackend: MigrateBackend = {
  seesEverything: false,
  readsSavedPresets: false,
  // Windows gives the RP2040's bootloader no driver that WebUSB can use, unlike the RP2350's
  canFlash: (chip) => !(chip === 'rp2040' && isWindows()),
  scan: async () => {
    const scan: MigrateScan = { bootsel: [], santroller1: [] };
    for (const device of await navigator.usb.getDevices()) {
      const chip = device.vendorId === RPI_VID ? chipForBootselPid(device.productId) : undefined;
      if (chip) {
        scan.bootsel.push({ chip });
      } else if (isSantroller1(device)) {
        const serial = device.serialNumber ?? '';
        const { mode, configurable } = santroller1Mode(serial, isWindows());
        let board: string | undefined;
        let error: string | undefined;
        if (configurable) {
          try {
            board = await withSantroller1(device, async () => {
              // Santroller 1 reads the clock speed first, and an empty one means it isn't ready
              if (!(await readString(device, S1_READ_F_CPU))) {
                throw new Error("The controller didn't say what it is");
              }
              return readString(device, S1_READ_BOARD);
            });
          } catch (e) {
            error = String(e);
          }
        }
        scan.santroller1.push({ serial, board, mode, consoleMode: !configurable, error });
      }
    }
    return scan;
  },
  watch: (onChange) => {
    navigator.usb.addEventListener('connect', onChange);
    navigator.usb.addEventListener('disconnect', onChange);
  },
  request: async (chip) => {
    try {
      await navigator.usb.requestDevice({
        filters: chip ? [{ vendorId: RPI_VID, productId: BOOTSEL_PIDS[chip] }] : INSTALL_FILTERS,
      });
      return true;
    } catch {
      // closed without picking anything
      return false;
    }
  },
  readSantroller1Config: async (serial) => {
    const device = await findSantroller1(serial);
    const compressed = await withSantroller1(device, async () => {
      const chunks: Uint8Array[] = [];
      let length = 0;
      // Santroller 1 steps through it a chunk at a time, whatever the last chunk held
      for (let offset = 0; ; offset += S1_CONFIG_CHUNK) {
        if (offset > 0xffff || length > S1_MAX_CONFIG) {
          throw new Error("The controller's config is too big");
        }
        const chunk = await read(device, S1_READ_CONFIG, offset, S1_CONFIG_CHUNK);
        if (!chunk.length) {
          break;
        }
        chunks.push(chunk.slice());
        length += chunk.length;
      }
      const all = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.length;
      }
      return all;
    });
    if (!compressed.length) {
      throw new Error('The controller has no config');
    }
    return decompressSantroller1Config(compressed);
  },
  santroller1Bootloader: async (serial) => {
    const device = await findSantroller1(serial);
    await withSantroller1(device, async () => {
      // It disconnects straight away, so the request may not complete
      await device
        .controlTransferOut({
          requestType: 'class',
          recipient: 'interface',
          request: S1_JUMP_BOOTLOADER,
          value: 0,
          index: S1_INTERFACE,
        })
        .catch(() => undefined);
    });
  },
  readSavedPresets: async () => null,
  backup: async () => undefined,
  flash: async (chip, uf2, _driveOnly, onProgress) => {
    if (!webBackend.canFlash(chip)) {
      return { result: 'manual', error: '' };
    }
    const device = (await navigator.usb.getDevices()).find(
      (candidate) => candidate.vendorId === RPI_VID && candidate.productId === BOOTSEL_PIDS[chip]
    );
    if (!device) {
      return { result: 'manual', error: "The Pico isn't in its bootloader any more" };
    }
    try {
      await exclusive(device, async () =>
        (await Picoboot.open(device)).flash(chip, uf2, onProgress)
      );
      return { result: 'picoboot' };
    } catch (e) {
      await device.close().catch(() => undefined);
      return { result: 'manual', error: String(e) };
    }
  },
};
