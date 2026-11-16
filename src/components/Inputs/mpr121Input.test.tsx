import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Select } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { DropdownBox } from './DropdownBox';
import { RegisteredInputEditor } from './InputEditorRegistry';
import {
  createDeviceInput,
  getInputDeviceId,
  inputUsesDevice,
  isAnalogInput,
} from './inputRegistry';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@mantine/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mantine/core')>()),
  Select: vi.fn(() => null),
}));

// The accelerometer editor reads the store, which these editors don't need
vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: vi.fn(() => undefined),
}));

vi.mock('./DropdownBox', () => ({
  DropdownBox: vi.fn(() => null),
}));

beforeEach(() => vi.clearAllMocks());

const touchInput: proto.IMPR121Input = {
  deviceid: 7,
  pin: 2,
  mode: proto.Mpr121PinMode.Touch,
  pinMode: proto.PinMode.PullUp,
};

function renderEditor(mpr121: proto.IMPR121Input) {
  const dispatch = vi.fn();
  renderToStaticMarkup(
    <MantineProvider>
      <RegisteredInputEditor input={{ mpr121 }} dispatch={dispatch} />
    </MantineProvider>
  );
  return dispatch;
}

describe('MPR121 input creation', () => {
  it.each([
    { axis: false, button: true },
    { axis: true, button: false },
    { axis: false, button: false },
  ])('creates a touch input for capabilities %j', (capabilities) => {
    const input = createDeviceInput('mpr121', 7, capabilities);
    expect(input).toEqual({ mpr121: { ...touchInput, pin: 0 } });
    expect(proto.Input.decode(proto.Input.encode(input!).finish()).mpr121).toMatchObject(
      input!.mpr121!
    );
    expect(getInputDeviceId(input!)).toBe(7);
    expect(inputUsesDevice(input!, 7)).toBe(true);
    expect(inputUsesDevice(input!, 8)).toBe(false);
    expect(isAnalogInput(input!)).toBe(false);
  });
});

describe('MPR121 input editor', () => {
  it('renders existing touch inputs and edits all twelve electrodes', () => {
    const dispatch = renderEditor(touchInput);
    const [mode] = vi.mocked(DropdownBox).mock.calls[0];
    expect(mode.e).toBe(proto.Mpr121PinMode);
    expect(mode.val).toBe(proto.Mpr121PinMode.Touch);
    expect(vi.mocked(Select)).toHaveBeenCalledTimes(1);
    const [electrode] = vi.mocked(Select).mock.calls[0];
    expect(electrode.value).toBe('2');
    expect(electrode.data).toEqual(
      Array.from({ length: 12 }, (_, pin) => ({
        value: `${pin}`,
        label: 'leds.mpr121_electrode',
      }))
    );
    electrode.onChange!('11', { value: '11', label: 'Electrode 11' });
    expect(dispatch).toHaveBeenLastCalledWith({ mpr121: { ...touchInput, pin: 11 } });
  });

  it.each([0, 2, 4, 11])('switches electrode %i to a GPIO-capable electrode', (pin) => {
    const dispatch = renderEditor({ ...touchInput, pin });
    const [mode] = vi.mocked(DropdownBox).mock.calls[0];
    mode.dispatch(proto.Mpr121PinMode.Digital);
    expect(dispatch).toHaveBeenCalledWith({
      mpr121: { ...touchInput, pin: Math.max(4, pin), mode: proto.Mpr121PinMode.Digital },
    });
  });

  it('limits GPIO electrodes and offers only supported pull modes', () => {
    const digital = { ...touchInput, pin: 6, mode: proto.Mpr121PinMode.Digital };
    const dispatch = renderEditor(digital);
    const [[electrode], [pull]] = vi.mocked(Select).mock.calls;
    expect(electrode.value).toBe('6');
    expect(electrode.data).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        value: `${index + 4}`,
        label: 'leds.mpr121_electrode',
      }))
    );
    electrode.onChange!('4', { value: '4', label: 'Electrode 4' });
    expect(dispatch).toHaveBeenLastCalledWith({ mpr121: { ...digital, pin: 4 } });
    expect(pull.value).toBe(`${proto.PinMode.PullUp}`);
    expect(pull.data).toEqual(
      [proto.PinMode.PullUp, proto.PinMode.PullDown, proto.PinMode.Floating].map((pinMode) => ({
        value: `${pinMode}`,
        label: `gpio.mode.${proto.PinMode[pinMode]}`,
      }))
    );
    for (const pinMode of [proto.PinMode.PullUp, proto.PinMode.PullDown, proto.PinMode.Floating]) {
      pull.onChange!(`${pinMode}`, { value: `${pinMode}`, label: '' });
      expect(dispatch).toHaveBeenLastCalledWith({ mpr121: { ...digital, pinMode } });
    }
  });

  it('preserves the electrode and pull setting when switching back to touch', () => {
    const digital = {
      ...touchInput,
      pin: 8,
      mode: proto.Mpr121PinMode.Digital,
      pinMode: proto.PinMode.PullDown,
    };
    const dispatch = renderEditor(digital);
    const [mode] = vi.mocked(DropdownBox).mock.calls[0];
    mode.dispatch(proto.Mpr121PinMode.Touch);
    expect(dispatch).toHaveBeenCalledWith({
      mpr121: { ...digital, mode: proto.Mpr121PinMode.Touch },
    });
  });
});
