import i18next from 'i18next';
import { create } from 'zustand';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import {
  SANTROLLER_FILTER,
  WebUsbConfigDevice,
} from '@/components/SettingsContext/WebUsbConfigDevice';
import { useSetupPath } from '@/guides/setup/setupPath';
import { getMigrateBackend, MigrateBackend } from './backend';
import {
  Chip,
  chipForBoard,
  fetchFirmware,
  MigrateScan,
  parseSavedPresets,
  SANTROLLER_PID,
  Santroller1Device,
  santroller1FileName,
} from './santroller1';

// Getting a Pico onto Santroller 2, either one waiting in its bootloader or one still running
// Santroller 1. Santroller 1's config is read off it before anything is flashed, as flashing
// replaces it.

// A config from Santroller 1 that can be brought over, as a profile
export interface MigrateSource {
  name: string;
  data: Uint8Array;
  // The config on the controller itself, rather than a preset saved in Santroller 1
  fromDevice: boolean;
  selected: boolean;
}

// The config read off the controller, kept until it's safely on the new firmware
export interface MigrateBackup {
  name: string;
  data: Uint8Array;
  // Where the desktop app copied it
  path?: string;
}

export type MigrateFlow =
  | { step: 'idle' }
  // Picking what to bring over from Santroller 1
  | {
      step: 'choose';
      device: Santroller1Device;
      loading: boolean;
      sources: MigrateSource[];
      // Why the controller's own config couldn't be read
      deviceError?: string;
      presetsError?: string;
    }
  | { step: 'bootloader' }
  // The website needs to be allowed to use the Pico now that it's in its bootloader
  | { step: 'pickBootsel'; chip: Chip }
  | { step: 'flashing'; chip: Chip; progress?: number }
  // The desktop app couldn't flash it, so the drive has to be mounted, and it's copied there after
  | { step: 'needsMount'; chip: Chip; error: string }
  // The website couldn't flash it, so the firmware has to be copied to the drive by hand
  | { step: 'manual'; chip: Chip; error: string }
  // Waiting for the controller to start up. On the website it has to be picked to connect to it.
  | { step: 'connecting'; showConnect: boolean }
  // Over WebUSB, waiting for the controller to be picked again before the config is sent to it
  | { step: 'reconnect' }
  // Sending the config brought over from Santroller 1, which reloads the controller
  | { step: 'importing' }
  | { step: 'failed'; error: string }
  // Moved over with its profiles, so there's nothing left to set up
  | { step: 'done'; imported: number };

const BOOTLOADER_TIMEOUT_MS = 15000;
// After this long the controller can be connected to by hand
const CONNECT_PROMPT_MS = 20000;
const POLL_MS = 500;
const MOUNT_RETRY_MS = 1000;
// The store gives up on a reload after 10 seconds, so this only covers it being slow to say so
const IMPORT_RELOAD_TIMEOUT_MS = 15000;
// How long a freshly flashed controller gets to start up before it's asked to be picked over WebUSB. The
// site can't watch for it, as Android only lets it see a device again once it's been picked
const WEBUSB_STARTUP_MS = 4000;
// A device takes a moment to be ready after it appears, so look again a few times
const RESCAN_DELAYS_MS = [300, 1000, 2500];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MigrateState {
  backend: MigrateBackend | null;
  scan: MigrateScan | null;
  flow: MigrateFlow;
  backup?: MigrateBackup;
  watch: () => void;
  rescan: () => Promise<void>;
  // Shows the browser's chooser for a Pico (website only)
  request: (chip?: Chip) => Promise<void>;
  chooseSantroller1: (device: Santroller1Device) => Promise<void>;
  addPresetsFile: (file: File | null) => Promise<void>;
  toggleSource: (index: number) => void;
  installSantroller1: (onDone: () => void) => Promise<void>;
  installBootsel: (chip: Chip, onDone: () => void) => Promise<void>;
  // Connects to the newly flashed controller by hand (needs a click on the website)
  connectByHand: () => Promise<void>;
  // Picks the controller again before its config is sent (WebUSB, needs a click)
  reconnectForImport: () => Promise<void>;
  cancel: () => void;
}

let watching = false;
let rescanTimers: number[] = [];
// Bumped by cancel, so a flow that's waiting on something stops when it's done waiting
let runId = 0;
// Set once the controller has been picked again for the import
let reconnectedForImport = false;

async function waitFor<T>(
  check: () => Promise<T | undefined>,
  timeoutMs: number,
  run: number
): Promise<T | undefined> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end && run === runId) {
    const found = await check().catch(() => undefined);
    if (found !== undefined) {
      return found;
    }
    await sleep(POLL_MS);
  }
  return undefined;
}

async function santrollerDevices() {
  return navigator.hid
    ? (await navigator.hid.getDevices()).filter((device) => device.productId === SANTROLLER_PID)
    : [];
}

export const useMigrate = create<MigrateState>((set, get) => {
  const setFlow = (flow: MigrateFlow) => set({ flow });
  const backend = () => {
    const found = get().backend;
    if (!found) {
      throw new Error('unsupported');
    }
    return found;
  };

  // Waits for the Pico to show up in its bootloader. False if cancelled.
  async function waitForBootsel(chip: Chip, run: number) {
    const inBootloader = async () =>
      (await backend().scan()).bootsel.some((found) => found.chip === chip) || undefined;
    if (backend().seesEverything) {
      if (!(await waitFor(inBootloader, BOOTLOADER_TIMEOUT_MS, run))) {
        if (run === runId) {
          throw new Error('bootloaderTimeout');
        }
        return false;
      }
      return run === runId;
    }
    // It may have been allowed before. If not, it has to be picked, which needs a click.
    if (!(await waitFor(inBootloader, 2000, run))) {
      if (run !== runId) {
        return false;
      }
      setFlow({ step: 'pickBootsel', chip });
      await waitFor(inBootloader, Infinity, run);
    }
    return run === runId;
  }

  // Flashes, waiting for the drive to be mounted if that's what it takes. False if cancelled.
  async function flash(chip: Chip, run: number) {
    setFlow({ step: 'flashing', chip });
    const uf2 = await fetchFirmware(chip);
    const onProgress = (progress: number) => {
      if (run === runId) {
        setFlow({ step: 'flashing', chip, progress });
      }
    };
    let result = await backend().flash(chip, uf2, false, onProgress);
    if (result.result === 'manual') {
      if (run === runId) {
        setFlow({ step: 'manual', chip, error: result.error });
      }
      return run === runId;
    }
    // Only the first attempt tries PICOBOOT, so keep why it didn't work
    const picobootError = result.result === 'needsMount' ? result.error : '';
    while (result.result === 'needsMount') {
      if (run !== runId) {
        return false;
      }
      setFlow({ step: 'needsMount', chip, error: picobootError });
      await sleep(MOUNT_RETRY_MS);
      if (run !== runId) {
        return false;
      }
      // Once the drive turns up and copying starts, this shows the progress instead
      result = await backend().flash(chip, uf2, true, onProgress);
    }
    return run === runId;
  }

  // Waits for the newly flashed controller (one that wasn't there before) and connects to it.
  // The website only sees it once it's been picked, so it asks for that straight away, and the
  // desktop app offers it too if the controller takes too long to turn up.
  async function connect(before: HIDDevice[], run: number) {
    const config = useConfigStore.getState;
    const isNew = (device: HIDDevice | undefined) =>
      !!device && device.productId === SANTROLLER_PID && !before.includes(device);
    const seesEverything = backend().seesEverything;
    if (get().flow.step !== 'manual') {
      setFlow({ step: 'connecting', showConnect: !seesEverything });
    }
    const started = Date.now();
    const connected = await waitFor(
      async () => {
        const state = config();
        if (state.connected && isNew(state.hidDevice ?? undefined)) {
          return true;
        }
        const device = (await santrollerDevices()).find(isNew);
        if (device) {
          await state.connectDevice(device);
          return config().connected || undefined;
        }
        const flow = get().flow;
        if (
          flow.step === 'connecting' &&
          !flow.showConnect &&
          Date.now() - started > CONNECT_PROMPT_MS
        ) {
          setFlow({ step: 'connecting', showConnect: true });
        }
        return undefined;
      },
      Infinity,
      run
    );
    return !!connected && run === runId;
  }

  // Shows the controller starting up, without a way to connect, for long enough that it's there to be
  // picked. False if cancelled.
  async function waitForWebUsbStartup(run: number) {
    setFlow({ step: 'connecting', showConnect: false });
    await sleep(WEBUSB_STARTUP_MS);
    return run === runId;
  }

  // Over WebUSB a controller that re-enumerates has to be picked again before it can be used, and a freshly
  // flashed one can do that just after it's been connected to. Have it picked again right before the config
  // is written, so the write goes to a connection that's really there. False if cancelled.
  async function reconnectBeforeImport(run: number) {
    reconnectedForImport = false;
    setFlow({ step: 'reconnect' });
    const ready = await waitFor(
      async () => {
        const state = useConfigStore.getState();
        return (reconnectedForImport && !!state.hidDevice && !state.waitingForReload) || undefined;
      },
      Infinity,
      run
    );
    return !!ready && run === runId;
  }

  function fail(e: unknown) {
    console.error(e);
    setFlow({ step: 'failed', error: e instanceof Error ? e.message : String(e) });
  }

  // A controller that came with its profiles is ready to use, so it stays where it is. One that
  // starts out empty goes to the setup guide.
  function finish(path: 'fresh' | 'santroller1', imported: number, onDone: () => void) {
    const setup = useSetupPath.getState();
    setup.setPath(path);
    setup.setFlashedHere(true);
    set({ backup: undefined });
    if (imported) {
      setFlow({ step: 'done', imported });
      return;
    }
    setFlow({ step: 'idle' });
    onDone();
  }

  return {
    backend: null,
    scan: null,
    flow: { step: 'idle' },
    watch: () => {
      if (watching) {
        return;
      }
      watching = true;
      void getMigrateBackend().then((found) => {
        set({ backend: found });
        if (!found) {
          return;
        }
        found.watch(() => {
          rescanTimers.forEach((timer) => window.clearTimeout(timer));
          rescanTimers = RESCAN_DELAYS_MS.map((delay) =>
            window.setTimeout(() => void get().rescan(), delay)
          );
        });
        void get().rescan();
      });
    },
    rescan: async () => {
      try {
        set({ scan: (await get().backend?.scan()) ?? null });
      } catch (e) {
        console.error('Failed to look for Picos', e);
      }
    },
    request: async (chip) => {
      if (await get().backend?.request(chip)) {
        await get().rescan();
      }
    },
    chooseSantroller1: async (device) => {
      setFlow({ step: 'choose', device, loading: true, sources: [] });
      const sources: MigrateSource[] = [];
      let deviceError: string | undefined;
      let presetsError: string | undefined;
      try {
        sources.push({
          name: i18next.t('migrate.deviceConfigName'),
          data: await backend().readSantroller1Config(device.serial),
          fromDevice: true,
          selected: true,
        });
      } catch (e) {
        deviceError = String(e);
      }
      try {
        const file = await backend().readSavedPresets();
        for (const preset of file ? parseSavedPresets(file) : []) {
          sources.push({ ...preset, fromDevice: false, selected: false });
        }
      } catch (e) {
        presetsError = String(e);
      }
      const flow = get().flow;
      if (flow.step === 'choose' && flow.device === device) {
        setFlow({ ...flow, loading: false, sources, deviceError, presetsError });
      }
    },
    addPresetsFile: async (file) => {
      const flow = get().flow;
      if (!file || flow.step !== 'choose') {
        return;
      }
      try {
        const presets = parseSavedPresets(new Uint8Array(await file.arrayBuffer()));
        const current = get().flow;
        if (current.step !== 'choose') {
          return;
        }
        setFlow({
          ...current,
          presetsError: presets.length ? undefined : i18next.t('migrate.choose.noPresets'),
          sources: [
            // Picking the file again replaces what it added
            ...current.sources.filter((source) => source.fromDevice),
            ...presets.map((preset) => ({ ...preset, fromDevice: false, selected: true })),
          ],
        });
      } catch (e) {
        setFlow({ ...flow, presetsError: String(e) });
      }
    },
    toggleSource: (index) => {
      const flow = get().flow;
      if (flow.step !== 'choose') {
        return;
      }
      setFlow({
        ...flow,
        sources: flow.sources.map((source, i) =>
          i === index ? { ...source, selected: !source.selected } : source
        ),
      });
    },
    installSantroller1: async (onDone) => {
      const flow = get().flow;
      const chip = flow.step === 'choose' ? chipForBoard(flow.device.board) : undefined;
      if (flow.step !== 'choose' || !chip) {
        return;
      }
      const { device } = flow;
      const selected = flow.sources.filter((source) => source.selected);
      const run = ++runId;
      set({ backup: undefined });
      try {
        // Flashing replaces it, so keep a copy that can be imported by hand if anything goes wrong
        const own = flow.sources.find((source) => source.fromDevice);
        if (own) {
          const name = santroller1FileName(`santroller1-${device.serial}`, device.board);
          const path = await backend()
            .backup(own.data, name)
            .catch((e) => {
              console.error('Failed to back up the config', e);
              return undefined;
            });
          set({ backup: { name, data: own.data, path } });
        }
        const before = await santrollerDevices();
        setFlow({ step: 'bootloader' });
        await backend().santroller1Bootloader(device.serial);
        if (!backend().canFlash(chip)) {
          // There's nothing to wait for, as it can't be used in its bootloader anyway
          setFlow({ step: 'manual', chip, error: '' });
        } else if (!(await waitForBootsel(chip, run)) || !(await flash(chip, run))) {
          return;
        }
        // Over WebUSB, picking it before the import connects to it as well, so that's the only pick asked
        // for. It still gets the time to start up first, so the chooser isn't empty. Not when it was copied
        // over by hand, as those instructions stay up until it starts
        const pickForImport =
          WebUsbConfigDevice.isSupported() && selected.length > 0 && get().flow.step !== 'manual';
        if (pickForImport) {
          if (!(await waitForWebUsbStartup(run))) {
            return;
          }
        } else if (!(await connect(before, run))) {
          return;
        }
        if (selected.length) {
          if (WebUsbConfigDevice.isSupported() && !(await reconnectBeforeImport(run))) {
            return;
          }
          setFlow({ step: 'importing' });
          await useConfigStore
            .getState()
            .importLegacyConfig(
              selected.map(
                (source) =>
                  new File(
                    [source.data as BlobPart],
                    santroller1FileName(source.name, device.board)
                  )
              )
            );
          // Applying it reloads the controller, so let it come back before the guide carries on. Over
          // WebUSB it only comes back once it's picked again, so that waits on the user instead
          const reloaded = await waitFor(
            async () => {
              const state = useConfigStore.getState();
              return (state.hidDevice && !state.waitingForReload) || state.reloadLost || undefined;
            },
            WebUsbConfigDevice.isSupported() ? Infinity : IMPORT_RELOAD_TIMEOUT_MS,
            run
          );
          if (run !== runId) {
            return;
          }
          if (!reloaded) {
            console.warn("The controller didn't come back after the import");
          }
        }
        finish('santroller1', selected.length, onDone);
      } catch (e) {
        fail(e);
      }
    },
    installBootsel: async (chip, onDone) => {
      const run = ++runId;
      set({ backup: undefined });
      try {
        const before = await santrollerDevices();
        if (!(await flash(chip, run)) || !(await connect(before, run))) {
          return;
        }
        finish('fresh', 0, onDone);
      } catch (e) {
        fail(e);
      }
    },
    connectByHand: async () => {
      await useConfigStore.getState().connect();
    },
    reconnectForImport: async () => {
      let usbDevice: USBDevice;
      try {
        usbDevice = await navigator.usb.requestDevice({ filters: [SANTROLLER_FILTER] });
      } catch {
        // closed without picking anything, the button is still there
        return;
      }
      const config = useConfigStore.getState();
      const current = config.hidDevice as unknown;
      // Still the connection made after flashing, so there's nothing to redo
      const stillOpen =
        current instanceof WebUsbConfigDevice && current.device === usbDevice && usbDevice.opened;
      if (!stillOpen) {
        if (config.waitingForReload) {
          await config.reconnectWebUsb(usbDevice);
        } else {
          if (config.hidDevice) {
            await config.disconnect();
          }
          await useConfigStore.getState().connectWebUsb(usbDevice);
        }
      }
      if (useConfigStore.getState().hidDevice) {
        reconnectedForImport = true;
      }
    },
    cancel: () => {
      runId++;
      const { flow, backup } = get();
      // Past this point Santroller 1 may already be gone, so don't lose what was read off it
      const started = !['idle', 'choose', 'failed', 'done'].includes(flow.step);
      setFlow(started && backup ? { step: 'failed', error: 'cancelled' } : { step: 'idle' });
    },
  };
});
