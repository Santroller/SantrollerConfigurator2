import { GuideDefinition } from '../types';
import { AssignmentsAdvancedStep, AssignmentsBasicsStep } from './assignmentsSteps';
import {
  SetupConnectStep,
  SetupDevicesStep,
  SetupFlashStep,
  SetupOverviewStep,
  SetupProfileStep,
  SetupSaveStep,
  SetupStandbyStep,
  SetupWireStep,
} from './setupGuideSteps';

// Shown on the Setup a new device page rather than in the build guide catalog
export const SETUP_GUIDE: GuideDefinition = {
  id: 'setup',
  title: 'Getting Started with Santroller',
  subtitle: 'Everything you need to set up a new controller',
  description: 'From getting the firmware onto your board to saving a working config.',
  category: 'mods',
  estimatedTime: '15 - 30 mins',
  steps: [
    {
      id: 'overview',
      title: 'Before you start',
      shortTitle: 'Overview',
      description: 'How the firmware, devices, profiles and assignments fit together.',
      render: SetupOverviewStep,
    },
    {
      id: 'flash',
      title: 'Put Santroller on your board',
      shortTitle: 'Flash',
      description: 'Copy the Santroller firmware onto your Pico.',
      render: SetupFlashStep,
    },
    {
      id: 'wire',
      title: 'Wire up your hardware',
      shortTitle: 'Wire',
      description: 'Find the pinout and wiring for your controller.',
      render: SetupWireStep,
    },
    {
      id: 'connect',
      title: 'Connect and update',
      shortTitle: 'Connect',
      description: 'Connect the configurator to your controller and update its firmware if asked.',
      render: SetupConnectStep,
    },
    {
      id: 'devices',
      title: 'Add your devices',
      shortTitle: 'Devices',
      description: 'Tell the firmware what hardware is attached to the board.',
      render: SetupDevicesStep,
    },
    {
      id: 'profile',
      title: 'Set up a profile',
      shortTitle: 'Profile',
      description: 'Pick a controller type, then map your inputs and LEDs.',
      render: SetupProfileStep,
    },
    {
      id: 'assignments',
      title: 'Assignments',
      shortTitle: 'Assignments',
      description: 'Decide when each profile is used.',
      render: AssignmentsBasicsStep,
    },
    {
      id: 'assignmentsAdvanced',
      title: 'How a profile gets picked',
      shortTitle: 'More on assignments',
      description:
        'Reading several controllers in one profile, the order profiles are checked in, and console modes.',
      render: AssignmentsAdvancedStep,
    },
    {
      id: 'standby',
      title: 'Standby profile',
      shortTitle: 'Standby',
      description:
        "Light up when the controller isn't in use, and pick the buttons that wake a sleeping console or PC.",
      render: SetupStandbyStep,
    },
    {
      id: 'save',
      title: 'Save and back up',
      shortTitle: 'Save',
      description: 'Store your settings on the controller and keep a copy.',
      render: SetupSaveStep,
    },
  ],
};
