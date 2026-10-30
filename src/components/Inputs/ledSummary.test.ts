import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { proto } from '@/components/SettingsContext/config';
import en from '@/i18n/en/translation.json';
import { ledModeDetail, ledOutputSummary } from './ledSummary';

const t = i18next.t.bind(i18next);
const led = (device: proto.ILedDevice, mapping: proto.ILedMapping = { staticMapping: {} }) => ({
  device,
  mapping,
});

describe('LED summaries', () => {
  beforeAll(() => i18next.init({ lng: 'en', resources: { en: { translation: en } } }));

  it('says which pin a GPIO LED is on', () => {
    expect(ledOutputSummary(led({ gpio: { pin: 25, analog: false } }), undefined, t)).toBe(
      'GPIO: GP25'
    );
    expect(ledOutputSummary(led({ gpio: { pin: -1, analog: true } }), undefined, t)).toBe(
      'GPIO: No pin picked'
    );
  });

  it('lists the LEDs of a strip with their labels, shortening long lists', () => {
    const rgb = (activeLed: number[]) =>
      led({
        rgb: {
          deviceId: 1,
          activeLed,
          startR: 0,
          startG: 0,
          startB: 0,
          startW: 0,
          endR: 0,
          endG: 0,
          endB: 0,
          endW: 0,
          hasStart: false,
        },
      });
    const name = (n: number) => (n === 2 ? '2 (Green)' : `${n}`);
    expect(ledOutputSummary(rgb([2]), 'WS2812', t, name)).toBe('WS2812: LED 2 (Green)');
    expect(ledOutputSummary(rgb([0, 1]), 'WS2812', t, name)).toBe('WS2812: LEDs 0, 1');
    expect(ledOutputSummary(rgb([0, 1, 2, 3, 4, 5, 6, 7]), 'WS2812', t)).toBe(
      'WS2812: LEDs 0, 1, 2, 3, 4, 5 and 2 more'
    );
    expect(ledOutputSummary(rgb([]), 'WS2812', t)).toBe('WS2812: No LEDs picked');
    expect(ledOutputSummary(rgb([0]), undefined, t)).toBe('Device missing');
  });

  it('describes what a display element shows', () => {
    const display = (element: Partial<proto.IDisplayLedDevice>) =>
      led({
        display: {
          deviceId: 1,
          type: proto.DisplayElementType.DisplayElementText,
          x: 4,
          y: 8,
          ...element,
        },
      });
    expect(ledOutputSummary(display({ text: 'P1' }), 'SH1107 Display', t)).toBe(
      'SH1107 Display: Text "P1" at 4, 8'
    );
    expect(
      ledOutputSummary(
        display({ type: proto.DisplayElementType.DisplayElementBar, width: 64, height: 8 }),
        'SSD1306 Display',
        t
      )
    ).toBe('SSD1306 Display: 64 x 8 bar at 4, 8');
    expect(
      ledOutputSummary(
        display({ type: proto.DisplayElementType.DisplayElementImage, width: 0 }),
        'SSD1306 Display',
        t
      )
    ).toBe('SSD1306 Display: No image uploaded');
  });

  it('says what turns it on', () => {
    expect(
      ledModeDetail({ inputMapping: { input: { gpio: { pin: 5, analog: false, pinMode: 1 } } } }, t)
    ).toBe('GP5');
    expect(ledModeDetail({ playerMapping: { playerId: 2 } }, t)).toBe('Player 2');
    expect(
      ledModeDetail(
        {
          statusMapping: {
            type: proto.StatusLedType.StatusConsoleMode,
            mode: proto.ConsoleMode.ModePs3,
          },
        },
        t
      )
    ).toMatch(/\(.+\)$/);
    expect(ledModeDetail({ staticMapping: {} }, t)).toBeUndefined();
  });
});
