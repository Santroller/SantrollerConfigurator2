import { GuideDefinition } from '../types';
import { UsbHostIntroStep, UsbHostReviewStep, UsbHostWiringStep } from './usbHostGuideSteps';

export const USB_HOST_GUIDE: GuideDefinition = {
  id: 'usb-host',
  title: 'USB Host Controller & Console Auth',
  subtitle: 'Connect Wired Controllers & Xbox 360 Wireless Receivers',
  description:
    'Add a USB Host port to your Raspberry Pi Pico to connect wired controllers, wireless receivers, or security authentication donor controllers.',
  category: 'adapters',
  difficulty: 'beginner',
  estimatedTime: '15 - 20 mins',
  badge: 'Console Auth',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'USB Female Socket / Breakout Cable',
    'Soldering Iron & Wire',
  ],
  steps: [
    {
      id: 'usb-intro',
      title: 'Supplies & Color Codes',
      shortTitle: 'Supplies',
      description: 'Understanding VBUS 5V, GND, D+, and D- pinout.',
      render: UsbHostIntroStep,
    },
    {
      id: 'usb-wiring',
      title: 'Wiring & Driver',
      shortTitle: 'Wiring',
      description: 'Connect D+ to GP2 and D- to GP3, then enable driver.',
      badge: 'USB Host',
      render: UsbHostWiringStep,
    },
    {
      id: 'usb-test',
      title: 'Live Test & Save',
      shortTitle: 'Test & Save',
      description: 'Plug in a controller, verify device detection, and save to flash.',
      badge: 'Save to Pico',
      render: UsbHostReviewStep,
    },
  ],
};
