import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { WiiCheck, WiiIntroStep, WiiWiringStep } from './wiiAdapterGuideSteps';

export const WII_ADAPTER_GUITAR_GUIDE: GuideSource = {
  id: 'wii-adapter',
  category: 'adapters',
  steps: [
    { id: 'wii-intro', render: WiiIntroStep },
    { id: 'wii-wiring', render: WiiWiringStep },
    ...finishSteps('wii-adapter', WiiCheck),
  ],
};
