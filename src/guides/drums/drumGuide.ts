import { GuideSource } from '../types';
import { DrumIntroStep, DrumPadWiringStep, DrumReviewStep } from './drumGuideSteps';

export const DRUM_KIT_GUIDE: GuideSource = {
  id: 'drum-kit',
  category: 'drums',
  steps: [
    { id: 'drum-intro', render: DrumIntroStep },
    { id: 'drum-wiring', render: DrumPadWiringStep },
    { id: 'drum-test', render: DrumReviewStep },
  ],
};
