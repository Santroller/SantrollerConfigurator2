import React from 'react';
import { BUILDS } from '../setup/setupPath';
import { GuideStepSource } from '../types';
import { GamesStep } from './gamesStep';
import { HostDevicesStep } from './hostDevicesStep';
import { TestStep } from './testStep';
import { finishTextKey } from './text';

// The steps that end a build guide, the same on its own or inside the setup guide: a profile for
// each kind of controller plugged into it, Fortnite Festival for its guitars and drums, then trying
// out the profiles. The guide can pass a check of its own hardware for the test step to show.
export function finishSteps(build: string, check?: React.ComponentType): GuideStepSource[] {
  const { plugIn, instrument } = BUILDS[build] ?? {};
  return [
    ...(plugIn
      ? [
          {
            id: 'hostDevices',
            textKey: finishTextKey('hostDevices'),
            render: (props) => React.createElement(HostDevicesStep, { ...props, plugIn }),
          } satisfies GuideStepSource,
        ]
      : []),
    // Controllers plugged in can be guitars or drums too, which the games step finds in the profiles
    ...(instrument || plugIn
      ? [{ id: 'games', textKey: finishTextKey('games'), render: GamesStep }]
      : []),
    {
      id: 'test',
      textKey: finishTextKey('test'),
      render: (props) => React.createElement(TestStep, { ...props, check }),
    },
  ];
}
