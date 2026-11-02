import {
  IconAlertTriangle,
  IconBluetooth,
  IconBulb,
  IconDeviceGamepad,
  IconKeyboard,
  IconMusic,
  IconSettings,
  IconTool,
  IconUsb,
} from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  getProfileSlotLabel,
  getProfileWideSlotIds,
  getRuleSummaryParts,
} from '@/components/Inputs/inputRegistry';
import { PreviewRule, RulePreview } from '@/components/Inputs/RulePreview';
import { proto } from '@/components/SettingsContext/config';
import { useConfigStore } from '@/components/SettingsContext/SettingsContext';
import { MIDI_PERCUSSION_CHANNEL } from '@/devices/midi';
import { StepWorkbench } from '../components/StepWorkbench';
import { holdButtons } from '../finish/festivalSetup';
import { GuideStepProps } from '../types';
import { LayoutMarker, LayoutMarkerList, useStepText } from './setupGuideSteps';
import { BUILDS, useSetupPath } from './setupPath';

// The three parts of a rule, coloured like the profile sketch on the layout step
const RULE_PARTS = [
  { key: 'target', color: 'teal' },
  { key: 'source', color: 'grape' },
  { key: 'trigger', color: 'orange' },
] as const;

const MULTI_SOURCE_NOTES = ['allRequired', 'midiSeen', 'hub', 'anyCombo'] as const;

const NOT_USED_CAUSES = ['noRule', 'notConnected', 'taken'] as const;

const IMPORTED_NOTES = ['order', 'bluetooth', 'festival'] as const;

// Example assignments, built the same way the profile editor builds them
const USB_AUTO: proto.IProfileAssignmentInfo = {
  consoleType: { consoleType: null, forcedType: null, xinputOnWindows: true, ps4OrPs5Mode: false },
};
const BLUETOOTH: proto.IProfileAssignmentInfo = { bluetooth: proto.BluetoothMode.BTStandard };
const WII_GUITAR: proto.IProfileAssignmentInfo = { wiiExt: proto.WiiExtType.WiiGuitarHeroGuitar };
const MIDI_DRUMS: proto.IProfileAssignmentInfo = { midiChannel: MIDI_PERCUSSION_CHANNEL };
const USB_GAMEPAD: proto.IProfileAssignmentInfo = { usbType: proto.SubType.Gamepad };
const USB_GUITAR: proto.IProfileAssignmentInfo = { usbType: proto.SubType.GuitarHeroGuitar };
const HOLD_AT_BOOT: proto.IProfileAssignmentInfo = { input: { input: {} } };
const LOCAL_INPUTS: proto.IProfileAssignmentInfo = { localInputs: {} };
const USB_PS3: proto.IProfileAssignmentInfo = {
  consoleType: {
    consoleType: null,
    forcedType: proto.ConsoleMode.ModePs3,
    xinputOnWindows: true,
    ps4OrPs5Mode: false,
  },
};

const DRUM_EXAMPLE: PreviewRule[] = [
  { assignments: [USB_AUTO, MIDI_DRUMS, USB_GAMEPAD] },
  { assignments: [USB_AUTO, MIDI_DRUMS] },
];

const TRIGGER_ROWS = ['auto', 'forced', 'specific', 'boot', 'anytime', 'inverted'] as const;

// The label each option has in the profile editor
const TRIGGER_OPTION_KEYS: Record<(typeof TRIGGER_ROWS)[number], string[]> = {
  auto: ['assignments.usb_mode.label', 'assignments.usb_mode.auto'],
  forced: ['assignments.usb_mode.label', 'assignments.usb_mode.forced'],
  specific: ['assignments.usb_mode.label', 'assignments.usb_mode.specific'],
  boot: ['assignments.trigger.boot'],
  anytime: ['assignments.trigger.anytime'],
  inverted: ['calibration.inverted'],
};

const strong = { strong: <strong /> };

function OpenProfilesButton() {
  const { t } = useTranslation();
  const connected = useConfigStore((state) => state.connected);
  if (!connected) {
    return null;
  }
  return (
    <Group>
      <Button
        variant="light"
        size="xs"
        component={Link}
        to="/profiles"
        leftSection={<IconSettings size={14} />}
      >
        {t('assignmentsGuide.openProfiles')}
      </Button>
    </Group>
  );
}

// A profile imported from Santroller 1: a forced console mode rule for each mode the old config could
// be switched to at startup, then the normal rule, which has to come last as the first match wins
const IMPORTED_EXAMPLE: PreviewRule[] = [
  { assignments: [USB_PS3, HOLD_AT_BOOT] },
  { assignments: [USB_AUTO] },
];

// What the importer made of the old console mode buttons, for those coming from Santroller 1
function ImportedRules() {
  const { t } = useTranslation();
  const S = 'assignmentsGuide.santroller1.imported';
  return (
    <section>
      <Title order={2} size="h3" mb={4}>
        {t(`${S}.title`)}
      </Title>
      <Text size="sm" mb="sm">
        <Trans i18nKey={`${S}.intro`} components={strong} />
      </Text>
      <Box maw="100%" miw={0}>
        <RulePreview
          rules={IMPORTED_EXAMPLE.map((rule) =>
            rule.assignments.includes(HOLD_AT_BOOT)
              ? { ...rule, triggerButton: t(`${S}.button`) }
              : rule
          )}
        />
      </Box>
      <List size="sm" spacing={4} mt="sm">
        {IMPORTED_NOTES.map((key) => (
          <List.Item key={key}>
            <Trans i18nKey={`${S}.notes.${key}`} components={strong} />
          </List.Item>
        ))}
      </List>
    </section>
  );
}

const ruleItems = (profiles: proto.IProfile[]) =>
  profiles.flatMap((profile) =>
    (profile.assignments ?? []).flatMap((list) => list.assignments ?? [])
  );

// Whether the controller already has a setup, so it isn't offered again
const RECIPE_DONE: Record<string, (profiles: proto.IProfile[]) => boolean> = {
  usb: (profiles) => ruleItems(profiles).some((item) => item.consoleType != null),
  adapter: (profiles) =>
    ruleItems(profiles).some((item) => item.wiiExt != null || item.ps2Cnt != null),
  wiredWireless: (profiles) => ruleItems(profiles).some((item) => item.bluetooth != null),
  // A keyboard profile picked with a button at startup is the Festival setup
  festivalWired: (profiles) => hasFestival(profiles),
  festivalAdapter: (profiles) => hasFestival(profiles),
  twoPlayers: (profiles) => ruleItems(profiles).some((item) => item.usbType != null),
};

function hasFestival(profiles: proto.IProfile[]) {
  return profiles.some(
    (profile) =>
      profile.opts?.deviceToEmulate === proto.SubType.KeyboardMouse &&
      ruleItems([profile]).some((item) => item.input != null)
  );
}

// The controller's own profiles and their rules, each showing live whether it matches
function YourProfiles() {
  const { t } = useTranslation();
  const profiles = useConfigStore((state) => state.config.profiles);
  const activation = useConfigStore((state) => state.activationListStatus);
  // A rule's button is an input, so it's named after what that input does in the profiles, the way
  // it was picked (eg Orange Fret)
  const buttonNames = new Map(
    (profiles ?? []).flatMap((profile) =>
      holdButtons(profile).map((button) => [JSON.stringify(button.input), t(button.label)] as const)
    )
  );
  const triggerName = (list: proto.IProfileAssignment) => {
    const trigger = (list.assignments ?? []).find(
      (item) => item.input != null || item.inputAnyTime != null
    );
    const input = trigger?.input?.input ?? trigger?.inputAnyTime?.input;
    return input
      ? (buttonNames.get(JSON.stringify(input)) ?? t('assignmentsGuide.yours.otherButton'))
      : undefined;
  };
  return (
    <section>
      <Text size="sm" mb="sm">
        {t('assignmentsGuide.yours.intro')}
      </Text>
      <Accordion variant="separated" radius="md" multiple>
        {(profiles ?? []).map((profile, idx) =>
          profile.opts?.standbyLighting ? null : (
            <Accordion.Item key={profile.opts?.uid ?? idx} value={String(idx)}>
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {profile.opts?.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t(
                      `subType.${proto.SubType[profile.opts?.deviceToEmulate ?? proto.SubType.Gamepad]}`
                    )}
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Box maw="100%" miw={0}>
                  <RulePreview
                    rules={(profile.assignments ?? []).map((list, listIdx) => ({
                      assignments: list.assignments ?? [],
                      triggerButton: triggerName(list),
                      active: activation[idx]?.[listIdx]?.state ?? false,
                    }))}
                  />
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          )
        )}
      </Accordion>
    </section>
  );
}

// What assignments are, as one sentence. Shown before the build, as the guide makes the rules itself
// and they only need understanding, not setting up.
export function AssignmentsBasicsStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const fromSantroller1 = useSetupPath((state) => state.path) === 'santroller1';
  const [target, source] = getRuleSummaryParts([USB_AUTO, WII_GUITAR], t);
  const partLabels = [
    target,
    source,
    t('assignmentsGuide.rule.triggerExample', {
      button: t('assignmentsGuide.rule.triggerButton'),
    }),
  ];

  const guideContent = (
    <Stack gap="lg">
      <section>
        <Title order={2} size="h3" mb="sm">
          {t('assignmentsGuide.rule.title')}
        </Title>
        <Paper withBorder radius="md" p="md" mb="md">
          <Group gap="xs">
            <Text size="sm" fw={700}>
              {t('assignmentsGuide.rule.lead')}
            </Text>
            {RULE_PARTS.map(({ key, color }, i) => (
              <Group key={key} gap={6} wrap="nowrap">
                {i > 0 && <Text size="sm">{t('assignmentsGuide.rule.and')}</Text>}
                <Badge size="lg" variant="light" color={color} tt="none">
                  {partLabels[i]}
                </Badge>
                <LayoutMarker n={i + 1} />
              </Group>
            ))}
          </Group>
        </Paper>
        {/* The same rule as the editor shows it, so the parts can be found on the Profiles page */}
        <Group align="flex-start" gap="xl">
          <Box maw="100%" miw={0}>
            <RulePreview
              rules={[
                {
                  assignments: [USB_AUTO, WII_GUITAR, HOLD_AT_BOOT],
                  triggerButton: t('assignmentsGuide.rule.triggerButton'),
                  markers: [
                    <LayoutMarker n={1} />,
                    <LayoutMarker n={2} />,
                    <LayoutMarker n={3} />,
                    <LayoutMarker n={4} />,
                  ],
                },
              ]}
            />
          </Box>
          <Stack gap="sm" style={{ flex: 1, minWidth: 260 }}>
            <LayoutMarkerList
              items={RULE_PARTS.map(({ key }) => ({
                title: t(`assignmentsGuide.rule.parts.${key}.title`),
                bodyKey: `assignmentsGuide.rule.parts.${key}.body`,
                santroller1Key: fromSantroller1
                  ? `assignmentsGuide.santroller1.parts.${key}`
                  : undefined,
              }))}
            />
            {/* Not one of the rule's conditions, so kept out of the sentence above */}
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              {t('assignmentsGuide.rule.alsoOnCard')}
            </Text>
            <LayoutMarkerList
              start={4}
              items={[
                {
                  title: t('assignments.localInputs'),
                  bodyKey: 'assignmentsGuide.rule.parts.claim.body',
                },
              ]}
            />
            <Text size="sm" c="dimmed">
              {t('assignmentsGuide.rule.caption')}
            </Text>
          </Stack>
        </Group>
      </section>
      <Alert
        variant="light"
        color="blue"
        title={t('assignmentsGuide.remember.title')}
        icon={<IconBulb size={18} />}
      >
        <List size="sm" spacing={4}>
          <List.Item>{t('assignmentsGuide.remember.noRule')}</List.Item>
          <List.Item>{t('assignmentsGuide.remember.pins')}</List.Item>
        </List>
      </Alert>
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('assignments')} guideContent={guideContent} />;
}

// Once everything is set up: the rules the guide and any import made, live, the setups that could
// still be added, and what to do when one doesn't match
export function YourProfilesStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const path = useSetupPath((state) => state.path);
  const build = useSetupPath((state) => state.build);
  const connected = useConfigStore((state) => state.connected);
  const allProfiles = useConfigStore((state) => state.config.profiles);
  const userProfiles = (allProfiles ?? []).filter((profile) => !profile.opts?.standbyLighting);

  const recipes: { key: string; icon: React.ReactNode; profiles: PreviewRule[][] }[] = [
    {
      key: 'usb',
      icon: <IconUsb size={16} />,
      profiles: [[{ assignments: [USB_AUTO] }]],
    },
    {
      key: 'adapter',
      icon: <IconDeviceGamepad size={16} />,
      profiles: [[{ assignments: [USB_AUTO, WII_GUITAR] }]],
    },
    {
      key: 'wiredWireless',
      icon: <IconBluetooth size={16} />,
      profiles: [
        [{ assignments: [USB_AUTO, LOCAL_INPUTS] }],
        [{ assignments: [BLUETOOTH, LOCAL_INPUTS] }],
      ],
    },
    {
      key: 'festivalWired',
      icon: <IconKeyboard size={16} />,
      profiles: [
        [
          {
            assignments: [USB_AUTO, HOLD_AT_BOOT, LOCAL_INPUTS],
            triggerButton: t('assignmentsGuide.recipes.triggerButton'),
          },
        ],
        [{ assignments: [USB_AUTO, LOCAL_INPUTS] }],
      ],
    },
    {
      key: 'festivalAdapter',
      icon: <IconKeyboard size={16} />,
      profiles: [
        [
          {
            assignments: [USB_AUTO, WII_GUITAR, HOLD_AT_BOOT],
            triggerButton: t('assignmentsGuide.recipes.triggerButton'),
          },
        ],
        [{ assignments: [USB_AUTO, WII_GUITAR] }],
      ],
    },
    {
      key: 'twoPlayers',
      icon: <IconDeviceGamepad size={16} />,
      profiles: [[{ assignments: [USB_AUTO, USB_GUITAR] }]],
    },
  ];

  // With a controller connected, its own profiles are shown, so the setups only list what it doesn't
  // have yet. The setup guide sets most of them up itself.
  const live = connected && userProfiles.length > 0;
  const offered = live
    ? recipes.filter((recipe) => !RECIPE_DONE[recipe.key]?.(userProfiles))
    : recipes;
  // A build from the setup guide puts the setups that fit it first
  const fitting =
    path === 'fresh' && build
      ? offered.filter((recipe) => BUILDS[build]?.recipes.includes(recipe.key))
      : [];

  const recipeList = (list: typeof recipes) => (
    <Accordion variant="separated" radius="md" multiple>
      {list.map(({ key, icon, profiles }) => (
        <Accordion.Item key={key} value={key}>
          <Accordion.Control icon={icon}>
            <Text size="sm" fw={600}>
              {t(`assignmentsGuide.recipes.${key}.title`)}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" mb="md">
              <Trans i18nKey={`assignmentsGuide.recipes.${key}.body`} components={strong} />
            </Text>
            <Group align="flex-start" gap="xl">
              {profiles.map((rules, i) => (
                <Stack key={i} gap="xs" maw="100%">
                  {profiles.length > 1 && (
                    <Text size="sm" fw={700}>
                      {t(`assignmentsGuide.recipes.${i === 0 ? 'profileA' : 'profileB'}`)}
                    </Text>
                  )}
                  <RulePreview rules={rules} />
                </Stack>
              ))}
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );

  const guideContent = (
    <Stack gap="lg">
      <OpenProfilesButton />
      {live && <YourProfiles />}
      {path === 'santroller1' && <ImportedRules />}
      {offered.length > 0 && (
        <section>
          <Title order={2} size="h3" mb="sm">
            {live
              ? t('assignmentsGuide.recipes.addTitle')
              : fitting.length
                ? t('assignmentsGuide.recipes.fitTitle', {
                    name: t(`guides.setup.build.names.${build}`),
                  })
                : t('assignmentsGuide.recipes.title')}
          </Title>
          {/* Fitting ones first, with a heading for the rest when they're split */}
          {recipeList(fitting.length ? fitting : offered)}
          {fitting.length > 0 && fitting.length < offered.length && (
            <>
              <Title order={3} size="h4" mt="lg" mb="sm">
                {t('assignmentsGuide.recipes.otherTitle')}
              </Title>
              {recipeList(offered.filter((recipe) => !fitting.includes(recipe)))}
            </>
          )}
        </section>
      )}
      <AssignmentIssues />
    </Stack>
  );

  return <StepWorkbench {...props} {...useStepText('yourProfiles')} guideContent={guideContent} />;
}

// What to do about an assignment issue, set apart from the explanation above it
function IssueFix({ i18nKey }: { i18nKey: string }) {
  const { t } = useTranslation();
  return (
    <Group gap="xs" align="flex-start" wrap="nowrap" mt="sm">
      <IconTool size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <Text size="sm">
        <strong>{t('assignmentsGuide.issues.fixLabel')}:</strong>{' '}
        <Trans i18nKey={i18nKey} components={strong} />
      </Text>
    </Group>
  );
}

// The usual assignment surprises, each opened only when it matches what the user is seeing
function AssignmentIssues() {
  const { t } = useTranslation();
  const I = 'assignmentsGuide.issues';

  const drumSlotIds = getProfileWideSlotIds(DRUM_EXAMPLE.map((rule) => rule.assignments))[0];
  const drumSlot = getProfileSlotLabel(MIDI_DRUMS, drumSlotIds[1], t);
  const gamepadSlot = getProfileSlotLabel(USB_GAMEPAD, drumSlotIds[2], t);

  const issues: { key: string; icon: React.ReactNode; content: React.ReactNode }[] = [
    {
      key: 'twoControllers',
      icon: <IconUsb size={16} />,
      content: (
        <>
          <Text size="sm">
            <Trans i18nKey={`${I}.twoControllers.body`} components={strong} />
          </Text>
          <IssueFix i18nKey={`${I}.twoControllers.fix`} />
        </>
      ),
    },
    {
      key: 'notUsed',
      icon: <IconAlertTriangle size={16} />,
      content: (
        <>
          <Text size="sm" mb="xs">
            {t(`${I}.notUsed.body`)}
          </Text>
          <List size="sm" spacing={4}>
            {NOT_USED_CAUSES.map((key) => (
              <List.Item key={key}>
                <Trans i18nKey={`${I}.notUsed.causes.${key}`} components={strong} />
              </List.Item>
            ))}
          </List>
          <IssueFix i18nKey={`${I}.notUsed.fix`} />
        </>
      ),
    },
    {
      key: 'missingController',
      icon: <IconDeviceGamepad size={16} />,
      content: (
        <>
          <Text size="sm">
            <Trans i18nKey={`${I}.missingController.body`} components={strong} />
          </Text>
          <IssueFix i18nKey={`${I}.missingController.fix`} />
          <Text size="xs" c="dimmed" mt="sm">
            <Trans i18nKey={`${I}.missingController.migrate`} components={strong} />
          </Text>
        </>
      ),
    },
    {
      key: 'multiSource',
      icon: <IconMusic size={16} />,
      content: (
        <>
          <Text size="sm" mb="sm">
            {t(`${I}.multiSource.description`)} {t(`${I}.multiSource.exampleIntro`)}
          </Text>
          <RulePreview rules={DRUM_EXAMPLE} />
          <Text size="xs" c="dimmed" mt="sm" mb="md">
            {t(`${I}.multiSource.exampleCaption`)}
          </Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Paper withBorder radius="md" p="md">
              <Text size="sm" fw={600} mb="xs">
                {t(`${I}.multiSource.mappingTitle`)}
              </Text>
              <List size="sm" spacing="xs">
                <List.Item icon={<IconMusic size={16} />}>
                  <Trans
                    i18nKey={`${I}.multiSource.mappingMidi`}
                    values={{ slot: drumSlot }}
                    components={strong}
                  />
                </List.Item>
                <List.Item icon={<IconDeviceGamepad size={16} />}>
                  <Trans
                    i18nKey={`${I}.multiSource.mappingGamepad`}
                    values={{ slot: gamepadSlot }}
                    components={strong}
                  />
                </List.Item>
              </List>
            </Paper>
            <Paper withBorder radius="md" p="md">
              <Text size="sm" fw={600} mb="xs">
                {t(`${I}.multiSource.notesTitle`)}
              </Text>
              <List size="xs" spacing="xs" c="dimmed">
                {MULTI_SOURCE_NOTES.map((key) => (
                  <List.Item key={key}>
                    <Trans i18nKey={`${I}.multiSource.notes.${key}`} components={strong} />
                  </List.Item>
                ))}
              </List>
            </Paper>
          </SimpleGrid>
        </>
      ),
    },
    {
      key: 'triggers',
      icon: <IconKeyboard size={16} />,
      content: (
        <>
          <Text size="sm" mb="sm">
            {t(`${I}.triggers.recheck`)}
          </Text>
          <Paper withBorder radius="md">
            <Table.ScrollContainer minWidth={560}>
              <Table striped horizontalSpacing="md" verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: '30%' }}>
                      {t(`${I}.triggers.headers.option`)}
                    </Table.Th>
                    <Table.Th>{t(`${I}.triggers.headers.behaviour`)}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {TRIGGER_ROWS.map((key) => (
                    <Table.Tr key={key}>
                      <Table.Td>
                        <Text size="xs" fw={700}>
                          {TRIGGER_OPTION_KEYS[key].map((k) => t(k)).join(': ')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          <Trans
                            i18nKey={`${I}.triggers.rows.${key}.behaviour`}
                            components={strong}
                          />
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </>
      ),
    },
  ];

  return (
    <section>
      <Title order={2} size="h3" mb={4}>
        {t(`${I}.heading`)}
      </Title>
      <Text size="sm" mb="sm">
        {t(`${I}.intro`)}
      </Text>
      <Accordion variant="separated" radius="md" multiple>
        {issues.map(({ key, icon, content }) => (
          <Accordion.Item key={key} value={key}>
            <Accordion.Control icon={icon}>
              <Text size="sm" fw={600}>
                {t(`${I}.${key}.title`)}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>{content}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
