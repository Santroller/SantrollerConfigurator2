import { GuideSource } from '../types';
import {
  ConsoleOutputIntroStep,
  ConsoleOutputTestStep,
  ConsoleOutputWiringStep,
} from './consoleOutputGuideSteps';

export const CONSOLE_OUTPUT_GUIDE: GuideSource = {
  id: 'console-output',
  category: 'adapters',
  steps: [
    { id: 'console-intro', render: ConsoleOutputIntroStep },
    { id: 'console-wiring', render: ConsoleOutputWiringStep },
    { id: 'console-test', render: ConsoleOutputTestStep },
  ],
};
