import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proto } from './config';
import { savedSellerConfig } from './savedConfigFields';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null });
});

const { initialConfig, useConfigStore } = await import('./SettingsContext');

describe('saving seller-only changes', () => {
  const sendFeatureReport = vi.fn<HIDDevice['sendFeatureReport']>();
  const device: Partial<HIDDevice> = { sendFeatureReport };

  beforeEach(() => {
    sendFeatureReport.mockReset().mockResolvedValue(undefined);
    useConfigStore.setState({
      ...initialConfig,
      config: proto.Config.create({}),
      connected: true,
      hidDevice: device as HIDDevice,
      toolInfo: undefined,
      savedConfig: proto.Config.encode({}).finish(),
    });
  });

  afterEach(() => {
    const timeout = useConfigStore.getState().writeTimeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    useConfigStore.setState({ ...initialConfig, writeTimeout: undefined });
  });

  it.each(['name', 'logo', 'favicon'] as const)(
    'keeps a saved seller %s on subsequent live writes',
    async (field) => {
      const original = {
        name: 'Old Tool',
        logo: new Uint8Array([1]),
        favicon: new Uint8Array([2]),
      };
      useConfigStore.setState({
        savedConfig: proto.Config.encode({
          guiConfig: [{ deviceid: 0, seller: original }],
        }).finish(),
        toolInfo: {
          ...original,
          [field]: field === 'name' ? 'New Tool' : new Uint8Array([3, 4]),
        },
      });
      const expected = useConfigStore.getState().toolInfo!;
      await useConfigStore.getState().commitConfig();
      expect(savedSellerConfig(useConfigStore.getState().savedConfig)).toMatchObject(expected);
      expect(useConfigStore.getState().configModified).toBe(false);
      const live = useConfigStore.getState().buildConfigBuffer(false, false);
      expect(savedSellerConfig(live.buffer.slice(0, live.mainLen))).toMatchObject(expected);
      expect(useConfigStore.getState().configModified).toBe(false);
    }
  );

  it('records the exact main config sent before the save command', async () => {
    useConfigStore.setState({
      toolInfo: { name: 'New Tool', logo: new Uint8Array([1]), favicon: new Uint8Array([2]) },
      config: proto.Config.create({ deviceName: 'My Guitar', manufacturerName: 'My Company' }),
    });
    await useConfigStore.getState().commitConfig();
    const calls = sendFeatureReport.mock.calls;
    const infoCall = calls.find(([id]) => id === proto.ReportId.ReportIdConfigInfo)!;
    const info = proto.ConfigInfo.decodeDelimited(new Uint8Array(infoCall[1] as ArrayBuffer));
    const chunks = calls.filter(([id]) => id === proto.ReportId.ReportIdConfig);
    const uploaded = new Uint8Array(chunks.length * 63);
    chunks.forEach(([, data], i) => uploaded.set(new Uint8Array(data as ArrayBuffer), i * 63));
    expect(useConfigStore.getState().savedConfig).toEqual(uploaded.slice(0, info.mainSize));
    const saved = proto.Config.decode(useConfigStore.getState().savedConfig);
    expect(saved.deviceName).toBe('My Guitar');
    expect(saved.manufacturerName).toBe('My Company');
    const [lastReportId, lastReport] = calls[calls.length - 1];
    expect(lastReportId).toBe(proto.ReportId.ReportIdCommand);
    expect(
      proto.Command.decodeDelimited(new Uint8Array(lastReport as ArrayBuffer)).save
    ).toBeTruthy();
  });

  it('uploads all image bytes when only a logo or favicon changes', async () => {
    const original = {
      name: 'Seller Tool',
      logo: new Uint8Array(8192).fill(1),
      favicon: new Uint8Array(4096).fill(2),
    };
    useConfigStore.setState({ toolInfo: original });
    await useConfigStore.getState().commitConfig();
    sendFeatureReport.mockClear();
    const changed = {
      ...original,
      logo: new Uint8Array(8192).fill(3),
      favicon: new Uint8Array(4096).fill(4),
    };
    useConfigStore.setState({ toolInfo: changed });
    await useConfigStore.getState().commitConfig();
    const calls = sendFeatureReport.mock.calls;
    const infoCall = calls.find(([id]) => id === proto.ReportId.ReportIdConfigInfo)!;
    const info = proto.ConfigInfo.decodeDelimited(new Uint8Array(infoCall[1] as ArrayBuffer));
    const chunks = calls.filter(([id]) => id === proto.ReportId.ReportIdConfig);
    const uploaded = new Uint8Array(chunks.length * 63);
    chunks.forEach(([, data], i) => uploaded.set(new Uint8Array(data as ArrayBuffer), i * 63));
    expect(uploaded.slice(0, info.mainSize)).toEqual(useConfigStore.getState().savedConfig);
    expect(savedSellerConfig(uploaded.slice(0, info.mainSize))).toMatchObject(changed);
    expect(chunks.length).toBe(Math.ceil(info.dataSize / 63));
  });

  it.each(['deviceName', 'manufacturerName'] as const)(
    'includes a deferred %s edit even when nothing else changes',
    async (field) => {
      useConfigStore.setState({
        config: proto.Config.create({ [field]: 'Original' }),
      });
      await useConfigStore.getState().commitConfig();
      sendFeatureReport.mockClear();
      useConfigStore.setState({
        config: proto.Config.create({ [field]: 'Edited' }),
      });
      await useConfigStore.getState().saveConfig(true);
      expect(sendFeatureReport).not.toHaveBeenCalled();
      expect(proto.Config.decode(useConfigStore.getState().savedConfig)[field]).toBe('Original');
      await useConfigStore.getState().commitConfig();
      expect(proto.Config.decode(useConfigStore.getState().savedConfig)[field]).toBe('Edited');
      expect(
        sendFeatureReport.mock.calls.some(([id]) => id === proto.ReportId.ReportIdConfig)
      ).toBe(true);
    }
  );

  it('saves seller-only edits after the live write deferred them', async () => {
    useConfigStore.setState({ toolInfo: { name: 'Saved Tool', logo: new Uint8Array([1]) } });
    await useConfigStore.getState().commitConfig();
    sendFeatureReport.mockClear();
    useConfigStore.setState({
      lastUpdate: 0,
      toolInfo: { name: 'Edited Tool', logo: new Uint8Array([2]) },
    });
    await useConfigStore.getState().saveConfig(true);
    expect(sendFeatureReport).not.toHaveBeenCalled();
    expect(useConfigStore.getState().configModified).toBe(true);
    expect(savedSellerConfig(useConfigStore.getState().savedConfig)?.name).toBe('Saved Tool');
    await useConfigStore.getState().commitConfig();
    expect(savedSellerConfig(useConfigStore.getState().savedConfig)?.name).toBe('Edited Tool');
    expect(useConfigStore.getState().configModified).toBe(false);
    useConfigStore.setState({
      config: proto.Config.create({ deviceName: 'Another option' }),
    });
    const uploaded = await useConfigStore.getState().saveConfig(true);
    expect(uploaded).not.toBe(false);
    if (uploaded !== false) {
      expect(savedSellerConfig(uploaded)?.name).toBe('Edited Tool');
    }
  });

  it('keeps edits made during a save dirty instead of marking them as saved', async () => {
    useConfigStore.setState({ toolInfo: { name: 'First Tool', logo: new Uint8Array([1]) } });
    sendFeatureReport.mockImplementationOnce(async () => {
      useConfigStore.setState({ toolInfo: { name: 'Second Tool', logo: new Uint8Array([2]) } });
    });
    await useConfigStore.getState().commitConfig();
    expect(savedSellerConfig(useConfigStore.getState().savedConfig)?.name).toBe('First Tool');
    expect(useConfigStore.getState().toolInfo?.name).toBe('Second Tool');
    expect(useConfigStore.getState().configModified).toBe(true);
  });

  it('preserves the saved baseline when no upload is needed', async () => {
    useConfigStore.setState({ toolInfo: { name: 'New Tool', logo: new Uint8Array([1]) } });
    await useConfigStore.getState().commitConfig();
    sendFeatureReport.mockClear();
    await useConfigStore.getState().commitConfig();
    expect(sendFeatureReport).toHaveBeenCalledTimes(1);
    expect(sendFeatureReport.mock.calls[0][0]).toBe(proto.ReportId.ReportIdCommand);
    expect(savedSellerConfig(useConfigStore.getState().savedConfig)?.name).toBe('New Tool');
    expect(useConfigStore.getState().configModified).toBe(false);
  });

  it('rejects saves without a connected device', async () => {
    useConfigStore.setState({ hidDevice: undefined, connected: false });
    await expect(useConfigStore.getState().commitConfig()).rejects.toThrow('connected device');
    expect(sendFeatureReport).not.toHaveBeenCalled();
  });

  it('does not mark the configuration saved when the save command fails', async () => {
    useConfigStore.setState({ toolInfo: { name: 'New Tool', logo: new Uint8Array([1]) } });
    sendFeatureReport.mockImplementation(async (reportId) => {
      if (reportId === proto.ReportId.ReportIdCommand) {
        throw new Error('Save failed');
      }
    });
    await expect(useConfigStore.getState().commitConfig()).rejects.toThrow('Save failed');
    expect(savedSellerConfig(useConfigStore.getState().savedConfig)).toBeUndefined();
    expect(useConfigStore.getState().configModified).toBe(true);
  });

  it('does not claim a failed upload was saved', async () => {
    useConfigStore.setState({ toolInfo: { name: 'New Tool', logo: new Uint8Array([1]) } });
    sendFeatureReport.mockRejectedValueOnce(new Error('Device unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(useConfigStore.getState().commitConfig()).rejects.toThrow();
      expect(savedSellerConfig(useConfigStore.getState().savedConfig)).toBeUndefined();
      expect(useConfigStore.getState().configModified).toBe(true);
    } finally {
      consoleError.mockRestore();
    }
  });
});
