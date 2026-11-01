import { GuideSource } from '../types';
import { WiiIntroStep, WiiReviewStep, WiiWiringStep } from './wiiAdapterGuideSteps';

export const WII_ADAPTER_GUITAR_GUIDE: GuideSource = {
  id: 'wii-adapter',
  category: 'adapters',
  steps: [
    { id: 'wii-intro', render: WiiIntroStep },
    { id: 'wii-wiring', render: WiiWiringStep },
    { id: 'wii-test', render: WiiReviewStep },
  ],
};
