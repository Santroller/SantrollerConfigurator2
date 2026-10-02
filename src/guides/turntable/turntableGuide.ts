import { GuideDefinition } from '../types';
import {
  TurntableIntroStep,
  TurntableReviewStep,
  TurntableWiringStep,
} from './turntableGuideSteps';

export const DJ_TURNTABLE_GUIDE: GuideDefinition = {
  id: 'dj-turntable',
  title: 'DJ Hero Turntable Controller',
  subtitle: 'Optical Encoder Platter & Crossfader Conversion',
  description:
    'Rewire any DJ Hero turntable to a Raspberry Pi Pico for low-latency scratch vinyl and crossfader controls in DJ Hero and Clone Hero.',
  category: 'turntable',
  difficulty: 'intermediate',
  estimatedTime: '45 - 60 mins',
  badge: 'Optical Scratching',
  supplies: ['Raspberry Pi Pico 1 or 2', 'DJ Hero Turntable', 'Soldering Iron & Wire'],
  steps: [
    {
      id: 'tt-intro',
      title: 'Supplies & Architecture',
      shortTitle: 'Supplies',
      description: 'Understanding the platter encoder, crossfader, and face buttons.',
      render: TurntableIntroStep,
    },
    {
      id: 'tt-wiring',
      title: 'Platter & Crossfader Wiring',
      shortTitle: 'Wiring',
      description: 'Connect I2C platter lines, GP26 crossfader, and button inputs.',
      badge: 'I2C & ADC',
      render: TurntableWiringStep,
    },
    {
      id: 'tt-test',
      title: 'Live Test & Save',
      shortTitle: 'Test & Save',
      description: 'Verify scratch direction and save configuration to Pico flash.',
      badge: 'Save to Pico',
      render: TurntableReviewStep,
    },
  ],
};
