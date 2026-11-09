import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { IntroStep } from './steps/01_IntroStep';
import { FretsStep } from './steps/02_FretsStep';
import { StrumStep } from './steps/03_StrumStep';
import { WhammyStep } from './steps/04_WhammyStep';
import { PickupStep } from './steps/05_PickupStep';
import { TiltStep } from './steps/06_TiltStep';
import { NavStep } from './steps/07_NavStep';

export const DIRECT_PICO_GUITAR_GUIDE: GuideSource = {
  id: 'direct-pico-guitar',
  category: 'guitar',
  steps: [
    { id: 'intro', render: IntroStep },
    { id: 'frets', render: FretsStep },
    { id: 'strum', render: StrumStep },
    { id: 'whammy', render: WhammyStep },
    // Only Rock Band guitars have a pickup selector
    {
      id: 'pickup',
      render: PickupStep,
      visible: ({ guitarFamily }) => guitarFamily === 'rb',
    },
    { id: 'tilt', render: TiltStep },
    { id: 'nav', render: NavStep },
    ...finishSteps('direct-pico-guitar'),
  ],
};
