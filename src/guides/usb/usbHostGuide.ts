import { GuideSource } from '../types';
import { UsbHostIntroStep, UsbHostReviewStep, UsbHostWiringStep } from './usbHostGuideSteps';

export const USB_HOST_GUIDE: GuideSource = {
  id: 'usb-host',
  category: 'adapters',
  steps: [
    { id: 'usb-intro', render: UsbHostIntroStep },
    { id: 'usb-wiring', render: UsbHostWiringStep },
    { id: 'usb-test', render: UsbHostReviewStep },
  ],
};
