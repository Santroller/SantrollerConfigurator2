import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { Uf2UpdateAlert } from './Uf2UpdateAlert';

const state = vi.hoisted(() => ({
  bootloaderOutdated: false,
  uf2Required: true,
}));

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('UF2 update alert', () => {
  it('shows the too-old reason and existing UF2 downloads', () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Uf2UpdateAlert />
      </MantineProvider>
    );
    expect(html).toContain('connect.uf2RequiredTitle');
    expect(html).toContain('connect.uf2Required');
    expect(html).toContain('santroller_pico1.uf2');
    expect(html).toContain('santroller_pico2.uf2');
    expect(html).not.toContain('connect.missingDongleFirmware');
  });
});
