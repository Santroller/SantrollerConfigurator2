import { afterEach, describe, expect, it, vi } from 'vitest';
import { proto } from './config';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null });
});

const { initialConfig, useConfigStore } = await import('./SettingsContext');

describe('new configuration defaults', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    useConfigStore.setState({ ...initialConfig });
  });

  it('enables WLA for new configurations and serializes that choice', () => {
    expect(initialConfig.config.xboxOneLegacyAdapter).toBe(true);
    const saved = proto.Config.decode(proto.Config.encode(initialConfig.config).finish());
    expect(saved.xboxOneLegacyAdapter).toBe(true);
  });

  it.each([0, 1])('ignores the retired gamepad-support option with value %s', (value) => {
    const config = proto.Config.decode(new Uint8Array([0x50, 1, 0x58, value]));
    expect(config.xboxOneLegacyAdapter).toBe(true);
    expect(config.toJSON()).not.toHaveProperty('xboxOneLegacyAdapterGamepad');
    expect(Array.from(proto.Config.encode(config).finish())).toEqual([0x50, 1]);
  });

  it('enables WLA on factory reset while preserving peripheral boot settings', async () => {
    const peripheralBoot = { i2c: { block: 0, clock: 400000, sda: 0, scl: 1 }, idPin: 2 };
    useConfigStore.setState({
      config: proto.Config.create({ xboxOneLegacyAdapter: false, peripheralBoot }),
    });
    const replace = vi
      .spyOn(useConfigStore.getState(), 'replaceConfig')
      .mockResolvedValue(undefined);
    await useConfigStore.getState().factoryReset();
    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({ xboxOneLegacyAdapter: true, peripheralBoot }),
      expect.anything()
    );
  });

  it.each([false, null])('preserves an existing WLA setting of %s when loading', async (value) => {
    vi.useFakeTimers();
    vi.spyOn(useConfigStore.getState(), 'saveConfig').mockResolvedValue(false);
    vi.spyOn(useConfigStore.getState(), 'setActiveProfile').mockResolvedValue(undefined);
    const config = proto.Config.decode(
      proto.Config.encode({ xboxOneLegacyAdapter: value }).finish()
    );
    await useConfigStore.getState().replaceConfig(config, proto.AuxConfigBlock.create({}));
    expect(useConfigStore.getState().config.xboxOneLegacyAdapter).toBe(value);
    vi.clearAllTimers();
  });
});
