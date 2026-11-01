import { GuideSource } from '../types';
import { LedIntroStep, LedReviewStep, LedWiringStep } from './ledGuideSteps';

export const RGB_LED_GUIDE: GuideSource = {
  id: 'rgb-leds',
  category: 'mods',
  steps: [
    { id: 'led-intro', render: LedIntroStep },
    { id: 'led-wiring', render: LedWiringStep },
    { id: 'led-test', render: LedReviewStep },
  ],
};
