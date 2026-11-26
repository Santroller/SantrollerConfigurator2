import { Chip, FlashResult, MigrateScan } from './santroller1';

// How the configurator reaches Picos: the desktop app sees every USB device itself, the website
// goes through WebUSB, which only sees the devices the user picked in the browser's chooser.
export interface MigrateBackend {
  // Every Pico shows up without asking. On the website each needs picking in a chooser first,
  // which only works from a click.
  readonly seesEverything: boolean;
  // Santroller 1's saved presets are found automatically, rather than the user picking config.bin
  readonly readsSavedPresets: boolean;
  // Whether it can flash this chip itself, rather than the firmware being copied over by hand
  canFlash: (chip: Chip) => boolean;
  scan: () => Promise<MigrateScan>;
  // Calls back when a device that may matter comes or goes
  watch: (onChange: () => void) => void;
  // Asks the user to pick a Pico, in its bootloader for a chip or any of them. False if they didn't.
  request: (chip?: Chip) => Promise<boolean>;
  readSantroller1Config: (serial: string) => Promise<Uint8Array>;
  santroller1Bootloader: (serial: string) => Promise<void>;
  // Santroller 1's config.bin, if it could be found
  readSavedPresets: () => Promise<Uint8Array | null>;
  // Keeps a copy of a config read off a controller. Where it went, if anywhere.
  backup: (data: Uint8Array, name: string) => Promise<string | undefined>;
  // driveOnly: only check for the drive, after asking for it to be mounted
  flash: (
    chip: Chip,
    uf2: Uint8Array,
    driveOnly: boolean,
    onProgress?: (fraction: number) => void
  ) => Promise<FlashResult>;
}

export const isDesktop = typeof window !== 'undefined' && 'isTauri' in window;

// Whether Picos can be set up from here at all, without loading anything
export const migrateSupported = () =>
  isDesktop || (typeof navigator !== 'undefined' && 'usb' in navigator);

let backend: Promise<MigrateBackend | null> | undefined;

// Null where neither works (Firefox, Safari), leaving the setup guide's manual steps
export function getMigrateBackend() {
  backend ??= (async () => {
    if (isDesktop) {
      return (await import('./tauriBackend')).tauriBackend;
    }
    if (migrateSupported()) {
      return (await import('./webBackend')).webBackend;
    }
    return null;
  })();
  return backend;
}
