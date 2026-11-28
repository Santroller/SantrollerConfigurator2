import { afterEach, describe, expect, it, vi } from 'vitest';
import { padMapping } from '@/components/Devices/drumKit';
import { isAnalogInput } from '@/components/Inputs/inputRegistry';
import { proto } from './config';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null });
});

const { initialConfig, useConfigStore, DeviceStatus, LedStatus, MappingStatus } =
  await import('./SettingsContext');

const KIT = '3';
const kit = (syncCalibration: boolean): proto.IDevice => ({
  deviceid: Number(KIT),
  syncCalibration,
  drumKit: {
    pads: [
      {
        id: 0,
        type: proto.DrumPadType.DrumPadRed,
        input: { gpio: { pin: 26, analog: true, pinMode: proto.PinMode.Floating } },
      },
    ],
  },
});

const profile = (uid: number, output: proto.IOutput): proto.IProfile => ({
  opts: {
    uid,
    name: `Profile ${uid}`,
    faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    deviceToEmulate: proto.SubType.GuitarHeroDrums,
  },
  assignments: [],
  mappings: [padMapping(output, Number(KIT), 0)],
  leds: [],
});

const ghRed = { ghDrumAxis: proto.GuitarHeroDrumsAxisType.GuitarHeroDrums_RedPad };
const rbRed = { rbDrumAxis: proto.RockBandDrumsAxisType.RockBandDrums_RedPad };

function setUp(syncCalibration: boolean) {
  const profiles = [profile(1, ghRed), profile(2, rbRed)];
  useConfigStore.setState({
    ...initialConfig,
    config: proto.Config.create({ profiles }),
    deviceStatus: { [KIT]: new DeviceStatus(KIT, 'drumKit', kit(syncCalibration)) },
    mappingStatus: profiles.map((p) =>
      Object.fromEntries(p.mappings!.map((m, i) => [i, new MappingStatus(i, m)]))
    ),
    currentProfile: 0,
    saveConfig: () => Promise.resolve(false),
  });
}

function calibrateFirst(min: number, max: number) {
  const state = useConfigStore.getState();
  const edited = { ...state.config.profiles![0].mappings![0], min, max };
  state.updateProfile({ ...state.config.profiles![0], mappings: [edited] }, 0);
}

describe('device calibration sync through the store', () => {
  afterEach(() => {
    useConfigStore.setState({ ...initialConfig });
  });

  it('calibrating a mapping calibrates every other mapping on that input', () => {
    setUp(true);
    calibrateFirst(6000, 50000);
    const after = useConfigStore.getState();
    expect(after.config.profiles![1].mappings![0]).toMatchObject({ min: 6000, max: 50000 });
    expect(after.mappingStatus[1][0].mapping.max).toBe(50000);
  });

  it('leaves each profile its own calibration when the device does not sync', () => {
    setUp(false);
    calibrateFirst(6000, 50000);
    expect(useConfigStore.getState().config.profiles![1].mappings![0].max).toBe(65535);
  });

  it('lines calibrations up when syncing is turned on, and keeps it through editor updates', () => {
    setUp(false);
    calibrateFirst(6000, 50000);
    const store = useConfigStore.getState();
    store.updateDevice({ ...kit(false), syncCalibration: true }, KIT);
    expect(useConfigStore.getState().config.profiles![1].mappings![0].max).toBe(50000);
    // device editors only pass their own settings
    const { syncCalibration: _, ...editorUpdate } = kit(true);
    useConfigStore.getState().updateDevice(editorUpdate, KIT);
    expect(useConfigStore.getState().deviceStatus[KIT].device.syncCalibration).toBe(true);
  });

  it('a device with sync on is still read as its own kind', () => {
    setUp(true);
    const { config } = useConfigStore.getState().buildConfig();
    expect(config.devices?.[0].drumKit).toBeTruthy();
    expect(config.devices?.[0].syncCalibration).toBe(true);
  });
});

describe('single input devices', () => {
  afterEach(() => {
    useConfigStore.setState({ ...initialConfig });
  });

  const PIN = '5';
  const whammy = (min: number): proto.IMapping => ({
    mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
    input: { singleInput: { deviceid: Number(PIN) } },
    min,
    max: 60000,
  });

  function setUpPin(input: proto.IInput) {
    const profiles = [profile(1, ghRed), profile(2, rbRed)].map((p) => ({
      ...p,
      mappings: [whammy(1000)],
    }));
    useConfigStore.setState({
      ...initialConfig,
      config: proto.Config.create({ profiles }),
      deviceStatus: {
        [PIN]: new DeviceStatus(PIN, 'singleInput', {
          deviceid: Number(PIN),
          syncCalibration: true,
          singleInput: { input },
        }),
      },
      mappingStatus: profiles.map((p) =>
        Object.fromEntries(p.mappings.map((m, i) => [i, new MappingStatus(i, m)]))
      ),
      currentProfile: 0,
      saveConfig: () => Promise.resolve(false),
    });
  }

  it('syncs the calibration of a pin across profiles', () => {
    setUpPin({ gpio: { pin: 26, analog: true, pinMode: proto.PinMode.Floating } });
    const state = useConfigStore.getState();
    state.updateProfile({ ...state.config.profiles![0], mappings: [whammy(3000)] }, 0);
    expect(useConfigStore.getState().config.profiles![1].mappings![0].min).toBe(3000);
  });

  it('reads as analog or digital by the pin it holds', () => {
    setUpPin({ gpio: { pin: 26, analog: true, pinMode: proto.PinMode.Floating } });
    expect(isAnalogInput({ singleInput: { deviceid: Number(PIN) } })).toBe(true);
    setUpPin({ gpio: { pin: 3, analog: false, pinMode: proto.PinMode.PullUp } });
    expect(isAnalogInput({ singleInput: { deviceid: Number(PIN) } })).toBe(false);
  });
});

describe('LEDs through the store', () => {
  afterEach(() => {
    useConfigStore.setState({ ...initialConfig });
  });

  it('keeps the live status of an LED in another profile in step', () => {
    const led: proto.ILed = {
      device: { gpio: { pin: 25, analog: true } },
      mapping: {
        inputMapping: { input: { drumKit: { deviceid: Number(KIT), pad: 0 } }, min: 0, max: 1 },
      },
    };
    const profiles = [profile(1, ghRed), { ...profile(2, rbRed), mappings: [], leds: [led] }];
    useConfigStore.setState({
      ...initialConfig,
      config: proto.Config.create({ profiles }),
      deviceStatus: { [KIT]: new DeviceStatus(KIT, 'drumKit', kit(true)) },
      mappingStatus: profiles.map((p) =>
        Object.fromEntries(p.mappings!.map((m, i) => [i, new MappingStatus(i, m)]))
      ),
      ledStatus: profiles.map((p) =>
        Object.fromEntries(p.leds!.map((l, i) => [i, new LedStatus(i, l)]))
      ),
      currentProfile: 0,
      saveConfig: () => Promise.resolve(false),
    });
    calibrateFirst(6000, 50000);
    const after = useConfigStore.getState();
    expect(after.config.profiles![1].leds![0].mapping.inputMapping).toMatchObject({
      min: 6000,
      max: 50000,
    });
    expect(after.ledStatus[1][0].led.mapping.inputMapping!.max).toBe(50000);
  });
});
