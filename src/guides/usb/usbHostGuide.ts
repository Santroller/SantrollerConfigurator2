import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import { UsbHostCheck, UsbHostIntroStep, UsbHostWiringStep } from './usbHostGuideSteps';

export const USB_HOST_GUIDE: GuideSource = {
  id: 'usb-host',
  category: 'adapters',
  steps: [
    { id: 'usb-intro', render: UsbHostIntroStep },
    { id: 'usb-wiring', render: UsbHostWiringStep },
    ...finishSteps('usb-host', UsbHostCheck),
  ],
};
