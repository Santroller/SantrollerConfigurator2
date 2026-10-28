import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { SantrollerLabel } from './Inputs.page';

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/SettingsContext/SettingsContext', () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      deviceStatus: {
        1: { type: 'matrix', device: { deviceid: 1, matrix: { inPins: 1, outPins: 2 } } },
      },
      guiDevices: {},
      config: { profiles: [], xboxOneLegacyAdapter: false },
    }),
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
