import { GuideSource } from '../types';
import { XboxAuthIntroStep, XboxAuthTestStep, XboxAuthWiringStep } from './xboxAuthGuideSteps';

export const XBOX_AUTH_GUIDE: GuideSource = {
  id: 'xbox-auth',
  category: 'adapters',
  steps: [
    { id: 'auth-intro', render: XboxAuthIntroStep },
    { id: 'auth-wiring', render: XboxAuthWiringStep },
    { id: 'auth-test', render: XboxAuthTestStep },
  ],
};
