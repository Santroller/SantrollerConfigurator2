import { GuideDefinition } from '../types';
import {
  Xbox360RfIntroStep,
  Xbox360RfReviewStep,
  Xbox360RfWiringStep,
} from './xbox360RfGuideSteps';

export const XBOX360_RF_GUIDE: GuideDefinition = {
  id: 'xbox360-rf',
  title: 'Xbox 360 RF Module Receiver & Sync',
  subtitle: 'Use Original Fat & Slim RF Modules with Wireless Controllers',
  description:
    'Repurpose an authentic Xbox 360 RF module (Original/Fat or Slim) as an ultra-low latency wireless receiver for Xbox 360 controllers with sync and Ring of Light support.',
  category: 'adapters',
  difficulty: 'intermediate',
  estimatedTime: '25 - 40 mins',
  badge: 'Wireless RF',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'Xbox 360 RF Module (Fat / Original or Slim)',
    'Soldering Iron & Fine Wire (28-30 AWG)',
    'USB Cable or USB Breakout Socket',
    '3.3V Power Source (Pico 3V3 OUT is 3.3V)',
  ],
  steps: [
    {
      id: 'rf-intro',
      title: 'Choose Module & Supplies Overview',
      shortTitle: 'Model & Supplies',
      description: 'Select Fat or Slim module and review supplies & 3.3V requirements.',
      badge: 'Model Select',
      render: Xbox360RfIntroStep,
    },
    {
      id: 'rf-wiring',
      title: 'Module Pinout & Wiring',
      shortTitle: 'Wiring',
      description: 'Step-by-step soldering instructions for your chosen module.',
      badge: 'Wiring',
      render: Xbox360RfWiringStep,
    },
    {
      id: 'rf-test',
      title: 'Configuration, Sync Test & Save',
      shortTitle: 'Test & Sync',
      description: 'Configure Santroller Xbox 360 RF device, trigger pairing, and save to flash.',
      badge: 'Sync & Test',
      render: Xbox360RfReviewStep,
    },
  ],
};
