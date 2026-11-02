import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { BhDrumCheck, BhDrumIntroStep, BhDrumWiringStep } from './bhDrumGuideSteps';

export const BH_DRUM_GUIDE: GuideSource = {
  id: 'bh-drums',
  category: 'drums',
  steps: [
    { id: 'bh-intro', render: BhDrumIntroStep },
    { id: 'bh-wiring', render: BhDrumWiringStep },
    ...finishSteps('bh-drums', BhDrumCheck),
  ],
};
