import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { DrumCheck, DrumIntroStep, DrumPadWiringStep } from './drumGuideSteps';

export const DRUM_KIT_GUIDE: GuideSource = {
  id: 'drum-kit',
  category: 'drums',
  steps: [
    { id: 'drum-intro', render: DrumIntroStep },
    { id: 'drum-wiring', render: DrumPadWiringStep },
    ...finishSteps('drum-kit', DrumCheck),
  ],
};
