import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proto } from '@/components/SettingsContext/config';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
});

await import('@/i18n/config');
const { initialConfig, useConfigStore } =
  await import('@/components/SettingsContext/SettingsContext');
const { addConsoleFestivalProfile, addPcFestivalRule, festivalPlan, holdButtons, instrumentOf } =
  await import('./festivalSetup');

const pin = (gpio: number): proto.IInput => ({
  gpio: { pin: gpio, pinMode: proto.PinMode.PullUp, analog: false },
});
const fret = (button: proto.GuitarHeroGuitarButtonType, gpio: number): proto.IMapping => ({
  mapping: { ghButton: button },
  input: pin(gpio),
});
const GH = proto.GuitarHeroGuitarButtonType;
const AUTO: proto.IProfileAssignmentInfo = {
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true, ps4OrPs5Mode: false },
};

const guitar = (rule: proto.IProfileAssignmentInfo[]): proto.IProfile => ({
  opts: {
    uid: 1,
    name: 'Guitar',
    faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
    deviceToEmulate: proto.SubType.GuitarHeroGuitar,
  },
  assignments: [{ assignments: rule }],
  mappings: [
    fret(GH.GuitarHeroGuitar_Green, 2),
    fret(GH.GuitarHeroGuitar_Orange, 6),
    // Tap frets aren't offered as the button to hold
    fret(GH.GuitarHeroGuitar_TapGreen, 2),
  ],
  leds: [],
});

const profiles = () => useConfigStore.getState().config.profiles ?? [];

describe('Fortnite Festival setup', () => {
  beforeEach(() => {
    useConfigStore.setState({
      ...initialConfig,
      config: proto.Config.create({ profiles: [guitar([AUTO, { localInputs: {} }])] }),
      currentProfile: 0,
      // nothing to save to
      saveConfig: () => Promise.resolve(false),
    });
  });

  afterEach(() => {
    useConfigStore.setState({ ...initialConfig });
  });

  it('offers the frets as buttons to hold', () => {
    expect(holdButtons(profiles()[0]).map((button) => button.name)).toEqual([
      'GuitarHeroGuitar_Green',
      'GuitarHeroGuitar_Orange',
    ]);
  });

  it('puts an Xbox One rule first in the guitar profile for PC', () => {
    addPcFestivalRule(0, pin(5));
    addPcFestivalRule(0, pin(6));
    const lists = profiles()[0].assignments!;
    // Running it again replaces the rule rather than adding another
    expect(lists).toHaveLength(2);
    expect(lists[0].assignments).toEqual([
      { ...AUTO, consoleType: { ...AUTO.consoleType, forcedType: proto.ConsoleMode.ModeXboxOne } },
      { localInputs: {} },
      { input: { input: pin(6) } },
    ]);
    expect(lists[1].assignments).toEqual([AUTO, { localInputs: {} }]);
  });

  it('adds a keyboard profile above the guitar for consoles, once', () => {
    addConsoleFestivalProfile(0, 'festival_pro_guitar', pin(6));
    // The guitar is now second, and the one being edited, which is what the setup guide passes
    addConsoleFestivalProfile(
      useConfigStore.getState().currentProfile,
      'festival_pro_guitar',
      pin(2)
    );
    const [festival, guitarProfile] = profiles();
    expect(profiles()).toHaveLength(2);
    expect(guitarProfile.opts?.name).toBe('Guitar');
    expect(festival.opts?.deviceToEmulate).toBe(proto.SubType.KeyboardMouse);
    // Same claim as the guitar, so the two take turns, and the button held at startup
    expect(festival.assignments).toEqual([
      { assignments: [AUTO, { localInputs: {} }, { input: { input: pin(2) } }] },
    ]);
    // Pro Lead puts the frets on 1-5, read from the guitar's own pins
    expect(festival.mappings?.map((mapping) => mapping.input)).toEqual([pin(2), pin(6)]);
    expect(festival.mappings?.every((mapping) => mapping.mapping?.keycode != null)).toBe(true);
    // The guitar profile is still the one being edited
    expect(useConfigStore.getState().currentProfile).toBe(1);
  });

  it('only sets Festival up from a guitar or drums', () => {
    const pad: proto.IProfile = {
      ...guitar([AUTO, { usbType: proto.SubType.Gamepad }]),
      opts: {
        uid: 2,
        name: 'USB Controller',
        faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
        deviceToEmulate: proto.SubType.Gamepad,
      },
      mappings: [
        {
          mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
          input: {
            usbButton: {
              deviceid: 1,
              button: { gamepadButton: proto.GamepadButtonType.Gamepad_A },
            },
          },
        },
      ],
    };
    useConfigStore.setState({ config: proto.Config.create({ profiles: [pad, profiles()[0]] }) });
    expect(instrumentOf(profiles()[0])).toBeUndefined();
    expect(instrumentOf(profiles()[1])).toBe('guitar');
    // Nothing on a gamepad has a Festival key, so nothing is added
    expect(addConsoleFestivalProfile(0, 'festival_pro_guitar', pin(6))).toBe(false);
    expect(profiles()).toHaveLength(2);
  });

  it('keeps an adapter controller in the Festival rule', () => {
    const wii: proto.IProfileAssignmentInfo = { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar };
    useConfigStore.setState({ config: proto.Config.create({ profiles: [guitar([AUTO, wii])] }) });
    addConsoleFestivalProfile(0, 'festival_guitar', pin(6));
    expect(profiles()[0].assignments?.[0].assignments).toEqual([
      AUTO,
      wii,
      { input: { input: pin(6) } },
    ]);
  });

  describe('drums', () => {
    const analog = (gpio: number): proto.IInput => ({
      gpio: { pin: gpio, pinMode: proto.PinMode.Floating, analog: true },
    });
    const GHD = proto.GuitarHeroDrumsAxisType;
    const kit: proto.IProfile = {
      opts: {
        uid: 1,
        name: 'Drums',
        faceButtonMappingMode: proto.FaceButtonMappingMode.LegendBased,
        deviceToEmulate: proto.SubType.GuitarHeroDrums,
      },
      assignments: [{ assignments: [AUTO, { localInputs: {} }] }],
      mappings: [
        { mapping: { ghDrumAxis: GHD.GuitarHeroDrums_RedPad }, input: analog(26) },
        { mapping: { ghDrumAxis: GHD.GuitarHeroDrums_KickPedal }, input: analog(27) },
        { mapping: { gamepadButton: proto.GamepadButtonType.Gamepad_Back }, input: pin(8) },
      ],
      leds: [],
    };

    beforeEach(() => {
      useConfigStore.setState({ config: proto.Config.create({ profiles: [kit] }) });
    });

    it('offers Select to hold, as pads only send a hit', () => {
      expect(holdButtons(profiles()[0]).map((button) => [button.name, button.label])).toEqual([
        ['Gamepad_Back', ['outputs.Xbox360.Gamepad_Back', 'outputs.Generic.Gamepad_Back']],
      ]);
    });

    it('converts a Guitar Hero kit for a Festival keyboard profile', () => {
      addConsoleFestivalProfile(0, 'festival_pro_drums', pin(8));
      const [festival] = profiles();
      expect(festival.opts?.deviceToEmulate).toBe(proto.SubType.KeyboardMouse);
      // The pads and the kick become keys, Select has no Festival key
      expect(festival.mappings?.map((mapping) => mapping.input)).toEqual([analog(26), analog(27)]);
      expect(festival.assignments?.[0].assignments).toEqual([
        AUTO,
        { localInputs: {} },
        { input: { input: pin(8) } },
      ]);
    });
  });

  it('gives each guitar a Festival profile of its own', () => {
    const second = {
      ...guitar([AUTO]),
      opts: { ...guitar([AUTO]).opts, uid: 2, name: 'USB Guitar' },
    };
    useConfigStore.setState({
      config: proto.Config.create({ profiles: [guitar([AUTO]), second] }),
    });
    addConsoleFestivalProfile(0, 'festival_guitar', pin(6));
    // The first guitar is now second, below its Festival profile
    addConsoleFestivalProfile(2, 'festival_guitar', pin(6));
    expect(profiles().map((p) => p.opts?.name)).toEqual([
      'Guitar (Festival)',
      'Guitar',
      'USB Guitar (Festival)',
      'USB Guitar',
    ]);
  });

  it('defaults to different buttons for consoles and PC', () => {
    const plan = festivalPlan(profiles()[0], { games: ['console', 'pc'] });
    expect([plan.consoleChoice, plan.pcChoice]).toEqual([
      'GuitarHeroGuitar_Orange',
      'GuitarHeroGuitar_Green',
    ]);
    expect(plan.clash).toBe(false);
    expect(
      festivalPlan(profiles()[0], { games: ['console', 'pc'], pcButton: 'GuitarHeroGuitar_Orange' })
        .clash
    ).toBe(true);
  });
});
