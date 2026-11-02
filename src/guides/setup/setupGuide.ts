import { TestStep } from '../finish/testStep';
import { finishTextKey } from '../finish/text';
import { GuideDefinition, GuideSource, GuideStep, GuideStepSource } from '../types';
import { AssignmentsBasicsStep, YourProfilesStep } from './assignmentsSteps';
import {
  SetupBuildStep,
  SetupConnectStep,
  SetupDevicesIntroStep,
  SetupDevicesStep,
  SetupExportStep,
  SetupFlashStep,
  SetupImportStep,
  SetupLayoutStep,
  SetupOverviewStep,
  SetupProfilesIntroStep,
  SetupProfileStep,
  SetupSaveStep,
  SetupStandbyStep,
  SetupWireStep,
} from './setupGuideSteps';
import { OTHER_BUILD, SetupBuild, SetupPath } from './setupPath';

// The setup guide's steps, by id. Their text is under guides.setup.steps.<id>
const STEPS: Record<string, GuideStepSource> = {
  overview: { id: 'overview', render: SetupOverviewStep },
  layout: { id: 'layout', render: SetupLayoutStep },
  devicesIntro: { id: 'devicesIntro', render: SetupDevicesIntroStep },
  profilesIntro: { id: 'profilesIntro', render: SetupProfilesIntroStep },
  build: { id: 'build', render: SetupBuildStep },
  export: { id: 'export', render: SetupExportStep },
  flash: { id: 'flash', render: SetupFlashStep },
  wire: { id: 'wire', render: SetupWireStep },
  connect: { id: 'connect', render: SetupConnectStep },
  import: { id: 'import', render: SetupImportStep },
  devices: { id: 'devices', render: SetupDevicesStep },
  profile: { id: 'profile', render: SetupProfileStep },
  // The same test step the build guides end with, for controllers set up without one
  test: { id: 'test', textKey: finishTextKey('test'), render: TestStep },
  assignments: { id: 'assignments', render: AssignmentsBasicsStep },
  yourProfiles: { id: 'yourProfiles', render: YourProfilesStep },
  standby: { id: 'standby', render: SetupStandbyStep },
  save: { id: 'save', render: SetupSaveStep },
};

// The layout, devices, profiles and how profiles are picked are explained up front, as the guide
// sets them all up itself.
// A controller coming from Santroller 1 is already wired, and its devices and profiles come from
// the import rather than being set up by hand. A fresh one connects first, so a build guide can
// test as it goes, and only wires up and adds devices by hand when it isn't one of the builds.
function pathSteps(path: SetupPath, build: SetupBuild | null): string[] {
  if (path === 'santroller1') {
    return [
      'overview',
      'layout',
      'devicesIntro',
      'profilesIntro',
      'assignments',
      'export',
      'flash',
      'connect',
      'import',
      'test',
      'yourProfiles',
      'standby',
      'save',
    ];
  }
  const guided = build != null && build !== OTHER_BUILD;
  return [
    'overview',
    'layout',
    'devicesIntro',
    'profilesIntro',
    'assignments',
    'flash',
    'connect',
    'build',
    // A build guide's steps go in after the build step, ending with trying its profiles out, which
    // is done by hand otherwise
    ...(guided ? [] : ['wire', 'devices', 'profile', 'test']),
    // Then their rules are looked over
    'yourProfiles',
    'standby',
    'save',
  ];
}

// Shown on the Setup a new device page rather than in the build guide catalog
export function getSetupGuide(path: SetupPath, build: SetupBuild | null): GuideSource {
  return {
    id: 'setup',
    category: 'mods',
    steps: pathSteps(path, build).map((id) => STEPS[id]),
  };
}

// A guide to run inside the setup guide, already localised, and the short name its steps are shown
// together under
export interface NestedGuide {
  guide: GuideDefinition;
  label?: string;
}

// A guide's steps as they run inside the setup guide. Their ids are prefixed with the guide's, as
// several guides use the same step ids.
function nest({ guide, label }: NestedGuide) {
  return guide.steps.map((step) => ({
    ...step,
    id: `${guide.id}__${step.id}`,
    group: label ?? guide.title,
  }));
}

// The steps every build guide ends with, which are shared between them
const isFinishStep = (step: GuideStep) => step.textKey?.startsWith(finishTextKey('')) ?? false;

// Runs a build guide's steps right after the build step, with the extras picked alongside it after
// the build's own steps, so the controllers, games and test steps it ends with come once
// everything is set up. Without a build guide the extras go before the test step instead.
export function withBuildGuide(
  guide: GuideDefinition,
  build: NestedGuide | undefined,
  extras: NestedGuide[] = []
): GuideDefinition {
  const at = guide.steps.findIndex((step) => step.id === 'build');
  if (at === -1) {
    return guide;
  }
  const extraSteps = extras.flatMap(nest);
  if (!build) {
    const test = guide.steps.findIndex((step) => step.id === 'test');
    const before = test === -1 ? at + 1 : test;
    return {
      ...guide,
      steps: [...guide.steps.slice(0, before), ...extraSteps, ...guide.steps.slice(before)],
    };
  }
  const buildSteps = nest(build);
  return {
    ...guide,
    steps: [
      ...guide.steps.slice(0, at + 1),
      ...buildSteps.filter((step) => !isFinishStep(step)),
      ...extraSteps,
      ...buildSteps.filter(isFinishStep),
      ...guide.steps.slice(at + 1),
    ],
  };
}
