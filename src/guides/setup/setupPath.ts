import { create } from 'zustand';

// A new build, or a controller moving over from Santroller 1. The setup guide's steps depend on it.
export type SetupPath = 'fresh' | 'santroller1';

// What a fresh controller is being built as: a build guide's id, whose steps then run inside the
// setup guide, or 'other' for the generic devices and profile steps
export type SetupBuild = string;

export const OTHER_BUILD = 'other';

// Build guides that make a whole controller, and can run as part of the setup guide.
// wired: the controller only uses the board's own pins, so its profile claims them, letting a
//   second such profile (Bluetooth, a keyboard layout) take turns with it
// recipes: the assignment setups that fit it, shown before the rest
export const BUILDS: Record<string, { wired: boolean; recipes: string[] }> = {
  'direct-pico-guitar': { wired: true, recipes: ['usb', 'wiredWireless', 'festivalWired'] },
  'wii-adapter': { wired: false, recipes: ['adapter', 'festivalAdapter'] },
  'ps2-adapter': { wired: false, recipes: ['adapter', 'festivalAdapter'] },
  'usb-host': { wired: false, recipes: ['twoPlayers'] },
  'drum-kit': { wired: true, recipes: ['usb', 'wiredWireless'] },
  'wt-drums': { wired: true, recipes: ['usb', 'wiredWireless'] },
  'bh-drums': { wired: false, recipes: [] },
  'midi-din': { wired: false, recipes: [] },
  'dj-turntable': { wired: true, recipes: ['usb', 'wiredWireless'] },
};

export const MAIN_BUILDS = Object.keys(BUILDS);

const PATH_STORAGE_KEY = 'santroller.guides.setup.path';
const BUILD_STORAGE_KEY = 'santroller.guides.setup.build';

function loadPath(): SetupPath {
  try {
    return localStorage.getItem(PATH_STORAGE_KEY) === 'santroller1' ? 'santroller1' : 'fresh';
  } catch {
    return 'fresh';
  }
}

function loadBuild(): SetupBuild | null {
  try {
    return localStorage.getItem(BUILD_STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage issues
  }
}

export const useSetupPath = create<{
  path: SetupPath;
  setPath: (path: SetupPath) => void;
  build: SetupBuild | null;
  setBuild: (build: SetupBuild) => void;
}>((set) => ({
  path: loadPath(),
  setPath: (path) => {
    store(PATH_STORAGE_KEY, path);
    set({ path });
  },
  build: loadBuild(),
  setBuild: (build) => {
    store(BUILD_STORAGE_KEY, build);
    set({ build });
  },
}));
