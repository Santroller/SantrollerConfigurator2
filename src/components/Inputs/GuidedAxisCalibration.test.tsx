import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { GuidedAxisCalibration } from './GuidedAxisCalibration';

const status = vi.hoisted(() => ({
  connected: true,
  mappingStatus: [[{ stateRaw: 1000 as number | undefined }]],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: (selector: (state: typeof status) => unknown) => selector(status),
}));

describe('guided axis calibration', () => {
  let container: HTMLDivElement;
  let root: Root;
  const dispatch = vi.fn<(mapping: proto.IMapping) => void>();
  const mapping: proto.IMapping = {
    input: { gpio: { pin: 26, pinMode: proto.PinMode.Floating, analog: true } },
    mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
    min: 10,
    max: 20,
    deadzone: 1000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
    status.connected = true;
    status.mappingStatus[0][0].stateRaw = 1000;
    dispatch.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function render(raw = status.mappingStatus[0][0].stateRaw, currentMapping = mapping) {
    status.mappingStatus[0][0].stateRaw = raw;
    await act(() =>
      root.render(
        <MantineProvider env="test">
          <GuidedAxisCalibration
            mapping={currentMapping}
            profileIdx={0}
            mappingIdx={0}
            dispatch={dispatch}
          />
        </MantineProvider>
      )
    );
  }

  function button(key: string) {
    const found = Array.from(document.body.querySelectorAll('button')).find(
      (button) =>
        button.textContent === key ||
        (['low', 'high', 'neutral'].some((step) => key === `calibration.guided.${step}.capture`) &&
          button.textContent?.endsWith(`.${key.split('.').slice(-2).join('.')}`))
    );
    expect(found).toBeDefined();
    return found!;
  }

  async function click(key: string) {
    await act(() => button(key).click());
  }

  async function capture(released: number, pressed: number) {
    await render(released);
    await click('calibration.guided.start');
    expect(dialog().textContent?.match(/calibration.rawValue/g)).toHaveLength(1);
    expect(dialog().textContent).toContain('calibration.guided.review.label');
    await click('calibration.guided.released.capture');
    await act(() => vi.advanceTimersByTime(1000));
    expect(dispatch).not.toHaveBeenCalled();
    await render(pressed);
    await click('calibration.guided.pressed.capture');
  }

  function dialog() {
    const element = document.body.querySelector('[role="dialog"]');
    expect(element).not.toBeNull();
    return element!;
  }

  it.each([
    { output: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy }, kind: 'whammy' },
    { output: { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy }, kind: 'whammy' },
    {
      output: { ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy },
      kind: 'whammy',
    },
    { output: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger }, kind: 'trigger' },
    { output: { wheelAxis: proto.WheelAxisType.Wheel_Brake }, kind: 'pedal' },
    { output: { proKeyboardAxis: proto.ProKeyboardAxisType.ProKeyboardPedal }, kind: 'pedal' },
  ])('only describes the $kind being calibrated', async ({ output, kind }) => {
    const current = { ...mapping, mapping: output };
    await render(1000, current);
    await click('calibration.guided.start');
    expect(dialog().textContent).toContain(`calibration.guided.triggers.${kind}.released`);
    expect(dialog().textContent).not.toContain('calibration.guided.released.description');
    await click('calibration.guided.released.capture');
    await act(() => vi.advanceTimersByTime(1000));
    expect(dialog().textContent).toContain(`calibration.guided.triggers.${kind}.pressed`);
  });

  it.each([
    [1000, 60000],
    [60000, 1000],
    [0, 65535],
  ])('applies released %i and pressed %i only after review', async (released, pressed) => {
    await capture(released, pressed);
    expect(dialog().textContent).toContain('calibration.guided.review.title');
    expect(dialog().textContent).toContain(`calibration.released: ${released}`);
    expect(dialog().textContent).toContain(`calibration.pressed: ${pressed}`);
    expect(dispatch).not.toHaveBeenCalled();
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      ...mapping,
      min: released,
      max: pressed,
    });
    expect(button('calibration.guided.start')).toBeDefined();
  });

  it('cancels without changing the mapping and starts with fresh captures', async () => {
    await capture(1000, 60000);
    await click('common.cancel');
    expect(dispatch).not.toHaveBeenCalled();
    await capture(2000, 50000);
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ ...mapping, min: 2000, max: 50000 });
  });

  it('discards captures when the modal is closed', async () => {
    await capture(1000, 60000);
    const close = dialog().querySelector<HTMLButtonElement>('button[aria-label="common.cancel"]');
    expect(close).not.toBeNull();
    await act(() => close!.click());
    expect(dispatch).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('calibration.guided.review.title');
    await capture(2000, 50000);
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ ...mapping, min: 2000, max: 50000 });
  });

  it('rejects identical endpoints and allows restarting', async () => {
    await capture(1000, 1000);
    expect(dialog().textContent).toContain('calibration.guided.noise.noTravel');
    expect(button('calibration.guided.apply').disabled).toBe(true);
    await click('calibration.guided.apply');
    expect(dispatch).not.toHaveBeenCalled();
    await click('calibration.guided.restart');
    expect(dialog().textContent).toContain('calibration.guided.released.title');
  });

  it.each([undefined, NaN, -1, 65536, 1.5])('rejects unavailable reading %s', async (raw) => {
    await render();
    await click('calibration.guided.start');
    status.mappingStatus[0][0].stateRaw = raw;
    await render();
    expect(dialog().textContent).toContain('calibration.guided.unavailable');
    expect(button('calibration.guided.released.capture').disabled).toBe(true);
    await click('calibration.guided.released.capture');
    expect(dialog().textContent).toContain('calibration.guided.released.title');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('disables capture and apply while disconnected', async () => {
    await render();
    await click('calibration.guided.start');
    status.connected = false;
    await render();
    expect(button('calibration.guided.released.capture').disabled).toBe(true);
    status.connected = true;
    await render();
    await click('calibration.guided.released.capture');
    await act(() => vi.advanceTimersByTime(1000));
    await render(60000);
    await click('calibration.guided.pressed.capture');
    status.connected = false;
    await render();
    expect(button('calibration.guided.apply').disabled).toBe(true);
    expect(dialog().textContent).toContain('calibration.guided.unavailable');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    { initial: 1000, low: 900, high: 1200, pressed: 60000, expected: 1200 },
    { initial: 60000, low: 59800, high: 60100, pressed: 1000, expected: 59800 },
  ])('uses the resting edge toward pressed for $initial', async (values) => {
    await render(values.initial);
    await click('calibration.guided.start');
    await click('calibration.guided.released.capture');
    await act(() => vi.advanceTimersByTime(400));
    await render(values.low);
    await act(() => vi.advanceTimersByTime(599));
    await render(values.high);
    expect(dialog().textContent).toContain('calibration.guided.noise.measuring');
    expect(dialog().textContent).not.toContain('calibration.guided.pressed.title');
    await act(() => vi.advanceTimersByTime(1));
    await render(values.pressed);
    await click('calibration.guided.pressed.capture');
    expect(dialog().textContent).toContain(
      `calibration.guided.noise.range: ${values.low} - ${values.high}`
    );
    const toggle = dialog().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(toggle.checked).toBe(true);
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      ...mapping,
      min: values.expected,
      max: values.pressed,
    });
  });

  it('can use the initial reading instead of the measured edge', async () => {
    await render(1000);
    await click('calibration.guided.start');
    await click('calibration.guided.released.capture');
    await render(1200);
    await act(() => vi.advanceTimersByTime(1000));
    await render(60000);
    await click('calibration.guided.pressed.capture');
    const toggle = dialog().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await act(() => toggle.click());
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ ...mapping, min: 1000, max: 60000 });
  });

  it('rejects a pressed value inside the resting range even without compensation', async () => {
    await render(1000);
    await click('calibration.guided.start');
    await click('calibration.guided.released.capture');
    await render(2000);
    await act(() => vi.advanceTimersByTime(1000));
    await render(1500);
    await click('calibration.guided.pressed.capture');
    expect(button('calibration.guided.apply').disabled).toBe(true);
    const toggle = dialog().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await act(() => toggle.click());
    expect(button('calibration.guided.apply').disabled).toBe(true);
    expect(dialog().textContent).toContain('calibration.guided.noise.noTravel');
  });

  it('aborts measurement on disconnect and permits a fresh measurement', async () => {
    await render(1000);
    await click('calibration.guided.start');
    await click('calibration.guided.released.capture');
    status.connected = false;
    await render();
    await act(() => vi.advanceTimersByTime(1000));
    expect(dialog().textContent).toContain('calibration.guided.noise.interrupted');
    expect(dialog().textContent).toContain('calibration.guided.released.title');
    status.connected = true;
    await render(2000);
    await click('calibration.guided.released.capture');
    await act(() => vi.advanceTimersByTime(1000));
    await render(60000);
    await click('calibration.guided.pressed.capture');
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ ...mapping, min: 2000, max: 60000 });
  });

  it('cancels a running measurement without advancing or retaining samples', async () => {
    await render();
    await click('calibration.guided.start');
    await click('calibration.guided.released.capture');
    await click('common.cancel');
    await act(() => vi.advanceTimersByTime(1000));
    expect(document.body.textContent).not.toContain('calibration.guided.pressed.title');
    expect(dispatch).not.toHaveBeenCalled();
    await capture(2000, 60000);
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ ...mapping, min: 2000, max: 60000 });
  });

  it.each([
    { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
    { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt },
  ])('calibrates both directions and neutral for %j', async (output) => {
    const current = { ...mapping, mapping: output };
    await render(60000, current);
    await click('calibration.guided.start');
    await click('calibration.guided.low.capture');
    await render(1000, current);
    await click('calibration.guided.high.capture');
    expect(dispatch).not.toHaveBeenCalled();
    await render(30000, current);
    await click('calibration.guided.neutral.capture');
    await render(29900, current);
    await act(() => vi.advanceTimersByTime(999));
    await render(30200, current);
    expect(dialog().textContent).toContain('.neutral.title');
    await act(() => vi.advanceTimersByTime(1));
    expect(dialog().textContent).toContain('calibration.center: 30050');
    expect(dialog().textContent).toContain('calibration.deadzone: 151');
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      ...current,
      min: 60000,
      max: 1000,
      center: 30050,
      deadzone: 151,
    });
  });

  it('can turn off centre noise compensation while keeping the measured centre', async () => {
    const current = {
      ...mapping,
      mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY },
    };
    await render(1000, current);
    await click('calibration.guided.start');
    await click('calibration.guided.low.capture');
    await render(60000, current);
    await click('calibration.guided.high.capture');
    await render(20000, current);
    await click('calibration.guided.neutral.capture');
    await act(() => vi.advanceTimersByTime(1000));
    await act(() => dialog().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await click('calibration.guided.apply');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      ...current,
      min: 1000,
      max: 60000,
      center: 20000,
      deadzone: 0,
    });
  });

  it.each([1000, 60000, 65000])('rejects neutral %i outside or at an endpoint', async (neutral) => {
    const current = {
      ...mapping,
      mapping: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt },
    };
    await render(1000, current);
    await click('calibration.guided.start');
    await click('calibration.guided.low.capture');
    await render(60000, current);
    await click('calibration.guided.high.capture');
    await render(neutral, current);
    await click('calibration.guided.neutral.capture');
    await act(() => vi.advanceTimersByTime(1000));
    expect(dialog().textContent).toContain('calibration.guided.neutral.invalid');
    expect(button('calibration.guided.apply').disabled).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('previews the pending trigger calibration live without applying it', async () => {
    await capture(1000, 61000);
    expect(dialog().textContent).not.toContain('calibration.rawValue');
    expect(dialog().textContent).toContain('calibration.value');
    await render(31000);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('32767');
    await render(500);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('0');
    await render(65000);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('65535');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('previews inverted centred calibration and changes with noise compensation', async () => {
    const current = {
      ...mapping,
      mapping: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX },
    };
    await render(60000, current);
    await click('calibration.guided.start');
    await click('calibration.guided.low.capture');
    await render(1000, current);
    await click('calibration.guided.high.capture');
    await render(30000, current);
    await click('calibration.guided.neutral.capture');
    await render(30200, current);
    await act(() => vi.advanceTimersByTime(1000));
    await render(30150, current);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('32767');
    await act(() => dialog().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    expect(Number(dialog().querySelector('.mantine-Progress-label')?.textContent)).toBeLessThan(
      32767
    );
    await render(60000, current);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('0');
    await render(1000, current);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('65535');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('previews the output section rather than full trigger travel', async () => {
    const current = { ...mapping, section: proto.AxisSection.AxisSectionNegative };
    await render(1000, current);
    await click('calibration.guided.start');
    await click('calibration.guided.released.capture');
    await act(() => vi.advanceTimersByTime(1000));
    await render(61000, current);
    await click('calibration.guided.pressed.capture');
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('0');
    await render(1000, current);
    expect(dialog().querySelector('.mantine-Progress-label')?.textContent).toBe('32767');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    { output: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX }, kind: 'stickX' },
    { output: { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickX }, kind: 'stickX' },
    { output: { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickY }, kind: 'stickY' },
    { output: { gamepadAxis: proto.GamepadAxisType.Gamepad_RightStickY }, kind: 'stickY' },
    { output: { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Tilt }, kind: 'tilt' },
    { output: { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Tilt }, kind: 'tilt' },
    {
      output: { ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Tilt },
      kind: 'tilt',
    },
    { output: { proAxis: proto.ProGuitarAxisType.ProGuitar_Tilt }, kind: 'tilt' },
    { output: { wheelAxis: proto.WheelAxisType.Wheel_Steering }, kind: 'steering' },
    { output: { djhAxis: proto.DJHTurntableAxisType.DJHTurntable_Crossfader }, kind: 'crossfader' },
  ])('uses $kind wording throughout calibration', async ({ output, kind }) => {
    const current = { ...mapping, mapping: output };
    const prefix = `calibration.guided.axes.${kind}`;
    await render(1000, current);
    await click('calibration.guided.start');
    expect(dialog().textContent).toContain(`${prefix}.low.label`);
    expect(dialog().textContent).toContain(`${prefix}.high.label`);
    expect(dialog().textContent).toContain(`${prefix}.low.title`);
    expect(dialog().textContent).toContain(`${prefix}.low.description`);
    await click(`${prefix}.low.capture`);
    await render(60000, current);
    expect(dialog().textContent).toContain(`${prefix}.high.title`);
    expect(dialog().textContent).toContain(`${prefix}.high.description`);
    await click(`${prefix}.high.capture`);
    await render(30000, current);
    expect(dialog().textContent).toContain(`${prefix}.neutral.title`);
    await click(`${prefix}.neutral.capture`);
    await act(() => vi.advanceTimersByTime(1000));
    expect(dialog().textContent).toContain(`${prefix}.low.label: 1000`);
    expect(dialog().textContent).toContain(`${prefix}.high.label: 60000`);
    expect(dialog().textContent).not.toContain('calibration.guided.low.label');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
