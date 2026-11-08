import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { Uf2UpdateAlert } from './Uf2UpdateAlert';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('UF2 update alert', () => {
  it('shows the reason and the UF2 downloads', () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Uf2UpdateAlert />
      </MantineProvider>
    );
    expect(html).toContain('connect.uf2RequiredTitle');
    expect(html).toContain('connect.uf2Required');
    expect(html).toContain('santroller_pico1.uf2');
    expect(html).toContain('santroller_pico2.uf2');
  });
});
