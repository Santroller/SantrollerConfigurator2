import { GuideSource } from '../types';
import { BhDrumIntroStep, BhDrumReviewStep, BhDrumWiringStep } from './bhDrumGuideSteps';

export const BH_DRUM_GUIDE: GuideSource = {
  id: 'bh-drums',
  category: 'drums',
  steps: [
    { id: 'bh-intro', render: BhDrumIntroStep },
    { id: 'bh-wiring', render: BhDrumWiringStep },
    { id: 'bh-test', render: BhDrumReviewStep },
  ],
};
