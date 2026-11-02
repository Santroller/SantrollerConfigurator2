import React, { useEffect, useRef, useState } from 'react';
import { IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { TFunction } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Group, Paper, Progress, Select, Stack, Text } from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { inputKeyName } from '@/devices/keyboard';
import { StepActions } from '../components/StepActions';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import { useFinishText } from './text';

// The output fields named after an enum, whose names are the translation keys under outputs
const OUTPUT_ENUMS: [keyof proto.IOutput, Record<number, string>][] = [
  ['ghButton', proto.GuitarHeroGuitarButtonType],
  ['ghAxis', proto.GuitarHeroGuitarAxisType],
  ['rbButton', proto.RockBandGuitarButtonType],
  ['rbAxis', proto.RockBandGuitarAxisType],
  ['ghDrumAxis', proto.GuitarHeroDrumsAxisType],
  ['rbDrumButton', proto.RockBandDrumsButtonType],
  ['rbDrumAxis', proto.RockBandDrumsAxisType],
  ['ghlButton', proto.GuitarHeroLiveGuitarButtonType],
  ['ghlAxis', proto.GuitarHeroLiveGuitarAxisType],
  ['proButton', proto.ProGuitarButtonType],
  ['proAxis', proto.ProGuitarAxisType],
  ['djhButton', proto.DJHTurntableButtonType],
  ['djhAxis', proto.DJHTurntableAxisType],
  ['gfButton', proto.GuitarFreaksButtonType],
  ['popnButton', proto.PopNMusicButtonType],
  ['dmButton', proto.DrumManiaButtonType],
  ['proKeyboardButton', proto.ProKeyboardButtonType],
  ['proKeyboardAxis', proto.ProKeyboardAxisType],
  ['wheelButton', proto.WheelButtonType],
  ['wheelAxis', proto.WheelAxisType],
  ['gamepadButton', proto.GamepadButtonType],
  ['gamepadAxis', proto.GamepadAxisType],
];

type Kind = 'button' | 'axis' | 'hit';

// What a mapping sends, named the way the profile page names it, and how to show it: a button that
// lights while held, an axis with how far it's moved, or a drum pad, which only sends a short hit
export function describeMapping(
  t: TFunction,
  mapping: proto.IMapping,
  idx: number
): { label: string; kind: Kind } {
  const out = mapping.mapping ?? {};
  for (const [field, names] of OUTPUT_ENUMS) {
    const value = out[field] as number | null | undefined;
    if (value == null || !names[value]) {
      continue;
    }
    const name = names[value];
    // Gamepad buttons are named per console, the d-pad only generically
    const label = t([`outputs.${name}`, `outputs.Xbox360.${name}`, `outputs.Generic.${name}`]);
    const drum = field === 'ghDrumAxis' || field === 'rbDrumAxis';
    const axis = field.endsWith('Axis') && mapping.trigger == null;
    return { label, kind: drum ? 'hit' : axis ? 'axis' : 'button' };
  }
  if (out.keycode != null) {
    return { label: inputKeyName(out.keycode) ?? String(out.keycode), kind: 'button' };
  }
  if (out.proKeyMultiple != null) {
    return { label: t('inputs.pro_keys_range', { count: out.proKeyMultiple }), kind: 'button' };
  }
  return { label: t('inputs.mapping_title', { num: idx + 1 }), kind: 'button' };
}

// How long a drum hit stays lit, as the pad only reports it for a moment
const HIT_MS = 300;

function useHeld(on: boolean, hold: boolean) {
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!hold) {
      return;
    }
    if (on) {
      clearTimeout(timer.current);
      setHeld(true);
      timer.current = setTimeout(() => setHeld(false), HIT_MS);
    }
  }, [on, hold]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return hold ? held : on;
}

// A button or pad, lit while any of the mappings with its name are pressed
function LiveBadge({ indices, label, kind }: { indices: number[]; label: string; kind: Kind }) {
  const pressed = useConfigStore((state) =>
    indices.some((idx) => (state.mappingStatus[state.currentProfile]?.[idx]?.state ?? 0) > 0)
  );
  const lit = useHeld(pressed, kind === 'hit');
  return (
    <Badge size="lg" variant={lit ? 'filled' : 'outline'} color={lit ? 'teal' : 'gray'} tt="none">
      {label}
    </Badge>
  );
}

function LiveBar({ idx, label }: { idx: number; label: string }) {
  const raw = useConfigStore(
    (state) => state.mappingStatus[state.currentProfile]?.[idx]?.stateRaw ?? 0
  );
  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text size="xs" fw={600}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {Math.round((raw / 65535) * 100)}%
        </Text>
      </Group>
      <Progress value={(raw / 65535) * 100} size="sm" radius="xl" />
    </Stack>
  );
}

// Saves from a build guide's last step. The setup guide has a step of its own for it.
function SaveButton() {
  const { t } = useTranslation();
  const configModified = useConfigStore((state) => state.configModified);
  const updating = useConfigStore((state) => state.updating);
  const commitConfig = useConfigStore((state) => state.commitConfig);
  return configModified ? (
    <Group>
      <Button
        disabled={updating}
        onClick={commitConfig}
        leftSection={<IconDeviceFloppy size={16} />}
      >
        {t('save.saveChanges', 'Save changes')}
      </Button>
    </Group>
  ) : (
    <Alert variant="light" color="teal" icon={<IconCheck />}>
      {t('guides.finish.test.saved')}
    </Alert>
  );
}

// Tries out a profile's inputs, live. The controller reports the profile picked in the configurator,
// so picking one here picks it there too. A build guide can add a check of its own hardware, like
// whether the Wii extension is detected, which goes alongside.
export function TestStep({
  check: Check,
  ...props
}: GuideStepProps & { check?: React.ComponentType }) {
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles);
  const currentProfile = useConfigStore((state) => state.currentProfile);
  const activation = useConfigStore((state) => state.activationListStatus[state.currentProfile]);
  const setActiveProfile = useConfigStore((state) => state.setActiveProfile);
  const T = 'guides.finish.test';

  const choices = (profiles ?? []).flatMap((profile, idx) =>
    profile.opts?.standbyLighting ? [] : [{ value: String(idx), label: profile.opts?.name ?? '' }]
  );
  const profile = profiles?.[currentProfile];
  const onStandby = !profile || !!profile.opts?.standbyLighting;

  // Standby lighting has no inputs to try, so the first controller profile is picked instead
  useEffect(() => {
    if (onStandby && choices.length > 0) {
      setActiveProfile(choices[0].value, 0);
    }
  }, [onStandby, choices.length]);

  const described = (profile?.mappings ?? []).map((mapping, idx) => ({
    idx,
    ...describeMapping(t, mapping, idx),
  }));
  // Several mappings can do the same thing, like a pad's two MIDI notes, so they share a badge
  const badges = new Map<string, { kind: Kind; indices: number[] }>();
  for (const { idx, label, kind } of described.filter((d) => d.kind !== 'axis')) {
    const entry = badges.get(label) ?? { kind, indices: [] };
    entry.indices.push(idx);
    badges.set(label, entry);
  }
  const bars = described.filter(
    (d, i) => d.kind === 'axis' && described.findIndex((o) => o.label === d.label) === i
  );
  const matching = Object.values(activation ?? {}).some((list) => list.state);

  const guideContent = (
    <Stack gap="md">
      <Text size="sm">{t(`${T}.intro`)}</Text>
      <StepActions>
        {choices.length === 0 ? (
          <Alert variant="light" color="orange">
            {t(`${T}.noProfiles`)}
          </Alert>
        ) : (
          <Stack gap="md">
            <Group align="flex-end" gap="sm">
              <Select
                label={t(`${T}.profile`)}
                data={choices}
                value={onStandby ? null : String(currentProfile)}
                onChange={(value) => value != null && setActiveProfile(value, 0)}
                allowDeselect={false}
                w={260}
              />
              <Badge color={matching ? 'blue' : 'gray'} mb={8}>
                {matching ? t('state.active') : t('state.inactive')}
              </Badge>
            </Group>
            {!matching && (
              <Text size="xs" c="dimmed">
                <Trans i18nKey={`${T}.notMatching`} components={{ strong: <strong /> }} />
              </Text>
            )}
            {described.length === 0 ? (
              <Alert variant="light" color="orange">
                {t(`${T}.noInputs`)}
              </Alert>
            ) : (
              <Paper withBorder radius="md" p="md">
                <Stack gap="md">
                  {badges.size > 0 && (
                    <Group gap="xs">
                      {[...badges].map(([label, { kind, indices }]) => (
                        <LiveBadge key={label} label={label} kind={kind} indices={indices} />
                      ))}
                    </Group>
                  )}
                  {bars.map(({ idx, label }) => (
                    <LiveBar key={idx} idx={idx} label={label} />
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </StepActions>
      {!props.nested && (
        <StepActions prompt={false}>
          <SaveButton />
        </StepActions>
      )}
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useFinishText('test')}
      guideContent={guideContent}
      workbenchContent={Check && <Check />}
    />
  );
}
