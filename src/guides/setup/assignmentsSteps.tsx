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
import { GuideStepProps } from '../types';
import { LayoutMarker, LayoutMarkerList } from './setupGuideSteps';
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

// What assignments are, as one sentence, then the common setups to copy
export function AssignmentsBasicsStep(props: GuideStepProps) {
  const { t } = useTranslation();
  const path = useSetupPath((state) => state.path);
  const build = useSetupPath((state) => state.build);
  const fromSantroller1 = path === 'santroller1';
  const [target, source] = getRuleSummaryParts([USB_AUTO, WII_GUITAR], t);
  const partLabels = [
    target,
    source,
    t('assignmentsGuide.rule.triggerExample', {
      button: t('assignmentsGuide.rule.triggerButton'),
    }),
  ];

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

  // A build from the setup guide puts the setups that fit it first
  const fitting =
    path === 'fresh' && build
      ? recipes.filter((recipe) => BUILDS[build]?.recipes.includes(recipe.key))
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
      {fromSantroller1 && <ImportedRules />}
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
      <section>
        <Title order={2} size="h3" mb="sm">
          {fitting.length
            ? t('assignmentsGuide.recipes.fitTitle', {
                name: t(`guides.setup.build.names.${build}`),
              })
            : t('assignmentsGuide.recipes.title')}
        </Title>
        {recipeList(fitting.length ? fitting : recipes)}
        {fitting.length > 0 && (
          <>
            <Title order={3} size="h4" mt="lg" mb="sm">
              {t('assignmentsGuide.recipes.otherTitle')}
            </Title>
            {recipeList(recipes.filter((recipe) => !fitting.includes(recipe)))}
          </>
        )}
      </section>
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      title={t('guides.setup.steps.assignments.title')}
      description={t('assignmentsGuide.subtitle')}
      guideContent={guideContent}
    />
  );
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
export function AssignmentsAdvancedStep(props: GuideStepProps) {
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

  const guideContent = (
    <Stack gap="md">
      <OpenProfilesButton />
      <Text size="sm">{t(`${I}.intro`)}</Text>
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
    </Stack>
  );

  return (
    <StepWorkbench
      {...props}
      title={t('guides.setup.steps.assignmentsAdvanced.title')}
      description={t('guides.setup.steps.assignmentsAdvanced.description')}
      guideContent={guideContent}
    />
  );
}
