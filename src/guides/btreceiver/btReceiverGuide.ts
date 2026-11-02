import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import {
  BtReceiverCheck,
  BtReceiverHardwareStep,
  BtReceiverIntroStep,
  BtReceiverPairStep,
} from './btReceiverGuideSteps';

export const BT_RECEIVER_GUIDE: GuideSource = {
  id: 'bt-receiver',
  category: 'adapters',
  steps: [
    { id: 'bt-intro', render: BtReceiverIntroStep },
    { id: 'bt-hardware', render: BtReceiverHardwareStep },
    { id: 'bt-pair', render: BtReceiverPairStep },
    ...finishSteps('bt-receiver', BtReceiverCheck),
  ],
};
