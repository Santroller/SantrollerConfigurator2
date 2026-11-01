import { GuideSource } from '../types';
import { PS2IntroStep, PS2ReviewStep, PS2WiringStep } from './ps2AdapterGuideSteps';

export const PS2_ADAPTER_GUIDE: GuideSource = {
  id: 'ps2-adapter',
  category: 'adapters',
  steps: [
    { id: 'ps2-intro', render: PS2IntroStep },
    { id: 'ps2-wiring', render: PS2WiringStep },
    { id: 'ps2-test', render: PS2ReviewStep },
  ],
};
