import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proto } from '@/components/SettingsContext/config';

import '@/i18n/config';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
});

const { initialConfig, useConfigStore } =
  await import('@/components/SettingsContext/SettingsContext');
const { GUITAR_TARGETS, getTargetPin, setTargetPin } = await import('./guitar/guitarMappingUtils');
const { applyBasePinout, isBasePinoutApplied } = await import('./turntable/turntableSetup');
const { configureDrumMux, countMappedPads } = await import('./drums/drumSetup');
const { labelPin, pinName, setPinName, wiredGpio } = await import('./wiredInputs');

const profile = (deviceToEmulate: proto.SubType): proto.IProfile => ({
  opts: {
    uid: 1,
    name: 'Profile',
    faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    deviceToEmulate,
  },
  assignments: [],
  mappings: [],
  leds: [],
});

function setUp(deviceToEmulate: proto.SubType) {
  const profiles = [profile(deviceToEmulate)];
  useConfigStore.setState({
    ...initialConfig,
    config: proto.Config.create({ profiles }),
    deviceStatus: {},
    guiDevices: {},
    mappingStatus: profiles.map(() => ({})),
    currentProfile: 0,
    saveConfig: () => Promise.resolve(false),
  });
}

const devices = () => Object.values(useConfigStore.getState().deviceStatus);
const singleInputs = () => devices().filter((d) => d.device.singleInput);
const mappings = () => useConfigStore.getState().config.profiles![0].mappings ?? [];

describe('guides wire pins through single input devices', () => {
  afterEach(() => {
    useConfigStore.setState({ ...initialConfig });
  });

  describe('guitar', () => {
    beforeEach(() => setUp(proto.SubType.GuitarHeroGuitar));

    it('puts a target on a single input device for its pin, synced', () => {
      setTargetPin(GUITAR_TARGETS.WHAMMY, 27, true);
      expect(singleInputs()).toHaveLength(1);
      const [device] = singleInputs();
      expect(device.device.syncCalibration).toBe(true);
      expect(device.device.singleInput!.input!.gpio).toMatchObject({ pin: 27, analog: true });
      expect(mappings()[0].input).toEqual({ singleInput: { deviceid: device.device.deviceid } });
      expect(getTargetPin(useConfigStore.getState(), GUITAR_TARGETS.WHAMMY)).toBe(27);
    });

    it('moves the device when the target is rewired, instead of adding another', () => {
      setTargetPin(GUITAR_TARGETS.WHAMMY, 27, true);
      setTargetPin(GUITAR_TARGETS.WHAMMY, 28, true);
      expect(singleInputs()).toHaveLength(1);
      expect(getTargetPin(useConfigStore.getState(), GUITAR_TARGETS.WHAMMY)).toBe(28);
    });

    it('shares a device between targets on the same pin, and drops ones left unused', () => {
      setTargetPin(GUITAR_TARGETS.FRET_GREEN, 2);
      setTargetPin(GUITAR_TARGETS.FRET_RED, 3);
      expect(singleInputs()).toHaveLength(2);
      // red moves onto green's pin, so its own device is left unused
      setTargetPin(GUITAR_TARGETS.FRET_RED, 2);
      expect(singleInputs()).toHaveLength(1);
      const [green, red] = mappings();
      expect(red.input).toEqual(green.input);
    });

    it('leaves an unpicked pin off devices', () => {
      setTargetPin(GUITAR_TARGETS.FRET_GREEN, -1);
      expect(singleInputs()).toHaveLength(0);
      expect(mappings()[0].input?.gpio?.pin).toBe(-1);
    });
  });

  describe('turntable', () => {
    beforeEach(() => setUp(proto.SubType.DjHeroTurntable));

    it('puts every base pin on a device, and reuses them when run again', () => {
      applyBasePinout();
      const count = singleInputs().length;
      expect(count).toBeGreaterThan(0);
      expect(mappings().every((m) => m.input?.singleInput)).toBe(true);
      expect(isBasePinoutApplied(useConfigStore.getState())).toBe(true);
      applyBasePinout();
      expect(singleInputs()).toHaveLength(count);
      expect(mappings()).toHaveLength(count);
    });

    it('can still see the pins through the devices', () => {
      applyBasePinout();
      const state = useConfigStore.getState();
      expect(mappings().every((m) => (wiredGpio(state, m.input)?.pin ?? -1) >= 0)).toBe(true);
    });
  });

  describe('drums', () => {
    beforeEach(() => setUp(proto.SubType.GuitarHeroDrums));

    it('puts the pads on a drum kit and maps the profile from it', () => {
      configureDrumMux('gh', '74hc4051');
      const kits = devices().filter((d) => d.device.drumKit);
      expect(kits).toHaveLength(1);
      expect(kits[0].device.drumKit!.pads).toHaveLength(6);
      expect(kits[0].device.syncCalibration).toBe(true);
      expect(mappings()).toHaveLength(6);
      expect(mappings().every((m) => m.input?.drumKit)).toBe(true);
      // a hit has to pass min, as triggers ignore their deadzone
      expect(mappings().find((m) => m.mapping?.ghDrumAxis != null)?.min).toBe(4000);
      expect(countMappedPads(useConfigStore.getState(), 'gh')).toBe(6);
    });

    it('reuses the kit when run again', () => {
      configureDrumMux('gh', '74hc4051');
      configureDrumMux('gh', '74hc4067');
      expect(devices().filter((d) => d.device.drumKit)).toHaveLength(1);
      expect(mappings()).toHaveLength(6);
    });
  });

  describe('pin labels', () => {
    const pinLabels = () =>
      Object.values(useConfigStore.getState().guiDevices).flatMap((l) =>
        l.label ? [l.label] : []
      );
    const labelOn = (pin: number) => pinLabels().find((l) => l.pin === pin)?.label;

    beforeEach(() => setUp(proto.SubType.GuitarHeroGuitar));

    it('names the pins guides wire after what they play', () => {
      setTargetPin(GUITAR_TARGETS.WHAMMY, 27, true);
      expect(labelOn(27)).toBe('Whammy');
      setTargetPin(GUITAR_TARGETS.STRUM_UP, 7);
      expect(labelOn(7)).toMatch(/^Strum Up/);
    });

    it('leaves a pin the user already named alone', () => {
      useConfigStore.getState().addPinLabel(27, 'My whammy');
      setTargetPin(GUITAR_TARGETS.WHAMMY, 27, true);
      expect(
        pinLabels()
          .filter((l) => l.pin === 27)
          .map((l) => l.label)
      ).toEqual(['My whammy']);
    });

    it('takes the name along when a target is rewired', () => {
      useConfigStore.getState().addPinLabel(27, 'My whammy');
      setTargetPin(GUITAR_TARGETS.WHAMMY, 27, true);
      setTargetPin(GUITAR_TARGETS.WHAMMY, 28, true);
      expect(labelOn(27)).toBeUndefined();
      expect(labelOn(28)).toBe('My whammy');
    });

    it('labels the turntable base once, however often it runs', () => {
      setUp(proto.SubType.DjHeroTurntable);
      applyBasePinout();
      applyBasePinout();
      expect(labelOn(26)).toBe('Crossfader');
      expect(pinLabels().filter((l) => l.pin === 26)).toHaveLength(1);
    });
  });

  describe('naming a pin from its single input', () => {
    beforeEach(() => setUp(proto.SubType.GuitarHeroGuitar));
    const labelCount = () =>
      Object.values(useConfigStore.getState().guiDevices).filter((l) => l.label?.pin === 27).length;

    it('adds a label for every profile, then edits that same one', () => {
      setPinName(27, 'Whammy');
      expect(pinName(useConfigStore.getState(), 27)).toBe('Whammy');
      setPinName(27, 'Whammy bar');
      expect(pinName(useConfigStore.getState(), 27)).toBe('Whammy bar');
      expect(labelCount()).toBe(1);
      const label = Object.values(useConfigStore.getState().guiDevices)[0];
      expect(label.profiles).toEqual([]);
    });

    it('removes the label when the name is cleared', () => {
      setPinName(27, 'Whammy');
      setPinName(27, '');
      expect(labelCount()).toBe(0);
      expect(pinName(useConfigStore.getState(), 27)).toBe('');
    });

    it('ignores an unpicked pin', () => {
      setPinName(-1, 'Whammy');
      expect(Object.keys(useConfigStore.getState().guiDevices)).toHaveLength(0);
    });

    it('moves the name with the input when its pin changes', () => {
      setTargetPin(GUITAR_TARGETS.WHAMMY, 27, true);
      setPinName(27, 'My whammy');
      const [device] = singleInputs();
      useConfigStore
        .getState()
        .updateDevice(
          {
            deviceid: device.device.deviceid,
            singleInput: {
              input: { gpio: { pin: 28, analog: true, pinMode: proto.PinMode.Floating } },
            },
          },
          device.id
        );
      labelPin(28, 'My whammy', 27);
      expect(pinName(useConfigStore.getState(), 27)).toBe('');
      expect(pinName(useConfigStore.getState(), 28)).toBe('My whammy');
    });
  });
});
