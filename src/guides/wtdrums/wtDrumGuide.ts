import { GuideSource } from '../types';
import { WtDrumIntroStep, WtDrumReviewStep, WtDrumWiringStep } from './wtDrumGuideSteps';

export const WT_DRUM_GUIDE: GuideSource = {
  id: 'wt-drums',
  category: 'drums',
  steps: [
    { id: 'wt-intro', render: WtDrumIntroStep },
    { id: 'wt-wiring', render: WtDrumWiringStep },
    { id: 'wt-test', render: WtDrumReviewStep },
  ],
};
