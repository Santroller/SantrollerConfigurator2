import { GuideDefinition, GuideSource, GuideStepSource } from '../types';
import { AssignmentsAdvancedStep, AssignmentsBasicsStep } from './assignmentsSteps';
import {
  SetupBuildStep,
  SetupConnectStep,
  SetupDevicesStep,
  SetupExportStep,
  SetupFlashStep,
  SetupImportStep,
  SetupLayoutStep,
  SetupOverviewStep,
  SetupProfileStep,
  SetupSaveStep,
  SetupStandbyStep,
  SetupWireStep,
  SetupYourProfileStep,
} from './setupGuideSteps';
import { OTHER_BUILD, SetupBuild, SetupPath } from './setupPath';

// The setup guide's steps, by id. Their text is under guides.setup.steps.<id>
const STEPS: Record<string, GuideStepSource> = {
  overview: { id: 'overview', render: SetupOverviewStep },
  layout: { id: 'layout', render: SetupLayoutStep },
  build: { id: 'build', render: SetupBuildStep },
  yourProfile: { id: 'yourProfile', render: SetupYourProfileStep },
  export: { id: 'export', render: SetupExportStep },
  flash: { id: 'flash', render: SetupFlashStep },
  wire: { id: 'wire', render: SetupWireStep },
  connect: { id: 'connect', render: SetupConnectStep },
  import: { id: 'import', render: SetupImportStep },
  devices: { id: 'devices', render: SetupDevicesStep },
  profile: { id: 'profile', render: SetupProfileStep },
  assignments: { id: 'assignments', render: AssignmentsBasicsStep },
  assignmentsAdvanced: { id: 'assignmentsAdvanced', render: AssignmentsAdvancedStep },
  standby: { id: 'standby', render: SetupStandbyStep },
  save: { id: 'save', render: SetupSaveStep },
};

// A controller coming from Santroller 1 is already wired, and its devices and profiles come from
// the import rather than being set up by hand. A fresh one connects first, so a build guide can
// test as it goes, and only wires up and adds devices by hand when it isn't one of the builds.
function pathSteps(path: SetupPath, build: SetupBuild | null): string[] {
  if (path === 'santroller1') {
    return [
      'overview',
      'layout',
      'export',
      'flash',
      'connect',
      'import',
      'assignments',
      'assignmentsAdvanced',
      'standby',
      'save',
    ];
  }
  const guided = build != null && build !== OTHER_BUILD;
  return [
    'overview',
    'layout',
    'flash',
    'connect',
    'build',
    // A build guide's steps go in after the build step, so before its profile step
    ...(guided ? ['yourProfile'] : ['wire', 'devices', 'profile']),
    'assignments',
    'assignmentsAdvanced',
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

// Runs a build guide's steps right after the build step, both already localised. Their ids are
// prefixed with the build guide's, as several guides use the same step ids.
export function withBuildGuide(
  guide: GuideDefinition,
  buildGuide: GuideDefinition | undefined,
  // A short name for the build, as its steps are shown together under it
  label?: string
): GuideDefinition {
  const at = guide.steps.findIndex((step) => step.id === 'build');
  if (!buildGuide || at === -1) {
    return guide;
  }
  const nested = buildGuide.steps.map((step) => ({
    ...step,
    id: `${buildGuide.id}__${step.id}`,
    group: label ?? buildGuide.title,
  }));
  return {
    ...guide,
    steps: [...guide.steps.slice(0, at + 1), ...nested, ...guide.steps.slice(at + 1)],
  };
}
