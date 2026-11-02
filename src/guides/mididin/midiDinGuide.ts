import { finishSteps } from '../finish/finishSteps';
import { GuideSource } from '../types';
import {
  MidiDinCheck,
  MidiDinIntroStep,
  MidiDinSetupStep,
  MidiDinWiringStep,
} from './midiDinGuideSteps';

export const MIDI_DIN_GUIDE: GuideSource = {
  id: 'midi-din',
  category: 'drums',
  steps: [
    { id: 'din-intro', render: MidiDinIntroStep },
    { id: 'din-wiring', render: MidiDinWiringStep },
    { id: 'din-setup', render: MidiDinSetupStep },
    ...finishSteps('midi-din', MidiDinCheck),
  ],
};
