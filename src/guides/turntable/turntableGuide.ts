import { GuideSource } from '../types';
import {
  TurntableIntroStep,
  TurntableReviewStep,
  TurntableWiringStep,
} from './turntableGuideSteps';

export const DJ_TURNTABLE_GUIDE: GuideSource = {
  id: 'dj-turntable',
  category: 'turntable',
  steps: [
    { id: 'tt-intro', render: TurntableIntroStep },
    { id: 'tt-wiring', render: TurntableWiringStep },
    { id: 'tt-test', render: TurntableReviewStep },
  ],
};
