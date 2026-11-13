import { GuideSource } from '../types';
import {
  PeripheralFlashStep,
  PeripheralIntroStep,
  PeripheralTestStep,
  PeripheralWiringStep,
} from './peripheralGuideSteps';

export const PERIPHERAL_PICO_GUIDE: GuideSource = {
  id: 'peripheral-pico',
  category: 'mods',
  steps: [
    { id: 'periph-intro', render: PeripheralIntroStep },
    { id: 'periph-flash', render: PeripheralFlashStep },
    { id: 'periph-wiring', render: PeripheralWiringStep },
    { id: 'periph-test', render: PeripheralTestStep },
  ],
};
