import { describe, expect, it } from 'vitest';
import {
  displaySize,
  imageAspect,
  MonoFrame,
  packBitmap,
  proportionalSize,
  resizeBitmap,
  resizeDisplayImage,
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

  // The same frames as the firmware's DrawsAStickWithUpAtTheTop
  it('draws a joystick with up at the top', () => {
    const frame = new MonoFrame();
    frame.drawStick(0, 0, 11, 11, 0, 65535, false);
    expect(rows(frame, 11, 11)).toEqual([
      '###########',
      '####......#',
      '####......#',
      '####......#',
      '#.........#',
      '#.........#',
      '#.........#',
      '#.........#',
      '#.........#',
      '#.........#',
      '###########',
    ]);
    const centre = new MonoFrame();
    centre.drawElement(
      {
        deviceId: 1,
        type: proto.DisplayElementType.DisplayElementStick,
        x: 0,
        y: 0,
        width: 11,
        height: 11,
      },
      0
    );
    expect(rows(centre, 11, 11)[5]).toBe('#...###...#');
    const small = new MonoFrame();
    small.drawStick(0, 0, 5, 5, 65535, 0, false);
    expect(rows(small, 5, 5)).toEqual(['#####', '#...#', '#...#', '#..##', '#####']);
  });

  // The same frames as the firmware's DrawsRectanglesFilledOrOutlined and DrawsCircles
  it('draws rectangles filled or outlined', () => {
    const frame = new MonoFrame();
    frame.drawShape(1, 1, 5, 4, false, false, false);
    expect(rows(frame, 7, 6)).toEqual([
      '.......',
      '.#####.',
      '.#...#.',
      '.#...#.',
      '.#####.',
      '.......',
    ]);
    const filled = new MonoFrame();
    filled.drawShape(0, 0, 3, 2, false, true, false);
    expect(rows(filled, 4, 3)).toEqual(['###.', '###.', '....']);
  });

  it('draws circles, filled while on', () => {
    const frame = new MonoFrame();
    frame.drawShape(0, 0, 9, 9, true, false, false);
    expect(rows(frame, 9, 9)).toEqual([
      '..#####..',
      '.#.....#.',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '.#.....#.',
      '..#####..',
    ]);
    const element = {
      deviceId: 1,
      type: proto.DisplayElementType.DisplayElementCircle,
      x: 0,
      y: 0,
      width: 9,
      height: 9,
    };
    const on = new MonoFrame();
    on.drawElement(element, 1);
    expect(rows(on, 9, 9)[4]).toBe('#########');
    const off = new MonoFrame();
    off.drawElement(element, 0);
    expect(rows(off, 9, 9)[4]).toBe('#.......#');
  });

  it('fills ellipses by their pixel centres and outlines the pixels next to the outside', () => {
    for (let w = 1; w <= 40; w++) {
      for (let h = 1; h <= 40; h++) {
        const inside = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= w || y >= h) {
            return false;
          }
          const dx = 2 * x + 1 - w;
          const dy = 2 * y + 1 - h;
          return dx * dx * h * h + dy * dy * w * w <= w * w * h * h;
        };
        const filled = new MonoFrame();
        filled.drawShape(2, 3, w, h, true, true, false);
        const outline = new MonoFrame();
        outline.drawShape(2, 3, w, h, true, false, false);
        for (let y = -1; y <= h; y++) {
          for (let x = -1; x <= w; x++) {
            const isInside = inside(x, y);
            const edge =
              isInside &&
              (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1));
            if (filled.pixel(x + 2, y + 3) !== isInside || outline.pixel(x + 2, y + 3) !== edge) {
              throw new Error(`${w}x${h} at ${x},${y}`);
            }
          }
        }
      }
    }
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

// A packed image from rows of '#' and '.'
function bitmap(picture: string[]) {
  const width = picture[0].length;
  const stride = Math.ceil(width / 8);
  const image = new Uint8Array(stride * picture.length);
  picture.forEach((row, y) =>
    [...row].forEach((pixel, x) => {
      if (pixel === '#') {
        image[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
      }
    })
  );
  return { image, width, height: picture.length };
}

function picture({ image, width, height }: { image: Uint8Array; width: number; height: number }) {
  const stride = Math.ceil(width / 8);
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      image[y * stride + (x >> 3)] & (0x80 >> (x & 7)) ? '#' : '.'
    ).join('')
  );
}

describe('resizing images', () => {
  it('stretches a packed image by its nearest pixels', () => {
    const small = bitmap(['#.', '.#']);
    expect(
      picture({ ...small, image: resizeBitmap(small.image, 2, 2, 4, 4), width: 4, height: 4 })
    ).toEqual(['##..', '##..', '..##', '..##']);
  });

  it('handles rows wider than a byte', () => {
    const wide = bitmap(['#........#']);
    expect(
      picture({ image: resizeBitmap(wide.image, 10, 1, 20, 1), width: 20, height: 1 })
    ).toEqual(['##................##']);
  });

  it('keeps going from the first image so passing through a small size loses nothing', () => {
    const original = bitmap(['#..#', '.##.', '.##.', '#..#']);
    const tiny = resizeDisplayImage(original, 1, 1);
    const back = resizeDisplayImage(tiny, 4, 4);
    expect(picture(back)).toEqual(picture(original));
    expect(imageAspect(back)).toBe(1);
  });

  it('keeps proportions within the display', () => {
    expect(proportionalSize('width', 64, 2, 128, 64)).toEqual({ width: 64, height: 32 });
    expect(proportionalSize('height', 50, 2, 128, 64)).toEqual({ width: 100, height: 50 });
    // Too wide for the display at that height, so both shrink to fit
    expect(proportionalSize('height', 64, 4, 128, 64)).toEqual({ width: 128, height: 32 });
  });
});
