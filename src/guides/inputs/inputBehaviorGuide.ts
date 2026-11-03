import { GuideSource } from '../types';
import {
  CyclingInputStep,
  HeldInputStep,
  InputBehaviorIntroStep,
  ToggleInputStep,
} from './inputBehaviorGuideSteps';

export const INPUT_BEHAVIOR_GUIDE: GuideSource = {
  id: 'input-behavior',
  category: 'mods',
  steps: [
    { id: 'intro', render: InputBehaviorIntroStep },
    { id: 'cycling', render: CyclingInputStep },
    { id: 'toggle', render: ToggleInputStep },
    { id: 'held', render: HeldInputStep },
  ],
};
