import { GuideSource } from '../types';
import {
  MidiDinIntroStep,
  MidiDinSetupStep,
  MidiDinTestStep,
  MidiDinWiringStep,
} from './midiDinGuideSteps';

export const MIDI_DIN_GUIDE: GuideSource = {
  id: 'midi-din',
  category: 'drums',
  steps: [
    { id: 'din-intro', render: MidiDinIntroStep },
    { id: 'din-wiring', render: MidiDinWiringStep },
    { id: 'din-setup', render: MidiDinSetupStep },
    { id: 'din-test', render: MidiDinTestStep },
  ],
};
