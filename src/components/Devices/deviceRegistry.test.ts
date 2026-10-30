import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import en from '@/i18n/en/translation.json';
import {
  canAddDeviceKind,
  createDeviceConfig,
  DEVICE_CATEGORIES,
  deviceKinds,
  getDeviceCategory,
  getDeviceName,
  getDevicePins,
  getDeviceStatusLabel,
  getGroupedDevices,
  isSingletonDeviceKind,
} from './deviceRegistry';

describe('deviceRegistry categories and grouping', () => {
  it('assigns a valid category to every device kind', () => {
    for (const kind of deviceKinds) {
      const category = getDeviceCategory(kind);
      expect(DEVICE_CATEGORIES).toContain(category);
    }
  });

  it('groups and sorts all device kinds alphabetically by label within each group', () => {
    const mockTranslate = (key: string) => {
      // Mock dictionary mapping
      const labels: Record<string, string> = {
        'devices.wii': 'Wii Extension',
        'devices.psx': 'PS1/PS2 Controller',
        'devices.snes': 'NES/SNES Controller',
        'devices.joybus': 'N64 / Gamecube Controller',
        'devices.usbHost': 'USB Host',
        'devices.bt': 'Bluetooth',
        'devices.xbox360Rf': 'Xbox 360 RF Module',
        'devices.xboxOneAuth': 'Xbox One Auth Chip',
        'devices.midiSerial': 'MIDI Serial (DIN)',
        'devices.crazyGuitarNeck': 'Crazy Guitar Neck',
        'devices.gh5Neck': 'Guitar Hero 5 Guitar Neck',
        'devices.crkdNeck': 'CRKD Guitar Neck',
        'devices.protarNeck': 'Rock Band Mustang Pro Guitar Neck',
        'devices.vtechExpander': 'IO Expander from a VTech Guitar',
        'devices.bhDrum': 'Band Hero Drum Body',
        'devices.worldTourDrum': 'World Tour Drum Body',
        'devices.crkdDrum': 'CRKD Drum Body',
        'devices.djhTurntable': 'DJ Hero Turntable Platter',
        'devices.infiniumFader': 'Infinium Fader',
        'devices.peripheral': 'Peripheral',
      };
      return labels[key] ?? key;
    };

    const grouped = getGroupedDevices(deviceKinds, mockTranslate);

    // Verify every group in grouped is in DEVICE_CATEGORIES order
    const categoriesInResult = grouped.map((g) => g.category);
    for (let i = 0; i < categoriesInResult.length - 1; i++) {
      const idxA = DEVICE_CATEGORIES.indexOf(categoriesInResult[i]);
      const idxB = DEVICE_CATEGORIES.indexOf(categoriesInResult[i + 1]);
      expect(idxA).toBeLessThan(idxB);
    }

    // Verify every device kind is present in exactly one group
    const allItems = grouped.flatMap((g) => g.items);
    expect(allItems.sort()).toEqual([...deviceKinds].sort());

    // Verify items in each group are sorted alphabetically
    for (const group of grouped) {
      expect(group.items.length).toBeGreaterThan(0);
      const labels = group.items.map((k) => mockTranslate(`devices.${k}`));
      const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));
      expect(labels).toEqual(sortedLabels);
    }
  });

  it('filters out empty categories when a subset of device kinds is provided', () => {
    const singleKind = ['ws2812'] as const;
    const grouped = getGroupedDevices([...singleKind], (k) => k);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].category).toBe('lighting');
    expect(grouped[0].items).toEqual(['ws2812']);
  });
});

describe('singleton devices', () => {
  it('identifies bt and usbHost as singleton devices', () => {
    expect(isSingletonDeviceKind('bt')).toBe(true);
    expect(isSingletonDeviceKind('usbHost')).toBe(true);
    expect(isSingletonDeviceKind('multiplexer')).toBe(false);
    expect(isSingletonDeviceKind('ws2812')).toBe(false);
  });

  it('prevents adding multiple bluetooth or usbHost devices', () => {
    expect(canAddDeviceKind('bt', [])).toBe(true);
    expect(canAddDeviceKind('bt', ['bt'])).toBe(false);
    expect(canAddDeviceKind('bt', ['usbHost'])).toBe(true);

    expect(canAddDeviceKind('usbHost', [])).toBe(true);
    expect(canAddDeviceKind('usbHost', ['usbHost'])).toBe(false);
    expect(canAddDeviceKind('usbHost', ['bt'])).toBe(true);

    // Non-singleton devices can always be added even if existing
    expect(canAddDeviceKind('ws2812', ['ws2812'])).toBe(true);
    expect(canAddDeviceKind('multiplexer', ['multiplexer'])).toBe(true);
  });
});

describe('device pins', () => {
  // A freshly added device has its pins unset (-1). Those aren't pins, so they mustn't show up as
  // conflicts between unconfigured devices, and a pin derived from one (eg USB host's D-) mustn't
  // turn into GP0
  it('reports no pins for any freshly added device kind', () => {
    for (const kind of deviceKinds) {
      for (const pin of getDevicePins(createDeviceConfig(kind, 0))) {
        expect(pin, kind).toBeGreaterThanOrEqual(0);
      }
    }
    expect(getDevicePins(createDeviceConfig('usbHost', 0))).toEqual([]);
    expect(getDevicePins(createDeviceConfig('encoder', 0))).toEqual([]);
  });

  it('still reports pins derived from a set one', () => {
    const usbHost = createDeviceConfig('usbHost', 0);
    usbHost.usbHost!.firstPin = 10;
    expect(getDevicePins(usbHost)).toEqual([10, 11]);
  });
});

describe('device status labels', () => {
  // No translations loaded, so the English fallbacks are used
  beforeAll(() => i18next.init({ lng: 'en', resources: {} }));
  const status = (device: Omit<proto.IDevice, 'deviceid'>, connected = true) => ({
    id: '1',
    connected,
    device: { deviceid: 0, ...device },
    wiiExtType: proto.WiiExtType.WiiNoExtension,
    ps2CntType: proto.PS2ControllerType.PS2ControllerTypeUnknown,
    snesCntType: proto.SNESControllerType.SNESControllerNone,
    joybusCntType: proto.JoybusControllerType.JoybusControllerNone,
    usbDevices: {},
  });

  it('leaves out the pins of a device that has none', () => {
    expect(getDeviceStatusLabel(status({ bt: {} }))).toBe('Connected');
  });

  it('lists the pins after whether it is connected', () => {
    expect(
      getDeviceStatusLabel(
        status({
          usbHost: {
            firstPin: 2,
            enable5v: false,
            dmFirst: false,
            mappingMode: proto.MappingMode.PerInput,
          },
        })
      )
    ).toBe('Disconnected, GP2, GP3');
  });

  it('shows only the pins of devices without a connection state', () => {
    expect(
      getDeviceStatusLabel(
        status({
          multiplexer: {
            s0Pin: 1,
            s1Pin: 2,
            s2Pin: 3,
            s3Pin: -1,
            inputPin: 4,
            sixteenChannel: false,
          },
        })
      )
    ).toBe('GP1, GP2, GP3, GP4');
  });
});

describe('device names', () => {
  beforeAll(() => i18next.init({ lng: 'en', resources: { en: { translation: en } } }));
  const i2c = { block: 0, sda: 4, scl: 5, clock: 400000 };

  it('names a display by its controller', () => {
    expect(
      getDeviceName('display', {
        deviceid: 0,
        display: { i2c, controller: proto.DisplayController.DisplaySH1107 },
      })
    ).toBe('SH1107 Display');
    expect(
      getDeviceName('display', {
        deviceid: 0,
        display: { i2c, controller: proto.DisplayController.DisplaySSD1306 },
      })
    ).toBe('SSD1306 Display');
  });

  it("uses the kind's own name otherwise", () => {
    expect(
      getDeviceName('mpr121', { deviceid: 0, mpr121: createDeviceConfig('mpr121', 0).mpr121 })
    ).toBe('MPR121');
  });
});
