import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { LegendMode, SantrollerLabel, SantrollerMapping } from './Inputs.page';

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const testState = vi.hoisted(() => ({ simpleMode: true }));

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: (() => {
    const state = {
      deviceStatus: {
        1: { type: 'matrix', device: { deviceid: 1, matrix: { inPins: 1, outPins: 2 } } },
        5: { type: 'cycle', device: { deviceid: 5, cycle: { values: [6400, 19456, 38400] } } },
      },
      guiDevices: {},
      simpleMode: true,
      mappingStatus: [[{ stateRaw: 10000, state: 10000 }]],
      selectedDevice: [],
      usbDevices: {},
      config: { profiles: [], xboxOneLegacyAdapter: false },
      detectPins: false,
      detected: -1,
      currentProfile: 0,
    };
    const getState = () => ({ ...state, simpleMode: testState.simpleMode });
    return Object.assign((selector: (state: unknown) => unknown) => selector(getState()), {
      getState,
      setState: vi.fn(),
    });
  })(),
  requiresAssignment: () => false,
  isDeviceAssigned: () => true,
  DeviceStatus: { pins: () => [], label: () => '' },
}));

const renderLabel = (input: proto.IInput) =>
  renderToStaticMarkup(
    <MantineProvider>
      <SantrollerLabel input={input} label="RockBandGuitar_Red" />
    </MantineProvider>
  );

describe('input labels with overlapping slot and physical device ids', () => {
  it('does not read matrix fields for a USB host slot with the same id', () => {
    expect(
      renderLabel({
        usbButton: {
          deviceid: 1,
          button: { rbButton: proto.RockBandGuitarButtonType.RockBandGuitar_Red },
        },
      })
    ).toContain('outputs.RockBandGuitar_Red');
  });

  it('still shows the physical matrix pin pair', () => {
    expect(renderLabel({ matrix: { deviceid: 1, pin: 14, outputPin: 10 } })).toContain('14: 10');
  });
});

const renderMapping = (
  output: proto.IOutput,
  section?: proto.AxisSection,
  deadzone = 1000,
  settings: Partial<proto.IMapping> = {},
  input: proto.IInput = {
    gpio: { pin: 26, pinMode: proto.PinMode.Floating, analog: true },
  }
) =>
  renderToStaticMarkup(
    <MantineProvider>
      <SantrollerMapping
        mapping={{
          input,
          mapping: output,
          min: 0,
          max: 65535,
          center: 32767,
          deadzone,
          section,
          ...settings,
        }}
        type={proto.SubType.Gamepad}
        profileIdx={0}
        mappingIdx={0}
        mode={proto.FaceButtonMappingMode.LegendBased}
        legendMode={LegendMode.Xbox360}
        dispatch={vi.fn()}
        deleteInput={vi.fn()}
        copyInput={vi.fn()}
        expanded
        onToggleExpanded={vi.fn()}
      />
    </MantineProvider>
  );

describe('axis deadzone controls', () => {
  it.each([
    { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
    { rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Whammy },
    { ghlAxis: proto.GuitarHeroLiveGuitarAxisType.GuitarHeroLiveGuitar_Whammy },
    { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftTrigger },
    { gamepadAxis: proto.GamepadAxisType.Gamepad_RightTrigger },
    { wheelAxis: proto.WheelAxisType.Wheel_Brake },
  ])('hides the deadzone for trigger output %j', (output) => {
    const html = renderMapping(output);
    expect(html).toContain('calibration.released');
    expect(html).toContain('calibration.pressed');
    expect(html).toContain('calibration.guided.start');
    expect(html).not.toContain('calibration.min');
    expect(html).not.toContain('calibration.max');
    expect(html).not.toContain('calibration.deadzone');
    expect(html).toBe(renderMapping(output, undefined, 0));
  });

  it('uses pickup notch calibration without standard axis range controls', () => {
    testState.simpleMode = false;
    try {
      const html = renderMapping(
        {
          rbAxis: proto.RockBandGuitarAxisType.RockBandGuitar_Pickup,
        },
        undefined,
        1000,
        { pickupThresholds: [10000, 20000, 30000, 40000] }
      );

      expect(html).not.toContain('pickup.current');
      expect(html).toContain('pickup.custom.label');
      expect(html).toContain('pickup.threshold');
      const element = document.createElement('div');
      element.innerHTML = html;
      const barText = (label: string) =>
        Array.from(element.querySelectorAll('label')).find(
          (element) => element.textContent === label
        )?.nextElementSibling?.textContent;
      // The live value of 10000 is in the first notch, which is shown instead of the number
      expect(barText('calibration.value')).toBe('pickup.notch.0');
      // The raw value stays visible, as a reference for setting the notch thresholds
      expect(barText('calibration.rawValue')).toBe('10000');
      expect(html).not.toContain('axis.section.label');
      expect(html).not.toContain('calibration.min');
      expect(html).not.toContain('calibration.max');
      expect(html).not.toContain('calibration.guided.start');
      expect(html).not.toContain('calibration.deadzone');
    } finally {
      testState.simpleMode = true;
    }
  });

  it('keeps the deadzone for a full stick but hides it for a section', () => {
    const output = { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX };
    const stick = renderMapping(output);
    expect(stick).toContain('calibration.deadzone');
    expect(stick).toContain('calibration.min');
    expect(stick).toContain('calibration.max');
    expect(stick).toContain('calibration.guided.start');
    const section = renderMapping(output, proto.AxisSection.AxisSectionPositive);
    expect(section).not.toContain('calibration.deadzone');
    expect(section).toContain('calibration.released');
    expect(section).toContain('calibration.pressed');
  });

  it('uses released and pressed labels for an inverted trigger without swapping its values', () => {
    const html = renderMapping(
      { ghAxis: proto.GuitarHeroGuitarAxisType.GuitarHeroGuitar_Whammy },
      undefined,
      0,
      { min: 60000, max: 10000 }
    );
    const element = document.createElement('div');
    element.innerHTML = html;
    const labels = Array.from(element.querySelectorAll('p'));
    for (const [label, value] of [
      ['calibration.released', '60000'],
      ['calibration.pressed', '10000'],
    ]) {
      const heading = labels.find((element) => element.textContent === label);
      expect(heading).toBeDefined();
      expect(heading?.nextElementSibling?.querySelector('input')?.value).toBe(value);
    }
  });

  it.each([
    { min: 10000, max: 60000 },
    { min: 60000, max: 10000 },
  ])('ignores saved deadzones in rapid-trigger travel %j', (range) => {
    const output = { gamepadButton: proto.GamepadButtonType.Gamepad_A };
    const settings = {
      ...range,
      rapidTrigger: { downSensitivity: 3000, upSensitivity: 3000 },
    };
    const html = renderMapping(output, undefined, 1000, settings);
    expect(html).toContain('rapidTrigger.min');
    expect(html).not.toContain('calibration.guided.start');
    expect(html).not.toContain('calibration.deadzone');
    expect(html).toBe(renderMapping(output, undefined, 0, settings));
  });
});

describe('virtual selector analog stepping triggers', () => {
  const renderCycleMapping = (analog: boolean, output: proto.IOutput) =>
    renderMapping(
      output,
      undefined,
      1000,
      {},
      {
        cycle: {
          deviceid: 5,
          input: {
            gpio: { pin: 26, pinMode: proto.PinMode.Floating, analog },
          },
        },
      }
    );

  it('does not show an Active on picker for a virtual selector axis mapping', () => {
    testState.simpleMode = false;
    try {
      const html = renderCycleMapping(true, {
        gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX,
      });
      expect(html).not.toContain('cycle.mapping_value');
    } finally {
      testState.simpleMode = true;
    }
  });

  it('keeps the Active on picker for a virtual selector button mapping', () => {
    testState.simpleMode = false;
    try {
      expect(
        renderCycleMapping(true, { gamepadButton: proto.GamepadButtonType.Gamepad_A })
      ).toContain('cycle.mapping_value');
    } finally {
      testState.simpleMode = true;
    }
  });

  it('does not show trigger settings for a digital forward input', () => {
    expect(
      renderCycleMapping(false, { gamepadAxis: proto.GamepadAxisType.Gamepad_LeftStickX })
    ).not.toContain('trigger_type.label');
  });
});
