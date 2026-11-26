import protobuf from 'protobufjs/minimal';

// Getting a Pico onto Santroller 2: Picos in their bootloader (BOOTSEL), and Picos still running
// Santroller 1, whose config is brought over. Shared by the desktop app (src-tauri/src/migrate.rs)
// and the website (WebUSB).

export type Chip = 'rp2040' | 'rp2350';

export const RPI_VID = 0x2e8a;
export const BOOTSEL_PIDS: Record<Chip, number> = { rp2040: 0x0003, rp2350: 0x000f };
export const SANTROLLER_VID = 0x1209;
export const SANTROLLER_V1_PID = 0x2882;
export const SANTROLLER_PID = 0x2883;

// Santroller 1's requests, sent to its vendor interface as class requests
export const S1_INTERFACE = 2;
export const S1_JUMP_BOOTLOADER = 0x31;
export const S1_READ_CONFIG = 0x34;
export const S1_READ_F_CPU = 0x35;
export const S1_READ_BOARD = 0x36;
export const S1_CONFIG_CHUNK = 64;
// Far bigger than any config, in case a device never sends the empty chunk that ends it
export const S1_MAX_CONFIG = 256 * 1024;

export interface Bootsel {
  chip: Chip;
}

export interface Santroller1Device {
  serial: string;
  // What Santroller 1 calls the board, eg pico2w
  board?: string;
  mode: number;
  // Santroller 1 doesn't answer in a console mode, so it has to be plugged in again in PC mode
  consoleMode: boolean;
  // Why it couldn't be asked what it is, usually missing permissions on Linux
  error?: string;
}

export interface MigrateScan {
  bootsel: Bootsel[];
  santroller1: Santroller1Device[];
}

export type FlashResult =
  // Copied to the bootloader's drive
  | { result: 'drive' }
  // Written over USB
  | { result: 'picoboot' }
  // The drive has to be mounted by hand, and the desktop app copies it there once it is
  | { result: 'needsMount'; error: string }
  // It has to be copied to the drive by hand, as the website can't write to it
  | { result: 'manual'; error: string };

const S1_MODE_UNIVERSAL = 0;
const S1_MODE_WINDOWS = 9;

// The console mode Santroller 1 is in, and whether it can be configured that way. Santroller 1
// puts these at the end of the serial: the mode, the controller type and whether it's XInput.
export function santroller1Mode(serial: string, windows: boolean) {
  if (serial.length < 3) {
    return { mode: S1_MODE_UNIVERSAL, configurable: true };
  }
  const mode = (serial.charCodeAt(serial.length - 3) - 48) & 0xff;
  const xinput = serial[serial.length - 1] !== '0';
  // Windows hands an XInput device to its own driver, so it can't be reached
  const configurable =
    mode === S1_MODE_WINDOWS || (mode === S1_MODE_UNIVERSAL && !(windows && xinput));
  return { mode, configurable };
}

// Santroller 1 calls the Raspberry Pi boards these. Anything else (an Arduino) can't run
// Santroller 2. The rest of the RP2040 boards Santroller 1 knew are third party.
const RP2350_BOARDS = ['pico2', 'pico2w'];
const RP2040_BOARDS = [
  'pico',
  'picow',
  'adafruit_feather',
  'adafruit_feather_scorpio',
  'adafruit_feather_dvi',
  'adafruit_feather_adalogger',
  'adafruit_feather_rfm',
  'adafruit_feather_thinkink',
  'adafruit_feather_usb_host',
  'adafruit_feather_can',
  'adafruit_feather_prop_maker',
  'adafruit_itsybitsy',
  'adafruit_qtpy',
  'adafruit_stemmafriend',
  'adafruit_trinkeyrp2040qt',
  'adafruit_macropad2040',
  'adafruit_kb2040',
  'arduino_nano_connect',
  'bridgetek_idm2040-7a',
  'cytron_maker_nano_rp2040',
  'cytron_maker_pi_rp2040',
  'datanoisetv_picoadk',
  'flyboard2040_core',
  'dfrobot_beetle_rp2040',
  'electroniccats_huntercat_nfc',
  'extelec_rc2040',
  'challenger_2040_lte',
  'challenger_2040_lora',
  'challenger_2040_subghz',
  'challenger_2040_wifi',
  'challenger_2040_wifi_ble',
  'challenger_nb_2040_wifi',
  'challenger_2040_sdrtc',
  'challenger_2040_nfc',
  'ilabs_rpico32',
  'melopero_cookie_rp2040',
  'melopero_shake_rp2040',
  'nullbits_bit_c_pro',
  'pimoroni_pga2040',
  'pimoroni_picolipo_4mb',
  'pimoroni_picolipo_16mb',
  'pimoroni_picosystem_rp2040',
  'pimoroni_plasma2040',
  'pimoroni_tiny2040',
  'pybstick26_rp2040',
  'rakwireless_rak11300',
  'redscorp_rp2040_eins',
  'redscorp_rp2040_promini',
  'sparkfun_micromod_rp2040',
  'sparkfun_promicro_rp2040',
  'sparkfun_thingplus_rp2040',
  'upesy_rp2040_devkit',
  'seeed_xiao_rp2040',
  'vccgnd_yd_rp2040',
  'viyalab_mizu',
  'waveshare_rp2040_zero',
  'waveshare_rp2040_one',
  'waveshare_rp2040_plus_4mb',
  'waveshare_rp2040_plus_16mb',
  'waveshare_rp2040_lcd_0_96',
  'waveshare_rp2040_lcd_1_28',
  'wiznet_5100s_evb_pico',
  'wiznet_wizfi360_evb_pico',
  'wiznet_5500_evb_pico',
];

// Undefined for a board that can't run Santroller 2
export function chipForBoard(board: string | undefined): Chip | undefined {
  if (!board) {
    return undefined;
  }
  if (RP2350_BOARDS.includes(board)) {
    return 'rp2350';
  }
  return RP2040_BOARDS.includes(board) ? 'rp2040' : undefined;
}

export function chipForBootselPid(pid: number): Chip | undefined {
  return (Object.keys(BOOTSEL_PIDS) as Chip[]).find((chip) => BOOTSEL_PIDS[chip] === pid);
}

export function firmwareFileName(chip: Chip) {
  return chip === 'rp2350' ? 'santroller_pico2.uf2' : 'santroller_pico1.uf2';
}

// The firmware the website offers for each chip
export async function fetchFirmware(chip: Chip) {
  const response = await fetch(`${firmwareFileName(chip)}?v=${__CONFIGURATOR_COMMIT__}`);
  if (!response.ok) {
    throw new Error(`Couldn't load the firmware (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export interface SavedPreset {
  name: string;
  // A SerializedConfiguration, the same as an exported file
  data: Uint8Array;
}

// Santroller 1's config.bin is a protobuf-net ToolConfig, whose presets are field 2: tuples of
// (name, SerializedConfiguration), which protobuf-net writes as fields 1 and 2
export function parseSavedPresets(file: Uint8Array): SavedPreset[] {
  const presets: SavedPreset[] = [];
  const reader = protobuf.Reader.create(file);
  while (reader.pos < reader.len) {
    const tag = reader.uint32();
    if (tag >>> 3 !== 2 || (tag & 7) !== 2) {
      reader.skipType(tag & 7);
      continue;
    }
    const preset = protobuf.Reader.create(reader.bytes());
    let name = '';
    let data: Uint8Array | undefined;
    while (preset.pos < preset.len) {
      const field = preset.uint32();
      if (field === ((1 << 3) | 2)) {
        name = preset.string();
      } else if (field === ((2 << 3) | 2)) {
        data = preset.bytes();
      } else {
        preset.skipType(field & 7);
      }
    }
    if (data) {
      presets.push({ name, data });
    }
  }
  return presets;
}

// Where Santroller 1 keeps config.bin, for the website, which has to be handed it
export const SAVED_PRESETS_PATHS = {
  windows: '%APPDATA%\\SantrollerConfigurator\\config.bin',
  macos: '/Users/Shared/Library/Application Support/SantrollerConfigurator/config.bin',
  linux: '~/.config/SantrollerConfigurator/config.bin',
};

// Santroller 1 named exported files after the board, which the import still recognises
export function santroller1FileName(name: string, board?: string) {
  const safe = name.replace(/[^\w\- ]+/g, '_').trim() || 'santroller1';
  return `${safe}.${board && /^pico2?w?$/.test(board) ? board : 'pico'}config`;
}

// Santroller 1 keeps its config on the controller compressed with Brotli
export async function decompressSantroller1Config(compressed: Uint8Array) {
  const { decompress } = await import('brotli/decompress');
  return decompress(compressed);
}

const UF2_MAGIC0 = 0x0a324655;
const UF2_MAGIC1 = 0x9e5d5157;
const UF2_MAGIC_END = 0x0ab16f30;
const UF2_FLAG_NOT_MAIN_FLASH = 0x1;

// What a UF2 writes to flash, as runs of consecutive blocks
export function uf2Runs(uf2: Uint8Array): { addr: number; data: Uint8Array }[] {
  const view = new DataView(uf2.buffer, uf2.byteOffset, uf2.byteLength);
  const runs: { addr: number; parts: Uint8Array[]; length: number }[] = [];
  if (uf2.length % 512 !== 0) {
    throw new Error("The firmware isn't a UF2");
  }
  for (let at = 0; at < uf2.length; at += 512) {
    const word = (offset: number) => view.getUint32(at + offset, true);
    if (word(0) !== UF2_MAGIC0 || word(4) !== UF2_MAGIC1 || word(508) !== UF2_MAGIC_END) {
      throw new Error("The firmware isn't a UF2");
    }
    if (word(8) & UF2_FLAG_NOT_MAIN_FLASH) {
      continue;
    }
    const addr = word(12);
    const size = word(16);
    if (size > 476) {
      throw new Error("The firmware isn't a UF2");
    }
    const data = uf2.subarray(at + 32, at + 32 + size);
    const last = runs[runs.length - 1];
    if (last && last.addr + last.length === addr) {
      last.parts.push(data);
      last.length += size;
    } else {
      runs.push({ addr, parts: [data], length: size });
    }
  }
  return runs.map(({ addr, parts, length }) => {
    const data = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      data.set(part, offset);
      offset += part.length;
    }
    return { addr, data };
  });
}
