import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { DisplayElementEditor } from './DisplayElementEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('display element preview', () => {
  let container: HTMLDivElement;
  let root: Root;
  const dispatch = vi.fn<(element: proto.IDisplayLedDevice) => void>();
  // "Hi" at size 1 is 12 x 8
  const element: proto.IDisplayLedDevice = {
    deviceId: 1,
    type: proto.DisplayElementType.DisplayElementText,
    x: 10,
    y: 20,
    scale: 1,
    text: 'Hi',
  };

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    dispatch.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function render(current = element) {
    await act(() =>
      root.render(
        <MantineProvider>
          <DisplayElementEditor
            element={current}
            display={{
              i2c: { block: 0, sda: 4, scl: 5, clock: 400000 },
              controller: proto.DisplayController.DisplaySSD1306,
            }}
            elements={[current]}
            dispatch={dispatch}
          />
        </MantineProvider>
      )
    );
    const canvas = container.querySelector('canvas')!;
    // Shown at half size, 64 x 32 on screen for the 128 x 64 display
    canvas.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 64, height: 32, right: 164, bottom: 82 }) as DOMRect;
    return canvas;
  }

  async function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number) {
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
    });
  }

  it('drags the element from where it was picked up', async () => {
    const canvas = await render();
    // Display pixel (14, 22), inside the element, 4 right and 2 down from its corner
    await pointer(canvas, 'pointerdown', 100 + 7, 50 + 11);
    expect(dispatch).not.toHaveBeenCalled();
    // Display pixel (40, 30)
    await pointer(canvas, 'pointermove', 100 + 20, 50 + 15);
    expect(dispatch).toHaveBeenLastCalledWith({ ...element, x: 36, y: 28 });
    await pointer(canvas, 'pointerup', 100 + 20, 50 + 15);
    dispatch.mockClear();
    await pointer(canvas, 'pointermove', 100 + 30, 50 + 20);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('jumps to where the display is clicked outside it, and stays on the display', async () => {
    const canvas = await render();
    await pointer(canvas, 'pointerdown', 100 + 30, 50 + 3);
    expect(dispatch).toHaveBeenLastCalledWith({ ...element, x: 60, y: 6 });
    // Right off the bottom right corner: the 12 x 8 text stops at the edge
    await pointer(canvas, 'pointermove', 100 + 200, 50 + 200);
    expect(dispatch).toHaveBeenLastCalledWith({ ...element, x: 116, y: 56 });
  });

  it('resizes an uploaded image, keeping its proportions', async () => {
    // 4 x 2, left half lit, packed a row per byte
    const image = new Uint8Array([0xc0, 0xc0]);
    await render({
      ...element,
      type: proto.DisplayElementType.DisplayElementImage,
      text: null,
      scale: null,
      width: 4,
      height: 2,
      image,
    });
    const label = [...container.querySelectorAll('label')].find(
      (l) => l.textContent === 'display.width'
    )!;
    const input = document.getElementById(label.htmlFor) as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '8');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const resized = dispatch.mock.lastCall![0];
    expect(resized).toMatchObject({ width: 8, height: 4, x: 10, y: 20 });
    expect([...resized.image!]).toEqual([0xf0, 0xf0, 0xf0, 0xf0]);
  });

  it('nudges with the arrow keys, 8 at a time with shift', async () => {
    const canvas = await render();
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(dispatch).toHaveBeenLastCalledWith({ ...element, x: 11, y: 20 });
    await act(async () => {
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true })
      );
    });
    expect(dispatch).toHaveBeenLastCalledWith({ ...element, x: 10, y: 12 });
  });
});
