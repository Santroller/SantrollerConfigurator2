import { GuideDefinition } from '../types';
import { IntroStep } from './steps/01_IntroStep';
import { FretsStep } from './steps/02_FretsStep';
import { StrumStep } from './steps/03_StrumStep';
import { WhammyStep } from './steps/04_WhammyStep';
import { TiltStep } from './steps/05_TiltStep';
import { NavStep } from './steps/06_NavStep';
import { ReviewStep } from './steps/07_ReviewStep';

export const DIRECT_PICO_GUITAR_GUIDE: GuideDefinition = {
  id: 'direct-pico-guitar',
  title: 'Direct-Wired Guitar (Raspberry Pi Pico)',
  subtitle: 'Interactive Wiring & Configuration Walkthrough',
  description:
    'Step-by-step interactive build guide for rewiring any Guitar Hero or Rock Band guitar with mechanical or original switches to a Raspberry Pi Pico or Pico 2.',
  category: 'guitar',
  difficulty: 'intermediate',
  estimatedTime: '1 - 2 hours',
  featured: true,
  badge: 'Popular',
  supplies: [
    'Raspberry Pi Pico 1 or 2',
    'Soldering Iron',
    '26-30 AWG Wire',
    'Multimeter',
    'Wire Cutters',
  ],
  steps: [
    {
      id: 'intro',
      title: 'Getting Started',
      shortTitle: 'Intro & Pinout',
      description: 'Supplies, safety, and official Santroller recommended pin layout.',
      render: IntroStep,
    },
    {
      id: 'frets',
      title: 'Fret Buttons',
      shortTitle: 'Frets',
      description: 'Green, Red, Yellow, Blue, and Orange frets with common ground.',
      badge: '5 Pins',
      render: FretsStep,
    },
    {
      id: 'strum',
      title: 'Strum Bar Switches',
      shortTitle: 'Strum',
      description: 'Strum Up and Strum Down switches with PCB trace cutting advice.',
      badge: '2 Pins',
      render: StrumStep,
    },
    {
      id: 'whammy',
      title: 'Whammy Potentiometer',
      shortTitle: 'Whammy',
      description: '10k potentiometer wiring to 3.3V, GND, and ADC0 (GP26).',
      badge: 'Analog ADC',
      render: WhammyStep,
    },
    {
      id: 'tilt',
      title: 'Star Power Tilt',
      shortTitle: 'Tilt',
      description: 'SW-520D ball tilt switch or ADXL345 I2C accelerometer.',
      badge: 'Digital / I2C',
      render: TiltStep,
    },
    {
      id: 'nav',
      title: 'Start & Select Navigation',
      shortTitle: 'Start / Select',
      description: 'Menu navigation buttons and Home combo configuration.',
      badge: '2 Pins',
      render: NavStep,
    },
    {
      id: 'review',
      title: 'Final Test & Save',
      shortTitle: 'Test & Save',
      description: 'Verify all guitar inputs on the live test bench and save to flash.',
      badge: 'Save to Pico',
      render: ReviewStep,
    },
  ],
};
