import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proto } from './config';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null });
});

const { initialConfig, useConfigStore } = await import('./SettingsContext');
const refreshActiveProfiles = useConfigStore.getState().refreshActiveProfiles;

function report(event: proto.IEvent) {
  const bytes = Uint8Array.from(proto.EventList.encodeDelimited({ event: [event] }).finish());
  useConfigStore.getState().onReport({
    reportId: proto.ReportId.ReportIdConfig,
    data: new DataView(bytes.buffer),
  } as HIDInputReportEvent);
}

describe('firmware update isolation', () => {
  const sendFeatureReport = vi.fn<HIDDevice['sendFeatureReport']>();
  const receiveFeatureReport = vi.fn<HIDDevice['receiveFeatureReport']>();
  const device: Partial<HIDDevice> = { sendFeatureReport, receiveFeatureReport };

  beforeEach(() => {
    vi.clearAllMocks();
    useConfigStore.setState({
      ...initialConfig,
      hidDevice: device as HIDDevice,
      connected: true,
      updating: true,
      waitingForReload: true,
      refreshActiveProfiles,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useConfigStore.setState({ ...initialConfig, refreshActiveProfiles });
  });

  it.each([false, true])('ignores reload state changes during upload (waiting=%s)', (waiting) => {
    useConfigStore.setState({ waitingForReload: waiting });
    const refresh = vi.fn().mockResolvedValue(undefined);
    useConfigStore.setState({ refreshActiveProfiles: refresh });
    report({ reload: {} });
    expect(useConfigStore.getState().waitingForReload).toBe(waiting);
    report({ loaded: {} });
    expect(useConfigStore.getState().waitingForReload).toBe(waiting);
    expect(refresh).not.toHaveBeenCalled();
    expect(receiveFeatureReport).not.toHaveBeenCalled();
  });

  it('still handles reload notifications outside an update', () => {
    useConfigStore.setState({ updating: false, waitingForReload: false });
    const refresh = vi.fn().mockResolvedValue(undefined);
    useConfigStore.setState({ refreshActiveProfiles: refresh });
    report({ reload: {} });
    expect(useConfigStore.getState().waitingForReload).toBe(true);
    report({ loaded: {} });
    expect(useConfigStore.getState().waitingForReload).toBe(false);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('keeps firmware debug messages visible during an upload', () => {
    report({ console: { data: 'upload in progress' } });
    expect(useConfigStore.getState().console).toContain('upload in progress');
  });

  it('does not start background profile or pairing reads during an upload', async () => {
    await useConfigStore.getState().refreshActiveProfiles();
    await useConfigStore.getState().refreshBluetoothPairings();
    expect(receiveFeatureReport).not.toHaveBeenCalled();
    expect(sendFeatureReport).not.toHaveBeenCalled();
  });

  it('defers config saves without sending reports during an upload', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await useConfigStore.getState().saveConfig(true)).toBe(false);
    expect(useConfigStore.getState().pendingSave).toBe(true);
    expect(sendFeatureReport).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('Config write deferred during firmware update');
  });
});
