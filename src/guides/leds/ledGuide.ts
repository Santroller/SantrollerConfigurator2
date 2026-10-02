import { GuideDefinition } from '../types';
import { LedIntroStep, LedReviewStep, LedWiringStep } from './ledGuideSteps';

export const RGB_LED_GUIDE: GuideDefinition = {
  id: 'rgb-leds',
  title: 'Addressable RGB & Fret LEDs (WS2812B / APA102)',
  subtitle: 'Fret Illumination & Game Sync Animations',
  description:
    'Add addressable RGB LEDs to your guitar or drum kit that light up on button presses and sync with Star Power in games like YARG.',
  category: 'mods',
  difficulty: 'intermediate',
  estimatedTime: '30 - 45 mins',
  badge: 'RGB Lighting',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'WS2812B or APA102 / SK9822 RGB LEDs',
    '330Ω to 470Ω Resistor',
    'Soldering Iron & Wire',
  ],
  steps: [
    {
      id: 'led-intro',
      title: 'Supplies & Pinout',
      shortTitle: 'Supplies',
      description: 'Understanding VBUS 5V power, data resistors, and LED types.',
      render: LedIntroStep,
    },
    {
      id: 'led-wiring',
      title: 'Soldering & Data Chain',
      shortTitle: 'Wiring',
      description: 'Connect 5V power, ground, and chain data lines.',
      badge: 'Data Chain',
      render: LedWiringStep,
    },
    {
      id: 'led-test',
      title: 'Live Test & Save',
      shortTitle: 'Test & Save',
      description: 'Preview fret colors, set inactivity timer, and save to flash.',
      badge: 'Save to Pico',
      render: LedReviewStep,
    },
  ],
};
