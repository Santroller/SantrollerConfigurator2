import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Switch } from '@mantine/core';
import type { proto } from '@/components/SettingsContext/config';
import { XboxOneLegacyAdapterSetting } from './XboxOneLegacyAdapterSetting';

const state = vi.hoisted(() => ({
  config: {} as proto.IConfig,
  updateConfig: vi.fn(),
  updateProfiles: vi.fn(),
}));

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: Object.assign((selector: (value: typeof state) => unknown) => selector(state), {
    getState: () => state,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@mantine/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mantine/core')>()),
  Switch: vi.fn(() => null),
}));

function toggle(checked: boolean) {
  renderToStaticMarkup(
    <MantineProvider>
      <XboxOneLegacyAdapterSetting />
    </MantineProvider>
  );
  const [props] = vi.mocked(Switch).mock.calls[0];
  const input = document.createElement('input');
  input.checked = checked;
  props.onChange!({ currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
}

const consoleType = { consoleType: {} };
const auth = { xboxOneAuth: {} };
const opts = {} as proto.IProfileOpts;

beforeEach(() => {
  vi.clearAllMocks();
  state.config = {
    profiles: [
      {
        opts,
        assignments: [{ assignments: [consoleType, auth] }, { assignments: [consoleType] }],
      },
    ],
  };
});

describe('WLA setting', () => {
  it('drops rules holding Xbox One auth when turned on', () => {
    toggle(true);
    expect(state.updateProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        assignments: [{ assignments: [consoleType] }, { assignments: [consoleType] }],
      }),
    ]);
    expect(state.updateConfig).toHaveBeenCalledWith({ xboxOneLegacyAdapter: true });
  });

  it('leaves the rules alone when turned off', () => {
    toggle(false);
    expect(state.updateProfiles).not.toHaveBeenCalled();
    expect(state.updateConfig).toHaveBeenCalledWith({ xboxOneLegacyAdapter: false });
  });

  it('only touches profiles when something holds auth', () => {
    state.config = { profiles: [{ opts, assignments: [{ assignments: [consoleType] }] }] };
    toggle(true);
    expect(state.updateProfiles).not.toHaveBeenCalled();
  });
});
