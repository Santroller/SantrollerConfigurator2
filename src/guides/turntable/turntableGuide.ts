import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { TurntableCheck, TurntableIntroStep, TurntableWiringStep } from './turntableGuideSteps';

export const DJ_TURNTABLE_GUIDE: GuideSource = {
  id: 'dj-turntable',
  category: 'turntable',
  steps: [
    { id: 'tt-intro', render: TurntableIntroStep },
    { id: 'tt-wiring', render: TurntableWiringStep },
    ...finishSteps('dj-turntable', TurntableCheck),
  ],
};
