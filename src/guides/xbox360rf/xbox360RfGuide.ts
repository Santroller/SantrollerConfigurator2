import { GuideSource } from '../types';
import {
  Xbox360RfIntroStep,
  Xbox360RfReviewStep,
  Xbox360RfWiringStep,
} from './xbox360RfGuideSteps';

export const XBOX360_RF_GUIDE: GuideSource = {
  id: 'xbox360-rf',
  category: 'adapters',
  steps: [
    { id: 'rf-intro', render: Xbox360RfIntroStep },
    { id: 'rf-wiring', render: Xbox360RfWiringStep },
    { id: 'rf-test', render: Xbox360RfReviewStep },
  ],
};
