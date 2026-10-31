import { proto } from '@/components/SettingsContext/config';

// Mirrors the firmware's lib/display/mono_framebuffer, so the preview matches what the display shows
export const CHAR_WIDTH = 6;
export const CHAR_HEIGHT = 8;
export const MAX_SCALE = 8;
export const MAX_TEXT_LENGTH = 32;

// The classic 5 x 7 LCD font, printable ASCII from space. Each glyph is 5 columns, the top pixel in bit 0
const FONT_FIRST = 32;
const FONT_LAST = 126;
const font5x7: number[][] = [
  [0x00, 0x00, 0x00, 0x00, 0x00],
  [0x00, 0x00, 0x5f, 0x00, 0x00],
  [0x00, 0x07, 0x00, 0x07, 0x00],
  [0x14, 0x7f, 0x14, 0x7f, 0x14],
  [0x24, 0x2a, 0x7f, 0x2a, 0x12],
  [0x23, 0x13, 0x08, 0x64, 0x62],
  [0x36, 0x49, 0x55, 0x22, 0x50],
  [0x00, 0x05, 0x03, 0x00, 0x00],
  [0x00, 0x1c, 0x22, 0x41, 0x00],
  [0x00, 0x41, 0x22, 0x1c, 0x00],
  [0x08, 0x2a, 0x1c, 0x2a, 0x08],
  [0x08, 0x08, 0x3e, 0x08, 0x08],
  [0x00, 0x50, 0x30, 0x00, 0x00],
  [0x08, 0x08, 0x08, 0x08, 0x08],
  [0x00, 0x60, 0x60, 0x00, 0x00],
  [0x20, 0x10, 0x08, 0x04, 0x02],
  [0x3e, 0x51, 0x49, 0x45, 0x3e],
  [0x00, 0x42, 0x7f, 0x40, 0x00],
  [0x42, 0x61, 0x51, 0x49, 0x46],
  [0x21, 0x41, 0x45, 0x4b, 0x31],
  [0x18, 0x14, 0x12, 0x7f, 0x10],
  [0x27, 0x45, 0x45, 0x45, 0x39],
  [0x3c, 0x4a, 0x49, 0x49, 0x30],
  [0x01, 0x71, 0x09, 0x05, 0x03],
  [0x36, 0x49, 0x49, 0x49, 0x36],
  [0x06, 0x49, 0x49, 0x29, 0x1e],
  [0x00, 0x36, 0x36, 0x00, 0x00],
  [0x00, 0x56, 0x36, 0x00, 0x00],
  [0x08, 0x14, 0x22, 0x41, 0x00],
  [0x14, 0x14, 0x14, 0x14, 0x14],
  [0x00, 0x41, 0x22, 0x14, 0x08],
  [0x02, 0x01, 0x51, 0x09, 0x06],
  [0x32, 0x49, 0x79, 0x41, 0x3e],
  [0x7e, 0x11, 0x11, 0x11, 0x7e],
  [0x7f, 0x49, 0x49, 0x49, 0x36],
  [0x3e, 0x41, 0x41, 0x41, 0x22],
  [0x7f, 0x41, 0x41, 0x22, 0x1c],
  [0x7f, 0x49, 0x49, 0x49, 0x41],
  [0x7f, 0x09, 0x09, 0x09, 0x01],
  [0x3e, 0x41, 0x49, 0x49, 0x7a],
  [0x7f, 0x08, 0x08, 0x08, 0x7f],
  [0x00, 0x41, 0x7f, 0x41, 0x00],
  [0x20, 0x40, 0x41, 0x3f, 0x01],
  [0x7f, 0x08, 0x14, 0x22, 0x41],
  [0x7f, 0x40, 0x40, 0x40, 0x40],
  [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  [0x7f, 0x04, 0x08, 0x10, 0x7f],
  [0x3e, 0x41, 0x41, 0x41, 0x3e],
  [0x7f, 0x09, 0x09, 0x09, 0x06],
  [0x3e, 0x41, 0x51, 0x21, 0x5e],
  [0x7f, 0x09, 0x19, 0x29, 0x46],
  [0x46, 0x49, 0x49, 0x49, 0x31],
  [0x01, 0x01, 0x7f, 0x01, 0x01],
  [0x3f, 0x40, 0x40, 0x40, 0x3f],
  [0x1f, 0x20, 0x40, 0x20, 0x1f],
  [0x3f, 0x40, 0x38, 0x40, 0x3f],
  [0x63, 0x14, 0x08, 0x14, 0x63],
  [0x07, 0x08, 0x70, 0x08, 0x07],
  [0x61, 0x51, 0x49, 0x45, 0x43],
  [0x00, 0x7f, 0x41, 0x41, 0x00],
  [0x02, 0x04, 0x08, 0x10, 0x20],
  [0x00, 0x41, 0x41, 0x7f, 0x00],
  [0x04, 0x02, 0x01, 0x02, 0x04],
  [0x40, 0x40, 0x40, 0x40, 0x40],
  [0x00, 0x01, 0x02, 0x04, 0x00],
  [0x20, 0x54, 0x54, 0x54, 0x78],
  [0x7f, 0x48, 0x44, 0x44, 0x38],
  [0x38, 0x44, 0x44, 0x44, 0x20],
  [0x38, 0x44, 0x44, 0x48, 0x7f],
  [0x38, 0x54, 0x54, 0x54, 0x18],
  [0x08, 0x7e, 0x09, 0x01, 0x02],
  [0x0c, 0x52, 0x52, 0x52, 0x3e],
  [0x7f, 0x08, 0x04, 0x04, 0x78],
  [0x00, 0x44, 0x7d, 0x40, 0x00],
  [0x20, 0x40, 0x44, 0x3d, 0x00],
  [0x7f, 0x10, 0x28, 0x44, 0x00],
  [0x00, 0x41, 0x7f, 0x40, 0x00],
  [0x7c, 0x04, 0x18, 0x04, 0x78],
  [0x7c, 0x08, 0x04, 0x04, 0x78],
  [0x38, 0x44, 0x44, 0x44, 0x38],
  [0x7c, 0x14, 0x14, 0x14, 0x08],
  [0x08, 0x14, 0x14, 0x18, 0x7c],
  [0x7c, 0x08, 0x04, 0x04, 0x08],
  [0x48, 0x54, 0x54, 0x54, 0x20],
  [0x04, 0x3f, 0x44, 0x40, 0x20],
  [0x3c, 0x40, 0x40, 0x20, 0x7c],
  [0x1c, 0x20, 0x40, 0x20, 0x1c],
  [0x3c, 0x40, 0x30, 0x40, 0x3c],
  [0x44, 0x28, 0x10, 0x28, 0x44],
  [0x0c, 0x50, 0x50, 0x50, 0x3c],
  [0x44, 0x64, 0x54, 0x4c, 0x44],
  [0x00, 0x08, 0x36, 0x41, 0x00],
  [0x00, 0x00, 0x7f, 0x00, 0x00],
  [0x00, 0x41, 0x36, 0x08, 0x00],
  [0x08, 0x04, 0x08, 0x10, 0x08],
];

// Only printable ASCII can be drawn, and the firmware has room for MAX_TEXT_LENGTH characters
export function sanitiseDisplayText(text: string): string {
  return text.replace(/[^\x20-\x7e]/g, '').slice(0, MAX_TEXT_LENGTH);
}

// The panel sizes each controller comes in. The SH1107 is the only one that isn't 128 wide.
export function displayPanels(controller?: proto.DisplayController | null) {
  return controller === proto.DisplayController.DisplaySH1107
    ? [
        { width: 64, height: 128 },
        { width: 128, height: 128 },
      ]
    : [
        { width: 128, height: 64 },
        { width: 128, height: 32 },
      ];
}

export function displayPanel(display: proto.IDisplayDevice) {
  if (display.controller === proto.DisplayController.DisplaySH1107) {
    return { width: display.width === 64 ? 64 : 128, height: 128 };
  }
  return { width: 128, height: display.height === 32 ? 32 : 64 };
}

// The size things are positioned in, after rotating the panel
export function displaySize(display?: proto.IDisplayDevice | null) {
  const panel = display ? displayPanel(display) : { width: 128, height: 64 };
  return (display?.rotation ?? 0) % 2 ? { width: panel.height, height: panel.width } : panel;
}

// Drawn the way it looks once rotated onto the panel, rotating itself is left to the firmware
export class MonoFrame {
  readonly pixels: Uint8Array;
  constructor(
    readonly width: number = 128,
    readonly height: number = 64
  ) {
    this.pixels = new Uint8Array(width * height);
  }

  pixel(x: number, y: number): boolean {
    return (
      x >= 0 && y >= 0 && x < this.width && y < this.height && !!this.pixels[y * this.width + x]
    );
  }

  setPixel(x: number, y: number, on: boolean) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.pixels[y * this.width + x] = on ? 1 : 0;
    }
  }

  fillRect(x: number, y: number, w: number, h: number, on: boolean) {
    for (let j = Math.max(0, y); j < Math.min(this.height, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(this.width, x + w); i++) {
        this.setPixel(i, j, on);
      }
    }
  }

  drawText(x: number, y: number, text: string, textScale: number, invert: boolean) {
    const scale = Math.min(MAX_SCALE, Math.max(1, textScale));
    for (let idx = 0; idx < text.length && x + idx * CHAR_WIDTH * scale < this.width; idx++) {
      const left = x + idx * CHAR_WIDTH * scale;
      let c = text.charCodeAt(idx);
      if (c < FONT_FIRST || c > FONT_LAST) {
        c = '?'.charCodeAt(0);
      }
      const glyph = font5x7[c - FONT_FIRST];
      for (let col = 0; col < CHAR_WIDTH; col++) {
        const bits = col < 5 ? glyph[col] : 0;
        for (let row = 0; row < CHAR_HEIGHT; row++) {
          this.fillRect(
            left + col * scale,
            y + row * scale,
            scale,
            scale,
            !!((bits >> row) & 1) !== invert
          );
        }
      }
    }
  }

  drawBitmap(x: number, y: number, w: number, h: number, bitmap: Uint8Array, invert: boolean) {
    if (w <= 0 || h <= 0 || w > this.width || h > this.height) {
      return;
    }
    const stride = Math.ceil(w / 8);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const idx = row * stride + (col >> 3);
        const on = idx < bitmap.length && !!(bitmap[idx] & (0x80 >> (col & 7)));
        this.setPixel(x + col, y + row, on !== invert);
      }
    }
  }

  drawBar(
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    vertical: boolean,
    invert: boolean
  ) {
    if (w <= 0 || h <= 0 || w > this.width || h > this.height) {
      return;
    }
    this.fillRect(x, y, w, h, invert);
    const border = w >= 3 && h >= 3 ? 1 : 0;
    if (border) {
      this.fillRect(x, y, w, 1, !invert);
      this.fillRect(x, y + h - 1, w, 1, !invert);
      this.fillRect(x, y, 1, h, !invert);
      this.fillRect(x + w - 1, y, 1, h, !invert);
    }
    const innerW = w - border * 2;
    const innerH = h - border * 2;
    if (vertical) {
      const filled = Math.floor((innerH * value + 32767) / 65535);
      this.fillRect(x + border, y + border + innerH - filled, innerW, filled, !invert);
    } else {
      const filled = Math.floor((innerW * value + 32767) / 65535);
      this.fillRect(x + border, y + border, filled, innerH, !invert);
    }
  }

  // value is what its LED mapping set it to, out of 65535
  // An outline with a dot where a joystick is, larger values right and up, like the firmware's draw_stick
  drawStick(
    x: number,
    y: number,
    w: number,
    h: number,
    stickX: number,
    stickY: number,
    invert: boolean
  ) {
    if (w < 3 || h < 3 || w > this.width || h > this.height) {
      return;
    }
    this.fillRect(x, y, w, h, invert);
    this.drawOutline(x, y, w, h, !invert);
    const dot = stickDot(w, h, stickX, stickY);
    this.fillRect(x + dot.x, y + dot.y, dot.size, dot.size, !invert);
  }

  private drawOutline(x: number, y: number, w: number, h: number, on: boolean) {
    this.fillRect(x, y, w, 1, on);
    this.fillRect(x, y + h - 1, w, 1, on);
    this.fillRect(x, y, 1, h, on);
    this.fillRect(x + w - 1, y, 1, h, on);
  }

  // A w x h rectangle, or the ellipse that fits in it, filled or as a 1 pixel outline, like the
  // firmware's draw_shape
  drawShape(
    x: number,
    y: number,
    w: number,
    h: number,
    ellipse: boolean,
    filled: boolean,
    invert: boolean
  ) {
    if (w <= 0 || h <= 0 || w > this.width || h > this.height) {
      return;
    }
    if (invert) {
      this.fillRect(x, y, w, h, true);
    }
    if (!ellipse) {
      if (filled || w < 3 || h < 3) {
        this.fillRect(x, y, w, h, !invert);
      } else {
        this.drawOutline(x, y, w, h, !invert);
      }
      return;
    }
    for (let row = 0; row < h; row++) {
      const { left, right } = ellipseSpan(w, h, row);
      if (left > right) {
        continue;
      }
      if (filled) {
        this.fillRect(x + left, y + row, right - left + 1, 1, !invert);
        continue;
      }
      // The edge is what's inside this row but not the rows either side
      let innerLeft = w;
      let innerRight = -1;
      if (row > 0 && row < h - 1) {
        const above = ellipseSpan(w, h, row - 1);
        const below = ellipseSpan(w, h, row + 1);
        innerLeft = Math.max(above.left, below.left);
        innerRight = Math.min(above.right, below.right);
      }
      if (innerLeft > innerRight) {
        this.fillRect(x + left, y + row, right - left + 1, 1, !invert);
        continue;
      }
      const edgeLeft = Math.max(innerLeft, left + 1);
      const edgeRight = Math.min(innerRight, right - 1);
      this.fillRect(x + left, y + row, edgeLeft - left, 1, !invert);
      this.fillRect(x + edgeRight + 1, y + row, right - edgeRight, 1, !invert);
    }
  }

  // Elements are drawn as if they're on with this value, joysticks centred
  drawElement(element: proto.IDisplayLedDevice, value: number) {
    const invert = !!element.invert;
    switch (element.type) {
      case proto.DisplayElementType.DisplayElementText:
        this.drawText(element.x, element.y, element.text ?? '', element.scale ?? 1, invert);
        break;
      case proto.DisplayElementType.DisplayElementImage:
        this.drawBitmap(
          element.x,
          element.y,
          element.width ?? 0,
          element.height ?? 0,
          element.image ?? new Uint8Array(),
          invert
        );
        break;
      case proto.DisplayElementType.DisplayElementBar:
        this.drawBar(
          element.x,
          element.y,
          element.width ?? 0,
          element.height ?? 0,
          value,
          !!element.vertical,
          invert
        );
        break;
      case proto.DisplayElementType.DisplayElementRectangle:
      case proto.DisplayElementType.DisplayElementCircle:
        this.drawShape(
          element.x,
          element.y,
          element.width ?? 0,
          element.height ?? 0,
          element.type === proto.DisplayElementType.DisplayElementCircle,
          value !== 0,
          invert
        );
        break;
      case proto.DisplayElementType.DisplayElementStick:
        this.drawStick(
          element.x,
          element.y,
          element.width ?? 0,
          element.height ?? 0,
          STICK_CENTRE,
          STICK_CENTRE,
          invert
        );
        break;
    }
  }
}

export const STICK_CENTRE = 32767;

// The columns of row (0 to h - 1) inside the ellipse that fits a w x h box, none when left > right. A
// pixel is inside when its centre is, measured in half pixels from the middle so it's all whole numbers.
export function ellipseSpan(w: number, h: number, row: number) {
  const dy = 2 * row + 1 - h;
  const reach = Math.floor(Math.floor(Math.sqrt(w * w * (h * h - dy * dy))) / h);
  return { left: Math.floor((w - reach) / 2), right: Math.floor((w - 1 + reach) / 2) };
}

// Where draw_stick puts the dot in its w x h box, and how big it is
export function stickDot(w: number, h: number, stickX: number, stickY: number) {
  // Inside the outline, a 3 pixel dot once there's room to see it move
  const innerW = w - 2;
  const innerH = h - 2;
  const size = innerW >= 9 && innerH >= 9 ? 3 : 1;
  return {
    x: 1 + Math.floor(((innerW - size) * stickX + 32767) / 65535),
    y: 1 + Math.floor(((innerH - size) * (65535 - stickY) + 32767) / 65535),
    size,
  };
}

// Packs an RGBA image into the firmware's format: row by row, each row starting on a new byte, most
// significant bit first. Pixels brighter than threshold (and not see through) are lit.
export function packBitmap(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 128
) {
  const stride = Math.ceil(width / 8);
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luma = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      if (rgba[i + 3] >= 128 && luma >= threshold) {
        out[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return out;
}

// What each uploaded image was made from, while it's still loaded, so it can be resized from the original
// rather than from its pixels on the display. Kept by the packed image, which stays the same object until
// the image changes.
const imageSources = new WeakMap<Uint8Array, HTMLImageElement>();

export function imageSource(image?: Uint8Array | null) {
  return image ? imageSources.get(image) : undefined;
}

// Draws an image at width x height and packs it
export function renderDisplayImage(source: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to read image');
  }
  context.drawImage(source, 0, 0, width, height);
  const image = packBitmap(context.getImageData(0, 0, width, height).data, width, height);
  imageSources.set(image, source);
  return { width, height, image };
}

// When the original isn't loaded, the packed image that later sizes were stretched from, so going through
// sizes on the way to another (eg typing 40 goes through 4) doesn't lose detail
const bitmapSources = new WeakMap<
  Uint8Array,
  { image: Uint8Array; width: number; height: number }
>();

// An image at a new size, redrawn from the original while it's loaded, otherwise stretched from its pixels
export function resizeDisplayImage(
  current: { image: Uint8Array; width: number; height: number },
  width: number,
  height: number
) {
  const source = imageSource(current.image);
  if (source) {
    return renderDisplayImage(source, width, height);
  }
  const from = bitmapSources.get(current.image) ?? current;
  const image = resizeBitmap(from.image, from.width, from.height, width, height);
  bitmapSources.set(image, from);
  return { width, height, image };
}

// The width / height of what an image was made from
export function imageAspect(current: { image: Uint8Array; width: number; height: number }) {
  const source = imageSource(current.image);
  const from = source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : (bitmapSources.get(current.image) ?? current);
  return from.width / from.height;
}

// Resizes a packed image to width x height by its nearest pixels
export function resizeBitmap(
  image: Uint8Array,
  fromWidth: number,
  fromHeight: number,
  width: number,
  height: number
) {
  const fromStride = Math.ceil(fromWidth / 8);
  const stride = Math.ceil(width / 8);
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(fromHeight - 1, Math.floor(((y + 0.5) * fromHeight) / height));
    for (let x = 0; x < width; x++) {
      const fx = Math.min(fromWidth - 1, Math.floor(((x + 0.5) * fromWidth) / width));
      if (image[fy * fromStride + (fx >> 3)] & (0x80 >> (fx & 7))) {
        out[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return out;
}

// The size to resize an image to when one side is changed and its proportions are kept, fitting within
// maxWidth x maxHeight. aspect is width / height.
export function proportionalSize(
  side: 'width' | 'height',
  value: number,
  aspect: number,
  maxWidth: number,
  maxHeight: number
) {
  let width = side === 'width' ? value : value * aspect;
  let height = side === 'height' ? value : value / aspect;
  const fit = Math.min(1, maxWidth / width, maxHeight / height);
  width *= fit;
  height *= fit;
  return {
    width: Math.max(1, Math.min(maxWidth, Math.round(width))),
    height: Math.max(1, Math.min(maxHeight, Math.round(height))),
  };
}

// Scales an image file down to fit the display (never up), then packs it
export async function loadDisplayImage(file: File, maxWidth: number, maxHeight: number) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('Invalid image dimensions');
    }
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    return renderDisplayImage(image, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}
