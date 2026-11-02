import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { Ps2Check, PS2IntroStep, PS2WiringStep } from './ps2AdapterGuideSteps';

export const PS2_ADAPTER_GUIDE: GuideSource = {
  id: 'ps2-adapter',
  category: 'adapters',
  steps: [
    { id: 'ps2-intro', render: PS2IntroStep },
    { id: 'ps2-wiring', render: PS2WiringStep },
    ...finishSteps('ps2-adapter', Ps2Check),
  ],
};
