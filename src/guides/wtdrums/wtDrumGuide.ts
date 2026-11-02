import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { WtDrumCheck, WtDrumIntroStep, WtDrumWiringStep } from './wtDrumGuideSteps';

export const WT_DRUM_GUIDE: GuideSource = {
  id: 'wt-drums',
  category: 'drums',
  steps: [
    { id: 'wt-intro', render: WtDrumIntroStep },
    { id: 'wt-wiring', render: WtDrumWiringStep },
    ...finishSteps('wt-drums', WtDrumCheck),
  ],
};
