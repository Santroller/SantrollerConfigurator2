import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CRC32 } from '@/CRC32.js';
import { proto } from './config';
import { stopKeepaliveTimer } from './keepaliveTimer';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null });
});

const { initialConfig, useConfigStore } = await import('./SettingsContext');

function featureReport(id: number, payload: Uint8Array) {
  const bytes = new Uint8Array(payload.length + 1);
  bytes[0] = id;
  bytes.set(payload, 1);
  return new DataView(bytes.buffer);
}

describe('one-time UF2 migration for image verification', () => {
  const receiveFeatureReport = vi.fn<HIDDevice['receiveFeatureReport']>();
  const sendFeatureReport = vi.fn<HIDDevice['sendFeatureReport']>();
  const device: Partial<HIDDevice> = {
    opened: true,
    addEventListener: vi.fn(),
    receiveFeatureReport,
    sendFeatureReport,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sendFeatureReport.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => 'newbuild' }));
    useConfigStore.setState({ ...initialConfig });
  });

  afterEach(() => {
    stopKeepaliveTimer(useConfigStore.getState().keepaliveTimeout);
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useConfigStore.setState({ ...initialConfig });
  });

  it.each([
    { build: undefined, firmwareVerification: undefined, needsUf2: true },
    { build: undefined, firmwareVerification: false, needsUf2: true },
    { build: undefined, firmwareVerification: true, needsUf2: false },
    { build: 3492, firmwareVerification: undefined, needsUf2: true },
    { build: 3493, firmwareVerification: undefined, needsUf2: false },
    { build: 3494, firmwareVerification: true, needsUf2: false },
    { build: 3494, firmwareVerification: false, needsUf2: true },
  ])(
    'uses installed build $build and capability $firmwareVerification (UF2=$needsUf2)',
    async ({ build, firmwareVerification, needsUf2 }) => {
      const data = new Uint8Array();
      const info = proto.ConfigInfo.encode({
        dataSize: 0,
        mainSize: 0,
        auxSize: 0,
        dataCrc: new CRC32().calculate(data),
        magic: 0x53414e54,
        firmwareVerification,
      }).finish();
      receiveFeatureReport.mockImplementation(async (id) => {
        switch (id) {
          case proto.ReportId.ReportIdGetVersion: {
            const version = new Uint8Array(14);
            version.set(new TextEncoder().encode('oldbuild\0'));
            new DataView(version.buffer).setUint32(10, build ?? 0, true);
            return featureReport(id, version);
          }
          case proto.ReportId.ReportIdGetType:
            return featureReport(id, new TextEncoder().encode('pico_w_compat\0'));
          case proto.ReportId.ReportIdGetActiveProfiles:
            return featureReport(id, proto.GetActiveProfiles.encodeDelimited({}).finish());
          case proto.ReportId.ReportIdConfigInfo:
          case proto.ReportId.ReportIdConfigInfoSaved:
            return featureReport(id, info);
          default:
            throw new Error(`Unexpected report ${id}`);
        }
      });
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await useConfigStore.getState().connectDevice(device as HIDDevice);

      const state = useConfigStore.getState();
      expect(state.configLoadError).toBeNull();
      expect(state.firmwareBuild).toBe(build);
      expect(state.firmwareVerificationMissing).toBe(needsUf2);
      expect(state.needsUf2Update).toBe(needsUf2);
    }
  );

  it('refuses direct OTA calls when verification is missing', async () => {
    useConfigStore.setState({
      hidDevice: device as HIDDevice,
      connected: true,
      firmwareVerificationMissing: true,
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useConfigStore.getState().firmwareUpdate();
    expect(error).toHaveBeenCalledWith('Firmware update requires a UF2 instead of OTA');
    expect(fetch).not.toHaveBeenCalled();
    expect(sendFeatureReport).not.toHaveBeenCalled();
    expect(useConfigStore.getState().updating).toBe(false);
  });
});
