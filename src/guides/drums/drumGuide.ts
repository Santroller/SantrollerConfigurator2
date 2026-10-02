import { GuideDefinition } from '../types';
import { DrumIntroStep, DrumPadWiringStep, DrumReviewStep } from './drumGuideSteps';

export const DRUM_KIT_GUIDE: GuideDefinition = {
  id: 'drum-kit',
  title: 'Drum Kit & E-Drums (Piezo & Multiplexer)',
  subtitle: 'Velocity-Sensitive Drum Kit with Multiplexers',
  description:
    'Build a custom velocity-sensitive electronic drum kit or rewire an existing Rock Band or Guitar Hero kit to a Raspberry Pi Pico.',
  category: 'drums',
  difficulty: 'advanced',
  estimatedTime: '1 - 2 hours',
  badge: 'Velocity Sensing',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'Piezo Electric Sensors',
    '1MΩ Resistors',
    '3.3V Zener Diodes',
    '74HC4051 / 74HC4067 Multiplexer',
  ],
  steps: [
    {
      id: 'drum-intro',
      title: 'Supplies & Architecture',
      shortTitle: 'Supplies',
      description: 'Understanding piezos, multiplexers, and 3.3V zener diodes.',
      render: DrumIntroStep,
    },
    {
      id: 'drum-wiring',
      title: 'Pad Wiring & Triggers',
      shortTitle: 'Pad Wiring',
      description: 'Wire piezos with pull-down resistors and protection diodes.',
      badge: 'Piezos',
      render: DrumPadWiringStep,
    },
    {
      id: 'drum-test',
      title: 'Live Test & Save',
      shortTitle: 'Test & Save',
      description: 'Calibrate strike threshold and save drum kit firmware.',
      badge: 'Save to Pico',
      render: DrumReviewStep,
    },
  ],
};
