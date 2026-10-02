import { GuideDefinition } from '../types';
import { PS2IntroStep, PS2ReviewStep, PS2WiringStep } from './ps2AdapterGuideSteps';

export const PS2_ADAPTER_GUIDE: GuideDefinition = {
  id: 'ps2-adapter',
  title: 'PS2 Controller & Guitar to USB Adapter',
  subtitle: 'SPI Bus Adapter for DualShock 2 & PS2 Guitars',
  description:
    'Convert any original Sony PlayStation 1 or 2 gamepad, arcade stick, or Guitar Hero guitar to USB using a Raspberry Pi Pico.',
  category: 'adapters',
  difficulty: 'intermediate',
  estimatedTime: '30 - 45 mins',
  badge: 'Low Latency',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'PS2 Controller Socket',
    '2x 1kΩ Resistors',
    'Soldering Iron & Wire',
  ],
  steps: [
    {
      id: 'ps2-intro',
      title: 'Supplies & Overview',
      shortTitle: 'Supplies',
      description: 'PS2 socket pinout and required 1kΩ pull-up resistors.',
      render: PS2IntroStep,
    },
    {
      id: 'ps2-wiring',
      title: 'Wiring & Configuration',
      shortTitle: 'Wiring',
      description: 'Solder SCK, MOSI, MISO, ATT, ACK, and power lines.',
      badge: 'SPI Bus',
      render: PS2WiringStep,
    },
    {
      id: 'ps2-test',
      title: 'Live Test & Save',
      shortTitle: 'Test & Save',
      description: 'Test buttons and thumbsticks, then save adapter firmware.',
      badge: 'Save to Pico',
      render: PS2ReviewStep,
    },
  ],
};
