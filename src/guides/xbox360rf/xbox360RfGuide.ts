import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import {
  Xbox360RfCheck,
  Xbox360RfIntroStep,
  Xbox360RfSyncStep,
  Xbox360RfWiringStep,
} from './xbox360RfGuideSteps';

export const XBOX360_RF_GUIDE: GuideSource = {
  id: 'xbox360-rf',
  category: 'adapters',
  steps: [
    { id: 'rf-intro', render: Xbox360RfIntroStep },
    { id: 'rf-wiring', render: Xbox360RfWiringStep },
    { id: 'rf-sync', render: Xbox360RfSyncStep },
    ...finishSteps('xbox360-rf', Xbox360RfCheck),
  ],
};
