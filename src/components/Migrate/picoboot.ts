/// <reference types="w3c-web-usb" />

import { Chip, uf2Runs } from './santroller1';

// Flashing a Pico in its bootloader over its PICOBOOT interface, the way picotool does, for the
// website (the desktop app does the same in src-tauri/src/migrate.rs)

const PICOBOOT_MAGIC = 0x431fd10b;
const PC_EXCLUSIVE_ACCESS = 0x1;
const PC_REBOOT = 0x2;
const PC_FLASH_ERASE = 0x3;
const PC_WRITE = 0x5;
const PC_EXIT_XIP = 0x6;
const PC_REBOOT2 = 0xa;
const PICOBOOT_IF_RESET = 0x41;
const FLASH_SECTOR = 4096;
const FLASH_PAGE = 256;
const RP2040_SRAM_END = 0x20042000;
const REBOOT_DELAY_MS = 500;

function words(...values: number[]) {
  const data = new Uint8Array(values.length * 4);
  const view = new DataView(data.buffer);
  values.forEach((value, i) => view.setUint32(i * 4, value >>> 0, true));
  return data;
}

export class Picoboot {
  private token = 1;

  private constructor(
    private readonly device: USBDevice,
    private readonly outEndpoint: number,
    private readonly inEndpoint: number,
    private readonly inPacketSize: number
  ) {}

  static async open(device: USBDevice) {
    if (!device.opened) {
      await device.open();
    }
    if (!device.configuration) {
      await device.selectConfiguration(1);
    }
    const iface = device.configuration?.interfaces.find(
      (candidate) => candidate.alternate.interfaceClass === 0xff
    );
    if (!iface) {
      throw new Error('The bootloader has no PICOBOOT interface');
    }
    await device.claimInterface(iface.interfaceNumber);
    const endpoints = iface.alternate.endpoints;
    const out = endpoints.find((endpoint) => endpoint.direction === 'out');
    const input = endpoints.find((endpoint) => endpoint.direction === 'in');
    if (!out || !input) {
      throw new Error('The bootloader has no PICOBOOT endpoints');
    }
    await device.controlTransferOut({
      requestType: 'vendor',
      recipient: 'interface',
      request: PICOBOOT_IF_RESET,
      value: 0,
      index: iface.interfaceNumber,
    });
    return new Picoboot(device, out.endpointNumber, input.endpointNumber, input.packetSize);
  }

  // Every command used here sends its data (if any) to the device, and is acknowledged with an
  // empty packet from it
  private async command(id: number, args: Uint8Array, data?: Uint8Array) {
    const cmd = new Uint8Array(32);
    const view = new DataView(cmd.buffer);
    view.setUint32(0, PICOBOOT_MAGIC, true);
    view.setUint32(4, this.token++, true);
    view.setUint8(8, id);
    view.setUint8(9, args.length);
    view.setUint32(12, data?.length ?? 0, true);
    cmd.set(args, 16);
    await this.check(await this.device.transferOut(this.outEndpoint, cmd), id);
    if (data?.length) {
      await this.check(await this.device.transferOut(this.outEndpoint, data as BufferSource), id);
    }
    await this.check(await this.device.transferIn(this.inEndpoint, this.inPacketSize), id);
  }

  private async check(result: USBInTransferResult | USBOutTransferResult, id: number) {
    if (result.status !== 'ok') {
      throw new Error(`PICOBOOT command 0x${id.toString(16)} failed: ${result.status}`);
    }
  }

  async flash(chip: Chip, uf2: Uint8Array, onProgress?: (fraction: number) => void) {
    const runs = uf2Runs(uf2);
    const total = runs.reduce((sum, run) => sum + run.data.length, 0);
    let written = 0;
    await this.command(PC_EXCLUSIVE_ACCESS, Uint8Array.of(1));
    await this.command(PC_EXIT_XIP, new Uint8Array());
    for (const run of runs) {
      const start = run.addr - (run.addr % FLASH_SECTOR);
      const end = Math.ceil((run.addr + run.data.length) / FLASH_SECTOR) * FLASH_SECTOR;
      await this.command(PC_FLASH_ERASE, words(start, end - start));
      // Flash is written a page at a time, so pad the run out to a whole page
      const data = new Uint8Array(Math.ceil(run.data.length / FLASH_PAGE) * FLASH_PAGE).fill(0xff);
      data.set(run.data);
      for (let at = 0; at < data.length; at += FLASH_SECTOR) {
        const chunk = data.subarray(at, at + FLASH_SECTOR);
        await this.command(PC_WRITE, words(run.addr + at, chunk.length), chunk);
        written += Math.min(chunk.length, run.data.length - at);
        onProgress?.(written / total);
      }
    }
    // The device goes away as it reboots, so this may not be acknowledged
    await (
      chip === 'rp2040'
        ? this.command(PC_REBOOT, words(0, RP2040_SRAM_END, REBOOT_DELAY_MS))
        : this.command(PC_REBOOT2, words(0, REBOOT_DELAY_MS, 0, 0))
    ).catch(() => undefined);
    await this.device.close().catch(() => undefined);
  }
}
