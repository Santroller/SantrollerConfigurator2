import { useState } from 'react';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { StepActions } from '../components/StepActions';
import { StepWorkbench } from '../components/StepWorkbench';
import { GuideStepProps } from '../types';
import {
  addConsoleFestivalProfile,
  addPcFestivalRule,
  FestivalChoice,
  FestivalPart,
  festivalPlan,
  instrumentOf,
} from './festivalSetup';
import { useFinishText } from './text';

const strong = { strong: <strong /> };

// What the games step says and offers for one guitar or drum profile
function FestivalCard({
  uid,
  choice,
  onChange,
  result,
}: {
  uid: number;
  choice: FestivalChoice;
  onChange: (choice: FestivalChoice) => void;
  result?: { done: string[]; failed: boolean };
}) {
  const { t } = useTranslation();
  const profile = useConfigStore((state) =>
    state.config.profiles?.find((p) => p.opts?.uid === uid)
  );
  const plan = festivalPlan(profile, choice);
  const { drums, buttons, part, consoleChoice, pcChoice, wantConsole, wantPc, clash } = plan;
  const G = 'guides.finish.games';
  // What's said about the guitar or drums themselves
  const I = `${G}.${drums ? 'drums' : 'guitar'}`;
  const labelFor = (name: string | null) =>
    t(buttons.find((button) => button.name === name)?.label ?? []);
  const buttonData = buttons.map(({ name, label }) => ({ value: name, label: t(label) }));
  const set = (change: Partial<FestivalChoice>) => onChange({ ...choice, ...change });

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group gap="xs">
          <Text size="sm" fw={700}>
            {profile?.opts?.name}
          </Text>
          <Text size="xs" c="dimmed">
            {t(`subType.${proto.SubType[profile?.opts?.deviceToEmulate ?? proto.SubType.Gamepad]}`)}
          </Text>
        </Group>
        <Checkbox.Group value={choice.games} onChange={(games) => set({ games })}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {['console', 'pc'].map((game) => (
              <Checkbox.Card
                key={game}
                value={game}
                radius="md"
                p="md"
                style={{ display: 'flex', alignItems: 'flex-start' }}
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  <Checkbox.Indicator mt={2} />
                  <div>
                    <Text size="sm" fw={600}>
                      {t(`${G}.${game}.title`)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t(game === 'pc' ? `${I}.pcBody` : `${G}.console.body`)}
                    </Text>
                  </div>
                </Group>
              </Checkbox.Card>
            ))}
          </SimpleGrid>
        </Checkbox.Group>
        {(wantConsole || wantPc) &&
          (buttons.length === 0 ? (
            <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />}>
              {t(`${G}.${drums ? 'noButtons' : 'noFrets'}`)}
            </Alert>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {wantConsole && (
                <Stack gap="sm">
                  <SegmentedControl
                    value={part}
                    onChange={(value) => set({ part: value as FestivalPart })}
                    data={(drums
                      ? ['festival_pro_drums', 'festival_drums']
                      : ['festival_pro_guitar', 'festival_guitar']
                    ).map((value) => ({ value, label: t(`defaults_dialog.presets.${value}`) }))}
                  />
                  <Select
                    label={t(`${G}.console.holdLabel`)}
                    description={t(`${G}.console.holdDesc`)}
                    data={buttonData}
                    value={consoleChoice}
                    onChange={(consoleButton) => set({ consoleButton })}
                    allowDeselect={false}
                  />
                </Stack>
              )}
              {wantPc && (
                <Select
                  label={t(`${G}.pc.holdLabel`)}
                  description={t(`${G}.pc.holdDesc`)}
                  data={buttonData}
                  value={pcChoice}
                  onChange={(pcButton) => set({ pcButton })}
                  allowDeselect={false}
                />
              )}
            </SimpleGrid>
          ))}
        {clash && (
          <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />}>
            {t(`${G}.clash`)}
          </Alert>
        )}
        {result?.failed && (
          <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />}>
            <Trans
              i18nKey={`${G}.convertFailed`}
              values={{ name: profile?.opts?.name }}
              components={strong}
            />
          </Alert>
        )}
        {!!result?.done.length && (
          <Alert variant="light" color="teal" icon={<IconCheck size={18} />}>
            <Stack gap={4}>
              {result.done.includes('console') && (
                <Text size="sm">
                  <Trans
                    i18nKey={`${I}.consoleDone`}
                    values={{ button: labelFor(consoleChoice), name: profile?.opts?.name }}
                    components={strong}
                  />
                </Text>
              )}
              {result.done.includes('pc') && (
                <Text size="sm">
                  <Trans
                    i18nKey={`${I}.pcDone`}
                    values={{ button: labelFor(pcChoice) }}
                    components={strong}
                  />
                </Text>
              )}
              {result.done.includes('console') && (
                <Text size="xs" c="dimmed">
                  {t(`${I}.copyNote`)}
                </Text>
              )}
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

// Which games the guitars and drums are for. Fortnite Festival needs more than their profiles on
// their own, so picking it sets that up for each: a keyboard profile for consoles, and an Xbox One
// rule for PC, where Festival takes Xbox One guitars and drum kits.
export function GamesStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  const profiles = useConfigStore((state) => state.config.profiles);
  // Kept by uid, as setting up Festival adds keyboard profiles above them, moving them down
  const instruments = (profiles ?? []).flatMap((profile) =>
    instrumentOf(profile) && profile.opts?.uid != null
      ? [{ uid: profile.opts.uid, instrument: instrumentOf(profile)! }]
      : []
  );
  const [choices, setChoices] = useState<Record<number, FestivalChoice>>({});
  const [results, setResults] = useState<Record<number, { done: string[]; failed: boolean }>>({});
  const G = 'guides.finish.games';
  const choiceFor = (uid: number) => choices[uid] ?? { games: [] };
  const planFor = (uid: number) =>
    festivalPlan(
      useConfigStore.getState().config.profiles?.find((p) => p.opts?.uid === uid),
      choiceFor(uid)
    );
  const ticked = instruments.filter(({ uid }) => choiceFor(uid).games.length > 0);
  const clash = ticked.some(({ uid }) => planFor(uid).clash);

  // Sets up each profile that has something ticked. The button says what it did, moving on doesn't,
  // as the guide's step change waits for a transition, so the confirmation would flash up just
  // before the page changes. Returns whether it all worked, so moving on can stop to say what didn't.
  const apply = (confirm: boolean) => {
    let ok = true;
    const next: Record<number, { done: string[]; failed: boolean }> = {};
    for (const { uid } of ticked) {
      const plan = planFor(uid);
      if (plan.buttons.length === 0) {
        continue;
      }
      const idx = () =>
        (useConfigStore.getState().config.profiles ?? []).findIndex((p) => p.opts?.uid === uid);
      const pcInput = plan.inputFor(plan.pcChoice);
      const consoleInput = plan.inputFor(plan.consoleChoice);
      if (plan.wantPc && pcInput) {
        addPcFestivalRule(idx(), pcInput);
      }
      const converted =
        !plan.wantConsole ||
        !consoleInput ||
        addConsoleFestivalProfile(idx(), plan.part, consoleInput);
      ok &&= converted;
      const games = choiceFor(uid).games;
      next[uid] = {
        done:
          confirm || !converted ? (converted ? games : games.filter((g) => g !== 'console')) : [],
        failed: !converted,
      };
    }
    setResults(next);
    return ok;
  };

  const single = instruments.length === 1 ? instruments[0].instrument : undefined;
  const guideContent = (
    <Stack gap="md">
      <Text size="sm">
        {instruments.length === 0
          ? t(`${G}.noInstruments`)
          : t(single === 'drums' ? `${G}.introDrums` : single ? `${G}.intro` : `${G}.introAll`)}
      </Text>
      {instruments.length > 0 && (
        <StepActions>
          <Stack gap="md">
            {instruments.map(({ uid }) => (
              <FestivalCard
                key={uid}
                uid={uid}
                choice={choiceFor(uid)}
                onChange={(choice) => setChoices((all) => ({ ...all, [uid]: choice }))}
                result={results[uid]}
              />
            ))}
            {ticked.length > 0 && (
              <Group>
                <Button
                  leftSection={<IconCheck size={16} />}
                  onClick={() => apply(true)}
                  disabled={clash}
                >
                  {t(`${G}.apply`)}
                </Button>
              </Group>
            )}
          </Stack>
        </StepActions>
      )}
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      {...useFinishText('games')}
      // Moving on sets up whatever's ticked, so it isn't lost by missing the button. Running it again
      // redoes the same profiles and rules, so it doesn't matter if the button was used first.
      onNext={() => {
        if (connected && ticked.length > 0) {
          // The warning about picking the same button for both says what to change
          if (clash || !apply(false)) {
            return;
          }
        }
        props.onNext?.();
      }}
      guideContent={guideContent}
    />
  );
}
