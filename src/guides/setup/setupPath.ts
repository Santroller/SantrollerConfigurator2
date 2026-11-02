import { create } from 'zustand';

// A new build, or a controller moving over from Santroller 1. The setup guide's steps depend on it.
export type SetupPath = 'fresh' | 'santroller1';

// What a fresh controller is being built as: a build guide's id, whose steps then run inside the
// setup guide, or 'other' for the generic devices and profile steps
export type SetupBuild = string;

export const OTHER_BUILD = 'other';

// How controllers connect to a build: over USB, MIDI, Bluetooth or through an adapter
export type PlugIn = 'usb' | 'midi' | 'wii' | 'ps2' | 'bluetooth' | 'xbox360rf';

// Build guides that make a whole controller, and can run as part of the setup guide.
// wired: the controller only uses the board's own pins, so its profile claims them, letting a
//   second such profile (Bluetooth, a keyboard layout) take turns with it
// recipes: the assignment setups that fit it, shown before the rest
// instrument: a guitar or drums, so its guide asks which games it's for and sets up Fortnite Festival
// plugIn: controllers plug into it, over USB, MIDI or an adapter, so its guide asks which ones and
//   makes a profile for each
export const BUILDS: Record<
  string,
  {
    wired: boolean;
    recipes: string[];
    instrument?: 'guitar' | 'drums';
    plugIn?: PlugIn;
  }
> = {
  'direct-pico-guitar': {
    wired: true,
    recipes: ['usb', 'wiredWireless', 'festivalWired'],
    instrument: 'guitar',
  },
  'wii-adapter': {
    wired: false,
    recipes: ['adapter', 'festivalAdapter'],
    instrument: 'guitar',
    plugIn: 'wii',
  },
  'ps2-adapter': {
    wired: false,
    recipes: ['adapter', 'festivalAdapter'],
    instrument: 'guitar',
    plugIn: 'ps2',
  },
  'usb-host': { wired: false, recipes: ['twoPlayers'], plugIn: 'usb' },
  'bt-receiver': { wired: false, recipes: [], plugIn: 'bluetooth' },
  'xbox360-rf': { wired: false, recipes: [], plugIn: 'xbox360rf' },
  'drum-kit': { wired: true, recipes: ['usb', 'wiredWireless'], instrument: 'drums' },
  'wt-drums': { wired: true, recipes: ['usb', 'wiredWireless'], instrument: 'drums' },
  'bh-drums': { wired: false, recipes: [], instrument: 'drums' },
  'midi-din': { wired: false, recipes: [], instrument: 'drums', plugIn: 'midi' },
  'dj-turntable': { wired: true, recipes: ['usb', 'wiredWireless'] },
};

export const MAIN_BUILDS = Object.keys(BUILDS);

// Guides for parts that go on top of a build, which can be picked alongside it so their steps run as
// part of the setup guide too
export const EXTRAS = ['wireless', 'xbox-auth', 'rgb-leds', 'console-output'];

// Bluetooth output isn't offered on a Bluetooth receiver, as its radio is already busy with the
// controllers
export function extrasFor(build: SetupBuild | null) {
  return EXTRAS.filter((extra) => !(extra === 'wireless' && build === 'bt-receiver'));
}

const PATH_STORAGE_KEY = 'santroller.guides.setup.path';
const BUILD_STORAGE_KEY = 'santroller.guides.setup.build';
const EXTRAS_STORAGE_KEY = 'santroller.guides.setup.extras';

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

function loadExtras(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(EXTRAS_STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((extra) => EXTRAS.includes(extra)) : [];
  } catch {
    return [];
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
  extras: string[];
  setExtras: (extras: string[]) => void;
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
  extras: loadExtras(),
  setExtras: (extras) => {
    store(EXTRAS_STORAGE_KEY, JSON.stringify(extras));
    set({ extras });
  },
}));
