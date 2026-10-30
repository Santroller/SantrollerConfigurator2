import { describe, expect, it } from 'vitest';
import {
  displaySize,
  MonoFrame,
  packBitmap,
  sanitiseDisplayText,
} from '@/components/Inputs/displayRender';
import { proto } from '@/components/SettingsContext/config';

function rows(frame: MonoFrame, width: number, height: number) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (frame.pixel(x, y) ? '#' : '.')).join('')
  );
}

describe('MonoFrame', () => {
  it('draws text like the firmware font', () => {
    const frame = new MonoFrame();
    frame.drawText(0, 0, 'A1', 1, false);
    expect(rows(frame, 12, 8)).toEqual([
      '.###....#...',
      '#...#..##...',
      '#...#...#...',
      '#...#...#...',
      '#####...#...',
      '#...#...#...',
      '#...#..###..',
      '............',
    ]);
  });

  it('inverts the whole character cell', () => {
    const frame = new MonoFrame();
    frame.drawText(0, 0, ' ', 2, true);
    expect(rows(frame, 13, 17)).toEqual([
      ...Array.from({ length: 16 }, () => '############.'),
      '.............',
    ]);
  });

  it('fills bars in proportion to the value, inside an outline', () => {
    const frame = new MonoFrame();
    frame.drawBar(0, 0, 10, 4, 32768, false, false);
    expect(rows(frame, 10, 4)).toEqual(['##########', '#####....#', '#####....#', '##########']);
    const vertical = new MonoFrame();
    vertical.drawBar(0, 0, 3, 6, 65535 / 2, true, false);
    expect(rows(vertical, 3, 6)).toEqual(['###', '#.#', '#.#', '###', '###', '###']);
  });

  it('draws images packed by packBitmap', () => {
    // 3 x 2: white, black, white / black, white, see through
    const rgba = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255,
      255, 255, 0,
    ]);
    const image = packBitmap(rgba, 3, 2);
    expect(Array.from(image)).toEqual([0b10100000, 0b01000000]);
    const frame = new MonoFrame();
    frame.drawElement(
      {
        deviceId: 0,
        type: proto.DisplayElementType.DisplayElementImage,
        x: 1,
        y: 1,
        width: 3,
        height: 2,
        image,
      },
      0
    );
    expect(rows(frame, 5, 4)).toEqual(['.....', '.#.#.', '..#..', '.....']);
  });

  it('clips to a 32 pixel tall display', () => {
    const frame = new MonoFrame(128, 32);
    frame.drawText(0, 30, 'A', 2, false);
    expect(frame.pixel(2, 30)).toBe(true);
    expect(frame.pixels.length).toBe(128 * 32);
  });
});

describe('sanitiseDisplayText', () => {
  it('keeps printable ASCII up to the firmware limit', () => {
    expect(sanitiseDisplayText('Héllo\n')).toBe('Hllo');
    expect(sanitiseDisplayText('x'.repeat(40))).toHaveLength(32);
  });
});

describe('displaySize', () => {
  it('is the panel, turned by the rotation', () => {
    const ssd1306 = {
      i2c: {},
      controller: proto.DisplayController.DisplaySSD1306,
    } as proto.IDisplayDevice;
    expect(displaySize(ssd1306)).toEqual({ width: 128, height: 64 });
    expect(displaySize({ ...ssd1306, height: 32, rotation: 2 })).toEqual({
      width: 128,
      height: 32,
    });
    const sh1107 = {
      ...ssd1306,
      controller: proto.DisplayController.DisplaySH1107,
      width: 64,
      height: 32,
    };
    // The SH1107 ignores height, it's always 128 tall
    expect(displaySize(sh1107)).toEqual({ width: 64, height: 128 });
    expect(displaySize({ ...sh1107, rotation: 1 })).toEqual({ width: 128, height: 64 });
    expect(displaySize({ ...sh1107, width: null, rotation: 3 })).toEqual({
      width: 128,
      height: 128,
    });
  });
});
