import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { WiiCheck, WiiIntroStep, WiiTiltStep, WiiWiringStep } from './wiiAdapterGuideSteps';

export const WII_ADAPTER_GUITAR_GUIDE: GuideSource = {
  id: 'wii-adapter',
  category: 'adapters',
  steps: [
    { id: 'wii-intro', render: WiiIntroStep },
    { id: 'wii-wiring', render: WiiWiringStep },
    // Tilt goes on the Wii guitar's profile, so it comes once the profiles are made
    ...finishSteps('wii-adapter', WiiCheck).flatMap((step) =>
      step.id === 'hostDevices' ? [step, { id: 'wii-tilt', render: WiiTiltStep }] : [step]
    ),
  ],
};
