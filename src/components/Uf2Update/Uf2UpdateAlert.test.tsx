import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { Uf2UpdateAlert } from './Uf2UpdateAlert';

const state = vi.hoisted(() => ({
  bootloaderOutdated: false,
  slowBootStage: false,
  firmwareVerificationMissing: true,
}));

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('verification UF2 update alert', () => {
  it('shows the verification reason and existing UF2 downloads', () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Uf2UpdateAlert />
      </MantineProvider>
    );
    expect(html).toContain('connect.firmwareVerificationTitle');
    expect(html).toContain('connect.firmwareVerification');
    expect(html).toContain('santroller_pico1.uf2');
    expect(html).toContain('santroller_pico2.uf2');
    expect(html).not.toContain('connect.missingDongleFirmware');
  });
});
