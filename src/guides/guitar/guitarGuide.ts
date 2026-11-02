import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { IntroStep } from './steps/01_IntroStep';
import { FretsStep } from './steps/02_FretsStep';
import { StrumStep } from './steps/03_StrumStep';
import { WhammyStep } from './steps/04_WhammyStep';
import { TiltStep } from './steps/05_TiltStep';
import { NavStep } from './steps/06_NavStep';

export const DIRECT_PICO_GUITAR_GUIDE: GuideSource = {
  id: 'direct-pico-guitar',
  category: 'guitar',
  steps: [
    { id: 'intro', render: IntroStep },
    { id: 'frets', render: FretsStep },
    { id: 'strum', render: StrumStep },
    { id: 'whammy', render: WhammyStep },
    { id: 'tilt', render: TiltStep },
    { id: 'nav', render: NavStep },
    ...finishSteps('direct-pico-guitar'),
  ],
};
